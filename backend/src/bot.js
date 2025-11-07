import { Telegraf } from "telegraf";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import pool from "./db/pool.js";
import fetch from "node-fetch";
import cron from "node-cron";
import { workingHoursValidator } from "./utils/workingHoursValidator.js";
import { generateUniqueAppointmentCode } from "./utils/appointmentCodeGenerator.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const bot = new Telegraf(process.env.BOT_TOKEN);

// Helper function to get API URL
const getApiUrl = () => {
  // Use API_URL if set, otherwise construct from FRONTEND_URL or use localhost
  if (process.env.API_URL) {
    return process.env.API_URL.replace(/\/$/, ''); // Remove trailing slash
  }
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL.replace(/\/$/, ''); // Remove trailing slash
  }
  return 'http://localhost:5000';
};

// User session management
const userSessions = new Map();

// Booking session management
const bookingSessions = new Map();

// Support session management
const supportSessions = new Map();

// Mentorship application session management
const mentorshipSessions = new Map();

// Review session management
const reviewSessions = new Map();

// Book ordering session management
const bookOrderSessions = new Map();

// Helper function to get or create user session
async function getUserSession(telegramUserId, userInfo = {}) {
  try {
    // Check if user exists in database
    const userResult = await pool.query(
      "SELECT * FROM user_sessions WHERE telegram_user_id = $1",
      [telegramUserId]
    );

    if (userResult.rows.length === 0) {
      // Create new user session
      const newUser = await pool.query(
        `INSERT INTO user_sessions (telegram_user_id, telegram_username, first_name, last_name)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [
          telegramUserId,
          userInfo.username || null,
          userInfo.first_name || null,
          userInfo.last_name || null
        ]
      );
      return newUser.rows[0];
    } else {
      // Update user info if needed
      if (userInfo.username || userInfo.first_name || userInfo.last_name) {
        await pool.query(
          `UPDATE user_sessions 
           SET telegram_username = COALESCE($2, telegram_username),
               first_name = COALESCE($3, first_name),
               last_name = COALESCE($4, last_name),
               updated_at = now()
           WHERE telegram_user_id = $1`,
          [
            telegramUserId,
            userInfo.username || null,
            userInfo.first_name || null,
            userInfo.last_name || null
          ]
        );
      }
      return userResult.rows[0];
    }
  } catch (err) {
    console.error("Error managing user session:", err);
    return null;
  }
}

// Helper function to get setting value from database
async function getSetting(key, defaultValue = null) {
  try {
    const result = await pool.query(
      'SELECT value FROM settings WHERE key = $1',
      [key]
    );
    return result.rows.length > 0 ? (result.rows[0].value || defaultValue) : defaultValue;
  } catch (err) {
    console.error(`Error fetching setting ${key}:`, err);
    return defaultValue;
  }
}

async function getDashboardContacts() {
  try {
    const result = await pool.query(
      `SELECT id, name, type, phone, email, location, website, description, is_primary, is_urgent
       FROM contacts
       ORDER BY is_primary DESC, display_order ASC, name ASC`
    );
    return result.rows;
  } catch (err) {
    console.error("Error fetching dashboard contacts:", err);
    return [];
  }
}

// Helper function to get user's appointments
async function getUserAppointments(telegramUserId) {
  try {
    const result = await pool.query(
      `SELECT a.*, s.name as student_name, s.admission_no, s.phone, s.year_of_study as year,
              cn.name as counselor_name, cl.full_name as client_name
       FROM appointments a
       LEFT JOIN students s ON a.student_id = s.id
       LEFT JOIN clients cl ON a.client_id = cl.id
       LEFT JOIN counselors cn ON a.counselor_id = cn.id
       WHERE (a.telegram_user_id = $1 OR cl.telegram_user_id = $1)
         AND (a.status IS NULL OR a.status <> 'cancelled')
       ORDER BY COALESCE(a.start_ts, a.appointment_date) DESC`,
      [telegramUserId]
    );
    return result.rows;
  } catch (err) {
    console.error("Error fetching user appointments:", err);
    return [];
  }
}

// Helper function to escape Markdown special characters for Telegram
function escapeMarkdown(text) {
  if (!text) return '';
  return String(text)
    .replace(/\_/g, '\\_')    // Underscore (causes italic/underline issues)
    .replace(/\*/g, '\\*')    // Asterisk (causes bold/italic issues)
    .replace(/\[/g, '\\[')    // Square brackets (used for links)
    .replace(/\]/g, '\\]')    // Square brackets (used for links)
    .replace(/\(/g, '\\(')    // Parentheses (used in links)
    .replace(/\)/g, '\\)')    // Parentheses (used in links)
    .replace(/\~/g, '\\~')    // Tilde (used for strikethrough)
    .replace(/\`/g, '\\`');   // Backtick (used for code)
}

// Helper function to format appointment date
function formatAppointmentDate(dateString) {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes();
  
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  
  return `${month}/${day}/${year}, ${displayHour}:${minute.toString().padStart(2, '0')} ${ampm}`;
}

// Support system functions
async function createSupportTicket(telegramUserId, telegramUsername, subject, description, priority = 'medium', category = 'General') {
  try {
    // Get student info if available
    const studentResult = await pool.query(
      "SELECT name, admission_no FROM students WHERE id IN (SELECT student_id FROM appointments WHERE telegram_user_id = $1) LIMIT 1",
      [telegramUserId]
    );
    
    const studentName = studentResult.rows.length > 0 ? studentResult.rows[0].name : null;
    const admissionNo = studentResult.rows.length > 0 ? studentResult.rows[0].admission_no : null;
    
    const result = await pool.query(
      `INSERT INTO support_tickets (telegram_user_id, telegram_username, student_name, admission_no, subject, description, priority, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, created_at`,
      [telegramUserId, telegramUsername, studentName, admissionNo, subject, description, priority, category]
    );
    
    return result.rows[0];
  } catch (err) {
    console.error("Error creating support ticket:", err);
    return null;
  }
}

async function getUserSupportTickets(telegramUserId) {
  try {
    const result = await pool.query(
      `SELECT st.*, c.name as assigned_counselor_name
       FROM support_tickets st
       LEFT JOIN counselors c ON st.assigned_counselor_id = c.id
       WHERE st.telegram_user_id = $1
       ORDER BY st.created_at DESC`,
      [telegramUserId]
    );
    return result.rows;
  } catch (err) {
    console.error("Error fetching user support tickets:", err);
    return [];
  }
}

// Mentorship application helpers
function startMentorshipApplicationSession(userId) {
  mentorshipSessions.set(userId, {
    step: 'list_programs',
    data: {}
  });
}

function getMentorshipSession(userId) {
  return mentorshipSessions.get(userId);
}

function clearMentorshipSession(userId) {
  mentorshipSessions.delete(userId);
}

// Review session helpers
function startReviewSession(userId, appointmentId) {
  reviewSessions.set(userId, {
    step: 'rating',
    appointmentId: appointmentId,
    data: {}
  });
}

function getReviewSession(userId) {
  return reviewSessions.get(userId);
}

function clearReviewSession(userId) {
  reviewSessions.delete(userId);
}

// Book ordering session helpers
function startBookOrderSession(userId) {
  bookOrderSessions.set(userId, {
    step: 'list_books',
    data: {}
  });
}

function getBookOrderSession(userId) {
  return bookOrderSessions.get(userId);
}

function clearBookOrderSession(userId) {
  bookOrderSessions.delete(userId);
}

async function handleMentorshipStep(ctx, session, userId, text) {
  try {
    switch (session.step) {
      case 'list_programs': {
        const { rows } = await pool.query(
          `SELECT id, title, description, price_cents, counselor_id FROM mentorship_programs ORDER BY created_at DESC LIMIT 20`
        );
        if (!rows || rows.length === 0) {
          clearMentorshipSession(userId);
          return ctx.reply("📘 **Mentorship Programs**\n\n⚠️ Coming soon...\n\nNo mentorship programs are available at the moment. Check back later for new programs!");
        }
        let msg = "📘 Available Mentorship Programs:\n\n";
        rows.forEach((p, i) => {
          const price = typeof p.price_cents === 'number' ? `KSh ${(p.price_cents / 100).toFixed(2)}` : 'KSh 0.00';
          msg += `${i + 1}. ${p.title} — ${price}\n`;
          if (p.description) msg += `   ${p.description}\n`;
          msg += "\n";
        });
        msg += "Reply with the number of the program you want to apply for.";
        session.step = 'choose_program';
        session.data.programs = rows;
        return ctx.reply(msg);
      }
      case 'choose_program': {
        const choice = parseInt(text, 10);
        const programs = session.data.programs || [];
        if (!Number.isInteger(choice) || choice < 1 || choice > programs.length) {
          return ctx.reply("Please reply with a valid number from the list above.");
        }
        const program = programs[choice - 1];
        session.data.program = program;
        session.step = 'applicant_name';
        return ctx.reply("Great! What's your full name?");
      }
      case 'applicant_name': {
        session.data.applicant_name = text.trim();
        session.step = 'contact_info';
        return ctx.reply("Thanks. What's your contact info (phone or email)?");
      }
      case 'contact_info': {
        session.data.contact_info = text.trim();
        session.step = 'payment_method';
        return ctx.reply("Select your payment method: type 'M-Pesa' or 'Bank'.");
      }
      case 'payment_method': {
        const method = text.trim().toLowerCase();
        if (method !== 'm-pesa' && method !== 'mpesa' && method !== 'bank') {
          return ctx.reply("Please type 'M-Pesa' or 'Bank'");
        }
        session.data.payment_method = method.startsWith('m') ? 'M-Pesa' : 'Bank';
        if (session.data.payment_method === 'M-Pesa') {
          session.step = 'payment_reference';
          return ctx.reply("Enter your M-Pesa transaction code (e.g., QXT123ABC4).");
        } else {
          session.step = 'payment_reference';
          return ctx.reply("Enter your bank payment details (bank name and reference number).");
        }
      }
      case 'payment_reference': {
        session.data.payment_reference = text.trim();
        session.step = 'additional_details';
        return ctx.reply("Any additional details you'd like to include? If none, type 'none'.");
      }
      case 'additional_details': {
        if (text.trim().toLowerCase() !== 'none') {
          session.data.additional_details = text.trim();
        }
        const p = session.data.program;
        const price = typeof p.price_cents === 'number' ? `KSh ${(p.price_cents / 100).toFixed(2)}` : 'KSh 0.00';
        let confirmMsg = "Please confirm your application:\n\n";
        confirmMsg += `Program: ${p.title} (${price})\n`;
        confirmMsg += `Name: ${session.data.applicant_name}\n`;
        confirmMsg += `Contact: ${session.data.contact_info}\n`;
        confirmMsg += `Payment: ${session.data.payment_method} (${session.data.payment_reference})\n`;
        if (session.data.additional_details) confirmMsg += `Details: ${session.data.additional_details}\n`;
        confirmMsg += "\nType 'yes' to submit or 'no' to cancel.";
        session.step = 'confirm_submit';
        return ctx.reply(confirmMsg);
      }
      case 'confirm_submit': {
        const response = text.trim().toLowerCase();
        if (response !== 'yes' && response !== 'y') {
          clearMentorshipSession(userId);
          return ctx.reply("Application canceled. If you want to try again, type /mentorships.");
        }
        const p = session.data.program;
        const insert = await pool.query(
          `INSERT INTO mentorship_applications (
            program_id, program_title, applicant_name, contact_info, payment_method, payment_reference,
            additional_details, status, counselor_id, telegram_user_id, telegram_username
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,'submitted',$8,$9,$10) RETURNING id`,
          [
            p.id || null,
            p.title,
            session.data.applicant_name,
            session.data.contact_info,
            session.data.payment_method,
            session.data.payment_reference,
            session.data.additional_details || null,
            p.counselor_id || null,
            ctx.from.id,
            ctx.from.username || null
          ]
        );

        clearMentorshipSession(userId);
        return ctx.reply(`✅ Application submitted! Your reference is #${insert.rows[0].id}.\nA counselor will review your payment and contact you.`);
      }
      default:
        clearMentorshipSession(userId);
        return ctx.reply("Let's start over. Type /mentorships to see programs.");
    }
  } catch (err) {
    console.error('Mentorship flow error:', err);
    clearMentorshipSession(userId);
    return ctx.reply("Sorry, something went wrong. Please type /mentorships to try again.");
  }
}

async function handleBookOrderStep(ctx, session, userId, text) {
  try {
    switch (session.step) {
      case 'list_books': {
        // Fetch books from the public API endpoint
        const apiUrl = getApiUrl();
        const response = await fetch(`${apiUrl}/api/books/public`);
        if (!response.ok) {
          throw new Error('Failed to fetch books');
        }
        const rows = await response.json();
        
        if (!rows || rows.length === 0) {
          clearBookOrderSession(userId);
          return ctx.reply("📚 **Books for Sale**\n\n⚠️ Coming soon...\n\nNo books are available for sale at the moment. Check back later for new releases!");
        }
        
        let msg = "📚 Available Books for Sale:\n\n";
        rows.forEach((book, i) => {
          const price = typeof book.price_cents === 'number' ? `KSh ${(book.price_cents / 100).toFixed(2)}` : 'KSh 0.00';
          msg += `${i + 1}. ${book.title} by ${book.author || 'Unknown Author'}\n`;
          msg += `   Price: ${price}\n`;
          if (book.description) msg += `   Description: ${book.description}\n`;
          msg += "\n";
        });
        msg += "Do you want to buy a book? Reply with the number of the book you want to purchase, or type 'no' to cancel.";
        session.step = 'choose_book';
        session.data.books = rows;
        return ctx.reply(msg);
      }
      
      case 'choose_book': {
        if (text.toLowerCase() === 'no') {
          clearBookOrderSession(userId);
          return ctx.reply("Book ordering canceled. Type /books if you want to browse books again.");
        }
        
        const choice = parseInt(text, 10);
        const books = session.data.books || [];
        if (!Number.isInteger(choice) || choice < 1 || choice > books.length) {
          return ctx.reply("Please reply with a valid number from the list above, or type 'no' to cancel.");
        }
        
        const selectedBook = books[choice - 1];
        session.data.selectedBook = selectedBook;
        session.step = 'contact_info';
        
        return ctx.reply(`📚 You selected: ${selectedBook.title} by ${selectedBook.author || 'Unknown Author'}\nPrice: KSh ${(selectedBook.price_cents / 100).toFixed(2)}\n\nPlease provide your contact information:\n\n1. Full Name:`);
      }
      
      case 'contact_info': {
        if (!session.data.contactName) {
          session.data.contactName = text.trim();
          session.step = 'contact_info';
          return ctx.reply("2. Email Address:");
        } else if (!session.data.contactEmail) {
          session.data.contactEmail = text.trim();
          session.step = 'contact_info';
          return ctx.reply("3. Phone Number:");
        } else if (!session.data.contactPhone) {
          session.data.contactPhone = text.trim();
          session.step = 'address_info';
          return ctx.reply("4. Full Address (Street, Building, etc.):");
        }
      }
      
      case 'address_info': {
        if (!session.data.address) {
          session.data.address = text.trim();
          session.step = 'address_info';
          return ctx.reply("5. City:");
        } else if (!session.data.city) {
          session.data.city = text.trim();
          session.step = 'address_info';
          return ctx.reply("6. Country:");
        } else if (!session.data.country) {
          session.data.country = text.trim();
          session.step = 'address_info';
          return ctx.reply("7. County/State (optional):");
        } else if (!session.data.county) {
          session.data.county = text.trim();
          session.step = 'address_info';
          return ctx.reply("8. Postal Code (optional):");
        } else if (!session.data.postalCode) {
          session.data.postalCode = text.trim();
          session.step = 'payment_method';
          return ctx.reply("9. Payment Method (M-Pesa or Bank Transfer):");
        }
      }
      
      case 'payment_method': {
        const paymentMethod = text.trim().toLowerCase();
        if (!['m-pesa', 'mpesa', 'bank', 'bank transfer'].includes(paymentMethod)) {
          return ctx.reply("Please choose either 'M-Pesa' or 'Bank Transfer' as your payment method.");
        }
        
        session.data.paymentMethod = paymentMethod.includes('mpesa') ? 'M-Pesa' : 'Bank Transfer';
        session.step = 'payment_details';
        
        if (paymentMethod.includes('mpesa')) {
          return ctx.reply("10. M-Pesa Payment Details:\nPlease provide:\n- Phone number used for M-Pesa\n- Transaction reference (if already paid)\n\nFormat: Phone Number, Transaction Reference\nExample: 254712345678, QXY123456789");
        } else {
          return ctx.reply("10. Bank Transfer Details:\nPlease provide:\n- Bank name\n- Account number\n- Transaction reference (if already paid)\n\nFormat: Bank Name, Account Number, Transaction Reference\nExample: Equity Bank, 1234567890, T123456789");
        }
      }
      
      case 'payment_details': {
        session.data.paymentDetails = text.trim();
        session.step = 'confirm_order';
        
        const book = session.data.selectedBook;
        const shippingCost = 500; // KSh 500 shipping cost
        const totalAmount = book.price_cents + shippingCost;
        
        let confirmMsg = `📋 Order Summary:\n\n`;
        confirmMsg += `📚 Book: ${book.title} by ${book.author || 'Unknown Author'}\n`;
        confirmMsg += `💰 Book Price: KSh ${(book.price_cents / 100).toFixed(2)}\n`;
        confirmMsg += `📦 Shipping: KSh ${(shippingCost / 100).toFixed(2)}\n`;
        confirmMsg += `💳 Total: KSh ${(totalAmount / 100).toFixed(2)}\n\n`;
        confirmMsg += `👤 Customer: ${session.data.contactName}\n`;
        confirmMsg += `📧 Email: ${session.data.contactEmail}\n`;
        confirmMsg += `📞 Phone: ${session.data.contactPhone}\n`;
        confirmMsg += `📍 Address: ${session.data.address}, ${session.data.city}, ${session.data.country}\n`;
        if (session.data.county) confirmMsg += `🏘️ County: ${session.data.county}\n`;
        if (session.data.postalCode) confirmMsg += `📮 Postal Code: ${session.data.postalCode}\n`;
        confirmMsg += `💳 Payment: ${session.data.paymentMethod}\n`;
        confirmMsg += `📝 Details: ${session.data.paymentDetails}\n\n`;
        confirmMsg += `Type 'confirm' to place this order, or 'cancel' to abort.`;
        
        return ctx.reply(confirmMsg);
      }
      
      case 'confirm_order': {
        if (text.toLowerCase() === 'cancel') {
          clearBookOrderSession(userId);
          return ctx.reply("Order canceled. Type /books if you want to browse books again.");
        }
        
        if (text.toLowerCase() !== 'confirm') {
          return ctx.reply("Please type 'confirm' to place the order or 'cancel' to abort.");
        }
        
        // Create the order
        const book = session.data.selectedBook;
        const shippingCost = 500; // KSh 500 shipping cost
        const totalAmount = book.price_cents + shippingCost;
        
        try {
          const apiUrl = getApiUrl();
          const response = await fetch(`${apiUrl}/api/books/orders/public`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              book_id: book.id,
              client_telegram_id: userId.toString(),
              client_name: session.data.contactName,
              client_email: session.data.contactEmail,
              client_phone: session.data.contactPhone,
              client_address: session.data.address,
              client_city: session.data.city,
              client_country: session.data.country,
              client_county: session.data.county || null,
              client_postal_code: session.data.postalCode || null,
              payment_method: session.data.paymentMethod,
              payment_reference: session.data.paymentDetails,
              payment_amount_cents: book.price_cents,
              shipping_cost_cents: shippingCost,
              total_amount_cents: totalAmount
            })
          });
          
          if (response.ok) {
            const orderData = await response.json();
            clearBookOrderSession(userId);
            return ctx.reply(`✅ Order placed successfully!\n\nOrder ID: #${orderData.id}\nTotal Amount: KSh ${(totalAmount / 100).toFixed(2)}\n\nA counselor will review your payment and process your order. You'll receive updates on your order status.\n\nType /myorders to check your order status anytime.`);
          } else {
            throw new Error('Failed to create order');
          }
        } catch (err) {
          console.error('Order creation error:', err);
          clearBookOrderSession(userId);
          return ctx.reply("Sorry, there was an error placing your order. Please try again later or contact support.");
        }
      }
      
      default:
        clearBookOrderSession(userId);
        return ctx.reply("Let's start over. Type /books to see available books.");
    }
  } catch (err) {
    console.error('Book ordering flow error:', err);
    clearBookOrderSession(userId);
    return ctx.reply("Sorry, something went wrong. Please type /books to try again.");
  }
}

