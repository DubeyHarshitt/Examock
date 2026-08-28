// pages/admin/mockTests/MockTestsPanel.tsx
import { useState, useEffect } from "react";
import { useAdminStore } from "../../../store/admin/admin.store";
import MockTestForm from "./component/MockTestForm";
import MockTestList from "./component/MockTestList";
import QuestionPicker from "./component/QuestionPicker";
import type { MockTest } from "../../../store/admin/types/admin.types";

interface MockTestsPanelProps {
  examTypeId: string;
  subjectId: string;
  topicId: string; // currently selected topic from TopicsPanel, used as a default for CHAPTER tests
}

const MockTestsPanel = ({ examTypeId, subjectId, topicId }: MockTestsPanelProps) => {
  const { mockTests, mockTestsLoading, mockTestsError, fetchMockTests, deleteMockTest } = useAdminStore();

  const [editingTest, setEditingTest] = useState<MockTest | null>(null);
  const [builderTest, setBuilderTest] = useState<MockTest | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    fetchMockTests(examTypeId);
  }, [examTypeId, fetchMockTests]);

  // Only show tests belonging to the currently selected subject — getMockTests
  // is only filterable by examTypeId server-side today, so we narrow client-side.
  const subjectTests = mockTests.filter((t) => t.subjectId === subjectId);

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmId) return;
    await deleteMockTest(deleteConfirmId);
    setDeleteConfirmId(null);
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
    <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200 bg-white">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Mock tests</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          {subjectTests.length} test{subjectTests.length !== 1 ? "s" : ""} for this subject
        </p>
      </div>

      <div className="p-5 space-y-5">
        {mockTestsError && (
          <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 font-medium">
            {mockTestsError}
          </div>
        )}

        <MockTestForm
          examTypeId={examTypeId}
          subjectId={subjectId}
          topicId={topicId}
          editingTest={editingTest}
          onDone={() => {
            setEditingTest(null);
            fetchMockTests(examTypeId);
          }}
        />

        <MockTestList
          tests={subjectTests}
          loading={mockTestsLoading}
          onEdit={setEditingTest}
          onDelete={setDeleteConfirmId}
          onOpenBuilder={setBuilderTest}
        />
      </div>

      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-sm font-bold text-gray-900">Delete mock test?</h3>
            <p className="text-xs text-gray-500 mt-1.5">
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
                className="flex-1 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
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