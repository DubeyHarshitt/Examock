// src/types/student.types.ts
// Shared DTOs/responses for the student-facing API (`/api/student/*`).
// Mirrors the payloads returned by examock-backend/src/modules/student.

import type { ExamType } from "../store/admin/types/admin.types";

// ── Dashboard ─────────────────────────────────────────────────────────────────

export interface DashboardSubject {
  id: string;
  name: string;
  orderIndex: number;
  topicCount: number;
}

export interface DashboardRecentAttempt {
  id: string;
  mockTestId: string;
  mockTestTitle?: string;
  score: number;
  totalMarks: number;
  percentile: number;
  timeTakenSec: number;
  completedAt: string;
}

export interface DashboardSuggestedTopic {
  id: string;
  name: string;
  bestScore: number | null;
  attemptCount: number;
  subject?: { name: string }; // subject this topic belongs to
}

export interface DashboardResponse {
  examType: ExamType;
  subjects: DashboardSubject[];
  recentAttempts: DashboardRecentAttempt[];
  suggestedTopics: DashboardSuggestedTopic[];
  totalTopicsAttempted: number;
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
  topics: TopicProgress[];
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
