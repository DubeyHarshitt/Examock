import React, { useState, useEffect } from 'react';
import { useAdminStore } from '../../../../store/admin/admin.store';
import type { ExamType } from '../../../../store/admin/types/admin.types';

interface ExamTypeFormProps {
  editingExamType: ExamType | null;
  clearSelection: () => void;
}

const ExamTypeForm: React.FC<ExamTypeFormProps> = ({ editingExamType, clearSelection }) => {
  const { createExamType, updateExamType } = useAdminStore();
  
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Populate form if we are editing an existing item
  useEffect(() => {
    if (editingExamType) {
      setFormData({
        name: editingExamType.name,
        slug: editingExamType.slug,
        description: editingExamType.description || '',
      });
    } else {
      setFormData({ name: '', slug: '', description: '' });
    }
  }, [editingExamType]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      // Auto-generate slug if user updates the name (only during creation mode)
      slug: name === 'name' && !editingExamType 
        ? value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        : name === 'slug' ? value.toLowerCase().replace(/\s+/g, '-') : prev.slug,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.slug) return;

    setIsSubmitting(true);
    try {
      if (editingExamType) {
        await updateExamType(editingExamType.id, formData);
        clearSelection();
      } else {
        await createExamType(formData);
      }
      // Reset form if it was a successful creation
      if (!editingExamType) {
        setFormData({ name: '', slug: '', description: '' });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card-surface p-5">
      <h3 className="text-sm font-bold text-slate-900 mb-4">
        {editingExamType ? 'Update Exam Type' : 'Create New Exam Type'}
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Name *</label>
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Scholastic Assessment Test"
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Slug *</label>
            <input
              type="text"
              name="slug"
              required
              value={formData.slug}
              onChange={handleChange}
              placeholder="e.g., sat-exam"
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition-all bg-slate-50"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Description</label>
          <textarea
            name="description"
            rows={3}
            value={formData.description}
            onChange={handleChange}
            placeholder="Provide a brief explanation of this testing structure..."
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition-all"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          {editingExamType && (
            <button
              type="button"
              onClick={clearSelection}
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : editingExamType ? 'Update Type' : 'Create Type'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ExamTypeForm;