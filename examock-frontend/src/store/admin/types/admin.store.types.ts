import type { SubjectsSlice } from "../slices/subjects.slice"
import type { ExamTypesSlice } from "../slices/examTypes.slice";
import type { TopicSlice } from "../slices/topics.slice";
import type { QuestionsSlice } from "../slices/questions.slice";
import type { MockTestsSlice } from "../slices/mockTests.slice";
import type { NotesSlice } from "../slices/notes.slice";

export type AdminStore =
  SubjectsSlice &
  ExamTypesSlice &
  TopicSlice&
  QuestionsSlice&
  MockTestsSlice&
  NotesSlice;