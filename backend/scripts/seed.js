/**
 * scripts/seed.js
 *
 * Creates one test user per role in Clerk, then syncs each to the local
 * database.  Also seeds a sample batch so Trainer/Student flows work
 * immediately out of the box.
 *
 * Usage:
 *   node scripts/seed.js
 *
 * Requires a valid .env with CLERK_SECRET_KEY and DATABASE_URL.
 */

require("dotenv").config();
const { createClerkClient } = require("@clerk/backend");
const { Pool } = require("pg");

// ── Clerk client ────────────────────────────────────────────────────────────
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

// ── DB client ───────────────────────────────────────────────────────────────
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ── Seed data ────────────────────────────────────────────────────────────────
const SEED_USERS = [
  {
    firstName: "SkillBridge",
    lastName: "Institution",
    email: "institution@skillbridge.dev",
    password: "SkillBridge@123",
    role: "institution",
  },
  {
    firstName: "SkillBridge",
    lastName: "Manager",
    email: "manager@skillbridge.dev",
    password: "SkillBridge@123",
    role: "programme_manager",
  },
  {
    firstName: "SkillBridge",
    lastName: "Monitor",
    email: "monitor@skillbridge.dev",
    password: "SkillBridge@123",
    role: "monitoring_officer",
  },
  {
    firstName: "SkillBridge",
    lastName: "Trainer",
    email: "trainer@skillbridge.dev",
    password: "SkillBridge@123",
    role: "trainer",
  },
  {
    firstName: "SkillBridge",
    lastName: "Student",
    email: "student@skillbridge.dev",
    password: "SkillBridge@123",
    role: "student",
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getOrCreateClerkUser(u) {
  // Check by email first
  const list = await clerk.users.getUserList({ emailAddress: [u.email] });
  if (list.data && list.data.length > 0) {
    console.log(`  → Clerk user already exists: ${u.email} (${list.data[0].id})`);
    return list.data[0];
  }

  const created = await clerk.users.createUser({
    firstName: u.firstName,
    lastName: u.lastName,
    emailAddress: [u.email],
    password: u.password,
    publicMetadata: { role: u.role },
    skipPasswordChecks: false,
  });
  console.log(`  → Created Clerk user: ${u.email} (${created.id})`);
  return created;
}

async function syncUserToDB(clerkUser, u) {
  const name = `${u.firstName} ${u.lastName}`;
  const email = clerkUser.emailAddresses?.[0]?.emailAddress || u.email;
  const approvalStatus = u.role === "trainer" ? "pending" : "approved";

  await db.query(
    `INSERT INTO users(clerk_user_id, name, email, role, approval_status)
     VALUES($1, $2, $3, $4, $5)
     ON CONFLICT (clerk_user_id) DO UPDATE
       SET name  = EXCLUDED.name,
           email = EXCLUDED.email,
           role  = EXCLUDED.role,
           approval_status = EXCLUDED.approval_status`,
    [clerkUser.id, name, email, u.role, approvalStatus]
  );
  console.log(`  → Synced to DB: ${email} as ${u.role} (${approvalStatus})`);
}

// ── Seed relationships ────────────────────────────────────────────────────────

async function seedBatch() {
  const institutionRow = await db.query(
    "SELECT id FROM users WHERE role='institution' LIMIT 1"
  );
  const trainerRow = await db.query(
    "SELECT id FROM users WHERE role='trainer' LIMIT 1"
  );

  if (!institutionRow.rows.length || !trainerRow.rows.length) {
    console.log("\n  ⚠ Skipping batch seed — institution or trainer not found.");
    return;
  }

  const institutionId = institutionRow.rows[0].id;
  const trainerId = trainerRow.rows[0].id;

  // Create batch
  const batchRes = await db.query(
    `INSERT INTO batches(name, institution_id)
     VALUES('Test Batch – Web Development', $1)
     ON CONFLICT DO NOTHING
     RETURNING *`,
    [institutionId]
  );

  if (!batchRes.rows.length) {
    console.log("  → Batch already exists, skipping.");
    return;
  }

  const batchId = batchRes.rows[0].id;

  // Link trainer
  await db.query(
    "INSERT INTO batch_trainers(batch_id, trainer_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
    [batchId, trainerId]
  );

  // Generate invite token for the batch
  const crypto = require("crypto");
  const token = crypto.randomBytes(16).toString("hex");
  await db.query("UPDATE batches SET invite_token=$1 WHERE id=$2", [
    token,
    batchId,
  ]);

  // Add student to batch
  const studentRow = await db.query(
    "SELECT id FROM users WHERE role='student' LIMIT 1"
  );
  if (studentRow.rows.length) {
    await db.query(
      "INSERT INTO batch_students(batch_id, student_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
      [batchId, studentRow.rows[0].id]
    );
  }

  console.log(`\n  → Created batch (id=${batchId}) and linked trainer + student`);
  console.log(`  → Invite token: ${token}`);
  console.log(
    `  → Invite URL: ${process.env.FRONTEND_URL || "http://localhost:5173"}/join/${token}`
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== SkillBridge Seed ===\n");

  for (const u of SEED_USERS) {
    console.log(`\n[${u.role.toUpperCase()}]`);
    try {
      const clerkUser = await getOrCreateClerkUser(u);
      await syncUserToDB(clerkUser, u);
    } catch (err) {
      console.error(`  ✗ Failed for ${u.email}:`, err.errors?.[0]?.message || err.message);
    }
  }

  const institutionRow = await db.query(
    "SELECT id FROM users WHERE role='institution' LIMIT 1"
  );
  const trainerRow = await db.query(
    "SELECT id FROM users WHERE role='trainer' LIMIT 1"
  );
  if (institutionRow.rows.length && trainerRow.rows.length) {
    await db.query(
      "UPDATE users SET institution_id=$1 WHERE id=$2",
      [institutionRow.rows[0].id, trainerRow.rows[0].id]
    );
    console.log("  → Linked seeded trainer to seeded institution");
  }

  console.log("\n--- Seeding batch relationships ---");
  await seedBatch();

  console.log("\n=== Seed complete ===\n");
  console.log("Test Accounts (password: SkillBridge@123 for all)\n");
  console.log("Role".padEnd(22) + "Email");
  console.log("-".repeat(50));
  SEED_USERS.forEach((u) =>
    console.log(u.role.padEnd(22) + u.email)
  );

  await db.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
