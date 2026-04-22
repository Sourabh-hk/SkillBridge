const express = require("express");
const router = express.Router();

const { db } = require("../config/db");
const { verifyToken, authorize } = require("../middleware/auth");

// GET /institutions/:id/summary — Institution summary
router.get(
  "/:id/summary",
  verifyToken,
  authorize("institution", "programme_manager", "monitoring_officer"),
  async (req, res) => {
    try {
      const institutionId = req.params.id;

      const institutionResult = await db.query(
        "SELECT id, name, email FROM users WHERE id=$1 AND role='institution'",
        [institutionId]
      );

      if (institutionResult.rows.length === 0) {
        return res.status(404).json({ msg: "Institution not found" });
      }

      const batchesResult = await db.query(
        "SELECT * FROM batches WHERE institution_id=$1",
        [institutionId]
      );

      const trainersResult = await db.query(
        `SELECT DISTINCT u.id, u.name, u.email
         FROM batch_trainers bt
         JOIN batches b ON bt.batch_id = b.id
         JOIN users u ON bt.trainer_id = u.id
         WHERE b.institution_id=$1`,
        [institutionId]
      );

      const statsResult = await db.query(
        `SELECT
          COUNT(DISTINCT s.id) as total_sessions,
          COUNT(DISTINCT bs.student_id) as total_students,
          COUNT(a.id) FILTER (WHERE a.status='present') as total_present,
          COUNT(a.id) FILTER (WHERE a.status='absent') as total_absent,
          COUNT(a.id) FILTER (WHERE a.status='late') as total_late
         FROM batches b
         LEFT JOIN sessions s ON s.batch_id = b.id
         LEFT JOIN batch_students bs ON bs.batch_id = b.id
         LEFT JOIN attendance a ON a.session_id = s.id
         WHERE b.institution_id=$1`,
        [institutionId]
      );

      res.json({
        institution: institutionResult.rows[0],
        batches: batchesResult.rows,
        trainers: trainersResult.rows,
        stats: statsResult.rows[0],
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: "Error fetching institution summary" });
    }
  }
);

module.exports = router;
