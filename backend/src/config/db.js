const { Pool, types } = require("pg");

// Return DATE as plain string ("YYYY-MM-DD") to avoid midnight-UTC JS Date conversion
types.setTypeParser(1082, (val) => val);
// Return TIME as plain string ("HH:MM:SS") to avoid microsecond suffix issues
types.setTypeParser(1083, (val) => val);

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
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

ensureApprovalColumn().catch((err) => {
  console.error("DB migration shim failed:", err.message);
});

module.exports = { db };