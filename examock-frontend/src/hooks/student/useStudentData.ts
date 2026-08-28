// src/hooks/student/useStudentData.ts
// React Query hooks for the student-facing API.
// These power Phase 1+ pages (dashboard, subjects, topics, videos, notes, etc.).

import { useQuery } from "@tanstack/react-query";
import * as studentApi from "../../api/student.api";

export const studentKeys = {
  all: ["student"] as const,
  dashboard: () => [...studentKeys.all, "dashboard"] as const,
  subjects: () => [...studentKeys.all, "subjects"] as const,
  topics: (subjectId: string) =>
    [...studentKeys.all, "topics", subjectId] as const,
  videosByTopic: (topicId: string) =>
    [...studentKeys.all, "videos", "topic", topicId] as const,
  videosBySubject: (subjectId: string) =>
    [...studentKeys.all, "videos", "subject", subjectId] as const,
  notes: (filters?: object) => [...studentKeys.all, "notes", filters] as const,
  note: (id: string) => [...studentKeys.all, "note", id] as const,
  channels: () => [...studentKeys.all, "channels"] as const,
  progress: () => [...studentKeys.all, "progress"] as const,
  topicProgress: (topicId: string) =>
    [...studentKeys.all, "progress", topicId] as const,
};

export function useDashboard() {
  return useQuery({
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

export function useVideosBySubject(subjectId: string) {
  return useQuery({
    queryKey: studentKeys.videosBySubject(subjectId),
    queryFn: () => studentApi.getVideosBySubject(subjectId),
    enabled: !!subjectId,
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
