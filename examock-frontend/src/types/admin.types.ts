// src/types/admin.types.ts
// DTOs/responses for the admin-facing analytics & user-management API
// (`/api/admin/analytics/*` and `/api/admin/users/*`).

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
  type: "CHAPTER" | "MODULE" | "FULL";
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
  role: "STUDENT" | "ADMIN";
  examTypeId: string | null;
  createdAt: string;
  examType?: { name: string } | null;
  _count?: { attempts: number; payments: number };
}

export interface AdminUserDetail extends AdminUser {
  examType: { name: string } | null;
  topicProgress: {
    id: string;
    topic: { name: string; subject: { name: string } };
    bestScore: number | null;
    attemptCount: number;
    videosWatched: number;
    lastActivity: string | null;
  }[];
  testAttempts: {
    id: string;
    mockTest: { title: string };
    score: number;
    percentile: number;
    status: string;
    completedAt: string | null;
  }[];
  payments: PaymentRecord[];
}

export interface GetUsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
}
