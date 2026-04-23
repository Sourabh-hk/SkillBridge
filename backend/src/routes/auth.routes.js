const express = require("express");
const { db } = require("../config/db");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

const VALID_ROLES = [
  "student",
  "trainer",
  "institution",
  "programme_manager",
  "monitoring_officer",
];

const INSTITUTION_SCOPED_ROLES = ["trainer"];

// GET /api/auth/institutions — public list for trainer onboarding
router.get("/institutions", async (_req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name
       FROM users
       WHERE role='institution' AND approval_status='approved'
       ORDER BY name ASC`
    );

    return res.json({ data: result.rows });
  } catch (err) {
    console.error("institutions list error:", err);
    return res.status(500).json({ msg: "Error fetching institutions" });
  }
});

/**
 * POST /api/auth/sync
 * Called by the frontend immediately after Clerk sign-up/sign-in to create
 * (or return) the user record in our database.
 *
 * Body: { role, institution_id? }
 * Auth: Clerk session token in Authorization header (handled by clerkMiddleware)
 */
router.post("/sync", async (req, res) => {
  try {
    let userId;

    if (process.env.NODE_ENV === "test") {
      // Test mode: caller passes clerk_user_id directly
      userId = req.headers["x-clerk-user-id"] || req.body.clerk_user_id;
      if (!userId) {
        return res.status(400).json({ msg: "clerk_user_id required in test mode" });
      }
    } else {
      const { getAuth } = require("@clerk/express");
      const auth = getAuth(req);
      userId = auth.userId;
      if (!userId) return res.status(401).json({ msg: "Unauthorized" });
    }

    const { role, institution_id, name, email } = req.body;

    if (!role || !VALID_ROLES.includes(role)) {
      return res.status(400).json({
        msg: `Valid signup role required: ${VALID_ROLES.join(", ")}`,
      });
    }

    // Return existing user if already synced
    const existing = await db.query(
      "SELECT id, clerk_user_id, name, email, role, institution_id, approval_status, created_at FROM users WHERE clerk_user_id=$1",
      [userId]
    );
    if (existing.rows.length > 0) {
      return res.json(existing.rows[0]);
    }

    // In production fetch user details from Clerk; in test use body values
    let userName = name;
    let userEmail = email;

    if (process.env.NODE_ENV !== "test") {
      const { createClerkClient } = require("@clerk/backend");
      const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
      const clerkUser = await clerk.users.getUser(userId);
      userEmail = clerkUser.emailAddresses[0]?.emailAddress || "";
      userName =
        `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() ||
        userEmail;
    }

    if (!userName || !userEmail) {
      return res.status(400).json({ msg: "name and email are required" });
    }

    let normalizedInstitutionId = institution_id || null;
    const approvalStatus = role === "student" ? "approved" : "pending";

    if (INSTITUTION_SCOPED_ROLES.includes(role)) {
      if (!normalizedInstitutionId) {
        return res.status(400).json({
          msg: `${role} must select an affiliated institution`,
        });
      }

      const institutionResult = await db.query(
        `SELECT id FROM users
         WHERE id=$1 AND role='institution' AND approval_status='approved'`,
        [normalizedInstitutionId]
      );

      if (institutionResult.rows.length === 0) {
        return res.status(400).json({
          msg: "Selected institution is invalid or not active",
        });
      }
    } else {
      normalizedInstitutionId = null;
    }

    const result = await db.query(
      `INSERT INTO users(clerk_user_id, name, email, role, institution_id, approval_status)
       VALUES($1,$2,$3,$4,$5,$6)
       RETURNING id, clerk_user_id, name, email, role, institution_id, approval_status, created_at`,
      [userId, userName, userEmail, role, normalizedInstitutionId, approvalStatus]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("sync error:", err);
    res.status(500).json({ msg: "Error syncing user" });
  }
});

/**
 * GET /api/auth/me
 * Returns the authenticated user's profile from our database.
 */
router.get("/me", verifyToken, (req, res) => {
  const {
    id,
    clerk_user_id,
    name,
    email,
    role,
    institution_id,
    approval_status,
    created_at,
  } = req.user;
  res.json({
    id,
    clerk_user_id,
    name,
    email,
    role,
    institution_id,
    approval_status,
    created_at,
  });
});

/**
 * POST /api/auth/provision
 * Provision users in hierarchy.
 * - programme_manager can provision any role.
 * - institution can provision trainer users only (auto-affiliated).
 */
