import api from "./axios";
import type {
  DashboardResponse,
  ListNotificationsResponse,
} from "../types/student.types";

export const getDashboard = async (): Promise<DashboardResponse> => {
  const { data } = await api.get<DashboardResponse>("/student/dashboard");
  return data;
};

export const getSubjects = async () => {
  const { data } = await api.get("/student/subjects");
  return data;
};

export const getTopics = async (subjectId: string) => {
  const { data } = await api.get("/student/topics", {
    params: { subjectId },
  });
  return data;
};

export const getVideosByTopic = async (topicId: string) => {
  const { data } = await api.get("/student/videos", {
    params: { topicId },
  });
  return data;
};

export const getNotes = async (filters?: {
  topicId?: string;
  subjectId?: string;
}) => {
  const { data } = await api.get("/student/notes", { params: filters });
  return data;
};

export const getNoteById = async (id: string) => {
  const { data } = await api.get(`/student/notes/${id}`);
  return data;
};

export const getYtChannels = async () => {
  const { data } = await api.get("/student/yt-channels");
  return data;
};

export const getProgress = async () => {
  const { data } = await api.get("/student/progress");
  return data;
};

export const getTopicProgress = async (topicId: string) => {
  const { data } = await api.get(`/student/progress/${topicId}`);
  return data;
};

// ── Notifications (ticket 02) ────────────────────────────────────────────────

export const getNotifications = async (
  limit?: number,
): Promise<ListNotificationsResponse> => {
  const { data } = await api.get("/student/notifications", {
    params: limit != null ? { limit } : undefined,
  });
  return data;
};

// ── Notifications — mark as read (ticket 11) ────────────────────────────────
//
// Batch endpoint. Server is idempotent (createMany + skipDuplicates), so a
// re-open of the bell or the inbox page is safe to call again. The empty
// response body is fine; the caller invalidates the React Query cache to
// pull the freshly-read `isRead` flags back from the server.

export const markNotificationsReadApi = async (ids: string[]): Promise<void> => {
  await api.post("/student/notifications/read", { ids });
};

// ── Profile (ticket 03) ──────────────────────────────────────────────────────
//
// `changeExamType` returns the updated user. The full `User` shape is the same
// one stored in `auth.store` — the caller is responsible for refreshing the
// store with the new `examTypeId` so dependent guards pick it up.

import type { User } from "../types/auth.types";

export const changeExamType = async (examTypeId: string): Promise<User> => {
  const { data } = await api.post("/student/me/exam-type", { examTypeId });
  return data;
};

// ── Video watched (ticket 06) ────────────────────────────────────────────────

export const toggleVideoWatched = async (
  videoId: string,
): Promise<{ watched: boolean }> => {
  const { data } = await api.post(`/student/videos/${videoId}/watched`);
  return data;
};