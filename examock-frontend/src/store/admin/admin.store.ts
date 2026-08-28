// store/admin/admin.store.ts

import { create } from "zustand";
import type { AdminStore } from "./types/admin.store.types";
import { createSubjectsSlice } from "./slices/subjects.slice";
import { createExamTypesSlice } from "./slices/examTypes.slice";
import { createTopicSlice } from "./slices/topics.slice";
import { createQuestionSlice } from "./slices/questions.slice";
import { createMockTestsSlice } from "./slices/mockTests.slice";
import { createNotesSlice } from "./slices/notes.slice";
import { createVideosSlice } from "./slices/videos.slice";
import { createYtChannelsSlice } from "./slices/ytChannels.slice";
import { createUsersSlice } from "./slices/users.slice";
import { createAnalyticsSlice } from "./slices/analytics.slice";
import { createNotificationsSlice } from "./slices/notifications.slice";

export const useAdminStore = create<AdminStore>()((...a) => ({
  ...createSubjectsSlice(...a),
  ...createExamTypesSlice(...a),
  ...createTopicSlice(...a),
  ...createQuestionSlice(...a),
  ...createMockTestsSlice(...a),
  ...createNotesSlice(...a),
  ...createVideosSlice(...a),
  ...createYtChannelsSlice(...a),
  ...createUsersSlice(...a),
  ...createAnalyticsSlice(...a),
  ...createNotificationsSlice(...a),
}));
