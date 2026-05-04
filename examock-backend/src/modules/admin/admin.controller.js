import * as adminService from "./admin.service.js";
import { AppError } from "../../utils/AppError.js";


const handle = (fn) => async (req, res, next) => {
  try {
    const result = await fn(req, res);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// ── Exam Types ───────────────────────────────────────────────
export const listExamTypes    = handle(() => adminService.getAllExamTypes());
export const createExamType   = handle((req) => adminService.createExamType(req.body));
export const updateExamType   = handle((req) => adminService.updateExamType(req.params.id, req.body));
export const deleteExamType   = handle((req) => adminService.deleteExamType(req.params.id));

// ── Subjects ─────────────────────────────────────────────────
export const listSubjects     = handle((req) => adminService.getSubjects(req.query.examTypeId));
export const createSubject    = handle((req) => adminService.createSubject(req.body));
export const updateSubject    = handle((req) => adminService.updateSubject(req.params.id, req.body));
export const deleteSubject    = handle((req) => adminService.deleteSubject(req.params.id));

// ── Topics ───────────────────────────────────────────────────
export const listTopics       = handle((req) => adminService.getTopics(req.query.subjectId));
export const createTopic      = handle((req) => adminService.createTopic(req.body));
export const updateTopic      = handle((req) => adminService.updateTopic(req.params.id, req.body));
export const deleteTopic      = handle((req) => adminService.deleteTopic(req.params.id));

// ── Videos ───────────────────────────────────────────────────
export const listVideos       = handle((req) => adminService.getVideos(req.query.topicId));
export const createVideo      = handle((req) => adminService.createVideo(req.body));
export const updateVideo      = handle((req) => adminService.updateVideo(req.params.id, req.body));
export const deleteVideo      = handle((req) => adminService.deleteVideo(req.params.id));

// ── YT Channels ──────────────────────────────────────────────
export const listYtChannels   = handle((req) => adminService.getYtChannels(req.query.examTypeId));
export const createYtChannel  = handle((req) => adminService.createYtChannel(req.body));
export const updateYtChannel  = handle((req) => adminService.updateYtChannel(req.params.id, req.body));
export const deleteYtChannel  = handle((req) => adminService.deleteYtChannel(req.params.id));

// ── Questions ────────────────────────────────────────────────
export const listQuestions       = handle((req) => adminService.getQuestions(req.query));
export const createQuestion      = handle((req) => adminService.createQuestion(req.body));
export const bulkCreateQuestions = handle((req) => adminService.bulkCreateQuestions(req.body.questions));
export const updateQuestion      = handle((req) => adminService.updateQuestion(req.params.id, req.body));
export const deleteQuestion      = handle((req) => adminService.deleteQuestion(req.params.id));

// ── Mock Tests ───────────────────────────────────────────────
export const listMockTests    = handle((req) => adminService.getMockTests(req.query));
export const createMockTest   = handle((req) => adminService.createMockTest(req.body));
export const updateMockTest   = handle((req) => adminService.updateMockTest(req.params.id, req.body));
export const deleteMockTest   = handle((req) => adminService.deleteMockTest(req.params.id));

export const addQuestionToTest     = handle((req) => adminService.addQuestionToTest(req.params.id, req.body.questionId, req.body.orderIndex));
export const removeQuestionFromTest = handle((req) => adminService.removeQuestionFromTest(req.params.id, req.params.qid));
export const reorderTestQuestions  = handle((req) => adminService.reorderTestQuestions(req.params.id, req.body.questions));

// ── Notes ────────────────────────────────────────────────────
export const listNotes  = handle((req) => adminService.getNotes(req.query));

export const createNote = async (req, res, next) => {
  try {
    if (!req.file) throw new AppError("File is required", 400);

    const result = await notesService.createNote({
      ...req.body,
      filePath:   req.file.path,
      fileName:   req.file.originalname,
      fileType:   req.body.fileType?.toUpperCase(),
      uploadedBy: req.user.userId, 
    });

    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const updateNote = handle((req) => adminService.updateNote(req.params.id, req.body));
export const deleteNote = handle((req) => adminService.deleteNote(req.params.id));

// ── Users ────────────────────────────────────────────────────
export const listUsers         = handle((req) => adminService.getUsers(req.query));
export const getUserDetail     = handle((req) => adminService.getUserDetail(req.params.id));
export const resetUserExamType = handle((req) => adminService.resetUserExamType(req.params.id));

// ── Analytics ────────────────────────────────────────────────
export const getOverview      = handle(() => adminService.getOverview());
export const getTestAnalytics = handle(() => adminService.getTestAnalytics());
export const getPaymentRecords = handle((req) => adminService.getPaymentRecords(req.query));

// ── Notifications ────────────────────────────────────────────
export const listNotifications    = handle(() => adminService.getNotifications());
export const broadcastNotification = handle((req) => adminService.broadcastNotification(req.body));