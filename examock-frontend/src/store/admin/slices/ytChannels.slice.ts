// store/admin/slices/ytChannels.slice.ts
import type { StateCreator } from "zustand";
import type { AdminStore } from "../types/admin.store.types";
import {
  getYtChannelsApi,
  createYtChannelApi,
  updateYtChannelApi,
  deleteYtChannelApi,
} from "../../../api/admin.api";

export interface YtChannel {
  id: string;
  examTypeId: string;
  channelId: string;
  channelName: string;
  logoUrl: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreateYtChannelDto {
  examTypeId: string;
  channelId: string;
  channelName: string;
  logoUrl?: string;
}

export interface YtChannelsSlice {
  ytChannels: YtChannel[];
  ytChannelsLoading: boolean;
  ytChannelsError: string | null;

  fetchYtChannels: (examTypeId?: string) => Promise<void>;
  createYtChannel: (dto: CreateYtChannelDto) => Promise<void>;
  updateYtChannel: (
    id: string,
    dto: Partial<CreateYtChannelDto>
  ) => Promise<void>;
  deleteYtChannel: (id: string) => Promise<void>;
}

export const createYtChannelsSlice: StateCreator<
  AdminStore,
  [],
  [],
  YtChannelsSlice
> = (set) => ({
  ytChannels: [],
  ytChannelsLoading: false,
  ytChannelsError: null,

  fetchYtChannels: async (examTypeId) => {
    set({ ytChannelsLoading: true, ytChannelsError: null });
    try {
      const data = await getYtChannelsApi(examTypeId);
      set({ ytChannels: data, ytChannelsError: null });
    } catch (error) {
      set({ ytChannelsError: (error as Error).message });
    } finally {
      set({ ytChannelsLoading: false });
    }
  },

  createYtChannel: async (dto) => {
    set({ ytChannelsLoading: true, ytChannelsError: null });
    try {
      const created = await createYtChannelApi(dto);
      set((state) => ({
        ytChannels: [...state.ytChannels, created],
        ytChannelsError: null,
      }));
    } catch (error) {
      set({ ytChannelsError: (error as Error).message });
      throw error;
    } finally {
      set({ ytChannelsLoading: false });
    }
  },

  updateYtChannel: async (id, dto) => {
    set({ ytChannelsLoading: true, ytChannelsError: null });
    try {
      const updated = await updateYtChannelApi(id, dto);
      set((state) => ({
        ytChannels: state.ytChannels.map((c) => (c.id === id ? updated : c)),
        ytChannelsError: null,
      }));
    } catch (error) {
      set({ ytChannelsError: (error as Error).message });
      throw error;
    } finally {
      set({ ytChannelsLoading: false });
    }
  },

  deleteYtChannel: async (id) => {
    set({ ytChannelsLoading: true, ytChannelsError: null });
    try {
      await deleteYtChannelApi(id);
      set((state) => ({
        ytChannels: state.ytChannels.filter((c) => c.id !== id),
        ytChannelsError: null,
      }));
    } catch (error) {
      set({ ytChannelsError: (error as Error).message });
      throw error;
    } finally {
      set({ ytChannelsLoading: false });
    }
  },
});
