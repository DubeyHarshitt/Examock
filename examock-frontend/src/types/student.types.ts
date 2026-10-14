// src/types/student.types.ts
// Shared DTOs/responses for the student-facing API (`/student/*`).
// Mirrors the payloads returned by examock-backend/src/modules/student.

import type { ExamType } from "./exam.types";

// ── Dashboard ─────────────────────────────────────────────────────────────────

export interface DashboardSubject {
  id: string;
  name: string;
  orderIndex: number;
  topicCount: number;
}

export interface DashboardRecentAttempt {
  id: string;
  /** Mock the attempt belongs to — used to link into `/tests/:mockTestId/result`. */
  mockTestId: string;
  /** Backend selects these via `mockTest: { select: { title, totalMarks } }` */
  mockTest?: { title?: string; totalMarks?: number };
  score: number;
  percentile: number;
  timeTakenSec: number;
  completedAt: string;
}

export interface DashboardSuggestedTopic {
  topicId: string;
  topicName: string;
  subjectName: string;
  bestScore: number | null;
  attemptCount: number;
}

export interface DashboardResponse {
  examType: ExamType;
  subjects: DashboardSubject[];
  recentAttempts: DashboardRecentAttempt[];
  suggestedTopics: DashboardSuggestedTopic[];
  /** Real count of completed attempts (recentAttempts is capped at 3). */
  totalAttempts: number;
  totalTopicsAttempted: number;
}

// ── Attempt history ───────────────────────────────────────────────────────────
// One row of GET /student/attempts — a completed attempt, flattened for the
// history list. `mockTestId` + `id` build the link to the detailed result page.

export interface AttemptSummary {
  id: string;
  mockTestId: string;
  title: string;
  subjectId: string | null;
  subjectName: string | null;
  examTypeName: string | null;
  score: number;
  totalMarks: number;
  percentile: number;
  timeTakenSec: number;
  completedAt: string;
}

export interface AttemptsResponse {
  attempts: AttemptSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ── Subjects ──────────────────────────────────────────────────────────────────

export interface SubjectWithCounts {
  id: string;
  name: string;
  examTypeId: string;
  orderIndex: number;
  topicCount: number;
  noteCount: number;
}

// ── Topics ────────────────────────────────────────────────────────────────────

export interface TopicProgress {
  bestScore: number | null;
  attemptCount: number;
  videosWatched: number;
  lastActivity: string | null;
}

// A topic row inside a progress group (matches GET /student/progress payload)
export interface TopicProgressRow {
  topicId: string;
  topicName: string;
  bestScore: number | null;
  attemptCount: number;
  videosWatched: number;
  lastActivity: string | null;
}

export interface TopicWithProgress {
  id: string;
  name: string;
  orderIndex: number;
  videoCount: number;
  questionCount: number;
  progress: TopicProgress | null;
}

// ── Videos ────────────────────────────────────────────────────────────────────

export interface Video {
  id: string;
  youtubeId: string;
  title: string;
  durationSec: number | null;
  orderIndex: number;
}

export interface TopicVideoGroup {
  topicId: string;
  topicName: string;
  videos: Video[];
}

// ── Notes (student view) ──────────────────────────────────────────────────────

export interface StudentNote {
  id: string;
  topicId: string | null;
  subjectId: string | null;
  title: string;
  filePath: string;
  fileName: string;
  fileType: string;
  fileSizeMb: number | null;
  isFree: boolean;
  createdAt: string;
  topic?: { name: string } | null;
  subject?: { name: string } | null;
}

export interface GetStudentNotesResponse {
  notes: StudentNote[];
  total: number;
  page: number;
  limit: number;
}

// ── YouTube channels ──────────────────────────────────────────────────────────

export interface YtChannel {
  id: string;
  channelId: string;
  channelName: string;
  logoUrl: string | null;
}

// ── Progress ──────────────────────────────────────────────────────────────────

export interface SubjectProgressGroup {
  subjectId: string;
  subjectName: string;
  topics: TopicProgressRow[];
}

export interface TopicAttemptSummary {
  id: string;
  mockTestId: string;
  mockTestTitle: string;
  score: number;
  totalMarks: number;
  percentile: number;
  timeTakenSec: number;
  completedAt: string;
}

export interface TopicProgressDetail {
  topicId: string;
  started: boolean;
  topicName?: string;
  subjectName?: string;
  bestScore: number | null;
  attemptCount: number;
  videosWatched: number;
  lastActivity: string | null;
  totalVideos: number;
  totalQuestions: number;
  recentAttempts: TopicAttemptSummary[];
}

// ── Notifications (ticket 02) ────────────────────────────────────────────────

/**
 * One row in the user's inbox. `sentAt` is when the admin scheduled /
 * pushed it; `createdAt` is the row write time. `examTypeId` is null for
 * global broadcasts.
 *
 * `read` and `readAt` reflect *this user's* read state (the server scopes
 * the `notification_reads` join to the current user). Items where
 * `read === true` stay in the list for 24h after `readAt` so the user can
 * re-open something they just dismissed; the bell badge counts only the
 * unread ones (see `ListNotificationsResponse.unreadCount`).
 *
 * When `read === false`, `readAt` is always null. When `read === true`,
 * `readAt` is the server-stamped first-view timestamp; re-opening the
 * same notification does NOT reset it.
 */
export interface StudentNotification {
  id: string;
  title: string;
  body: string;
  sentAt: string | null;
  createdAt: string;
  examTypeId: string | null;
  /** True once this user has marked the notification as read. */
  read: boolean;
  /** First-view timestamp (server-stamped). Null while unread. */
  readAt: string | null;
}

export interface ListNotificationsResponse {
  /** The user's inbox: unread + items read within the 24h window. */
  items: StudentNotification[];
  /** Bell badge value: items where `read === false`. */
  unreadCount: number;
  /** Total inbox size (`items.length`). Exposed for clarity in clients
   * that want to render the total alongside the unread count. */
  inboxCount: number;
}
