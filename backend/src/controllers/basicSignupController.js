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
      `UPDATE counselors 
       SET email_verification_token = $1,
           email_verification_delivery_status = 'pending',
           email_verification_sent_at = NULL,
           email_verification_attempts = 0,
           email_verification_last_error = NULL
       WHERE id = $2`,
      [verificationToken, newCounselor.id]
    );

    let emailDeliveryStatus = 'pending';
    let emailDeliveryNote = 'Please check your inbox and spam folder for the verification link.';

    if (emailService.canSendTransactionalEmails()) {
    try {
      await emailService.sendEmailVerification(email, firstName, verificationToken);
        await pool.query(
          `UPDATE counselors
             SET email_verification_sent_at = NOW(),
                 email_verification_attempts = email_verification_attempts + 1,
                 email_verification_delivery_status = 'sent',
                 email_verification_last_error = NULL
           WHERE id = $1`,
          [newCounselor.id]
        );
        emailDeliveryStatus = 'sent';
    } catch (emailError) {
      console.error('❌ Failed to send verification email:', emailError);
        await pool.query(
          `UPDATE counselors
             SET email_verification_sent_at = NOW(),
                 email_verification_attempts = email_verification_attempts + 1,
                 email_verification_delivery_status = 'failed',
                 email_verification_last_error = $2
           WHERE id = $1`,
          [newCounselor.id, emailError.message?.substring(0, 500) || 'Email delivery failed']
        );
        emailDeliveryStatus = 'failed';
        emailDeliveryNote = 'We could not send the verification email automatically. Our system will keep retrying and you will receive it shortly.';
      }
    } else {
      await pool.query(
        `UPDATE counselors
           SET email_verification_delivery_status = 'queued',
               email_verification_last_error = 'Email service not configured'
         WHERE id = $1`,
        [newCounselor.id]
      );
      emailDeliveryStatus = 'queued';
      emailDeliveryNote = 'Email delivery is temporarily queued. Once email credentials are configured, we will automatically send the verification link.';
    }

    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      counselor: {
        id: newCounselor.id,
        name: newCounselor.name,
        email: newCounselor.email,
        verificationStatus: newCounselor.verification_status
      },
      emailStatus: emailDeliveryStatus,
      emailNote: emailDeliveryNote,
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
        message: 'You can now complete your counselor registration.',
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

export const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const counselorResult = await pool.query(
      `SELECT id, name, email_confirmed, email_verification_token, email_verification_attempts
       FROM counselors
       WHERE email = $1`,
      [email]
    );

    if (counselorResult.rows.length === 0) {
      return res.status(404).json({ error: "Account not found for that email" });
    }

    const counselor = counselorResult.rows[0];

    if (counselor.email_confirmed) {
      return res.status(200).json({
        success: true,
        message: "Email already confirmed. You can log in.",
        emailStatus: "delivered",
      });
    }

    let token = counselor.email_verification_token;
    if (!token) {
      const crypto = await import("crypto");
      token = crypto.randomBytes(32).toString("hex");

      await pool.query(
        `UPDATE counselors
           SET email_verification_token = $1,
               email_verification_delivery_status = 'pending',
               email_verification_attempts = 0,
               email_verification_sent_at = NULL,
               email_verification_last_error = NULL
         WHERE id = $2`,
        [token, counselor.id]
      );
    }

    if (!emailService.canSendTransactionalEmails()) {
      await pool.query(
        `UPDATE counselors
           SET email_verification_delivery_status = 'queued',
               email_verification_last_error = 'Email service not configured'
         WHERE id = $1`,
        [counselor.id]
      );
      return res.status(202).json({
        success: true,
        emailStatus: "queued",
        message:
          "Email delivery is temporarily queued. We will resend as soon as email credentials are available.",
      });
    }

    try {
      const firstName = counselor.name?.split(" ")?.[0] || "Counselor";
      await emailService.sendEmailVerification(email, firstName, token);
      await pool.query(
        `UPDATE counselors
           SET email_verification_sent_at = NOW(),
               email_verification_attempts = email_verification_attempts + 1,
               email_verification_delivery_status = 'sent',
               email_verification_last_error = NULL
         WHERE id = $1`,
        [counselor.id]
      );

      res.status(200).json({
        success: true,
        emailStatus: "sent",
        message: "Verification email resent successfully.",
      });
    } catch (error) {
      await pool.query(
        `UPDATE counselors
           SET email_verification_sent_at = NOW(),
               email_verification_attempts = email_verification_attempts + 1,
               email_verification_delivery_status = 'failed',
               email_verification_last_error = $2
         WHERE id = $1`,
        [counselor.id, error.message?.substring(0, 500) || "Email delivery failed"]
      );

      res.status(500).json({
        success: false,
        emailStatus: "failed",
        message: "Failed to resend email. We will keep retrying automatically.",
      });
    }
  } catch (error) {
    console.error("Resend verification error:", error);
    res.status(500).json({
      success: false,
      message: "Could not resend verification email. Please try again later.",
    });
  }
};
