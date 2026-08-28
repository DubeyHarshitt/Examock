// components/admin/subjects/SubjectsPanel.tsx

import { useState, useEffect } from "react";
import { useAdminStore } from "../../../store/admin/admin.store";
import SubjectList from "./component/SubjectList";
import SubjectForm from "./component/SubjectForm";
import type { Subject, CreateSubjectDto, UpdateSubjectDto } from "../../../store/admin/types/admin.types"

interface SubjectsPanelProps {
  examTypeId: string;
}

const SubjectsPanel = ({ examTypeId }: SubjectsPanelProps) => {
  const {
    subjects,
    subjectsLoading,
    subjectsError,
    fetchSubjects,
    createSubject,
    updateSubject,
    deleteSubject,
  } = useAdminStore();

  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    fetchSubjects(examTypeId);
  }, [examTypeId, fetchSubjects]);

  const handleCreate = async (data: CreateSubjectDto | UpdateSubjectDto) => {
    await createSubject(data as CreateSubjectDto);
  };

  const handleUpdate = async (data: CreateSubjectDto | UpdateSubjectDto) => {
    if (!editingSubject) return;
    await updateSubject(editingSubject.id, data as UpdateSubjectDto);
    setEditingSubject(null);
  };

  const handleDeleteRequest = (id: string) => {
    setDeleteConfirmId(id);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmId) return;
    await deleteSubject(deleteConfirmId);
    setDeleteConfirmId(null);
  };

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-200 bg-white">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
          Subjects
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          {subjects.length} subject{subjects.length !== 1 ? "s" : ""} for this exam type
        </p>
      </div>

      <div className="p-5 space-y-5">
        {/* Error banner */}
        {subjectsError && (
          <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 font-medium">
            {subjectsError}
          </div>
        )}

        {/* Form */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            {editingSubject ? `Editing: ${editingSubject.name}` : "New Subject"}
          </p>
          <SubjectForm
            examTypeId={examTypeId}
            editingSubject={editingSubject}
            onSubmit={editingSubject ? handleUpdate : handleCreate}
            onCancel={() => setEditingSubject(null)}
          />
        </div>

        {/* List */}
        <SubjectList
          subjects={subjects}
          loading={subjectsLoading}
          onEdit={setEditingSubject}
          onDelete={handleDeleteRequest}
        />
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-sm font-bold text-gray-900">Delete Subject?</h3>
            <p className="text-xs text-gray-500 mt-1.5">
              This action cannot be undone. The subject and its associated data will be permanently removed.
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

export default SubjectsPanel;