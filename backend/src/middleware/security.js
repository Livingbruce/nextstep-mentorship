import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';
import crypto from 'crypto';

// Rate limiting configurations
export const createRateLimit = (windowMs, max, message) => 
  rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      console.warn(`Rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({ 
        error: message,
        retryAfter: Math.round(windowMs / 1000)
      });
    }
  });

// General API rate limiting
export const generalLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  100, // 100 requests per window
  'Too many requests from this IP, please try again later'
);

// Auth endpoints rate limiting (stricter)
export const authLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  50, // 50 login attempts per window (increased for development)
  'Too many authentication attempts, please try again later'
);

// Bot message rate limiting
export const botLimiter = createRateLimit(
  60 * 1000, // 1 minute
  30, // 30 messages per minute
  'Too many messages, please slow down'
);

// Input validation middleware
export const validateInput = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Invalid input',
      details: errors.array()
    });
  }
  next();
};

// Sanitize input data
export const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      return obj
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
        .replace(/javascript:/gi, '') // Remove javascript: protocols
        .replace(/on\w+\s*=/gi, '') // Remove event handlers
        .trim();
    }
    if (typeof obj === 'object' && obj !== null) {
      const sanitized = {};
      for (const key in obj) {
        sanitized[key] = sanitize(obj[key]);
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }
  if (req.query) {
    req.query = sanitize(req.query);
  }
  if (req.params) {
    req.params = sanitize(req.params);
  }
  
  next();
};

// AI/Spam detection
export const detectAISpam = (req, res, next) => {
  const suspiciousPatterns = [
    /gpt|chatgpt|openai|claude|bard|ai assistant/gi,
    /as an ai|i am an ai|i'm an ai/gi,
    /i cannot|i can't help|i am not able/gi,
    /i am a language model|i am a computer program/gi,
    /i don't have personal|i don't have feelings/gi
  ];

  const text = JSON.stringify(req.body).toLowerCase();
  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(text));

  if (isSuspicious) {
    console.warn(`Potential AI/Spam detected from IP: ${req.ip}`, req.body);
    return res.status(400).json({
      error: 'Invalid request detected'
    });
  }

  next();
};

// Request logging for security monitoring
export const securityLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.counselorId || 'anonymous'
    };

    // Log suspicious activities
    if (res.statusCode >= 400) {
      console.warn('Security Event:', logData);
    } else {
      console.log('Request:', logData);
    }
  });

  next();
};

// Generate secure random tokens
export const generateSecureToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Validate JWT token strength
export const validateTokenStrength = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    if (token && token.length < 20) {
      console.warn(`Weak token detected from IP: ${req.ip}`);
      return res.status(401).json({ error: 'Invalid token' });
    }
  }
  next();
};
