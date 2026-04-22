const express = require("express");
const router = express.Router();

const { db } = require("../config/db");
const { verifyToken, authorize } = require("../middleware/auth");

// POST /sessions — Create session (trainer)
router.post(
  "/",
  verifyToken,
  authorize("trainer"),
  async (req, res) => {
    try {
      const { batch_id, title, date, start_time, end_time } = req.body;
      if (!batch_id || !title || !date || !start_time || !end_time) {
        return res.status(400).json({ msg: "All fields required" });
      }

      const result = await db.query(
        `INSERT INTO sessions(batch_id, trainer_id, title, date, start_time, end_time)
         VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
        [batch_id, req.user.id, title, date, start_time, end_time]
      );

      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: "Error creating session" });
    }
  }
);

// GET /sessions — List sessions (role-scoped)
router.get("/", verifyToken, async (req, res) => {
  try {
    const { role, id } = req.user;
    let result;

    if (role === "trainer") {
      result = await db.query(
        "SELECT s.*, b.name as batch_name FROM sessions s JOIN batches b ON s.batch_id = b.id WHERE s.trainer_id=$1 ORDER BY s.date DESC",
        [id]
      );
    } else if (role === "student") {
      result = await db.query(
        `SELECT s.*, b.name as batch_name,
          a.status as my_attendance
         FROM sessions s
         JOIN batches b ON s.batch_id = b.id
         JOIN batch_students bs ON bs.batch_id = b.id AND bs.student_id = $1
         LEFT JOIN attendance a ON a.session_id = s.id AND a.student_id = $1
         ORDER BY s.date DESC`,
        [id]
      );
    } else {
      result = await db.query(
        "SELECT s.*, b.name as batch_name FROM sessions s JOIN batches b ON s.batch_id = b.id ORDER BY s.date DESC"
      );
    }

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Error fetching sessions" });
  }
});

// GET /sessions/:id/attendance — View attendance for a session (trainer / institution)
router.get(
  "/:id/attendance",
  verifyToken,
  authorize("trainer", "institution", "programme_manager", "monitoring_officer"),
  async (req, res) => {
    try {
      const sessionId = req.params.id;

      const sessionResult = await db.query(
        "SELECT s.*, b.name as batch_name FROM sessions s JOIN batches b ON s.batch_id = b.id WHERE s.id=$1",
        [sessionId]
      );

      if (sessionResult.rows.length === 0) {
        return res.status(404).json({ msg: "Session not found" });
      }

      const attendanceResult = await db.query(
        `SELECT u.id, u.name, u.email, a.status, a.marked_at
         FROM batch_students bs
         JOIN users u ON bs.student_id = u.id
         LEFT JOIN attendance a ON a.session_id = $1 AND a.student_id = u.id
         WHERE bs.batch_id = $2`,
        [sessionId, sessionResult.rows[0].batch_id]
      );

      res.json({
        session: sessionResult.rows[0],
        attendance: attendanceResult.rows,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: "Error fetching attendance" });
    }
  }
);

module.exports = router;