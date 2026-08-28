// store/admin/slices/notifications.slice.ts
import type { StateCreator } from "zustand";
import type { AdminStore } from "../types/admin.store.types";
import {
  getNotificationsApi,
  broadcastNotificationApi,
} from "../../../api/admin.api";
import type {
  AdminNotification,
  CreateNotificationDto,
} from "../../../types/admin.types";

export interface NotificationsSlice {
  notifications: AdminNotification[];
  notificationsLoading: boolean;
  notificationsError: string | null;
  broadcastLoading: boolean;

  fetchNotifications: () => Promise<void>;
  broadcastNotification: (dto: CreateNotificationDto) => Promise<void>;
}

export const createNotificationsSlice: StateCreator<
  AdminStore,
  [],
  [],
  NotificationsSlice
> = (set) => ({
  notifications: [],
  notificationsLoading: false,
  notificationsError: null,
  broadcastLoading: false,

  fetchNotifications: async () => {
    set({ notificationsLoading: true, notificationsError: null });
    try {
      const data: AdminNotification[] = await getNotificationsApi();
      set({ notifications: data, notificationsError: null });
    } catch (error) {
      set({ notificationsError: (error as Error).message });
    } finally {
      set({ notificationsLoading: false });
    }
  },

  broadcastNotification: async (dto) => {
    set({ broadcastLoading: true, notificationsError: null });
    try {
      const { notification } = await broadcastNotificationApi(dto);
      // Prepend so the newest is at the top of the list
      set((state) => ({
        notifications: [notification as AdminNotification, ...state.notifications],
        notificationsError: null,
      }));
    } catch (error) {
      set({ notificationsError: (error as Error).message });
      throw error;
    } finally {
      set({ broadcastLoading: false });
    }
  },
});
