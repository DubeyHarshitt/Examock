# 📘 Examock Frontend Development Plan

> **Project:** Examock — Online Competitive Exam Preparation Platform
> **Brief source:** `Examock Brief.pdf` (Universe Ads India Pvt Ltd)
> **Scope:** Frontend (`examock-frontend/`) built against an existing, fully-functional backend (`examock-backend/`).
> **Status:** Current implementation review + phased build plan
>
> ### 🚧 Build Progress
> - ✅ **Phase 0 — Foundations: COMPLETE** (API fixes, types, shared UI, nav shell — see §7)
> - ✅ **Phase 1 — Student Core: COMPLETE** (dashboard, subjects, topics, videos, notes, channels — see §7)
> - ✅ **Phase 2 — Test Engine: COMPLETE** (test list, detail, engine, result — see §7)
> - 🟡 **Phase 3 — Progress, RAG & Payments:** mostly complete — Progress + RAG (chat/upload) built; **Razorpay payment gate deferred** (backend lacks `order/create` endpoints)
> - ✅ **Phase 4 — Admin completeness + polish: COMPLETE** (videos, channels, users, analytics, bulk questions, notifications — see §7)

---

## Table of Contents
1. [TL;DR / Where the project stands](#1-tldr)
2. [Project overview (from the brief)](#2-project-overview)
3. [Backend API surface (the contract to build against)](#3-backend-api-surface)
4. [Frontend current state — what's done vs. missing](#4-frontend-current-state)
5. [Critical issues to fix first](#5-critical-issues-to-fix-first)
6. [Recommended architecture / conventions](#6-recommended-architecture)
7. [Phased feature roadmap](#7-phased-feature-roadmap)
   - [Phase 0 — Foundations](#phase-0--foundations)
   - [Phase 1 — Student Core](#phase-1--student-core)
   - [Phase 2 — Test Engine](#phase-2--test-engine)
   - [Phase 3 — Progress, RAG & Payments](#phase-3--progress-rag--payments)
   - [Phase 4 — Admin completeness + polish](#phase-4--admin-completeness--polish)
8. [File-by-file build checklist](#8-file-by-file-build-checklist)
9. [Known backend gaps / prerequisites](#9-known-backend-gaps)

---

## 1. TL;DR

The **backend is complete** — every feature in the brief is backed by a working API (auth, exams, subjects, topics, videos, mock tests, questions, test-taking engine, notes/RAG, admin CRUD, analytics, notifications). The **frontend is ~95% complete** (only the Razorpay purchase flow is deferred, pending backend work):

- ✅ **Done:** Google login, onboarding wizard (exam selection + mobile OTP), the **complete admin suite** — content management (exam types, subjects, topics, questions, mock tests, notes) plus videos, YouTube channels, users, analytics, bulk question import, and notifications.
- ✅ **Done (student core):** The full student browsing experience — dashboard, subject/topic browsing, video playlists, notes viewer, YouTube channels page.
- ✅ **Done (test engine):** Test list, test detail, the full **test engine** (start/resume, countdown timer, navigation + palette, auto-save, mark-for-review, submit), and the result/review page.
- ✅ **Done (progress & RAG):** Progress overview + per-topic detail + study-planner widget, **AI doubt-solving chat** (with sources), and **RAG PDF upload**.
- 🟡 **Not built:** The **Razorpay purchase/payment flow is deferred** (backend has no `order/create` / verify endpoints yet); paid-test gating currently surfaces only the "purchase / upgrade" prompt.

This plan defines exactly what to build, in what order, and against which APIs.

---

## 2. Project Overview (from the brief)

Examock is a web app where students:
- Sign in with **Google (Gmail) OAuth**.
- On first login, **choose one exam type** (locks permanently, admin can reset) and **verify their mobile via OTP**.
- Watch **curated YouTube videos** mapped to syllabus topics of their exam.
- Attempt **chapter-wise (free) and full-syllabus mock tests** (first 3 free, ~22 paid via Razorpay).
- Track **chapter-wise progress**, get **AI suggestions** on weak areas, benchmark with **percentile**.
- Ask **AI doubt-solving questions** (chat) with optional PDF/image upload.

**Admin panel** (internal) manages videos, mock tests, users, analytics, payment records, and broadcasts updates/notifications.

---

## 3. Backend API Surface (the contract to build against)

All endpoints verified against the backend source. Base URL (frontend): `VITE_API_URL=http://localhost:3000/api`.

> ⚠️ **Convention split:** `auth.api.ts` & `admin.api.ts` use paths WITHOUT the `/api` prefix (`/auth/...`, `/admin/...`), while `student.api.ts`, `test.api.ts`, `rag.api.ts` use paths WITH `/api` (`/api/student/...`). Since the base URL already ends in `/api`, the latter group double-prefixes. **See [Critical Issue #3](#critical-issues-to-fix-first).**

### 3.1 Auth (`/api/auth`)
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/google` | — | Google login (idToken), sets refresh cookie, returns access token + onboarding state |
| GET | `/exam-types` | ✅ | List active exam types |
| POST | `/exam-type` | ✅ | Set exam type (locked after first set) |
| POST | `/otp/send` | ✅ | Send mobile OTP (rate-limited 5/10min) |
| POST | `/otp/verify` | ✅ | Verify OTP, rotate tokens |
| POST | `/refresh` | cookie | Silent token refresh (rotation + reuse detection) |
| POST | `/logout` | optional | Clear refresh cookie + DB hash |

### 3.2 Student (`/api/student`) — all require auth + onboarded
| Method | Path | Purpose |
|---|---|---|
| GET | `/dashboard` | Single home payload: exam type, subjects (topic counts), last 3 attempts, suggested weak topics, totals |
| GET | `/subjects` | Subjects w/ topic & note counts |
| GET | `/topics?subjectId=` | Topics + user progress per topic |
| GET | `/videos?topicId= OR ?subjectId=` | Videos (flat by topic / grouped by subject) |
| GET | `/notes` | Paginated notes for user's exam type (filter by subject/topic/isFree) |
| GET | `/notes/:id` | Single note + file download info |
| GET | `/yt-channels` | Recommended YouTube channels for exam type |
| GET | `/progress` | All topic progress grouped by subject |
| GET | `/progress/:topicId` | Topic progress + last 5 attempts |

### 3.3 Test (`/api/test`) — all require auth + onboarded (rate-limited 20/min)
| Method | Path | Purpose |
|---|---|---|
| GET | `/` | All active tests for user's exam type + `isPaid` flag |
| GET | `/:id` | Test detail + `hasAccess` (free/paid) |
| POST | `/:id/start` | Start or resume IN_PROGRESS attempt (returns `timeRemainingSec`) |
| GET | `/:id/question?attemptId=&index=` | Single question (no answer/explanation pre-submit) |
| POST | `/:id/answer` | Save/clear answer (per-option-select) |
| POST | `/:id/submit` | Submit & score (marks, neg marks, percentile, topic progress) |
| GET | `/:id/result?attemptId=` | Full result for a completed attempt |

### 3.4 RAG (`/api/rag`) — auth required
| Method | Path | Purpose |
|---|---|---|
| POST | `/ingest` | Student PDF upload → chunk + embed (Qdrant) |
| POST | `/chat` | Ask AI doubt question → Gemini answer + sources |

### 3.5 Admin (`/api/admin`) — auth + ADMIN role
| Resource | Endpoints |
|---|---|
| Exam Types | GET/POST `/exam-types`, PATCH/DELETE `/exam-types/:id` |
| Subjects | GET/POST `/subjects`, PATCH/DELETE `/subjects/:id` |
| Topics | GET/POST `/topics`, PATCH/DELETE `/topics/:id` |
| Questions | GET/POST `/questions`, POST `/questions/bulk`, PATCH/DELETE `/questions/:id` |
| Mock Tests | GET/POST `/mock-tests`, GET `/mock-tests/:id`, PATCH/DELETE `/mock-tests/:id`, POST `/:id/questions`, DELETE `/:id/questions/:qid`, PATCH `/:id/questions/reorder` |
| Videos | GET/POST `/videos`, PATCH/DELETE `/videos/:id` |
| YouTube Channels | GET/POST `/yt-channels`, PATCH/DELETE `/yt-channels/:id` |
| Notes | GET/POST `/notes` (multipart), PATCH/DELETE `/notes/:id`, GET `/notes/:id/download` |
| Users | GET `/users`, GET `/users/:id`, PATCH `/users/:id/reset-exam` |
| Analytics | GET `/analytics/overview`, GET `/analytics/tests`, GET `/analytics/payments` |
| Notifications | GET `/notifications`, POST `/notifications` |

---

## 4. Frontend Current State

### ✅ Fully built & functional
- **Auth:** Google login (LoginPage), session restore (`useInitAuth` + axios refresh-queue), route guards (ProtectedRoute/AdminRoute/OnboardingRoute), logout.
- **Onboarding:** 3-step wizard (exam type → mobile → OTP) with mutations & resend.
- **Admin suite — content management** (all wired to real APIs):
  - Exam Types CRUD (form + list)
  - Subjects CRUD (form + list + delete modal)
  - Topics CRUD (inline edit)
  - Question bank CRUD (QuestionForm) + **bulk import** (`POST /admin/questions/bulk`)
  - Mock Tests CRUD + `QuestionPicker` (add/remove/reorder), badges, counts
  - Notes upload/manage (drag-drop PDF, free/paid toggle, inline edit, pagination)
- **Admin suite — operations & analytics**:
  - Videos CRUD (Videos tab, topic-scoped)
  - YouTube channels CRUD (Channels toggle, exam-type-scoped)
  - Users panel (search + pagination + detail modal + reset exam type)
  - Analytics dashboard (overview KPIs, per-test bars, payments table w/ filters)
  - Notifications (broadcast form + sent list)

### 🟡 Partial / scaffolded
- **`test.store.ts`** — the test-engine client state (attemptId, answers map, currentIndex) is implemented **and consumed by the engine** (`TestEnginePage.tsx`).
- **API layer is largely complete** for all modules (auth, admin, student, test, rag).
- **`student.slice.ts`** — optional cache slice intentionally **not added**; server state is handled via React Query (`useStudentData`) instead.

### ✅ Student core — built & wired (Phase 1)
- **Dashboard** (`/`) — real dashboard via `useDashboard`: summary cards, quick links, recent attempts feed (score/percentile), suggested weak topics.
- **Subjects** (`/subjects`) — `GET /student/subjects` card grid.
- **Topics** (`/subjects/:subjectId/topics`) — `GET /student/topics?subjectId=` with per-topic progress bars.
- **Videos** (`/topics/:topicId/videos`) — embedded YouTube playlist + local "watched" toggle via progress.
- **Notes** (`/notes`) — paginated, filter by subject, free/paid states, open/download file.
- **Channels** (`/channels`) — recommended-channel grid + `YtSubscribeButton` (`g-ytsubscribe` widget).

### ✅ Test engine — built & wired (Phase 2)
- **Test list** (`/tests`) — `GET /test` with badges, free/paid status, duration/marks.
- **Test detail** (`/tests/:id`) — instructions, marks scheme, `hasAccess` gating + premium-purchase prompt.
- **Test engine** (`/tests/:id/take`) — JEE/NEET-style console: start/resume, countdown timer (auto-expire), question palette (answered/not-answered/not-visited/marked-for-review + legend), Save & Next / Clear / Mark for Review / Next-Prev / Submit-with-confirm, per-option auto-save, 410/403 handling.
- **Test result** (`/tests/:id/result`) — score, percentile, time taken, per-question review.

### ✅ Progress & RAG — built & wired (Phase 3)
- **Progress** (`/progress`) — `GET /student/progress` grouped by subject: summary cards, per-topic completion bars (color-coded), stats, and a client-side **Study Planner** widget with weak-area recommendations.
- **Topic progress** (`/progress/:topicId`) — `GET /student/progress/:topicId`: stats, quick actions (watch videos / take a test), last 5 attempts.
- **AI chat** (`/chat`) — chat UI with typing indicator, suggested prompts, and source-file chips; `POST /rag/chat`.
- **RAG upload** (`/upload`) — drag-drop PDF upload with progress + success state; `POST /rag/ingest`.
- RAG hooks added in `src/hooks/rag/useRag.ts` (React Query mutations).

### ❌ Deferred
- **Payments** (Razorpay) — backend has no `order/create` + verify endpoints; paid-test gating shows only a "purchase / upgrade" prompt for now. See §9.

---

## 5. Critical Issues to Fix First

Before (or while) building features, address these — they block correctness:

1. **~~Double `/api` prefix bug~~ ✅ FIXED** — `student.api.ts`, `test.api.ts`, `rag.api.ts` had `/api/...` hardcoded while Axios `baseURL` already ends in `/api` (would hit `.../api/api/...`). Prefix removed from all three.

2. **~~`VITE_GOOGLE_CLIENT_SECRET` in frontend `.env`~~ ✅ FIXED** — removed; only `VITE_GOOGLE_CLIENT_ID` (+ `VITE_API_URL`) remain. Secret is used server-side only.

3. **~~Backend logout bug~~ ✅ FIXED (backend)** — `auth.controller.js` now imports `logoutUser`.

4. **~~No `npm run dev` / start script in backend~~ ✅ FIXED** — added `dev` + `start` scripts.

5. **🟡 Form library unused** — `react-hook-form`, `@hookform/resolvers`, and `zod` are installed but every form uses manual `useState`. Decide the convention (recommend adopting RHF + zod for the many student forms to come, or keep manual for consistency — pick one and stay consistent).

6. **🟡 Type consistency** — Frontend has `types/auth.types.ts` + `store/admin/types/admin.types.ts` + `admin.store.types.ts`. No types exist yet for student/test/rag payloads. Add shared response types as you build pages.

---

## 6. Recommended Architecture / Conventions

Follow the existing patterns to stay consistent:

- **State:** Zustand for client state (auth, test engine). React Query (`@tanstack/react-query`) for server state/caching — already configured.
- **API layer:** one file per module under `src/api/`. Each funnels through the shared Axios instance (`axios.ts`) with auth interceptors. **Standardize on no `/api` prefix.**
- **Routing:** `react-router-dom` v7, nested route guards (`ProtectedRoute`, `AdminRoute`, `OnboardingRoute`) wrapping route groups in `App.tsx`. Add the commented-out routes as pages are built.
- **Styling:** Tailwind CSS v4, default palette (indigo primary, gray neutrals). Reuse existing UI patterns — `rounded-xl border border-gray-200 shadow-sm` cards, `bg-gray-100` page backgrounds, skeleton loading, lucide-react icons, confirm modals.
- **Stores:** admin slices already composed via `useAdminStore`. Add `users` + `analytics` slices there; add `student` slice(s) as needed.
- **Forms:** pick one convention (RHF+zod recommended for complexity) and apply consistently.
- **Types:** define DTO/response interfaces per module mirroring backend payloads.

---

## 7. Phased Feature Roadmap

Order is dependency-driven: fix foundations → core student browsing → test engine → analytics/RAG/payments → admin completeness + polish.

---

### Phase 0 — Foundations (✅ fixes + setup)
**Goal:** Make the app correct and prepared to add pages.

- ✅ Fix double `/api` prefix in `student.api.ts`, `test.api.ts`, `rag.api.ts`.
- ✅ Remove `VITE_GOOGLE_CLIENT_SECRET` + redirect URI from frontend `.env` (keep only `VITE_GOOGLE_CLIENT_ID`, `VITE_API_URL`). Added `.env.example`.
- ✅ Add shared response/view-model types: `src/types/student.types.ts`, `src/types/test.types.ts`, `src/types/rag.types.ts`, `src/types/admin.types.ts` (analytics + users).
- ✅ Add helper hooks:
  - `src/hooks/useExamTypes.ts` (exam-type query)
  - `src/hooks/student/useStudentData.ts` (dashboard, subjects, topics, videos, notes, channels, progress queries with stable query keys)
- ✅ Add shared UI components (`src/components/ui/`):
  - `Card`, `Badge`, `Button`, `Alert`, `Modal`, `ConfirmDialog`, `EmptyState`, `Skeleton`/`SkeletonCard`, `PageHeader`, form primitives (`Field`, `TextInput`, `TextArea`, `Select`), and a `ToastProvider` + `useToast()` system.
  - Barrel export via `src/components/ui/index.ts`, plus `src/utils/cn.ts` (clsx + tailwind-merge).
- ✅ Navigation shell: `src/components/layout/AppShell.tsx` — responsive top bar + mobile slide-over menu, role-aware nav links (student vs admin), user avatar, logout, admin/student view switch.
- ✅ Wired `ToastProvider` into `App.tsx`.
- 🟡 **Form approach decision:** Rather than force `react-hook-form` + `zod` adoption before any consumer page exists, Phase 0 ships **library-agnostic styled form primitives** (`Field`/`TextInput`/`TextArea`/`Select`) that work with either plain `useState` or RHF. When Phase 1/2 forms grow complex (esp. the on-boarding/test forms), adopt RHF + zod using these primitives. Keeping this lightweight now avoids risk and stays consistent with the existing admin forms.

**Exit criteria (met):** All API calls resolve (no double-prefix); app builds (`vite build`) and type-checks (`tsc`) cleanly; shared UI + nav shell available for all new pages; auth/onboarding unaffected.

---

### Phase 1 — Student Core (✅ COMPLETE)
**Goal:** The main content-surfacing experience. Backs dashboard, subjects, topics, videos, notes, channels.

#### 1A. Student Dashboard (`/`) — ✅ replace placeholder (real dashboard built)
Use `GET /api/student/dashboard`.
- Header with user info + exam type + logout; route admins to admin dash.
- **Summary cards:** exam type, subjects count, recent activity, suggested topics.
- **Quick links:** start a new test, view notes, view progress.
- **Recent attempts feed** (last 3 completed, with score/percentile).
- **Suggested weak topics** (from `suggestedTopics` — bestScore null/<50) linking to videos/tests.
- Mobile-first responsive layout.

#### 1B. Subjects & Topics browsing
- `/subjects` — `GET /student/subjects`: card grid of subjects (topic + note counts).
- `/subjects/:subjectId/topics` — `GET /student/topics?subjectId=`: topic list with per-topic progress bar, video count, question count; drill into videos.
- `/topics/:topicId/videos` — `GET /student/videos?topicId=`: embedded YouTube playlist for the topic (list of `{youtubeId, title, durationSec}`), "mark as watched" via progress.

#### 1C. Notes viewer
- `/notes` — `GET /student/notes` (filter by subject/topic/isFree, paginated): card/list of free/paid notes; **paid notes** show a locked state until paid access.
- Note detail opens/downloads the file using the returned `filePath` / `GET /notes/:id`.

#### 1D. YouTube channels page
- `/channels` — `GET /student/yt-channels`: grid of recommended channels (logo + name) with **YouTube Subscribe button** embed per channel (per the brief's channel-subscription UX).

**Exit criteria (met):** A student can browse their full syllabus: subjects → topics → videos, view notes, and see recommended channels, with real data from the backend.

---

### Phase 2 — Test Engine (✅ COMPLETE) (the core financial/engagement feature)

#### 2A. Test list & detail
- `/tests` — `GET /test`: list tests for the exam type with type badges (CHAPTER/MODULE/FULL), free/paid status, duration, marks, `isPaid`/`hasAccess`.
- `/tests/:id` — `GET /test/:id`: detail page with instructions, marks scheme, question count; **gate on `hasAccess`** — free → start; paid & not purchased → payment/upgrade prompt.

#### 2B. Test engine (`/tests/:id/take`) — the heart
Use `test.store.ts` (already implemented!) + `test.api.ts`.
- On mount: `POST /test/:id/start` (start or **resume** IN_PROGRESS attempt → `timeRemainingSec`).
- Countdown timer synced to server time; on expiry → 410 abandon → redirect to result / message.
- Question navigation palette (answered/unanswered/not-visited), next/prev, Mark for review.
- Per-option select → `POST /test/:id/answer` (auto-save, `{selectedOption}`), non-blocking.
- Fetch each question via `GET /test/:id/question?attemptId=&index=` (no answers leaked pre-submit).
- `POST /test/:id/submit` with confirm modal → navigate to result.
- Auto-abandon + confirmation dialogs for leaving mid-test.
- Mobile-responsive (bottom nav palette on small screens).

#### 2C. Result page (`/tests/:id/result`)
- `GET /test/:id/result?attemptId=`.
- Score, total marks, percentile, time taken, correct/incorrect/unattempted counts.
- Review each question (question + your answer + correct answer + explanation).
- Buttons: retry (if applicable), view suggestions based on weak areas.

**Exit criteria (met):** End-to-end test flow works — start/resume, timer, navigate, save answers, submit, view full review + percentile. The engine renders a JEE/NEET/CET-style console with palette, mark-for-review, auto-save, and 410/403 handling.

---

### Phase 3 — Progress, RAG (AI), & Payments (🟡 mostly complete)

#### 3A. Progress & study planner — ✅ done
- `/progress` — `GET /student/progress` grouped by subject: per-topic completion bars, best score, attempts, videos watched. (`ProgressPage.tsx`)
- `/progress/:topicId` — `GET /student/progress/:topicId`: topic detail + last 5 attempts + totals. (`TopicProgressPage.tsx`)
- **Study planner widget:** client-side heuristic combining weak-topic count, avg best score, and completion. ✅
- **AI suggestions:** surfaced via the study-planner recommendation + "Ask AI about these" link to chat. ✅

#### 3B. AI doubt-solving (RAG) — ✅ done
- `/chat` — `ChatPage.tsx`: chat UI (message list, input, typing indicator, suggested prompts), `POST /rag/chat`, shows `answer` + `sources` (file-name chips). Persistence is in-memory only (backend has no DoubtSession API — see §9).
- `/upload` — `UploadPage.tsx`: drag-drop `POST /rag/ingest` (PDF) with progress, success toast, "chat about it" entry point.

#### 3C. Payments (Razorpay) — ⏳ deferred
Backend models `Payment` but has **no order-create / verification webhook endpoints** (only `isPaid`/`hasAccess` checks). **Deferred by decision** — paid-test gating currently surfaces a "purchase / upgrade" prompt only. Needs backend work + `razorpay.checkout` integration later.

**Exit criteria (met, minus payments):** Weak-topic suggestions visible; AI chat answers from ingested docs; paid-test gating UI in place (purchase flow deferred pending backend).

---

### Phase 4 — Admin completeness + polish (✅ COMPLETE)

Complete the missing admin surfaces (APIs all exist):
1. ✅ **Videos panel** (admin Videos tab, topic-scoped CRUD) — `videos.slice.ts` wired to `getVideosApi/create/update/delete`, `VideosPanel.tsx`, added as a "Videos" tab in the admin dashboard.
2. ✅ **YouTube channels panel** (exam-type-scoped CRUD) — `ytChannels.slice.ts` + `YtChannelsPanel.tsx`, exposed via a "Channels" toggle on the admin dashboard.
3. ✅ **Users panel** (`/admin/users`) — `users.slice.ts` implemented; list w/ search + pagination, detail modal (progress/attempts/payments), reset exam type.
4. ✅ **Analytics dashboard** (`/admin/analytics`) — `analytics.slice.ts` implemented; overview cards (users, attempts, revenue, tests, questions), per-test analytics bars, payments table w/ pagination + status filter.
5. ✅ **Questions bulk-create UI** — collapsible "Bulk import" in `QuestionForm.tsx` using `POST /admin/questions/bulk` (pipe-delimited format with validation).
6. ✅ **Notifications** (`/admin/notifications`) — `notifications.slice.ts` + `NotificationsPanel.tsx`: broadcast form (title/body/examType) + list of sent broadcasts (DB-backed; real-time FCM remains a backend TODO).

Also wired: routes in `App.tsx` (`/admin/users`, `/admin/analytics`, `/admin/notifications`) behind `AdminRoute`, plus AppShell admin nav + dashboard quick links.

> **Note:** Analytics visualization uses lightweight CSS-based bars (no chart library added, per plan suggestion of Recharts — optional future add).

### Final polish (all phases)
- Responsive audit on mobile/tablet/desktop.
- Loading/empty/error states everywhere; Skeletons for data pages.
- Accessibility (labels, focus, ARIA on modals).
- Onboarding: add recommended-channel subscribe step + exam-date capture if desired.
- Dark/light or accent theming (optional).

**Exit criteria:** Admin can manage every resource the backend exposes; analytics & user management usable; whole app responsive.

---

## 8. File-by-File Build Checklist

### New student pages (`src/pages/`)
- [x] `dashboard/DashboardPage.tsx` — real dashboard (✅ replaced placeholder)
- [x] `subjects/SubjectListPage.tsx` `/subjects`
- [x] `subjects/TopicListPage.tsx` `/subjects/:subjectId/topics`
- [x] `videos/VideoPage.tsx` `/topics/:topicId/videos`
- [x] `tests/TestListPage.tsx` `/tests`
- [x] `tests/TestDetailPage.tsx` `/tests/:id`
- [x] `tests/TestEnginePage.tsx` `/tests/:id/take` ★ core (JEE/NEET/CET console)
- [x] `tests/TestResultPage.tsx` `/tests/:id/result`
- [x] `notes/NotesPage.tsx` `/notes`
- [x] `channels/ChannelsPage.tsx` `/channels` (+ `YtSubscribeButton` component)
- [x] `progress/ProgressPage.tsx` `/progress` (✅ + `TopicProgressPage.tsx` for `/progress/:topicId`)
- [x] `rag/ChatPage.tsx` `/chat`
- [x] `rag/UploadPage.tsx` `/upload`

### New admin pages (`src/pages/admin/`)
- [x] `VideosPanel.tsx` (added as a tab in adminDashboard)
- [x] `YtChannelsPanel.tsx`
- [x] `UsersPanel.tsx`
- [x] `AnalyticsPanel.tsx`
- [x] `NotificationsPanel.tsx`

### Store slices (`src/store/admin/slices/`)
- [x] `videos.slice.ts` (new)
- [x] `ytChannels.slice.ts` (new)
- [x] `users.slice.ts` (implemented)
- [x] `analytics.slice.ts` (implemented)
- [ ] optional `student.slice.ts` (progress/dashboard cache) — *not added; React Query caches server state via `useStudentData`.*

### Types (`src/types/`) & api (`src/api/`) (✅ Phase 0)
- [x] Add `student.types.ts`, `test.types.ts`, `rag.types.ts`, `admin.types.ts` (analytics/users)
- [x] Fix `student.api.ts` / `test.api.ts` / `rag.api.ts` `/api` prefixes
- [x] Remove `VITE_GOOGLE_CLIENT_SECRET` from `.env`; add `.env.example`
- helper hooks: `src/hooks/useExamTypes.ts`, `src/hooks/student/useStudentData.ts`

### Shared UI/components (✅ Phase 0 — built)
- [x] Nav shell / `src/components/layout/AppShell.tsx` (topbar + mobile slide-over, role-aware)
- [x] `PageHeader`, `Card`, `Badge`, `Alert`, `Button`, `Modal`, `ConfirmDialog`, `EmptyState`, `Skeleton`, `Toast`
- [x] Form primitives (`Field`, `TextInput`, `Select`, `TextArea`) via `src/components/ui/form/`
- [x] `src/utils/cn.ts` utility, `src/components/ui/index.ts` barrel
- [x] `ToastProvider` + `useToast()` wired into `App.tsx`
- [x] Test palette/navigation components in engine  *(✅ built in `TestEnginePage.tsx` — palette grid, legend, Save&Next / Clear / Mark-for-Review / Submit)*
- [x] Razorpay checkout modal  *(⏳ deferred — requires backend `order/create`)*

### Routing (`src/App.tsx`)
- [x] Uncomment & wire all student routes inside `ProtectedRoute` (dashboard, subjects, topics, videos, tests, test detail, take, result, notes, channels, **progress, progress/:topicId, chat, upload**) + `ErrorBoundary` wrapper around `<Routes>`
- [x] Add admin videos/channels/users/analytics/notifications routes

---

## 9. Known Backend Gaps / Prerequisites

These are needed for full feature parity; most are backend-side (out of scope for frontend but should be tracked):

1. **Razorpay flow missing** — backend has `Payment` model + `isPaid` checks but no order-create / verify-webhook endpoints. **Needed by Phase 3C.**
2. **~~`logoutUser` import bug~~ ✅ FIXED (backend)** — `auth.controller.js` now imports and calls `logoutUser` correctly.
3. **~~No `dev`/`start` script~~ ✅ FIXED (backend)** — `package.json` now has `dev: node --watch index.js` and `start: node index.js`.
4. **~~RAG infra (Qdrant + Gemini)~~ ✅ VERIFIED OPERATIONAL** — the RAG chat/upload path now works end-to-end:
   - `QDRANT_URL` pointed at the working cloud cluster (`e346d947-...sa-east-1-0.aws.cloud.qdrant.io`); collection `study_docs` auto-created.
   - **Payload indexes** created on `userId` + `examTypeId` — required for filtered searches under Qdrant strict mode (otherwise chat errors "Index required but not found"). Backend `ensureCollection()` now creates these automatically.
   - **Gemini model** updated `gemini-2.5-flash → gemini-3.6-flash` (2.5-flash is 404 for new users) in `retrieval.pipeline.js`; embedding model `gemini-embedding-001` (3072-dim, matches collection) confirmed working.
5. **DoubtSession has no API** — model exists but no endpoint for chat history persistence (RAG chat is stateless `POST /rag/chat`).
6. **Notifications are DB-only** — no FCM/WebSocket push (backend TODO). Admin UI can persist; live push needs backend work.
7. **Note ingestion** is PDF-only (other file types marked FAILED) — acceptable per brief (content is PDF study material).
8. **Backend note**: `OPENAI_API_KEY`/`langchain`/`fast-check` appear unused — clean up later.

---

## 10. Suggested Work Order (summary)

1. **Phase 0** — fix API prefixes, env security, types, shared UI/shell. ✅ *COMPLETE*
2. **Phase 1** — dashboard, subjects/topics/videos, notes viewer, channels page. ✅ *COMPLETE*
3. **Phase 2** — test list/detail, **test engine** (reuse `test.store.ts`), result/review. ✅ *COMPLETE*
4. **Phase 3** — progress + planner + AI suggestions, RAG chat + upload, Razorpay gating. 🟡 *Progress + RAG done; Razorpay deferred (backend dep)*
5. **Phase 4** — admin videos/channels/users/analytics/bulk-questions/notifications + responsive polish. ✅ *COMPLETE*

**Status:** Phases 0, 1, 2, 4 complete; **Phase 3** progress + RAG complete — only the **Razorpay purchase flow** is deferred (pending backend `order/create` + verify endpoints).
