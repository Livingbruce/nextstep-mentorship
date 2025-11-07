import { body, param, query } from 'express-validator';

// Authentication validation rules
export const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
];

export const validateProfileUpdate = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Valid phone number is required'),
  body('specialization')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Specialization must be less than 200 characters'),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Bio must be less than 1000 characters'),
  body('office_location')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Office location must be less than 200 characters'),
  body('office_hours')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Office hours must be less than 200 characters')
];

export const validatePasswordChange = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match');
      }
      return true;
    })
];

// Appointment validation
export const validateAppointment = [
  body('student_id')
    .isInt({ min: 1 })
    .withMessage('Valid student ID is required'),
  body('counselor_id')
    .isInt({ min: 1 })
    .withMessage('Valid counselor ID is required'),
  body('start_ts')
    .isISO8601()
    .withMessage('Valid start date is required')
    .custom((value) => {
      const date = new Date(value);
      const now = new Date();
      if (date <= now) {
        throw new Error('Appointment must be in the future');
      }
      return true;
    }),
  body('end_ts')
    .isISO8601()
    .withMessage('Valid end date is required')
];

// Support ticket validation
export const validateSupportTicket = [
  body('subject')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Subject must be between 5 and 200 characters'),
  body('description')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Priority must be low, medium, high, or urgent')
];

// Bot message validation
export const validateBotMessage = [
  body('message')
    .trim()
    .isLength({ min: 1, max: 4000 })
    .withMessage('Message must be between 1 and 4000 characters')
    .custom((value) => {
      // Check for suspicious patterns
      const suspiciousPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+\s*=/i,
        /eval\(/i,
        /document\./i,
        /window\./i
      ];
      
      if (suspiciousPatterns.some(pattern => pattern.test(value))) {
        throw new Error('Message contains potentially harmful content');
      }
      return true;
    })
];

// ID parameter validation
export const validateId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid ID is required')
];

// Query parameter validation
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];
