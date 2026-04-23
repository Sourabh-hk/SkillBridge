# SkillBridge — Attendance Management System

A full-stack attendance management system for a fictional state-level skilling programme, built as a take-home assessment. Five user roles (Student, Trainer, Institution, Programme Manager, Monitoring Officer) each have distinct dashboards backed by server-side role enforcement.

---

## Live URLs

| Service  | URL |
|----------|-----|
| Frontend | [https://skill-bridge-mocha-theta.vercel.app/](https://skill-bridge-mocha-theta.vercel.app/) |
| Backend  | [https://skillbridge-production-6f33.up.railway.app/](https://skillbridge-production-6f33.up.railway.app/)|
| API base | [https://skillbridge-production-6f33.up.railway.app/api](https://skillbridge-production-6f33.up.railway.app/api) |

---

## Test Accounts

> Create these in Clerk first, then sign in and complete onboarding to pick a role. The Programme Manager account must be approved (bootstrapped via the provision endpoint or seeded directly) before it can approve other pending accounts.

| Role               | Email                        | Password          | Notes |
|--------------------|------------------------------|-------------------|-------|
| Student            | student@skillbridge.dev      | SkillBridge@123 | Auto-approved on signup |
| Trainer            | trainer@skillbridge.dev      | SkillBridge@123 | Approved by Institution |
| Institution        | institution@skillbridge.dev  | SkillBridge@123 | Approved by Programme Manager |
| Programme Manager  | manager@skillbridge.dev      | SkillBridge@123 | Auto-approved by seed script |
| Monitoring Officer | monitor@skillbridge.dev      | SkillBridge@123 | Approved by Programme Manager |

---

## Approval Workflow

Every role except Student starts as `pending` and cannot access protected endpoints until approved by the appropriate authority.

| Role               | Who approves                    |
|--------------------|---------------------------------|
| Student            | Auto-approved on signup         |
| Trainer            | Institution the trainer selected at signup |
| Institution        | Programme Manager               |
| Programme Manager  | An existing approved Programme Manager |
| Monitoring Officer | Programme Manager               |

**Demo order:** Provision / bootstrap one approved Programme Manager first → approve pending Institution accounts → Institution approves pending Trainer accounts → Students join via invite links.

Programme Managers can also provision accounts directly (requires Clerk user ID) and reassign existing users to a different role.

---

## Local Setup

### Prerequisites

- Node.js 18+
- A Clerk application (free tier at [clerk.com](https://clerk.com)) — provides `CLERK_SECRET_KEY` and `VITE_CLERK_PUBLISHABLE_KEY`
- A PostgreSQL database (Neon free tier at [neon.tech](https://neon.tech) recommended)

### 1. Database

Option A — migrate script (drops and recreates all tables, use on a fresh DB):

```bash
cd backend
cp .env.example .env
# Fill in DATABASE_URL in .env first
npm install
node scripts/migrate.js
```

Option B — run `backend/schema.sql` manually in your PostgreSQL console (Neon dashboard → SQL editor or `psql`).

### 2. Backend

```bash
cd backend
cp .env.example .env
```

Fill in `.env`:

```
DATABASE_URL=postgresql://<user>:<password>@<host>/<db>?sslmode=require
CLERK_SECRET_KEY=sk_test_...
FRONTEND_URL=http://localhost:5173
PORT=5000
```

```bash
npm install
npm run dev        # nodemon — restarts on file change
# or
npm start          # node src/server.js
```

### 3. Seed (optional but recommended)

Creates one Clerk account per role, syncs them to the DB, seeds a sample batch, and links the trainer and student to it. Uses the credentials in the Test Accounts table above.

```bash
cd backend
npm run seed       # node scripts/seed.js
```

> Requires `CLERK_SECRET_KEY` and `DATABASE_URL` in `.env`. Safe to re-run — uses upserts and skips existing records.

Backend runs on `http://localhost:5000`. Health check: `GET /` returns `{ "msg": "SkillBridge API is running" }`.

### 3. Frontend

```bash
cd frontend
cp .env.example .env
```

Fill in `.env`:

```
VITE_API_URL=http://localhost:5000/api
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

```bash
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

### 4. Running Tests

```bash
cd backend
npm test           # Jest + Supertest, runs in-band against the real DB
```

Tests use a `NODE_ENV=test` bypass: instead of Clerk JWTs, an `X-Test-User-Id` header carries the internal DB user ID. All test data is created and torn down within the test run.

---

## API Endpoints

All endpoints (except `GET /api/auth/institutions`) require a Clerk session token in the `Authorization: Bearer <token>` header. Role mismatches return `403 Forbidden`.

| Method | Path | Allowed roles |
|--------|------|---------------|
| `GET`  | `/api/auth/institutions` | Public |
| `POST` | `/api/auth/sync` | Authenticated Clerk user (post-signup) |
| `GET`  | `/api/auth/me` | Any authenticated user |
| `GET`  | `/api/auth/requests` | Institution, Programme Manager |
| `POST` | `/api/auth/requests/:id/approve` | Institution, Programme Manager |
| `GET`  | `/api/auth/users` | Institution, Programme Manager, Monitoring Officer |
| `POST` | `/api/auth/provision` | Institution, Programme Manager |
| `POST` | `/api/auth/users/:id/assign-role` | Programme Manager |
| `POST` | `/api/batches` | Trainer, Institution |
| `GET`  | `/api/batches` | Any (role-scoped results) |
| `POST` | `/api/batches/:id/invite` | Trainer, Institution |
| `POST` | `/api/batches/:id/join` | Student |
| `POST` | `/api/batches/join-by-token` | Student |
| `GET`  | `/api/batches/:id/summary` | Institution, Programme Manager, Monitoring Officer |
| `POST` | `/api/sessions` | Trainer |
| `GET`  | `/api/sessions` | Any (role-scoped results) |
| `GET`  | `/api/sessions/:id/attendance` | Trainer, Institution, Programme Manager, Monitoring Officer |
| `POST` | `/api/attendance/mark` | Student |
| `GET`  | `/api/institutions/:id/summary` | Institution, Programme Manager, Monitoring Officer |
| `GET`  | `/api/programme/summary` | Programme Manager, Monitoring Officer |

Paginated endpoints accept `?page=1&limit=10` query parameters and return `{ data, total, page, limit, totalPages }`.

---

## Schema Decisions

**Single `users` table for all roles.** A `role` column (`student | trainer | institution | programme_manager | monitoring_officer`) and an `approval_status` column (`pending | approved | rejected`) live on every row. This avoids role-specific tables and keeps queries simple — the trade-off is that institution-level fields are nullable for non-institution rows.

**`institution_id` on `users` is nullable.** Trainers carry the ID of their affiliated institution; Students and programme-level roles leave it `NULL`. This is checked at signup time for trainer accounts.

**`batch_trainers` and `batch_students` are explicit join tables.** A batch can have multiple trainers. A student joins a batch via an invite token; the join is recorded in `batch_students`.

**`invite_token` on `batches` is a 32-character random hex string** (`crypto.randomBytes(16)`). There is no expiry — one token per batch, regenerated on demand. This is noted as a known gap.

**`attendance` has `UNIQUE(session_id, student_id)`.** Marking is an upsert (`INSERT ... ON CONFLICT DO UPDATE`), so re-submitting a status overwrites the previous one rather than erroring.

**Cascade deletes on all FK constraints.** Deleting a batch removes its sessions, attendance records, and join-table rows. Deleting a session removes its attendance records.

**DATE and TIME columns are returned as plain strings.** The `pg` type parser is configured to return `DATE` as `"YYYY-MM-DD"` and `TIME` as `"HH:MM:SS"` to avoid the UTC-midnight conversion that JavaScript's `Date` object applies to date-only values. Session time-window logic (active / upcoming / ended) runs in the browser using the local clock.

---

## Stack

| Layer    | Choice | Why |
|----------|--------|-----|
| Frontend | React 19 + Vite | Fast dev server, native ESM, smallest config surface |
| UI       | Tailwind CSS + Radix UI (shadcn/ui components) | Accessible primitives with utility-first styling |
| Routing  | react-router-dom v7 | Stable, well-known client-side routing |
| Auth (frontend) | `@clerk/clerk-react` | Handles Clerk session, `useUser`, `getToken` |
| Backend  | Node.js + Express 5 | Lightweight REST, familiar CommonJS; Express 5 for async error propagation |
| Auth (backend) | `@clerk/express` + `@clerk/backend` | `clerkMiddleware` validates the JWT; `createClerkClient` fetches user metadata |
| Database | PostgreSQL via `pg` (Pool) | Relational model fits the entity relationships; hosted on Neon for zero-ops |
| Testing  | Jest + Supertest | Integration tests against the real DB using a test-mode auth bypass |

Clerk was chosen over a custom JWT + bcrypt implementation because it handles session management, token refresh, and email verification out of the box. The backend still performs its own role check on every request — Clerk only provides identity, not authorisation.

---

## What's Working

- All five roles: Clerk signup → role selection → approval workflow → role-specific dashboard
- Server-side role enforcement on every protected endpoint (403 on mismatch)
- Batch creation by Trainer and Institution
- Invite link generation (random token, copyable URL)
- Student join via token (paste in dashboard or open `/join/:token` directly)
- Session creation with title, date, start time, end time, batch
- Attendance marking by Student (present / absent / late) with upsert; locked outside active session window
- Session attendance view (Trainer, Institution, Monitoring Officer)
- Batch summary with per-student present/absent/late counts (Institution)
- Institution summary: stats, trainer list, batch list (Institution, Programme Manager)
- Programme-wide summary: aggregate stats + per-institution breakdown (Programme Manager, Monitoring Officer)
- Approval queue for pending accounts visible to Institution and Programme Manager
- User provisioning and role reassignment by Programme Manager
- Monitoring Officer: read-only — no create, edit, or delete actions anywhere in the UI
- Pagination on all list endpoints (batches, sessions, attendance, institutions)
- Integration test suite covering all major endpoints

## What's Incomplete / Known Gaps

- Invite tokens never expire — no `invite_expires_at` column; a permanent token is a minor security issue in production
- No rate limiting or input sanitisation beyond basic required-field checks
- Attendance marking has no server-side time-window enforcement — the active/upcoming/ended UI logic runs in the browser; a backdated session could be exploited via direct API call
- No email verification step in the auth flow
- No automated approval notification (email or in-app) when a pending account is approved

---

## One Thing I'd Do Differently

Add server-side time-window enforcement on `POST /attendance/mark`. Currently, whether a session is "active" is determined by the frontend comparing the browser clock to the session's `date + start_time / end_time`. A student could bypass this by calling the API directly. The fix is a single DB check in the attendance route: compare `NOW()` (adjusted for timezone) against the session window before allowing the upsert.
