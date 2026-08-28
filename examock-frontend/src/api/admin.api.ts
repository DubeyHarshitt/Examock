// admin.api.ts
import api from "./axios";
import type { CreateExamTypeDto, CreateMockTestDto, createQuestionsDto, CreateSubjectDto, CreateTopicDto, GetQuestionsResponse, UpdateMockTestDto, updateQuestionDto, UpdateSubjectDto, UpdateTopicDto } from "../store/admin/types/admin.types";

// ── Exam Types ───────────────────────────────────────────────

export const getExamTypesApi = async () => {
  const { data } = await api.get("/admin/exam-types");
  return data;
};

export const createExamTypeApi = async (body: CreateExamTypeDto) => {
  const { data } = await api.post("/admin/exam-types", body);
  return data;
};

export const updateExamTypeApi = async (id: string, body: object) => {
  const { data } = await api.patch(`/admin/exam-types/${id}`, body);
  return data;
};

export const deleteExamTypeApi = async (id: string) => {
  const { data } = await api.delete(`/admin/exam-types/${id}`);
  return data;
};

// ── Subjects ─────────────────────────────────────────────────

export const getSubjectsApi = async (examTypeId?: string) => {
  const { data } = await api.get("/admin/subjects", {
    params: { examTypeId },
  });
  return data;
};

export const createSubjectApi = async (body: CreateSubjectDto) => {
  const { data } = await api.post("/admin/subjects", body);
  return data;
};

export const updateSubjectApi = async (id: string, body: UpdateSubjectDto) => {
  const { data } = await api.patch(`/admin/subjects/${id}`, body);
  return data;
};

export const deleteSubjectApi = async (id: string) => {
  const { data } = await api.delete(`/admin/subjects/${id}`);
  return data;
};

// ── Topics ───────────────────────────────────────────────────

export const getTopicsApi = async (subjectId?: string) => {
  const { data } = await api.get("/admin/topics", {
    params: { subjectId },
  });
  return data;
};

export const createTopicApi = async (body: CreateTopicDto) => {
  const { data } = await api.post("/admin/topics", body);
  return data;
};

export const updateTopicApi = async (id: string, body: UpdateTopicDto) => {
  const { data } = await api.patch(`/admin/topics/${id}`, body);
  return data;
};

export const deleteTopicApi = async (id: string) => {
  const { data } = await api.delete(`/admin/topics/${id}`);
  return data;
};

// ── Videos ───────────────────────────────────────────────────

export const getVideosApi = async (topicId?: string) => {
  const { data } = await api.get("/admin/videos", {
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
  const { data } = await api.post("/admin/videos", body);
  return data;
};

export const updateVideoApi = async (id: string, body: object) => {
  const { data } = await api.patch(`/admin/videos/${id}`, body);
  return data;
};

export const deleteVideoApi = async (id: string) => {
  const { data } = await api.delete(`/admin/videos/${id}`);
  return data;
};

// ── YouTube Channels ─────────────────────────────────────────

export const getYtChannelsApi = async (examTypeId?: string) => {
  const { data } = await api.get("/admin/yt-channels", {
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
  const { data } = await api.post("/admin/yt-channels", body);
  return data;
};

export const updateYtChannelApi = async (id: string, body: object) => {
  const { data } = await api.patch(`/admin/yt-channels/${id}`, body);
  return data;
};

export const deleteYtChannelApi = async (id: string) => {
  const { data } = await api.delete(`/admin/yt-channels/${id}`);
  return data;
};

// ── Questions ────────────────────────────────────────────────

export const getQuestionsApi = async (
  topicId?: string,
  page = 1
): Promise<GetQuestionsResponse> => {
  const { data } = await api.get("/admin/questions", {
    params: { topicId, page },
  });
  return data;
};

export const createQuestionApi = async (body: createQuestionsDto) => {
  const { data } = await api.post("/admin/questions", body);
  return data;
};

export const bulkCreateQuestionsApi = async (questions: object[]) => {
  const { data } = await api.post("/admin/questions/bulk", { questions });
  return data;
};

export const updateQuestionApi = async (id: string, body: updateQuestionDto) => {
  const { data } = await api.patch(`/admin/questions/${id}`, body);
  return data;
};

export const deleteQuestionApi = async (id: string) => {
  const { data } = await api.delete(`/admin/questions/${id}`);
  return data;
};

// ── Mock Tests ───────────────────────────────────────────────

export const getMockTestsApi = async (examTypeId?: string, page = 1) => {
  const { data } = await api.get("/admin/mock-tests", {
    params: { examTypeId, page },
  });
  return data;
};

export const getMockTestDetailApi = async (id: string) => {
  const { data } = await api.get(`/admin/mock-tests/${id}`);
  return data;
};

export const createMockTestApi = async (body: CreateMockTestDto) => {
  const { data } = await api.post("/admin/mock-tests", body);
  return data;
};

export const updateMockTestApi = async (id: string, body: UpdateMockTestDto) => {
  const { data } = await api.patch(`/admin/mock-tests/${id}`, body);
  return data;
};

export const deleteMockTestApi = async (id: string) => {
  const { data } = await api.delete(`/admin/mock-tests/${id}`);
  return data;
};

export const addQuestionToTestApi = async (
  testId: string,
  questionId: string,
  orderIndex?: number
) => {
  const { data } = await api.post(`/admin/mock-tests/${testId}/questions`, {
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
    `/admin/mock-tests/${testId}/questions/${questionId}`
  );
  return data;
};

export const reorderTestQuestionsApi = async (
  testId: string,
  questions: { questionId: string; orderIndex: number }[]
) => {
  const { data } = await api.patch(
    `/admin/mock-tests/${testId}/questions/reorder`,
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
  const { data } = await api.get("/admin/notes", { params: filters });
  return data;
};

export const createNoteApi = async (formData: FormData) => {
  const { data } = await api.post("/admin/notes", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

export const updateNoteApi = async (id: string, body: object) => {
  const { data } = await api.patch(`/admin/notes/${id}`, body);
  return data;
};

export const deleteNoteApi = async (id: string) => {
  const { data } = await api.delete(`/admin/notes/${id}`);
  return data;
};

export const getNoteDownloadUrlApi = async (id: string) => {
  const { data } = await api.get(`/admin/notes/${id}/download`);
  return data.url as string;
};

// ── Users ────────────────────────────────────────────────────

export const getUsersApi = async (filters?: {
  examTypeId?: string;
  page?: number;
  search?: string;
}) => {
  const { data } = await api.get("/admin/users", { params: filters });
  return data;
};

export const getUserDetailApi = async (id: string) => {
  const { data } = await api.get(`/admin/users/${id}`);
  return data;
};

export const resetUserExamTypeApi = async (id: string) => {
  const { data } = await api.patch(`/admin/users/${id}/reset-exam`);
  return data;
};

// ── Analytics ────────────────────────────────────────────────

export const getOverviewApi= async () => {
  const { data } = await api.get("/admin/analytics/overview");
  return data;
};

export const getTestAnalyticsApi = async () => {
  const { data } = await api.get("/admin/analytics/tests");
  return data;
};

export const getPaymentRecordsApi = async (page = 1, status?: string) => {
  const { data } = await api.get("/admin/analytics/payments", {
    params: { page, status },
  });
  return data;
};

// ── Notifications ────────────────────────────────────────────

export const getNotificationsApi = async () => {
  const { data } = await api.get("/admin/notifications");
  return data;
};

export const broadcastNotificationApi = async (body: {
  examTypeId?: string;
  title: string;
  body: string;
}) => {
  const { data } = await api.post("/admin/notifications", body);
  return data;
};