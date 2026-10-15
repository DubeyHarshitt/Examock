// src/modules/events/events.controller.js
import { AppError } from "../../utils/AppError.js";
import * as eventsService from "./events.service.js";

const handle = (fn) => async (req, res, next) => {
  try {
    const result = await fn(req);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// POST /api/events — public (optional auth). A logged-in caller gets its
// userId attached; anonymous traffic is recorded with a sessionId only.
export const track = handle(async (req) => {
  const parsed = eventsService.parseBatch(req.body);
  if (parsed.error === "unknown_event") throw new AppError("Unknown event name", 400);
  if (parsed.error) throw new AppError("Invalid events payload", 400);

  const userId = req.user?.userId ?? null;
  const { recorded } = await eventsService.recordEvents({ userId, events: parsed.events });
  return { success: true, recorded };
});

// GET /api/events/summary — admin only. Reads the funnel without raw SQL.
export const summary = handle(async (req) => {
  const { since, until } = eventsService.resolveRange(req.query);
  return eventsService.summarizeEvents({ since, until });
});