async function getTicketReplies(ticketId) {
  try {
    const result = await pool.query(
      `SELECT sm.*, c.name as counselor_name
       FROM support_messages sm
       LEFT JOIN counselors c ON sm.sender_id = c.id AND sm.sender_type = 'counselor'
       WHERE sm.ticket_id = $1
       ORDER BY sm.created_at ASC`,
      [ticketId]
    );
    return result.rows;
  } catch (err) {
    console.error("Error fetching ticket replies:", err);
    return [];
  }
}

async function addSupportMessage(ticketId, senderType, senderId, message, isInternal = false) {
  try {
    const result = await pool.query(
      `INSERT INTO support_messages (ticket_id, sender_type, sender_id, message, is_internal)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, created_at`,
      [ticketId, senderType, senderId, message, isInternal]
    );
    return result.rows[0];
  } catch (err) {
    console.error("Error adding support message:", err);
    return null;
  }
}

async function getSupportCategories() {
  try {
    const result = await pool.query("SELECT * FROM support_categories WHERE is_active = true ORDER BY name");
    return result.rows;
  } catch (err) {
    console.error("Error fetching support categories:", err);
    return [];
  }
}

// Step-by-step booking functions for international therapy services
function startBookingSession(userId) {
  bookingSessions.set(userId, {
    step: 'greeting',
    data: {}
  });
}

function updateBookingSession(userId, step, data) {
  const session = bookingSessions.get(userId) || { data: {} };
  session.step = step;
  session.data = { ...session.data, ...data };
  // Preserve lastMessageId if it exists in the data
  if (data.lastMessageId) {
    session.lastMessageId = data.lastMessageId;
  }
  bookingSessions.set(userId, session);
}

function getBookingSession(userId) {
  return bookingSessions.get(userId);
}

function clearBookingSession(userId) {
  bookingSessions.delete(userId);
}

function getSupportSession(userId) {
  return supportSessions.get(userId);
}

function updateSupportSession(userId, nextStep, data = {}) {
  const session = supportSessions.get(userId) || { data: {} };
  supportSessions.set(userId, {
    ...session,
    step: nextStep,
    data: { ...session.data, ...data }  // Properly merge data into session.data
  });
}

function clearSupportSession(userId) {
  supportSessions.delete(userId);
}

// Payment processing function for international therapy services
async function initiatePaymentProcess(ctx, appointmentId, data) {
  try {
    // Fetch appointment code from database
    const apptResult = await pool.query(
      'SELECT appointment_code FROM appointments WHERE id = $1',
      [appointmentId]
    );
    const appointmentCode = apptResult.rows[0]?.appointment_code || appointmentId;
    
    // Calculate session cost based on duration
    let sessionCost = 0;
    if (data.session_duration.includes('45')) sessionCost = 2500; // 45 mins = $25
    else if (data.session_duration.includes('60')) sessionCost = 3000; // 60 mins = $30
    else if (data.session_duration.includes('90')) sessionCost = 4000; // 90 mins = $40
    
    // Extract phone number for payment (now we always have phone)
    let paymentPhone = data.contact_phone;
    
    // Clean phone number
    paymentPhone = paymentPhone.replace(/\D/g, ''); // Remove non-digits
    if (paymentPhone.startsWith('254')) {
      paymentPhone = '+' + paymentPhone;
    } else if (!paymentPhone.startsWith('+')) {
      paymentPhone = '+254' + paymentPhone;
    }
    
    // Send payment prompt based on method
    if (data.payment_method.toLowerCase() === 'm-pesa' || data.payment_method.toLowerCase() === 'mpesa') {
      await sendMpesaPaymentPrompt(ctx, appointmentCode, sessionCost, paymentPhone);
    } else if (data.payment_method.toLowerCase() === 'bank' || data.payment_method.toLowerCase() === 'bank transfer') {
      await sendBankPaymentPrompt(ctx, appointmentCode, sessionCost, paymentPhone);
    }
    
  } catch (error) {
    console.error("Payment initiation error:", error);
    ctx.reply("There was an error processing your payment. Please contact support for assistance.");
  }
}

// M-Pesa payment prompt
async function sendMpesaPaymentPrompt(ctx, appointmentCode, amount, phoneNumber) {
  const message = `💳 **M-Pesa Payment Required**\n\n` +
                 `Appointment ID: ${appointmentCode}\n` +
                 `Amount: KES ${amount}\n` +
                 `Phone: ${phoneNumber}\n\n` +
                 `📱 **Payment Instructions:**\n` +
                 `1. You will receive an M-Pesa prompt on ${phoneNumber}\n` +
                 `2. Enter your M-Pesa PIN to complete payment\n` +
                 `3. After payment, your therapist will approve it and you will receive a confirmation message\n\n` +
                 `⏰ **Payment must be completed within 15 minutes**\n\n` +
                 `We'll notify you after the counselor approves your payment.`;
  
  await ctx.reply(message);
  
  // TODO: Integrate with actual M-Pesa API
}

// Bank payment prompt
async function sendBankPaymentPrompt(ctx, appointmentCode, amount, phoneNumber) {
  // Fetch bank details from database
  const bankName = await getSetting('bank_name', 'Bank Transfer');
  const accountName = await getSetting('bank_account_name', 'NextStep Therapy Services');
  const accountNumber = await getSetting('bank_account_number', null);
  const paymentContact = await getSetting('payment_contact_phone', phoneNumber);
  const orgName = await getSetting('organization_name', 'NextStep Therapy Services');
  
  if (!accountNumber) {
    await ctx.reply(`⚠️ **Bank payment information is not yet configured.**\n\nPlease contact support for payment instructions.\n\nContact: ${paymentContact}`);
    return;
  }
  
  const message = `🏦 **Bank Transfer Payment Required**\n\n` +
                 `Appointment ID: ${appointmentCode}\n` +
                 `Amount: KES ${amount}\n` +
                 `Phone: ${phoneNumber}\n\n` +
                 `📱 **Payment Instructions:**\n` +
                 `1. Transfer KES ${amount} to our bank account:\n` +
                 `   Bank: ${bankName}\n` +
                 `   Account Name: ${accountName}\n` +
                 `   Account Number: ${accountNumber}\n\n` +
                 `2. Include your appointment code (${appointmentCode}) as the payment reference\n` +
                 `3. Send proof of payment to ${paymentContact} or reply here with your transaction reference\n` +
                 `4. After payment verification, your appointment will be confirmed\n\n` +
                 `⏰ **Payment must be completed within 24 hours**\n\n` +
                 `We'll notify you after the counselor approves your payment.`;
  
  await ctx.reply(message);
}

// Cash payment instructions
async function sendCashPaymentInstructions(ctx, appointmentCode, amount) {
  const orgName = await getSetting('organization_name', 'NextStep Therapy Services');
  const orgAddress = await getSetting('organization_address', null);
  const orgPhone = await getSetting('organization_phone', null);
  const paymentContact = await getSetting('payment_contact_phone', null);
  
  const contactInfo = paymentContact || orgPhone;
  
  let message = `💰 **Cash Payment Instructions**\n\n` +
                 `Appointment ID: ${appointmentCode}\n` +
                 `Amount: KES ${amount}\n\n`;
  
  if (orgAddress) {
    message += `📍 **Payment Location:**\n` +
               `${orgAddress}\n\n`;
  }
  
  message += `⏰ **Payment Deadline:**\n` +
             `Please pay at least 24 hours before your appointment\n\n`;
  
  if (contactInfo) {
    message += `📞 **Contact:**\n` +
               `Call ${contactInfo} to confirm payment\n\n`;
  }
  
  message += `Your appointment will be confirmed once payment is received!`;
  
  await ctx.reply(message);
}

// Insurance payment instructions
async function sendInsurancePaymentInstructions(ctx, appointmentCode, amount) {
  const orgName = await getSetting('organization_name', 'NextStep Therapy Services');
  const orgPhone = await getSetting('organization_phone', null);
  const paymentContact = await getSetting('payment_contact_phone', null);
  const contactInfo = paymentContact || orgPhone;
  
  let message = `🏥 **Insurance Payment Instructions**\n\n` +
                 `Appointment ID: ${appointmentCode}\n` +
                 `Amount: KES ${amount}\n\n` +
                 `📋 **Next Steps:**\n` +
                 `1. Contact your insurance provider to verify coverage\n` +
                 `2. Provide them with our provider details\n` +
                 `3. Submit any required pre-authorization forms\n` +
                 `4. We'll verify coverage and confirm your appointment\n\n`;
  
  if (contactInfo) {
    message += `📞 **Our Insurance Details:**\n` +
               `Provider: ${orgName}\n` +
               `Contact: ${contactInfo}\n\n`;
  }
  
  message += `Your appointment will be confirmed once insurance is verified!`;
  
  await ctx.reply(message);
}

// Simulate payment confirmation (for testing)
async function simulatePaymentConfirmation(ctx, appointmentId) {
  try {
    // Update appointment status to confirmed
    await pool.query(
      "UPDATE appointments SET status = 'confirmed', payment_status = 'paid' WHERE id = $1",
      [appointmentId]
    );
    
    // Get appointment details
    const appointmentRes = await pool.query(`
      SELECT a.*, c.full_name, c.contact_info, cn.name as counselor_name
      FROM appointments a
      JOIN clients c ON a.client_id = c.id
      JOIN counselors cn ON a.counselor_id = cn.id
      WHERE a.id = $1
    `, [appointmentId]);
    
    if (appointmentRes.rows.length > 0) {
      const appointment = appointmentRes.rows[0];
      
      const appointmentCode = appointment.appointment_code || appointmentId;
      const orgName = await getSetting('organization_name', 'NextStep Therapy Services');
      const successMessage = `🎉 **Payment Confirmed!**\n\n` +
                            `Your therapy session has been successfully booked!\n\n` +
                            `📋 **Appointment Details:**\n` +
                            `ID: ${appointmentCode}\n` +
                            `Date: ${new Date(appointment.appointment_date).toLocaleDateString()}\n` +
                            `Time: ${new Date(appointment.appointment_date).toLocaleTimeString()}\n` +
                            `Duration: ${appointment.session_duration}\n` +
                            `Type: ${appointment.session_type}\n` +
                            `Counselor: ${appointment.counselor_name}\n\n` +
                            `📞 **Contact:** ${appointment.contact_info}\n\n` +
                            `We'll contact you shortly to confirm your appointment details.\n\n` +
                            `Thank you for choosing ${orgName}! 🌟`;
      
      await ctx.reply(successMessage);
    }
  } catch (error) {
    console.error("Payment confirmation error:", error);
    await ctx.reply("Payment was received but there was an error updating your appointment. Please contact support.");
  }
}

function formatBookingSummary(data) {
  return `🧠 **Therapy Session Booking Summary**\n\n` +
         `👤 **Personal Info:**\n` +
         `   Name: ${data.full_name}\n` +
         `   DOB: ${data.date_of_birth}\n` +
         `   Phone: ${data.contact_phone || data.contact_info}\n` +
         `   Email: ${data.contact_email || 'N/A'}\n\n` +
         `📅 **Session Details:**\n` +
         `   Date & Time: ${data.session_datetime}\n` +
         `   Type: ${data.session_type}\n` +
         `   Duration: ${data.session_duration}\n\n` +
         `🎯 **Therapy Context:**\n` +
         `   Reason: ${data.therapy_reason}\n` +
         `   Goals: ${data.session_goals}\n` +
         `   Previous Therapy: ${data.previous_therapy ? 'Yes' : 'No'}\n\n` +
         `🚨 **Emergency Contact:**\n` +
         `   Name: ${data.emergency_contact_name}\n` +
         `   Phone: ${data.emergency_contact_phone}\n\n` +
         `💳 **Payment Method:** ${data.payment_method}\n\n` +
         `Is this information correct? Type 'yes' to confirm and proceed to payment, or 'no' to start over.`;
}

