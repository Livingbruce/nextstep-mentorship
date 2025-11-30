import pool from "../src/db/pool.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../../.env") });

async function promoteCounselorToAdmin() {
  const email = process.argv[2];

  if (!email) {
    console.error("❌ Please provide an email. Usage:");
    console.error("   node backend/scripts/promoteCounselorToAdmin.js counselor@email.com");
    process.exit(1);
  }

  try {
    console.log(`🔎 Looking up counselor: ${email}`);
    const { rows } = await pool.query(
      `SELECT id, name, email, is_admin, is_active
       FROM counselors
       WHERE LOWER(email) = LOWER($1)
       LIMIT 1`,
      [email]
    );

    if (rows.length === 0) {
      console.error("❌ Counselor not found.");
      process.exit(1);
    }

    const counselor = rows[0];
    console.log(
      `   Found ${counselor.name || "Unnamed"} | admin=${counselor.is_admin} | active=${counselor.is_active}`
    );

    const { rows: updatedRows } = await pool.query(
      `UPDATE counselors
         SET is_admin = true,
             is_active = true,
             updated_at = NOW()
       WHERE id = $1
       RETURNING id, name, email, is_admin, is_active`,
      [counselor.id]
    );

    const updated = updatedRows[0];
    console.log("✅ Counselor promoted to admin successfully!");
    console.log(
      `   ${updated.name} (${updated.email}) | admin=${updated.is_admin} | active=${updated.is_active}`
    );
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to promote counselor:", error);
    await pool.end();
    process.exit(1);
  }
}

promoteCounselorToAdmin();

