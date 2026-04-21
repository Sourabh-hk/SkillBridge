const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { db } = require("./config/db");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const authRoutes = require("./routes/auth.routes");
const batchRoutes = require("./routes/batch.routes");
const sessionRoutes = require("./routes/session.routes");
const attendanceRoutes = require("./routes/attendance.routes");
const institutionRoutes = require("./routes/institution.routes");
const programmeRoutes = require("./routes/programme.routes");

app.get("/", (req, res) => {
  res.send("SkillBridge API is running");
});

app.use("/api/auth", authRoutes);
app.use("/api/batches", batchRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/institutions", institutionRoutes);
app.use("/api/programme", programmeRoutes);

// Test DB connection
db.query("SELECT 1")
  .then(() => console.log("DB Connected Successfully"))
  .catch((err) => console.log("DB Error:", err));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});