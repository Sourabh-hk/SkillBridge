/**
 * __tests__/api.test.js
 *
 * Integration tests for all SkillBridge API endpoints.
 *
 * Auth strategy: NODE_ENV=test → verifyToken reads X-Test-User-Id header
 * (internal DB id) instead of calling Clerk.  Users are created directly
 * in the DB via createTestUser() and cleaned up in afterAll.
 */

process.env.NODE_ENV = "test";
require("dotenv").config();

const request = require("supertest");
const app = require("../app");
const { db, createTestUser, cleanupTestData } = require("./setup");

// ── Test state ────────────────────────────────────────────────────────────────
let institution, manager, monitor, trainer, student;
let batchId, sessionId, inviteToken;
const allUserIds = [];

// ── Auth header helpers ───────────────────────────────────────────────────────
const asUser = (user) => ({ "X-Test-User-Id": String(user.id) });

// ── Setup / teardown ──────────────────────────────────────────────────────────

beforeAll(async () => {
  const ts = Date.now();

  institution = await createTestUser({
    role: "institution",
    name: "Test Institution",
    email: `institution_${ts}@test.dev`,
  });
  manager = await createTestUser({
    role: "programme_manager",
    name: "Test Manager",
    email: `manager_${ts}@test.dev`,
  });
  monitor = await createTestUser({
    role: "monitoring_officer",
    name: "Test Monitor",
    email: `monitor_${ts}@test.dev`,
  });
  trainer = await createTestUser({
    role: "trainer",
    name: "Test Trainer",
    email: `trainer_${ts}@test.dev`,
    institution_id: institution.id,
  });
  student = await createTestUser({
    role: "student",
    name: "Test Student",
    email: `student_${ts}@test.dev`,
  });

  allUserIds.push(institution.id, manager.id, monitor.id, trainer.id, student.id);
});

afterAll(async () => {
  await cleanupTestData(allUserIds);
  await db.end();
});

// ═════════════════════════════════════════════════════════════════════════════
// AUTH ROUTES
// ═════════════════════════════════════════════════════════════════════════════

describe("GET /api/auth/me", () => {
  test("returns user profile for authenticated user", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set(asUser(trainer));

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ role: "trainer", name: "Test Trainer" });
  });

  test("returns 401 when no auth header provided", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });
});

