const express = require("express");
const router = express.Router();

const { db } = require("../config/db");
const { verifyToken, authorize } = require("../middleware/auth");

// GET /programme/summary — Programme-wide summary
router.get(
  "/summary",
  verifyToken,
  authorize("programme_manager", "monitoring_officer"),
  async (req, res) => {
    try {
      const institutionsResult = await db.query(
        "SELECT id, name, email FROM users WHERE role='institution' ORDER BY name"
      );

      const statsResult = await db.query(
        `SELECT
          COUNT(DISTINCT b.id) as total_batches,
          COUNT(DISTINCT s.id) as total_sessions,
          (SELECT COUNT(*) FROM users WHERE role='student') as total_students,
          (SELECT COUNT(*) FROM users WHERE role='trainer') as total_trainers,
          COUNT(a.id) FILTER (WHERE a.status='present') as total_present,
          COUNT(a.id) FILTER (WHERE a.status='absent') as total_absent,
          COUNT(a.id) FILTER (WHERE a.status='late') as total_late
         FROM batches b
         LEFT JOIN sessions s ON s.batch_id = b.id
         LEFT JOIN attendance a ON a.session_id = s.id`
      );

      const institutionBreakdown = await db.query(
        `SELECT
          u.id, u.name,
          COUNT(DISTINCT b.id) as batches,
          COUNT(DISTINCT s.id) as sessions,
          COUNT(DISTINCT bs.student_id) as students
         FROM users u
         LEFT JOIN batches b ON b.institution_id = u.id
         LEFT JOIN sessions s ON s.batch_id = b.id
         LEFT JOIN batch_students bs ON bs.batch_id = b.id
         WHERE u.role='institution'
         GROUP BY u.id, u.name
         ORDER BY u.name`
      );

      res.json({
        stats: statsResult.rows[0],
        institutions: institutionBreakdown.rows,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: "Error fetching programme summary" });
    }
  }
);

module.exports = router;
