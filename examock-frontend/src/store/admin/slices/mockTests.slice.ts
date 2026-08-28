// store/admin/slices/mockTests.slice.ts
import type { StateCreator } from "zustand";
import {
  getMockTestsApi,
  createMockTestApi,
  updateMockTestApi,
  deleteMockTestApi,
  addQuestionToTestApi,
  removeQuestionFromTestApi,
  reorderTestQuestionsApi,
  getMockTestDetailApi,
} from "../../../api/admin.api";
import type {
  MockTest,
  MockTestDetail,
  CreateMockTestDto,
  UpdateMockTestDto,
} from "../types/admin.types";

export interface MockTestsSlice {
  mockTests: MockTest[];
  mockTestsTotal: number;
  mockTestsLoading: boolean;
  mockTestsError: string | null;

  currentMockTest: MockTestDetail | null;
  currentMockTestLoading: boolean;

  fetchMockTests: (examTypeId?: string, page?: number, limit?: number) => Promise<void>;
  fetchMockTestDetail: (id: string) => Promise<void>;
  createMockTest: (data: CreateMockTestDto) => Promise<MockTest | undefined>;
  updateMockTest: (id: string, data: UpdateMockTestDto) => Promise<void>;
  deleteMockTest: (id: string) => Promise<void>;

  addQuestionToTest: (testId: string, questionId: string, orderIndex?: number) => Promise<void>;
  removeQuestionFromTest: (testId: string, questionId: string) => Promise<void>;
  reorderTestQuestions: (
    testId: string,
    questions: { questionId: string; orderIndex: number }[]
  ) => Promise<void>;
}

export const createMockTestsSlice: StateCreator<MockTestsSlice> = (set, get) => ({
  mockTests: [],
  mockTestsTotal: 0,
  mockTestsLoading: false,
  mockTestsError: null,

  currentMockTest: null,
  currentMockTestLoading: false,

  fetchMockTests: async (examTypeId, page = 1) => {
    set({ mockTestsLoading: true, mockTestsError: null });
    try {
      const data = await getMockTestsApi(examTypeId, page);
      // backend returns { tests, total, page, limit }
      set({
        mockTests: data.tests,
        mockTestsTotal: data.total,
        mockTestsLoading: false,
      });
    } catch (err: any) {
      set({
        mockTestsError: err?.response?.data?.message ?? "Failed to fetch mock tests",
        mockTestsLoading: false,
      });
    }
  },

  fetchMockTestDetail: async (id) => {
    set({ currentMockTestLoading: true, mockTestsError: null });
    try {
      const detail: MockTestDetail = await getMockTestDetailApi(id);
      set({ currentMockTest: detail, currentMockTestLoading: false });
    } catch (err: any) {
      set({
        mockTestsError: err?.response?.data?.message ?? "Failed to fetch test detail",
        currentMockTestLoading: false,
      });
    }
  },

  createMockTest: async (data) => {
    set({ mockTestsError: null });
    try {
      const created: MockTest = await createMockTestApi(data);
      set((state) => ({ mockTests: [created, ...state.mockTests] }));
      return created;
    } catch (err: any) {
      set({ mockTestsError: err?.response?.data?.message ?? "Failed to create mock test" });
      return undefined;
    }
  },

  updateMockTest: async (id, data) => {
    set({ mockTestsError: null });
    try {
      const updated: MockTest = await updateMockTestApi(id, data);
      set((state) => ({
        mockTests: state.mockTests.map((t) => (t.id === id ? updated : t)),
      }));
    } catch (err: any) {
      set({ mockTestsError: err?.response?.data?.message ?? "Failed to update mock test" });
    }
  },

  deleteMockTest: async (id) => {
    set({ mockTestsError: null });
    try {
      await deleteMockTestApi(id);
      // backend does a soft delete (isActive: false) — reflect that, don't remove from list
      set((state) => ({
        mockTests: state.mockTests.map((t) =>
          t.id === id ? { ...t, isActive: false } : t
        ),
      }));
    } catch (err: any) {
      set({ mockTestsError: err?.response?.data?.message ?? "Failed to delete mock test" });
    }
  },

  addQuestionToTest: async (testId, questionId, orderIndex = 0) => {
    set({ mockTestsError: null });
    try {
      await addQuestionToTestApi(testId, questionId, orderIndex);
      set((state) => ({
        mockTests: state.mockTests.map((t) =>
          t.id === testId && t._count
            ? { ...t, _count: { ...t._count, questions: t._count.questions + 1 } }
            : t
        ),
      }));
      // Keep the picker's question list in sync if it's open on this test
      if (get().currentMockTest?.id === testId) {
        await get().fetchMockTestDetail(testId);
      }
    } catch (err: any) {
      set({ mockTestsError: err?.response?.data?.message ?? "Failed to add question to test" });
    }
  },

  removeQuestionFromTest: async (testId, questionId) => {
    set({ mockTestsError: null });
    try {
      await removeQuestionFromTestApi(testId, questionId);
      set((state) => ({
        mockTests: state.mockTests.map((t) =>
          t.id === testId && t._count
            ? { ...t, _count: { ...t._count, questions: Math.max(0, t._count.questions - 1) } }
            : t
        ),
      }));
      if (get().currentMockTest?.id === testId) {
        await get().fetchMockTestDetail(testId);
      }
    } catch (err: any) {
      set({ mockTestsError: err?.response?.data?.message ?? "Failed to remove question from test" });
    }
  },

  reorderTestQuestions: async (testId, questions) => {
    set({ mockTestsError: null });
    try {
      await reorderTestQuestionsApi(testId, questions);
      if (get().currentMockTest?.id === testId) {
        await get().fetchMockTestDetail(testId);
      }
    } catch (err: any) {
      set({ mockTestsError: err?.response?.data?.message ?? "Failed to reorder test questions" });
    }
  },
});