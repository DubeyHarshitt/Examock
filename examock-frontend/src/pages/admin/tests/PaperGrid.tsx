// src/pages/admin/tests/PaperGrid.tsx
// /admin/content/tests/:testId — the paper grid (ticket 06 / design §6).
//
// One row per question. The grid is the editor: type a row, paste rows, or
// add from the bank; drag to reorder; multi-select for bulk chapter / marks /
// negative-marks / reusable / delete. Saved rows edit immediately; pending
// rows persist on Save (bulk append, with same-chapter duplicate reuse).
//
// The reconciliation bar is always visible and gates Activate: totalMarks
// (admin-entered) must equal Σ per-question marks before the test can go live.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  AlertTriangle,
  Archive,
  BookOpen,
  Check,
  ChevronDown,
  ClipboardPaste,
  GripVertical,
  Image as ImageIcon,
  ListChecks,
  Loader2,
  Lock,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { AdminLayout } from "../../../components/layout/AdminLayout";
import { Breadcrumbs } from "../../../components/admin/Breadcrumbs";
import {
  activateTestApi,
  bulkAddQuestionsApi,
  getExamDetailApi,
  getTestDetailApi,
  getTopicsApi,
  removeTestQuestionApi,
  reorderTestQuestionsApi,
  updateQuestionApi,
  updateTestApi,
} from "../../../api/admin.api";
import type {
  DraftRow,
  MockTestDetail,
  NewDraftRow,
  Questions,
  TestQuestionWithDetail,
  updateQuestionDto,
} from "../../../store/admin/types/admin.types";
import { useToast } from "../../../components/ui/toast/toast-context";
import { cn } from "../../../utils/cn";
import AddFromBankDialog from "./AddFromBankDialog";

type QuestionDetail = TestQuestionWithDetail["question"];

interface ChapterOption {
  id: string;
  name: string;
  subjectName: string;
}

type GridRow =
  | { key: string; kind: "saved"; row: TestQuestionWithDetail }
  | { key: string; kind: "pending-new"; draft: NewDraftRow }
  | { key: string; kind: "pending-ref"; draft: Extract<DraftRow, { kind: "ref" }>; question: QuestionDetail };

/** Fields the grid edits on saved rows — the subset `updateQuestionApi` accepts. */
type SavedPatch = Partial<
  Pick<
    QuestionDetail,
    | "text"
    | "optionA"
    | "optionB"
    | "optionC"
    | "optionD"
    | "correctOption"
    | "explanation"
    | "marks"
    | "negMarks"
    | "difficulty"
    | "isReusable"
    | "imageUrl"
  >
> & { topicId?: string };

interface ActivationProblem {
  code: string;
  message: string;
  questionIds?: string[];
}

const PROBLEM_ICONS: Record<string, string> = {
  NO_QUESTIONS: "📝",
  MISSING_CHAPTER: "🗂️",
  MISSING_ANSWER: "❌",
  MARKS_MISMATCH: "⚖️",
};

const CORRECT_OPTIONS = ["A", "B", "C", "D"] as const;

function rowMarks(r: GridRow, def: number): number {
  if (r.kind === "saved") return r.row.question.marks ?? def;
  if (r.kind === "pending-new") return r.draft.marks ?? def;
  return r.question.marks ?? def;
}

/** Parse pasted TSV/CSV lines into draft rows. */
function parsePasted(
  text: string,
  chapterId: string,
  defMarks: number,
  defNeg: number
): NewDraftRow[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const cells = (line.includes("\t") ? line.split("\t") : line.split(",")).map(
        (x) => x?.trim() ?? ""
      );
      const [t, a, b, c, d, correct] = cells;
      const co = correct?.toUpperCase();
      return {
        kind: "new" as const,
        clientId: crypto.randomUUID(),
        chapterId,
        text: t,
        optionA: a,
        optionB: b,
        optionC: c,
        optionD: d,
        correctOption: (CORRECT_OPTIONS as readonly string[]).includes(co)
          ? (co as (typeof CORRECT_OPTIONS)[number])
          : "A",
        marks: defMarks,
        negMarks: defNeg,
        isReusable: false,
      };
    });
}

