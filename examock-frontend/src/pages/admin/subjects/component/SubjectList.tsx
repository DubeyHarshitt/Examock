// components/admin/subjects/SubjectList.tsx

import { Pencil, Trash2, BookOpen } from "lucide-react";
import type { Subject } from "../../../../store/admin/types/admin.types";

interface SubjectListProps {
  subjects: Subject[];
  onEdit: (subject: Subject) => void;
  onDelete: (id: string) => void;
  loading: boolean;
}

const SubjectList = ({ subjects, onEdit, onDelete, loading }: SubjectListProps) => {
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (subjects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <BookOpen size={40} className="mb-3 opacity-40" />
        <p className="text-sm font-medium">No subjects yet</p>
        <p className="text-xs mt-1">Add a subject to get started</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {subjects.map((subject) => (
        <li
          key={subject.id}
          className="flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg hover:border-indigo-300 hover:shadow-sm transition-all group"
        >
          <div>
            <p className="text-sm font-semibold text-gray-800">{subject.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">ID: {subject.id}</p>
          </div>
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(subject)}
              className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
              title="Edit subject"
            >
              <Pencil size={15} />
            </button>
            <button
              onClick={() => onDelete(subject.id)}
              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
              title="Delete subject"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
};

export default SubjectList;