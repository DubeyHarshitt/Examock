import type { SubjectsSlice } from "../slices/subjects.slice"
import type { ExamTypesSlice } from "../slices/examTypes.slice";
import type { TopicSlice } from "../slices/topics.slice";
import type { QuestionsSlice } from "../slices/questions.slice";
import type { MockTestsSlice } from "../slices/mockTests.slice";
import type { NotesSlice } from "../slices/notes.slice";
import type { VideosSlice } from "../slices/videos.slice";
import type { YtChannelsSlice } from "../slices/ytChannels.slice";
import type { UsersSlice } from "../slices/users.slice";
import type { AnalyticsSlice } from "../slices/analytics.slice";
import type { NotificationsSlice } from "../slices/notifications.slice";

export type AdminStore =
  SubjectsSlice &
  ExamTypesSlice &
  TopicSlice &
  QuestionsSlice &
  MockTestsSlice &
  NotesSlice &
  VideosSlice &
  YtChannelsSlice &
  UsersSlice &
  AnalyticsSlice &
  NotificationsSlice;
