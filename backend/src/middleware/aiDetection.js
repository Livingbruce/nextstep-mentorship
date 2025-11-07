import crypto from 'crypto';

// AI detection patterns
const AI_PATTERNS = [
  /as an ai|i am an ai|i'm an ai/gi,
  /i cannot|i can't help|i am not able/gi,
  /i am a language model|i am a computer program/gi,
  /i don't have personal|i don't have feelings/gi,
  /gpt|chatgpt|openai|claude|bard|ai assistant/gi,
  /i'm sorry, but i cannot|i apologize, but i cannot/gi,
  /i am designed to|i am programmed to/gi
];

// Spam patterns
const SPAM_PATTERNS = [
  /click here|buy now|free money|win big/gi,
  /http[s]?:\/\/[^\s]+/gi, // URLs
  /[A-Z]{10,}/g, // Excessive caps
  /(.)\1{4,}/g // Repeated characters
];

// Rate limiting for bot messages
const messageCounts = new Map();
const MESSAGE_LIMIT = 10; // messages per minute
const TIME_WINDOW = 60000; // 1 minute

export const detectAIMessages = (req, res, next) => {
  const text = JSON.stringify(req.body).toLowerCase();
  
  // Check for AI patterns
  const aiDetected = AI_PATTERNS.some(pattern => pattern.test(text));
  const spamDetected = SPAM_PATTERNS.some(pattern => pattern.test(text));
  
  if (aiDetected || spamDetected) {
    console.warn(`AI/Spam detected from IP: ${req.ip}`, {
      aiDetected,
      spamDetected,
      body: req.body
    });
    
    return res.status(400).json({
      error: 'Invalid request detected',
      code: aiDetected ? 'AI_DETECTED' : 'SPAM_DETECTED'
    });
  }
  
  next();
};

export const rateLimitBotMessages = (req, res, next) => {
  const userId = req.user?.counselorId || req.ip;
  const now = Date.now();
  
  if (!messageCounts.has(userId)) {
    messageCounts.set(userId, { count: 1, firstMessage: now });
    return next();
  }
  
  const userData = messageCounts.get(userId);
  
  // Reset if time window has passed
  if (now - userData.firstMessage > TIME_WINDOW) {
    messageCounts.set(userId, { count: 1, firstMessage: now });
    return next();
  }
  
  // Check if limit exceeded
  if (userData.count >= MESSAGE_LIMIT) {
    console.warn(`Rate limit exceeded for user: ${userId}`);
    return res.status(429).json({
      error: 'Too many messages, please slow down',
      retryAfter: Math.ceil((TIME_WINDOW - (now - userData.firstMessage)) / 1000)
    });
  }
  
  // Increment count
  userData.count++;
  next();
};
