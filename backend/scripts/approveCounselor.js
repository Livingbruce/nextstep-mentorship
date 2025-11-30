import pool from "../src/db/pool.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../../.env") });

async function approveCounselor() {
  const email = process.argv[2];

  if (!email) {
    console.error("❌ Please provide an email. Usage:");
    console.error("   node backend/scripts/approveCounselor.js counselor@email.com");
    process.exit(1);
  }

  try {
    console.log(`🔎 Looking up counselor: ${email}`);
    const { rows } = await pool.query(
      `SELECT id, name, email, verification_status, is_active, email_confirmed
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
      `   Found ${counselor.name || "Unnamed"} | status=${counselor.verification_status} | active=${counselor.is_active}`
    );

    const { rows: updatedRows } = await pool.query(
      `UPDATE counselors
         SET verification_status = 'approved',
             is_active = true,
             email_confirmed = true,
             email_verified_at = COALESCE(email_verified_at, NOW()),
             email_verification_delivery_status = 'delivered',
             updated_at = NOW()
       WHERE id = $1
       RETURNING id, name, email, verification_status, is_active, email_confirmed`,
      [counselor.id]
    );

    const updated = updatedRows[0];
    console.log("✅ Counselor approved successfully!");
    console.log(
      `   ${updated.name} (${updated.email}) | status=${updated.verification_status} | active=${updated.is_active}`
    );
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to approve counselor:", error);
    await pool.end();
    process.exit(1);
  }
}

approveCounselor();

