const app = require("./app");
const { db } = require("./config/db");

// Test DB connection
db.query("SELECT 1")
  .then(() => console.log("DB Connected Successfully"))
  .catch((err) => console.log("DB Error:", err));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});