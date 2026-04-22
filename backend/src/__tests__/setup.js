/**
 * __tests__/setup.js
 *
 * Shared test helpers: DB connection, user creation, cleanup.
 * All tests run with NODE_ENV=test so Clerk auth is bypassed
 * in favour of the X-Test-User-Id header.
 */

process.env.NODE_ENV = "test";
require("dotenv").config();

const { Pool } = require("pg");

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

let approvalColumnEnsured = false;

async function ensureApprovalColumn() {
  if (approvalColumnEnsured) return;
  await db.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20)
    CHECK (approval_status IN ('pending', 'approved', 'rejected'))
  `);
  await db.query("UPDATE users SET approval_status='approved' WHERE approval_status IS NULL");
  await db.query("ALTER TABLE users ALTER COLUMN approval_status SET DEFAULT 'pending'");
  await db.query("ALTER TABLE users ALTER COLUMN approval_status SET NOT NULL");
  approvalColumnEnsured = true;
}

/**
 * Insert a bare user row directly into the DB (no Clerk involved).
 * Returns the full row including `id`.
 */
async function createTestUser({ role, name, email, institution_id = null, approval_status = "approved" }) {
  await ensureApprovalColumn();
  const clerkId = `test_clerk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const result = await db.query(
    `INSERT INTO users(clerk_user_id, name, email, role, institution_id, approval_status)
     VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
    [clerkId, name, email, role, institution_id, approval_status]
  );
  return result.rows[0];
}

/**
 * Remove all rows in reverse-dependency order.
 * Called in afterAll to leave the DB clean.
 */
async function cleanupTestData(userIds = []) {
  if (!userIds.length) return;
  // Clean up attendance, sessions, batch memberships, batches, users
  await db.query(
    `DELETE FROM attendance
     WHERE student_id = ANY($1::int[]) OR session_id IN (
       SELECT id FROM sessions WHERE trainer_id = ANY($1::int[]) OR batch_id IN (
         SELECT id FROM batches WHERE institution_id = ANY($1::int[])
       )
     )`,
    [userIds]
  );
  await db.query(
    "DELETE FROM sessions WHERE trainer_id = ANY($1::int[]) OR batch_id IN (SELECT id FROM batches WHERE institution_id = ANY($1::int[]))",
    [userIds]
  );
  await db.query("DELETE FROM batch_students WHERE student_id = ANY($1::int[])", [userIds]);
  await db.query("DELETE FROM batch_trainers WHERE trainer_id = ANY($1::int[])", [userIds]);
  await db.query(
    "DELETE FROM batches WHERE institution_id = ANY($1::int[])",
    [userIds]
  );
  await db.query("DELETE FROM users WHERE id = ANY($1::int[])", [userIds]);
}

module.exports = { db, createTestUser, cleanupTestData };
