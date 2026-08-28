import type { StateCreator } from "zustand";
import type { AdminStore } from "../types/admin.store.types";

import type {
  Topic,
  CreateTopicDto,
  UpdateTopicDto,
} from "../types/admin.types";
import {
  getTopicsApi,
  createTopicApi,
  updateTopicApi,
  deleteTopicApi,
} from "../../../api/admin.api";

export interface TopicSlice {
  topics: Topic[];
  topicLoading: boolean;
  topicError: string | null;

  fetchTopic: (subjectId: string) => Promise<void>;
    createTopic: (data: CreateTopicDto) => Promise<void>
    updateTopic: (id: string, data: UpdateTopicDto) => Promise<void>
    deleteTopic: (id: string) => Promise<void>
}

export const createTopicSlice: StateCreator<AdminStore, [], [], TopicSlice> = (
  set,
) => ({
  topics: [],
  topicLoading: false,
  topicError: null,

  fetchTopic: async (subjectId: string) => {
    set({
      topicLoading: true,
      topicError: null,
    });

    try {
      const topics = await getTopicsApi(subjectId);

      set({
        topics: topics,
      });
    } catch (error) {
      set({
        topicError: (error as Error).message,
      });
    } finally {
      set({
        topicLoading: false,
      });
    }
  },

  createTopic: async (data: CreateTopicDto) => {
    try {
      const newTopic = await createTopicApi(data);

      set((state) => ({
        topics: [...state.topics, newTopic],
        topicError: null,
      }));
    } catch (error) {
      set({
        topicError: (error as Error).message,
      });
    }
  },

  updateTopic: async (id: string, data: UpdateTopicDto) => {
    try {
        const updatedTopic = await updateTopicApi(id, data);

        set((state)=>({
            topics: state.topics.map((topic) => topic.id === id ? updatedTopic : topic),
            topicError: null,
        }));
    } catch (error) {
        set({ topicError: (error as Error).message, })
    }
  },

  deleteTopic: async (id: string) => {
    try {
        await deleteTopicApi(id);
        set((state)=> ({
            topics: state.topics.filter((topic)=> topic.id !== id),
            topicError: null,
        }))

    } catch (error) {
        set({ topicError: (error as Error).message, })
    }
  }

});
