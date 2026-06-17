import type { SubjectsSlice } from "../slices/subjects.slice"
import type { ExamTypesSlice } from "../slices/examTypes.slice";

export type AdminStore =
  SubjectsSlice &
  ExamTypesSlice;