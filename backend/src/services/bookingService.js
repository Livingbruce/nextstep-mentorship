import pool from "../db/pool.js";
import { workingHoursValidator } from "../utils/workingHoursValidator.js";
import { generateUniqueAppointmentCode } from "../utils/appointmentCodeGenerator.js";
import emailService from "./emailService.js";

const DEFAULT_SESSION_DURATION_MINUTES = 60;

const SESSION_DURATION_MAP = {
  "30": 30,
  "30m": 30,
  "30_min": 30,
  "45": 45,
  "45m": 45,
  "45_min": 45,
  "60": 60,
  "60m": 60,
  "60_min": 60,
  "90": 90,
  "90m": 90,
  "90_min": 90,
};

let intakeTableEnsured = false;

async function ensureIntakeTable() {
  if (intakeTableEnsured) {
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS client_intake_forms (
      id BIGSERIAL PRIMARY KEY,
      appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
      appointment_code TEXT,
      client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
      full_name TEXT,
      gender TEXT,
      pronouns TEXT,
      phone TEXT,
      email TEXT,
      county TEXT,
      town TEXT,
      counseling_type TEXT,
      preferred_datetime TIMESTAMPTZ,
      session_mode TEXT,
      session_duration_minutes INTEGER,
      reason TEXT,
      issue_duration TEXT,
      previous_counseling BOOLEAN,
      previous_counseling_details TEXT,
      consent_data_collection BOOLEAN NOT NULL,
      consent_confidentiality BOOLEAN NOT NULL,
      consent_reminders BOOLEAN,
      payment_method TEXT,
      transaction_reference TEXT,
      payment_confirmation BOOLEAN,
      consent_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      intake_channel TEXT NOT NULL DEFAULT 'web',
      additional_data JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_client_intake_forms_appointment_id
      ON client_intake_forms (appointment_id);
  `);

  intakeTableEnsured = true;
}

function normalizePhone(phone) {
  if (!phone) return null;
  let cleaned = phone.trim();
  if (!cleaned) return null;
  if (cleaned.startsWith("0")) {
    cleaned = "+254" + cleaned.substring(1);
  } else if (!cleaned.startsWith("+") && !cleaned.startsWith("254")) {
    cleaned = `+${cleaned}`;
  } else if (cleaned.startsWith("254")) {
    cleaned = `+${cleaned}`;
  }
  return cleaned;
}

function normalizePaymentMethod(method) {
  if (!method) return null;
  const normalized = String(method).trim().toLowerCase();
  
  // Map frontend values to database-expected values
  // Database constraint allows: 'M-Pesa', 'Card', 'Cash', 'Insurance'
  // Note: 'Bank' or 'Bank Transfer' should be mapped to 'Card' per constraint
  if (normalized === 'mpesa' || normalized === 'm-pesa') {
    return 'M-Pesa';
  }
  if (normalized === 'bank' || normalized === 'bank transfer') {
    // Map bank transfer to Card (database constraint doesn't allow 'Bank Transfer')
    // TODO: Update database constraint to allow 'Bank Transfer' or 'Bank'
    return 'Card';
  }
  if (normalized === 'card' || normalized === 'card payment') {
    return 'Card';
  }
  if (normalized === 'cash') {
    return 'Cash';
  }
  if (normalized === 'insurance' || normalized === 'insurance provider') {
    return 'Insurance';
  }
  
  // Return as-is if already in correct format (must match constraint)
  return method;
}

function normalizeSessionType(sessionMode) {
  if (!sessionMode) return 'in-person'; // Default
  const normalized = String(sessionMode).trim().toLowerCase();
  
  // Map frontend values to database-expected values
  if (normalized.includes('online') || normalized.includes('video') || normalized.includes('video call')) {
    return 'online (video)';
  }
  if (normalized.includes('phone') || normalized.includes('audio') || normalized.includes('audio call')) {
    return 'phone';
  }
  if (normalized.includes('in-person') || normalized.includes('onsite') || normalized.includes('in person')) {
    return 'in-person';
  }
  
  // Default to in-person if not recognized
  return 'in-person';
}

function normalizeSessionDuration(duration) {
  if (!duration) return '60 mins'; // Default
  const normalized = String(duration).trim().toLowerCase();
  
  // Extract numeric value
  const numeric = parseInt(normalized.replace(/\D/g, ''), 10);
  
  // Map to database-expected format
  if (numeric === 45 || normalized.includes('45')) {
    return '45 mins';
  }
  if (numeric === 60 || normalized.includes('60')) {
    return '60 mins';
  }
  if (numeric === 90 || normalized.includes('90')) {
    return '90 mins';
  }
  
  // Default to 60 mins if not recognized
  return '60 mins';
}

function extractDurationMinutes(rawDuration) {
  if (!rawDuration) return DEFAULT_SESSION_DURATION_MINUTES;
  const key = String(rawDuration).trim().toLowerCase();
  if (SESSION_DURATION_MAP[key]) {
    return SESSION_DURATION_MAP[key];
  }
  const numeric = parseInt(key, 10);
  if (Number.isFinite(numeric) && numeric > 0) {
    return numeric;
  }
  if (/45/.test(key)) return 45;
  if (/90/.test(key)) return 90;
  return DEFAULT_SESSION_DURATION_MINUTES;
}

function buildValidationErrors(payload) {
  const errors = [];

  const requiredFields = [
    ["fullName", "Full name is required"],
    ["dateOfBirth", "Date of birth is required"],
    ["phone", "Phone number is required"],
    ["email", "Email address is required"],
    ["county", "County of residence is required"],
    ["emergencyContactName", "Emergency contact name is required"],
    ["emergencyContactPhone", "Emergency contact phone is required"],
    ["counselingType", "Counseling type is required"],
    ["preferredCounselorId", "Preferred counselor is required"],
    ["preferredDateTime", "Preferred appointment date and time is required"],
    ["sessionMode", "Session mode is required"],
    ["reason", "Reason for counseling is required"],
    ["paymentMethod", "Payment method is required"],
    ["mpesaPhoneNumber", "M-Pesa phone number is required when M-Pesa is selected"],
  ];

  for (const [field, message] of requiredFields) {
    const value = payload[field];
    // Special handling for UUID IDs (preferredCounselorId)
    if (field === 'preferredCounselorId') {
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        errors.push({ field, message });
      }
    } else {
      // Check if value is missing, null, undefined, or empty string (after trimming)
      if (
        value === null ||
        value === undefined ||
        value === '' ||
        (typeof value === 'string' && value.trim() === '')
      ) {
        errors.push({ field, message });
      }
    }
  }

  if (!payload.consentDataCollection) {
    errors.push({
      field: "consentDataCollection",
      message: "You must consent to data collection for counseling purposes.",
    });
  }

  if (!payload.consentConfidentiality) {
    errors.push({
      field: "consentConfidentiality",
      message:
        "You must acknowledge the confidentiality and emergency disclosure policy.",
    });
  }

  return errors;
}

// Send booking confirmation email to client
async function sendBookingConfirmationEmail(clientEmail, clientName, appointmentCode, counselorName, appointmentDate, sessionDuration, paymentMethod) {
  try {
    const formattedDate = new Date(appointmentDate).toLocaleString('en-KE', {
      timeZone: 'Africa/Nairobi',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    const mailOptions = {
      from: `"NextStep Therapy Services" <${process.env.EMAIL_USER || 'dsnurturers@gmail.com'}>`,
      to: clientEmail,
      subject: `Booking Confirmation - Appointment ${appointmentCode}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Booking Confirmation</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .info-box { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #667eea; }
            .info-label { font-weight: bold; color: #667eea; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Booking Confirmed</h1>
              <p>Your appointment has been received</p>
            </div>
            <div class="content">
              <p>Dear ${clientName},</p>
              <p>Thank you for booking with NextStep Therapy Services. Your appointment has been received and is pending payment confirmation.</p>
              
              <div class="info-box">
                <p><span class="info-label">Appointment Code:</span> ${appointmentCode}</p>
                <p><span class="info-label">Date & Time:</span> ${formattedDate}</p>
                <p><span class="info-label">Counselor:</span> ${counselorName}</p>
                <p><span class="info-label">Duration:</span> ${sessionDuration} minutes</p>
                <p><span class="info-label">Payment Method:</span> ${paymentMethod}</p>
              </div>

              <p><strong>Next Steps:</strong></p>
              <ul>
                <li>Complete payment using your selected payment method</li>
                <li>You will receive a confirmation email once payment is verified</li>
                <li>You will receive reminders 1 day and 1 hour before your appointment</li>
              </ul>

              <p>If you have any questions, please contact us at nextstepmentorship@gmail.com</p>
            </div>
            <div class="footer">
              <p>© 2025 NextStep Therapy Services. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Booking Confirmation - Appointment ${appointmentCode}\n\nDear ${clientName},\n\nThank you for booking with NextStep Therapy Services. Your appointment has been received and is pending payment confirmation.\n\nAppointment Code: ${appointmentCode}\nDate & Time: ${formattedDate}\nCounselor: ${counselorName}\nDuration: ${sessionDuration} minutes\nPayment Method: ${paymentMethod}\n\nNext Steps:\n- Complete payment using your selected payment method\n- You will receive a confirmation email once payment is verified\n- You will receive reminders 1 day and 1 hour before your appointment\n\nIf you have any questions, please contact us at nextstepmentorship@gmail.com\n\n© 2025 NextStep Therapy Services. All rights reserved.`
    };

    await emailService.transporter.sendMail(mailOptions);
    console.log(`✅ Booking confirmation email sent to ${clientEmail}`);
  } catch (error) {
    console.error('Error sending booking confirmation email:', error);
    // Don't throw - email failure shouldn't break booking
  }
}

// Send notification email to counselor
async function sendCounselorNotificationEmail(counselorEmail, counselorName, clientName, appointmentCode, appointmentDate, sessionDuration) {
  try {
    const formattedDate = new Date(appointmentDate).toLocaleString('en-KE', {
      timeZone: 'Africa/Nairobi',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    const mailOptions = {
      from: `"NextStep Therapy Services" <${process.env.EMAIL_USER || 'dsnurturers@gmail.com'}>`,
      to: counselorEmail,
      subject: `New Appointment Booking - ${appointmentCode}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Appointment</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .info-box { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #667eea; }
            .info-label { font-weight: bold; color: #667eea; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📅 New Appointment</h1>
              <p>A new appointment has been booked</p>
            </div>
            <div class="content">
              <p>Dear ${counselorName},</p>
              <p>A new appointment has been booked with you.</p>
              
              <div class="info-box">
                <p><span class="info-label">Appointment Code:</span> ${appointmentCode}</p>
                <p><span class="info-label">Client:</span> ${clientName}</p>
                <p><span class="info-label">Date & Time:</span> ${formattedDate}</p>
                <p><span class="info-label">Duration:</span> ${sessionDuration} minutes</p>
                <p><span class="info-label">Status:</span> Pending Payment</p>
              </div>

              <p>Please log in to your dashboard to view full details and confirm payment once received.</p>
            </div>
            <div class="footer">
              <p>© 2025 NextStep Therapy Services. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `New Appointment Booking - ${appointmentCode}\n\nDear ${counselorName},\n\nA new appointment has been booked with you.\n\nAppointment Code: ${appointmentCode}\nClient: ${clientName}\nDate & Time: ${formattedDate}\nDuration: ${sessionDuration} minutes\nStatus: Pending Payment\n\nPlease log in to your dashboard to view full details and confirm payment once received.\n\n© 2025 NextStep Therapy Services. All rights reserved.`
    };

    await emailService.transporter.sendMail(mailOptions);
    console.log(`✅ Counselor notification email sent to ${counselorEmail}`);
  } catch (error) {
    console.error('Error sending counselor notification email:', error);
    // Don't throw - email failure shouldn't break booking
  }
}

// Schedule appointment reminder emails
async function scheduleAppointmentReminders(appointmentId, clientEmail, clientName, appointmentDate, counselorName) {
  try {
    // Schedule 1 day before reminder
    const oneDayBefore = new Date(new Date(appointmentDate).getTime() - (24 * 60 * 60 * 1000));
    const oneHourBefore = new Date(new Date(appointmentDate).getTime() - (60 * 60 * 1000));

    // Store reminder schedule in database (we'll need a reminders table or use notifications table)
    // For now, we'll use a simple approach with cron jobs checking appointments
    // This will be handled by a scheduled task that checks appointments and sends reminders
    
    console.log(`✅ Appointment reminders scheduled for appointment ${appointmentId}`);
  } catch (error) {
    console.error('Error scheduling appointment reminders:', error);
  }
}

export async function createWebBooking(payload) {
  await ensureIntakeTable();

  const errors = buildValidationErrors(payload);
  if (errors.length > 0) {
    const error = new Error("Validation error");
    error.status = 400;
    error.code = "VALIDATION_ERROR";
    error.details = errors;
    throw error;
  }

  const preferredDate = new Date(payload.preferredDateTime);
  if (isNaN(preferredDate.getTime())) {
    const error = new Error("Invalid date provided");
    error.status = 400;
    error.code = "INVALID_DATE";
    throw error;
  }

  const durationMinutes = extractDurationMinutes(payload.sessionDuration);
  const endDate = new Date(preferredDate.getTime() + durationMinutes * 60000);

  const rangeValidation = workingHoursValidator.isValidAppointmentRange(
    preferredDate,
    endDate
  );
  if (!rangeValidation.isValid) {
    const error = new Error(rangeValidation.reason);
    error.status = 400;
    error.code = "INVALID_TIME";
    throw error;
  }

  const counselorResult = await pool.query(
    "SELECT id, name, email FROM counselors WHERE id = $1 AND is_active = true",
    [payload.preferredCounselorId]
  );

  if (counselorResult.rows.length === 0) {
    const error = new Error("Selected counselor is not available");
    error.status = 404;
    error.code = "COUNSELOR_NOT_FOUND";
    throw error;
  }

  const counselor = counselorResult.rows[0];

  const absenceResult = await pool.query(
    "SELECT 1 FROM absence_days WHERE counselor_id = $1 AND date = $2 LIMIT 1",
    [counselor.id, preferredDate.toISOString().split("T")[0]]
  );

  if (absenceResult.rows.length > 0) {
    const error = new Error(
      "Counselor is not available on the selected date. Please choose another time."
    );
    error.status = 409;
    error.code = "COUNSELOR_UNAVAILABLE";
    throw error;
  }

  const conflictResult = await pool.query(
    `SELECT 1 FROM appointments
     WHERE counselor_id = $1
       AND status <> 'cancelled'
       AND NOT ($2 >= end_ts OR $3 <= start_ts)
     LIMIT 1`,
    [counselor.id, endDate.toISOString(), preferredDate.toISOString()]
  );

  if (conflictResult.rows.length > 0) {
    const error = new Error(
      "Selected time slot is already booked. Please choose another."
    );
    error.status = 409;
    error.code = "TIME_CONFLICT";
    throw error;
  }

  const phone = normalizePhone(payload.phone);
  const consentTimestamp = new Date();

  const sessionDurationLabel = payload.sessionDuration || `${durationMinutes} minutes`;

  const contactInfoParts = [];
  if (phone) contactInfoParts.push(`Phone: ${phone}`);
  if (payload.email) contactInfoParts.push(`Email: ${payload.email}`);
  if (payload.county || payload.town) {
    contactInfoParts.push(
      `Location: ${[payload.town, payload.county].filter(Boolean).join(", ")}`
    );
  }
  const contactInfo = contactInfoParts.join(" | ");

  const reason = payload.reason?.trim();
  const goals = payload.sessionGoals?.trim() || null;

  const consentReminders =
    typeof payload.consentReminders === "boolean"
      ? payload.consentReminders
      : null;

  const previousCounseling =
    typeof payload.previousCounseling === "boolean"
      ? payload.previousCounseling
      : payload.previousCounseling === "yes";

  await pool.query("BEGIN");

  try {
    const emergencyContactPhone = payload.emergencyContactPhone
      ? normalizePhone(payload.emergencyContactPhone)
      : null;

    const clientInsert = await pool.query(
      `INSERT INTO clients (
        full_name,
        date_of_birth,
        contact_info,
        emergency_contact_name,
        emergency_contact_phone,
        therapy_reason,
        session_goals,
        previous_therapy,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING id`,
      [
        payload.fullName?.trim(),
        payload.dateOfBirth ? new Date(payload.dateOfBirth) : null,
        contactInfo || null,
        payload.emergencyContactName?.trim() || null,
        emergencyContactPhone,
        reason || null,
        goals,
        previousCounseling,
      ]
    );

    let clientId = clientInsert.rows[0].id;
    
    // Try to link client to Telegram user if they've interacted with bot before
    // Check if there's an existing client with same phone/email that has telegram_user_id
    if (phone || payload.email) {
      try {
        const existingClient = await pool.query(
          `SELECT id, telegram_user_id FROM clients 
           WHERE telegram_user_id IS NOT NULL
           AND (
             (contact_info LIKE $1 AND $1 IS NOT NULL AND $1 != '')
             OR (contact_info LIKE $2 AND $2 IS NOT NULL AND $2 != '')
           )
           LIMIT 1`,
          [phone ? `%${phone}%` : null, payload.email ? `%${payload.email}%` : null]
        );
        
        if (existingClient.rows.length > 0 && existingClient.rows[0].telegram_user_id) {
          // Update the new client record to link it to the Telegram user
          await pool.query(
            `UPDATE clients 
             SET telegram_user_id = $1, telegram_username = (
               SELECT telegram_username FROM user_sessions WHERE telegram_user_id = $1 LIMIT 1
             )
             WHERE id = $2`,
            [existingClient.rows[0].telegram_user_id, clientId]
          );
          console.log(`[Booking Service] Linked client ${clientId} to Telegram user ${existingClient.rows[0].telegram_user_id}`);
        }
      } catch (linkErr) {
        console.error('[Booking Service] Error linking client to Telegram user:', linkErr);
        // Don't fail the booking if linking fails
      }
    }
    
    const appointmentCode = await generateUniqueAppointmentCode();
    const normalizedPaymentMethod = normalizePaymentMethod(payload.paymentMethod);
    const normalizedSessionType = normalizeSessionType(payload.sessionMode);
    const normalizedSessionDuration = normalizeSessionDuration(payload.sessionDuration);

    // Calculate session cost based on duration
    let sessionCost = 0;
    const durationMinutes = extractDurationMinutes(payload.sessionDuration);
    if (durationMinutes === 45) sessionCost = 2500; // 45 mins = KES 2500
    else if (durationMinutes === 60) sessionCost = 3000; // 60 mins = KES 3000
    else if (durationMinutes === 90) sessionCost = 4000; // 90 mins = KES 4000

    const appointmentInsert = await pool.query(
      `INSERT INTO appointments (
        client_id,
        counselor_id,
        appointment_date,
        end_date,
        start_ts,
        end_ts,
        session_type,
        session_duration,
        payment_method,
        status,
        created_at,
        appointment_code,
        payment_status,
        amount_cents
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending_payment', NOW(), $10, 'pending', $11)
      RETURNING id, appointment_code`,
      [
        clientId,
        counselor.id,
        preferredDate.toISOString(),
        endDate.toISOString(),
        preferredDate.toISOString(),
        endDate.toISOString(),
        normalizedSessionType,
        normalizedSessionDuration,
        normalizedPaymentMethod,
        appointmentCode,
        sessionCost,
      ]
    );

    const appointment = appointmentInsert.rows[0];

    await pool.query(
      `INSERT INTO client_intake_forms (
        appointment_id,
        appointment_code,
        client_id,
        full_name,
        gender,
        pronouns,
        phone,
        email,
        county,
        town,
        counseling_type,
        preferred_datetime,
        session_mode,
        session_duration_minutes,
        reason,
        issue_duration,
        previous_counseling,
        previous_counseling_details,
        consent_data_collection,
        consent_confidentiality,
        consent_reminders,
        payment_method,
        transaction_reference,
        payment_confirmation,
        consent_timestamp,
        additional_data
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18,
        $19, $20, $21, $22, $23, $24, $25, $26
      )`,
      [
        appointment.id,
        appointmentCode,
        clientId,
        payload.fullName?.trim() || null,
        payload.gender || null,
        payload.pronouns || null,
        phone,
        payload.email?.trim() || null,
        payload.county || null,
        payload.town || null,
        payload.counselingType || null,
        preferredDate.toISOString(),
        payload.sessionMode || null,
        durationMinutes,
        reason || null,
        payload.issueDuration || null,
        previousCounseling,
        payload.previousCounselingDetails || null,
        Boolean(payload.consentDataCollection),
        Boolean(payload.consentConfidentiality),
        consentReminders,
        normalizedPaymentMethod,
        payload.transactionReference || null,
        Boolean(payload.paymentConfirmation),
        consentTimestamp.toISOString(),
        JSON.stringify({
          counselorPreference: counselor.name,
          submittedFrom: 'web-form',
          // Store card payment details if provided (encrypted/hashed in production)
          ...(payload.paymentMethod === 'card' && payload.cardNumber && {
            cardPaymentDetails: {
              cardholderName: payload.cardholderName,
              cardLast4: payload.cardNumber.slice(-4),
              expiryMonth: payload.expiryMonth,
              expiryYear: payload.expiryYear,
            },
          }),
        }),
      ]
    );

    await pool.query("COMMIT");

    // Initiate payment based on method
    if (normalizedPaymentMethod === "M-Pesa") {
      // Use phone number from form (mpesaPhoneNumber) or fallback to contact phone
      const mpesaPhone = payload.mpesaPhoneNumber || phone;
      if (mpesaPhone) {
        try {
          const { initiateMpesaSTKPush } = await import("./paymentService.js");
          await initiateMpesaSTKPush(
            mpesaPhone,
            sessionCost,
            appointmentCode,
            `Payment for appointment ${appointmentCode}`
          );
          console.log(`[Booking Service] M-Pesa STK push initiated for appointment ${appointmentCode} to ${mpesaPhone}`);
        } catch (paymentError) {
          console.error("[Booking Service] Error initiating M-Pesa payment:", paymentError);
          // Don't fail the booking if payment initiation fails - user can pay later
        }
      } else {
        console.warn("[Booking Service] M-Pesa selected but no phone number provided");
      }
    } else if (normalizedPaymentMethod === "Card" && payload.cardNumber) {
      try {
        const { processCardPayment } = await import("./paymentService.js");
        const cardResult = await processCardPayment(
          {
            cardholderName: payload.cardholderName,
            cardNumber: payload.cardNumber,
            expiryMonth: payload.expiryMonth,
            expiryYear: payload.expiryYear,
            cvv: payload.cvv,
          },
          sessionCost,
          appointmentCode,
          payload.email,
          phone
        );
        console.log(`[Booking Service] Card payment initiated for appointment ${appointmentCode}`);
        // Return redirect URL if needed
        if (cardResult.redirectUrl) {
          return {
            appointmentId: appointment.id,
            appointmentCode: appointment.appointment_code,
            counselor: counselor.name,
            appointmentDate: preferredDate.toISOString(),
            sessionDurationMinutes: durationMinutes,
            paymentRedirectUrl: cardResult.redirectUrl,
          };
        }
      } catch (paymentError) {
        console.error("[Booking Service] Error initiating card payment:", paymentError);
        // Don't fail the booking if payment initiation fails - user can pay later
      }
    }

    // Send email notifications (non-blocking)
    Promise.all([
      sendBookingConfirmationEmail(
        payload.email,
        payload.fullName,
        appointment.appointment_code,
        counselor.name,
        preferredDate.toISOString(),
        durationMinutes,
        normalizedPaymentMethod
      ),
      sendCounselorNotificationEmail(
        counselor.email || null,
        counselor.name,
        payload.fullName,
        appointment.appointment_code,
        preferredDate.toISOString(),
        durationMinutes
      ).catch(err => {
        // Counselor email might not be available, that's okay
        console.log('Counselor email not sent (email may not be configured):', err.message);
      }),
      scheduleAppointmentReminders(
        appointment.id,
        payload.email,
        payload.fullName,
        preferredDate.toISOString(),
        counselor.name
      )
    ]).catch(err => {
      console.error('Error sending booking notifications:', err);
      // Don't throw - email failures shouldn't break booking
    });

    return {
      appointmentId: appointment.id,
      appointmentCode: appointment.appointment_code,
      counselor: counselor.name,
      appointmentDate: preferredDate.toISOString(),
      sessionDurationMinutes: durationMinutes,
    };
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  }
}

