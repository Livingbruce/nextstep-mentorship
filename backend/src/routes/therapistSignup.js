import express from 'express';
import { therapistSignup, getVerificationStatus, upload } from '../controllers/therapistSignupController.js';

const router = express.Router();

// POST /api/auth/therapist-signup - Register new therapist for verification
router.post('/', upload.fields([
  { name: 'document_license', maxCount: 1 },
  { name: 'document_id', maxCount: 1 },
  { name: 'document_certificate', maxCount: 1 }
]), therapistSignup);

// GET /api/auth/verification-status - Check verification status
router.get('/verification-status', getVerificationStatus);

export default router;
