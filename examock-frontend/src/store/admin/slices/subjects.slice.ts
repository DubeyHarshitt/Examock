import type { StateCreator } from "zustand"; // need to import to fix type "any" for {get, set}
import type {
  Subject,
  CreateSubjectDto,
  UpdateSubjectDto,
} from "../types/admin.types";
import type { AdminStore } from "../types/admin.store.types";
import {
  getSubjectsApi,
  createSubjectApi,
  updateSubjectApi,
  deleteSubjectApi
} from "../../../api/admin.api";

export interface SubjectsSlice {
  subjects: Subject[];
  subjectsLoading: boolean;
  subjectsError: string | null;

  fetchSubjects: (examTypeId?: string) => Promise<void>;
  createSubject: (data: CreateSubjectDto) => Promise<void>;
  updateSubject: (id: string, data: Partial<Subject>) => Promise<void>;
  deleteSubject: (id: string) => Promise<void>;
}

export const createSubjectsSlice: StateCreator<
  AdminStore,
  [],
  [],
  SubjectsSlice
> = (set) => ({
  subjects: [],
  subjectsLoading: false,
  subjectsError: null,

  fetchSubjects: async (examTypeId) => {
    set({ subjectsLoading: true });
    try {
      const data = await getSubjectsApi(examTypeId);
      set({ subjects: data, subjectsError: null });
    } catch (error) {
      set({ subjectsError: (error as Error).message });
    } finally {
      set({ subjectsLoading: false });
    }
  },
  createSubject: async (data) => {
    try {
      const newSubject = await createSubjectApi(data);
      set((state) => ({
        subjects: [...state.subjects, newSubject],
      }));
    } catch (error) {
      set({ subjectsError: (error as Error).message });
    }
  },
  updateSubject: async (id: string, data: UpdateSubjectDto) => {
    try {
      const updatedSubject = await updateSubjectApi(id, data);
      set((state) => ({
        subjects: state.subjects.map((s) => (s.id === id ? updatedSubject : s)),
      }));
    } catch (error) {
      set({ subjectsError: (error as Error).message });
    }
  },
  deleteSubject: async (id: string) => {
  try {
    await deleteSubjectApi(id);
    set((state) => ({
      subjects: state.subjects.filter((sub) => sub.id !== id),
    }));
  } catch (error) {
    set({ subjectsError: (error as Error).message });
  }
},
});
