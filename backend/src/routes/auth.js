import express from "express";
import multer from "multer";
import { login, me, changePassword, getProfile, updateProfile, getUserByEmail, getDocumentsByEmail } from "../controllers/authController.js";
import { basicSignup, confirmEmail } from "../controllers/basicSignupController.js";
import { savePersonalInfo, checkEmail } from "../controllers/personalInfoController.js";
import { saveProfessionalInfo } from "../controllers/professionalInfoController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { authLimiter, detectAISpam, validateInput } from "../middleware/security.js";
import { validateLogin, validatePasswordChange, validateProfileUpdate } from "../middleware/validation.js";

// Configure multer for file uploads (memory storage for BLOB saving)
const storage = multer.memoryStorage();

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only images (JPEG, PNG) and PDF files are allowed'));
    }
  }
});

const router = express.Router();

// Basic signup route (before rate limiting for registration)
router.post("/basic-signup", basicSignup);

// Email verification route (before rate limiting)
router.get("/confirm-email", confirmEmail);

// Email check route (before rate limiting)
router.get("/check-email", checkEmail);

// Get user by email route (before rate limiting)
router.get("/get-user-by-email", getUserByEmail);

// Get documents by email route (before rate limiting)
router.get("/get-documents-by-email", getDocumentsByEmail);

// Apply rate limiting to auth routes
router.use(authLimiter);

router.post("/login", validateLogin, validateInput, detectAISpam, login);
router.get("/me", authMiddleware, me);
router.put("/password", authMiddleware, validatePasswordChange, validateInput, changePassword);
router.get("/profile", authMiddleware, getProfile);
router.put("/profile", authMiddleware, validateProfileUpdate, validateInput, updateProfile);
// Personal info route - optional auth (works with or without authentication)
router.post("/personal-info", validateInput, savePersonalInfo);
router.post("/professional-info", upload.any(), validateInput, saveProfessionalInfo);

export default router;