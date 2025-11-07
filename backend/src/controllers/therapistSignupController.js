import bcrypt from 'bcrypt';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import pool from '../db/pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/therapist_documents');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow PDFs and images
    const allowedTypes = /pdf|jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = file.mimetype.match(/pdf|image\/jpeg|image\/jpg|image\/png/);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF, JPEG, JPG, and PNG files are allowed'));
    }
  }
});

export { upload };

export const therapistSignup = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      therapistId,
      licenseNumber,
      specialization,
      phone,
      country,
      experience,
      bio
    } = req.body;

    // Extract file paths from multer upload
    const files = req.files;
    const licenseDocPath = files.document_license ? files.document_license[0].path : null;
    const idDocPath = files.document_id ? files.document_id[0].path : null;
    const certificateDocPath = files.document_certificate ? files.document_certificate[0].path : null;

    // Validate required fields
    if (!name || !email || !password || !therapistId || !licenseNumber || !specialization || !phone || !country) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['name', 'email', 'password', 'therapistId', 'licenseNumber', 'specialization', 'phone', 'country']
      });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Check if therapist already exists
    const existingTherapist = await pool.query(
      'SELECT id FROM counselors WHERE email = $1 OR therapist_id = $2',
      [email, therapistId]
    );

    if (existingTherapist.rows.length > 0) {
      return res.status(400).json({ error: 'Therapist with this email or ID already exists' });
    }

    // Insert new therapist with verification status
    const result = await pool.query(
      `INSERT INTO counselors (
        name, email, password_hash, therapist_id, license_number, 
        specialization, phone, country, experience_years, bio, 
        verification_status, is_admin, is_active, license_document_path, 
        id_document_path, certificate_document_path
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) 
      RETURNING id, name, email, verification_status, therapist_id`,
      [
        name,
        email, 
        hashedPassword,
        therapistId,
        licenseNumber,
        specialization,
        phone,
        country,
        parseInt(experience) || 0,
        bio || '',
        'pending', // verification_status
        false,     // is_admin
        false,     // is_active (will be activated after verification)
        licenseDocPath,  // license_document_path
        idDocPath,       // id_document_path
        certificateDocPath // certificate_document_path
      ]
    );

    const newTherapist = result.rows[0];

    // TODO: Send verification email to admin/supervisor
    // TODO: Queue for manual verification process

    res.status(201).json({
      success: true,
      message: 'Therapist application submitted successfully',
      therapist: {
        id: newTherapist.id,
        name: newTherapist.name,
        email: newTherapist.email,
        therapistId: newTherapist.therapist_id,
        verificationStatus: newTherapist.verification_status
      },
      nextSteps: {
        verificationEmail: 'Verification email sent to review team',
        estimatedWait: '24-48 hours for verification review',
        documentsPending: 'Documents have been uploaded and will be verified by our team'
      }
    });

  } catch (error) {
    console.error('Therapist signup error:', error);
    
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Email or therapist ID already exists' });
    }
    
    res.status(500).json({ 
      error: 'Failed to process therapist application',
      details: 'Please try again or contact support'
    });
  }
};

export const getVerificationStatus = async (req, res) => {
  try {
    // This endpoint will be used to check verification status
    // before allowing login
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    const result = await pool.query(
      'SELECT id, name, email, verification_status, therapist_id FROM counselors WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Therapist not found' });
    }

    const therapist = result.rows[0];
    
    res.json({
      therapist: {
        id: therapist.id,
        name: therapist.name,
        email: therapist.email,
        therapistId: therapist.therapist_id,
        verificationStatus: therapist.verification_status
      }
    });

  } catch (error) {
    console.error('Verification status error:', error);
    res.status(500).json({ error: 'Failed to get verification status' });
  }
};
