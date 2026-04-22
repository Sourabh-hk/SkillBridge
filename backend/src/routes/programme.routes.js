const express = require("express");
const router = express.Router();

const { db } = require("../config/db");
const { verifyToken, authorize } = require("../middleware/auth");

// GET /programme/summary — Programme-wide summary (paginated institutions)
router.get(
  "/summary",
  verifyToken,
  authorize("programme_manager", "monitoring_officer"),
  async (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
      const offset = (page - 1) * limit;

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

      const countResult = await db.query(
        "SELECT COUNT(*) FROM users WHERE role='institution'"
      );
      const total = parseInt(countResult.rows[0].count);

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
         ORDER BY u.name
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      res.json({
        stats: statsResult.rows[0],
        institutions: {
          data: institutionBreakdown.rows,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: "Error fetching programme summary" });
    }
  }
);

module.exports = router;
