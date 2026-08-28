// components/admin/subjects/SubjectsPanel.tsx
// Manage (add / edit / delete) the subjects that belong to an exam type.
// The admin selects a subject here; the rest of the content flow is scoped to it.

import { useState, useEffect } from "react";
import { useAdminStore } from "../../../store/admin/admin.store";
import SubjectList from "./component/SubjectList";
import SubjectForm from "./component/SubjectForm";
import { Library, Plus, X } from "lucide-react";
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

  const [showForm, setShowForm] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    fetchSubjects(examTypeId);
  }, [examTypeId, fetchSubjects]);

  const handleCreate = async (data: CreateSubjectDto | UpdateSubjectDto) => {
    await createSubject(data as CreateSubjectDto);
    setShowForm(false);
    setEditingSubject(null);
  };

  const handleUpdate = async (data: CreateSubjectDto | UpdateSubjectDto) => {
    if (!editingSubject) return;
    await updateSubject(editingSubject.id, data as UpdateSubjectDto);
    setEditingSubject(null);
    setShowForm(false);
  };

  const handleEditClick = (subject: Subject) => {
    setEditingSubject(subject);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
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
    <div className="card-surface overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Library size={16} className="text-brand-500" />
          <div>
            <h2 className="text-sm font-bold text-slate-900">Subjects</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {subjects.length} subject{subjects.length !== 1 ? "s" : ""} for this exam type
            </p>
          </div>
        </div>
        {!showForm && (
          <button
            onClick={() => {
              setEditingSubject(null);
              setShowForm(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors"
          >
            <Plus size={14} /> Add subject
          </button>
        )}
      </div>

      <div className="p-5 space-y-5">
        {/* Error banner */}
        {subjectsError && (
          <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 font-medium">
            {subjectsError}
          </div>
        )}

        {/* Add / edit form (shown on demand) */}
        {showForm && (
          <div className="bg-slate-50/60 border border-slate-100 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {editingSubject ? `Editing: ${editingSubject.name}` : "New subject"}
              </p>
              <button
                onClick={closeForm}
                className="text-slate-400 hover:text-slate-600 transition-colors"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
            <SubjectForm
              examTypeId={examTypeId}
              editingSubject={editingSubject}
              onSubmit={editingSubject ? handleUpdate : handleCreate}
              onCancel={closeForm}
            />
          </div>
        )}

        {/* List */}
        <SubjectList
          subjects={subjects}
          loading={subjectsLoading}
          onEdit={handleEditClick}
          onDelete={handleDeleteRequest}
        />
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-base font-bold text-slate-900">Delete Subject?</h3>
            <p className="text-xs text-slate-500 mt-1.5">
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

export default SubjectsPanel;
