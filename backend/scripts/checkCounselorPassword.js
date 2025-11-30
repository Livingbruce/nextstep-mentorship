import pool from '../src/db/pool.js';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../../.env") });

async function checkCounselorAccount() {
  try {
    const email = process.argv[2] || 'campuslifementorship@gmail.com';
    const newPassword = process.argv[3]; // Optional: new password to set
    
    console.log(`🔍 Checking account for: ${email}\n`);
    
    // Check if account exists
    const result = await pool.query(
      `SELECT id, name, email, is_admin, is_active, email_confirmed, 
              verification_status, created_at, password_hash IS NOT NULL as has_password
       FROM counselors 
       WHERE LOWER(email) = LOWER($1)`,
      [email]
    );

    if (result.rows.length === 0) {
      console.log(`❌ No account found with email: ${email}`);
      process.exit(1);
    }

    const counselor = result.rows[0];
    console.log('✅ Account found!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`ID: ${counselor.id}`);
    console.log(`Name: ${counselor.name || 'Not set'}`);
    console.log(`Email: ${counselor.email}`);
    console.log(`Is Admin: ${counselor.is_admin ? 'Yes' : 'No'}`);
    console.log(`Is Active: ${counselor.is_active ? 'Yes' : 'No'}`);
    console.log(`Email Confirmed: ${counselor.email_confirmed ? 'Yes' : 'No'}`);
    console.log(`Verification Status: ${counselor.verification_status || 'Not set'}`);
    console.log(`Has Password: ${counselor.has_password ? 'Yes' : 'No'}`);
    console.log(`Created At: ${counselor.created_at}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Note about password
    console.log('ℹ️  Note: Passwords are stored as bcrypt hashes and cannot be retrieved.');
    console.log('   The original password cannot be displayed for security reasons.\n');

    // If new password provided, reset it
    if (newPassword) {
      if (newPassword.length < 6) {
        console.log('❌ Password must be at least 6 characters long');
        process.exit(1);
      }

      console.log('🔄 Resetting password...');
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      await pool.query(
        'UPDATE counselors SET password_hash = $1 WHERE id = $2',
        [hashedPassword, counselor.id]
      );

      console.log('✅ Password reset successfully!');
      console.log(`   New Password: ${newPassword}`);
      console.log('   Please use this password to login.');
    } else {
      console.log('💡 To reset the password, run:');
      console.log(`   node backend/scripts/checkCounselorPassword.js ${email} <new_password>`);
    }

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
    await pool.end();
    process.exit(1);
  }
}

checkCounselorAccount();