// Test database connection
bot.use(async (ctx, next) => {
  try {
    await pool.query('SELECT 1');
    console.log("Database connection successful");
  } catch (err) {
    console.error("Database connection failed:", err);
  }
  next();
});

// User authentication middleware
bot.use(async (ctx, next) => {
  if (ctx.from) {
    const userSession = await getUserSession(ctx.from.id, {
      username: ctx.from.username,
      first_name: ctx.from.first_name,
      last_name: ctx.from.last_name
    });
    
    if (userSession) {
      ctx.userSession = userSession;
      console.log(`User ${ctx.from.id} (${ctx.from.username || 'no username'}) authenticated`);
    }
  }
  next();
});

// Enhanced start command with more conversational tone
bot.start(async (ctx) => {
  console.log("Bot start command received from user:", ctx.from.username || ctx.from.id);
  
  const welcomeMessage = `Hello ${ctx.from.first_name || 'Student'}! Welcome to NextStep Mentorship Bot.

I'm here to help you with counseling services. You can book appointments, get support, or ask questions.

Here's how I can help you:
• Booking: Click 'Book Appointment' and I'll guide you through it
• Cancel: Type 'cancel' followed by your appointment number  
• My Appointments: Click to see all your bookings
• Support: Click if you need help with anything
• Contact: Click for office information

Everything is simple and I'll guide you through each step.`;
  
  ctx.reply(welcomeMessage, {
    reply_markup: {
      keyboard: [
        ["📅 Book Appointment", "❌ Cancel Appointment"],
        ["Counselors", "📢 Announcements"],
        ["🗓 Activities", "📚 Books for Sale"],
        ["📋 My Appointments", "🆘 Support"],
        ["ℹ️ Help", "📞 Contact"]
      ],
      resize_keyboard: true,
    },
  });
});

// Enhanced counselors display
bot.hears("Counselors", async (ctx) => {
  try {
    const result = await pool.query("SELECT id, name FROM counselors WHERE is_active = true ORDER BY name");
    if (result.rows.length === 0) {
      return ctx.reply("👥 **Counselors**\n\n⚠️ Coming soon...\n\nNo counselors are registered yet. Please check back later!");
    }
    let msg = "👥 **Meet Our Counselors:**\n\n";
    result.rows.forEach((c, i) => {
      msg += `${i + 1}. ${c.name}\n`;
    });
    msg += "\nReady to book?\n";
    msg += "Click 'Book Appointment' and I'll walk you through everything.";
    ctx.reply(msg);
  } catch (err) {
    console.error("Counselors error:", err);
    ctx.reply("I had trouble getting the counselor list. Please try again in a moment.");
  }
});

// Enhanced booking process for international therapy services
bot.hears("📅 Book Appointment", async (ctx) => {
  try {
    // Start booking session
    startBookingSession(ctx.from.id);
    
    const orgName = await getSetting('organization_name', 'NextStep Therapy Services');
    let msg = `🧠 **Welcome to ${orgName}!**\n\n`;
    msg += "👋 Hi there! Would you like to book a therapy session?\n\n";
    msg += "Please reply with:\n";
    msg += "• **Yes** - to start booking\n";
    msg += "• **No** - to cancel\n\n";
    msg += "We offer professional counseling services with flexible scheduling options.";
    
    const replyMsg = await ctx.reply(msg, { parse_mode: 'Markdown' });
    updateBookingSession(ctx.from.id, 'greeting', {});
    const initialSession = getBookingSession(ctx.from.id);
    initialSession.lastMessageId = replyMsg.message_id;
  } catch (err) {
    console.error("Book appointment error:", err);
    ctx.reply("I'm sorry, there was an error processing your booking. Please try again or contact support.");
  }
});

// Step-by-step booking handler will be added at the end

// Enhanced appointments display
bot.hears("📋 My Appointments", async (ctx) => {
  try {
    const appointments = await getUserAppointments(ctx.from.id);
    
    if (appointments.length === 0) {
      return ctx.reply("📋 You don't have any appointments yet!\n\nReady to book your first one? Just click '📅 Book Appointment' and I'll help you! 😊");
    }
    
    let msg = "📋 **Here are your appointments:**\n\n";
    appointments.forEach((appointment, index) => {
      const statusEmoji = appointment.status === 'confirmed' ? "✅" : 
                         appointment.status === 'cancelled' ? "❌" : "⏳";
      const code = escapeMarkdown(appointment.appointment_code || appointment.id);
      
      msg += `${index + 1}. ${statusEmoji} **Appointment: ${code}**\n`;
      if (appointment.student_name) {
        msg += `   👤 Student: ${escapeMarkdown(appointment.student_name)}\n`;
      } else if (appointment.client_name) {
        msg += `   👤 Client: ${escapeMarkdown(appointment.client_name)}\n`;
      }
      msg += `   🏥 Counselor: ${escapeMarkdown(appointment.counselor_name)}\n`;
      msg += `   📅 Date: ${escapeMarkdown(formatAppointmentDate(appointment.start_ts || appointment.appointment_date))}\n`;
      msg += `   📊 Status: ${escapeMarkdown(appointment.status?.toUpperCase() || 'PENDING')}\n\n`;
    });
    
    msg += "💡 **Need to cancel?** Type: `cancel [CODE]`\n";
    msg += "💡 **Check details?** Type: `status [CODE]`\n\n";
    msg += "**I'm here if you need any help!** 😊";
    
    ctx.reply(msg, { parse_mode: 'Markdown' });
  } catch (err) {
    console.error("Error fetching user appointments:", err);
    ctx.reply("Oops! I couldn't load your appointments. Let me try that again! 😅");
  }
});

// Enhanced cancel appointment
bot.hears("❌ Cancel Appointment", async (ctx) => {
  try {
    const appts = await getUserAppointments(ctx.from.id);
    if (appts.length === 0) return ctx.reply("You have no appointments.");
    let msg = "To cancel, reply with: cancel <appointment_code>\n\nYour appointments:\n";
    appts.forEach(a => { 
      const code = a.appointment_code || a.id;
      msg += `• ${code} - ${formatAppointmentDate(a.start_ts || a.appointment_date)} (${a.status || 'pending'})\n`; 
    });
    msg += "\nIf your appointment shows paid, you'll be asked to submit a refund request.";
    ctx.reply(msg);
  } catch (e) {
    ctx.reply("I'm sorry, there was an error processing your request. Please try again or contact support.");
  }
});

// Text-based cancel with refund request
bot.on('text', async (ctx, next) => {
  const text = ctx.message.text.trim();
  if (text.toLowerCase().startsWith('cancel ')) {
    try {
      const code = text.split(/\s+/)[1];
      // Try to find by appointment_code first, then fallback to id (UUID) for backward compatibility
      const { rows } = await pool.query(
        `SELECT a.*, 
                c.name AS counselor_name,
                c.email AS counselor_email,
                c.phone AS counselor_phone
         FROM appointments a
         LEFT JOIN counselors c ON a.counselor_id = c.id
         WHERE (a.appointment_code=$1 OR a.id::text=$1) 
         AND (a.telegram_user_id=$2 OR a.client_id IN (SELECT id FROM clients WHERE telegram_user_id=$2))`,
        [code, ctx.from.id]
      );
      if (rows.length === 0) return ctx.reply("I couldn't find that appointment for your account.");
      const appt = rows[0];

      await pool.query(`UPDATE appointments SET status='cancelled', updated_at=now() WHERE id=$1`, [appt.id]);

      let responseMessage = "Your appointment has been cancelled.";

      if ((appt.payment_status || '').toLowerCase() === 'paid') {
        let contactDetails = "";
        if (appt.counselor_name) {
          contactDetails += `\n• Counselor: ${appt.counselor_name}`;
        }
        if (appt.counselor_phone) {
          contactDetails += `\n• Phone: ${appt.counselor_phone}`;
        }
        if (appt.counselor_email) {
          contactDetails += `\n• Email: ${appt.counselor_email}`;
        }

        responseMessage += "\n\n💡 Your payment was previously confirmed. Please contact your counselor directly to discuss refund options.";
        if (contactDetails) {
          responseMessage += `${contactDetails}`;
        }
      }

      return ctx.reply(responseMessage);
    } catch (e) {
      console.error('Cancel error:', e);
      return ctx.reply("I'm sorry, there was an error processing your request. Please try again or contact support.");
    }
  }
  return next();
});

// Check appointment status
bot.hears(/status ([\w\d]+)/i, async (ctx) => {
  const code = ctx.match[1];
  try {
    // Only allow checking own appointments - try appointment_code first, then id for backward compatibility
    const result = await pool.query(
      `SELECT a.*, s.name as student_name, s.admission_no, s.phone, s.year_of_study as year, c.name as counselor_name,
              cl.full_name as client_name
       FROM appointments a
       LEFT JOIN students s ON a.student_id = s.id
       LEFT JOIN clients cl ON a.client_id = cl.id
       LEFT JOIN counselors c ON a.counselor_id = c.id
       WHERE (a.appointment_code = $1 OR a.id::text = $1) 
       AND (a.telegram_user_id = $2 OR cl.telegram_user_id = $2)`,
      [code, ctx.from.id]
    );
    
    if (result.rows.length === 0) {
      return ctx.reply("Hmm, I couldn't find that appointment or you don't have permission to view it.\n\nClick '📋 My Appointments' to see your appointment codes! 😊");
    }
    
    const appointment = result.rows[0];
    const appointmentCode = appointment.appointment_code || code;
    const appointmentDate = new Date(appointment.start_ts || appointment.appointment_date);
    
    let statusEmoji = "⏳";
    if (appointment.status === 'confirmed') statusEmoji = "✅";
    else if (appointment.status === 'cancelled') statusEmoji = "❌";
    else if (appointment.status === 'pending') statusEmoji = "⏳";
    
    const formattedDate = formatAppointmentDate(appointment.start_ts || appointment.appointment_date);
    
    let msg = `📅 Appointment ${appointmentCode} Status\n\n` +
              `${statusEmoji} Status: ${appointment.status?.toUpperCase() || 'PENDING'}\n`;
    if (appointment.student_name) {
      msg += `👤 Student: ${appointment.student_name}\n`;
      msg += `📞 Phone: ${appointment.phone}\n`;
      msg += `🎓 Year: ${appointment.year}\n`;
    } else if (appointment.client_name) {
      msg += `👤 Client: ${appointment.client_name}\n`;
    }
    msg += `🏥 Counselor: ${appointment.counselor_name}\n` +
           `📅 Date: ${formattedDate}\n`;
    ctx.reply(msg);
  } catch (err) {
    console.error("Status check error:", err);
    ctx.reply("Hmm, I couldn't check that appointment status. Let me try again! 😅");
  }
});

// Help command
bot.hears("ℹ️ Help", async (ctx) => {
  const helpMessage = `ℹ️ **NextStep Mentorship Bot Help**

**🔐 Security:**
• Each user can only access their own appointments
• Your Telegram ID is linked to your appointments
• No one else can see or cancel your appointments

**📅 Booking:**
• Click '📅 Book Appointment' and follow the steps
• No complex commands needed - just answer questions
• The bot guides you through everything step by step

**❌ Canceling:**
• Type: cancel [appointment_code]
• Example: cancel A2B3C4
• Only your own appointments can be canceled

**📋 Viewing:**
• Click '📋 My Appointments' to see all appointments
• Type: status [appointment_code] to check specific appointment

**🔔 Notifications:**
• You'll receive reminders 1 day and 1 hour before appointments
• Notifications are sent automatically

**🏥 Other Features:**
• Counselors - see available counselors
• Announcements - latest updates
• Activities - upcoming events
• Books - available books for sale

**🆘 Support:**
• Click '🆘 Support' to start guided ticket creation
• Type: support to create a support ticket step-by-step
• Type: my tickets to view your support tickets
• Type: reply [ticket_id] [message] to respond to tickets
• Type: urgent for urgent matters

**📞 Contact:**
• Click '📞 Contact' for office information
• All contact details and office hours

**Everything is designed to be simple and easy to use!**`;

  ctx.reply(helpMessage);
});

// Enhanced support system
bot.hears("🆘 Support", async (ctx) => {
  try {
    let msg = "💬 **I'm here to help!** 😊\n\n";
    msg += "If you need help, just type \"support\" and I'll ask you a few simple questions to understand what's wrong.\n\n";
    msg += "You can also:\n";
    msg += "• Type \"my tickets\" to see your previous requests\n";
    msg += "• Type \"urgent\" if you need urgent help\n\n";
    msg += "Don't worry about complicated commands - just talk to me naturally and I'll help you through everything step by step! 😊";
    
    ctx.reply(msg);
  } catch (err) {
    console.error("Support error:", err);
    ctx.reply("Sorry, I'm having trouble right now. Please try again in a moment! 😅");
  }
});

// Enhanced support ticket creation
bot.hears(/^support$/i, async (ctx) => {
  const userId = ctx.from.id;
  
  // Initialize support session
  supportSessions.set(userId, {
    step: 'category',
    data: {}
  });
  
  ctx.reply(`Hi there! I'm here to help you. Let me ask you a few questions to understand how I can best assist you. 😊\n\nWhat's bothering you today? You can tell me about:\n\n• Problems with the app or website\n• School work or grades\n• Personal issues or stress\n• Any other concerns\n\nJust tell me what's on your mind - I'm listening! 💙`);
});

// Handle simple support ticket creation (legacy)
bot.hears(/^support (.+)$/i, async (ctx) => {
  const message = ctx.match[1].trim();
  
  try {
    const ticket = await createSupportTicket(
      ctx.from.id,
      ctx.from.username,
      `Support Request: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`,
      message,
      'medium'
    );
    
    if (ticket) {
      // Add initial message to ticket
      await addSupportMessage(
        ticket.id,
        'student',
        ctx.from.id,
        message,
        false
      );
      
      ctx.reply(`✅ **Support Ticket Created!**\n\n` +
                `**Ticket ID:** #${ticket.id}\n` +
                `**Message:** ${message}\n` +
                `**Status:** Open\n` +
                `**Priority:** Medium\n\n` +
                `A counselor will review your ticket and respond soon.\n\n` +
                `Use \`my tickets\` to check your ticket status.`, 
                { parse_mode: 'Markdown' });
    } else {
      ctx.reply("Hmm, I couldn't create your support ticket. Could you try again? Just type \"support\" and I'll help you through it step by step.");
    }
  } catch (err) {
    console.error("Support ticket creation error:", err);
    ctx.reply("Hmm, I had trouble creating your support ticket. Could you try again? Just type \"support\" and I'll help you.");
  }
});

