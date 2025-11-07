import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import rateLimit from "express-rate-limit";
import slowDown from "express-slow-down";
import mongoSanitize from "express-mongo-sanitize";
import xss from "xss";

import appointmentsRoutes from "./routes/appointments.js";
import booksRoutes from "./routes/books.js";
import bot from "./bot.js";
import { scheduleReminders } from "./scheduler.js";
import slotsRoutes from "./routes/slots.js";
import dashboardRoutes from "./routes/dashboard.js";
import announcementsRoutes from "./routes/announcements.js";
import authRoutes from "./routes/auth.js";
import therapistSignupRoutes from "./routes/therapistSignup.js";
import activitiesRoutes from "./routes/activities.js";
import recentActivityRoutes from "./routes/recentActivity.js";
import mentorshipRoutes from "./routes/mentorships.js";
import counselorsRoutes from "./routes/counselors.js";
import notificationsRoutes from "./routes/notifications.js";

// Security middleware
import { 
  generalLimiter, 
  authLimiter, 
  sanitizeInput, 
  detectAISpam, 
  securityLogger,
  validateTokenStrength 
} from "./middleware/security.js";
import { detectAIMessages, rateLimitBotMessages } from "./middleware/aiDetection.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const app = express();


const normalizeOrigin = (origin) => {
  if (!origin) return origin;
  return origin.replace(/\/+$/, ''); // Remove trailing slashes
};

// Get allowed origins
const frontendUrl = normalizeOrigin(process.env.FRONTEND_URL || 'http://localhost:3000');
const allowedOrigins = [
  frontendUrl,
  `${frontendUrl}/`, // Also allow with trailing slash for flexibility
  'http://localhost:3000',
  'http://localhost:5000'
].filter(Boolean);

// CORS origin function to handle both with and without trailing slash
const corsOrigin = (origin, callback) => {
  // Allow requests with no origin (like mobile apps or curl requests)
  if (!origin) return callback(null, true);
  
  // Normalize the origin (remove trailing slash)
  const normalizedOrigin = normalizeOrigin(origin);
  
  // Check if normalized origin is in allowed list
  if (allowedOrigins.some(allowed => normalizeOrigin(allowed) === normalizedOrigin)) {
    // Return the normalized origin (without trailing slash) to match browser expectation
    return callback(null, normalizedOrigin);
  }
  
  // Reject the request
  return callback(new Error('Not allowed by CORS'));
};

// Security middleware (order matters!)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS logging middleware (for debugging)
app.use((req, res, next) => {
  if (req.method === 'OPTIONS' || req.headers.origin) {
    console.log(`[CORS] ${req.method} ${req.path} - Origin: ${req.headers.origin || 'none'}`);
  }
  next();
});

// CORS configuration with origin function
app.use(cors({
  origin: corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400 // 24 hours
}));

// Explicit OPTIONS handler for preflight requests
app.options('*', (req, res) => {
  const origin = req.headers.origin;
  const normalizedOrigin = normalizeOrigin(origin);
  
  // Check if origin is allowed
  if (allowedOrigins.some(allowed => normalizeOrigin(allowed) === normalizedOrigin)) {
    res.header('Access-Control-Allow-Origin', normalizedOrigin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.header('Access-Control-Max-Age', '86400');
    res.sendStatus(204);
  } else {
    console.log(`[CORS] OPTIONS request rejected - Origin: ${origin}`);
    res.sendStatus(403);
  }
});

// Explicit header override for some proxies/browsers
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    const normalizedOrigin = normalizeOrigin(origin);
    if (allowedOrigins.some(allowed => normalizeOrigin(allowed) === normalizedOrigin)) {
      res.header('Access-Control-Allow-Origin', normalizedOrigin);
      res.header('Access-Control-Allow-Credentials', 'true');
    }
  }
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  next();
});

// Rate limiting
app.use(generalLimiter);

// Slow down repeated requests
app.use(slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // allow 50 requests per 15 minutes, then...
  delayMs: (used, req) => {
    const delayAfter = req.slowDown.limit;
    return (used - delayAfter) * 500;
  }
}));

// Body parsing with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Data sanitization
app.use(mongoSanitize());
app.use(sanitizeInput);

// AI/Spam detection
app.use(detectAISpam);

// Security logging
app.use(securityLogger);

// Token validation
app.use(validateTokenStrength);

// Logging
app.use(morgan("combined"));

app.get("/", (req, res) => {
  res.json({ 
    message: "NextStep Mentorship API", 
    status: "running",
    version: "1.0.0",
    platform: "International Counseling & Therapy Services",
    endpoints: {
      health: "/api/health",
      auth: "/api/auth",
      appointments: "/api/appointments",
      books: "/api/books",
      mentorships: "/api/mentorships",
      counselors: "/api/counselors",
      activities: "/api/activities",
      announcements: "/api/announcements",
      dashboard: "/api/dashboard",
      slots: "/api/slots",
      therapistSignup: "/api/auth/therapist-signup"
    }
  });
});

