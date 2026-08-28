// pages/admin/topicsAndQuestions/TopicsPanel.tsx
// Manage (create / edit / delete) the topics that belong to a subject.
// Selecting a topic scopes the content tools (questions, tests, notes) to it.

import { useState, useEffect } from "react";
import { useAdminStore } from "../../../store/admin/admin.store";
import { Pencil, Trash2, Plus, Check, X, FolderOpen } from "lucide-react";

interface TopicsPanelProps {
  subjectId: string;
  selectedTopicId: string;
  onSelectTopic: (id: string) => void;
}

const TopicsPanel = ({ subjectId, selectedTopicId, onSelectTopic }: TopicsPanelProps) => {
  const { topics, topicLoading, topicError, fetchTopic, createTopic, updateTopic, deleteTopic } = useAdminStore();
  const [newTopicName, setNewTopicName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  useEffect(() => {
    if (subjectId) {
      fetchTopic(subjectId);
    }
  }, [subjectId, fetchTopic]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicName.trim()) return;
    await createTopic({ name: newTopicName.trim(), subjectId });
    setNewTopicName("");
  };

  const handleSaveEdit = async (id: string) => {
    if (!editingName.trim()) return;
    await updateTopic(id, { name: editingName.trim() });
    setEditingId(null);
  };

  if (!subjectId)
    return (
      <div className="text-sm text-slate-400 text-center py-6">
        Select a subject first to view topics
      </div>
    );

  return (
    <div className="card-surface overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FolderOpen size={16} className="text-brand-500" />
          <div>
            <h2 className="text-sm font-bold text-slate-900">Topics</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {topics.length} topic{topics.length !== 1 ? "s" : ""} · pick one to scope questions, tests & notes
            </p>
          </div>
        </div>
        <span className="text-xs font-medium text-slate-500">
          {selectedTopicId ? "Topic selected" : "No topic (full subject)"}
        </span>
      </div>

      <div className="p-5 space-y-4">
        {topicError && (
          <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 font-medium">
            {topicError}
          </div>
        )}

        {/* Add topic */}
        <form onSubmit={handleCreate} className="flex gap-2">
          <input
            type="text"
            placeholder="Add a new topic…"
            value={newTopicName}
            onChange={(e) => setNewTopicName(e.target.value)}
            className="flex-1 px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white"
          />
          <button
            type="submit"
            disabled={!newTopicName.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700 transition-colors disabled:opacity-50"
          >
            <Plus size={15} /> Add
          </button>
        </form>

        {/* Topic list */}
        {topicLoading && topics.length === 0 ? (
          <div className="text-sm text-slate-400 text-center py-8">Loading topics…</div>
        ) : topics.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <FolderOpen size={28} className="text-slate-300 mb-2" />
            <p className="text-sm font-medium text-slate-500">No topics yet</p>
            <p className="text-xs text-slate-400 mt-1">Add your first topic above.</p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {topics.map((topic) => {
              const isActive = selectedTopicId === topic.id;
              const isEditing = editingId === topic.id;
              return (
                <li
                  key={topic.id}
                  onClick={() => !isEditing && onSelectTopic(topic.id)}
                  className={`group flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl cursor-pointer border transition-all text-sm font-medium ${
                    isActive
                      ? "bg-brand-50 border-brand-200 text-brand-700"
                      : "bg-slate-50/60 border-slate-100 text-slate-700 hover:border-brand-200"
                  }`}
                >
                  {isEditing ? (
                    <>
                      <input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveEdit(topic.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="flex-1 min-w-0 bg-white px-2 py-1 text-sm border border-brand-400 rounded-lg focus:outline-none"
                        autoFocus
                      />
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveEdit(topic.id);
                          }}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md"
                          title="Save"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(null);
                          }}
                          className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-md"
                          title="Cancel"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="truncate">{topic.name}</span>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(topic.id);
                            setEditingName(topic.name);
                          }}
                          className="p-1.5 text-slate-500 hover:text-brand-600 rounded-md"
                          title="Edit topic"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("Delete this topic?")) deleteTopic(topic.id);
                          }}
                          className="p-1.5 text-slate-500 hover:text-red-600 rounded-md"
                          title="Delete topic"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {/* Scope hint */}
        <p className="text-xs text-slate-400 border-t border-slate-100 pt-3">
          {selectedTopicId
            ? "Content you create below will be scoped to the selected topic."
            : "No topic selected — content will apply to the whole subject."}{" "}
          <button
            type="button"
            onClick={() => onSelectTopic("")}
            className="font-semibold text-brand-600 hover:underline"
          >
            Clear topic selection
          </button>
        </p>
      </div>
    </div>
  );
};

export default TopicsPanel;
