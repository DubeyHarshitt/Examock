// pages/admin/examTypes/examTypePannel.tsx

import { useState } from 'react';
import ExamTypeForm from './component/examTypeForm';
import ExamTypeList from './component/examTypeList';
import type { ExamType } from '../../../store/admin/types/admin.types';

const ExamTypePanel = () => {
  const [editingExamType, setEditingExamType] = useState<ExamType | null>(null);

  const handleEditSelect = (examType: ExamType) => {
    setEditingExamType(examType);
  };

  const handleClearSelection = () => {
    setEditingExamType(null);
  };

  return (
    <div className="p-4">
      <div className="mb-5">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
          Exam Types Configuration
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Create, update, or remove comprehensive testing tracks here.
        </p>
      </div>

      <div className="space-y-6">
        <ExamTypeForm 
          editingExamType={editingExamType} 
          clearSelection={handleClearSelection} 
        />

        <ExamTypeList 
          onEdit={handleEditSelect} 
        />
      </div>
    </div>
  );
};

export default ExamTypePanel;