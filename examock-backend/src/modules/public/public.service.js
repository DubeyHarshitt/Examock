// src/modules/public/public.service.js — unauthenticated read model for the
// public SEO pages (ticket 24).
//
// Contract of everything exported from this module:
//   * active records only (isActive: true) — soft-deleted content never leaks
//   * field-stripped: slug/name/description/counts only. No ids, no emails,
//     no question text, and NEVER `correctOption` (answers stay behind the
//     authenticated test API).
//   * 404 as AppError when a slug doesn't resolve, so a mistyped or stale
//     URL fails cleanly instead of rendering a half-page.
//
// Queries are small and denormalized on purpose: the HTTP layer adds
// `Cache-Control: public, max-age=300`, so crawler bursts hit these once.

import prisma from "../../config/prisma.js";
import { AppError } from "../../utils/AppError.js";

// GET /api/public/exam-types — the /exams index page.
// Returns per-exam subject/topic counts, filtered to active content.
export const listPublicExamTypes = async () => {
  const exams = await prisma.examType.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: {
      slug: true,
      name: true,
      description: true,
      subjects: {
        where: { isActive: true },
        orderBy: { orderIndex: "asc" },
        select: {
          slug: true,
          name: true,
          topics: {
            where: { isActive: true },
            select: { slug: true },
          },
        },
      },
    },
  });

  return exams.map((exam) => ({
    slug: exam.slug,
    name: exam.name,
    description: exam.description,
    subjectCount: exam.subjects.length,
    topicCount: exam.subjects.reduce((n, s) => n + s.topics.length, 0),
    subjects: exam.subjects.map((s) => ({ slug: s.slug, name: s.name })),
  }));
};

// GET /api/public/exam-types/:examSlug — the syllabus page.
export const getPublicSyllabus = async (examSlug) => {
  const exam = await prisma.examType.findFirst({
    where: { slug: examSlug, isActive: true },
    select: {
      slug: true,
      name: true,
      description: true,
      subjects: {
        where: { isActive: true },
        orderBy: { orderIndex: "asc" },
        select: {
          slug: true,
          name: true,
          topics: {
            where: { isActive: true },
            orderBy: { orderIndex: "asc" },
            select: { slug: true, name: true },
          },
        },
      },
    },
  });
  if (!exam) throw new AppError("Page not found", 404);
  return exam;
};

// GET /api/public/exam-types/:examSlug/subjects/:subjectSlug
// Returns the subject, its chapter (topic) list with question counts, and the
// sibling subjects for cross-linking (internal link graph crawlers follow).
export const getPublicSubject = async (examSlug, subjectSlug) => {
  const exam = await prisma.examType.findFirst({
    where: { slug: examSlug, isActive: true },
    select: { slug: true, name: true, description: true },
  });
  if (!exam) throw new AppError("Page not found", 404);

  const [subject, siblings] = await Promise.all([
    prisma.subject.findFirst({
      where: { examType: { slug: examSlug }, slug: subjectSlug, isActive: true },
      select: {
        slug: true,
        name: true,
        topics: {
          where: { isActive: true },
          orderBy: { orderIndex: "asc" },
          select: {
            slug: true,
            name: true,
            _count: { select: { questions: true } },
          },
        },
      },
    }),
    prisma.subject.findMany({
      where: { examType: { slug: examSlug }, isActive: true },
      orderBy: { orderIndex: "asc" },
      select: { slug: true, name: true },
    }),
  ]);
  if (!subject) throw new AppError("Page not found", 404);

  return {
    exam,
    subject: {
      slug: subject.slug,
      name: subject.name,
      topics: subject.topics.map((t) => ({
        slug: t.slug,
        name: t.name,
        questionCount: t._count.questions,
      })),
    },
    siblings,
  };
};

// GET /api/public/exam-types/:examSlug/subjects/:subjectSlug/topics/:topicSlug
// The chapter page. Returns the full sibling topic list too — the frontend
// locates the current entry by slug and renders sibling links for crawl depth.
export const getPublicTopic = async (examSlug, subjectSlug, topicSlug) => {
  const exam = await prisma.examType.findFirst({
    where: { slug: examSlug, isActive: true },
    select: { slug: true, name: true },
  });
  if (!exam) throw new AppError("Page not found", 404);

  const subject = await prisma.subject.findFirst({
    where: { examType: { slug: examSlug }, slug: subjectSlug, isActive: true },
    select: { id: true, slug: true, name: true },
  });
  if (!subject) throw new AppError("Page not found", 404);

  const topics = await prisma.topic.findMany({
    where: { subjectId: subject.id, isActive: true },
    orderBy: { orderIndex: "asc" },
    select: {
      slug: true,
      name: true,
      _count: { select: { questions: true } },
    },
  });

  const current = topics.find((t) => t.slug === topicSlug);
  if (!current) throw new AppError("Page not found", 404);

  return {
    exam,
    subject: { slug: subject.slug, name: subject.name },
    current: {
      slug: current.slug,
      name: current.name,
      questionCount: current._count.questions,
    },
    siblings: topics.map((t) => ({ slug: t.slug, name: t.name })),
  };
};
