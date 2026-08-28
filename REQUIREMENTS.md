# 📋 Examock — Project Requirements Document

> **Project:** Examock — Online Competitive Exam Preparation Platform
> **Brief source:** `Examock Brief.pdf` (Universe Ads India Pvt Ltd)
> **Tech stack:** React (Vite) frontend + Node.js/Express backend, Prisma ORM, Zustand, React Query, Tailwind CSS v4
> **Purpose:** This document defines the complete set of functional, non-functional, and feature requirements for the Examock platform. Use it as the single source of truth for what the product must do.

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [User Roles](#2-user-roles)
3. [Functional Requirements — Authentication & Onboarding](#3-authentication--onboarding)
4. [Functional Requirements — Student Features](#4-student-features)
5. [Functional Requirements — Test Engine](#5-test-engine)
6. [Functional Requirements — Progress & Analytics](#6-progress--analytics)
7. [Functional Requirements — AI / RAG (Doubt Solving)](#7-ai--rag-doubt-solving)
8. [Functional Requirements — Payments (Razorpay)](#8-payments-razorpay)
9. [Functional Requirements — Admin Panel](#9-admin-panel)
10. [Business Rules](#10-business-rules)
11. [Non-Functional Requirements](#11-non-functional-requirements)
12. [Data Models (Backend)](#12-data-models-backend)
13. [Integration Dependencies / External Services](#13-integration-dependencies)
14. [Acceptance Criteria Matrix](#14-acceptance-criteria-matrix)
15. [Out of Scope / Known Gaps](#15-out-of-scope--known-gaps)

---

## 1. Product Overview

Examock is a web-based competitive exam preparation platform where students:

- Sign in with **Google (Gmail) OAuth**.
- On first login, **choose one exam type** (locks permanently; admin can reset) and **verify their mobile number via OTP**.
- Watch **curated YouTube videos** mapped to syllabus topics of their chosen exam.
- Attempt **chapter-wise (free) and full-syllabus mock tests** (first 3 free, ~22 paid via Razorpay).
- Track **chapter-wise progress**, get **AI suggestions** on weak areas, and benchmark with **percentile**.
- Ask **AI doubt-solving questions** (chat) with optional PDF/image upload.

The platform has a full **admin panel** (internal) to manage videos, mock tests, users, analytics, payment records, and broadcast notifications.

---

## 2. User Roles

| Role | Description | Access |
|---|---|---|
| **Student** | Primary end-user; browses content, takes tests, tracks progress | Web app (student area) |
| **Admin** | Internal staff managing content, users, analytics, payments, notifications, and exam-type resets | Web app (admin area) |

---

## 3. Authentication & Onboarding

### 3.1 Google Login (Student & Admin)
- **FR-001** — User must be able to sign in with their Google (Gmail) account via a popup (no redirects).
- **FR-002** — The backend must verify the Google `idToken` (`verifyIdToken`) before trusting it. Invalid, tampered, or expired tokens must be rejected (400).
- **FR-003** — On success, the backend issues an **access token** (JWT, 15 min) and a **refresh token** (JWT, 7 days in an `httpOnly` cookie).
- **FR-004** — Access tokens must be stored in `localStorage`; refresh tokens stored in `httpOnly` cookie (XSS-safe).
- **FR-005** — Silent token refresh must work automatically on access-token expiry (refresh-queue; rotation + reuse detection).
- **FR-006** — Logout must clear the refresh cookie and invalidate the DB hash.
- **FR-007** — Session must be restored on page reload (`useInitAuth` + axios interceptors).

### 3.2 Onboarding Wizard
- **FR-008** — A new student must complete a 3-step onboarding: **Exam type selection** → **Mobile number entry** → **OTP verification**.
- **FR-009** — Exam type locks permanently after selection (until an admin resets it).
- **FR-010** — Mobile OTP must be sent via MSG91 and verified. Rate-limit OTP sends (5 per 10 minutes).
- **FR-011** — OTP resend must be supported.
- **FR-012** — The app must route the user to the correct onboarding/exam/mobile step based on onboarding flags returned by the backend.

### 3.3 Route Guards / Roles
- **FR-013** — `ProtectedRoute`, `AdminRoute`, and `OnboardingRoute` guards must protect routes based on auth state and role.
- **FR-014** — Students must not access admin routes; admins must not access student content management.

---

## 4. Student Features

### 4.1 Dashboard
- **FR-015** — Display an overview: user info, exam type, summary cards (subjects, activity, suggested topics).
- **FR-016** — Show the **last 3 completed attempts** with score/percentile.
- **FR-017** — Show **suggested weak topics** (best score null/<50) with links to videos/tests.
- **FR-018** — Provide quick links: start a test, view notes, view progress.

### 4.2 Subjects & Topics Browsing
- **FR-019** — List subjects (card grid) with topic + note counts.
- **FR-020** — List topics per subject with per-topic **progress bars**, video count, and question count.
- **FR-021** — Provide drill-down from subject → topics → videos/tests.

### 4.3 Videos
- **FR-022** — Display curated YouTube videos per topic (list of `{youtubeId, title, durationSec}`).
- **FR-023** — Embed the YouTube player for playback.
- **FR-024** — Allow marking a video as **watched** (persisted via progress).

### 4.4 Notes (Study Material)
- **FR-025** — List study notes filtered by subject/topic, with free/paid states, paginated.
- **FR-026** — Support opening/downloading note files via `GET /notes/:id` and the returned `filePath`.
- **FR-027** — **Paid notes** must show a locked state until the student has access.

### 4.5 YouTube Channels
- **FR-028** — Show a grid of recommended YouTube channels for the exam type (logo + name).
- **FR-029** — Embed a **YouTube Subscribe button** per channel.

### 4.6 Channels (Site Communication)
- **FR-030** — Provide a student-facing channels page in the nav (per existing student nav links: Dashboard/Subjects/Mock Tests/Notes/Channels/Progress/Ask AI).

---

## 5. Test Engine

### 5.1 Test List & Detail
- **FR-031** — List all tests for the student's exam type with badges (CHAPTER / MODULE / FULL), duration, marks, and free/paid status.
- **FR-032** — Show a test detail page with instructions, marks scheme, and question count.
- **FR-033** — **Gate access on `hasAccess`:** free → start button; paid & not purchased → payment/upgrade prompt.

### 5.2 The Test Console (JEE/NEET/CET-style)
- **FR-034** — Start a test via `POST /test/:id/start`; support **resuming** an `IN_PROGRESS` attempt with remaining time.
- **FR-035** — Provide a **countdown timer** synced to server `timeRemainingSec`.
- **FR-036** — On timer expiry (410), abandon and redirect to result/message.
- **FR-037** — Question **navigation palette** with four states: **Answered / Not Answered / Not Visited / Marked-for-Review**, each color-coded, with a legend.
- **FR-038** — Buttons: **Save & Next**, **Clear**, **Mark for Review**, **Next/Prev**, and **Submit** (with confirmation).
- **FR-039** — Per-option select auto-saves via `POST /test/:id/answer` (non-blocking).
- **FR-040** — Fetch each question via `GET /test/:id/question?attemptId=&index=`; no answers/explanation leaked pre-submit.
- **FR-041** — Marks scheme: questions have positive `marks` and `negMarks`; negative marking applied.
- **FR-042** — Handle **403 (not purchased)** and **410 (time expired)** gracefully.
- **FR-043** — Mobile-responsive with a bottom palette on small screens.
- **FR-044** — Confirmation dialogs for leaving mid-test.

### 5.3 Result & Review
- **FR-045** — Fetch a completed attempt's full result via `GET /test/:id/result?attemptId=`.
- **FR-046** — Display score, total marks, **percentile**, time taken, correct/incorrect/unattempted counts.
- **FR-047** — Allow reviewing each question (question + your answer + correct answer + explanation).
- **FR-048** — Provide retry option and suggestions based on weak areas.

---

## 6. Progress & Analytics

### 6.1 Student Progress
- **FR-049** — Student progress must be grouped by subject (`GET /student/progress`).
- **FR-050** — Per-topic completion bars, best score, attempt count, and videos-watched count.
- **FR-051** — A topic detail view (`GET /student/progress/:topicId`) with stats, quick actions, and the **last 5 attempts** (`percentile`, `timeTakenSec`, `completedAt`).
- **FR-052** — A **Study Planner** widget (client-side heuristic combining weak topics, avg best score, and completion) with AI suggestions.
- **FR-053** — Provide an "Ask AI about these" link from weak-topic recommendations to the AI chat.

### 6.2 Admin Analytics
- **FR-054** — Admin analytics dashboard with overview KPIs (users, attempts, revenue, tests, questions).
- **FR-055** — Per-test analytics bars.
- **FR-056** — Payments table with pagination and status filter.

---

## 7. AI / RAG (Doubt Solving)

### 7.1 AI Chat
- **FR-057** — Provide a chat interface for students to ask AI doubt-solving questions (`POST /rag/chat`).
- **FR-058** — Show a typing indicator, suggested prompts, and **source-file chips** (file names from retrieved context).
- **FR-059** — The answer is generated from the student's uploaded study material + admin-shared notes for their exam type.
- **FR-060** — Auto-scroll as the conversation grows.

### 7.2 Material Upload
- **FR-061** — Allow students to upload study material (PDF, ≤ 25 MB) via drag-drop (`POST /rag/ingest`).
- **FR-062** — Show upload progress and a success state; surface the number of chunks stored.
- **FR-063** — Provide a "chat about it" entry point after upload.

### 7.3 RAG Pipeline (Backend)
- **FR-064** — Ingestion: parse PDF → chunk text → embed with `gemini-embedding-001` (3072-dim) → store in Qdrant `study_docs` collection.
- **FR-065** — Retrieval: embed query → filtered similarity search (by `userId` for own docs OR `examTypeId` for admin-shared notes) → return top-K.
- **FR-066** — Generation: build a prompt from retrieved context and generate the final answer via Gemini (`gemini-3.6-flash`).
- **FR-067** — Payload indexes on `userId` + `examTypeId` must exist (Qdrant strict mode) or filtered search breaks.
- **FR-068** — Fail gracefully in the UI when chat/upload errors, without crashing.

---

## 8. Payments (Razorpay)

- **FR-069** — **Free tests:** first 3 full mock tests free; chapter-wise tests free.
- **FR-070** — **Paid tests:** ~22 full-syllabus mock tests require purchase via Razorpay.
- **FR-071** — Paid tests gate on `hasAccess`/`isPaid`; unpurchased tests show a **purchase/upgrade prompt**.
- **FR-072** — *(Deferred — backend gap)* A Razorpay checkout modal to create an order, complete payment, and verify the webhook before granting `hasAccess`. Requires backend `order/create` + verify-webhook endpoints.
- **FR-073** — The backend `Payment` model records payment status; `isPaid`/`hasAccess` checks control test access.

---

## 9. Admin Panel

### 9.1 Content Management
- **FR-074** — **Exam Types** CRUD.
- **FR-075** — **Subjects** CRUD.
- **FR-076** — **Topics** CRUD.
- **FR-077** — **Questions** CRUD + **bulk import** (`POST /admin/questions/bulk`, pipe-delimited format with validation).
- **FR-078** — **Mock Tests** CRUD + question picker (add/remove/reorder), badges, counts.
- **FR-079** — **Videos** CRUD (topic-scoped).
- **FR-080** — **YouTube Channels** CRUD (exam-type-scoped).
- **FR-081** — **Notes** upload/manage (drag-drop PDF, free/paid toggle, inline edit, pagination).

### 9.2 Operations & Users
- **FR-082** — **Users** panel: search + pagination + detail modal (progress/attempts/payments) + **reset exam type**.
- **FR-083** — Analytics dashboard (see §6.2).
- **FR-084** — **Notifications**: broadcast form (title/body/exam-type) + list of sent broadcasts (DB-backed).

### 9.3 Admin Navigation
- **FR-085** — Role-aware navigation shell with admin/student view switch; admin routes behind `AdminRoute`.

---

## 10. Business Rules

| Rule ID | Rule |
|---|---|
| **BR-001** | One exam type per student, set once, locked permanently (admin can reset). |
| **BR-002** | Mobile OTP required before full access; OTP send rate-limited (5/10 min). |
| **BR-003** | First 3 mock tests are free; the rest are paid (Razorpay). Chapter-wise tests are free. |
| **BR-004** | Test attempts persist: start or resume `IN_PROGRESS`; answers auto-saved. |
| **BR-005** | Negative marking applied per question (`negMarks`). |
| **BR-006** | Timer expiry abandons the attempt (410). |
| **BR-007** | Uploaded PDFs must be ≤ 25 MB and PDF format only. |
| **BR-008** | Progress updates after test submission (score, attempts, percentile, videos watched). |
| **BR-009** | Admin-shared notes are visible to all students of that exam type; student uploads are private to that student. |
| **BR-010** | Payments and refunds recorded; `isPaid` gates access. |

---

## 11. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Performance** | Test engine must not block UI on answer auto-save (non-blocking requests). Skeleton loaders for data pages. |
| **Reliability** | Graceful error/empty/loading states on every page; error boundary around routes. |
| **Security** | Google idToken verified server-side; tokens JWT; refresh in `httpOnly` cookie; secrets only in backend `.env` (no client-side secret). |
| **Responsiveness** | Mobile-first responsive on mobile/tablet/desktop; adaptive test palette on small screens. |
| **Accessibility** | Labels, focus states, ARIA on modals/buttons. |
| **Build quality** | `tsc` type-checks and `vite build` pass cleanly for the frontend. |
| **State management** | Zustand for client state; React Query for server state/caching. |
| **API contract** | Consistent API handling; no duplicate `/api` prefix in frontend paths. |

---

## 12. Data Models (Backend)

Core entities managed by the platform (Prisma models):

- **User** — gmailId, email, name, avatar, mobile, role (STUDENT/ADMIN), examTypeId.
- **ExamType** — name, description, active.
- **Subject** — name, examTypeId.
- **Topic** — name, subjectId, syllabus order.
- **Video** — title, youtubeId, durationSec, topicId.
- **MockTest** — title, type (CHAPTER/MODULE/FULL), topicId, marks, duration, isPaid.
- **Question** — text, optionA–D, correctOption, marks, negMarks, difficulty, testId, index.
- **Attempt** — user, test, status (IN_PROGRESS/SUBMITTED/EXPIRED), timeRemainingSec, score, percentile.
- **AttemptAnswer** — attemptId, questionId, selectedOption.
- **Note** — title, filePath, subjectId, topicId, isFree, examTypeId.
- **YouTubeChannel** — name, logo, url, examTypeId.
- **Progress** — user, topic, bestScore, attemptCount, videosWatched.
- **Payment** — user, mockTest, amount, status, gatewayRef.
- **DoubtSession** — (model exists; chat persistence API is a backend gap).
- **Notification** — title, body, examTypeId, createdAt.

---

## 13. Integration Dependencies / External Services

| Service | Purpose | Where Configured |
|---|---|---|
| **Google OAuth** | Login (idToken verification) | Backend `.env` (`GOOGLE_CLIENT_ID/SECRET`) + frontend `VITE_GOOGLE_CLIENT_ID` |
| **MSG91** | Mobile OTP SMS | Backend `.env` (`MSG91_TEMPLATE_ID`, `MSG91_SENDER_ID`, `MSG91_AUTH_KEY`) |
| **Qdrant Cloud** | Vector database for RAG | Backend `.env` (`QDRANT_URL`, `QDRANT_API_KEY`); collection `study_docs` |
| **Gemini (Google AI)** | Embeddings (`gemini-embedding-001`) + answer generation (`gemini-3.6-flash`) | Backend `.env` (`GEMINI_API_KEY`) |
| **Razorpay** | Payments (deferred) | Backend `.env` + frontend checkout |
| **YouTube (embed)** | Video playback + subscribe buttons | Frontend embed widgets |

---

## 14. Acceptance Criteria Matrix

| # | Feature | Acceptance Criteria |
|---|---|---|
| AC-01 | Google Login | User signs in via Google popup, lands on dashboard or onboarding. |
| AC-02 | Onboarding | New user selects exam type + verifies mobile OTP; locked exam type. |
| AC-03 | Dashboard | Shows summary, last 3 attempts, suggested weak topics, quick links. |
| AC-04 | Browse | Subject → topics → videos, notes, channels all show real backend data. |
| AC-05 | Test List | Lists tests with badges, duration, marks, free/paid status. |
| AC-06 | Access Gating | Free tests start; paid & unpurchased show purchase prompt (403 handled). |
| AC-07 | Test Engine | Start/resume, timer countdown, palette states, auto-save, mark-for-review, submit, expiry. |
| AC-08 | Result | Score, percentile, time, counts, per-question review, retry. |
| AC-09 | Progress | Subject-grouped progress, topic detail, last 5 attempts, study planner widget. |
| AC-10 | AI Chat | Ask question → answer + source chips; typing indicator; graceful failure. |
| AC-11 | Upload | Drag-drop PDF → progress → success + chunk count; chat entry point. |
| AC-12 | Admin CRUD | Manage all content types end-to-end. |
| AC-13 | Admin Ops | Users (search/reset-exam), analytics KPIs, notifications broadcast. |
| AC-14 | Build | `tsc` + `vite build` clean; responsive on all breakpoints. |
| AC-15 | Payments *(deferred)* | Purchase flow completes, webhook verifies, access granted. |

---

## 15. Out of Scope / Known Gaps

These items are tracked but not yet implemented (mostly backend-dependent):

1. **Razorpay payment flow** — backend lacks `order/create` + verify-webhook endpoints. Payment gate deferred.
2. **DoubtSession persistence** — no API for chat-history persistence (RAG chat is stateless).
3. **Live notifications push** — FCM/WebSocket not implemented (DB-backed notifications only).
4. **Note ingestion** — PDF-only (other file types marked FAILED); acceptable per the brief.
5. **Recommended-channel onboarding step** — optional future addition (subscribe step + exam-date capture).
6. **Dark/light theme** — optional future polish.
7. **Backend cleanup** — `OPENAI_API_KEY`/`langchain`/`fast-check` appear unused in the backend; clean up later.

---

> **Document status requirements:** This requirements document is authoritative for scope. Feature/business-rule changes should be reflected here before implementation. Mark items ✅ when complete and add a date/version note at the top as the project evolves.
