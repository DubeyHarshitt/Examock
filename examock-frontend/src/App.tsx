import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useInitAuth } from "./hooks/authHook/useInitAuth";

import { ToastProvider } from "./components/ui/toast/ToastProvider";

// Auth
import LoginPage from "./pages/auth/LoginPage";
import OnboardingPage from "./pages/auth/OnboardingPage";

// Student
import DashboardPage from "./pages/dashboard/dashboardPage";
// import SubjectListPage from "./pages/subjects/SubjectListPage";
// import TopicListPage from "./pages/subjects/TopicListPage";
// import VideoPage from "./pages/videos/VideoPage";
// import TestListPage from "./pages/tests/TestListPage";
// import TestDetailPage from "./pages/tests/TestDetailPage";
// import TestEnginePage from "./pages/tests/TestEnginePage";
// import TestResultPage from "./pages/tests/TestResultPage";
// import NotesPage from "./pages/notes/NotesPage";
// import ChannelsPage from "./pages/channels/ChannelsPage";
// import ProgressPage from "./pages/progress/ProgressPage";
// import ChatPage from "./pages/rag/ChatPage";
// import UploadPage from "./pages/rag/UploadPage";

// Admin
import AdminDashboard from "./pages/admin/adminDashboard";
// import ExamTypesPage from "./pages/admin/ExamTypesPage";
// import SubjectsPage from "./pages/admin/SubjectsPage";
// import TopicsPage from "./pages/admin/TopicsPage";
// import VideosPage from "./pages/admin/VideosPage";
// import QuestionsPage from "./pages/admin/QuestionsPage";
// import MockTestsPage from "./pages/admin/MockTestsPage";
// import AdminNotesPage from "./pages/admin/NotesPage";
// import UsersPage from "./pages/admin/UsersPage";

// Route guards
import ProtectedRoute from "./components/shared/ProtectedRoute";
import AdminRoute from "./components/shared/AdminRoute";
import OnboardingRoute from "./components/shared/OnboardingRoute";

// UI Pages
import Spinner from "./components/ui/Spinner";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1, // only retry once on failure
      staleTime: 1000 * 60 * 5, // cache data for 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  const { loading } = useInitAuth();
  if (loading)
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner />
      </div>
    );

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* ── Public routes ─────────────────────────────── */}
            <Route path="/login" element={<LoginPage />} />

            {/* ── Onboarding — auth required, not yet fully onboarded ── */}
            <Route element={<OnboardingRoute />}>
              <Route path="/onboarding" element={<OnboardingPage />} />
            </Route>

            {/* ── Student routes — auth + fully onboarded ───── */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<DashboardPage />} />
              {/* <Route path="/subjects"       element={<SubjectListPage />} />
              <Route path="/subjects/:subjectId/topics" element={<TopicListPage />} />
              <Route path="/topics/:topicId/videos"     element={<VideoPage />} />
              <Route path="/tests"          element={<TestListPage />} />
              <Route path="/tests/:id"      element={<TestDetailPage />} />
              <Route path="/tests/:id/take" element={<TestEnginePage />} />
              <Route path="/tests/:id/result" element={<TestResultPage />} />
              <Route path="/notes"          element={<NotesPage />} />
              <Route path="/channels"       element={<ChannelsPage />} />
              <Route path="/progress"       element={<ProgressPage />} />
              <Route path="/chat"           element={<ChatPage />} />
              <Route path="/upload"         element={<UploadPage />} /> */}
            </Route>

            {/* ── Admin routes — auth + admin role ──────────── */}
            <Route element={<AdminRoute />}>
              <Route path="/admin-dashboard" element={<AdminDashboard />} />
              {/* <Route path="/admin/exam-types"     element={<ExamTypesPage />} />
              <Route path="/admin/subjects"       element={<SubjectsPage />} />
              <Route path="/admin/topics"         element={<TopicsPage />} />
              <Route path="/admin/videos"         element={<VideosPage />} />
              <Route path="/admin/questions"      element={<QuestionsPage />} />
              <Route path="/admin/mock-tests"     element={<MockTestsPage />} />
              <Route path="/admin/notes"          element={<AdminNotesPage />} />
              <Route path="/admin/users"          element={<UsersPage />} /> */}
            </Route>

            {/* ── Fallback ───────────────────────────────────── */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}
