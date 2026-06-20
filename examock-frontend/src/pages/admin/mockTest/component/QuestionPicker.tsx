// pages/admin/mockTests/component/QuestionPicker.tsx
import { useState, useEffect } from "react";
import { useAdminStore } from "../../../../store/admin/admin.store";
import { ArrowLeft, Plus, X, ChevronDown, ChevronRight } from "lucide-react";
import type { MockTest } from "../../../../store/admin/types/admin.types";

interface QuestionPickerProps {
  test: MockTest;
  onBack: () => void;
}

const QuestionPicker = ({ test, onBack }: QuestionPickerProps) => {
  const {
    currentMockTest,
    currentMockTestLoading,
    fetchMockTestDetail,
    addQuestionToTest,
    removeQuestionFromTest,
    mockTestsError,
    topics,
    fetchTopic,
    questions,
    fetchQuestions,
  } = useAdminStore();

  // For a CHAPTER test, the question source is just its own topic.
  // For MODULE/FULL tests, the picker needs every topic under the subject,
  // expandable one at a time so we don't fetch every topic's questions at once.
  const [expandedTopicId, setExpandedTopicId] = useState<string | null>(
    test.type === "CHAPTER" ? test.topicId ?? null : null
  );

  useEffect(() => {
    fetchMockTestDetail(test.id);
  }, [test.id, fetchMockTestDetail]);

  useEffect(() => {
    if (test.type !== "CHAPTER" && test.subjectId) {
      fetchTopic(test.subjectId);
    }
  }, [test.type, test.subjectId, fetchTopic]);

  useEffect(() => {
    if (expandedTopicId) {
      fetchQuestions(expandedTopicId, 1);
    }
  }, [expandedTopicId, fetchQuestions]);

  const addedQuestionIds = new Set((currentMockTest?.questions ?? []).map((tq) => tq.questionId));

  const handleAdd = async (questionId: string) => {
    const nextOrder = currentMockTest?.questions.length ?? 0;
    await addQuestionToTest(test.id, questionId, nextOrder);
  };

  const handleRemove = async (questionId: string) => {
    await removeQuestionFromTest(test.id, questionId);
  };

  // CHAPTER tests only ever browse their own topic — no topic list needed.
  const topicsToBrowse = test.type === "CHAPTER" && test.topicId
    ? topics.filter((t) => t.id === test.topicId)
    : topics;

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200 bg-white flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-md">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h2 className="text-sm font-bold text-gray-900">{test.title}</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {currentMockTest?.questions.length ?? 0} question{currentMockTest?.questions.length !== 1 ? "s" : ""} added
          </p>
        </div>
      </div>

      {mockTestsError && (
        <div className="m-5 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 font-medium">
          {mockTestsError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 p-5">
        {/* Left: browse and add questions, grouped by topic */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
            {test.type === "CHAPTER" ? "Questions in this topic" : "Browse by topic"}
          </p>

          {topicsToBrowse.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">No topics found for this subject.</p>
          ) : (
            <div className="space-y-2">
              {topicsToBrowse.map((topic) => {
                const isOpen = expandedTopicId === topic.id;
                return (
                  <div key={topic.id} className="border border-gray-100 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedTopicId(isOpen ? null : topic.id)}
                      className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <span className="text-xs font-semibold text-gray-700">{topic.name}</span>
                      {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>

                    {isOpen && (
                      <div className="p-2 space-y-1.5 max-h-72 overflow-y-auto">
                        {questions.length === 0 ? (
                          <p className="text-xs text-gray-400 py-3 text-center">No questions in this topic yet.</p>
                        ) : (
                          questions.map((q: any) => {
                            const added = addedQuestionIds.has(q.id);
                            return (
                              <div
                                key={q.id}
                                className="flex items-start gap-2 px-2.5 py-2 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
                              >
                                <p className="flex-1 text-xs text-gray-700 line-clamp-2">{q.text}</p>
                                <button
                                  onClick={() => (added ? handleRemove(q.id) : handleAdd(q.id))}
                                  className={`shrink-0 p-1 rounded-md transition-colors ${
                                    added
                                      ? "text-green-600 hover:text-red-500 hover:bg-red-50"
                                      : "text-gray-400 hover:text-indigo-600 hover:bg-indigo-50"
                                  }`}
                                  title={added ? "Remove from test" : "Add to test"}
                                >
                                  {added ? <X size={14} /> : <Plus size={14} />}
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: current test composition, in order */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Questions in this test</p>

          {currentMockTestLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : !currentMockTest || currentMockTest.questions.length === 0 ? (
            <p className="text-xs text-gray-400 py-8 text-center">
              No questions added yet. Add some from the left.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-[28rem] overflow-y-auto">
              {currentMockTest.questions.map((tq, idx) => (
                <div
                  key={tq.questionId}
                  className="flex items-start gap-2 px-2.5 py-2 rounded-lg border border-gray-100"
                >
                  <span className="text-[10px] font-bold text-gray-400 mt-0.5 shrink-0">{idx + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700 line-clamp-2">{tq.question.text}</p>
                    {tq.question.topic?.name && (
                      <p className="text-[10px] text-gray-400 mt-0.5">{tq.question.topic.name}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemove(tq.questionId)}
                    className="shrink-0 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                    title="Remove from test"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuestionPicker;