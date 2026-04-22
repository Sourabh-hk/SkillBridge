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