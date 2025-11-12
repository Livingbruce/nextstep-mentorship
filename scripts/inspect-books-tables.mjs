import pool from "../backend/src/db/pool.js";

const TABLES = ["books", "book_orders"];

async function inspectTables() {
  for (const table of TABLES) {
    try {
      const existsRes = await pool.query(
        `SELECT EXISTS (
           SELECT 1
           FROM information_schema.tables
           WHERE table_schema = $1
             AND table_name = $2
         ) AS exists`,
        ["public", table]
      );

      const exists = existsRes.rows[0]?.exists ?? false;
      console.log(`\nTable ${table}: ${exists ? "exists ✅" : "missing ❌"}`);

      if (!exists) continue;

      const columnsRes = await pool.query(
        `SELECT
           column_name,
           data_type,
           is_nullable,
           column_default
         FROM information_schema.columns
         WHERE table_schema = $1
           AND table_name = $2
         ORDER BY ordinal_position`,
        ["public", table]
      );

      console.table(columnsRes.rows);
    } catch (error) {
      console.error(`⚠️  Failed to inspect ${table}:`, error.message);
    }
  }
}

inspectTables()
  .catch((err) => {
    console.error("Failed to inspect tables:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });


