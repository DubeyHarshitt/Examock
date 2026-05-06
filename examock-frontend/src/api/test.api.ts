import api from "./axios";

export const getTests = async () => {
  const { data } = await api.get("/api/test");
  return data;
};

export const getTestById = async (testId: string) => {
  const { data } = await api.get(`/api/test/${testId}`);
  return data;
};

export const startTest = async (testId: string) => {
  const { data } = await api.post(`/api/test/${testId}/start`);
  return data;
};

export const getQuestion = async (
  testId: string,
  attemptId: string,
  index: number
) => {
  const { data } = await api.get(`/api/test/${testId}/question`, {
    params: { attemptId, index },
  });
  return data;
};

export const saveAnswer = async (
  testId: string,
  body: {
    attemptId: string;
    questionId: string;
    selectedOption: "A" | "B" | "C" | "D" | null;
  }
) => {
  const { data } = await api.post(`/api/test/${testId}/answer`, body);
  return data;
};

export const submitTest = async (testId: string, attemptId: string) => {
  const { data } = await api.post(`/api/test/${testId}/submit`, { attemptId });
  return data;
};

export const getResult = async (testId: string, attemptId: string) => {
  const { data } = await api.get(`/api/test/${testId}/result`, {
    params: { attemptId },
  });
  return data;
};