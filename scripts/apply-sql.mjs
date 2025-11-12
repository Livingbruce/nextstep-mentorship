import fs from "fs/promises";
import path from "path";
import pool from "../backend/src/db/pool.js";

async function applySql(filePath) {
  const abs = path.resolve(filePath);
  console.log("🔧 Applying SQL:", abs);
  const sql = await fs.readFile(abs, "utf8");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
    console.log("✅ Migration applied");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Migration failed:", err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/apply-sql.mjs <path-to-sql>");
  process.exit(1);
}

applySql(file).catch((e) => {
  console.error("Failed:", e);
  process.exit(1);
});