router.post("/provision", verifyToken, async (req, res) => {
  try {
    const actor = req.user;
    const {
      clerk_user_id,
      name,
      email,
      role,
      institution_id,
      approval_status,
    } = req.body;

    if (!["institution", "programme_manager"].includes(actor.role)) {
      return res.status(403).json({ msg: "Forbidden: Access denied" });
    }

    if (!clerk_user_id || !name || !email || !role) {
      return res.status(400).json({ msg: "clerk_user_id, name, email and role are required" });
    }

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ msg: "Invalid role for provisioning" });
    }

    if (actor.role === "institution" && role !== "trainer") {
      return res.status(403).json({ msg: "Institution can provision trainers only" });
    }

    let normalizedInstitutionId = institution_id || null;
    let normalizedStatus = approval_status || "approved";

    if (!["pending", "approved", "rejected"].includes(normalizedStatus)) {
      return res.status(400).json({ msg: "Invalid approval_status" });
    }

    if (actor.role === "institution") {
      normalizedInstitutionId = actor.id;
      normalizedStatus = "approved";
    }

    if (role === "student") {
      normalizedInstitutionId = null;
      normalizedStatus = "approved";
    }

    if (role === "trainer") {
      if (!normalizedInstitutionId) {
        return res.status(400).json({ msg: "Trainer must have an institution_id" });
      }

      const institutionResult = await db.query(
        `SELECT id FROM users
         WHERE id=$1 AND role='institution' AND approval_status='approved'`,
        [normalizedInstitutionId]
      );
      if (institutionResult.rows.length === 0) {
        return res.status(400).json({ msg: "Invalid institution_id" });
      }
    } else {
      normalizedInstitutionId = null;
    }

    if (role === "institution" || role === "programme_manager" || role === "monitoring_officer") {
      normalizedStatus = "approved";
    }

    const result = await db.query(
      `INSERT INTO users(clerk_user_id, name, email, role, institution_id, approval_status)
       VALUES($1,$2,$3,$4,$5,$6)
       RETURNING id, clerk_user_id, name, email, role, institution_id, approval_status, created_at`,
      [clerk_user_id, name, email, role, normalizedInstitutionId, normalizedStatus]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ msg: "User already provisioned (duplicate clerk_user_id or email)" });
    }
    console.error("provision error:", err);
    return res.status(500).json({ msg: "Error provisioning user" });
  }
});

/**
 * GET /api/auth/requests
 * List pending approval requests the caller is authorized to process.
 * - institution: pending student/trainer requests for that institution
 * - programme_manager: pending institution/programme_manager/monitoring_officer requests
 */
router.get("/requests", verifyToken, async (req, res) => {
  try {
    const { role, id } = req.user;

    if (!["institution", "programme_manager"].includes(role)) {
      return res.status(403).json({ msg: "Forbidden: Access denied" });
    }

    let result;
    if (role === "institution") {
      result = await db.query(
        `SELECT u.id, u.name, u.email, u.role, u.institution_id, u.approval_status, u.created_at
         FROM users u
         WHERE u.role IN ('student','trainer')
           AND u.approval_status='pending'
           AND u.institution_id=$1
         ORDER BY u.created_at ASC`,
        [id]
      );
    } else {
      result = await db.query(
        `SELECT u.id, u.name, u.email, u.role, u.institution_id, u.approval_status, u.created_at
         FROM users u
         WHERE u.role IN ('institution','programme_manager','monitoring_officer')
           AND u.approval_status='pending'
         ORDER BY u.created_at ASC`
      );
    }

    return res.json({ data: result.rows });
  } catch (err) {
    console.error("requests list error:", err);
    return res.status(500).json({ msg: "Error fetching approval requests" });
  }
});

/**
 * POST /api/auth/requests/:id/approve
 * Approve a pending request according to hierarchy rules.
 */
