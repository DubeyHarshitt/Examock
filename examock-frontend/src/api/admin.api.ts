// admin.api.ts
import api from "./axios";
import type { CreateSubjectDto, UpdateSubjectDto } from "../store/admin/types/admin.types";

// ── Exam Types ───────────────────────────────────────────────

export const getExamTypesApi = async () => {
  const { data } = await api.get("/api/admin/exam-types");
  return data;
};

export const createExamTypeApi = async (body: {
  name: string;
  slug: string;
  description?: string;
}) => {
  const { data } = await api.post("/api/admin/exam-types", body);
  return data;
};

export const updateExamTypeApi = async (id: string, body: object) => {
  const { data } = await api.patch(`/api/admin/exam-types/${id}`, body);
  return data;
};

export const deleteExamTypeApi = async (id: string) => {
  const { data } = await api.delete(`/api/admin/exam-types/${id}`);
  return data;
};

// ── Subjects ─────────────────────────────────────────────────

export const getSubjectsApi = async (examTypeId?: string) => {
  const { data } = await api.get("/api/admin/subjects", {
    params: { examTypeId },
  });
  return data;
};

export const createSubjectApi = async (body: CreateSubjectDto) => {
  const { data } = await api.post("/api/admin/subjects", body);
  return data;
};

export const updateSubjectApi = async (id: string, body: UpdateSubjectDto) => {
  const { data } = await api.patch(`/api/admin/subjects/${id}`, body);
  return data;
};

export const deleteSubjectApi = async (id: string) => {
  const { data } = await api.delete(`/api/admin/subjects/${id}`);
  return data;
};

// ── Topics ───────────────────────────────────────────────────

export const getTopicsApi = async (subjectId?: string) => {
  const { data } = await api.get("/api/admin/topics", {
    params: { subjectId },
  });
  return data;
};

export const createTopicApi = async (body: {
  subjectId: string;
  name: string;
  orderIndex?: number;
}) => {
  const { data } = await api.post("/api/admin/topics", body);
  return data;
};

export const updateTopicApi = async (id: string, body: object) => {
  const { data } = await api.patch(`/api/admin/topics/${id}`, body);
  return data;
};

export const deleteTopicApi = async (id: string) => {
  const { data } = await api.delete(`/api/admin/topics/${id}`);
  return data;
};

// ── Videos ───────────────────────────────────────────────────

export const getVideosApi = async (topicId?: string) => {
  const { data } = await api.get("/api/admin/videos", {
    params: { topicId },
  });
  return data;
};

export const createVideoApi = async (body: {
  topicId: string;
  youtubeId: string;
  title: string;
  durationSec?: number;
  orderIndex?: number;
}) => {
  const { data } = await api.post("/api/admin/videos", body);
  return data;
};

export const updateVideoApi = async (id: string, body: object) => {
  const { data } = await api.patch(`/api/admin/videos/${id}`, body);
  return data;
};

export const deleteVideoApi = async (id: string) => {
  const { data } = await api.delete(`/api/admin/videos/${id}`);
  return data;
};

// ── YouTube Channels ─────────────────────────────────────────

export const getYtChannelsApi = async (examTypeId?: string) => {
  const { data } = await api.get("/api/admin/yt-channels", {
    params: { examTypeId },
  });
  return data;
};

export const createYtChannelApi = async (body: {
  examTypeId: string;
  channelId: string;
  channelName: string;
  logoUrl?: string;
}) => {
  const { data } = await api.post("/api/admin/yt-channels", body);
  return data;
};

export const updateYtChannelApi = async (id: string, body: object) => {
  const { data } = await api.patch(`/api/admin/yt-channels/${id}`, body);
  return data;
};

export const deleteYtChannelApi = async (id: string) => {
  const { data } = await api.delete(`/api/admin/yt-channels/${id}`);
  return data;
};

// ── Questions ────────────────────────────────────────────────

export const getQuestionsApi = async (topicId?: string, page = 1) => {
  const { data } = await api.get("/api/admin/questions", {
    params: { topicId, page },
  });
  return data;
};

export const createQuestionApi = async (body: {
  topicId: string;
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: "A" | "B" | "C" | "D";
  explanation?: string;
  marks?: number;
  negMarks?: number;
  difficulty?: "EASY" | "MEDIUM" | "HARD";
}) => {
  const { data } = await api.post("/api/admin/questions", body);
  return data;
};

