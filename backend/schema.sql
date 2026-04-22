-- SkillBridge Database Schema
-- Run this in your Neon PostgreSQL console

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  clerk_user_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('student', 'trainer', 'institution', 'programme_manager', 'monitoring_officer')),
  institution_id INTEGER REFERENCES users(id),
  approval_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS batches (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  institution_id INTEGER REFERENCES users(id),
  invite_token VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS batch_trainers (
  batch_id INTEGER REFERENCES batches(id) ON DELETE CASCADE,
  trainer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (batch_id, trainer_id)
);

CREATE TABLE IF NOT EXISTS batch_students (
  batch_id INTEGER REFERENCES batches(id) ON DELETE CASCADE,
  student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (batch_id, student_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  batch_id INTEGER REFERENCES batches(id) ON DELETE CASCADE,
  trainer_id INTEGER REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
  student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'late')),
  marked_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (session_id, student_id)
);
