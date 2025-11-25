import pool from '../db/pool.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_EXPIRES_IN = '7d';

export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM counselors WHERE email = $1 LIMIT 1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const counselor = result.rows[0];
    const match = await bcrypt.compare(password, counselor.password_hash);

    if (!match) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      console.error('❌ JWT_SECRET environment variable is not set. Unable to complete login.');
      return res.status(500).json({ error: "Authentication service is misconfigured. Please contact support." });
    }

    const token = jwt.sign(
      {
        counselorId: counselor.id,
        email: counselor.email,
        isAdmin: counselor.is_admin || false,
      },
      jwtSecret,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({ 
      token, 
      counselor: { 
        id: counselor.id, 
        name: counselor.name, 
        email: counselor.email, 
        phone: counselor.phone,
        specialization: counselor.specialization,
        bio: counselor.bio,
        office_location: counselor.office_location,
        office_hours: counselor.office_hours,
        is_admin: counselor.is_admin,
        // Include personal information fields
        gender: counselor.gender,
        date_of_birth: counselor.date_of_birth,
        religion: counselor.religion,
        country: counselor.country,
        physical_address: counselor.physical_address,
        city_or_town: counselor.city_or_town,
        emergency_contact_phone: counselor.emergency_contact_phone,
        therapist_id: counselor.therapist_id,
        license_number: counselor.license_number,
        verification_status: counselor.verification_status,
        email_confirmed: counselor.email_confirmed
      },
      // Add verification status for frontend routing decisions
      verificationStatus: {
        emailConfirmed: counselor.email_confirmed,
        profileComplete: counselor.therapist_id && counselor.license_number && counselor.specialization,
        adminApproved: counselor.verification_status === 'approved',
        verificationStatus: counselor.verification_status || 'pending'
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export const me = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, phone, specialization, bio, is_admin, 
              gender, date_of_birth, religion, country, physical_address, city_or_town, 
              emergency_contact_name, emergency_contact_phone, therapist_id, license_number,
              verification_status, email_confirmed, created_at, updated_at,
              experience, education_background, additional_certifications, target_conditions,
              therapeutic_approach, national_id_number
       FROM counselors WHERE id = $1`,
      [req.user.counselorId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

export async function registerHandler(req, res) {
  const { name, email, password, specialization } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'name,email,password required' });

  const hashed = await bcrypt.hash(password, 10);
  try {
    const ins = await pool.query(
      `INSERT INTO counselors (name, email, password_hash, specialization) VALUES ($1, $2, $3, $4) RETURNING id, name, email`,
      [name, email, hashed, specialization || null]
    );
    const user = ins.rows[0];
    return res.status(201).json({ counselor: user });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email already exists' });
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}

export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const counselorId = req.user.counselorId;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters long' });
  }

  try {
    // Get current password hash
    const result = await pool.query(
      "SELECT password_hash FROM counselors WHERE id = $1",
      [counselorId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Counselor not found' });
    }

    const counselor = result.rows[0];
    
    // Verify current password
    const match = await bcrypt.compare(currentPassword, counselor.password_hash);
    if (!match) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await pool.query(
      "UPDATE counselors SET password_hash = $1 WHERE id = $2",
      [hashedNewPassword, counselorId]
    );

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('Error changing password:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getProfile = async (req, res) => {
  const counselorId = req.user.counselorId;

  try {
    const result = await pool.query(
      `SELECT id, name, email, phone, specialization, bio,
              gender, date_of_birth, religion, country, physical_address, city_or_town,
              emergency_contact_name, emergency_contact_phone, therapist_id, experience,
              education_background, additional_certifications, target_conditions,
              therapeutic_approach, national_id_number, verification_status
       FROM counselors WHERE id = $1`,
      [counselorId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Counselor not found' });
    }

    const counselor = result.rows[0];
    res.json({
      success: true,
      counselor: {
        id: counselor.id,
        name: counselor.name,
        email: counselor.email,
        phone: counselor.phone,
        specialization: counselor.specialization,
        bio: counselor.bio,
        gender: counselor.gender,
        date_of_birth: counselor.date_of_birth,
        religion: counselor.religion,
        country: counselor.country,
        physical_address: counselor.physical_address,
        city_or_town: counselor.city_or_town,
        emergency_contact_phone: counselor.emergency_contact_phone,
        therapist_id: counselor.therapist_id,
        experience: counselor.experience,
        education_background: counselor.education_background,
        additional_certifications: counselor.additional_certifications,
        target_conditions: counselor.target_conditions,
        therapeutic_approach: counselor.therapeutic_approach,
        national_id_number: counselor.national_id_number,
        verification_status: counselor.verification_status
      }
    });
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

export const updateProfile = async (req, res) => {
  const { 
    name, email, phone, specialization, bio,
    // Personal Information fields
    gender, date_of_birth, religion, country, physical_address, city_or_town,
    emergency_contact_name, emergency_contact_phone,
    // Professional Information fields
    therapist_id, experience, education_background, additional_certifications,
    target_conditions, therapeutic_approach, national_id_number
  } = req.body;
  const counselorId = req.user.counselorId;

  console.log('Profile update request:', { 
    name, email, phone, specialization, bio,
    gender, date_of_birth, religion, country, physical_address, city_or_town,
    emergency_contact_name, emergency_contact_phone,
    therapist_id, experience, education_background, additional_certifications,
    target_conditions, therapeutic_approach, national_id_number,
    counselorId 
  });

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  try {
    // Check if email is already taken by another counselor
    const emailCheck = await pool.query(
      "SELECT id FROM counselors WHERE email = $1 AND id != $2",
      [email, counselorId]
    );

    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Email is already taken by another counselor' });
    }

    // Update profile with all fields
    const result = await pool.query(
      `UPDATE counselors 
       SET name = $1, email = $2, phone = $3, specialization = $4, 
           bio = $5, gender = $6, date_of_birth = $7, religion = $8, country = $9,
           physical_address = $10, city_or_town = $11, emergency_contact_name = $12,
           emergency_contact_phone = $13, therapist_id = $14, experience = $15,
           education_background = $16, additional_certifications = $17,
           target_conditions = $18, therapeutic_approach = $19, national_id_number = $20
       WHERE id = $21
       RETURNING id, name, email, phone, specialization, bio,
                 gender, date_of_birth, religion, country, physical_address, city_or_town,
                 emergency_contact_name, emergency_contact_phone, therapist_id, experience,
                 education_background, additional_certifications, target_conditions,
                 therapeutic_approach, national_id_number`,
      [name, email, phone || null, specialization || null, bio || null,
       gender || null, date_of_birth || null, religion || null, country || null,
       physical_address || null, city_or_town || null, emergency_contact_name || null,
       emergency_contact_phone || null, therapist_id || null, experience || null,
       education_background || null, additional_certifications || null,
       target_conditions || null, therapeutic_approach || null, national_id_number || null,
       counselorId]
    );

    console.log('Profile update result:', result.rows[0]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Counselor not found' });
    }

    res.json({ success: true, counselor: result.rows[0] });
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getUserByEmail = async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const result = await pool.query(
      `SELECT id, name, email, email_confirmed, 
              gender, date_of_birth, religion, phone, country,
      physical_address, city_or_town, emergency_contact_phone,
              therapist_id, specialization, experience, education_background,
              additional_certifications, target_conditions, therapeutic_approach,
              national_id_number, verification_status 
       FROM counselors WHERE email = $1 LIMIT 1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({ 
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        email_confirmed: user.email_confirmed,
        // Personal Information
        gender: user.gender,
        date_of_birth: user.date_of_birth,
        religion: user.religion,
        phone: user.phone,
        country: user.country,
        physical_address: user.physical_address,
        city_or_town: user.city_or_town,
        emergency_contact_phone: user.emergency_contact_phone,
        // Professional Information
        therapist_id: user.therapist_id,
        specialization: user.specialization,
        experience: user.experience,
        education_background: user.education_background,
        additional_certifications: user.additional_certifications,
        target_conditions: user.target_conditions,
        therapeutic_approach: user.therapeutic_approach,
        national_id_number: user.national_id_number,
        verification_status: user.verification_status
      }
    });
  } catch (err) {
    console.error('Error fetching user by email:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getDocumentsByEmail = async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    // First get the user ID
    const userResult = await pool.query(
      "SELECT id FROM counselors WHERE email = $1 LIMIT 1",
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = userResult.rows[0].id;

    // Then get documents for this user (without file_data to avoid large payloads)
    const documentsResult = await pool.query(
      `SELECT id, document_type, original_filename, file_size, mime_type, created_at
       FROM documents WHERE counselor_id = $1 ORDER BY created_at DESC`,
      [userId]
    );

    res.json({ 
      documents: documentsResult.rows,
      documentsCount: documentsResult.rows.length
    });
  } catch (err) {
    console.error('Error fetching documents by email:', err);
    res.status(500).json({ error: 'Server error' });
  }
};