app.use("/api/announcements", announcementsRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/auth", therapistSignupRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/dashboard/books", booksRoutes);
app.use("/api/appointments", appointmentsRoutes);
app.use("/api/activities", activitiesRoutes);
app.use("/api/books", booksRoutes);
app.use("/api/mentorships", mentorshipRoutes);
app.use("/api/counselors", counselorsRoutes);
app.use("/api/slots", slotsRoutes);
app.use("/api/recent-activity", recentActivityRoutes);
app.use("/api/notifications", notificationsRoutes);

// Public books endpoint for bot (no auth required)
app.get("/api/books/public", async (req, res) => {
  try {
    const pool = (await import("./db/pool.js")).default;
    const result = await pool.query(
      `SELECT b.id, b.title, b.author, b.description, b.price_cents, c.name as counselor_name 
       FROM books b 
       LEFT JOIN counselors c ON b.counselor_id = c.id 
       WHERE b.is_sold = false 
       ORDER BY b.created_at DESC LIMIT 20`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching books:", err);
    res.status(500).json({ error: "Failed to fetch books" });
  }
});

// Public order creation endpoint for bot (no auth required)
app.post("/api/books/orders/public", async (req, res) => {
  try {
    const pool = (await import("./db/pool.js")).default;
    const {
      book_id,
      client_telegram_id,
      client_name,
      client_email,
      client_phone,
      client_address,
      client_city,
      client_country,
      client_county,
      client_postal_code,
      payment_method,
      payment_reference,
      payment_amount_cents,
      shipping_cost_cents,
      total_amount_cents
    } = req.body;
    
    // Validate required fields
    if (!book_id || !client_telegram_id || !client_name || !client_email || !client_phone || 
        !client_address || !client_city || !client_country || !payment_method || !total_amount_cents) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    const result = await pool.query(
      `INSERT INTO book_orders (
        book_id, client_telegram_id, client_name, client_email, client_phone,
        client_address, client_city, client_country, client_county, client_postal_code,
        payment_method, payment_reference, payment_amount_cents, shipping_cost_cents, total_amount_cents
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
      [
        book_id, client_telegram_id, client_name, client_email, client_phone,
        client_address, client_city, client_country, client_county, client_postal_code,
        payment_method, payment_reference, payment_amount_cents, shipping_cost_cents, total_amount_cents
      ]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating book order:", err);
    res.status(500).json({ error: "Failed to create order: " + err.message });
  }
});

// Public client orders endpoint for bot (no auth required)
app.get("/api/books/orders/client/:telegram_id", async (req, res) => {
  try {
    const pool = (await import("./db/pool.js")).default;
    const { telegram_id } = req.params;
    const result = await pool.query(
      `SELECT bo.*, b.title as book_title, b.author as book_author, c.name as counselor_name
       FROM book_orders bo
       JOIN books b ON bo.book_id = b.id
       JOIN counselors c ON b.counselor_id = c.id
       WHERE bo.client_telegram_id = $1
       ORDER BY bo.created_at DESC`,
      [telegram_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching client orders:", err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// Public announcements endpoint for bot (no auth required)
app.get("/api/announcements/public", async (req, res) => {
  try {
    const pool = (await import("./db/pool.js")).default;
    const result = await pool.query(
      `SELECT a.*, c.name as counselor_name 
       FROM announcements a 
       LEFT JOIN counselors c ON a.counselor_id = c.id 
       WHERE a.is_active = true 
       ORDER BY a.created_at DESC LIMIT 10`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching announcements:", err);
    res.status(500).json({ error: "Failed to fetch announcements" });
  }
});

app.get("/api/health", (_, res) => res.json({ status: "ok" }));

// Only start server if not in Vercel environment
if (process.env.VERCEL !== '1') {
  const PORT = process.env.PORT || 5000;
  
  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
  });

  // Only start bot if not in Vercel environment (bot needs separate hosting)
  if (process.env.BOT_TOKEN) {
    bot.launch()
      .then(() => {
        console.log("✅ Telegram bot started successfully");
        console.log("Bot token:", process.env.BOT_TOKEN ? "Present" : "Missing");
      })
      .catch((err) => {
        console.error("❌ Failed to start Telegram bot:", err);
        console.error("Bot token:", process.env.BOT_TOKEN ? "Present" : "Missing");
      });

    scheduleReminders(bot);
  }
}

// Export for Vercel
export default app;