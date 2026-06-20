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
    return <div className="p-4 text-gray-500 text-center">Loading exam types...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Existing Exam Types</h3>
      </div>
      
      {examTypesError && (
        <div className="m-4 p-3 bg-red-50 text-red-700 text-sm rounded border border-red-200">
          Error: {examTypesError}
        </div>
      )}

      {examTypes.length === 0 ? (
        <div className="p-6 text-center text-gray-500">No exam types found. Create one above!</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Slug</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {examTypes.map((type) => (
                <tr key={type.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{type.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">{type.slug}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{type.description || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                    <button
                      onClick={() => onEdit(type)}
                      className="text-indigo-600 hover:text-indigo-900 focus:outline-none"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(type.id)}
                      className="text-red-600 hover:text-red-900 focus:outline-none"
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