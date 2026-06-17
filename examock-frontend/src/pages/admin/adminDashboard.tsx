// pages/admin/AdminDashboard.tsx

import { useEffect, useState } from "react";
import { useAuthStore } from "../../store/auth.store";
import SubjectsPanel from "../admin/subjects/SubjectsPanel"
import { useAdminStore } from "../../store/admin/admin.store";

const AdminDashboard = () => {
  const user = useAuthStore((state) => state.user);
  // Extract both the data and the fetch action from the store
const examTypes = useAdminStore((state) => state.examTypes);
const fetchExamTypes = useAdminStore((state) => state.fetchExamTypes);
  const [selectedExamTypeId, setSelectedExamTypeId] = useState<string>("");
  // Fetch on mount
  useEffect(() => {
    fetchExamTypes();
  }, []);

    // Set default selection once data loads
  useEffect(() => {
    if (examTypes.length > 0) {
      setSelectedExamTypeId(examTypes[0].id);
    }
  }, [examTypes]);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-xs text-gray-500 mt-0.5">Welcome back, {user?.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
            {user?.name?.[0]?.toUpperCase() ?? "A"}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Exam Type selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide mr-1">
            Exam Type:
          </span>
          {examTypes.map((et) => (
            <button
              key={et.id}
              onClick={() => setSelectedExamTypeId(et.id)}
              className={`px-4 py-1.5 text-sm font-semibold rounded-full border transition-all ${
                selectedExamTypeId === et.id
                  ? "bg-indigo-600 border-indigo-600 text-white"
                  : "bg-white border-gray-300 text-gray-600 hover:border-indigo-400"
              }`}
            >
              {et.name}
            </button>
          ))}
        </div>

        {/* Subjects panel — re-fetches automatically on examTypeId change */}
        <SubjectsPanel examTypeId={selectedExamTypeId} />

        {/* Future panels go here:
            <TopicsPanel examTypeId={selectedExamTypeId} />
            <QuestionsPanel examTypeId={selectedExamTypeId} />
        */}
      </main>
    </div>
  );
};

export default AdminDashboard;