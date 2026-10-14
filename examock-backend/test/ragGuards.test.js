import test from "node:test";
import assert from "node:assert/strict";

import express from "express";

import {
  chatSchema,
  pdfFileFilter,
  requireFile,
  userKey,
  perUserLimiter,
} from "../src/modules/rag/rag.guards.js";
import { AppError } from "../src/utils/AppError.js";

// ── /chat body validation ────────────────────────────────────

test("chatSchema accepts a normal question and trims it", () => {
  const parsed = chatSchema.safeParse({ question: "  What is Ohm's law?  " });

  assert.equal(parsed.success, true);
  assert.equal(parsed.data.question, "What is Ohm's law?");
});

test("chatSchema rejects a missing question", () => {
  assert.equal(chatSchema.safeParse({}).success, false);
});

test("chatSchema rejects a whitespace-only question", () => {
  assert.equal(chatSchema.safeParse({ question: "   " }).success, false);
});

test("chatSchema rejects a question over the 2000-char cap", () => {
  assert.equal(chatSchema.safeParse({ question: "a".repeat(2001) }).success, false);
});

test("chatSchema accepts a question exactly at the cap", () => {
  assert.equal(chatSchema.safeParse({ question: "a".repeat(2000) }).success, true);
});

// ── /ingest upload guard ─────────────────────────────────────

const runFileFilter = (mimetype) => {
  let captured;
  pdfFileFilter({}, { mimetype }, (err, ok) => {
    captured = { err, ok };
  });
  return captured;
};

test("pdfFileFilter accepts application/pdf", () => {
  assert.deepEqual(runFileFilter("application/pdf"), { err: null, ok: true });
});

test("pdfFileFilter rejects any non-PDF type with a 400 AppError", () => {
  const { err, ok } = runFileFilter("image/png");

  assert.equal(ok, undefined);
  assert.ok(err instanceof AppError);
  assert.equal(err.statusCode, 400);
});

test("pdfFileFilter rejects a plain text file too", () => {
  const { err } = runFileFilter("text/plain");

  assert.ok(err instanceof AppError);
  assert.equal(err.statusCode, 400);
});

test("requireFile 400s when multer produced no file", () => {
  requireFile({}, {}, (err) => {
    assert.ok(err instanceof AppError);
    assert.equal(err.statusCode, 400);
  });
});

test("requireFile passes through when a file is present", () => {
  requireFile({ file: { path: "/tmp/notes.pdf" } }, {}, (err) => {
    assert.equal(err, undefined);
  });
});

// ── per-user cost cap ────────────────────────────────────────

test("userKey prefers the authenticated user id", () => {
  assert.equal(userKey({ user: { userId: "user-abc" }, ip: "1.2.3.4" }), "user-abc");
});

test("userKey falls back to an IP-based key for anonymous traffic", () => {
  const key = userKey({ ip: "1.2.3.4" });

  assert.equal(typeof key, "string");
  assert.ok(key.length > 0);
});

test("perUserLimiter returns 429 once the window budget is spent", async () => {
  const limiter = perUserLimiter({ windowMs: 60 * 1000, max: 2, message: "slow down" });

  const app = express();
  app.use((req, _res, next) => {
    req.user = { userId: "limiter-test-user" };
    next();
  });
  app.post("/x", limiter, (_req, res) => res.json({ ok: true }));

  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();

  try {
    const statuses = [];
    for (let i = 0; i < 3; i++) {
      const res = await fetch(`http://127.0.0.1:${port}/x`, { method: "POST" });
      statuses.push(res.status);
    }

    assert.deepEqual(statuses, [200, 200, 429]);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
