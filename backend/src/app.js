const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Clerk middleware — only in non-test mode (test mode uses X-Test-User-Id bypass)
if (process.env.NODE_ENV !== "test") {
  const { clerkMiddleware } = require("@clerk/express");
  app.use(clerkMiddleware());
}

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());

// Routes
const authRoutes = require("./routes/auth.routes");
const batchRoutes = require("./routes/batch.routes");
const sessionRoutes = require("./routes/session.routes");
const attendanceRoutes = require("./routes/attendance.routes");
const institutionRoutes = require("./routes/institution.routes");
const programmeRoutes = require("./routes/programme.routes");

app.get("/", (req, res) => {
  res.json({ msg: "SkillBridge API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/batches", batchRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/institutions", institutionRoutes);
app.use("/api/programme", programmeRoutes);

module.exports = app;
