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
      return res.status(400).json({ msg: `Valid role required: ${VALID_ROLES.join(", ")}` });
    }

    // Return existing user if already synced
    const existing = await db.query(
      "SELECT id, clerk_user_id, name, email, role, institution_id, created_at FROM users WHERE clerk_user_id=$1",
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

    const result = await db.query(
      `INSERT INTO users(clerk_user_id, name, email, role, institution_id)
       VALUES($1,$2,$3,$4,$5)
       RETURNING id, clerk_user_id, name, email, role, institution_id, created_at`,
      [userId, userName, userEmail, role, institution_id || null]
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
  const { id, clerk_user_id, name, email, role, institution_id, created_at } = req.user;
  res.json({ id, clerk_user_id, name, email, role, institution_id, created_at });
});

module.exports = router;