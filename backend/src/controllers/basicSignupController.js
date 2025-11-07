import bcrypt from 'bcrypt';
import pool from '../db/pool.js';
import emailService from '../services/emailService.js';

export const basicSignup = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['firstName', 'lastName', 'email', 'password']
      });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM counselors WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Account with this email already exists' });
    }

    // Insert new counselor with basic info and email verification status
    const result = await pool.query(
      `INSERT INTO counselors (
        name, email, password_hash, verification_status, 
        is_admin, is_active, email_confirmed
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) 
      RETURNING id, name, email, verification_status`,
      [
        `${firstName} ${lastName}`,
        email, 
        hashedPassword,
        'email_pending', // verification_status
        false,     // is_admin
        false,     // is_active
        false      // email_confirmed
      ]
    );

    const newCounselor = result.rows[0];

    // Generate verification token for email confirmation
    const crypto = await import('crypto');
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    // Update the counselor record with the verification token
    await pool.query(
      'UPDATE counselors SET email_verification_token = $1 WHERE id = $2',
      [verificationToken, newCounselor.id]
    );

    // Send verification email
    try {
      await emailService.sendEmailVerification(email, firstName, verificationToken);
    } catch (emailError) {
      console.error('Email sending failed, but user created:', emailError);
      // Don't fail the signup if email fails, just log it
    }

    res.status(201).json({
      success: true,
      message: 'Account created successfully. Please check your email to confirm your address.',
      counselor: {
        id: newCounselor.id,
        name: newCounselor.name,
        email: newCounselor.email,
        verificationStatus: newCounselor.verification_status
      },
      nextSteps: {
        checkEmail: 'Check your email for a confirmation link',
        clickLink: 'Click the confirmation link to activate your account',
        thenComplete: 'Then you can complete your therapist profile'
      }
    });

  } catch (error) {
    console.error('Basic signup error:', error);
    
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    
    res.status(500).json({ 
      error: 'Failed to create account',
      details: 'Please try again or contact support'
    });
  }
};

export const confirmEmail = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ 
        error: 'Verification token is required',
        message: 'Invalid or missing verification token'
      });
    }

    // Find user by verification token
    const result = await pool.query(
      'SELECT id, name, email, email_confirmed, email_verification_token FROM counselors WHERE email_verification_token = $1',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        error: 'Invalid verification token',
        message: 'The verification token is invalid or expired'
      });
    }

    const user = result.rows[0];

    if (user.email_confirmed) {
      return res.status(400).json({
        error: 'Email already verified',
        message: 'This email address has already been verified'
      });
    }

    // Update user with confirmed email status
    await pool.query(
      `UPDATE counselors 
       SET email_confirmed = true, 
           email_verified_at = NOW(),
           verification_status = 'pending',
           email_verification_token = NULL 
       WHERE id = $1`,
      [user.id]
    );

    console.log(`✅ Email confirmed for user: ${user.email} (ID: ${user.id})`);

    res.status(200).json({
      success: true,
      message: 'Email confirmed successfully! You can now complete your professional registration.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailConfirmed: true
      },
      nextStep: {
        message: 'You can now complete your therapist registration.',
        redirectUrl: '/signup?verified=true'
      }
    });

  } catch (error) {
    console.error('Email confirmation error:', error);
    res.status(500).json({ 
      error: 'Failed to confirm email',
      message: 'There was an error confirming your email. Please try again.'
    });
  }
};
