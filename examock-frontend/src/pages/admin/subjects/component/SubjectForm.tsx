// components/admin/subjects/SubjectForm.tsx

import { useState, useEffect } from "react";
import type { Subject, CreateSubjectDto, UpdateSubjectDto } from "../../../../store/admin/types/admin.types";

interface SubjectFormProps {
  examTypeId: string;
  editingSubject?: Subject | null;
  onSubmit: (data: CreateSubjectDto | UpdateSubjectDto) => Promise<void>;
  onCancel?: () => void;
}

const SubjectForm = ({ examTypeId, editingSubject, onSubmit, onCancel }: SubjectFormProps) => {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!editingSubject;

  useEffect(() => {
    if (editingSubject) {
      setName(editingSubject.name);
    } else {
      setName("");
    }
    setError(null);
  }, [editingSubject]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Subject name is required.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const payload = isEditing
        ? ({ name: name.trim() } as UpdateSubjectDto)
        : ({ name: name.trim(), examTypeId } as CreateSubjectDto);

      await onSubmit(payload);
      setName("");
    } catch (err) {
      setError((err as Error).message ?? "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">
          Subject Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Physics"
          className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition-all bg-white"
          disabled={submitting}
          autoFocus
        />
      </div>

      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 py-2 text-sm font-semibold bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {submitting ? "Saving…" : isEditing ? "Save Changes" : "Add Subject"}
        </button>
        {isEditing && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};

export default SubjectForm;