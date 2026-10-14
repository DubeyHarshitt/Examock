import { create } from "zustand";

type Option = "A" | "B" | "C" | "D";

interface SavedAnswer {
  questionId: string;
  questionIndex: number;
  selectedOption: Option;
}

/**
 * Per-test session. Each `TestEnginePage` instance reads and writes its own
 * session via the keyed store, so cross-test navigation never leaks
 * `attemptId` between routes.
 */
interface TestSession {
  attemptId: string;
  answers: Record<string, Option | null>;
  currentIndex: number;
  totalQuestions: number;
}

interface TestStore {
  /** Map of testId → active session. */
  sessions: Record<string, TestSession>;

  // Actions
  startTest: (
    testId: string,
    session: Omit<TestSession, "answers" | "currentIndex"> & {
      savedAnswers?: SavedAnswer[];
    },
  ) => void;
  saveAnswer: (testId: string, questionId: string, option: Option | null) => void;
  setCurrentIndex: (testId: string, index: number) => void;
  clearTest: (testId: string) => void;

  // Computed — read by testId so they're safe across tests
  getSession: (testId: string) => TestSession | undefined;
  getAnswer: (testId: string, questionId: string) => Option | null;
  answeredCount: (testId: string) => number;
}

export const useTestStore = create<TestStore>((set, get) => ({
  sessions: {},

  startTest: (testId, session) =>
    set((state) => {
      // Don't overwrite an in-progress session for the same attemptId —
      // a remount must not wipe saved answers.
      const existing = state.sessions[testId];
      if (existing && existing.attemptId === session.attemptId) {
        return state;
      }
      // Seed answers the server already holds so a resumed attempt shows the
      // right answered count + palette straight away instead of blank (F12).
      const answers: Record<string, Option | null> = {};
      for (const { questionId, selectedOption } of session.savedAnswers ?? []) {
        answers[questionId] = selectedOption;
      }
      return {
        sessions: {
          ...state.sessions,
          [testId]: {
            attemptId: session.attemptId,
            totalQuestions: session.totalQuestions,
            answers,
            currentIndex: 0,
          },
        },
      };
    }),

  saveAnswer: (testId, questionId, option) =>
    set((state) => {
      const session = state.sessions[testId];
      if (!session) return state;
      return {
        sessions: {
          ...state.sessions,
          [testId]: {
            ...session,
            answers: { ...session.answers, [questionId]: option },
          },
        },
      };
    }),

  setCurrentIndex: (testId, index) =>
    set((state) => {
      const session = state.sessions[testId];
      if (!session) return state;
      return {
        sessions: {
          ...state.sessions,
          [testId]: { ...session, currentIndex: index },
        },
      };
    }),

  clearTest: (testId) =>
    set((state) => {
      const { [testId]: _drop, ...rest } = state.sessions;
      void _drop;
      return { sessions: rest };
    }),

  getSession: (testId) => get().sessions[testId],

  getAnswer: (testId, questionId) =>
    get().sessions[testId]?.answers[questionId] ?? null,

  answeredCount: (testId) =>
    Object.values(get().sessions[testId]?.answers ?? {}).filter(
      (v) => v !== null,
    ).length,
}));