import { useEffect, useState } from "react";
import { useAuthStore } from "../../store/auth.store";
import { useAdminStore } from "../../store/admin/admin.store";
import { Settings, BookOpen, ListChecks, FileText } from "lucide-react";

import ExamTypePanel from "./examTypes/examTypePannel";
import SubjectsPanel from "./subjects/SubjectsPanel";
import TopicsPanel from "./topicsAndQuestions/TopicsPanel";
import QuestionForm from "./topicsAndQuestions/QuestionForm";
import MockTestsPanel from "./mockTest/MockTestPannel";
import NotesPanel from "./notesUpload/NotesPannel";

type ContentTab = "questionBank" | "mockTests" | "notes";

const AdminDashboard = () => {
  const user = useAuthStore((state) => state.user);
  const { examTypes, fetchExamTypes, subjects, fetchSubjects } = useAdminStore();

  const [selectedExamTypeId, setSelectedExamTypeId] = useState<string>("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedTopicId, setSelectedTopicId] = useState<string>("");
  const [isManagingExamTypes, setIsManagingExamTypes] = useState<boolean>(false);
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
    }
  }, [selectedExamTypeId, fetchSubjects]);

  useEffect(() => {
    if (subjects.length > 0) {
      setSelectedSubjectId(subjects[0].id);
    } else {
      setSelectedSubjectId("");
    }
    setSelectedTopicId("");
  }, [subjects]);

  const TABS: { key: ContentTab; label: string; icon: React.ReactNode }[] = [
    { key: "questionBank", label: "Question bank", icon: <BookOpen size={14} /> },
    { key: "mockTests",    label: "Mock tests",    icon: <ListChecks size={14} /> },
    { key: "notes",        label: "Notes",         icon: <FileText size={14} /> },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-xs text-gray-500 mt-0.5">Welcome back, {user?.name}</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
          {user?.name?.[0]?.toUpperCase() ?? "A"}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Exam type selector */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-4">
          <div className="flex items-center gap-2 overflow-x-auto py-1">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide mr-1">Exam:</span>
            {examTypes.map((et) => (
              <button
                key={et.id}
                onClick={() => {
                  setSelectedExamTypeId(et.id);
                  setIsManagingExamTypes(false);
                }}
                className={`px-4 py-1.5 text-sm font-semibold rounded-full border transition-all ${
                  selectedExamTypeId === et.id && !isManagingExamTypes
                    ? "bg-indigo-600 border-indigo-600 text-white"
                    : "bg-white border-gray-300 text-gray-600 hover:border-indigo-400"
                }`}
              >
                {et.name}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsManagingExamTypes(!isManagingExamTypes)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg border transition-all ${
              isManagingExamTypes
                ? "bg-gray-800 text-white border-gray-800"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            <Settings size={14} />
            {isManagingExamTypes ? "Close configuration" : "Configure exam types"}
          </button>
        </div>

        {isManagingExamTypes ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <ExamTypePanel />
          </div>
        ) : selectedExamTypeId ? (
          <div className="space-y-6">
            <SubjectsPanel examTypeId={selectedExamTypeId} />

            {subjects.length > 0 && (
              <div className="space-y-4">
                {/* Subject selector */}
                <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
                  <BookOpen size={16} className="text-gray-400" />
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-2">Subject:</span>
                  <div className="flex gap-2">
                    {subjects.map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => {
                          setSelectedSubjectId(sub.id);
                          setSelectedTopicId("");
                        }}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                          selectedSubjectId === sub.id
                            ? "bg-indigo-100 text-indigo-700 border border-indigo-300"
                            : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        {sub.name}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedSubjectId && (
                  <>
                    <TopicsPanel
                      subjectId={selectedSubjectId}
                      selectedTopicId={selectedTopicId}
                      onSelectTopic={setSelectedTopicId}
                    />

                    {/* Tab bar */}
                    <div className="flex items-center gap-2 border-b border-gray-200">
                      {TABS.map(({ key, label, icon }) => (
                        <button
                          key={key}
                          onClick={() => setActiveTab(key)}
                          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wide border-b-2 transition-colors ${
                            activeTab === key
                              ? "border-indigo-600 text-indigo-700"
                              : "border-transparent text-gray-400 hover:text-gray-600"
                          }`}
                        >
                          {icon} {label}
                        </button>
                      ))}
                    </div>

                    {/* Tab content */}
                    {activeTab === "questionBank" ? (
                      <QuestionForm topicId={selectedTopicId} />
                    ) : activeTab === "mockTests" ? (
                      <MockTestsPanel
                        examTypeId={selectedExamTypeId}
                        subjectId={selectedSubjectId}
                        topicId={selectedTopicId}
                      />
                    ) : (
                      <NotesPanel
                        examTypeId={selectedExamTypeId}
                        subjectId={selectedSubjectId}
                        topicId={selectedTopicId}
                      />
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <p className="text-sm text-gray-500">Create an exam type to get started.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;