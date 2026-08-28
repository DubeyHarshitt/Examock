// store/admin/slices/users.slice.ts
import type { StateCreator } from "zustand";
import type { AdminStore } from "../types/admin.store.types";
import {
  getUsersApi,
  getUserDetailApi,
  resetUserExamTypeApi,
} from "../../../api/admin.api";
import type {
  AdminUser,
  AdminUserDetail,
  GetUsersResponse,
} from "../../../types/admin.types";

export interface UsersSlice {
  users: AdminUser[];
  usersTotal: number;
  usersPage: number;
  usersLimit: number;
  usersLoading: boolean;
  usersError: string | null;
  usersSearch: string;
  /** Currently-viewed user detail (from the detail drawer/page) */
  selectedUser: AdminUserDetail | null;
  selectedUserLoading: boolean;

  fetchUsers: (filters?: {
    examTypeId?: string;
    page?: number;
    search?: string;
  }) => Promise<void>;
  fetchUserDetail: (id: string) => Promise<void>;
  resetUserExam: (id: string) => Promise<void>;
  setUsersSearch: (search: string) => void;
  clearSelectedUser: () => void;
}

export const createUsersSlice: StateCreator<
  AdminStore,
  [],
  [],
  UsersSlice
> = (set, get) => ({
  users: [],
  usersTotal: 0,
  usersPage: 1,
  usersLimit: 20,
  usersLoading: false,
  usersError: null,
  usersSearch: "",
  selectedUser: null,
  selectedUserLoading: false,

  fetchUsers: async (filters) => {
    const page = filters?.page ?? get().usersPage;
    const params = {
      examTypeId: filters?.examTypeId,
      page,
      search: filters?.search ?? get().usersSearch,
    };
    set({ usersLoading: true, usersError: null, usersPage: page });
    try {
      const res: GetUsersResponse = await getUsersApi(params);
      set({
        users: res.users,
        usersTotal: res.total,
        usersPage: res.page,
        usersLimit: res.limit,
        usersError: null,
      });
    } catch (error) {
      set({ usersError: (error as Error).message });
    } finally {
      set({ usersLoading: false });
    }
  },

  fetchUserDetail: async (id) => {
    set({ selectedUserLoading: true, usersError: null });
    try {
      const user: AdminUserDetail = await getUserDetailApi(id);
      set({ selectedUser: user, usersError: null });
    } catch (error) {
      set({ usersError: (error as Error).message });
      throw error;
    } finally {
      set({ selectedUserLoading: false });
    }
  },

  resetUserExam: async (id) => {
    set({ usersLoading: true, usersError: null });
    try {
      await resetUserExamTypeApi(id);
      // Update the local list entry's examTypeId (and name is now null)
      set((state) => ({
        users: state.users.map((u) =>
          u.id === id ? { ...u, examTypeId: null, examType: null } : u
        ),
        usersError: null,
      }));
    } catch (error) {
      set({ usersError: (error as Error).message });
      throw error;
    } finally {
      set({ usersLoading: false });
    }
  },

  setUsersSearch: (search) => {
    set({ usersSearch: search });
  },

  clearSelectedUser: () => {
    set({ selectedUser: null });
  },
});
