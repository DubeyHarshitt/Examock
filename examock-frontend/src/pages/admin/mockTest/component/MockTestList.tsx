// pages/admin/mockTests/component/MockTestList.tsx
import { Pencil, Trash2, ListChecks, Clock } from "lucide-react";
import type { MockTest } from "../../../../store/admin/types/admin.types";

interface MockTestListProps {
  tests: MockTest[];
  loading: boolean;
  onEdit: (test: MockTest) => void;
  onDelete: (id: string) => void;
  onOpenBuilder: (test: MockTest) => void;
}

const TYPE_LABEL: Record<MockTest["type"], string> = {
  CHAPTER: "Chapter",
  MODULE: "Module",
  FULL: "Full syllabus",
};

const MockTestList = ({ tests, loading, onEdit, onDelete, onOpenBuilder }: MockTestListProps) => {
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  const activeTests = tests.filter((t) => t.isActive);

  if (activeTests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <ListChecks size={40} className="mb-3 opacity-40" />
        <p className="text-sm font-medium">No mock tests yet</p>
        <p className="text-xs mt-1">Create one above to start adding questions</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {activeTests.map((test) => (
        <li
          key={test.id}
          className="flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg hover:border-indigo-300 hover:shadow-sm transition-all group"
        >
          <button onClick={() => onOpenBuilder(test)} className="flex-1 text-left">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-gray-800">{test.title}</p>
              <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600">
                {TYPE_LABEL[test.type]}
              </span>
              {test.isFree && (
                <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-green-50 text-green-600">
                  Free
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
              <span className="flex items-center gap-1">
                <Clock size={11} /> {test.durationMins} mins
              </span>
              <span>{test.totalMarks} marks</span>
              <span>{test._count?.questions ?? 0} questions added</span>
              {test.topic?.name && <span>Topic: {test.topic.name}</span>}
            </div>
          </button>
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(test)}
              className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
              title="Edit test details"
            >
              <Pencil size={15} />
            </button>
            <button
              onClick={() => onDelete(test.id)}
              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
              title="Delete test"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
};

export default MockTestList;