export const bulkCreateQuestionsApi = async (questions: object[]) => {
  const { data } = await api.post("/api/admin/questions/bulk", { questions });
  return data;
};

export const updateQuestionApi = async (id: string, body: object) => {
  const { data } = await api.patch(`/api/admin/questions/${id}`, body);
  return data;
};

export const deleteQuestionApi = async (id: string) => {
  const { data } = await api.delete(`/api/admin/questions/${id}`);
  return data;
};

// ── Mock Tests ───────────────────────────────────────────────

export const getMockTestsApi = async (examTypeId?: string, page = 1) => {
  const { data } = await api.get("/api/admin/mock-tests", {
    params: { examTypeId, page },
  });
  return data;
};

export const createMockTestApi = async (body: {
  examTypeId: string;
  title: string;
  type: "CHAPTER" | "MODULE" | "FULL";
  isFree?: boolean;
  durationMins: number;
  totalMarks: number;
  topicId?: string;
  subjectId?: string;
  instructions?: string;
}) => {
  const { data } = await api.post("/api/admin/mock-tests", body);
  return data;
};

export const updateMockTestApi = async (id: string, body: object) => {
  const { data } = await api.patch(`/api/admin/mock-tests/${id}`, body);
  return data;
};

export const deleteMockTestApi = async (id: string) => {
  const { data } = await api.delete(`/api/admin/mock-tests/${id}`);
  return data;
};

export const addQuestionToTestApi = async (
  testId: string,
  questionId: string,
  orderIndex?: number
) => {
  const { data } = await api.post(`/api/admin/mock-tests/${testId}/questions`, {
    questionId,
    orderIndex,
  });
  return data;
};

export const removeQuestionFromTestApi = async (
  testId: string,
  questionId: string
) => {
  const { data } = await api.delete(
    `/api/admin/mock-tests/${testId}/questions/${questionId}`
  );
  return data;
};

export const reorderTestQuestionsApi = async (
  testId: string,
  questions: { questionId: string; orderIndex: number }[]
) => {
  const { data } = await api.patch(
    `/api/admin/mock-tests/${testId}/questions/reorder`,
    { questions }
  );
  return data;
};

// ── Notes ────────────────────────────────────────────────────

export const getNotesApi = async (filters?: {
  examTypeId?: string;
  topicId?: string;
  subjectId?: string;
  page?: number;
}) => {
  const { data } = await api.get("/api/admin/notes", { params: filters });
  return data;
};

export const createNoteApi = async (formData: FormData) => {
  const { data } = await api.post("/api/admin/notes", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

export const updateNoteApi = async (id: string, body: object) => {
  const { data } = await api.patch(`/api/admin/notes/${id}`, body);
  return data;
};

export const deleteNoteApi = async (id: string) => {
  const { data } = await api.delete(`/api/admin/notes/${id}`);
  return data;
};

// ── Users ────────────────────────────────────────────────────

export const getUsersApi = async (filters?: {
  examTypeId?: string;
  page?: number;
  search?: string;
}) => {
  const { data } = await api.get("/api/admin/users", { params: filters });
  return data;
};

export const getUserDetailApi = async (id: string) => {
  const { data } = await api.get(`/api/admin/users/${id}`);
  return data;
};

export const resetUserExamTypeApi = async (id: string) => {
  const { data } = await api.patch(`/api/admin/users/${id}/reset-exam`);
  return data;
};

// ── Analytics ────────────────────────────────────────────────

export const getOverviewApi= async () => {
  const { data } = await api.get("/api/admin/analytics/overview");
  return data;
};

export const getTestAnalyticsApi = async () => {
  const { data } = await api.get("/api/admin/analytics/tests");
  return data;
};

export const getPaymentRecordsApi = async (page = 1, status?: string) => {
  const { data } = await api.get("/api/admin/analytics/payments", {
    params: { page, status },
  });
  return data;
};

// ── Notifications ────────────────────────────────────────────

export const getNotificationsApi = async () => {
  const { data } = await api.get("/api/admin/notifications");
  return data;
};

export const broadcastNotificationApi = async (body: {
  examTypeId?: string;
  title: string;
  body: string;
}) => {
  const { data } = await api.post("/api/admin/notifications", body);
  return data;
};