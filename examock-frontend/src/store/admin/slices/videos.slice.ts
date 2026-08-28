// store/admin/slices/videos.slice.ts
import type { StateCreator } from "zustand";
import type { AdminStore } from "../types/admin.store.types";
import {
  getVideosApi,
  createVideoApi,
  updateVideoApi,
  deleteVideoApi,
} from "../../../api/admin.api";

export interface Video {
  id: string;
  topicId: string;
  youtubeId: string;
  title: string;
  durationSec: number | null;
  orderIndex: number;
  topic?: { name: string };
}

export interface CreateVideoDto {
  topicId: string;
  youtubeId: string;
  title: string;
  durationSec?: number;
  orderIndex?: number;
}

export interface VideosSlice {
  videos: Video[];
  videosLoading: boolean;
  videosError: string | null;

  fetchVideos: (topicId?: string) => Promise<void>;
  createVideo: (dto: CreateVideoDto) => Promise<void>;
  updateVideo: (id: string, dto: Partial<CreateVideoDto>) => Promise<void>;
  deleteVideo: (id: string) => Promise<void>;
}

export const createVideosSlice: StateCreator<
  AdminStore,
  [],
  [],
  VideosSlice
> = (set) => ({
  videos: [],
  videosLoading: false,
  videosError: null,

  fetchVideos: async (topicId) => {
    set({ videosLoading: true, videosError: null });
    try {
      const data = await getVideosApi(topicId);
      set({ videos: data, videosError: null });
    } catch (error) {
      set({ videosError: (error as Error).message });
    } finally {
      set({ videosLoading: false });
    }
  },

  createVideo: async (dto) => {
    set({ videosLoading: true, videosError: null });
    try {
      const created = await createVideoApi(dto);
      set((state) => ({ videos: [...state.videos, created], videosError: null }));
    } catch (error) {
      set({ videosError: (error as Error).message });
      throw error;
    } finally {
      set({ videosLoading: false });
    }
  },

  updateVideo: async (id, dto) => {
    set({ videosLoading: true, videosError: null });
    try {
      const updated = await updateVideoApi(id, dto);
      set((state) => ({
        videos: state.videos.map((v) => (v.id === id ? updated : v)),
        videosError: null,
      }));
    } catch (error) {
      set({ videosError: (error as Error).message });
      throw error;
    } finally {
      set({ videosLoading: false });
    }
  },

  deleteVideo: async (id) => {
    set({ videosLoading: true, videosError: null });
    try {
      await deleteVideoApi(id);
      set((state) => ({
        videos: state.videos.filter((v) => v.id !== id),
        videosError: null,
      }));
    } catch (error) {
      set({ videosError: (error as Error).message });
      throw error;
    } finally {
      set({ videosLoading: false });
    }
  },
});
