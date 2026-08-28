import { useEffect, useState } from "react";
import { useAdminStore } from "../../store/admin/admin.store";
import {
  Settings,
  BookOpen,
  ListChecks,
  FileText,
  MonitorPlay,
  ChevronRight,
  GraduationCap,
  Library,
  LayoutGrid,
} from "lucide-react";
import { AdminLayout } from "../../components/layout/AdminLayout";

import ExamTypePanel from "./examTypes/examTypePannel";
import SubjectsPanel from "./subjects/SubjectsPanel";
import TopicsPanel from "./topicsAndQuestions/TopicsPanel";
import QuestionForm from "./topicsAndQuestions/QuestionForm";
import MockTestsPanel from "./mockTest/MockTestPannel";
import NotesPanel from "./notesUpload/NotesPannel";
import VideosPanel from "./videos/VideosPanel";
import YtChannelsPanel from "./channels/YtChannelsPanel";

type ContentTab = "questionBank" | "mockTests" | "notes" | "videos";

/** Small labelled dropdown-like chip menu. */
interface SelectorProps {
  label: string;
  icon: React.ReactNode;
  options: { id: string; name: string }[];
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
}

function Selector({
  label,
  icon,
  options,
  value,
  onChange,
  placeholder,
}: SelectorProps) {
  return (
    <div className="flex flex-col gap-1.5 min-w-[180px]">
      <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
        {icon}
        {label}
      </span>
      {options.length === 0 ? (
        <div className="px-3 py-2 text-xs text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-lg">
          {placeholder}
        </div>
      ) : (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 text-sm font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition-all cursor-pointer"
        >
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

const AdminDashboard = () => {
  const { examTypes, fetchExamTypes, subjects, fetchSubjects } = useAdminStore();

  const [selectedExamTypeId, setSelectedExamTypeId] = useState<string>("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedTopicId, setSelectedTopicId] = useState<string>("");
  const [showSettings, setShowSettings] = useState<"none" | "examTypes" | "channels">("none");
  const [activeTab, setActiveTab] = useState<ContentTab>("questionBank");

  useEffect(() => {
    fetchExamTypes();
  }, [fetchExamTypes]);

  useEffect(() => {
    if (examTypes.length > 0 && !selectedExamTypeId) {
      setSelectedExamTypeId(examTypes[0].id);
    }
  }, [examTypes, selectedExamTypeId]);

  useEffect(() => {
    if (selectedExamTypeId && typeof fetchSubjects === "function") {
      fetchSubjects(selectedExamTypeId);
      // Reset downstream selection on exam-type change. The first subject
      // auto-selects below once the list loads.
      setSelectedSubjectId("");
      setSelectedTopicId("");
    }
  }, [selectedExamTypeId, fetchSubjects]);

  // Auto-select the first subject for the exam type once the list is loaded.
  // This keeps the visible dropdown value and the actual selection in sync, so
  // the downstream panels (Topics, Mock tests, etc.) render on the default
  // subject instead of requiring a manual re-pick.
  useEffect(() => {
    if (subjects.length === 0) return;
    const stillValid = subjects.some((s) => s.id === selectedSubjectId);
    if (!stillValid) {
      setSelectedSubjectId(subjects[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjects, selectedSubjectId]);

  const selectedExamType =
    examTypes.find((et) => et.id === selectedExamTypeId) ?? null;
  const selectedSubject =
    subjects.find((s) => s.id === selectedSubjectId) ?? null;

  const TABS: { key: ContentTab; label: string; hint: string; icon: React.ReactNode }[] = [
    { key: "questionBank", label: "Question bank", hint: "Add & manage MCQ questions", icon: <BookOpen size={16} /> },
    { key: "mockTests",    label: "Mock tests",    hint: "Build and publish practice tests", icon: <ListChecks size={16} /> },
    { key: "notes",        label: "Notes",         hint: "Upload study PDFs", icon: <FileText size={16} /> },
    { key: "videos",       label: "Videos",        hint: "Link learning videos", icon: <MonitorPlay size={16} /> },
  ];

  const handleExamTypeSelect = (id: string) => {
    setSelectedExamTypeId(id);
    setShowSettings("none");
  };

  return (
    <AdminLayout
      title="Content"
      subtitle="Build your question banks, mock tests, notes and videos"
    >
      <div className="space-y-6">
        {/* ── Settings shortcut (exam types & channels) ─────────────────── */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1">
            Tools
          </span>
          <button
            onClick={() => setShowSettings("none")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
              showSettings === "none"
                ? "bg-brand-600 text-white border-brand-600 shadow-sm shadow-brand-600/20"
                : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
            }`}
          >
            <LayoutGrid size={14} />
            Content builder
          </button>
          <button
            onClick={() =>
              setShowSettings((v) => (v === "examTypes" ? "none" : "examTypes"))
            }
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
              showSettings === "examTypes"
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
            }`}
          >
            <GraduationCap size={14} />
            Exam types
          </button>
          <button
            onClick={() =>
              setShowSettings((v) => (v === "channels" ? "none" : "channels"))
            }
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
              showSettings === "channels"
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
            }`}
          >
            <MonitorPlay size={14} />
            YouTube channels
          </button>
        </div>

        {/* ── Settings view ─────────────────────────────────────────────── */}
        {showSettings === "examTypes" ? (
          <div className="card-surface overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <GraduationCap size={16} className="text-brand-500" />
              <div>
                <h2 className="text-sm font-bold text-slate-900">Exam types</h2>
                <p className="text-xs text-slate-500">
                  Create and manage the testing tracks shown to students.
                </p>
              </div>
            </div>
            <ExamTypePanel />
          </div>
        ) : showSettings === "channels" && selectedExamTypeId ? (
          <div className="card-surface overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <MonitorPlay size={16} className="text-brand-500" />
              <div>
                <h2 className="text-sm font-bold text-slate-900">YouTube channels</h2>
                <p className="text-xs text-slate-500">
                  Recommend channels for students preparing for {selectedExamType?.name}.
                </p>
              </div>
            </div>
            <div className="p-5">
              <YtChannelsPanel examTypeId={selectedExamTypeId} />
            </div>
          </div>
        ) : (
          /* ── Main content builder ────────────────────────────────────── */
          <div className="space-y-6">
            {/* Context selector — the guided path */}
            <div className="card-surface p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-4">
                <Settings size={15} className="text-brand-500" />
                <h2 className="text-sm font-bold text-slate-900">Where are you adding content?</h2>
              </div>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-2">
                {/* Exam type */}
                <Selector
                  label="Exam type"
                  icon={<GraduationCap size={13} className="text-brand-500" />}
                  options={examTypes}
                  value={selectedExamTypeId}
                  onChange={handleExamTypeSelect}
                  placeholder="No exam types yet"
                />
                <ChevronRight size={16} className="hidden md:block text-slate-300 shrink-0" />
                <Selector
                  label="Subject"
                  icon={<Library size={13} className="text-brand-500" />}
                  options={subjects}
                  value={selectedSubjectId}
                  onChange={(id) => {
                    setSelectedSubjectId(id);
                    setSelectedTopicId(""); // topics belong to one subject
                  }}
                  placeholder="No subjects yet"
                />
                <span className="hidden md:block text-xs text-slate-300 font-bold">·</span>
                <span className="text-xs text-slate-400 md:max-w-[260px] leading-relaxed">
                  {selectedTopicId
                    ? "A topic is selected — content is scoped to it every place it matters."
                    : "No topic selected yet — you can still add content for the whole subject."}
                </span>
              </div>
            </div>

            {!selectedExamType ? (
              <div className="card-surface flex flex-col items-center justify-center py-14 text-center">
                <GraduationCap size={36} className="text-slate-300 mb-3" />
                <p className="text-sm font-medium text-slate-600">
                  Create an exam type to get started.
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Use the "Exam types" tool above to set up your first testing track.
                </p>
              </div>
            ) : (
              <>
                {/* Subjects manager — always available so admins can add subjects */}
                <SubjectsPanel examTypeId={selectedExamTypeId} />

                {selectedSubject ? (
                  <>
                    {/* Topics manager */}
                    <TopicsPanel
                      subjectId={selectedSubjectId}
                      selectedTopicId={selectedTopicId}
                      onSelectTopic={setSelectedTopicId}
                    />

                    {/* Content type tabs */}
                    <div className="card-surface overflow-hidden">
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 p-3 border-b border-slate-100">
                        {TABS.map(({ key, label, hint, icon }) => (
                          <button
                            key={key}
                            onClick={() => setActiveTab(key)}
                            className={`flex flex-col items-start gap-1 px-3 py-2.5 rounded-xl border text-left transition-all ${
                              activeTab === key
                                ? "bg-brand-600 border-brand-600 text-white shadow-sm shadow-brand-600/20"
                                : "bg-white border-slate-200 text-slate-600 hover:border-brand-300 hover:bg-brand-50/40"
                            }`}
                          >
                            <span className="flex items-center gap-1.5 text-sm font-bold">
                              {icon}
                              {label}
                            </span>
                            <span
                              className={`text-[11px] leading-tight ${
                                activeTab === key ? "text-brand-100" : "text-slate-400"
                              }`}
                            >
                              {hint}
                            </span>
                          </button>
                        ))}
                      </div>
                      <div className="bg-slate-50/60">
                        {activeTab === "questionBank" ? (
                          <QuestionForm topicId={selectedTopicId} />
                        ) : activeTab === "mockTests" ? (
                          <MockTestsPanel
                            examTypeId={selectedExamTypeId}
                            subjectId={selectedSubjectId}
                            topicId={selectedTopicId}
                          />
                        ) : activeTab === "notes" ? (
                          <NotesPanel
                            examTypeId={selectedExamTypeId}
                            subjectId={selectedSubjectId}
                            topicId={selectedTopicId}
                          />
                        ) : (
                          <VideosPanel topicId={selectedTopicId} />
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="card-surface flex flex-col items-center justify-center py-12 text-center">
                    <Library size={30} className="text-slate-300 mb-2" />
                    <p className="text-sm font-medium text-slate-500">
                      Add a subject first
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Use the Subject manager above to create a subject for {selectedExamType.name}.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;