// Handle support ticket creation (legacy format)
bot.hears(/^help (\d+) (.+)$/i, async (ctx) => {
  const categoryNum = parseInt(ctx.match[1]);
  const message = ctx.match[2].trim();
  
  try {
    const categories = await getSupportCategories();
    
    if (categoryNum < 1 || categoryNum > categories.length) {
      return ctx.reply("Hmm, that doesn't look like a valid category number. Please check the support categories list.");
    }
    
    const category = categories[categoryNum - 1];
    const priority = category.name.toLowerCase().includes('urgent') ? 'urgent' : 'medium';
    
    const ticket = await createSupportTicket(
      ctx.from.id,
      ctx.from.username,
      `${category.name}: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`,
      message,
      priority,
      category.name
    );
    
    if (ticket) {
      // Add initial message to ticket
      await addSupportMessage(
        ticket.id,
        'student',
        ctx.from.id,
        message,
        false
      );
      
      ctx.reply(`✅ **Support Ticket Created!**\n\n` +
                `**Ticket ID:** #${ticket.id}\n` +
                `**Category:** ${category.name}\n` +
                `**Message:** ${message}\n` +
                `**Status:** Open\n` +
                `**Priority:** ${priority.toUpperCase()}\n\n` +
                `A counselor will review your ticket and respond soon.\n\n` +
                `Use \`my tickets\` to check your ticket status.`, 
                { parse_mode: 'Markdown' });
    } else {
      ctx.reply("Hmm, I couldn't create your support ticket. Could you try again? Just type \"support\" and I'll help you.");
    }
  } catch (err) {
    console.error("Support ticket creation error:", err);
    ctx.reply("Hmm, I had trouble creating your support ticket. Could you try again? Just type \"support\" and I'll help you.");
  }
});

// Handle my tickets command
bot.hears(/^my tickets$/i, async (ctx) => {
  try {
    const tickets = await getUserSupportTickets(ctx.from.id);
    
    if (tickets.length === 0) {
      return ctx.reply("You don't have any support tickets yet. If you need help, just type \"support\" and I'll guide you through it.");
    }
    
    let msg = "Here are your support tickets:\n\n";
    
    for (const ticket of tickets) {
      let statusText = '';
      if (ticket.status === 'open') {
        statusText = 'Waiting for counselor';
      } else if (ticket.status === 'replied') {
        statusText = 'Counselor replied - check your messages';
      } else if (ticket.status === 'in_progress') {
        statusText = 'Counselor is working on it';
      } else if (ticket.status === 'resolved') {
        statusText = 'Issue resolved';
      } else {
        statusText = 'Closed';
      }
      
      msg += `Ticket #${ticket.id}\n`;
      msg += `Subject: ${ticket.subject}\n`;
      msg += `Status: ${statusText}\n`;
      msg += `Created: ${new Date(ticket.created_at).toLocaleDateString()}\n`;
      
      // Get replies for this ticket
      const replies = await getTicketReplies(ticket.id);
      if (replies.length > 0) {
        msg += `\nConversation:\n`;
        replies.forEach((reply, index) => {
          const sender = reply.sender_type === 'counselor' ? 'Counselor' : 'You';
          msg += `${sender}: ${reply.message}\n`;
        });
      }
      
      msg += "\n" + "─".repeat(20) + "\n\n";
    }
    
    msg += "Need help? Just type \"support\" and I'll help you create a new ticket.";
    
    ctx.reply(msg);
  } catch (err) {
    console.error("My tickets error:", err);
    ctx.reply("Sorry, I couldn't load your tickets. Please try again.");
  }
});

// Handle student replies to tickets
bot.hears(/^reply (\d+) (.+)$/i, async (ctx) => {
  const ticketId = parseInt(ctx.match[1]);
  const message = ctx.match[2].trim();
  
  try {
    // Check if ticket exists and belongs to user
    const ticketResult = await pool.query(
      "SELECT * FROM support_tickets WHERE id = $1 AND telegram_user_id = $2",
      [ticketId, ctx.from.id]
    );
    
    if (ticketResult.rows.length === 0) {
      return ctx.reply("I couldn't find that support ticket. Make sure you have the right ticket number.");
    }
    
    const ticket = ticketResult.rows[0];
    
    // Add student reply
    await addSupportMessage(
      ticketId,
      'student',
      ctx.from.id,
      message,
      false
    );
    
    // Update ticket status to open if it was closed
    if (ticket.status === 'closed') {
      await pool.query(
        "UPDATE support_tickets SET status = 'open', updated_at = NOW() WHERE id = $1",
        [ticketId]
      );
    }
    
    ctx.reply(`Got it! I've sent your message to the counselor. They'll get back to you soon! `);
              
  } catch (err) {
    console.error("Error adding student reply:", err);
    ctx.reply("Hmm, I had trouble sending your reply. Could you try again? 😅");
  }
});


// Handle satisfaction feedback
bot.hears(/^satisfied (\d+)$/i, async (ctx) => {
  const ticketId = parseInt(ctx.match[1]);
  
  try {
    // Check if ticket exists and belongs to user
    const ticketResult = await pool.query(
      "SELECT * FROM support_tickets WHERE id = $1 AND telegram_user_id = $2",
      [ticketId, ctx.from.id]
    );
    
    if (ticketResult.rows.length === 0) {
      return ctx.reply("Hmm, I couldn't find that ticket. Make sure you have the right ticket number.");
    }
    
    // Update ticket status to resolved
    await pool.query(
      "UPDATE support_tickets SET status = 'resolved', updated_at = NOW() WHERE id = $1",
      [ticketId]
    );
    
    // Add satisfaction message
    await addSupportMessage(
      ticketId,
      'student',
      ctx.from.id,
      'Student marked as satisfied - issue resolved',
      false
    );
    
    ctx.reply(`Great! I've marked your issue as resolved. Thank you for letting me know the counselor helped you.\n\nIf you need help with anything else, just type "support" and I'll be here to help.`);
              
  } catch (err) {
    console.error("Error marking ticket as satisfied:", err);
    ctx.reply("Hmm, I couldn't update your ticket. Could you try again? 😅");
  }
});

// Handle DM-based support - direct message to counselor
bot.hears(/^dm (\d+) (.+)$/i, async (ctx) => {
  const ticketId = parseInt(ctx.match[1]);
  const message = ctx.match[2].trim();
  
  try {
    // Check if ticket exists and belongs to user
    const ticketResult = await pool.query(
      "SELECT * FROM support_tickets WHERE id = $1 AND telegram_user_id = $2",
      [ticketId, ctx.from.id]
    );
    
    if (ticketResult.rows.length === 0) {
      return ctx.reply("I couldn't find that support ticket. Make sure you have the right ticket number.");
    }
    
    const ticket = ticketResult.rows[0];
    
    // Add student message to ticket
    await addSupportMessage(
      ticketId,
      'student',
      ctx.from.id,
      message,
      false
    );
    
    // Update ticket status to open for continued discussion
    await pool.query(
      "UPDATE support_tickets SET status = 'open', updated_at = NOW() WHERE id = $1",
      [ticketId]
    );
    
    ctx.reply(`Perfect! I've sent your message to your counselor. They'll reply when they can! `);
              
  } catch (err) {
    console.error("Error sending DM:", err);
    ctx.reply("Hmm, I couldn't send your message. Could you try again? 😅");
  }
});

// Handle not satisfied feedback
bot.hears(/^not satisfied (\d+)$/i, async (ctx) => {
  const ticketId = parseInt(ctx.match[1]);
  
  try {
    // Check if ticket exists and belongs to user
    const ticketResult = await pool.query(
      "SELECT * FROM support_tickets WHERE id = $1 AND telegram_user_id = $2",
      [ticketId, ctx.from.id]
    );
    
    if (ticketResult.rows.length === 0) {
      return ctx.reply("Hmm, I couldn't find that ticket or you don't have permission to modify it.");
    }
    
    // Update ticket status to open for continued discussion
    await pool.query(
      "UPDATE support_tickets SET status = 'open', updated_at = NOW() WHERE id = $1",
      [ticketId]
    );
    
    // Add not satisfied message
    await addSupportMessage(
      ticketId,
      'student',
      ctx.from.id,
      '❌ Student not satisfied - needs more help',
      false
    );
    
    ctx.reply(`❌ **Ticket #${ticketId} marked as not satisfied**\n\n` +
              `We understand you need more help. A counselor will review your ticket again and provide additional assistance.\n\n` +
              `You can also just reply naturally with more details about what you need - I'll understand and add it to your ticket!`, 
              { parse_mode: 'Markdown' });
              
  } catch (err) {
    console.error("Error marking ticket as not satisfied:", err);
    ctx.reply("Hmm, I had trouble updating your ticket status. Could you try again? 😅");
  }
});

// Handle urgent support
bot.hears(/^urgent$/i, async (ctx) => {
  const urgentMessage = `⚡ **URGENT SUPPORT**\n\n` +
                          `For urgent matters requiring immediate attention:\n\n` +
                          `**Immediate Contact:**\n` +
                       `📞 **Office Phone:** +254-XXX-XXXX\n` +
                       `📧 **Email:** counseling@maseno.ac.ke\n` +
                          `🏢 **Location:** Counseling Office, Main Campus\n\n` +
                          `**Office Hours:**\n` +
                          `Monday - Friday: 8:00 AM - 5:00 PM\n` +
                          `Saturday: 9:00 AM - 1:00 PM\n\n` +
                       `**For urgent matters:**\n` +
                       `Please call the office directly during business hours.\n\n` +
                       `**For regular support:**\n` +
                       `Use the 'Support' button to create a support ticket.`;
  
  ctx.reply(urgentMessage);
});

// Handle feedback
bot.hears(/^feedback$/i, async (ctx) => {
  const feedbackMessage = `💬 **Feedback & Suggestions**\n\n` +
                         `We value your feedback! Type your feedback like this:\n\n` +
                         `**Format:**\n` +
                         `\`feedback [your message]\`\n\n` +
                         `**Example:**\n` +
                         `\`feedback The bot is great but could use a dark mode option\`\n\n` +
                         `**Or use the Support button and select "Feedback" category.**\n\n` +
                         `Thank you for helping us improve our services!`;
  
  ctx.reply(feedbackMessage, { parse_mode: 'Markdown' });
});

// Handle feedback submission
bot.hears(/^feedback (.+)$/i, async (ctx) => {
  const feedback = ctx.match[1].trim();
  
  try {
    const ticket = await createSupportTicket(
      ctx.from.id,
      ctx.from.username,
      `Feedback: ${feedback.substring(0, 50)}${feedback.length > 50 ? '...' : ''}`,
      feedback,
      'low'
    );
    
    if (ticket) {
      await addSupportMessage(
        ticket.id,
        'student',
        ctx.from.id,
        feedback,
        false
      );
      
      ctx.reply(`✅ **Feedback Submitted!**\n\n` +
                `**Ticket ID:** #${ticket.id}\n` +
                `**Message:** ${feedback}\n\n` +
                `Thank you for your feedback! We'll review it and use it to improve our services.`, 
                { parse_mode: 'Markdown' });
    } else {
      ctx.reply("Hmm, I couldn't submit your feedback. Could you try again? 😅");
    }
  } catch (err) {
    console.error("Feedback submission error:", err);
    ctx.reply("Hmm, I had trouble submitting your feedback. Could you try again? 😅");
  }
});

// Contact information
bot.hears("📞 Contact", async (ctx) => {
  try {
    const contacts = await getDashboardContacts();

    if (!contacts || contacts.length === 0) {
      return ctx.reply(
        "📞 Contact Information\n\nWe're updating our directory. Please check back soon or use the 'Support' button for assistance."
      );
    }

    let message = "📞 Contact Information\n\n";

    contacts.forEach((contact, index) => {
      const lines = [];
      lines.push(`${index + 1}. ${contact.name}${contact.is_primary ? " (Primary)" : ""}${contact.is_urgent ? " 🚨" : ""}`);
      if (contact.type) lines.push(`   • Type: ${contact.type}`);
      if (contact.location) lines.push(`   • Location: ${contact.location}`);
      if (contact.phone) lines.push(`   • Phone: ${contact.phone}`);
      if (contact.email) lines.push(`   • Email: ${contact.email}`);
      if (contact.website) lines.push(`   • Website: ${contact.website}`);
      if (contact.description) lines.push(`   • Notes: ${contact.description}`);

      message += lines.join("\n") + "\n\n";
    });

    message += "Need help right away? Use the 'Support' button or type 'urgent'.";

    ctx.reply(message.trim());
  } catch (err) {
    console.error("Contact command error:", err);
    ctx.reply("I couldn't load the contact information right now. Please try again later or use 'Support'.");
  }
});

// Schedule notifications for an appointment
async function scheduleNotifications(appointmentId, telegramUserId, appointmentDate) {
  try {
    // 1 day before notification
    const oneDayBefore = new Date(appointmentDate.getTime() - (24 * 60 * 60 * 1000));
    await pool.query(
      `INSERT INTO notifications (appointment_id, telegram_user_id, notification_type, scheduled_for, status)
       VALUES ($1, $2, '1_day_before', $3, 'pending')`,
      [appointmentId, telegramUserId, oneDayBefore]
    );

    // 1 hour before notification
    const oneHourBefore = new Date(appointmentDate.getTime() - (60 * 60 * 1000));
    await pool.query(
      `INSERT INTO notifications (appointment_id, telegram_user_id, notification_type, scheduled_for, status)
       VALUES ($1, $2, '1_hour_before', $3, 'pending')`,
      [appointmentId, telegramUserId, oneHourBefore]
    );

    console.log(`✅ Notifications scheduled for appointment ${appointmentId}`);
  } catch (err) {
    console.error("Error scheduling notifications:", err);
  }
}

// Notification sending function
async function sendNotifications() {
  try {
    const now = new Date();
    const result = await pool.query(
      `SELECT n.*, a.start_ts, s.name as student_name, c.name as counselor_name
       FROM notifications n
       JOIN appointments a ON n.appointment_id = a.id
       LEFT JOIN students s ON a.student_id = s.id
       LEFT JOIN counselors c ON a.counselor_id = c.id
       WHERE n.status = 'pending' 
       AND n.scheduled_for <= $1
       AND (a.status IS NULL OR a.status != 'cancelled')`,
      [now]
    );

    for (const notification of result.rows) {
      try {
        const appointmentDate = new Date(notification.start_ts);
        const formattedDate = formatAppointmentDate(notification.start_ts);
        
        let message = "";
        if (notification.notification_type === '1_day_before') {
          message = `🔔 **Appointment Reminder**\n\n` +
                   `Your appointment is tomorrow!\n\n` +
                   `📅 Date: ${formattedDate}\n` +
                   `🏥 Counselor: ${notification.counselor_name}\n` +
                   `👤 Student: ${notification.student_name}\n\n` +
                   `Please be on time!`;
        } else if (notification.notification_type === '1_hour_before') {
          message = `🔔 **Appointment Reminder**\n\n` +
                   `Your appointment is in 1 hour!\n\n` +
                   `📅 Date: ${formattedDate}\n` +
                   `🏥 Counselor: ${notification.counselor_name}\n` +
                   `👤 Student: ${notification.student_name}\n\n` +
                   `Please be ready!`;
        }

        await bot.telegram.sendMessage(notification.telegram_user_id, message);
        
        // Mark notification as sent
        await pool.query(
          "UPDATE notifications SET status='sent', sent_at=now() WHERE id=$1",
          [notification.id]
        );
        
        console.log(`✅ Notification sent to user ${notification.telegram_user_id} for appointment ${notification.appointment_id}`);
      } catch (err) {
        console.error(`Error sending notification ${notification.id}:`, err);
        
        // Mark notification as failed
        await pool.query(
          "UPDATE notifications SET status='failed' WHERE id=$1",
          [notification.id]
        );
      }
    }
  } catch (err) {
    console.error("Error in notification system:", err);
  }
}

// Schedule notification checks every minute
cron.schedule('* * * * *', sendNotifications);

// Keep existing handlers for other features
bot.hears("📢 Announcements", async (ctx) => {
  try {
    const apiUrl = getApiUrl();
    const res = await fetch(`${apiUrl}/api/announcements/public`);
    const announcements = await res.json();
    if (!announcements || !announcements.length) {
      return ctx.reply("📢 **Announcements**\n\n⚠️ Coming soon...\n\nNo announcements at the moment. Check back later for updates!");
    }
    let msg = "📢 **Latest Announcements:**\n\n";
    announcements.forEach((a, i) => {
      msg += `${i + 1}. ${a.message}\n🏥 By: ${a.counselor_name || "Counselor"}\n📆 ${new Date(a.created_at).toLocaleString()}\n\n`;
    });
    ctx.reply(msg);
  } catch (err) {
    console.error("Error fetching announcements:", err);
    ctx.reply("⚠️ Failed to load announcements. Please try again later.");
  }
});

