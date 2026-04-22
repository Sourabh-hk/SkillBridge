const { Pool, types } = require("pg");

// Return DATE as plain string ("YYYY-MM-DD") to avoid midnight-UTC JS Date conversion
types.setTypeParser(1082, (val) => val);
// Return TIME as plain string ("HH:MM:SS") to avoid microsecond suffix issues
types.setTypeParser(1083, (val) => val);

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

module.exports = { db };