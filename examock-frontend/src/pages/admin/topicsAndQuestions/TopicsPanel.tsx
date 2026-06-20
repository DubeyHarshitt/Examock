// pages/admin/topics/TopicsPanel.tsx
import { useState, useEffect } from "react";
import { useAdminStore } from "../../../store/admin/admin.store";
import { Pencil, Trash2, Plus, Folder } from "lucide-react";

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

  const handleUpdate = async (id: string) => {
    if (!editingName.trim()) return;
    await updateTopic(id, { name: editingName.trim() });
    setEditingId(null);
  };

  if (!subjectId) return <div className="text-sm text-gray-400 text-center py-6">Select a subject first to view topics</div>;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-200">
      {/* Topic List and Creator */}
      <div className="md:col-span-1 p-4 bg-gray-50/50">
        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Topics Management</h3>
        
        <form onSubmit={handleCreate} className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="New Topic name..."
            value={newTopicName}
            onChange={(e) => setNewTopicName(e.target.value)}
            className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
          <button type="submit" className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            <Plus size={16} />
          </button>
        </form>

        {topicError && <p className="text-xs text-red-500 mb-2">{topicError}</p>}

        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {topicLoading && topics.length === 0 ? (
            <div className="text-xs text-gray-400 py-2">Loading...</div>
          ) : topics.length === 0 ? (
            <div className="text-xs text-gray-400 py-4 text-center">No structural sub-topics.</div>
          ) : (
            topics.map((topic) => (
              <div
                key={topic.id}
                onClick={() => onSelectTopic(topic.id)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all border text-xs font-medium ${
                  selectedTopicId === topic.id
                    ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm"
                    : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
                }`}
              >
                {editingId === topic.id ? (
                  <input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={() => handleUpdate(topic.id)}
                    className="w-full bg-white px-1 border border-indigo-400 rounded focus:outline-none"
                    autoFocus
                  />
                ) : (
                  <span className="truncate">{topic.name}</span>
                )}

                <div className="flex gap-1 opacity-60 hover:opacity-100 ml-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingId(topic.id);
                      setEditingName(topic.name);
                    }}
                    className="p-1 text-gray-500 hover:text-indigo-600 rounded"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if(confirm("Delete topic?")) deleteTopic(topic.id);
                    }}
                    className="p-1 text-gray-500 hover:text-red-600 rounded"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Mode Status Block */}
      <div className="md:col-span-2 p-4 flex flex-col justify-center items-center text-center bg-white min-h-[160px]">
        <Folder size={32} className="text-indigo-500 mb-2 opacity-80" />
        <p className="text-sm font-semibold text-gray-800">
          {selectedTopicId ? "Topic Scope Locked" : "Full Syllabus Scope Engaged"}
        </p>
        <p className="text-xs text-gray-400 mt-1 max-w-sm">
          {selectedTopicId 
            ? "Questions created now will belong precisely to this micro-topic unit."
            : "No topic selected. Questions created will default to a Subject-wide Full Syllabus target profile."}
        </p>
        {selectedTopicId && (
          <button 
            onClick={() => onSelectTopic("")}
            className="mt-3 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold px-3 py-1 rounded-full transition-colors"
          >
            Switch to Full Syllabus Mode
          </button>
        )}
      </div>
    </div>
  );
};

export default TopicsPanel;