bot.hears("🗓 Activities", async (ctx) => {
  try {
    const apiUrl = getApiUrl();
    const res = await fetch(`${apiUrl}/api/activities`);
    const activities = await res.json();
    console.log("Bot received activities:", activities);
    
    if (!activities || !activities.length) {
      return ctx.reply("🗓 **Activities**\n\n⚠️ Coming soon...\n\nNo upcoming activities at the moment. Check back later for events and activities!");
    }
    
    let msg = "🗓 **Upcoming Activities:**\n\n";
    activities.forEach((a, i) => {
      console.log(`Processing activity ${i + 1}:`, { 
        title: a.title, 
        activity_date: a.activity_date, 
        activity_time: a.activity_time 
      });
      
      // Extract just the date part if it's a timestamp
      const datePart = a.activity_date && a.activity_date.includes('T') ? 
        a.activity_date.split('T')[0] : 
        a.activity_date;
      
      // Format time to HH:mm if it comes as HH:mm:ss
      const time = a.activity_time ? a.activity_time.substring(0, 5) : "00:00";
      const dateTime = `${datePart}T${time}`;
      
      console.log(`Formatted dateTime: ${dateTime}`);
      
      const formattedDate = new Date(dateTime).toLocaleString();
      console.log(`Final formatted date: ${formattedDate}`);
      
      msg += `${i + 1}. ${a.title}\n📆 ${formattedDate}\n${a.description || ""}\n\n`;
    });
    ctx.reply(msg);
  } catch (err) {
    console.error("Bot activities error:", err);
    ctx.reply("⚠️ Could not load activities.");
  }
});

bot.hears("📚 Books for Sale", async (ctx) => {
  try {
    console.log("📚 Books command triggered");
    startBookOrderSession(ctx.from.id);
    await handleBookOrderStep(ctx, getBookOrderSession(ctx.from.id), ctx.from.id, '');
  } catch (err) {
    console.error("❌ Books fetch error:", err);
    ctx.reply("⚠️ Could not load books.");
  }
});

bot.hears("🧑‍🤝‍🧑 Peer Counseling Registration", async (ctx) => {
  ctx.reply("🧑‍🤝‍🧑 Peer Counseling Registration will be available next year.");
});

// Test command removed - not needed in production

// Support session handler - fix variable declaration issue
async function handleSupportSession(ctx, session, userId, text) {
  try {
    switch (session.step) {
      case 'category':
        // Analyze the text to determine category
        const lowerText = text.toLowerCase();
        let category = 'General';
        
        if (lowerText.includes('login') || lowerText.includes('app') || lowerText.includes('website') || 
            lowerText.includes('technical') || lowerText.includes('bug') || lowerText.includes('error')) {
          category = 'Technical';
        } else if (lowerText.includes('school') || lowerText.includes('grade') || lowerText.includes('exam') || 
                   lowerText.includes('assignment') || lowerText.includes('course') || lowerText.includes('study') ||
                   lowerText.includes('work')) {
          category = 'Academic';
        } else if (lowerText.includes('stress') || lowerText.includes('depressed') || lowerText.includes('anxiety') || 
                   lowerText.includes('sad') || lowerText.includes('worried') || lowerText.includes('personal') ||
                   lowerText.includes('relationship') || lowerText.includes('family') || lowerText.includes('money')) {
          category = 'Personal';
        }
        
        updateSupportSession(userId, 'priority', { category: category });
        ctx.reply(`I understand. ${category === 'Personal' ? 'It sounds like you\'re going through a tough time. ' : ''}How urgent is this? Do you need help:\n\n• Right now (very urgent)\n• Today (urgent)\n• This week (not urgent)\n\nJust tell me how quickly you need help.`);
        break;
        
      case 'priority':
        const lowerText2 = text.toLowerCase();
        let priority = 'medium';
        
        if (lowerText2.includes('right now') || lowerText2.includes('urgent') || 
            lowerText2.includes('immediately') || lowerText2.includes('asap')) {
          priority = 'urgent';
        } else if (lowerText2.includes('today') || lowerText2.includes('soon') || lowerText2.includes('quickly')) {
          priority = 'high';
        } else if (lowerText2.includes('week') || lowerText2.includes('not urgent') || lowerText2.includes('whenever')) {
          priority = 'low';
        }
        
        updateSupportSession(userId, 'subject', { priority: priority });
        ctx.reply(`Got it. Now, can you give me a short title for your issue? Just a few words to describe what's wrong.\n\nFor example: "Can't login" or "Stressed about exams"`);
        break;
        
      case 'subject':
        if (text.trim().length < 3) {
          return ctx.reply("Please give me a bit more detail. What would you call this issue?");
        }
        
        updateSupportSession(userId, 'message', { subject: text.trim() });
        ctx.reply(`Perfect. Now tell me everything about what's happening. The more details you give me, the better I can help you. What exactly is going on?`);
        break;
        
      case 'message':
        if (text.trim().length < 5) {
          return ctx.reply("Please tell me more about your issue. I want to make sure I understand everything so I can help you properly.");
        }
        
        try {
        // Create the support ticket
        const ticket = await createSupportTicket(
          userId,
          ctx.from.username,
          `${session.data.category || 'General'}: ${session.data.subject || 'Support Request'}`,
          text.trim(),
          session.data.priority || 'medium',
          session.data.category || 'General'
        );
        
        if (ticket) {
          // Add initial message to ticket
          await addSupportMessage(
            ticket.id,
            'student',
            userId,
            text.trim(),
            false
          );
          
          // Clear support session
          clearSupportSession(userId);
          
          ctx.reply(`Thank you for sharing that with me. I've created a support ticket for you (Ticket #${ticket.id}).\n\nA counselor will read your message and get back to you soon. They'll send you a direct message when they have a response.\n\nIs there anything else I can help you with right now?`);
        } else {
            // Fallback if database is not available
            clearSupportSession(userId);
            ctx.reply(`Thank you for sharing that with me. I've noted your issue:\n\n**Category:** ${session.data.category}\n**Subject:** ${session.data.subject}\n**Priority:** ${session.data.priority}\n**Message:** ${text.trim()}\n\nA counselor will get back to you soon. Is there anything else I can help you with right now?`);
          }
        } catch (dbError) {
          console.error("Database error in support session:", dbError);
          // Fallback if database is not available
          clearSupportSession(userId);
          ctx.reply(`Thank you for sharing that with me. I've noted your issue:\n\n**Category:** ${session.data.category}\n**Subject:** ${session.data.subject}\n**Priority:** ${session.data.priority}\n**Message:** ${text.trim()}\n\nA counselor will get back to you soon. Is there anything else I can help you with right now?`);
        }
        break;
        
      default:
        clearSupportSession(userId);
        ctx.reply("I lost track of our conversation. Let's start over - just type \"support\" and I'll help you.");
    }
  } catch (err) {
    console.error("Support session error:", err);
    clearSupportSession(userId);
    ctx.reply("I'm sorry, something went wrong. Let's try again - just type \"support\" and I'll help you.");
  }
}

