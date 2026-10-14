// src/types/admin.types.ts
// DTOs/responses for the admin-facing analytics & user-management API
// (`/admin/analytics/*` and `/admin/users/*`).
// Shapes verified against examock-backend/src/modules/admin/admin.service.js.

// ── Analytics ─────────────────────────────────────────────────────────────────

export interface AnalyticsOverview {
  totalUsers: number;
  totalAttempts: number;
  completedAttempts: number;
  totalRevenueRupees: number;
  totalTests: number;
  totalQuestions: number;
}

export interface TestAnalyticsRow {
  id: string;
  title: string;
  /** scope is derived from this (ticket 10) — null ⇒ whole exam */
  subjectId: string | null;
  subjectName: string | null;
  examName: string | null;
  isFree: boolean;
  isActive: boolean;
  totalAttempts: number;
  completedAttempts: number;
  averageScore: number;
}

export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";

export interface PaymentRecord {
  id: string;
  amountPaise: number;
  status: PaymentStatus;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  razorpaySignature: string | null;
  createdAt: string;
  user?: { name: string | null; email: string };
  mockTest?: { title: string } | null;
}

export interface PaymentsResponse {
  payments: PaymentRecord[];
  total: number;
  page: number;
  limit: number;
}

// ── Users ─────────────────────────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  mobile: string | null;
  mobileVerified: boolean;
  role: "STUDENT" | "ADMIN";
  examTypeId: string | null;
  examDate: string | null;
  createdAt: string;
  examType: { name: string } | null;
  _count: { testAttempts: number; payments: number };
}

export interface UserTopicProgress {
  id: string;
  topicId: string;
  bestScore: number | null;
  attemptCount: number;
  videosWatched: number;
  lastActivity: string | null;
  topic: { name: string };
}

/** Roll-up stats shown in the admin user-detail summary panel. */
export interface AdminUserSummary {
  totalAttempts: number;
  completedAttempts: number;
  inProgressAttempts: number;
  averageScore: number | null;
  bestScore: number | null;
  chaptersStarted: number;
  videosWatched: number;
  paymentsCount: number;
  totalPaidPaise: number;
  lastActive: string | null;
}

export interface AdminUserDetail {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  mobile: string | null;
  mobileVerified: boolean;
  role: "STUDENT" | "ADMIN";
  examTypeId: string | null;
  examDate: string | null;
  createdAt: string;
  examType: { name: string } | null;
  topicProgress: UserTopicProgress[];
  payments: PaymentRecord[];
  summary: AdminUserSummary;
}

// ── User attempts (admin user-detail screen) ──────────────────────────────────

export interface AdminUserAttempt {
  id: string;
  mockTestId: string;
  mockTestTitle: string;
  subjectName: string | null;
  status: string;
  score: number | null;
  totalMarks: number;
  percentile: number | null;
  timeTakenSec: number | null;
  startedAt: string;
  completedAt: string | null;
}

export interface AdminUserAttemptsResponse {
  attempts: AdminUserAttempt[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminAttemptQuestion {
  questionId: string;
  topicId: string;
  text: string;
  imageUrl: string | null;
  explanation: string | null;
  options: { A: string; B: string; C: string; D: string };
  correctOption: string | null;
  marks: number;
  negMarks: number;
  selected: string | null;
  isCorrect: boolean;
  marksAwarded: number;
}

export interface AdminAttemptDetail {
  attemptId: string;
  mockTestId: string;
  mockTestTitle: string;
  subjectName: string | null;
  status: string;
  score: number | null;
  totalMarks: number;
  percentile: number | null;
  timeTakenSec: number | null;
  startedAt: string;
  completedAt: string | null;
  correct: number;
  incorrect: number;
  unattempted: number;
  questionResults: AdminAttemptQuestion[];
}

export interface GetUsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
}

// ── Notifications ─────────────────────────────────────────────────────────────

export interface AdminNotification {
  id: string;
  examTypeId: string | null;
  title: string;
  body: string;
  sentAt: string;
  createdAt: string;
}

export interface CreateNotificationDto {
  examTypeId?: string;
  title: string;
  body: string;
}
