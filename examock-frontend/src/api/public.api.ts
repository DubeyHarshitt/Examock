// public.api.ts — unauthenticated reads for the SEO pages (ticket 24).
// Plain axios (no token needed; the interceptor simply sends none).
import api from "./axios";
import type {
  PublicExamSummary,
  PublicSubjectPage,
  PublicSyllabus,
  PublicTopicPage,
} from "../types/public.types";

export const getPublicExamsApi = async (): Promise<PublicExamSummary[]> => {
  const { data } = await api.get<PublicExamSummary[]>("/public/exam-types");
  return data;
};

export const getPublicSyllabusApi = async (
  examSlug: string,
): Promise<PublicSyllabus> => {
  const { data } = await api.get<PublicSyllabus>(
    `/public/exam-types/${examSlug}`,
  );
  return data;
};

export const getPublicSubjectApi = async (
  examSlug: string,
  subjectSlug: string,
): Promise<PublicSubjectPage> => {
  const { data } = await api.get<PublicSubjectPage>(
    `/public/exam-types/${examSlug}/subjects/${subjectSlug}`,
  );
  return data;
};

export const getPublicTopicApi = async (
  examSlug: string,
  subjectSlug: string,
  topicSlug: string,
): Promise<PublicTopicPage> => {
  const { data } = await api.get<PublicTopicPage>(
    `/public/exam-types/${examSlug}/subjects/${subjectSlug}/topics/${topicSlug}`,
  );
  return data;
};
