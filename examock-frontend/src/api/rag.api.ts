import api from "./axios";

export const uploadPdf = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await api.post("/api/rag/ingest", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return data;
};

export const askQuestion = async (question: string) => {
  const { data } = await api.post("/api/rag/chat", { question });
  return data;
};