export default function PaperGrid() {
  const { testId = "" } = useParams();
  const toast = useToast();

  const [test, setTest] = useState<MockTestDetail | null>(null);
  const [chapters, setChapters] = useState<ChapterOption[]>([]);
  const [rows, setRows] = useState<GridRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [activationProblems, setActivationProblems] = useState<ActivationProblem[] | null>(null);

  const [header, setHeader] = useState({ title: "", totalMarks: 0, defaultMarks: 0, defaultNegMarks: 0, durationMins: 0 });
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);

  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteChapter, setPasteChapter] = useState("");
  const [bankOpen, setBankOpen] = useState(false);

  // ── Load ────────────────────────────────────────────────────
  const load = useCallback(() => {
    return getTestDetailApi(testId)
      .then((t) => {
        setTest(t);
        setHeader({
          title: t.title,
          totalMarks: t.totalMarks,
          defaultMarks: t.defaultMarks,
          defaultNegMarks: t.defaultNegMarks,
          durationMins: t.durationMins,
        });
        setRows(
          t.questions.map((q) => ({
            key: `saved-${q.questionId}`,
            kind: "saved" as const,
            row: q,
          }))
        );
        setActivationProblems(null);
      })
      .catch(() => toast.error("Could not load test"));
  }, [testId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  // Chapters for the whole exam (subject-scoped tests are guarded server-side).
  useEffect(() => {
    if (!test) return;
    getExamDetailApi(test.examTypeId)
      .then(async (exam) => {
        const lists = await Promise.all(
          exam.subjects.map((s) => getTopicsApi(s.id))
        );
        const opts: ChapterOption[] = [];
        exam.subjects.forEach((s, i) => {
          (lists[i] ?? []).forEach((t) =>
            opts.push({ id: t.id, name: t.name, subjectName: s.name })
          );
        });
        setChapters(opts);
        setPasteChapter((prev) => prev || opts[0]?.id || "");
      })
      .catch(() => toast.error("Could not load chapters"));
  }, [test, toast]);

  // ── Derived ────────────────────────────────────────────────
  const computed = useMemo(
    () => rows.reduce((s, r) => s + rowMarks(r, test?.defaultMarks ?? 1), 0),
    [rows, test]
  );
  const reconciled = rows.length > 0 && computed === test?.totalMarks;
  const pendingCount = rows.filter((r) => r.kind !== "saved").length;
  const scopeLabel = test?.subjectId
    ? test.subject?.name ?? "Subject"
    : `Full ${test?.examType?.name ?? "exam"}`;

  // ── Saved (pending rows) ───────────────────────────────────
  const handleSave = async () => {
    if (!test) return;
    const pending = rows.filter((r) => r.kind !== "saved");
    if (pending.length === 0) {
      toast.info("Nothing new to save");
      return;
    }
    setSaving(true);
    try {
      const draftRows: DraftRow[] = pending.map((r) =>
        r.kind === "pending-new" ? r.draft : r.draft
      );
      const summary = await bulkAddQuestionsApi(test.id, draftRows);
      const parts = [`${summary.created} created`];
      if (summary.reused > 0) parts.push(`${summary.reused} reused`);
      toast.success(
        `${pending.length} row${pending.length === 1 ? "" : "s"} saved — ${parts.join(", ")}`
      );
      await load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Could not save rows");
    } finally {
      setSaving(false);
    }
  };

  // ── Header commit (on blur) ────────────────────────────────
  const commitHeader = () => {
    if (!test) return;
    updateTestApi(test.id, header).catch(() => toast.error("Could not save header"));
  };

  // ── Saved-row edits (immediate) ────────────────────────────
  const patchSaved = (key: string, patch: Partial<QuestionDetail>) => {
    setRows((prev) =>
      prev.map((r) =>
        r.key === key && r.kind === "saved"
          ? { ...r, row: { ...r.row, question: { ...r.row.question, ...patch } } }
          : r
      )
    );
  };
  const commitSaved = (key: string, patch: SavedPatch) => {
    const row = rows.find((r) => r.key === key);
    if (!row || row.kind !== "saved") return;
    patchSaved(key, patch);
    // Strip undefined keys before PATCHing the bank question.
    const payload: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(patch)) if (v !== undefined) payload[k] = v;
    updateQuestionApi(row.row.questionId, payload as unknown as updateQuestionDto).catch(() =>
      toast.error("Could not update question")
    );
  };

  // ── Pending-row edits (local) ──────────────────────────────
  const patchPending = (key: string, patch: Partial<NewDraftRow>) => {
    setRows((prev) =>
      prev.map((r) =>
        r.key === key && r.kind === "pending-new"
          ? { ...r, draft: { ...r.draft, ...patch } }
          : r
      )
    );
  };

  // ── Reorder (drag) ────────────────────────────────────────
  const handleDrop = async (targetKey: string) => {
    if (!dragKey || dragKey === targetKey || !test) return;
    const from = rows.findIndex((r) => r.key === dragKey);
    const to = rows.findIndex((r) => r.key === targetKey);
    if (from < 0 || to < 0) return;
    const next = [...rows];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setRows(next);
    setDragKey(null);
    // Persist the saved rows' order (pending rows append after on save).
    const saved = next.filter((r) => r.kind === "saved");
    try {
      await reorderTestQuestionsApi(
        test.id,
        saved.map((r, i) => ({ questionId: r.row.questionId, orderIndex: i }))
      );
    } catch {
      toast.error("Could not persist order");
    }
  };

  // ── Bulk actions ───────────────────────────────────────────
  const applyBulk = async (action: "chapter" | "marks" | "neg" | "reusable" | "delete", value?: string | number | boolean) => {
    if (!test || selected.size === 0) return;
    const sel = rows.filter((r) => selected.has(r.key));
    if (action === "delete") {
      // Saved rows: remove the link (bank question kept). Pending: just drop.
      const savedKeys = sel.filter((r) => r.kind === "saved");
      try {
        await Promise.all(
          savedKeys.map((r) => removeTestQuestionApi(test.id, r.row.questionId))
        );
        setRows((prev) => prev.filter((r) => !selected.has(r.key)));
        setSelected(new Set());
        toast.success(`${savedKeys.length} row${savedKeys.length === 1 ? "" : "s"} removed`);
      } catch {
        toast.error("Could not delete rows");
      }
      return;
    }
    if (action === "chapter") {
      const chapterId = String(value);
      sel.forEach((r) => {
        if (r.kind === "saved") commitSaved(r.key, { topicId: chapterId });
        else if (r.kind === "pending-new") patchPending(r.key, { chapterId });
      });
      toast.success(`Chapter set for ${sel.length} row${sel.length === 1 ? "" : "s"}`);
      return;
    }
    if (action === "marks" || action === "neg") {
      const field = action === "marks" ? "marks" : "negMarks";
      const num = Number(value);
      if (!Number.isFinite(num)) return;
      sel.forEach((r) => {
        if (r.kind === "saved") commitSaved(r.key, { [field]: num });
        else if (r.kind === "pending-new") patchPending(r.key, { [field]: num });
      });
      toast.success(`${field === "marks" ? "Marks" : "Negative marks"} set for ${sel.length} row${sel.length === 1 ? "" : "s"}`);
      return;
    }
    if (action === "reusable") {
      const next = Boolean(value);
      sel.forEach((r) => {
        if (r.kind === "saved") commitSaved(r.key, { isReusable: next });
        else if (r.kind === "pending-new") patchPending(r.key, { isReusable: next });
      });
      toast.success(`Reusable ${next ? "on" : "off"} for ${sel.length} row${sel.length === 1 ? "" : "s"}`);
    }
  };

  // ── Activate ───────────────────────────────────────────────
  const handleActivate = async () => {
    if (!test) return;
    setBusy(true);
    setActivationProblems(null);
    try {
      await activateTestApi(test.id);
      toast.success(`"${test.title}" is now live`);
      await load();
    } catch (e: unknown) {
      const data = (e as { response?: { data?: { problems?: ActivationProblem[]; message?: string } } })?.response?.data;
      if (data?.problems) {
        setActivationProblems(data.problems);
        toast.error("This test can't go live yet");
      } else {
        toast.error(data?.message ?? "Could not activate the test");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleArchive = async () => {
    if (!test) return;
    try {
      await updateTestApi(test.id, { isActive: false });
      toast.success(`"${test.title}" archived`);
      await load();
    } catch {
      toast.error("Could not archive the test");
    }
  };
  const handleRestore = async () => {
    if (!test) return;
    try {
      await updateTestApi(test.id, { isActive: true });
      toast.success(`"${test.title}" restored`);
      await load();
    } catch {
      toast.error("Could not restore the test");
    }
  };

  // ── Add row / paste / bank ─────────────────────────────────
  const addPendingRow = () => {
    const draft = {
      kind: "new" as const,
      clientId: crypto.randomUUID(),
      chapterId: pasteChapter || chapters[0]?.id || "",
      text: "",
      optionA: "",
      optionB: "",
      optionC: "",
      optionD: "",
      correctOption: "A" as const,
      marks: test?.defaultMarks ?? 1,
      negMarks: test?.defaultNegMarks ?? 0,
      isReusable: true,
    };
    setRows((prev) => [...prev, { key: `new-${draft.clientId}`, kind: "pending-new", draft }]);
  };

  const handlePaste = () => {
    const parsed = parsePasted(
      pasteText,
      pasteChapter || chapters[0]?.id || "",
      test?.defaultMarks ?? 1,
      test?.defaultNegMarks ?? 0
    );
    if (parsed.length === 0) {
      toast.info("No rows found in the pasted text");
      return;
    }
    setRows((prev) => [
      ...prev,
      ...parsed.map((draft) => ({
        key: `new-${draft.clientId}`,
        kind: "pending-new" as const,
        draft,
      })),
    ]);
    setPasteText("");
    setPasteOpen(false);
    toast.success(`${parsed.length} row${parsed.length === 1 ? "" : "s"} pasted — review and Save`);
  };

  const handleBankAdd = (questions: Questions[]) => {
    const newRows: GridRow[] = questions.map((q) => ({
      key: `ref-${q.id}-${crypto.randomUUID()}`,
      kind: "pending-ref" as const,
      draft: { kind: "ref" as const, clientId: crypto.randomUUID(), questionId: q.id },
      question: q,
    }));
    setRows((prev) => [...prev, ...newRows]);
    setBankOpen(false);
  };

  const toggleSelect = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const allSelected = rows.length > 0 && selected.size === rows.length;
  const toggleSelectAll = () => {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.key)));
  };

  // ── Render ─────────────────────────────────────────────────
  return (
    <AdminLayout
      title={test?.title ?? "Test"}
      subtitle={scopeLabel}
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving || pendingCount === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save{pendingCount > 0 ? ` (${pendingCount})` : ""}
          </button>
          {!test?.isActive ? (
            <button
              onClick={handleActivate}
              disabled={busy || !reconciled}
              title={reconciled ? "Activate this test" : "Marks must reconcile before activating"}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              <ShieldCheck size={14} />
              {busy ? "Checking…" : "Activate"}
            </button>
          ) : (
            <button
              onClick={handleArchive}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-amber-50 hover:text-amber-700"
            >
              <Archive size={14} /> Archive
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-5">
        <Breadcrumbs
          crumbs={[
            { label: "Content", to: "/admin/content/exams" },
            { label: "Tests", to: "/admin/content/tests" },
            { label: test?.title ?? "…" },
          ]}
        />

        {/* ── Test header ─────────────────────────────────── */}
        <section className="card-surface p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-bold",
                test?.isActive
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-slate-100 text-slate-600"
              )}
            >
              {test?.isActive ? "Live" : "Archived"}
            </span>
            <span
              className={cn(
                "inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-bold",
                test?.subjectId
                  ? "border-sky-200 bg-sky-50 text-sky-700"
                  : "border-amber-200 bg-amber-50 text-amber-700"
              )}
            >
              {scopeLabel}
            </span>
            {!test?.isFree && (
              <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-500">
                <Lock size={11} /> Paid
                <span className="font-semibold text-slate-400">(not available yet)</span>
              </span>
            )}
            {test?.isActive && (
              <button
                onClick={handleRestore}
                className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50"
              >
                <RotateCcw size={14} /> Restore
              </button>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <label className="flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Title
              <input
                value={header.title}
                onChange={(e) => setHeader((h) => ({ ...h, title: e.target.value }))}
                onBlur={commitHeader}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold normal-case tracking-normal text-slate-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total marks
              <input
                type="number"
                value={header.totalMarks}
                onChange={(e) => setHeader((h) => ({ ...h, totalMarks: Number(e.target.value) }))}
                onBlur={commitHeader}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold normal-case tracking-normal text-slate-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Marks / question
              <input
                type="number"
                value={header.defaultMarks}
                onChange={(e) => setHeader((h) => ({ ...h, defaultMarks: Number(e.target.value) }))}
                onBlur={commitHeader}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold normal-case tracking-normal text-slate-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Negative marks
              <input
                type="number"
                value={header.defaultNegMarks}
                onChange={(e) => setHeader((h) => ({ ...h, defaultNegMarks: Number(e.target.value) }))}
                onBlur={commitHeader}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold normal-case tracking-normal text-slate-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </label>
            <label className="flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Duration (min)
              <input
                type="number"
                value={header.durationMins}
                onChange={(e) => setHeader((h) => ({ ...h, durationMins: Number(e.target.value) }))}
                onBlur={commitHeader}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold normal-case tracking-normal text-slate-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </label>
          </div>

          {/* Reconciliation bar */}
          <div
            className={cn(
              "mt-4 flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-bold",
              reconciled
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-amber-200 bg-amber-50 text-amber-700"
            )}
          >
            {reconciled ? <Check size={14} /> : <AlertTriangle size={14} />}
            <span>
              {rows.length} question{rows.length === 1 ? "" : "s"} × {test?.defaultMarks ?? 1} marks = {computed}
              {test ? `, total says ${test.totalMarks}` : ""}
              {" — "}
              {reconciled ? "Activate enabled" : "Activate blocked"}
            </span>
          </div>

          {/* Activation problems */}
          {activationProblems && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="flex items-center gap-2 text-sm font-bold text-amber-800">
                <AlertTriangle size={15} /> This test can't go live yet
              </p>
              <ul className="mt-3 space-y-2">
                {activationProblems.map((p) => (
                  <li
                    key={p.code}
                    className="flex items-start gap-2 rounded-lg border border-amber-200/70 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700"
                  >
                    <span>{PROBLEM_ICONS[p.code] ?? "⚠️"}</span>
                    <span>
                      {p.message}
                      {p.questionIds && (
                        <span className="mt-0.5 block text-[11px] font-medium text-slate-400">
                          {p.questionIds.length} question{p.questionIds.length !== 1 ? "s" : ""}:{" "}
                          {p.questionIds.map((id) => id.slice(0, 8)).join(", ")}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* ── Toolbar ─────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={addPendingRow}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <Plus size={14} /> Type a question
          </button>
          <button
            onClick={() => setPasteOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <ClipboardPaste size={14} /> Paste rows
          </button>
          <button
            onClick={() => setBankOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <BookOpen size={14} /> Add from bank
          </button>
          <span className="ml-auto text-xs font-medium text-slate-400">
            {rows.length} row{rows.length === 1 ? "" : "s"}
            {pendingCount > 0 && ` · ${pendingCount} pending`}
          </span>
        </div>

        {/* ── Bulk bar ────────────────────────────────────── */}
        {selected.size > 0 && (
          <div className="card-surface flex flex-wrap items-center gap-2 px-3 py-2.5">
            <span className="text-xs font-bold text-slate-600">
              {selected.size} selected
            </span>
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) applyBulk("chapter", e.target.value);
                e.target.value = "";
              }}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 focus:border-brand-400 focus:outline-none"
            >
              <option value="">Set chapter…</option>
              {chapters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.subjectName})
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Marks"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  applyBulk("marks", (e.target as HTMLInputElement).value);
                  (e.target as HTMLInputElement).value = "";
                }
              }}
              className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 focus:border-brand-400 focus:outline-none"
            />
            <input
              type="number"
              placeholder="Neg"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  applyBulk("neg", (e.target as HTMLInputElement).value);
                  (e.target as HTMLInputElement).value = "";
                }
              }}
              className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 focus:border-brand-400 focus:outline-none"
            />
            <button
              onClick={() => applyBulk("reusable", true)}
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50"
            >
              Reusable on
            </button>
            <button
              onClick={() => applyBulk("reusable", false)}
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50"
            >
              Reusable off
            </button>
            <button
              onClick={() => applyBulk("delete")}
              className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-600 transition-colors hover:bg-red-100"
            >
              <Trash2 size={12} /> Delete
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="ml-auto rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* ── Grid ────────────────────────────────────────── */}
        <section className="card-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="w-10 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                  </th>
                  <th className="w-8 px-2 py-3"></th>
                  <th className="w-10 px-2 py-3">#</th>
                  <th className="w-40 px-2 py-3">Chapter</th>
                  <th className="px-3 py-3">Question</th>
                  <th className="w-16 px-2 py-3">A</th>
                  <th className="w-16 px-2 py-3">B</th>
                  <th className="w-16 px-2 py-3">C</th>
                  <th className="w-16 px-2 py-3">D</th>
                  <th className="w-12 px-2 py-3">✓</th>
                  <th className="w-16 px-2 py-3 text-right">Marks</th>
                  <th className="w-16 px-2 py-3 text-right">Neg</th>
                  <th className="w-12 px-2 py-3">Img</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="px-4 py-12 text-center text-xs text-slate-400">
                      <ListChecks size={20} className="mx-auto mb-2 text-slate-300" />
                      No questions yet — type, paste, or add from the bank.
                    </td>
                  </tr>
                ) : (
                  rows.map((r, idx) => {
                    const isSel = selected.has(r.key);
                    const isExp = expanded.has(r.key);
                    const q: QuestionDetail | null =
                      r.kind === "saved"
                        ? r.row.question
                        : r.kind === "pending-ref"
                          ? r.question
                          : null;
                    const chapterId =
                      r.kind === "saved"
                        ? q?.topicId ?? ""
                        : r.kind === "pending-new"
                          ? r.draft.chapterId
                          : q?.topicId ?? "";
                    return [
                      <tr
                        key={r.key}
                        draggable
                        onDragStart={() => setDragKey(r.key)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleDrop(r.key)}
                        className={cn(
                          "border-b border-slate-50 transition-colors",
                          isSel ? "bg-brand-50/50" : "hover:bg-slate-50/60",
                          dragKey === r.key && "opacity-40"
                        )}
                      >
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={isSel}
                            onChange={() => toggleSelect(r.key)}
                            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <GripVertical size={14} className="cursor-grab text-slate-300" />
                        </td>
                        <td className="px-2 py-2 text-xs font-bold tabular-nums text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="px-2 py-2">
                          <div className="relative">
                            <select
                              value={chapterId}
                              onChange={(e) => {
                                if (r.kind === "saved") commitSaved(r.key, { topicId: e.target.value });
                                else if (r.kind === "pending-new") patchPending(r.key, { chapterId: e.target.value });
                              }}
                              className="w-full appearance-none rounded-md border border-slate-200 bg-white px-2 py-1.5 pr-7 text-xs font-semibold text-slate-700 focus:border-brand-400 focus:outline-none"
                            >
                              {chapters.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                            <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          {r.kind === "pending-new" ? (
                            <input
                              value={r.draft.text}
                              onChange={(e) => patchPending(r.key, { text: e.target.value })}
                              placeholder="Question text…"
                              className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-800 focus:border-brand-400 focus:outline-none"
                            />
                          ) : (
                            <button
                              onClick={() =>
                                setExpanded((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(r.key)) next.delete(r.key);
                                  else next.add(r.key);
                                  return next;
                                })
                              }
                              className="max-w-[280px] truncate text-left text-xs font-semibold text-slate-800 hover:text-brand-600"
                              title="Click to expand"
                            >
                              {q?.text}
                            </button>
                          )}
                        </td>
                        {(["optionA", "optionB", "optionC", "optionD"] as const).map((opt) =>
                          r.kind === "pending-new" ? (
                            <td key={opt} className="px-2 py-2">
                              <input
                                value={r.draft[opt]}
                                onChange={(e) => patchPending(r.key, { [opt]: e.target.value })}
                                className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:border-brand-400 focus:outline-none"
                              />
                            </td>
                          ) : (
                            <td key={opt} className="px-2 py-2 text-xs text-slate-600">
                              {q?.[opt]}
                            </td>
                          )
                        )}
                        <td className="px-2 py-2">
                          {r.kind === "pending-new" ? (
                            <select
                              value={r.draft.correctOption}
                              onChange={(e) =>
                                patchPending(r.key, {
                                  correctOption: e.target.value as QuestionDetail["correctOption"],
                                })
                              }
                              className="rounded-md border border-slate-200 bg-white px-1.5 py-1.5 text-xs font-bold text-slate-700 focus:border-brand-400 focus:outline-none"
                            >
                              {CORRECT_OPTIONS.map((o) => (
                                <option key={o} value={o}>
                                  {o}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span
                              className={cn(
                                "inline-flex h-5 w-5 items-center justify-center rounded text-[11px] font-bold",
                                q?.correctOption
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-slate-100 text-slate-400"
                              )}
                            >
                              {q?.correctOption ?? "—"}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-right">
                          {r.kind === "pending-new" ? (
                            <input
                              type="number"
                              value={r.draft.marks ?? ""}
                              onChange={(e) => patchPending(r.key, { marks: Number(e.target.value) })}
                              className="w-14 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-right text-xs tabular-nums text-slate-700 focus:border-brand-400 focus:outline-none"
                            />
                          ) : (
                            <input
                              type="number"
                              value={q?.marks ?? ""}
                              onChange={(e) => commitSaved(r.key, { marks: Number(e.target.value) })}
                              className="w-14 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-right text-xs tabular-nums text-slate-700 focus:border-brand-400 focus:outline-none"
                            />
                          )}
                        </td>
                        <td className="px-2 py-2 text-right">
                          {r.kind === "pending-new" ? (
                            <input
                              type="number"
                              value={r.draft.negMarks ?? ""}
                              onChange={(e) => patchPending(r.key, { negMarks: Number(e.target.value) })}
                              className="w-14 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-right text-xs tabular-nums text-slate-700 focus:border-brand-400 focus:outline-none"
                            />
                          ) : (
                            <input
                              type="number"
                              value={q?.negMarks ?? ""}
                              onChange={(e) => commitSaved(r.key, { negMarks: Number(e.target.value) })}
                              className="w-14 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-right text-xs tabular-nums text-slate-700 focus:border-brand-400 focus:outline-none"
                            />
                          )}
                        </td>
                        <td className="px-2 py-2">
                          {q?.imageUrl ? (
                            <img src={q.imageUrl} alt="" className="h-6 w-6 rounded object-cover" />
                          ) : (
                            <span className="text-slate-300">
                              <ImageIcon size={14} />
                            </span>
                          )}
                        </td>
                      </tr>,
                      isExp && (
                        <tr key={`${r.key}-exp`} className="border-b border-slate-50 bg-slate-50/50">
                          <td colSpan={13} className="px-4 py-3">
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                              <label className="flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                Explanation
                                {r.kind === "pending-new" ? (
                                  <textarea
                                    value={r.draft.explanation ?? ""}
                                    onChange={(e) => patchPending(r.key, { explanation: e.target.value })}
                                    rows={2}
                                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold normal-case tracking-normal text-slate-800 focus:border-brand-400 focus:outline-none"
                                  />
                                ) : (
                                  <textarea
                                    value={q?.explanation ?? ""}
                                    onChange={(e) => commitSaved(r.key, { explanation: e.target.value })}
                                    rows={2}
                                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold normal-case tracking-normal text-slate-800 focus:border-brand-400 focus:outline-none"
                                  />
                                )}
                              </label>
                              <label className="flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                Difficulty
                                {r.kind === "pending-new" ? (
                                  <select
                                    value={r.draft.difficulty ?? "MEDIUM"}
                                    onChange={(e) =>
                                      patchPending(r.key, {
                                        difficulty: e.target.value as QuestionDetail["difficulty"],
                                      })
                                    }
                                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold normal-case tracking-normal text-slate-800 focus:border-brand-400 focus:outline-none"
                                  >
                                    <option value="EASY">Easy</option>
                                    <option value="MEDIUM">Medium</option>
                                    <option value="HARD">Hard</option>
                                  </select>
                                ) : (
                                  <select
                                    value={q?.difficulty ?? "MEDIUM"}
                                    onChange={(e) =>
                                      commitSaved(r.key, {
                                        difficulty: e.target.value as QuestionDetail["difficulty"],
                                      })
                                    }
                                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold normal-case tracking-normal text-slate-800 focus:border-brand-400 focus:outline-none"
                                  >
                                    <option value="EASY">Easy</option>
                                    <option value="MEDIUM">Medium</option>
                                    <option value="HARD">Hard</option>
                                  </select>
                                )}
                              </label>
                              <label className="flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                Reusable
                                <select
                                  value={
                                    r.kind === "pending-new"
                                      ? r.draft.isReusable
                                        ? "yes"
                                        : "no"
                                      : q?.isReusable
                                        ? "yes"
                                        : "no"
                                  }
                                  onChange={(e) => {
                                    const val = e.target.value === "yes";
                                    if (r.kind === "pending-new") patchPending(r.key, { isReusable: val });
                                    else commitSaved(r.key, { isReusable: val });
                                  }}
                                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold normal-case tracking-normal text-slate-800 focus:border-brand-400 focus:outline-none"
                                >
                                  <option value="yes">Yes</option>
                                  <option value="no">No</option>
                                </select>
                              </label>
                              <div className="flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                Image
                                <div className="flex h-[38px] items-center rounded-lg border border-dashed border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-400">
                                  {q?.imageUrl ? (
                                    <span className="truncate text-emerald-600">Attached</span>
                                  ) : (
                                    <span>Upload (ticket 07)</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ),
                    ];
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* ── Paste modal ─────────────────────────────────────── */}
      {pasteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={() => setPasteOpen(false)}
        >
          <div
            className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <ClipboardPaste size={16} className="text-brand-600" />
                <h2 className="text-sm font-bold text-slate-900">Paste rows</h2>
              </div>
              <button
                onClick={() => setPasteOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3 px-5 py-4">
              <p className="text-xs text-slate-500">
                One question per line, tab- or comma-separated:{" "}
                <code className="rounded bg-slate-100 px-1 text-[11px] font-bold text-slate-600">
                  text · A · B · C · D · correct
                </code>
              </p>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                rows={8}
                placeholder={"A particle is projected…\t2m\t4m\t6m\t8m\tB\nF = ma implies…\t…"}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
              <label className="flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Chapter for pasted rows
                <select
                  value={pasteChapter}
                  onChange={(e) => setPasteChapter(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold normal-case tracking-normal text-slate-800 focus:border-brand-400 focus:outline-none"
                >
                  {chapters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.subjectName})
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">
              <button
                onClick={() => setPasteOpen(false)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePaste}
                className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-700"
              >
                Add rows
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add-from-bank dialog ────────────────────────────── */}
      {bankOpen && test && (
        <AddFromBankDialog
          examTypeId={test.examTypeId}
          subjectId={test.subjectId}
          onAdd={handleBankAdd}
          onClose={() => setBankOpen(false)}
        />
      )}
    </AdminLayout>
  );
}
