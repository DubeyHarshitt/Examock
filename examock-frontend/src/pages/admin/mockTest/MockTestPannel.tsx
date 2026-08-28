// pages/admin/mockTests/MockTestsPanel.tsx
// Manage (add / edit / delete) mock tests for the selected subject, and
// open the question builder to attach questions to each test.

import { useState, useEffect } from "react";
import { useAdminStore } from "../../../store/admin/admin.store";
import MockTestForm from "./component/MockTestForm";
import MockTestList from "./component/MockTestList";
import QuestionPicker from "./component/QuestionPicker";
import { ListChecks, Plus, X } from "lucide-react";
import type { MockTest } from "../../../store/admin/types/admin.types";

interface MockTestsPanelProps {
  examTypeId: string;
  subjectId: string;
  topicId: string; // currently selected topic from TopicsPanel, used as a default for CHAPTER tests
}

const MockTestsPanel = ({ examTypeId, subjectId, topicId }: MockTestsPanelProps) => {
  const { mockTests, mockTestsLoading, mockTestsError, fetchMockTests, deleteMockTest } = useAdminStore();

  const [showForm, setShowForm] = useState(false);
  const [editingTest, setEditingTest] = useState<MockTest | null>(null);
  const [builderTest, setBuilderTest] = useState<MockTest | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    fetchMockTests(examTypeId);
    setShowForm(false);
    setEditingTest(null);
  }, [examTypeId, fetchMockTests]);

  // Only show tests belonging to the currently selected subject — getMockTests
  // is only filterable by examTypeId server-side today, so we narrow client-side.
  const subjectTests = mockTests.filter((t) => t.subjectId === subjectId);
  const activeCount = subjectTests.filter((t) => t.isActive).length;

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmId) return;
    await deleteMockTest(deleteConfirmId);
    setDeleteConfirmId(null);
  };

  const handleAddClick = () => {
    setEditingTest(null);
    setShowForm(true);
  };

  const handleEditClick = (test: MockTest) => {
    setEditingTest(test);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingTest(null);
  };

  if (builderTest) {
    return (
      <QuestionPicker
        test={builderTest}
        onBack={() => {
          setBuilderTest(null);
          fetchMockTests(examTypeId); // refresh question counts after edits
        }}
      />
    );
  }

  return (
    <div className="card-surface overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ListChecks size={16} className="text-brand-500" />
          <div>
            <h2 className="text-sm font-bold text-slate-900">Mock tests</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeCount} test{activeCount !== 1 ? "s" : ""} for this subject
            </p>
          </div>
        </div>
        {!showForm && (
          <button
            onClick={handleAddClick}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors"
          >
            <Plus size={14} /> Add mock test
          </button>
        )}
      </div>

      <div className="p-5 space-y-5">
        {mockTestsError && (
          <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 font-medium">
            {mockTestsError}
          </div>
        )}

        {showForm && (
          <div className="relative">
            <div className="absolute right-0 top-[-10px] z-10">
              <button
                onClick={closeForm}
                className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
            <MockTestForm
              examTypeId={examTypeId}
              subjectId={subjectId}
              topicId={topicId}
              editingTest={editingTest}
              onDone={() => {
                setShowForm(false);
                setEditingTest(null);
                fetchMockTests(examTypeId);
              }}
            />
          </div>
        )}

        <MockTestList
          tests={subjectTests}
          loading={mockTestsLoading}
          onEdit={handleEditClick}
          onDelete={setDeleteConfirmId}
          onOpenBuilder={setBuilderTest}
        />
      </div>

      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-base font-bold text-slate-900">Delete mock test?</h3>
            <p className="text-xs text-slate-500 mt-1.5">
              This will deactivate the test. Existing attempts are kept for records.
            </p>
            <div className="flex gap-2 mt-5">
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MockTestsPanel;