describe("POST /api/auth/sync", () => {
  test("creates a new user record in test mode", async () => {
    const ts = Date.now();
    const clerkId = `clerk_sync_test_${ts}`;
    const res = await request(app)
      .post("/api/auth/sync")
      .set("X-Clerk-User-Id", clerkId)
      .send({
        clerk_user_id: clerkId,
        role: "student",
        name: "Sync Student",
        email: `sync_${ts}@test.dev`,
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ role: "student" });

    // cleanup
    await db.query("DELETE FROM users WHERE clerk_user_id=$1", [clerkId]);
  });

  test("returns 400 for invalid role", async () => {
    const ts = Date.now();
    const clerkId = `clerk_invalid_${ts}`;
    const res = await request(app)
      .post("/api/auth/sync")
      .set("X-Clerk-User-Id", clerkId)
      .send({
        clerk_user_id: clerkId,
        role: "admin",
        name: "Bad Role",
        email: `bad_${ts}@test.dev`,
      });

    expect(res.status).toBe(400);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// BATCH ROUTES
// ═════════════════════════════════════════════════════════════════════════════

describe("POST /api/batches (create)", () => {
  test("institution can create a batch", async () => {
    const res = await request(app)
      .post("/api/batches")
      .set(asUser(institution))
      .send({ name: "Alpha Batch" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: "Alpha Batch" });
    batchId = res.body.id;
    allUserIds; // keep batchId for later tests
  });

  test("trainer can create a batch", async () => {
    const res = await request(app)
      .post("/api/batches")
      .set(asUser(trainer))
      .send({ name: "Trainer Batch" });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
  });

  test("student cannot create a batch (403)", async () => {
    const res = await request(app)
      .post("/api/batches")
      .set(asUser(student))
      .send({ name: "Bad Batch" });

    expect(res.status).toBe(403);
  });

  test("returns 400 when name is missing", async () => {
    const res = await request(app)
      .post("/api/batches")
      .set(asUser(institution))
      .send({});

    expect(res.status).toBe(400);
  });
});

describe("GET /api/batches", () => {
  test("institution sees its own batches", async () => {
    const res = await request(app)
      .get("/api/batches")
      .set(asUser(institution));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test("monitoring officer sees all batches", async () => {
    const res = await request(app)
      .get("/api/batches")
      .set(asUser(monitor));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("POST /api/batches/:id/invite", () => {
  test("institution can generate an invite link", async () => {
    const res = await request(app)
      .post(`/api/batches/${batchId}/invite`)
      .set(asUser(institution));

    expect(res.status).toBe(200);
    expect(res.body.invite_url).toContain("/join/");
    inviteToken = res.body.token;
  });

  test("student cannot generate an invite link (403)", async () => {
    const res = await request(app)
      .post(`/api/batches/${batchId}/invite`)
      .set(asUser(student));

    expect(res.status).toBe(403);
  });
});

describe("POST /api/batches/join-by-token", () => {
  test("student can join a batch using invite token", async () => {
    const res = await request(app)
      .post("/api/batches/join-by-token")
      .set(asUser(student))
      .send({ token: inviteToken });

    expect(res.status).toBe(200);
    expect(res.body.msg).toMatch(/joined/i);
  });

  test("returns 400 when token is missing", async () => {
    const res = await request(app)
      .post("/api/batches/join-by-token")
      .set(asUser(student))
      .send({});

    expect(res.status).toBe(400);
  });

  test("returns 404 for invalid token", async () => {
    const res = await request(app)
      .post("/api/batches/join-by-token")
      .set(asUser(student))
      .send({ token: "totally-invalid-token" });

    expect(res.status).toBe(404);
  });
});

describe("GET /api/batches/:id/summary", () => {
  test("institution can view batch summary", async () => {
    const res = await request(app)
      .get(`/api/batches/${batchId}/summary`)
      .set(asUser(institution));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("batch");
    expect(res.body).toHaveProperty("students");
  });

  test("student cannot view batch summary (403)", async () => {
    const res = await request(app)
      .get(`/api/batches/${batchId}/summary`)
      .set(asUser(student));

    expect(res.status).toBe(403);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// SESSION ROUTES
// ═════════════════════════════════════════════════════════════════════════════

describe("POST /api/sessions", () => {
  test("trainer can create a session", async () => {
    const res = await request(app)
      .post("/api/sessions")
      .set(asUser(trainer))
      .send({
        batch_id: batchId,
        title: "Intro to Node.js",
        date: "2026-05-01",
        start_time: "09:00",
        end_time: "11:00",
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ title: "Intro to Node.js" });
    sessionId = res.body.id;
  });

  test("student cannot create a session (403)", async () => {
    const res = await request(app)
      .post("/api/sessions")
      .set(asUser(student))
      .send({
        batch_id: batchId,
        title: "Bad Session",
        date: "2026-05-01",
        start_time: "09:00",
        end_time: "11:00",
      });

    expect(res.status).toBe(403);
  });

  test("returns 400 when required fields are missing", async () => {
    const res = await request(app)
      .post("/api/sessions")
      .set(asUser(trainer))
      .send({ batch_id: batchId, title: "Incomplete" });

    expect(res.status).toBe(400);
  });
});

describe("GET /api/sessions", () => {
  test("trainer sees their sessions", async () => {
    const res = await request(app)
      .get("/api/sessions")
      .set(asUser(trainer));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((s) => s.id === sessionId)).toBe(true);
  });

  test("student sees sessions for their batches", async () => {
    const res = await request(app)
      .get("/api/sessions")
      .set(asUser(student));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("GET /api/sessions/:id/attendance", () => {
  test("trainer can view session attendance", async () => {
    const res = await request(app)
      .get(`/api/sessions/${sessionId}/attendance`)
      .set(asUser(trainer));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("session");
    expect(res.body).toHaveProperty("attendance");
  });

  test("student cannot view session attendance (403)", async () => {
    const res = await request(app)
      .get(`/api/sessions/${sessionId}/attendance`)
      .set(asUser(student));

    expect(res.status).toBe(403);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// ATTENDANCE ROUTES
// ═════════════════════════════════════════════════════════════════════════════

describe("POST /api/attendance/mark", () => {
  test("student can mark attendance as present", async () => {
    const res = await request(app)
      .post("/api/attendance/mark")
      .set(asUser(student))
      .send({ session_id: sessionId, status: "present" });

    expect(res.status).toBe(200);
    expect(res.body.msg).toMatch(/marked/i);
  });

  test("student can update attendance (upsert to late)", async () => {
    const res = await request(app)
      .post("/api/attendance/mark")
      .set(asUser(student))
      .send({ session_id: sessionId, status: "late" });

    expect(res.status).toBe(200);
  });

  test("returns 400 for invalid status", async () => {
    const res = await request(app)
      .post("/api/attendance/mark")
      .set(asUser(student))
      .send({ session_id: sessionId, status: "skipped" });

    expect(res.status).toBe(400);
  });

  test("trainer cannot mark attendance (403)", async () => {
    const res = await request(app)
      .post("/api/attendance/mark")
      .set(asUser(trainer))
      .send({ session_id: sessionId, status: "present" });

    expect(res.status).toBe(403);
  });

  test("returns 400 when session_id is missing", async () => {
    const res = await request(app)
      .post("/api/attendance/mark")
      .set(asUser(student))
      .send({ status: "present" });

    expect(res.status).toBe(400);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// INSTITUTION ROUTES
// ═════════════════════════════════════════════════════════════════════════════

describe("GET /api/institutions/:id/summary", () => {
  test("institution can view its own summary", async () => {
    const res = await request(app)
      .get(`/api/institutions/${institution.id}/summary`)
      .set(asUser(institution));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("institution");
    expect(res.body).toHaveProperty("batches");
    expect(res.body).toHaveProperty("stats");
  });

  test("programme_manager can view institution summary", async () => {
    const res = await request(app)
      .get(`/api/institutions/${institution.id}/summary`)
      .set(asUser(manager));

    expect(res.status).toBe(200);
  });

  test("student cannot view institution summary (403)", async () => {
    const res = await request(app)
      .get(`/api/institutions/${institution.id}/summary`)
      .set(asUser(student));

    expect(res.status).toBe(403);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PROGRAMME ROUTES
// ═════════════════════════════════════════════════════════════════════════════

describe("GET /api/programme/summary", () => {
  test("programme_manager can view programme summary", async () => {
    const res = await request(app)
      .get("/api/programme/summary")
      .set(asUser(manager));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("stats");
    expect(res.body).toHaveProperty("institutions");
  });

  test("monitoring_officer can view programme summary (read-only)", async () => {
    const res = await request(app)
      .get("/api/programme/summary")
      .set(asUser(monitor));

    expect(res.status).toBe(200);
  });

  test("trainer cannot view programme summary (403)", async () => {
    const res = await request(app)
      .get("/api/programme/summary")
      .set(asUser(trainer));

    expect(res.status).toBe(403);
  });

  test("student cannot view programme summary (403)", async () => {
    const res = await request(app)
      .get("/api/programme/summary")
      .set(asUser(student));

    expect(res.status).toBe(403);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// ROLE ENFORCEMENT — exhaustive 401 checks (no auth header)
// ═════════════════════════════════════════════════════════════════════════════

describe("Unauthenticated requests return 401", () => {
  const protectedEndpoints = [
    ["GET", "/api/auth/me"],
    ["GET", "/api/batches"],
    ["POST", "/api/batches"],
    ["GET", "/api/sessions"],
    ["POST", "/api/sessions"],
    ["POST", "/api/attendance/mark"],
    ["GET", "/api/programme/summary"],
  ];

  protectedEndpoints.forEach(([method, path]) => {
    test(`${method} ${path} returns 401`, async () => {
      const res = await request(app)[method.toLowerCase()](path);
      expect(res.status).toBe(401);
    });
  });
});