router.post("/requests/:id/approve", verifyToken, async (req, res) => {
  try {
    const requesterId = req.params.id;
    const { role, id } = req.user;

    if (!["institution", "programme_manager"].includes(role)) {
      return res.status(403).json({ msg: "Forbidden: Access denied" });
    }

    const candidateResult = await db.query(
      `SELECT id, role, institution_id, approval_status
       FROM users
       WHERE id=$1`,
      [requesterId]
    );

    if (candidateResult.rows.length === 0) {
      return res.status(404).json({ msg: "Pending request not found" });
    }

    const candidate = candidateResult.rows[0];
    if (candidate.approval_status !== "pending") {
      return res.status(400).json({ msg: "Only pending requests can be approved" });
    }

    const institutionCanApprove =
      role === "institution" &&
      ["student", "trainer"].includes(candidate.role) &&
      candidate.institution_id === id;

    const programmeManagerCanApprove =
      role === "programme_manager" &&
      ["institution", "programme_manager", "monitoring_officer"].includes(candidate.role);

    if (!institutionCanApprove && !programmeManagerCanApprove) {
      return res.status(403).json({ msg: "You are not allowed to approve this request" });
    }

    const result = await db.query(
      `UPDATE users
       SET approval_status='approved'
       WHERE id=$1
       RETURNING id, name, email, role, institution_id, approval_status, created_at`,
      [requesterId]
    );

    return res.json({ msg: `${result.rows[0].role} approved`, user: result.rows[0] });
  } catch (err) {
    console.error("request approve error:", err);
    return res.status(500).json({ msg: "Error approving request" });
  }
});

/**
 * GET /api/auth/users
 * - institution: list trainers affiliated with this institution
 * - programme_manager / monitoring_officer: list all users
 */
router.get("/users", verifyToken, async (req, res) => {
  try {
    const { role, id } = req.user;
    const roleFilter = req.query.role;
    const statusFilter = req.query.approval_status;
    const search = req.query.q;

    if (!["institution", "programme_manager", "monitoring_officer"].includes(role)) {
      return res.status(403).json({ msg: "Forbidden: Access denied" });
    }

    const where = [];
    const params = [];

    if (role === "institution") {
      params.push(id);
      where.push(`u.role='trainer' AND u.institution_id=$${params.length}`);
    }

    if (roleFilter && VALID_ROLES.includes(roleFilter)) {
      params.push(roleFilter);
      where.push(`u.role=$${params.length}`);
    }

    if (statusFilter && ["pending", "approved", "rejected"].includes(statusFilter)) {
      params.push(statusFilter);
      where.push(`u.approval_status=$${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      where.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
    }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const result = await db.query(
      `SELECT u.id, u.name, u.email, u.role, u.institution_id, u.approval_status, u.created_at,
              inst.name AS institution_name
       FROM users u
       LEFT JOIN users inst ON inst.id = u.institution_id
       ${whereClause}
       ORDER BY u.created_at DESC`,
      params
    );

    return res.json({ data: result.rows });
  } catch (err) {
    console.error("users list error:", err);
    return res.status(500).json({ msg: "Error fetching users" });
  }
});

/**
 * POST /api/auth/users/:id/assign-role
 * Programme manager can assign elevated roles to existing users.
 */
router.post("/users/:id/assign-role", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "programme_manager") {
      return res.status(403).json({ msg: "Forbidden: Access denied" });
    }

    const targetUserId = Number(req.params.id);
    const { role, institution_id } = req.body;

    if (!targetUserId || Number.isNaN(targetUserId)) {
      return res.status(400).json({ msg: "Valid target user id required" });
    }

    if (!role || !VALID_ROLES.includes(role)) {
      return res.status(400).json({ msg: `Valid role required: ${VALID_ROLES.join(", ")}` });
    }

    let normalizedInstitutionId = institution_id || null;
    if (role === "trainer") {
      if (!normalizedInstitutionId) {
        return res.status(400).json({ msg: "Trainer must be affiliated with an institution" });
      }

      const institutionResult = await db.query(
        `SELECT id FROM users
         WHERE id=$1 AND role='institution' AND approval_status='approved'`,
        [normalizedInstitutionId]
      );

      if (institutionResult.rows.length === 0) {
        return res.status(400).json({ msg: "Invalid institution for trainer assignment" });
      }
    } else {
      normalizedInstitutionId = null;
    }

    const result = await db.query(
      `UPDATE users
       SET role=$1,
           institution_id=$2,
           approval_status='approved'
       WHERE id=$3
       RETURNING id, name, email, role, institution_id, approval_status, created_at`,
      [role, normalizedInstitutionId, targetUserId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ msg: "User not found" });
    }

    return res.json({ msg: "Role updated", user: result.rows[0] });
  } catch (err) {
    console.error("assign role error:", err);
    return res.status(500).json({ msg: "Error assigning role" });
  }
});

module.exports = router;