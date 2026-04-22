# SkillBridge — Attendance Management System

A full-stack attendance management system for a fictional state-level skilling programme.

---

## Live URLs

| Service  | URL |
|----------|-----|
| Frontend | _(deploy to Vercel — set `VITE_API_URL` env var)_ |
| Backend  | _(deploy to Railway/Render — set `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`)_ |

---

## Test Accounts (create via /signup)

| Role               | Email example               |
|--------------------|-----------------------------|
| Student            | student@test.com            |
| Trainer            | trainer@test.com            |
| Institution        | institution@test.com        |
| Programme Manager  | pm@test.com                 |
| Monitoring Officer | monitor@test.com            |

---

## Local Setup

### Prerequisites
- Node.js 18+
- PostgreSQL database (Neon recommended)

### 1. Database

Run `backend/schema.sql` in your PostgreSQL console (Neon dashboard → SQL editor).

### 2. Backend

```bash
cd backend
cp .env.example .env
# Fill in DATABASE_URL, JWT_SECRET, FRONTEND_URL in .env
npm install
npm run dev
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env
# Set VITE_API_URL=http://localhost:5000/api
npm install
npm run dev
```

Frontend runs on http://localhost:5173, backend on http://localhost:5000.

---

## Schema Decisions

- `users` table holds all roles with a `role` column — single table for simplicity, avoids joins across role tables.
- `institution_id` on `users` is nullable; only `trainer`/`student` would reference an institution.
- `invite_token` on `batches` is a random hex string — no expiry for simplicity (improvement opportunity).
- `attendance` has a `UNIQUE(session_id, student_id)` constraint so marking is idempotent (upsert).
- All FK relationships cascade on delete to avoid orphaned rows.

---

## Stack

| Layer    | Choice  | Notes |
|----------|---------|-------|
| Frontend | React + Vite | Minimal, functional UI |
| Backend  | Node.js + Express | REST API, CommonJS |
| Database | PostgreSQL (Neon) | Hosted, serverless-friendly |
| Auth     | JWT (bcrypt + jsonwebtoken) | Custom auth, no Clerk |
| Routing  | react-router-dom v6 | Client-side routing |

**Auth note:** Used JWT + bcrypt instead of Clerk. This keeps the backend self-contained without a third-party service dependency, and satisfies all role-validation requirements server-side.

---

## What's Complete

- [x] All 5 roles: signup, login, role-based dashboard
- [x] Backend role enforcement (403 on unauthorized access)
- [x] JWT authentication with Bearer tokens
- [x] Batch creation (trainer/institution)
- [x] Invite link generation (trainer)
- [x] Student join via invite token
- [x] Session creation (trainer)
- [x] Attendance marking with upsert (student)
- [x] Session attendance view (trainer/institution/monitoring officer)
- [x] Batch summary with per-student stats (institution)
- [x] Institution summary (institution/programme manager)
- [x] Programme-wide summary (programme manager/monitoring officer)
- [x] Monitoring officer: read-only, no create/edit actions
- [x] PostgreSQL schema with proper constraints

## What's Incomplete / Known Gaps

- [ ] Invite links don't expire (no expiry timestamp)
- [ ] No pagination on large datasets
- [ ] No input sanitization beyond basic validation
- [ ] `institution_id` linking for trainers/students is manual (no auto-assign)
- [ ] No email verification

---

## One Improvement I'd Make

Add invite link expiry with a `invite_expires_at` column on `batches`, and invalidate tokens after 48 hours. Currently tokens are permanent, which is a minor security risk in a real deployment.
