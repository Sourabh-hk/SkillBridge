const express = require("express");
const router = express.Router();

const { db } = require("../config/db");
const { verifyToken, authorize } = require("../middleware/auth");

// POST /attendance/mark — Mark attendance (student)
router.post(
  "/mark",
  verifyToken,
  authorize("student"),
  async (req, res) => {
    try {
      const { session_id, status } = req.body;

      if (!session_id || !status) {
        return res.status(400).json({ msg: "session_id and status required" });
      }

      if (!["present", "absent", "late"].includes(status)) {
        return res.status(400).json({ msg: "Invalid status" });
      }

      // Fetch session details
      // NOTE: Sessions store TIME WITHOUT TIME ZONE (local time entered by the trainer).
      // The DB server (Neon) runs in UTC so a server-side NOW() comparison would be
      // wrong for any non-UTC timezone. The time-window is enforced by the frontend
      // using the browser's local clock, which is always correct.
      const sessionResult = await db.query(
        `SELECT s.id, s.batch_id FROM sessions s WHERE s.id = $1`,
        [session_id]
      );

      if (sessionResult.rows.length === 0) {
        return res.status(404).json({ msg: "Session not found" });
      }

      const session = sessionResult.rows[0];

      // Check student is enrolled in the batch
      const enrollCheck = await db.query(
        `SELECT 1 FROM batch_students WHERE batch_id = $1 AND student_id = $2`,
        [session.batch_id, req.user.id]
      );

      if (enrollCheck.rows.length === 0) {
        return res.status(403).json({ msg: "You are not enrolled in this batch" });
      }

      // Upsert attendance
      await db.query(
        `INSERT INTO attendance(session_id, student_id, status)
         VALUES($1,$2,$3)
         ON CONFLICT (session_id, student_id)
         DO UPDATE SET status=$3, marked_at=NOW()`,
        [session_id, req.user.id, status]
      );

      res.json({ msg: "Attendance marked" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: "Error marking attendance" });
    }
  }
);

module.exports = router;