// Enhanced booking step handler for international therapy services
async function handleBookingStep(ctx, session, userId, text) {
  try {
    switch (session.step) {
      case 'greeting':
        if (text.toLowerCase().includes('yes')) {
          updateBookingSession(userId, 'personal_info', {});
          
          // Delete user's input message and previous bot message for cleaner interface
          try {
            await ctx.telegram.deleteMessage(ctx.chat.id, ctx.message.message_id);
          } catch (err) {
            console.log("Could not delete user input message:", err.message);
          }
          
          const updatedSession = getBookingSession(userId);
          if (updatedSession.lastMessageId) {
            try {
              await ctx.telegram.deleteMessage(ctx.chat.id, updatedSession.lastMessageId);
            } catch (err) {
              console.log("Could not delete previous message:", err.message);
            }
          }
          
          const msg = await ctx.reply("Great! Let's get some details.\n\n📝 **Step 1 of 6: Personal Information**\n\nWhat's your full name?\n\nType your full name like this:\nJohn Doe");
          updateBookingSession(userId, 'personal_info', {});
          const session = getBookingSession(userId);
          session.lastMessageId = msg.message_id;
        } else if (text.toLowerCase().includes('no')) {
          clearBookingSession(userId);
          ctx.reply("No problem! If you change your mind, just click '📅 Book Appointment' anytime. Take care! 😊");
        } else {
          ctx.reply("Please reply with 'Yes' to start booking or 'No' to cancel.");
        }
        break;
        
      case 'personal_info':
        if (!session.data.full_name) {
          if (text.trim().length < 2) {
            return ctx.reply("That name seems too short. Please enter a valid full name (at least 2 characters).");
          }
          updateBookingSession(userId, 'personal_info', { full_name: text.trim() });
          
          // Delete user's input message and previous bot message for cleaner interface
          try {
            await ctx.telegram.deleteMessage(ctx.chat.id, ctx.message.message_id);
          } catch (err) {
            console.log("Could not delete user input message:", err.message);
          }
          
          const updatedSession = getBookingSession(userId);
          if (updatedSession.lastMessageId) {
            try {
              await ctx.telegram.deleteMessage(ctx.chat.id, updatedSession.lastMessageId);
            } catch (err) {
              console.log("Could not delete previous message:", err.message);
            }
          }
          
          const msg = await ctx.reply("📅 What's your date of birth?\n\nType it like this:\n1990-01-15\n\n(YYYY-MM-DD format)");
          updateBookingSession(userId, 'personal_info', {});
          const session = getBookingSession(userId);
          session.lastMessageId = msg.message_id;
        } else if (!session.data.date_of_birth) {
          // Validate date format
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (!dateRegex.test(text.trim())) {
            return ctx.reply("Please use the correct date format: YYYY-MM-DD\n\nExample: 1990-01-15");
          }
          
          updateBookingSession(userId, 'personal_info', { date_of_birth: text.trim() });
          
          // Delete user's input message and previous bot message for cleaner interface
          try {
            await ctx.telegram.deleteMessage(ctx.chat.id, ctx.message.message_id);
          } catch (err) {
            console.log("Could not delete user input message:", err.message);
          }
          
          const updatedSession = getBookingSession(userId);
          if (updatedSession.lastMessageId) {
            try {
              await ctx.telegram.deleteMessage(ctx.chat.id, updatedSession.lastMessageId);
            } catch (err) {
              console.log("Could not delete previous message:", err.message);
            }
          }
          
          const msg = await ctx.reply("📞 Please provide your PHONE NUMBER:\n\nType your phone number like this:\n+254712345678");
          updateBookingSession(userId, 'personal_info', {});
          const session = getBookingSession(userId);
          session.lastMessageId = msg.message_id;
        } else if (!session.data.contact_phone) {
          // Validate phone number
          if (text.trim().length < 5 || !text.trim().includes('+')) {
            return ctx.reply("Please enter a valid phone number with country code.\nExample: +254712345678");
          }
          updateBookingSession(userId, 'session_details', { contact_phone: text.trim() });
          
          // Delete user's input message
          try {
            await ctx.telegram.deleteMessage(ctx.chat.id, ctx.message.message_id);
          } catch (err) {
            console.log("Could not delete user input message:", err.message);
          }
          
          // Ask for email
          const updatedSession = getBookingSession(userId);
          if (updatedSession.lastMessageId) {
            try {
              await ctx.telegram.deleteMessage(ctx.chat.id, updatedSession.lastMessageId);
            } catch (err) {
              console.log("Could not delete previous message:", err.message);
            }
          }
          
          const emailMsg = await ctx.reply("📧 Now please provide your EMAIL ADDRESS:\n\nType your email like this:\njohn@example.com");
          const emailSession = getBookingSession(userId);
          emailSession.lastMessageId = emailMsg.message_id;
        } else if (!session.data.contact_email) {
          // Validate email
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(text.trim())) {
            return ctx.reply("Please enter a valid email address.\nExample: john@example.com");
          }
          updateBookingSession(userId, 'session_details', { contact_email: text.trim() });
          
          // Delete user's input message and previous bot message for cleaner interface
          try {
            await ctx.telegram.deleteMessage(ctx.chat.id, ctx.message.message_id);
          } catch (err) {
            console.log("Could not delete user input message:", err.message);
          }
          
          const updatedSession = getBookingSession(userId);
          if (updatedSession.lastMessageId) {
            try {
              await ctx.telegram.deleteMessage(ctx.chat.id, updatedSession.lastMessageId);
            } catch (err) {
              console.log("Could not delete previous message:", err.message);
            }
          }
          
          const msg = await ctx.reply("📅 **Step 2 of 6: Session Details**\n\nWhen would you like to have your session?\n\nType the date and time like this:\n2024-01-20 14:30\n\n(YYYY-MM-DD HH:MM format)");
          updateBookingSession(userId, 'session_details', {});
          const session = getBookingSession(userId);
          session.lastMessageId = msg.message_id;
        }
        break;
        
      case 'session_details':
        if (!session.data.session_datetime) {
          // Validate datetime format
          const datetimeRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
          if (!datetimeRegex.test(text.trim())) {
            return ctx.reply("Please use the correct date and time format: YYYY-MM-DD HH:MM\n\nExample: 2024-01-20 14:30");
          }
          
          // Validate working hours
          const [datePart, timePart] = text.trim().split(' ');
          const [yearStr, monthStr, dayStr] = datePart.split('-');
          const [hourStr, minuteStr] = timePart.split(':');
          
          const appointmentDate = new Date(
            parseInt(yearStr), 
            parseInt(monthStr) - 1,
            parseInt(dayStr), 
            parseInt(hourStr), 
            parseInt(minuteStr)
          );
          
          // Calculate end time (assuming 1 hour session)
          const endDate = new Date(appointmentDate);
          endDate.setHours(endDate.getHours() + 1);
          
          const timeValidation = workingHoursValidator.isValidAppointmentRange(appointmentDate, endDate);
          if (!timeValidation.isValid) {
            return ctx.reply(`❌ **Invalid appointment time!**\n\n${timeValidation.reason}\n\n🕒 **Working Hours:**\n• Monday - Friday: 8:00 AM - 5:00 PM\n• Lunch Break: 12:00 PM - 1:00 PM\n• Weekends: Closed\n\nPlease choose a different time within working hours.\n\nExample: 2024-01-20 14:30`);
          }
          
          updateBookingSession(userId, 'session_details', { session_datetime: text.trim() });
          
          // Delete user's input message and previous bot message for cleaner interface
          try {
            await ctx.telegram.deleteMessage(ctx.chat.id, ctx.message.message_id);
          } catch (err) {
            console.log("Could not delete user input message:", err.message);
          }
          
          const updatedSession = getBookingSession(userId);
          if (updatedSession.lastMessageId) {
            try {
              await ctx.telegram.deleteMessage(ctx.chat.id, updatedSession.lastMessageId);
            } catch (err) {
              console.log("Could not delete previous message:", err.message);
            }
          }
          
          const msg = await ctx.reply("What type of session do you prefer?\n\nPlease reply with:\n• **Online (Video)**\n• **Phone**");
          updateBookingSession(userId, 'session_details', {});
          const session = getBookingSession(userId);
          session.lastMessageId = msg.message_id;
        } else if (!session.data.session_type) {
          const sessionType = text.toLowerCase().trim();
          if (!['online (video)', 'phone', 'online', 'video'].includes(sessionType)) {
            return ctx.reply("Please choose one of the session types:\n• Online (Video)\n• Phone");
          }
          
          updateBookingSession(userId, 'session_details', { 
            session_type: (sessionType.includes('online') || sessionType.includes('video')) ? 'online (video)' : 'phone'
          });
          
          // Delete user's input message and previous bot message for cleaner interface
          try {
            await ctx.telegram.deleteMessage(ctx.chat.id, ctx.message.message_id);
          } catch (err) {
            console.log("Could not delete user input message:", err.message);
          }
          
          const updatedSession = getBookingSession(userId);
          if (updatedSession.lastMessageId) {
            try {
              await ctx.telegram.deleteMessage(ctx.chat.id, updatedSession.lastMessageId);
            } catch (err) {
              console.log("Could not delete previous message:", err.message);
            }
          }
          
          const msg = await ctx.reply("How long would you like your session to be?\n\nPlease reply with:\n• **45 mins**\n• **60 mins**\n• **90 mins**");
          updateBookingSession(userId, 'session_details', {});
          const session = getBookingSession(userId);
          session.lastMessageId = msg.message_id;
        } else if (!session.data.session_duration) {
          const duration = text.toLowerCase().trim();
          if (!['45 mins', '60 mins', '90 mins', '45', '60', '90'].includes(duration)) {
            return ctx.reply("Please choose one of the session durations:\n• 45 mins\n• 60 mins\n• 90 mins");
          }
          
          updateBookingSession(userId, 'therapy_context', { 
            session_duration: duration.includes('45') ? '45 mins' : 
                            duration.includes('60') ? '60 mins' : '90 mins'
          });
          
          // Delete user's input message and previous bot message for cleaner interface
          try {
            await ctx.telegram.deleteMessage(ctx.chat.id, ctx.message.message_id);
          } catch (err) {
            console.log("Could not delete user input message:", err.message);
          }
          
          const updatedSession = getBookingSession(userId);
          if (updatedSession.lastMessageId) {
            try {
              await ctx.telegram.deleteMessage(ctx.chat.id, updatedSession.lastMessageId);
            } catch (err) {
              console.log("Could not delete previous message:", err.message);
            }
          }
          
          const msg = await ctx.reply("🎯 **Step 3 of 6: Therapy Context**\n\nCan you briefly describe what brings you to therapy?\n\nPlease share what you'd like to work on (this helps us match you with the right counselor).");
          updateBookingSession(userId, 'therapy_context', {});
          const session = getBookingSession(userId);
          session.lastMessageId = msg.message_id;
        }
        break;
        
      case 'therapy_context':
        if (!session.data.therapy_reason) {
          if (text.trim().length < 10) {
            return ctx.reply("Please provide a bit more detail about what brings you to therapy (at least 10 characters).");
          }
          updateBookingSession(userId, 'therapy_context', { therapy_reason: text.trim() });
          
          // Delete user's input message and previous bot message for cleaner interface
          try {
            await ctx.telegram.deleteMessage(ctx.chat.id, ctx.message.message_id);
          } catch (err) {
            console.log("Could not delete user input message:", err.message);
          }
          
          const updatedSession = getBookingSession(userId);
          if (updatedSession.lastMessageId) {
            try {
              await ctx.telegram.deleteMessage(ctx.chat.id, updatedSession.lastMessageId);
            } catch (err) {
              console.log("Could not delete previous message:", err.message);
            }
          }
          
          const msg = await ctx.reply("What are your main goals for this session?\n\nPlease describe what you hope to achieve or work on during your therapy session.");
          updateBookingSession(userId, 'therapy_context', {});
          const session = getBookingSession(userId);
          session.lastMessageId = msg.message_id;
        } else if (!session.data.session_goals) {
          if (text.trim().length < 10) {
            return ctx.reply("Please provide a bit more detail about your session goals (at least 10 characters).");
          }
          updateBookingSession(userId, 'therapy_context', { session_goals: text.trim() });
          
          // Delete user's input message and previous bot message for cleaner interface
          try {
            await ctx.telegram.deleteMessage(ctx.chat.id, ctx.message.message_id);
          } catch (err) {
            console.log("Could not delete user input message:", err.message);
          }
          
          const updatedSession = getBookingSession(userId);
          if (updatedSession.lastMessageId) {
            try {
              await ctx.telegram.deleteMessage(ctx.chat.id, updatedSession.lastMessageId);
            } catch (err) {
              console.log("Could not delete previous message:", err.message);
            }
          }
          
          const msg = await ctx.reply("Have you attended therapy before?\n\nPlease reply with:\n• **Yes**\n• **No**");
          updateBookingSession(userId, 'therapy_context', {});
          const session = getBookingSession(userId);
          session.lastMessageId = msg.message_id;
        } else if (!session.data.previous_therapy) {
          const response = text.toLowerCase().trim();
          if (!['yes', 'no'].includes(response)) {
            return ctx.reply("Please reply with 'Yes' or 'No'.");
          }
          
          updateBookingSession(userId, 'choose_counselor', { 
            previous_therapy: response === 'yes'
          });
          
          // Offer counselor choices
          try {
            const r = await pool.query("SELECT id, name FROM counselors ORDER BY name ASC LIMIT 10");
            if (r.rows.length === 0) {
              return ctx.reply("No counselors are available at the moment. Please try again later.");
            }
            let msg = "Please choose your preferred counselor by number:\n\n";
            r.rows.forEach((c, i) => { msg += `${i+1}. ${c.name}\n`; });
            msg += "\nReply with the number (e.g., 1).";
            const reply = await ctx.reply(msg);
            const s = getBookingSession(userId);
            s.lastMessageId = reply.message_id;
            s.data.counselor_options = r.rows;
          } catch (e) {
            console.error('Counselor listing error:', e);
            return ctx.reply("Couldn't load counselors. Please try again later.");
          }
        }
        break;
      
      case 'choose_counselor':
        if (!session.data.counselor_id) {
          const idx = parseInt(text, 10);
          const options = session.data.counselor_options || [];
          if (!Number.isInteger(idx) || idx < 1 || idx > options.length) {
            return ctx.reply("Please reply with a valid number from the list.");
          }
          const chosen = options[idx - 1];
          updateBookingSession(userId, 'emergency_payment', { counselor_id: chosen.id, counselor_name: chosen.name });
          const nextMsg = await ctx.reply("🚨 **Step 4 of 6: Emergency & Payment**\n\nPlease provide an emergency contact (name & phone number).\n\nType it like this:\nJohn Doe +254712345678");
          const s = getBookingSession(userId);
          s.lastMessageId = nextMsg.message_id;
        }
        break;
        
      case 'emergency_payment':
        if (!session.data.emergency_contact_name || !session.data.emergency_contact_phone) {
          // Parse emergency contact info
          const contactParts = text.trim().split(' ');
          if (contactParts.length < 2) {
            return ctx.reply("Please provide both name and phone number.\n\nExample: John Doe +254712345678");
          }
          
          const phonePart = contactParts.find(part => part.includes('+') || part.match(/\d{10,}/));
          const nameParts = contactParts.filter(part => !part.includes('+') && !part.match(/\d{10,}/));
          
          if (!phonePart || nameParts.length === 0) {
            return ctx.reply("Please provide both name and phone number.\n\nExample: John Doe +254712345678");
          }
          
          updateBookingSession(userId, 'emergency_payment', { 
            emergency_contact_name: nameParts.join(' '),
            emergency_contact_phone: phonePart
          });
          
          // Delete user's input message and previous bot message for cleaner interface
          try {
            await ctx.telegram.deleteMessage(ctx.chat.id, ctx.message.message_id);
          } catch (err) {
            console.log("Could not delete user input message:", err.message);
          }
          
          const updatedSession = getBookingSession(userId);
          if (updatedSession.lastMessageId) {
            try {
              await ctx.telegram.deleteMessage(ctx.chat.id, updatedSession.lastMessageId);
            } catch (err) {
              console.log("Could not delete previous message:", err.message);
            }
          }
          
          const msg = await ctx.reply("How would you like to pay?\n\nPlease reply with:\n• **M-Pesa**\n• **Bank**");
          updateBookingSession(userId, 'emergency_payment', {});
          const session = getBookingSession(userId);
          session.lastMessageId = msg.message_id;
        } else if (!session.data.payment_method) {
          const paymentMethod = text.toLowerCase().trim();
          if (!['m-pesa', 'mpesa', 'bank', 'bank transfer'].includes(paymentMethod)) {
            return ctx.reply("Please choose one of the payment methods:\n• M-Pesa\n• Bank");
          }
          
          // Normalize payment method
          const normalizedMethod = paymentMethod.includes('mpesa') || paymentMethod.includes('m-pesa') ? 'M-Pesa' : 'Bank';
          
          updateBookingSession(userId, 'confirmation', { 
            payment_method: normalizedMethod
          });
          
          // Delete user's input message and previous bot message for cleaner interface
          try {
            await ctx.telegram.deleteMessage(ctx.chat.id, ctx.message.message_id);
          } catch (err) {
            console.log("Could not delete user input message:", err.message);
          }
          
          const updatedSession = getBookingSession(userId);
          if (updatedSession.lastMessageId) {
            try {
              await ctx.telegram.deleteMessage(ctx.chat.id, updatedSession.lastMessageId);
            } catch (err) {
              console.log("Could not delete previous message:", err.message);
            }
          }
          
          const msg = await ctx.reply("✅ **Step 5 of 6: Confirmation & Consent**\n\nPlease review your details:\n\n" + formatBookingSummary(getBookingSession(userId).data) + "\n\nDo you confirm that everything is correct and you agree to our privacy policy?\n\nType 'yes' to confirm and proceed to payment, or 'no' to start over.");
          updateBookingSession(userId, 'confirmation', {});
          const session = getBookingSession(userId);
          session.lastMessageId = msg.message_id;
        }
        break;
        
      case 'confirmation':
        if (text.toLowerCase().includes('yes')) {
          // Delete user's "yes" input message for cleaner interface
          try {
            await ctx.telegram.deleteMessage(ctx.chat.id, ctx.message.message_id);
          } catch (err) {
            console.log("Could not delete user input message:", err.message);
          }
          
          // Process the booking and initiate payment
          const currentSession = getBookingSession(userId);
          const data = currentSession.data;
          
          // Convert to PostgreSQL timestamp format
          const [datePart, timePart] = data.session_datetime.split(' ');
          const [yearStr, monthStr, dayStr] = datePart.split('-');
          const [hourStr, minuteStr] = timePart.split(':');
          
          const appointmentDate = new Date(
            parseInt(yearStr), 
            parseInt(monthStr) - 1,
            parseInt(dayStr), 
            parseInt(hourStr), 
            parseInt(minuteStr)
          );
          
          const year = appointmentDate.getFullYear();
          const month = (appointmentDate.getMonth() + 1).toString().padStart(2, '0');
          const day = appointmentDate.getDate().toString().padStart(2, '0');
          const hour = appointmentDate.getHours().toString().padStart(2, '0');
          const minute = appointmentDate.getMinutes().toString().padStart(2, '0');
          const second = appointmentDate.getSeconds().toString().padStart(2, '0');
          
          const formattedDate = `${year}-${month}-${day} ${hour}:${minute}:${second}`;
          
          // Calculate session end time based on duration
          let sessionDurationMinutes = 60; // default
          if (data.session_duration.includes('45')) sessionDurationMinutes = 45;
          else if (data.session_duration.includes('90')) sessionDurationMinutes = 90;
          
          const endTime = new Date(appointmentDate.getTime() + (sessionDurationMinutes * 60000));
          const endYear = endTime.getFullYear();
          const endMonth = (endTime.getMonth() + 1).toString().padStart(2, '0');
          const endDay = endTime.getDate().toString().padStart(2, '0');
          const endHour = endTime.getHours().toString().padStart(2, '0');
          const endMinute = endTime.getMinutes().toString().padStart(2, '0');
          const endSecond = endTime.getSeconds().toString().padStart(2, '0');
          
          const endDate = `${endYear}-${endMonth}-${endDay} ${endHour}:${endMinute}:${endSecond}`;

          try {
            // Insert client (instead of student)
            const clientRes = await pool.query(
              `INSERT INTO clients (full_name, date_of_birth, contact_info, emergency_contact_name, emergency_contact_phone, therapy_reason, session_goals, previous_therapy, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING id`,
              [
                data.full_name,
                data.date_of_birth,
                `${data.contact_phone || ''}${data.contact_phone && data.contact_email ? ', ' : ''}${data.contact_email || ''}`.slice(0, 500), // Combine phone and email, max 500 chars
                data.emergency_contact_name,
                data.emergency_contact_phone,
                data.therapy_reason,
                data.session_goals,
                data.previous_therapy
              ]
            );
            
            const clientId = clientRes.rows[0].id;
            
            // Get available counselor (for now, assign first available)
            const counselorRes = await pool.query("SELECT id, name FROM counselors LIMIT 1");
            if (counselorRes.rows.length === 0) {
              throw new Error("No counselors available");
            }
            
            const counselor = counselorRes.rows[0];
            
            // Check if counselor is absent on the appointment date
            const absenceResult = await pool.query(
              "SELECT * FROM absence_days WHERE counselor_id = $1 AND date = $2",
              [counselor.id, appointmentDate.toISOString().split('T')[0]]
            );
            
            if (absenceResult.rows.length > 0) {
              clearBookingSession(userId);
              return ctx.reply(`❌ **Counselor Unavailable!**\n\nThe counselor is not available on ${appointmentDate.toLocaleDateString()}. Please choose a different date.\n\nType "book" to start over with a new appointment.`);
            }
            
            // Generate unique appointment code
            const appointmentCode = await generateUniqueAppointmentCode();
            
            // Insert appointment
            const appointmentRes = await pool.query(
              `INSERT INTO appointments (
                 client_id, counselor_id,
                 appointment_date, end_date,
                 start_ts, end_ts,
                 session_type, session_duration, payment_method,
                 telegram_user_id, telegram_username,
                 status, created_at, appointment_code
               )
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending_payment', NOW(), $12)
               RETURNING id, appointment_code`,
              [
                clientId,
                counselor.id,
                formattedDate,
                endDate,
                formattedDate,
                endDate,
                data.session_type,
                data.session_duration,
                data.payment_method,
                userId,
                ctx.from.username || null,
                appointmentCode
              ]
            );
            
            const appointmentId = appointmentRes.rows[0].id;
            const generatedCode = appointmentRes.rows[0].appointment_code;
            
            // Initiate payment process
            await initiatePaymentProcess(ctx, appointmentId, data);
            
            // Clear booking session
            clearBookingSession(userId);
            
          } catch (error) {
            console.error("Booking error:", error);
            ctx.reply("I'm sorry, there was an error processing your booking. Please try again or contact support.");
            clearBookingSession(userId);
          }
          
        } else if (text.toLowerCase().includes('no')) {
          clearBookingSession(userId);
          ctx.reply("No problem! If you'd like to start over, just click '📅 Book Appointment' again. Take care! 😊");
        } else {
          ctx.reply("Please reply with 'yes' to confirm and proceed to payment, or 'no' to start over.");
        }
        break;
        
      case 'datetime':
        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
        if (!dateRegex.test(text.trim())) {
          return ctx.reply("That doesn't look like the right format. Please use: YYYY-MM-DD HH:MM\n\nExample: 2024-01-20 14:30");
        }
        
        const [datePart, timePart] = text.trim().split(' ');
        const [yearStr, monthStr, dayStr] = datePart.split('-');
        const [hourStr, minuteStr] = timePart.split(':');
        
        const appointmentDate = new Date(
          parseInt(yearStr), 
          parseInt(monthStr) - 1,
          parseInt(dayStr), 
          parseInt(hourStr), 
          parseInt(minuteStr)
        );
        
        if (isNaN(appointmentDate.getTime()) || appointmentDate < new Date()) {
          return ctx.reply("That date doesn't look right. Please enter a valid future date and time.\n\nExample: 2024-01-20 14:30");
        }
        
        const currentSession = getBookingSession(userId);
        const sessionData = { ...currentSession.data, datetime: text.trim() };
        updateBookingSession(userId, 'confirm', sessionData);
        
        // Delete user's input message and previous bot message for cleaner interface
        try {
          await ctx.telegram.deleteMessage(ctx.chat.id, ctx.message.message_id);
        } catch (err) {
          console.log("Could not delete user input message:", err.message);
        }
        
        const updatedSession6 = getBookingSession(userId);
        if (updatedSession6.lastMessageId) {
          try {
            await ctx.telegram.deleteMessage(ctx.chat.id, updatedSession6.lastMessageId);
          } catch (err) {
            console.log("Could not delete previous message:", err.message);
          }
        }
        
        // Show summary for confirmation
        const summary = formatBookingSummary(sessionData);
        const summaryMsg = await ctx.reply(summary);
        updateBookingSession(userId, 'confirm', {});
        const session6 = getBookingSession(userId);
        session6.lastMessageId = summaryMsg.message_id;
        break;
        
      case 'confirm':
        if (text.toLowerCase().includes('yes')) {
          // Delete user's "yes" input message for cleaner interface
          try {
            await ctx.telegram.deleteMessage(ctx.chat.id, ctx.message.message_id);
          } catch (err) {
            console.log("Could not delete user input message:", err.message);
          }
          
          // Process the booking
          const currentSession = getBookingSession(userId);
          const data = currentSession.data;
          
          // Convert to PostgreSQL timestamp format
          const [datePart, timePart] = data.datetime.split(' ');
          const [yearStr, monthStr, dayStr] = datePart.split('-');
          const [hourStr, minuteStr] = timePart.split(':');
          
          const appointmentDate = new Date(
            parseInt(yearStr), 
            parseInt(monthStr) - 1,
            parseInt(dayStr), 
            parseInt(hourStr), 
            parseInt(minuteStr)
          );
          
          const year = appointmentDate.getFullYear();
          const month = (appointmentDate.getMonth() + 1).toString().padStart(2, '0');
          const day = appointmentDate.getDate().toString().padStart(2, '0');
          const hour = appointmentDate.getHours().toString().padStart(2, '0');
          const minute = appointmentDate.getMinutes().toString().padStart(2, '0');
          const second = appointmentDate.getSeconds().toString().padStart(2, '0');
          
          const formattedDate = `${year}-${month}-${day} ${hour}:${minute}:${second}`;
          const endDate = `${year}-${month}-${day} ${(parseInt(hour) + 1).toString().padStart(2, '0')}:${minute}:${second}`;

          // Insert student
          const studentRes = await pool.query(
            `INSERT INTO students (name, admission_no, phone, year_of_study)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (admission_no) DO UPDATE SET 
               name=EXCLUDED.name, 
               phone=EXCLUDED.phone, 
               year_of_study=EXCLUDED.year_of_study
             RETURNING id`,
            [data.name, data.admission_no, data.phone, data.year]
          );

          const student_id = studentRes.rows[0].id;

          // Generate unique appointment code
          const appointmentCode = await generateUniqueAppointmentCode();
          
          // Insert appointment
          const apptRes = await pool.query(
            `INSERT INTO appointments (student_id, counselor_id, start_ts, end_ts, status, telegram_user_id, telegram_username, appointment_code)
             VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7)
             RETURNING id, appointment_code`,
            [student_id, data.counselor_id, formattedDate, endDate, userId, ctx.from.username, appointmentCode]
          );

          const appointmentId = apptRes.rows[0].id;
          const generatedCode = apptRes.rows[0].appointment_code;

          // Schedule notifications
          await scheduleNotifications(appointmentId, userId, appointmentDate);

          const confirmationDate = formatAppointmentDate(appointmentDate);

          // Delete all previous booking messages for clean interface
          const finalSession = getBookingSession(userId);
          if (finalSession.lastMessageId) {
            try {
              await ctx.telegram.deleteMessage(ctx.chat.id, finalSession.lastMessageId);
            } catch (err) {
              console.log("Could not delete previous message:", err.message);
            }
          }

          ctx.reply(`Appointment Booked Successfully!\n\n` +
                   `Reference: ${generatedCode}\n` +
                   `Student: ${data.name}\n` +
                   `Counselor: ${data.counselor_name}\n` +
                   `Date: ${confirmationDate}\n` +
                   `Status: Pending\n\n` +
                   `You'll receive reminders 1 day and 1 hour before your appointment.\n\n` +
                   `Thank you for using our counseling service!\n\n` +
                   `Is there anything else I can help you with?`);
          
          // Clear booking session
          clearBookingSession(userId);
          
        } else if (text.toLowerCase().includes('no')) {
          clearBookingSession(userId);
          ctx.reply("No problem! I've cancelled the booking. Click 'Book Appointment' to start over whenever you're ready.");
        } else {
          ctx.reply("I didn't quite understand that. Please type 'yes' to confirm or 'no' to start over.");
        }
        break;
    }
  } catch (err) {
    console.error("Booking step error:", err);
    ctx.reply("I'm sorry, there was an error processing your booking. Please try again or contact support.");
    clearBookingSession(userId);
  }
}

