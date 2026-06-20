import type { StateCreator } from "zustand";
import type { AdminStore } from "../types/admin.store.types";
import type {
  ExamType,
  CreateExamTypeDto,
  UpdateExamTypeDto,
} from "../types/admin.types";

import {
  getExamTypesApi,
  createExamTypeApi,
  updateExamTypeApi,
  deleteExamTypeApi,
} from "../../../api/admin.api";

export interface ExamTypesSlice {
  examTypes: ExamType[];
  examTypesLoading: boolean;
  examTypesError: string | null;

  fetchExamTypes: () => Promise<void>;
  createExamType: (data: {
    name: string;
    slug: string;
    description?: string;
  }) => Promise<void>;
  updateExamType: (id: string, data: UpdateExamTypeDto) => Promise<void>;
  deleteExamType: (id: string) => Promise<void>;
}

export const createExamTypesSlice: StateCreator<
  AdminStore,
  [],
  [],
  ExamTypesSlice
> = (set) => ({
  examTypes: [],
  examTypesLoading: false,
  examTypesError: null,

  fetchExamTypes: async () => {
    set({
      examTypesLoading: true,
    });

    try {
      const data = await getExamTypesApi();

      set({ examTypes: data, examTypesError: null });
    } catch (error) {
      set({ examTypesError: (error as Error).message });
    } finally {
      set({ examTypesLoading: false });
    }
  },
  createExamType: async (data: CreateExamTypeDto) => {
    try {
      const newExamType = await createExamTypeApi(data);

      set((state) => ({
        examTypes: [...state.examTypes, newExamType],
        examTypesError: null,
      }));
    } catch (error) {
      set({
        examTypesError: (error as Error).message,
      });
    }
  },
  updateExamType: async (id: string, data: UpdateExamTypeDto) => {
    try {
      const updatedExamType = await updateExamTypeApi(id, { body: data });

      set((state) => ({
        examTypes: state.examTypes.map((examType) =>
          examType.id === id ? updatedExamType : examType,
        ),
        examTypesError: null,
      }));
    } catch (error) {
      set({ examTypesError: (error as Error).message });
    }
  },
  deleteExamType: async (id: string) => {
    try {
      await deleteExamTypeApi(id);

      set((state) => ({
        examTypes: state.examTypes.filter((et) => et.id !== id),
        examTypesError: null,
      }));
    } catch (error) {
      set({ examTypesError: (error as Error).message });
    }
  },
});
