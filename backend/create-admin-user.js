import pool from './src/db/pool.js';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

async function createAdminUser() {
  try {
    console.log('🔍 Checking database connection...');
    
    // Test connection
    const testResult = await pool.query('SELECT NOW()');
    console.log('✅ Database connected:', testResult.rows[0].now);
    
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
      console.log('📝 Please run the database schema first:');
      console.log('   See: backend/seed/optimized_schema.sql');
      process.exit(1);
    }
    
    console.log('✅ counselors table exists');
    
    // Check if user already exists
    const email = 'vicymbrush@gmail.com';
    const existingUser = await pool.query(
      'SELECT id, email FROM counselors WHERE email = $1',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      console.log(`⚠️  User with email ${email} already exists!`);
      console.log('   Updating password...');
      
      const password = '123456';
      const hashedPassword = await bcrypt.hash(password, 10);
      
      await pool.query(
        'UPDATE counselors SET password_hash = $1 WHERE email = $2',
        [hashedPassword, email]
      );
      
      console.log('✅ Password updated successfully!');
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${password}`);
    } else {
      console.log(`📝 Creating new admin user...`);
      
      const password = '123456';
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const result = await pool.query(
        `INSERT INTO counselors (name, email, password_hash, is_admin, email_confirmed)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, name, email, is_admin`,
        ['Victor Mburugu', email, hashedPassword, true, true]
      );
      
      console.log('✅ Admin user created successfully!');
      console.log(`   ID: ${result.rows[0].id}`);
      console.log(`   Name: ${result.rows[0].name}`);
      console.log(`   Email: ${result.rows[0].email}`);
      console.log(`   Password: ${password}`);
      console.log(`   Is Admin: ${result.rows[0].is_admin}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

createAdminUser();

