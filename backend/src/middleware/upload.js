import multer from 'multer';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { uploadFileToFirebaseStorage } from "../utils/firebaseStorage.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Detect if we're in a serverless environment (Vercel, etc.)
const isServerless = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME || !fs.existsSync(__dirname);

// Use /tmp for serverless environments (writable), otherwise use relative path
const getUploadDir = (subdir) => {
  if (isServerless) {
    // Use /tmp which is writable in Vercel serverless functions
    return path.join(os.tmpdir(), 'uploads', subdir);
  } else {
    // Use relative path for local development
    return path.join(__dirname, '../../uploads', subdir);
  }
};

const booksDir = getUploadDir('books');
const coversDir = getUploadDir('covers');

// Lazy directory creation function
const ensureDirectories = () => {
  try {
    [booksDir, coversDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  } catch (error) {
    // In serverless environments, directory creation might fail
    // This is okay - we'll handle it when files are actually uploaded
    console.warn('Warning: Could not create upload directories:', error.message);
    throw error; // Re-throw so multer can handle it
  }
};

// Configure storage for book files (PDF, EPUB, etc.)
const bookStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureDirectories();
    cb(null, booksDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-bookid-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${uniqueSuffix}-${name}${ext}`);
  }
});

// Configure storage for cover images
const coverStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureDirectories();
    cb(null, coversDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${uniqueSuffix}-${name}${ext}`);
  }
});

// File filter for book files
const bookFileFilter = (req, file, cb) => {
  const allowedTypes = ['.pdf', '.epub', '.mobi', '.txt', '.doc', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`), false);
  }
};

// File filter for cover images
const coverFileFilter = (req, file, cb) => {
  const allowedTypes = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid image type. Allowed: ${allowedTypes.join(', ')}`), false);
  }
};

// Upload middleware for book files
export const uploadBook = multer({
  storage: bookStorage,
  fileFilter: bookFileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Upload middleware for cover images
export const uploadCover = multer({
  storage: coverStorage,
  fileFilter: coverFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Combined upload middleware for both book and cover files
export const uploadBookAndCover = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      ensureDirectories();
      // Route to appropriate directory based on field name
      if (file.fieldname === 'bookFile') {
        cb(null, booksDir);
      } else if (file.fieldname === 'coverFile') {
        cb(null, coversDir);
      } else {
        cb(new Error('Invalid field name'), null);
      }
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      const name = path.basename(file.originalname, ext);
      cb(null, `${uniqueSuffix}-${name}${ext}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'bookFile') {
      bookFileFilter(req, file, cb);
    } else if (file.fieldname === 'coverFile') {
      coverFileFilter(req, file, cb);
    } else {
      cb(new Error('Invalid field name'), false);
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit (applies to both)
  }
});

// Helper to get file path (for serving files)
export const getFilePath = (filename, type = 'book') => {
  const dir = type === 'book' ? booksDir : coversDir;
  return path.join(dir, filename);
};

/**
 * Upload file to Firebase Storage and return Firebase Storage URL
 * @param {string} filePath - Local file path
 * @param {string} type - 'book' or 'cover'
 * @returns {Promise<string>} Firebase Storage download URL
 */
export const uploadFileToFirebase = async (filePath, type = "book") => {
  try {
    const result = await uploadFileToFirebaseStorage(filePath, { type });
    console.log(`✅ File uploaded to Firebase Storage: ${result.storagePath}`);
    return result.downloadUrl;
  } catch (error) {
    console.error("Error uploading to Firebase Storage:", error);
    return getFileUrl(path.basename(filePath), type);
  }
};

// Helper to get file URL (fallback for local files)
export const getFileUrl = (filename, type = 'book') => {
  // Use VERCEL_URL in production, fallback to other env vars or localhost
  let baseUrl = 'http://localhost:5000';
  
  if (process.env.VERCEL_URL) {
    baseUrl = `https://${process.env.VERCEL_URL}`;
  } else if (process.env.API_BASE_URL) {
    baseUrl = process.env.API_BASE_URL;
  } else if (process.env.BACKEND_URL) {
    baseUrl = process.env.BACKEND_URL;
  }
  
  const path = type === 'book' ? '/api/books/files' : '/api/books/covers';
  return `${baseUrl}${path}/${filename}`;
};

