const { db } = require("../config/db");

/**
 * verifyToken — resolves the authenticated user and attaches them to req.user.
 *
 * In test mode (NODE_ENV=test): reads X-Test-User-Id header and looks up the
 * user by internal DB id (no Clerk involved — allows unit/integration testing).
 *
 * In production: reads the Clerk session token from the Authorization header
 * (set by clerkMiddleware in app.js), fetches the userId, then looks up the
 * matching user row in our DB by clerk_user_id.
 */
const verifyToken = async (req, res, next) => {
  try {
    if (process.env.NODE_ENV === "test") {
      const testUserId = req.headers["x-test-user-id"];
      if (!testUserId) {
        return res.status(401).json({ msg: "No test user ID provided" });
      }
      const result = await db.query("SELECT * FROM users WHERE id=$1", [testUserId]);
      if (result.rows.length === 0) {
        return res.status(401).json({ msg: "Test user not found" });
      }
      req.user = result.rows[0];
      return next();
    }

    // Production — Clerk
    const { getAuth } = require("@clerk/express");
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ msg: "Unauthorized" });
    }

    const result = await db.query(
      "SELECT * FROM users WHERE clerk_user_id=$1",
      [userId]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({
        msg: "User not synced. Call POST /api/auth/sync after signing up.",
      });
    }
    req.user = result.rows[0];

    // Only approved accounts can access protected resources.
    // Keep /api/auth/me and approval-management endpoints available so clients
    // can poll status and approvers can process requests.
    const isAuthIntrospectionRoute =
      req.baseUrl === "/api/auth" &&
      (req.path === "/me" || req.path.startsWith("/requests"));

    if (!isAuthIntrospectionRoute && req.user.approval_status !== "approved") {
      return res.status(403).json({
        msg: `Account ${req.user.approval_status}. Access will be enabled once approved.`,
      });
    }

    next();
  } catch (err) {
    console.error("verifyToken error:", err);
    return res.status(401).json({ msg: "Authentication failed" });
  }
};

// Role-based access control
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ msg: "Forbidden: Access denied" });
    }
    next();
  };
};

module.exports = { verifyToken, authorize };
