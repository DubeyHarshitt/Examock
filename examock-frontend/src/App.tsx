import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useInitAuth } from "./hooks/authHook/useInitAuth";
import { useAuthStore } from "./store/auth.store";

import { ToastProvider } from "./components/ui/toast/ToastProvider";

// Auth
import LoginPage from "./pages/auth/LoginPage";
import OnboardingPage from "./pages/auth/OnboardingPage";

// Student — happy path stays eager: these are the first screens a student
// reaches, so lazy-loading them would only add a round-trip.
import DashboardPage from "./pages/dashboard/dashboardPage";
import SubjectListPage from "./pages/subjects/SubjectListPage";
import StudentSubjectDetailPage from "./pages/subjects/SubjectDetailPage";
import SubjectTopicsRedirect from "./pages/subjects/SubjectTopicsRedirect";
import VideoPage from "./pages/videos/VideoPage";
import TestListPage from "./pages/tests/TestListPage";
import TestDetailPage from "./pages/tests/TestDetailPage";
import TestResultPage from "./pages/tests/TestResultPage";
import AttemptsPage from "./pages/tests/AttemptsPage";
import ChannelsPage from "./pages/channels/ChannelsPage";
import ProgressPage from "./pages/progress/ProgressPage";
import TopicProgressPage from "./pages/progress/TopicProgressPage";
import NotificationsPage from "./pages/notifications/NotificationsPage";
import ProfilePage from "./pages/profile/ProfilePage";

// Student — lazily loaded (F15): the exam console, and the RAG pages that drag
// in react-markdown/remark-gfm. Most sessions never open these.
const TestEnginePage = lazy(() => import("./pages/tests/TestEnginePage"));
const ChatPage = lazy(() => import("./pages/rag/ChatPage"));
const UploadPage = lazy(() => import("./pages/rag/UploadPage"));

// Marketing (ticket 04) — only logged-out visitors reach this, so it stays out
// of the student bundle until needed.
const LandingPage = lazy(() => import("./pages/marketing/LandingPage"));

// Admin — lazily loaded (F15): a student must never download the admin panel.
const AdminDashboard = lazy(() => import("./pages/admin/adminDashboard"));
const UsersPanel = lazy(() => import("./pages/admin/users/UsersPanel"));
const UserDetailPage = lazy(() => import("./pages/admin/users/UserDetailPage"));
const AnalyticsPanel = lazy(() => import("./pages/admin/analytics/AnalyticsPanel"));
const NotificationsPanel = lazy(() => import("./pages/admin/notifications/NotificationsPanel"));
// Content tree (ticket 05)
const ExamsPage = lazy(() => import("./pages/admin/content/ExamsPage"));
const ExamDetailPage = lazy(() => import("./pages/admin/content/ExamDetailPage"));
const SubjectDetailPage = lazy(() => import("./pages/admin/content/SubjectDetailPage"));
const TestsPage = lazy(() => import("./pages/admin/content/TestsPage"));
const TestCreatePage = lazy(() => import("./pages/admin/content/TestCreatePage"));
const PaperGrid = lazy(() => import("./pages/admin/tests/PaperGrid"));
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
import ErrorBoundary from "./components/shared/ErrorBoundary";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1, // only retry once on failure
      staleTime: 1000 * 60 * 5, // cache data for 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

// Fallback shown while a lazily-loaded route chunk is fetched (F15).
function RouteFallback() {
  return (
    <div className="flex h-screen items-center justify-center">
      <Spinner />
    </div>
  );
}

// Auth-aware root (ticket 04): a logged-out visitor to `/` gets the marketing
// page instead of a redirect to /login; an onboarded user still gets the
// student dashboard unchanged.
function HomeRoute() {
  const { isAuthenticated, isFullyOnboarded } = useAuthStore();
  if (!isAuthenticated()) return <LandingPage />;
  if (!isFullyOnboarded()) return <Navigate to="/onboarding" replace />;
  return <DashboardPage />;
}

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
          <ErrorBoundary>
          <Suspense fallback={<RouteFallback />}>
          <Routes>
            {/* ── Public routes ─────────────────────────────── */}
            <Route path="/" element={<HomeRoute />} />
            <Route path="/login" element={<LoginPage />} />

            {/* ── Onboarding — auth required, not yet fully onboarded ── */}
            <Route element={<OnboardingRoute />}>
              <Route path="/onboarding" element={<OnboardingPage />} />
            </Route>

            {/* ── Student routes — auth + fully onboarded ───── */}
            <Route element={<ProtectedRoute />}>
              <Route path="/subjects" element={<SubjectListPage />} />
              <Route path="/subjects/:subjectId" element={<StudentSubjectDetailPage />} />
              <Route
                path="/subjects/:subjectId/topics"
                element={<SubjectTopicsRedirect />}
              />
              <Route path="/topics/:topicId/videos" element={<VideoPage />} />
              <Route path="/tests" element={<TestListPage />} />
              <Route path="/tests/:id" element={<TestDetailPage />} />
              <Route path="/tests/:id/take" element={<TestEnginePage />} />
              <Route path="/tests/:id/result" element={<TestResultPage />} />
              <Route path="/attempts" element={<AttemptsPage />} />
              <Route path="/notes" element={<Navigate to="/subjects" replace />} />
              <Route path="/channels" element={<ChannelsPage />} />
              <Route path="/progress" element={<ProgressPage />} />
              <Route path="/progress/:topicId" element={<TopicProgressPage />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/upload" element={<UploadPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>

            {/* ── Admin routes — auth + admin role ──────────── */}
            <Route element={<AdminRoute />}>
              <Route path="/admin-dashboard" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<UsersPanel />} />
              <Route path="/admin/users/:id" element={<UserDetailPage />} />
              <Route path="/admin/analytics" element={<AnalyticsPanel />} />
              <Route path="/admin/notifications" element={<NotificationsPanel />} />
              {/* Content tree (ticket 05) */}
              <Route path="/admin/content/exams" element={<ExamsPage />} />
              <Route path="/admin/content/exams/:examId" element={<ExamDetailPage />} />
              <Route
                path="/admin/content/exams/:examId/subjects/:subjectId"
                element={<SubjectDetailPage />}
              />
              <Route path="/admin/content/tests" element={<TestsPage />} />
              <Route path="/admin/content/tests/new" element={<TestCreatePage />} />
              <Route path="/admin/content/tests/:testId" element={<PaperGrid />} />
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
          </Suspense>
          </ErrorBoundary>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}
