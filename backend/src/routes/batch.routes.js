const express = require("express");
const { db } = require("../config/db");
const { verifyToken, authorize } = require("../middleware/auth");

const router = express.Router();

// ✅ Create Batch (only trainer & institution)
router.post(
  "/",
  verifyToken,
  authorize("trainer", "institution"),
  async (req, res) => {
    try {
      const { name } = req.body;

      await db.query(
        "INSERT INTO batches(name, institution_id) VALUES($1,$2)",
        [name, req.user.id]
      );

      res.json({ msg: "Batch created" });
    } catch (err) {
      console.log(err);
      res.status(500).json({ msg: "Error creating batch" });
    }
  }
);

module.exports = router;