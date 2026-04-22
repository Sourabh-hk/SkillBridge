const express = require("express");
const crypto = require("crypto");
const { db } = require("../config/db");
const { verifyToken, authorize } = require("../middleware/auth");

const router = express.Router();

// POST /batches — Create batch (trainer / institution)
router.post(
  "/",
  verifyToken,
  authorize("trainer", "institution"),
  async (req, res) => {
    try {
      const { name } = req.body;
      if (!name) return res.status(400).json({ msg: "Batch name required" });

      const institution_id =
        req.user.role === "institution" ? req.user.id : req.user.institution_id;

      if (req.user.role === "trainer" && !institution_id) {
        return res.status(400).json({
          msg: "Trainer must be affiliated to an institution",
        });
      }

      const result = await db.query(
        "INSERT INTO batches(name, institution_id) VALUES($1,$2) RETURNING *",
        [name, institution_id]
      );
      const batch = result.rows[0];

      // Link trainer to batch
      if (req.user.role === "trainer") {
        await db.query(
          "INSERT INTO batch_trainers(batch_id, trainer_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
          [batch.id, req.user.id]
        );
      }

      res.status(201).json(batch);
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: "Error creating batch" });
    }
  }
);

// GET /batches — List batches (role-scoped)
router.get("/", verifyToken, async (req, res) => {
  try {
    const { role, id } = req.user;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const offset = (page - 1) * limit;

    let rows, total;

    if (role === "trainer") {
      const countResult = await db.query(
        "SELECT COUNT(*) FROM batches b JOIN batch_trainers bt ON b.id = bt.batch_id WHERE bt.trainer_id = $1",
        [id]
      );
      total = parseInt(countResult.rows[0].count);
      const result = await db.query(
        `SELECT b.* FROM batches b
         JOIN batch_trainers bt ON b.id = bt.batch_id
         WHERE bt.trainer_id = $1 LIMIT $2 OFFSET $3`,
        [id, limit, offset]
      );
      rows = result.rows;
    } else if (role === "student") {
      const countResult = await db.query(
        "SELECT COUNT(*) FROM batches b JOIN batch_students bs ON b.id = bs.batch_id WHERE bs.student_id = $1",
        [id]
      );
      total = parseInt(countResult.rows[0].count);
      const result = await db.query(
        `SELECT b.* FROM batches b
         JOIN batch_students bs ON b.id = bs.batch_id
         WHERE bs.student_id = $1 LIMIT $2 OFFSET $3`,
        [id, limit, offset]
      );
      rows = result.rows;
    } else if (role === "institution") {
      const countResult = await db.query(
        "SELECT COUNT(*) FROM batches WHERE institution_id = $1",
        [id]
      );
      total = parseInt(countResult.rows[0].count);
      const result = await db.query(
        "SELECT * FROM batches WHERE institution_id = $1 LIMIT $2 OFFSET $3",
        [id, limit, offset]
      );
      rows = result.rows;
    } else {
      const countResult = await db.query("SELECT COUNT(*) FROM batches");
      total = parseInt(countResult.rows[0].count);
      const result = await db.query(
        "SELECT * FROM batches ORDER BY created_at DESC LIMIT $1 OFFSET $2",
        [limit, offset]
      );
      rows = result.rows;
    }

    res.json({ data: rows, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Error fetching batches" });
  }
});

// POST /batches/:id/invite — Generate invite link (trainer)
router.post(
  "/:id/invite",
  verifyToken,
  authorize("trainer", "institution"),
  async (req, res) => {
    try {
      const batchId = req.params.id;
      const token = crypto.randomBytes(16).toString("hex");

      await db.query(
        "UPDATE batches SET invite_token=$1 WHERE id=$2",
        [token, batchId]
      );

      const inviteUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/join/${token}`;
      res.json({ invite_url: inviteUrl, token });
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: "Error generating invite" });
    }
  }
);

// POST /batches/:id/join — Join batch via invite (student)
router.post(
  "/:id/join",
  verifyToken,
  authorize("student"),
  async (req, res) => {
    try {
      const batchId = req.params.id;

      await db.query(
        "INSERT INTO batch_students(batch_id, student_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
        [batchId, req.user.id]
      );

      res.json({ msg: "Joined batch successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: "Error joining batch" });
    }
  }
);

// POST /batches/join-by-token — Join batch using invite token (student)
router.post(
  "/join-by-token",
  verifyToken,
  authorize("student"),
  async (req, res) => {
    try {
      const { token } = req.body;
      if (!token) return res.status(400).json({ msg: "Token required" });

      const batchResult = await db.query(
        "SELECT * FROM batches WHERE invite_token=$1",
        [token]
      );

      if (batchResult.rows.length === 0) {
        return res.status(404).json({ msg: "Invalid invite token" });
      }

      const batch = batchResult.rows[0];

      await db.query(
        "INSERT INTO batch_students(batch_id, student_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
        [batch.id, req.user.id]
      );

      res.json({ msg: "Joined batch successfully", batch });
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: "Error joining batch" });
    }
  }
);

// GET /batches/:id/summary — Batch attendance summary (institution / trainer)
router.get(
  "/:id/summary",
  verifyToken,
  authorize("institution", "trainer", "programme_manager", "monitoring_officer"),
  async (req, res) => {
    try {
      const batchId = req.params.id;

      const batchResult = await db.query(
        "SELECT * FROM batches WHERE id=$1",
        [batchId]
      );
      if (batchResult.rows.length === 0) {
        return res.status(404).json({ msg: "Batch not found" });
      }

      const sessionsResult = await db.query(
        "SELECT COUNT(*) as total_sessions FROM sessions WHERE batch_id=$1",
        [batchId]
      );

      const studentsResult = await db.query(
        `SELECT u.id, u.name, u.email,
          COUNT(a.id) FILTER (WHERE a.status='present') as present,
          COUNT(a.id) FILTER (WHERE a.status='absent') as absent,
          COUNT(a.id) FILTER (WHERE a.status='late') as late
         FROM batch_students bs
         JOIN users u ON bs.student_id = u.id
         LEFT JOIN sessions s ON s.batch_id = $1
         LEFT JOIN attendance a ON a.session_id = s.id AND a.student_id = u.id
         WHERE bs.batch_id = $1
         GROUP BY u.id, u.name, u.email`,
        [batchId]
      );

      res.json({
        batch: batchResult.rows[0],
        total_sessions: parseInt(sessionsResult.rows[0].total_sessions),
        students: studentsResult.rows,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: "Error fetching summary" });
    }
  }
);

module.exports = router;