async function handleReviewStep(ctx, session, userId, text) {
  try {
    switch (session.step) {
      case 'rating': {
        const rating = parseInt(text, 10);
        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
          return ctx.reply("Please rate the session from 1 to 5 (1 = poor, 5 = excellent):");
        }
        session.data.rating = rating;
        session.step = 'quality';
        return ctx.reply("How would you describe the overall quality of the session?\n\nType one of:\n• excellent\n• good\n• average\n• poor");
      }
      case 'quality': {
        const quality = text.toLowerCase().trim();
        if (!['excellent', 'good', 'average', 'poor'].includes(quality)) {
          return ctx.reply("Please type one of: excellent, good, average, or poor");
        }
        session.data.session_quality = quality;
        session.step = 'recommend';
        return ctx.reply("Would you recommend this counselor to others?\n\nType 'yes' or 'no':");
      }
      case 'recommend': {
        const recommend = text.toLowerCase().trim();
        if (!['yes', 'no', 'y', 'n'].includes(recommend)) {
          return ctx.reply("Please type 'yes' or 'no':");
        }
        session.data.would_recommend = recommend.startsWith('y');
        session.step = 'review_text';
        return ctx.reply("Please write a brief review of your session (optional, type 'skip' to skip):");
      }
      case 'review_text': {
        if (text.toLowerCase().trim() !== 'skip') {
          session.data.review_text = text.trim();
        }
        session.step = 'additional_feedback';
        return ctx.reply("Any additional feedback or suggestions (optional, type 'skip' to skip):");
      }
      case 'additional_feedback': {
        if (text.toLowerCase().trim() !== 'skip') {
          session.data.additional_feedback = text.trim();
        }
        
        // Save review to database
        try {
          const { rows } = await pool.query(
            `SELECT a.*, a.student_id, a.client_id, a.counselor_id 
             FROM appointments a 
             WHERE a.id = $1 AND a.telegram_user_id = $2`,
            [session.appointmentId, userId]
          );
          
          if (rows.length === 0) {
            clearReviewSession(userId);
            return ctx.reply("Appointment not found. Please contact support.");
          }
          
          const appointment = rows[0];
          const clientId = appointment.student_id || appointment.client_id;
          
          await pool.query(
            `INSERT INTO appointment_reviews 
             (appointment_id, client_id, counselor_id, rating, review_text, session_quality, would_recommend, additional_feedback)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              session.appointmentId,
              clientId,
              appointment.counselor_id,
              session.data.rating,
              session.data.review_text || null,
              session.data.session_quality,
              session.data.would_recommend,
              session.data.additional_feedback || null
            ]
          );
          
          clearReviewSession(userId);
          return ctx.reply("✅ Thank you for your review! Your feedback helps us improve our services.");
        } catch (dbError) {
          console.error("Error saving review:", dbError);
          clearReviewSession(userId);
          return ctx.reply("Sorry, there was an error saving your review. Please try again later.");
        }
      }
      default:
        clearReviewSession(userId);
        return ctx.reply("Let's start over. Type /review [appointment_id] to review a session.");
    }
  } catch (err) {
    console.error('Review flow error:', err);
    clearReviewSession(userId);
    return ctx.reply("Sorry, something went wrong. Please try again later.");
  }
}

// Add slash command handlers
bot.command('counselors', async (ctx) => {
  try {
    const result = await pool.query("SELECT id, name FROM counselors");
    if (result.rows.length === 0) {
      return ctx.reply("Hmm, it looks like no counselors are registered yet. Please contact the admin for help! 😔");
    }
    let msg = "**Meet Our Counselors:**\n\n";
    result.rows.forEach((c, i) => {
      msg += `${i + 1}. **${c.name}**\n`;
    });
    msg += "\n**Ready to book?**\n";
    msg += "Just type `/book` and I'll walk you through everything!\n\n";
    msg += "**It's super easy - I promise!**";
    ctx.reply(msg, { parse_mode: 'Markdown' });
  } catch (err) {
    console.error("Counselors error:", err);
    ctx.reply("I had trouble getting the counselor list. Please try again in a moment.");
  }
});

bot.command('mentorships', async (ctx) => {
  try {
    startMentorshipApplicationSession(ctx.from.id);
    await handleMentorshipStep(ctx, getMentorshipSession(ctx.from.id), ctx.from.id, '');
  } catch (err) {
    console.error('Mentorships command error:', err);
    ctx.reply('I could not load mentorship programs right now. Please try again later.');
  }
});

bot.command('books', async (ctx) => {
  try {
    startBookOrderSession(ctx.from.id);
    await handleBookOrderStep(ctx, getBookOrderSession(ctx.from.id), ctx.from.id, '');
  } catch (err) {
    console.error('Books command error:', err);
    ctx.reply('I could not load books right now. Please try again later.');
  }
});

bot.command('myorders', async (ctx) => {
  try {
    const userId = ctx.from.id;
    const apiUrl = getApiUrl();
    const response = await fetch(`${apiUrl}/api/books/orders/client/${userId}`);
    
    if (response.ok) {
      const orders = await response.json();
      
      if (orders.length === 0) {
        return ctx.reply("📦 You have no orders yet.\n\nType /books to browse and purchase books!");
      }
      
      let msg = "📦 Your Book Orders:\n\n";
      orders.forEach((order, i) => {
        const statusIcon = {
          'ordered': '📋',
          'paid': '💰',
          'shipped': '📦',
          'delivered': '✅',
          'cancelled': '❌'
        }[order.order_status] || '❓';
        
        msg += `${i + 1}. ${statusIcon} Order #${order.id}\n`;
        msg += `   📚 ${order.book_title} by ${order.book_author}\n`;
        msg += `   💳 Total: KSh ${(order.total_amount_cents / 100).toFixed(2)}\n`;
        msg += `   📊 Status: ${order.order_status.toUpperCase()}\n`;
        
        if (order.tracking_number) {
          msg += `   📦 Tracking: ${order.tracking_number}\n`;
        }
        if (order.estimated_delivery_date) {
          msg += `   📅 Est. Delivery: ${new Date(order.estimated_delivery_date).toLocaleDateString()}\n`;
        }
        msg += `   📅 Ordered: ${new Date(order.created_at).toLocaleDateString()}\n\n`;
      });
      
      return ctx.reply(msg);
    } else {
      return ctx.reply("Sorry, I couldn't retrieve your orders right now. Please try again later.");
    }
  } catch (err) {
    console.error('My orders command error:', err);
    ctx.reply('I could not load your orders right now. Please try again later.');
  }
});

bot.command('review', async (ctx) => {
  try {
    const text = ctx.message.text.trim();
    const parts = text.split(' ');
    
    if (parts.length < 2) {
      return ctx.reply("Please provide an appointment code. Usage: /review [appointment_code]");
    }
    
    const code = parts[1];
    
    // Verify appointment exists and belongs to user - try appointment_code first, then id for backward compatibility
    const { rows } = await pool.query(
      `SELECT a.*, c.name as counselor_name 
       FROM appointments a 
       LEFT JOIN counselors c ON a.counselor_id = c.id
       WHERE (a.appointment_code = $1 OR a.id::text = $1) 
       AND (a.telegram_user_id = $2 OR a.client_id IN (SELECT id FROM clients WHERE telegram_user_id = $2))`,
      [code, ctx.from.id]
    );
    
    if (rows.length === 0) {
      return ctx.reply("Appointment not found or doesn't belong to you.");
    }
    
    const appointment = rows[0];
    
    // Check if appointment is completed
    if (appointment.session_status !== 'completed') {
      return ctx.reply("This appointment hasn't been completed yet. Reviews are only available for completed sessions.");
    }
    
    // Check if already reviewed
    const existingReview = await pool.query(
      "SELECT id FROM appointment_reviews WHERE appointment_id = $1",
      [appointment.id]
    );
    
    if (existingReview.rows.length > 0) {
      return ctx.reply("You've already reviewed this session. Thank you!");
    }
    
    startReviewSession(ctx.from.id, appointment.id);
    ctx.reply(
      `📝 Let's review your session with ${appointment.counselor_name}!\n\n` +
      `Please rate the session from 1 to 5 (1 = poor, 5 = excellent):`
    );
  } catch (err) {
    console.error('Review command error:', err);
    ctx.reply('I could not process your review request. Please try again later.');
  }
});

bot.command('book', async (ctx) => {
  try {
    const result = await pool.query("SELECT id, name FROM counselors");
    if (result.rows.length === 0) {
      return ctx.reply("Sorry, no counselors are available right now. Please contact admin for help! 😔");
    }
    
    // Start booking session
    startBookingSession(ctx.from.id);
    
    let msg = "📅 Let's Book Your Appointment! 🎉\n\n";
    msg += "Don't worry, I'll guide you through this step by step. It's really easy!\n\n";
    msg += "Step 1 of 6: What's your full name?\n\n";
    msg += "Just type your name like this:\n";
    msg += "`John Doe`\n\n";
    msg += "**Take your time - no rush!** 😊";
    
    ctx.reply(msg, { parse_mode: 'Markdown' });
  } catch (err) {
    console.error("Book appointment error:", err);
    ctx.reply("I'm sorry, there was an error processing your booking. Please try again or contact support.");
  }
});

bot.command('appointments', async (ctx) => {
  try {
    const appointments = await getUserAppointments(ctx.from.id);
    
    if (appointments.length === 0) {
      return ctx.reply("You don't have any appointments yet!\n\nReady to book your first one? Just type /book and I'll help you.");
    }
    
    let msg = "Here are your appointments:\n\n";
    appointments.forEach((appointment, index) => {
      const status = appointment.status === 'confirmed' ? "Confirmed" : 
                    appointment.status === 'cancelled' ? "Cancelled" : "Pending";
      const code = appointment.appointment_code || appointment.id;
      
      msg += `${index + 1}. Appointment: ${code}\n`;
      if (appointment.student_name) {
        msg += `   Student: ${appointment.student_name}\n`;
      } else if (appointment.client_name) {
        msg += `   Client: ${appointment.client_name}\n`;
      }
      msg += `   Counselor: ${appointment.counselor_name}\n`;
      msg += `   Date: ${formatAppointmentDate(appointment.start_ts || appointment.appointment_date)}\n`;
      msg += `   Status: ${status}\n\n`;
    });
    
    msg += "Need to cancel? Type: cancel [CODE]\n";
    msg += "Check details? Type: status [CODE]\n\n";
    msg += "I'm here if you need any help.";
    
    ctx.reply(msg);
  } catch (err) {
    console.error("Error fetching user appointments:", err);
    ctx.reply("I couldn't load your appointments. Let me try that again.");
  }
});

bot.command('cancel', async (ctx) => {
  ctx.reply("No problem! To cancel an appointment, just tell me the appointment code.\n\nFor example: cancel A2B3C4\n\nType /appointments to see your appointment codes.");
});

bot.command('support', async (ctx) => {
  const userId = ctx.from.id;
  
  // Initialize support session
  supportSessions.set(userId, {
    step: 'category',
    data: {}
  });
  
  ctx.reply(`Hi there! I'm here to help you. Let me ask you a few questions to understand how I can best assist you. 😊\n\nWhat's bothering you today? You can tell me about:\n\n• Problems with the app or website\n• School work or grades\n• Personal issues or stress\n• Any other concerns\n\nJust tell me what's on your mind - I'm listening! 💙`);
});

