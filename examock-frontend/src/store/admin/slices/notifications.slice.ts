// store/admin/slices/notifications.slice.ts
import type { StateCreator } from "zustand";
import type { AdminStore } from "../types/admin.store.types";
import {
  getNotificationsApi,
  broadcastNotificationApi,
  deleteNotificationApi,
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
  deletingId: string | null;

  fetchNotifications: () => Promise<void>;
  broadcastNotification: (dto: CreateNotificationDto) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
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
  deletingId: null,

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

  deleteNotification: async (id) => {
    set({ deletingId: id, notificationsError: null });
    // Snapshot before mutation so we can roll back on error.
    let snapshot: AdminNotification[] = [];
    set((state) => {
      snapshot = state.notifications;
      return {
        notifications: state.notifications.filter((n) => n.id !== id),
      };
    });
    try {
      await deleteNotificationApi(id);
    } catch (error) {
      // Roll back the optimistic remove.
      set({
        notifications: snapshot,
        notificationsError: (error as Error).message,
      });
      throw error;
    } finally {
      set({ deletingId: null });
    }
  },
});
