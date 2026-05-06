import api from "./axios";

export const getDashboard = async () => {
  const { data } = await api.get("/api/student/dashboard");
  return data;
};

export const getSubjects = async () => {
  const { data } = await api.get("/api/student/subjects");
  return data;
};

export const getTopics = async (subjectId: string) => {
  const { data } = await api.get("/api/student/topics", {
    params: { subjectId },
  });
  return data;
};

export const getVideosByTopic = async (topicId: string) => {
  const { data } = await api.get("/api/student/videos", {
    params: { topicId },
  });
  return data;
};

export const getVideosBySubject = async (subjectId: string) => {
  const { data } = await api.get("/api/student/videos", {
    params: { subjectId },
  });
  return data;
};

export const getNotes = async (filters?: {
  topicId?: string;
  subjectId?: string;
}) => {
  const { data } = await api.get("/api/student/notes", { params: filters });
  return data;
};

export const getNoteById = async (id: string) => {
  const { data } = await api.get(`/api/student/notes/${id}`);
  return data;
};

export const getYtChannels = async () => {
  const { data } = await api.get("/api/student/yt-channels");
  return data;
};

export const getProgress = async () => {
  const { data } = await api.get("/api/student/progress");
  return data;
};

export const getTopicProgress = async (topicId: string) => {
  const { data } = await api.get(`/api/student/progress/${topicId}`);
  return data;
};