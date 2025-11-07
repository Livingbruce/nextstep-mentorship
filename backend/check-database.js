import pool from './src/db/pool.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

async function checkDatabase() {
  try {
    console.log('🔍 Checking database connection...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set ✅' : 'Not set ❌');
    
    // Test connection
    const testResult = await pool.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('✅ Database connected!');
    console.log('   Current time:', testResult.rows[0].current_time);
    console.log('   PostgreSQL version:', testResult.rows[0].pg_version.split(' ')[0] + ' ' + testResult.rows[0].pg_version.split(' ')[1]);
    
    // Check if counselors table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'counselors'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('❌ counselors table does not exist!');
      process.exit(1);
    }
    
    console.log('✅ counselors table exists');
    
    // Check user count
    const userCount = await pool.query('SELECT COUNT(*) as count FROM counselors');
    console.log(`📊 Total users in database: ${userCount.rows[0].count}`);
    
    // Check for your specific user
    const email = 'vicymbrush@gmail.com';
    const userCheck = await pool.query(
      'SELECT id, name, email, is_admin, email_confirmed FROM counselors WHERE email = $1',
      [email]
    );
    
    if (userCheck.rows.length === 0) {
      console.log(`❌ User with email ${email} NOT FOUND in database!`);
      console.log('\n💡 Solution: You need to create this user in your production database.');
      console.log('   Run: npm run create-admin');
    } else {
      const user = userCheck.rows[0];
      console.log(`✅ User found!`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Is Admin: ${user.is_admin}`);
      console.log(`   Email Confirmed: ${user.email_confirmed}`);
      console.log('\n💡 If login still fails, the password might be different.');
      console.log('   Run: npm run create-admin (to reset password to 123456)');
    }
    
    // List all users
    const allUsers = await pool.query('SELECT email, name, is_admin FROM counselors LIMIT 10');
    if (allUsers.rows.length > 0) {
      console.log('\n📋 Users in database:');
      allUsers.rows.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email} (${user.name}) - Admin: ${user.is_admin}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    console.error('\n💡 Possible issues:');
    console.error('   1. DATABASE_URL not set in Render environment variables');
    console.error('   2. Database credentials are incorrect');
    console.error('   3. Database is not accessible from Render');
    console.error('   4. Database might be sleeping (free tier)');
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

checkDatabase();

