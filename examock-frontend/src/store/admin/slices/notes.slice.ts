// export const getNotesApi = async (filters?: {
//   examTypeId?: string;
//   topicId?: string;
//   subjectId?: string;
//   page?: number;
// }) => {
//   const { data } = await api.get("/admin/notes", { params: filters });
//   return data;
// };

// export const createNoteApi = async (formData: FormData) => {
//   const { data } = await api.post("/admin/notes", formData, {
//     headers: { "Content-Type": "multipart/form-data" },
//   });
//   return data;
// };

// export const updateNoteApi = async (id: string, body: object) => {
//   const { data } = await api.patch(`/admin/notes/${id}`, body);
//   return data;
// };

// export const deleteNoteApi = async (id: string) => {
//   const { data } = await api.delete(`/admin/notes/${id}`);
//   return data;
// };

import type { StateCreator } from "zustand";
import { getNotesApi, createNoteApi, updateNoteApi, deleteNoteApi } from "../../../api/admin.api";