// src/types/admin.types.ts
// DTOs/responses for the admin-facing analytics & user-management API
// (`/api/admin/analytics/*` and `/api/admin/users/*`).
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

export type TestType = "CHAPTER" | "MODULE" | "FULL";

export interface TestAnalyticsRow {
  id: string;
  title: string;
  type: TestType;
  isFree: boolean;
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

export interface UserTestAttempt {
  id: string;
  mockTestId: string;
  score: number | null;
  percentile: number | null;
  status: string;
  startedAt: string;
  completedAt: string | null;
  mockTest: { title: string; type: TestType };
}

export interface AdminUserDetail {
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
  topicProgress: UserTopicProgress[];
  testAttempts: UserTestAttempt[];
  payments: PaymentRecord[];
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
