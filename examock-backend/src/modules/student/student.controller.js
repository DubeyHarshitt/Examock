import * as studentService from "./student.service.js";

const handle = (fn) => async (req, res, next) => {
  try {
    const result = await fn(req);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const getDashboard = handle((req) =>
  studentService.getDashboard(req.user.userId),
);
export const getSubjects = handle((req) =>
  studentService.getSubjects(req.user.userId),
);
export const getTopics = handle((req) =>
  studentService.getTopics(req.user.userId, req.query.subjectId),
);
export const getVideos = handle((req) => studentService.getVideos(req.query));
export const getNotes = handle((req) =>
  studentService.getNotes(req.user.userId, req.query),
);
export const getNoteById = handle((req) =>
  studentService.getNoteById(req.params.id),
);
export const getYtChannels = handle((req) =>
  studentService.getYtChannels(req.user.userId),
);
export const getProgress = handle((req) =>
  studentService.getProgress(req.user.userId),
);
export const getTopicProgress = handle((req) =>
  studentService.getTopicProgress(req.user.userId, req.params.topicId),
);
