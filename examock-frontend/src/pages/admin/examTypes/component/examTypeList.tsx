import React, { useEffect } from 'react';
import { useAdminStore } from '../../../../store/admin/admin.store';
import type { ExamType } from '../../../../store/admin/types/admin.types';

interface ExamTypeListProps {
  onEdit: (examType: ExamType) => void;
}

const ExamTypeList: React.FC<ExamTypeListProps> = ({ onEdit }) => {
  // Extracting state and actions from your Zustand store
  const { examTypes, examTypesLoading, examTypesError, fetchExamTypes, deleteExamType } = useAdminStore();

  useEffect(() => {
    fetchExamTypes();
  }, [fetchExamTypes]);

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this exam type?')) {
      await deleteExamType(id);
    }
  };

  if (examTypesLoading && examTypes.length === 0) {
    return <div className="p-4 text-slate-500 text-center">Loading exam types...</div>;
  }

  return (
    <div className="card-surface overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="text-sm font-bold text-slate-900">Existing Exam Types</h3>
      </div>
      
      {examTypesError && (
        <div className="m-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
          Error: {examTypesError}
        </div>
      )}

      {examTypes.length === 0 ? (
        <div className="p-6 text-center text-slate-500">No exam types found. Create one above!</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50/80">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Slug</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-50">
              {examTypes.map((type) => (
                <tr key={type.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3.5 whitespace-nowrap text-sm font-medium text-slate-900">{type.name}</td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-sm text-slate-500">
                    <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-mono">{type.slug}</span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-500 max-w-xs truncate">{type.description || '-'}</td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-right text-sm font-medium space-x-3">
                    <button
                      onClick={() => onEdit(type)}
                      className="text-brand-600 hover:text-brand-800 font-semibold"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(type.id)}
                      className="text-red-600 hover:text-red-800 font-semibold"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ExamTypeList;