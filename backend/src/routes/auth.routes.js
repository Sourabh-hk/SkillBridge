const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { db } = require("../config/db");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

const VALID_ROLES = ["student", "trainer", "institution", "programme_manager", "monitoring_officer"];

// SIGNUP
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, role, institution_id } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ msg: "All fields are required" });
    }

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ msg: "Invalid role" });
    }

    const existing = await db.query("SELECT id FROM users WHERE email=$1", [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ msg: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await db.query(
      "INSERT INTO users(name, email, password, role, institution_id) VALUES($1,$2,$3,$4,$5) RETURNING id, name, email, role",
      [name, email, hashedPassword, role, institution_id || null]
    );

    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.status(201).json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Error creating user" });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ msg: "Email and password required" });
    }

    const result = await db.query("SELECT * FROM users WHERE email=$1", [email]);

    if (result.rows.length === 0) {
      return res.status(400).json({ msg: "User not found" });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, institution_id: user.institution_id } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Login error" });
  }
});

// GET current user
router.get("/me", verifyToken, async (req, res) => {
  try {
    const result = await db.query(
      "SELECT id, name, email, role, institution_id, created_at FROM users WHERE id=$1",
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ msg: "User not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Error fetching user" });
  }
});

module.exports = router;