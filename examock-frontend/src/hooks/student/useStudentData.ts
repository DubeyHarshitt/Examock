// src/hooks/student/useStudentData.ts
// React Query hooks for the student-facing API.
// These power Phase 1+ pages (dashboard, subjects, topics, videos, notes, etc.).

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as studentApi from "../../api/student.api";
import type { DashboardResponse } from "../../types/student.types";

export const studentKeys = {
  all: ["student"] as const,
  dashboard: () => [...studentKeys.all, "dashboard"] as const,
  subjects: () => [...studentKeys.all, "subjects"] as const,
  topics: (subjectId: string) =>
    [...studentKeys.all, "topics", subjectId] as const,
  videosByTopic: (topicId: string) =>
    [...studentKeys.all, "videos", "topic", topicId] as const,
  notes: (filters?: object) => [...studentKeys.all, "notes", filters] as const,
  note: (id: string) => [...studentKeys.all, "note", id] as const,
  channels: () => [...studentKeys.all, "channels"] as const,
  progress: () => [...studentKeys.all, "progress"] as const,
  topicProgress: (topicId: string) =>
    [...studentKeys.all, "progress", topicId] as const,
  notifications: () => [...studentKeys.all, "notifications"] as const,
};

export function useDashboard() {
  return useQuery<DashboardResponse>({
    queryKey: studentKeys.dashboard(),
    queryFn: () => studentApi.getDashboard(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useSubjects() {
  return useQuery({
    queryKey: studentKeys.subjects(),
    queryFn: () => studentApi.getSubjects(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useTopics(subjectId: string) {
  return useQuery({
    queryKey: studentKeys.topics(subjectId),
    queryFn: () => studentApi.getTopics(subjectId),
    enabled: !!subjectId,
  });
}

export function useVideosByTopic(topicId: string) {
  return useQuery({
    queryKey: studentKeys.videosByTopic(topicId),
    queryFn: () => studentApi.getVideosByTopic(topicId),
    enabled: !!topicId,
  });
}

export function useNotes(filters?: { topicId?: string; subjectId?: string }) {
  return useQuery({
    queryKey: studentKeys.notes(filters),
    queryFn: () => studentApi.getNotes(filters),
    staleTime: 1000 * 60 * 2,
  });
}

export function useNote(id: string) {
  return useQuery({
    queryKey: studentKeys.note(id),
    queryFn: () => studentApi.getNoteById(id),
    enabled: !!id,
  });
}

export function useYtChannels() {
  return useQuery({
    queryKey: studentKeys.channels(),
    queryFn: () => studentApi.getYtChannels(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useProgress() {
  return useQuery({
    queryKey: studentKeys.progress(),
    queryFn: () => studentApi.getProgress(),
    staleTime: 1000 * 60 * 2,
  });
}

export function useTopicProgress(topicId: string) {
  return useQuery({
    queryKey: studentKeys.topicProgress(topicId),
    queryFn: () => studentApi.getTopicProgress(topicId),
    enabled: !!topicId,
  });
}

// ── Notifications (ticket 02) ────────────────────────────────────────────────
//
// React Query's `refetchIntervalInBackground: false` pauses while the tab is
// hidden. No manual setInterval is needed — one source of truth.
//
// `refetchInterval: 60_000` runs every 60s while visible. `staleTime` matches
// the interval so the first paint of the bell uses cached data if present.
//
// Ticket 12 — the response only ever contains *unread* notifications. When
// the user opens the full-view modal, the page calls
// `markNotificationsReadApi([id])` directly and invalidates
// `studentKeys.notifications()` so the bell (limit 3), inbox page (limit
// 50), and dashboard banner (limit 1) all refetch at once.

export function useNotifications(limit = 50) {
  return useQuery({
    queryKey: [...studentKeys.notifications(), limit],
    queryFn: () => studentApi.getNotifications(limit),
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    staleTime: 30_000,
  });
}

// ── Profile (ticket 03) ──────────────────────────────────────────────────────
//
// `useChangeExamType` invalidates every student-scoped query after a successful
// mutation: dashboard, subjects, topics, progress — all the queries that read
// `examTypeId` directly or via the user's subjects/topics. The user record in
// the auth store is updated by the caller (Profile page) — that's outside
// React Query's scope.

export function useChangeExamType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ examTypeId }: { examTypeId: string }) =>
      studentApi.changeExamType(examTypeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studentKeys.all });
    },
  });
}

// ── Video watched (ticket 06) ────────────────────────────────────────────────

export function useToggleVideoWatched() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (videoId: string) => studentApi.toggleVideoWatched(videoId),
    onSuccess: () => {
      // Re-fetch the videos query so the watched seed re-syncs from the server.
      qc.invalidateQueries({ queryKey: [...studentKeys.all, "videos"] });
    },
  });
}
