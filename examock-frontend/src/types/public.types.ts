// public.types.ts — response shapes of the unauthenticated SEO read API
// (ticket 24, backend: src/modules/public/public.service.js).
//
// Deliberately id-free: public pages address everything by slug.

export interface PublicSlugName {
  slug: string;
  name: string;
}

/** GET /api/public/exam-types — the /exams index. */
export interface PublicExamSummary extends PublicSlugName {
  description: string | null;
  subjectCount: number;
  topicCount: number;
  subjects: PublicSlugName[];
}

export interface PublicTopicCard extends PublicSlugName {
  questionCount: number;
}

/** GET /api/public/exam-types/:examSlug — the syllabus page. */
export interface PublicSyllabus extends PublicSlugName {
  description: string | null;
  subjects: (PublicSlugName & { topics: PublicSlugName[] })[];
}

/** GET /api/public/exam-types/:examSlug/subjects/:subjectSlug */
export interface PublicSubjectPage {
  exam: PublicSlugName & { description: string | null };
  subject: PublicSlugName & { topics: PublicTopicCard[] };
  siblings: PublicSlugName[];
}

/** GET /api/public/exam-types/:examSlug/subjects/:subjectSlug/topics/:topicSlug */
export interface PublicTopicPage {
  exam: PublicSlugName;
  subject: PublicSlugName;
  current: PublicTopicCard;
  siblings: PublicSlugName[];
}
