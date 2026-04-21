const express = require("express");
const router = express.Router();

const { db } = require("../config/db");
const { verifyToken, authorize } = require("../middleware/auth");

// ✅ Create Session
router.post(
  "/",
  verifyToken,
  authorize("trainer"),
  async (req, res) => {
    try {
      const { batch_id, title, date, start_time, end_time } = req.body;

      await db.query(
        `INSERT INTO sessions(batch_id, trainer_id, title, date, start_time, end_time)
         VALUES($1,$2,$3,$4,$5,$6)`,
        [batch_id, req.user.id, title, date, start_time, end_time]
      );

      res.json({ msg: "Session created" });
    } catch (err) {
      console.log(err);
      res.status(500).json({ msg: "Error creating session" });
    }
  }
);

module.exports = router;