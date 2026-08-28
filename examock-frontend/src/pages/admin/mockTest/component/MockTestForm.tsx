// pages/admin/mockTests/component/MockTestForm.tsx
import { useState, useEffect } from "react";
import { useAdminStore } from "../../../../store/admin/admin.store";
import type { MockTest, TestType, CreateMockTestDto, UpdateMockTestDto } from "../../../../store/admin/types/admin.types";

interface MockTestFormProps {
  examTypeId: string;
  subjectId: string;
  topicId: string; // currently selected topic in the dashboard, used as a default for CHAPTER tests
  editingTest: MockTest | null;
  onDone: () => void;
}

const TEST_TYPES: { value: TestType; label: string; helper: string }[] = [
  { value: "CHAPTER", label: "Chapter test", helper: "Scoped to one topic" },
  { value: "MODULE", label: "Module test", helper: "Scoped to one subject, no single topic" },
  { value: "FULL", label: "Full syllabus test", helper: "Spans the whole subject" },
];

const MockTestForm = ({ examTypeId, subjectId, topicId, editingTest, onDone }: MockTestFormProps) => {
  const { createMockTest, updateMockTest, mockTestsError } = useAdminStore();

  const [title, setTitle] = useState("");
  const [type, setType] = useState<TestType>("CHAPTER");
  const [durationMins, setDurationMins] = useState<number>(30);
  const [totalMarks, setTotalMarks] = useState<number>(40);
  const [isFree, setIsFree] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isEditing = !!editingTest;

  useEffect(() => {
    if (editingTest) {
      setTitle(editingTest.title);
      setType(editingTest.type);
      setDurationMins(editingTest.durationMins);
      setTotalMarks(editingTest.totalMarks);
      setIsFree(editingTest.isFree);
      setInstructions(editingTest.instructions ?? "");
    } else {
      setTitle("");
      setType("CHAPTER");
      setDurationMins(30);
      setTotalMarks(40);
      setIsFree(false);
      setInstructions("");
    }
  }, [editingTest]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !durationMins || !totalMarks) return;

    // A chapter test needs a topic to scope it; full/module tests are subject-wide.
    if (type === "CHAPTER" && !topicId) {
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing) {
        const payload: UpdateMockTestDto = {
          title: title.trim(),
          type,
          durationMins: Number(durationMins),
          totalMarks: Number(totalMarks),
          isFree,
          instructions: instructions.trim() || undefined,
          topicId: type === "CHAPTER" ? topicId : undefined,
          subjectId,
        };
        await updateMockTest(editingTest.id, payload);
      } else {
        const payload: CreateMockTestDto = {
          examTypeId,
          subjectId,
          title: title.trim(),
          type,
          durationMins: Number(durationMins),
          totalMarks: Number(totalMarks),
          isFree,
          instructions: instructions.trim() || undefined,
          topicId: type === "CHAPTER" ? topicId : undefined,
        };
        await createMockTest(payload);
      }
      onDone();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
      <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide border-b border-gray-100 pb-2">
        {isEditing ? "Edit mock test" : "Create mock test"}
      </h3>

      <div>
        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Title *</label>
        <input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Mechanics Chapter Test"
          className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Test type *</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {TEST_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value)}
              className={`text-left px-3 py-2 rounded-lg border text-xs transition-all ${
                type === t.value
                  ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                  : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              <p className="font-bold">{t.label}</p>
              <p className="text-gray-400 mt-0.5">{t.helper}</p>
            </button>
          ))}
        </div>
        {type === "CHAPTER" && !topicId && (
          <p className="text-xs text-amber-600 mt-2">
            Select a topic in the panel above first — chapter tests need one.
          </p>
        )}
        {type === "CHAPTER" && topicId && (
          <p className="text-xs text-gray-400 mt-2">Will be scoped to the currently selected topic.</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Duration (mins) *</label>
          <input
            type="number"
            required
            min={1}
            value={durationMins}
            onChange={(e) => setDurationMins(Number(e.target.value))}
            className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Total marks *</label>
          <input
            type="number"
            required
            min={1}
            value={totalMarks}
            onChange={(e) => setTotalMarks(Number(e.target.value))}
            className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">Instructions (optional)</label>
        <textarea
          rows={2}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          className="w-full text-sm p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
        />
      </div>

      <label className="flex items-center gap-2 text-xs font-semibold text-gray-600">
        <input type="checkbox" checked={isFree} onChange={(e) => setIsFree(e.target.checked)} />
        Free test (no payment required)
      </label>

      {mockTestsError && (
        <p className="text-xs font-semibold text-red-500 bg-red-50 p-2.5 rounded-lg border border-red-100">
          {mockTestsError}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting || (type === "CHAPTER" && !topicId)}
          className="flex-1 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {submitting ? "Saving..." : isEditing ? "Save changes" : "Create test"}
        </button>
        {isEditing && (
          <button
            type="button"
            onClick={onDone}
            className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};

export default MockTestForm;