const express = require("express");
const router = express.Router();

const { db } = require("../config/db");
const { verifyToken, authorize } = require("../middleware/auth");

// ✅ Mark Attendance
router.post(
  "/mark",
  verifyToken,
  authorize("student"),
  async (req, res) => {
    try {
      const { session_id, status } = req.body;

      await db.query(
        `INSERT INTO attendance(session_id, student_id, status)
         VALUES($1,$2,$3)`,
        [session_id, req.user.id, status]
      );

      res.json({ msg: "Attendance marked" });
    } catch (err) {
      console.log(err);
      res.status(500).json({ msg: "Error marking attendance" });
    }
  }
);

router.get("/test", (req, res) => {
  res.send("Attendance route working");
});

console.log("ATTENDANCE HIT");
module.exports = router;