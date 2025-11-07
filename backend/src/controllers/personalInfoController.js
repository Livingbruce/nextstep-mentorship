import pool from '../db/pool.js';

export const checkEmail = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ 
        error: 'Email parameter is required',
        message: 'Please provide an email address'
      
      });
    }

    // Check if user exists and email is confirmed
    const result = await pool.query(
      'SELECT id, name, email, email_confirmed FROM counselors WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Email not found',
        message: 'No account found with this email address'
      });
    }

    const user = result.rows[0];

    if (!user.email_confirmed) {
      return res.status(400).json({ 
        error: 'Email not confirmed',
        message: 'Please confirm your email address first'
      });
    }

    res.json({
      success: true,
      message: 'Email is valid and confirmed',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailConfirmed: true
      }
    });

  } catch (error) {
    console.error('Error checking email:', error);
    res.status(500).json({ 
      error: 'Failed to check email',
      details: 'Please try again or contact support'
    });
  }
};

export const savePersonalInfo = async (req, res) => {
  try {
    // Try to get counselorId from authentication first, fallback to email-based lookup
    let counselorId = null;
    let userEmail = '';
    
    if (req.user && req.user.counselorId) {
      // Authenticated user
      counselorId = req.user.counselorId;
    } 
    
    const {
      gender,
      dateOfBirth,
      religion,
      phone,
      country,
      physicalAddress,
      cityOrTown,
      emergencyContactPhone,
      email // Add email field for non-authenticated requests
    } = req.body;

    // If no authentication, try to find user by email (for post-email confirmation flow)
    if (!counselorId && email) {
      const userResult = await pool.query(
        'SELECT id, email_confirmed FROM counselors WHERE email = $1',
        [email]
      );
      
      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'Account not found for this email' });
      }
      
      if (!userResult.rows[0].email_confirmed) {
        return res.status(400).json({ error: 'Email must be confirmed before saving personal information' });
      }
      
      counselorId = userResult.rows[0].id;
      userEmail = email;
    } else if (!counselorId) {
      return res.status(400).json({ error: 'Please provide email address for verification' });
    }

    console.log('Saving personal info for counselor:', counselorId);
    console.log('Personal info data:', {
      gender, dateOfBirth, religion, phone, country, physicalAddress, cityOrTown, emergencyContactPhone, email: userEmail
    });

    // Update the counselor with personal information
    const result = await pool.query(
      `UPDATE counselors 
       SET gender = $1,
           date_of_birth = $2,
           religion = $3,
           phone = $4,
           country = $5,
           physical_address = $6,
           city_or_town = $7,
           emergency_contact_phone = $8,
           updated_at = NOW()
       WHERE id = $9
       RETURNING id, name, email, gender, date_of_birth, religion, phone, country, physical_address, city_or_town, emergency_contact_phone`,
      [gender, dateOfBirth, religion, phone, country, physicalAddress, cityOrTown, emergencyContactPhone, counselorId]
    );

    console.log('Personal info save result:', result.rows[0]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Counselor not found' });
    }

    res.json({
      success: true,
      message: 'Personal information saved successfully',
      counselor: result.rows[0]
    });

  } catch (error) {
    console.error('Error saving personal information:', error);
    res.status(500).json({ 
      error: 'Failed to save personal information',
      details: 'Please try again or contact support'
    });
  }
};
