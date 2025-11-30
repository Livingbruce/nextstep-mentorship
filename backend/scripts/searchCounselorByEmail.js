import pool from '../src/db/pool.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../../.env") });

async function searchCounselor() {
  try {
    const searchTerm = process.argv[2] || 'campus';
    
    console.log(`🔍 Searching for counselors with "${searchTerm}" in email...\n`);
    
    const result = await pool.query(
      `SELECT id, name, email, is_admin, is_active, email_confirmed, created_at
       FROM counselors 
       WHERE LOWER(email) LIKE LOWER($1)
       ORDER BY created_at DESC
       LIMIT 20`,
      [`%${searchTerm}%`]
    );

    if (result.rows.length === 0) {
      console.log(`❌ No accounts found matching "${searchTerm}"`);
      console.log('\n💡 Listing all counselor emails...\n');
      
      const allResult = await pool.query(
        `SELECT email, name, created_at 
         FROM counselors 
         ORDER BY created_at DESC 
         LIMIT 50`
      );
      
      if (allResult.rows.length === 0) {
        console.log('❌ No counselors found in database');
      } else {
        console.log(`Found ${allResult.rows.length} counselor(s):\n`);
        allResult.rows.forEach((row, idx) => {
          console.log(`${idx + 1}. ${row.email} (${row.name || 'No name'}) - Created: ${row.created_at}`);
        });
      }
    } else {
      console.log(`✅ Found ${result.rows.length} matching account(s):\n`);
      result.rows.forEach((counselor, idx) => {
        console.log(`${idx + 1}. ${counselor.email}`);
        console.log(`   Name: ${counselor.name || 'Not set'}`);
        console.log(`   ID: ${counselor.id}`);
        console.log(`   Admin: ${counselor.is_admin ? 'Yes' : 'No'}`);
        console.log(`   Active: ${counselor.is_active ? 'Yes' : 'No'}`);
        console.log(`   Email Confirmed: ${counselor.email_confirmed ? 'Yes' : 'No'}`);
        console.log(`   Created: ${counselor.created_at}\n`);
      });
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

searchCounselor();

