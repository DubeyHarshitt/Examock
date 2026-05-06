import { create } from "zustand";

type Option = "A" | "B" | "C" | "D";

interface TestStore {
  attemptId: string | null;
  answers: Record<string, Option | null>; // { [questionId]: selectedOption }
  currentIndex: number;
  totalQuestions: number;

  // Actions
  startTest: (attemptId: string, totalQuestions: number) => void;
  saveAnswer: (questionId: string, option: Option | null) => void;
  setCurrentIndex: (index: number) => void;
  clearTest: () => void;

  // Computed
  getAnswer: (questionId: string) => Option | null;
  answeredCount: () => number;
}

export const useTestStore = create<TestStore>((set, get) => ({
  attemptId:      null,
  answers:        {},
  currentIndex:   0,
  totalQuestions: 0,

  startTest: (attemptId, totalQuestions) =>
    set({ attemptId, totalQuestions, answers: {}, currentIndex: 0 }),

  saveAnswer: (questionId, option) =>
    set((state) => ({
      answers: { ...state.answers, [questionId]: option },
    })),

  setCurrentIndex: (index) =>
    set({ currentIndex: index }),

  clearTest: () =>
    set({ attemptId: null, answers: {}, currentIndex: 0, totalQuestions: 0 }),

  getAnswer: (questionId) => get().answers[questionId] ?? null,

  answeredCount: () =>
    Object.values(get().answers).filter((v) => v !== null).length,
}));