import api from "./axios";

// ── Exam Types ───────────────────────────────────────────────

export const getExamTypes = async () => {
  const { data } = await api.get("/api/admin/exam-types");
  return data;
};

export const createExamType = async (body: {
  name: string;
  slug: string;
  description?: string;
}) => {
  const { data } = await api.post("/api/admin/exam-types", body);
  return data;
};

export const updateExamType = async (id: string, body: object) => {
  const { data } = await api.patch(`/api/admin/exam-types/${id}`, body);
  return data;
};

export const deleteExamType = async (id: string) => {
  const { data } = await api.delete(`/api/admin/exam-types/${id}`);
  return data;
};

// ── Subjects ─────────────────────────────────────────────────

export const getSubjects = async (examTypeId?: string) => {
  const { data } = await api.get("/api/admin/subjects", {
    params: { examTypeId },
  });
  return data;
};

export const createSubject = async (body: {
  examTypeId: string;
  name: string;
  orderIndex?: number;
}) => {
  const { data } = await api.post("/api/admin/subjects", body);
  return data;
};

export const updateSubject = async (id: string, body: object) => {
  const { data } = await api.patch(`/api/admin/subjects/${id}`, body);
  return data;
};

export const deleteSubject = async (id: string) => {
  const { data } = await api.delete(`/api/admin/subjects/${id}`);
  return data;
};

// ── Topics ───────────────────────────────────────────────────

export const getTopics = async (subjectId?: string) => {
  const { data } = await api.get("/api/admin/topics", {
    params: { subjectId },
  });
  return data;
};

export const createTopic = async (body: {
  subjectId: string;
  name: string;
  orderIndex?: number;
}) => {
  const { data } = await api.post("/api/admin/topics", body);
  return data;
};

export const updateTopic = async (id: string, body: object) => {
  const { data } = await api.patch(`/api/admin/topics/${id}`, body);
  return data;
};

export const deleteTopic = async (id: string) => {
  const { data } = await api.delete(`/api/admin/topics/${id}`);
  return data;
};

// ── Videos ───────────────────────────────────────────────────

export const getVideos = async (topicId?: string) => {
  const { data } = await api.get("/api/admin/videos", {
    params: { topicId },
  });
  return data;
};

export const createVideo = async (body: {
  topicId: string;
  youtubeId: string;
  title: string;
  durationSec?: number;
  orderIndex?: number;
}) => {
  const { data } = await api.post("/api/admin/videos", body);
  return data;
};

export const updateVideo = async (id: string, body: object) => {
  const { data } = await api.patch(`/api/admin/videos/${id}`, body);
  return data;
};

export const deleteVideo = async (id: string) => {
  const { data } = await api.delete(`/api/admin/videos/${id}`);
  return data;
};

// ── YouTube Channels ─────────────────────────────────────────

export const getYtChannels = async (examTypeId?: string) => {
  const { data } = await api.get("/api/admin/yt-channels", {
    params: { examTypeId },
  });
  return data;
};

export const createYtChannel = async (body: {
  examTypeId: string;
  channelId: string;
  channelName: string;
  logoUrl?: string;
}) => {
  const { data } = await api.post("/api/admin/yt-channels", body);
  return data;
};

export const updateYtChannel = async (id: string, body: object) => {
  const { data } = await api.patch(`/api/admin/yt-channels/${id}`, body);
  return data;
};

export const deleteYtChannel = async (id: string) => {
  const { data } = await api.delete(`/api/admin/yt-channels/${id}`);
  return data;
};

// ── Questions ────────────────────────────────────────────────

export const getQuestions = async (topicId?: string, page = 1) => {
  const { data } = await api.get("/api/admin/questions", {
    params: { topicId, page },
  });
  return data;
};

export const createQuestion = async (body: {
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

export const bulkCreateQuestions = async (questions: object[]) => {
  const { data } = await api.post("/api/admin/questions/bulk", { questions });
  return data;
};

export const updateQuestion = async (id: string, body: object) => {
  const { data } = await api.patch(`/api/admin/questions/${id}`, body);
  return data;
};

export const deleteQuestion = async (id: string) => {
  const { data } = await api.delete(`/api/admin/questions/${id}`);
  return data;
};

// ── Mock Tests ───────────────────────────────────────────────

export const getMockTests = async (examTypeId?: string, page = 1) => {
  const { data } = await api.get("/api/admin/mock-tests", {
    params: { examTypeId, page },
  });
  return data;
};

export const createMockTest = async (body: {
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

export const updateMockTest = async (id: string, body: object) => {
  const { data } = await api.patch(`/api/admin/mock-tests/${id}`, body);
  return data;
};

export const deleteMockTest = async (id: string) => {
  const { data } = await api.delete(`/api/admin/mock-tests/${id}`);
  return data;
};

export const addQuestionToTest = async (
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

export const removeQuestionFromTest = async (
  testId: string,
  questionId: string
) => {
  const { data } = await api.delete(
    `/api/admin/mock-tests/${testId}/questions/${questionId}`
  );
  return data;
};

export const reorderTestQuestions = async (
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

export const getNotes = async (filters?: {
  examTypeId?: string;
  topicId?: string;
  subjectId?: string;
  page?: number;
}) => {
  const { data } = await api.get("/api/admin/notes", { params: filters });
  return data;
};

export const createNote = async (formData: FormData) => {
  const { data } = await api.post("/api/admin/notes", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

export const updateNote = async (id: string, body: object) => {
  const { data } = await api.patch(`/api/admin/notes/${id}`, body);
  return data;
};

export const deleteNote = async (id: string) => {
  const { data } = await api.delete(`/api/admin/notes/${id}`);
  return data;
};

// ── Users ────────────────────────────────────────────────────

export const getUsers = async (filters?: {
  examTypeId?: string;
  page?: number;
  search?: string;
}) => {
  const { data } = await api.get("/api/admin/users", { params: filters });
  return data;
};

export const getUserDetail = async (id: string) => {
  const { data } = await api.get(`/api/admin/users/${id}`);
  return data;
};

export const resetUserExamType = async (id: string) => {
  const { data } = await api.patch(`/api/admin/users/${id}/reset-exam`);
  return data;
};

// ── Analytics ────────────────────────────────────────────────

export const getOverview = async () => {
  const { data } = await api.get("/api/admin/analytics/overview");
  return data;
};

export const getTestAnalytics = async () => {
  const { data } = await api.get("/api/admin/analytics/tests");
  return data;
};

export const getPaymentRecords = async (page = 1, status?: string) => {
  const { data } = await api.get("/api/admin/analytics/payments", {
    params: { page, status },
  });
  return data;
};

// ── Notifications ────────────────────────────────────────────

export const getNotifications = async () => {
  const { data } = await api.get("/api/admin/notifications");
  return data;
};

export const broadcastNotification = async (body: {
  examTypeId?: string;
  title: string;
  body: string;
}) => {
  const { data } = await api.post("/api/admin/notifications", body);
  return data;
};