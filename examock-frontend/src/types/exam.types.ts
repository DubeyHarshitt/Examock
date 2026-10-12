// src/types/exam.types.ts
//
// Shared exam type DTO. Lives in its own file so neither admin nor student
// types need to import from the other. Ticket 07.

export interface ExamType {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}