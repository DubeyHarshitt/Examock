import type { StateCreator } from "zustand";
import type { AdminStore } from "../types/admin.store.types";

import {
  getQuestionsApi,
  createQuestionApi,
//   bulkCreateQuestionsApi,
  updateQuestionApi,
  deleteQuestionApi,
} from "../../../api/admin.api";

import type {
  Questions,
  createQuestionsDto,
  updateQuestionDto,
} from "../types/admin.types";

export interface QuestionsSlice {
  questions: Questions[];
  questionsLoading: boolean;
  questionsError: string | null;

  fetchQuestions: (topicId: string, page: number) => Promise<void>;
  createQuestion : (data: createQuestionsDto) => Promise<void>;
    updateQuestion : (id: string, data: updateQuestionDto) => Promise<void>;
    deleteQuestion: (id: string) => Promise<void>;
}

export const createQuestionSlice: StateCreator<
  AdminStore,
  [],
  [],
  QuestionsSlice
> = (set) => ({
  questions: [],
  questionsLoading: false,
  questionsError: null,

  fetchQuestions: async (topicId: string, page: number) => {
    set({ questionsLoading: true, questionsError: null });
    try {
      const fetchedQuestions = await getQuestionsApi(topicId, page);
      set({ questions: fetchedQuestions.questions });
    } catch (error) {
      set({ questionsError: (error as Error).message });
    } finally {
      set({ questionsLoading: false });
    }
  },

  createQuestion: async (data: createQuestionsDto) => {
    // Clear legacy errors immediately upon entering execution context
    set({ questionsError: null });
    try {
      const newQuestion = await createQuestionApi(data);
      set((state) => ({
        questions: [...state.questions, newQuestion],
      }));
    } catch (error) {
      set({ questionsError: (error as Error).message });
      throw error; // Re-throw to inform local form components of execution blockers
    }
  },

  updateQuestion: async (id: string, data: updateQuestionDto) => {
    set({ questionsError: null });
    try {
      const updatedQuestion = await updateQuestionApi(id, data);
      set((state) => ({
        questions: state.questions.map((question) =>
          question.id === id ? updatedQuestion : question
        ),
      }));
    } catch (error) {
      set({ questionsError: (error as Error).message });
    }
  },

  deleteQuestion: async (id) => {
    set({ questionsError: null });
    try {
      await deleteQuestionApi(id);
      set((state) => ({
        questions: state.questions.filter((question) => question.id !== id),
      }));
    } catch (error) {
      set({ questionsError: (error as Error).message });
    }
  },
});