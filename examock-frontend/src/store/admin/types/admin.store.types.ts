import type { SubjectsSlice } from "../slices/subjects.slice"
import type { ExamTypesSlice } from "../slices/examTypes.slice";
import type { TopicSlice } from "../slices/topics.slice";
import type { QuestionsSlice } from "../slices/questions.slice";
import type { MockTestsSlice } from "../slices/mockTests.slice";

export type AdminStore =
  SubjectsSlice &
  ExamTypesSlice &
  TopicSlice&
  QuestionsSlice&
  MockTestsSlice;