bot.command('help', async (ctx) => {
  const helpMessage = `NextStep Mentorship Bot Help

Security:
• Each user can only access their own appointments.
• No one else can see or cancel your appointments

Booking:
• Type /book and follow the steps
• No complex commands needed - just answer questions
• The bot guides you through everything step by step

Canceling:
• Type: cancel [appointment_number]
• Example: cancel 5
• Only your own appointments can be canceled

Viewing:
• Type /appointments to see all appointments
• Type: status [appointment_number] to check specific appointment

Notifications:
• You'll receive reminders 1 day and 1 hour before appointments
• Notifications are sent automatically

Other Features:
• /counselors - see available counselors
• /support - get help with any issues
• /help - this help message

Support:
• Type /support to start guided ticket creation

Everything is designed to be simple and easy to use!`;

  ctx.reply(helpMessage);
});

bot.command('about', async (ctx) => {
  const aboutMessage = `About NextStep Mentorship Bot

Welcome to the NextStep Counseling Bot! I'm here to help you with all your counseling needs.

What I can do for you:
• Help you book counseling appointments
• Connect you with available counselors
• Provide support and assistance
• Send appointment reminders
• Help with any questions or concerns

Our Mission:
To provide accessible, confidential, and professional counseling services to all our clients.

Privacy & Security:
• All conversations are confidential
• Your personal information is protected
• Only you can access your appointments
• We follow strict privacy guidelines

Need Help?
Just type /help for a list of commands, or /support if you need assistance.

Remember: I'm here 24/7 to support you!`;

  ctx.reply(aboutMessage);
});

// Add intelligent conversation flow handler with vertical command list
bot.on('text', async (ctx) => {
  const text = ctx.message.text.toLowerCase().trim();
  const userId = ctx.from.id;
  const session = getBookingSession(userId);
  const supportSession = getSupportSession(userId);
  const mentorshipSession = getMentorshipSession(userId);
  const reviewSession = getReviewSession(userId);
  
  // Handle support session first
  if (supportSession) {
    await handleSupportSession(ctx, supportSession, userId, ctx.message.text);
    return;
  }
  // Handle mentorship application session
  if (mentorshipSession) {
    await handleMentorshipStep(ctx, mentorshipSession, userId, ctx.message.text);
    return;
  }
  
  // Handle review session
  if (reviewSession) {
    await handleReviewStep(ctx, reviewSession, userId, ctx.message.text);
    return;
  }
  
  // Handle book ordering session
  const bookOrderSession = getBookOrderSession(userId);
  if (bookOrderSession) {
    await handleBookOrderStep(ctx, bookOrderSession, userId, ctx.message.text);
    return;
  }
  
  // Handle booking session
  if (session) {
    await handleBookingStep(ctx, session, userId, ctx.message.text);
    return;
  }
  
  // Create vertical command list
  const commandList = "NextStep counseling Bot\nChoose an option:\n\n/counselors - View Available Counselors\n/mentorships - Mentorship Programs & Apply\n/books - Browse & Buy Books\n/myorders - Check My Book Orders\n/book - Book an Appointment\n/appointments - My Appointments\n/review - Review Completed Session\n/cancel - Cancel Appointment\n/support - Get Support\n/help - Help & Commands\n/about - About Our Services";
  
  // Handle common conversational cues
  if (text === 'yes' || text === 'yeah' || text === 'yep' || text === 'sure' || text === 'ok' || text === 'okay') {
    return ctx.reply(`Great! What would you like to do?\n\n${commandList}`);
  }
  
  if (text === 'no' || text === 'nope' || text === 'nah' || text === 'not really') {
    return ctx.reply("No problem! If you need anything later, just type /start or send me a message. I'm here whenever you need help.");
  }
  
  if (text === 'maybe' || text === 'perhaps' || text === 'i think so') {
    return ctx.reply(`Take your time! When you're ready, just let me know what you'd like to do. I'm here to help whenever you need me! \n\n${commandList}`);
  }
  
  if (text === 'bye' || text === 'goodbye' || text === 'see you' || text === 'later' || text === 'take care') {
    return ctx.reply("Goodbye! Take care and remember, I'm always here if you need someone to talk to. Have a great day!");
  }
  
  if (text === 'hello' || text === 'hi' || text === 'hey' || text === 'good morning' || text === 'good afternoon' || text === 'good evening') {
    return ctx.reply(`Hello!  Welcome to NextStep Mentorship Bot! I'm here to help you. What can I do for you today?\n\n${commandList}`);
  }
  
  if (text === 'help' || text === 'what can you do' || text === 'commands') {
    return ctx.reply(`I can help you with these services:\n\n${commandList}`);
  }
  
  if (text === 'thank you' || text === 'thanks' || text === 'thank you so much') {
    return ctx.reply(`You're very welcome! I'm happy to help. Is there anything else you need assistance with?\n\n${commandList}`);
  }
  
  if (text === 'how are you' || text === 'how are you doing') {
    return ctx.reply(`I'm doing great, thank you for asking! I'm here and ready to help you with whatever you need. How are you doing today?\n\n${commandList}`);
  }
  
  // Handle appointment-related responses
  if (text.includes('appointment') || text.includes('booking') || text.includes('schedule')) {
    const appointmentList = "Appointment Services:\n\n/book - Book New Appointment\n/appointments - View My Appointments\n/cancel - Cancel Appointment\ntransfer <appointment_code> <YYYY-MM-DD HH:mm> - Reschedule";
    return ctx.reply(`I'd be happy to help you with appointments! Choose what you'd like to do:\n\n${appointmentList}`);
  }

  // Client transfer command: "transfer <code> <YYYY-MM-DD HH:mm>"
  if (text.startsWith('transfer ')) {
    try {
      const parts = ctx.message.text.split(/\s+/);
      if (parts.length < 3) {
        return ctx.reply("Usage: transfer <appointment_code> <YYYY-MM-DD HH:mm>");
      }
      const apptCode = parts[1];
      const datePart = parts[2];
      const timePart = parts[3] || '';
      const newStart = `${datePart}${timePart ? ' ' + timePart : ''}`;

      // Validate format
      const dateRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
      if (!dateRegex.test(newStart)) {
        return ctx.reply("Invalid date format. Use YYYY-MM-DD HH:mm");
      }

      // Ensure the appointment belongs to this Telegram user - try appointment_code first, then id for backward compatibility
      const { rows } = await pool.query(
        `SELECT a.id, a.telegram_user_id, c.id as counselor_id FROM appointments a
         JOIN counselors c ON a.counselor_id = c.id
         WHERE (a.appointment_code = $1 OR a.id::text = $1) 
         AND (a.telegram_user_id = $2 OR a.client_id IN (SELECT id FROM clients WHERE telegram_user_id = $2))`,
        [apptCode, userId]
      );
      if (rows.length === 0) {
        return ctx.reply("I couldn't find that appointment for your account.");
      }

      // Compute end time (1 hour later)
      const [d, t] = newStart.split(' ');
      const [Y, M, D] = d.split('-').map(Number);
      const [h, m] = t.split(':').map(Number);
      const endDate = new Date(Y, (M - 1), D, h + 1, m, 0);
      const endYear = endDate.getFullYear();
      const endMonth = (endDate.getMonth() + 1).toString().padStart(2, '0');
      const endDay = endDate.getDate().toString().padStart(2, '0');
      const endHour = endDate.getHours().toString().padStart(2, '0');
      const endMinute = endDate.getMinutes().toString().padStart(2, '0');
      const newEnd = `${endYear}-${endMonth}-${endDay} ${endHour}:${endMinute}`;

      // Guard: prevent double booking at client reschedule time
      const conflict = await pool.query(
        `SELECT 1 FROM appointments WHERE counselor_id=$1 AND id<>$2 AND status <> 'cancelled'
         AND NOT ($3 >= end_ts OR $4 <= start_ts) LIMIT 1`,
        [rows[0].counselor_id, apptId, newStart + ':00', newEnd + ':00']
      );
      if (conflict.rows.length > 0) {
        return ctx.reply('Sorry, that time is not available. Please try another time.');
      }

      // Update appointment and reschedule notifications
      await pool.query(
        `UPDATE appointments SET start_ts=$1, end_ts=$2, status='pending', updated_at=NOW() WHERE id=$3`,
        [newStart + ':00', newEnd + ':00', apptId]
      );
      await pool.query(`DELETE FROM notifications WHERE appointment_id=$1 AND status='pending'`, [apptId]);

      const startDate = new Date(Y, (M - 1), D, h, m, 0);
      const oneDayBefore = new Date(startDate.getTime() - (24 * 60 * 60 * 1000));
      const oneHourBefore = new Date(startDate.getTime() - (60 * 60 * 1000));
      await pool.query(
        `INSERT INTO notifications (appointment_id, telegram_user_id, notification_type, scheduled_for, status)
         VALUES ($1,$2,'1_day_before',$3,'pending'), ($1,$2,'1_hour_before',$4,'pending')`,
        [apptId, userId, oneDayBefore, oneHourBefore]
      );

      return ctx.reply("✅ Your appointment has been rescheduled.");
    } catch (err) {
      console.error('Client transfer error:', err);
      return ctx.reply("Sorry, I couldn't transfer that appointment.");
    }
  }
  
  // Handle counselor-related responses
  if (text.includes('counselor') || text.includes('therapist') || text.includes('counseling')) {
    const counselorList = "Counselor Services:\n\n/counselors - View Available Counselors\n/book - Book Appointment";
    return ctx.reply(`Great! I can help you with counselors. Choose what you'd like to do:\n\n${counselorList}`);
  }
  
  // Handle support-related responses
  if (text.includes('problem') || text.includes('issue') || text.includes('help') || text.includes('support')) {
    const supportList = "Support Services:\n\n/support - Get Support\n/counselors - View Counselors\n/book - Book Appointment";
    return ctx.reply(`I'm here to help! Choose what you need:\n\n${supportList}`);
  }
  
  // Check if user has any open tickets with recent counselor replies for conversational replies
  try {
    const openTicketsResult = await pool.query(
      `SELECT st.id, st.subject, st.status, 
              (SELECT COUNT(*) FROM support_messages sm 
               WHERE sm.ticket_id = st.id 
               AND sm.sender_type = 'counselor' 
               AND sm.created_at > NOW() - INTERVAL '24 hours') as recent_replies
       FROM support_tickets st 
       WHERE st.telegram_user_id = $1 
       AND st.status IN ('open', 'replied', 'in_progress')
       ORDER BY st.updated_at DESC 
       LIMIT 1`,
      [userId]
    );
    
    if (openTicketsResult.rows.length > 0) {
      const ticket = openTicketsResult.rows[0];
      
      // If there are recent counselor replies, treat this as a reply to the ticket
      if (ticket.recent_replies > 0) {
        // Add student reply to the most recent open ticket
        await addSupportMessage(
          ticket.id,
          'student',
          userId,
          ctx.message.text.trim(),
          false
        );
        
        // Update ticket status to open for continued discussion
        await pool.query(
          "UPDATE support_tickets SET status = 'open', updated_at = NOW() WHERE id = $1",
          [ticket.id]
        );
        
        ctx.reply(`Thanks for your message! I've added it to your support ticket #${ticket.id}. Your counselor will see it and respond soon.\n\nIf you need to mark the ticket as resolved, just type "satisfied ${ticket.id}" or if you need more help, type "not satisfied ${ticket.id}".`);
        return;
      }
    }
  } catch (err) {
    console.error("Error checking for open tickets:", err);
  }
  
  // Default response for unrecognized messages
  return ctx.reply(`I'm not sure I understand that. But don't worry! I can help you with these services:\n\n${commandList}`);
});

// Handle callback queries from inline keyboards
bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery.data;
  const userId = ctx.from.id;
  
  try {
    switch (data) {
      case 'counselors':
        await ctx.answerCbQuery();
        // Call the counselors command handler
        const counselorsResult = await pool.query("SELECT id, name FROM counselors");
        if (counselorsResult.rows.length === 0) {
          return ctx.reply("Hmm, it looks like no counselors are registered yet. Please contact the admin for help! 😔");
        }
        let msg = "**Meet Our Counselors:**\n\n";
        counselorsResult.rows.forEach((c, i) => {
          msg += `${i + 1}. **${c.name}**\n`;
        });
        msg += "\n**Ready to book?**\n";
        msg += "Just type `/book` and I'll walk you through everything!\n\n";
        msg += "**It's super easy - I promise!**";
        await ctx.reply(msg, { parse_mode: 'Markdown' });
        break;
        
      case 'book_appointment':
        await ctx.answerCbQuery();
        // Call the booking command handler
        const bookResult = await pool.query("SELECT id, name FROM counselors");
        if (bookResult.rows.length === 0) {
          return ctx.reply("Sorry, no counselors are available right now. Please contact admin for help! 😔");
        }
        
        // Start booking session
        startBookingSession(userId);
        
        let bookMsg = "📅 Let's Book Your Appointment! 🎉\n\n";
        bookMsg += "Don't worry, I'll guide you through this step by step. It's really easy!\n\n";
        bookMsg += "**Step 1 of 6:** What's your full name?\n\n";
        bookMsg += "Just type your name like this:\n";
        bookMsg += "`John Doe`\n\n";
        bookMsg += "Take your time - no rush! 😊";
        
        await ctx.reply(bookMsg, { parse_mode: 'Markdown' });
        break;
        
      case 'my_appointments':
        await ctx.answerCbQuery();
        // Call the appointments command handler
        const appointments = await getUserAppointments(userId);
        
        if (appointments.length === 0) {
          return ctx.reply("You don't have any appointments yet!\n\nReady to book your first one? Just type /book and I'll help you.");
        }
        
        let appointmentsMsg = "📋 **Here are your appointments:**\n\n";
        appointments.forEach((appointment, index) => {
          const statusEmoji = appointment.status === 'confirmed' ? "✅" : 
                             appointment.status === 'cancelled' ? "❌" : "⏳";
          const code = escapeMarkdown(appointment.appointment_code || appointment.id);
          
          appointmentsMsg += `${index + 1}. ${statusEmoji} **Appointment: ${code}**\n`;
          if (appointment.student_name) {
            appointmentsMsg += `   👤 Student: ${escapeMarkdown(appointment.student_name)}\n`;
          } else if (appointment.client_name) {
            appointmentsMsg += `   👤 Client: ${escapeMarkdown(appointment.client_name)}\n`;
          }
          appointmentsMsg += `   🏥 Counselor: ${escapeMarkdown(appointment.counselor_name)}\n`;
          appointmentsMsg += `   📅 Date: ${escapeMarkdown(formatAppointmentDate(appointment.start_ts || appointment.appointment_date))}\n`;
          appointmentsMsg += `   📊 Status: ${escapeMarkdown(appointment.status?.toUpperCase() || 'PENDING')}\n\n`;
        });
        
        appointmentsMsg += "💡 Need to cancel? Type: `cancel [CODE]`\n";
        appointmentsMsg += "💡 Check details? Type: `status [CODE]`\n\n";
        appointmentsMsg += "I'm here if you need any help! 😊";
        
        await ctx.reply(appointmentsMsg, { parse_mode: 'Markdown' });
        break;
        
      case 'cancel_appointment':
        await ctx.answerCbQuery();
        await ctx.reply("No problem! To cancel an appointment, just tell me the appointment code.\n\nFor example: `cancel A2B3C4`\n\nType `/appointments` to see your appointment codes! ", { parse_mode: 'Markdown' });
        break;
        
      case 'support':
        await ctx.answerCbQuery();
        // Call the support command handler
        supportSessions.set(userId, {
          step: 'category',
          data: {}
        });
        
        await ctx.reply(`Hi there! I'm here to help you. Let me ask you a few questions to understand how I can best assist you. 😊\n\nWhat's bothering you today? You can tell me about:\n\n• Problems with the app or website\n• School work or grades\n• Personal issues or stress\n• Any other concerns\n\nJust tell me what's on your mind - I'm listening! `);
        break;
        
      default:
        await ctx.answerCbQuery("Sorry, I didn't understand that option.");
    }
  } catch (error) {
    console.error('Error handling callback query:', error);
    await ctx.answerCbQuery("Sorry, something went wrong. Please try again.");
  }
});

export default bot;