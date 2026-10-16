// src/modules/public/public.controller.js — thin wrappers for the public SEO
// read API (ticket 24). Same handle() shape as events.controller.js.
import * as service from "./public.service.js";

const handle = (fn) => async (req, res, next) => {
  try {
    res.json(await fn(req));
  } catch (err) {
    next(err);
  }
};

export const listExamTypes = handle(() => service.listPublicExamTypes());

export const getSyllabus = handle((req) =>
  service.getPublicSyllabus(req.params.examSlug),
);

export const getSubject = handle((req) =>
  service.getPublicSubject(req.params.examSlug, req.params.subjectSlug),
);

export const getTopic = handle((req) =>
  service.getPublicTopic(
    req.params.examSlug,
    req.params.subjectSlug,
    req.params.topicSlug,
  ),
);
