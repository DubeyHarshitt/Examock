import type { StateCreator } from "zustand";
import type { AdminStore } from "../types/admin.store.types";
import type { ExamType } from "../types/admin.types";

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
  //   createExamType: (data: { name: string; slug: string; description?: string }) => Promise<void>;
  //   updateExamType: (id: string, data: Partial<{ name: string; slug: string; description?: string }>) => Promise<void>;
  //   deleteExamType: (id: string) => Promise<void>;
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

      set({
        examTypes: data,
        examTypesError: null,
      });
    } catch (error) {
      set({
        examTypesError: (error as Error).message,
      });
    } finally {
      set({
        examTypesLoading: false,
      });
    }
  },
});
