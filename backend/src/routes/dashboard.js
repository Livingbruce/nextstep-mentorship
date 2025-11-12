import express from "express";
import pool from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import bot from "../bot.js";

const router = express.Router();

const parseBoolean = (value) => {
  if (value === undefined || value === null) return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off"].includes(normalized)) return false;
  }
  return null;
};

// Apply auth middleware to all routes
router.use(requireAuth);

// Contacts routes
router.get("/contacts", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, type, phone, email, location, website, description,
              is_primary, is_urgent, display_order, metadata, created_at, updated_at
       FROM contacts
       ORDER BY is_primary DESC, display_order ASC, name ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching contacts:", err);
    res.status(500).json({ error: "Failed to fetch contacts" });
  }
});

router.post("/contacts", async (req, res) => {
  try {
    const {
      name,
      type = "General",
      phone = null,
      email = null,
      location = null,
      website = null,
      description = null,
      is_primary = false,
      is_urgent = false,
      display_order = 0,
      metadata = null
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Name is required" });
    }

    const primaryValue = parseBoolean(is_primary);
    const urgentValue = parseBoolean(is_urgent);
    const orderValue = Number.isFinite(Number(display_order)) ? Number(display_order) : 0;

    const result = await pool.query(
      `INSERT INTO contacts (name, type, phone, email, location, website, description,
                             is_primary, is_urgent, display_order, metadata, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $12)
       RETURNING *`,
      [
        name.trim(),
        type,
        phone,
        email,
        location,
        website,
        description,
        primaryValue ?? false,
        urgentValue ?? false,
        orderValue,
        metadata ? JSON.stringify(metadata) : null,
        req.counselor.id
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating contact:", err);
    res.status(500).json({ error: "Failed to create contact" });
  }
});

router.put("/contacts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      type,
      phone,
      email,
      location,
      website,
      description,
      is_primary,
      is_urgent,
      display_order,
      metadata
    } = req.body;

    if (name !== undefined && !name.trim()) {
      return res.status(400).json({ error: "Name cannot be empty" });
    }

    const primaryValue = parseBoolean(is_primary);
    const urgentValue = parseBoolean(is_urgent);
    const orderValue = Number.isFinite(Number(display_order)) ? Number(display_order) : null;

    const result = await pool.query(
      `UPDATE contacts
       SET name = COALESCE($2, name),
           type = COALESCE($3, type),
           phone = COALESCE($4, phone),
           email = COALESCE($5, email),
           location = COALESCE($6, location),
           website = COALESCE($7, website),
           description = COALESCE($8, description),
           is_primary = COALESCE($9, is_primary),
           is_urgent = COALESCE($10, is_urgent),
           display_order = COALESCE($11, display_order),
           metadata = COALESCE($12::jsonb, metadata),
           updated_by = $13,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        id,
        name ? name.trim() : null,
        type,
        phone,
        email,
        location,
        website,
        description,
        primaryValue,
        urgentValue,
        orderValue,
        metadata ? JSON.stringify(metadata) : null,
        req.counselor.id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Contact not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating contact:", err);
    res.status(500).json({ error: "Failed to update contact" });
  }
});

router.delete("/contacts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM contacts WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Contact not found" });
    }

    res.json({ success: true, message: "Contact deleted" });
  } catch (err) {
    console.error("Error deleting contact:", err);
    res.status(500).json({ error: "Failed to delete contact" });
  }
});

// Appointments routes
router.get("/appointments", async (req, res) => {
  try {
    console.log("Fetching appointments for counselor ID:", req.counselor.id);
    
  const result = await pool.query(
      `SELECT a.id, a.student_id, a.client_id, a.counselor_id,
              a.start_ts, a.end_ts, a.appointment_date, a.end_date,
              a.status, a.payment_status, a.payment_method, a.session_type, a.session_duration,
              a.appointment_code,
              s.name as student_name, s.admission_no, s.phone, s.year_of_study as year,
              c.full_name as client_name, c.contact_info as client_contact,
              c.date_of_birth as client_dob, c.emergency_contact_name, c.emergency_contact_phone,
              c.therapy_reason, c.session_goals, c.previous_therapy,
              cif.gender, cif.pronouns, cif.phone as intake_phone, cif.email as intake_email,
              cif.county, cif.town, cif.counseling_type, cif.reason as intake_reason,
              cif.issue_duration,
              cif.previous_counseling, cif.previous_counseling_details,
              cif.session_mode, cif.session_duration_minutes,
              cif.payment_method as intake_payment_method, cif.transaction_reference
       FROM appointments a
       LEFT JOIN students s ON a.student_id = s.id
       LEFT JOIN clients c ON a.client_id = c.id
       LEFT JOIN client_intake_forms cif ON cif.appointment_id = a.id
       WHERE a.counselor_id = $1
       ORDER BY COALESCE(a.start_ts, a.appointment_date) DESC`,
      [req.counselor.id]
    );
    
    console.log("Appointments fetched:", result.rows.length);
    console.log("Appointments data:", result.rows.map(a => ({
      id: a.id,
      start_ts: a.start_ts || a.appointment_date,
      end_ts: a.end_ts || a.end_date,
      status: a.status,
      display_name: a.client_name || a.student_name || `#${a.student_id || a.client_id}`
    })));
    
  res.json(result.rows);
  } catch (err) {
    console.error("Error fetching appointments:", err);
    res.status(500).json({ error: "Failed to fetch appointments" });
  }
});

// Mark appointment session as completed
router.post("/appointments/:id/complete", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE appointments 
       SET session_status = 'completed'
       WHERE id = $1 AND counselor_id = $2
       RETURNING *`,
      [id, req.counselor.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    const appointment = result.rows[0];

    // Send review request to client via bot if they have telegram
    const telegramUserId = appointment.telegram_user_id;
    if (telegramUserId && !appointment.review_requested) {
      try {
        await bot.telegram.sendMessage(
          telegramUserId,
          `✅ Your session with ${req.counselor.name} has been completed!\n\n` +
          `We'd love to hear about your experience. Please take a moment to review your session:\n\n` +
          `Type /review ${id} to leave a review\n\n` +
          `Thank you for choosing our counseling services!`
        );
        
        // Mark review as requested if the column exists
        try {
          await pool.query(
            `UPDATE appointments SET review_requested = true WHERE id = $1`,
            [id]
          );
        } catch (_) {
          // ignore if column doesn't exist
        }
      } catch (botError) {
        console.error("Failed to send review request:", botError.message);
      }
    }

    res.json({ success: true, appointment: result.rows[0] });
  } catch (err) {
    console.error("Error completing appointment:", err);
    res.status(500).json({ error: "Failed to complete appointment" });
  }
});

// Mark appointment as no-show
router.post("/appointments/:id/no-show", async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `UPDATE appointments 
       SET session_status = 'no_show'
       WHERE id = $1 AND counselor_id = $2
       RETURNING *`,
      [id, req.counselor.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Appointment not found" });
    }
    
    const appointment = result.rows[0];
    
    // Send missed appointment notification to client
    const telegramUserId = appointment.telegram_user_id;
    if (telegramUserId) {
      try {
        await bot.telegram.sendMessage(
          telegramUserId,
          `❌ We noticed you missed your scheduled appointment with ${req.counselor.name}.\n\n` +
          `If you need to reschedule, please contact us or book a new appointment.\n\n` +
          `Type /book to schedule a new appointment.`
        );
      } catch (botError) {
        console.error("Failed to send no-show notification:", botError.message);
      }
    }
    
    res.json({ success: true, appointment: result.rows[0] });
  } catch (err) {
    console.error("Error marking no-show:", err);
    res.status(500).json({ error: "Failed to mark no-show" });
  }
});

// Get reviews for counselor
router.get("/reviews", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ar.*, 
              a.appointment_date,
              COALESCE(s.name, c.full_name) as client_name,
              COALESCE(s.phone, c.contact_info) as client_contact
       FROM appointment_reviews ar
       JOIN appointments a ON ar.appointment_id = a.id
       LEFT JOIN students s ON a.student_id = s.id
       LEFT JOIN clients c ON a.client_id = c.id
       WHERE ar.counselor_id = $1
       ORDER BY ar.created_at DESC`,
      [req.counselor.id]
    );
    
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching reviews:", err);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

router.post("/appointments/:id/cancel", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "UPDATE appointments SET status = 'cancelled' WHERE id = $1 AND counselor_id = $2 RETURNING *",
      [id, req.counselor.id] // Changed from req.counselor.id
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Appointment not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error cancelling appointment:", err);
    res.status(500).json({ error: "Failed to cancel appointment" });
  }
});

// Delete cancelled appointment permanently
router.delete("/appointments/:id/delete", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete the appointment permanently (counselor-owned)
    const result = await pool.query(
      "DELETE FROM appointments WHERE id = $1 AND counselor_id = $2 RETURNING *",
      [id, req.counselor.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Appointment not found" });
    }
    res.json({ message: "Appointment deleted successfully", deletedAppointment: result.rows[0] });
  } catch (err) {
    console.error("Error deleting appointment:", err);
    res.status(500).json({ error: "Failed to delete appointment" });
  }
});

router.post("/appointments/:id/postpone", async (req, res) => {
  try {
    const { id } = req.params;
    const { newDate } = req.body;
    
    console.log("=== POSTPONE DEBUG ===");
    console.log("Appointment ID:", id);
    console.log("New Date:", newDate);
    console.log("Counselor ID:", req.counselor.id);
    console.log("Counselor:", req.counselor);
    
    // Check if appointment exists and get its current data
    const existingAppointment = await pool.query(
      "SELECT * FROM appointments WHERE id = $1",
      [id]
    );
    
    console.log("Existing appointment:", existingAppointment.rows[0]);
    
    if (existingAppointment.rows.length === 0) {
      return res.status(404).json({ error: "Appointment not found" });
    }
    
    // Clean the date string - remove any extra characters
    const cleanDate = newDate.replace(/[()]/g, '').trim();
    
    // Validate the date format
    const dateRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
    if (!dateRegex.test(cleanDate)) {
      return res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD HH:mm" });
    }
    
    // Convert newDate to ISO string for database
    // Parse the date as Nairobi time (database stores Nairobi time)
    const [datePart, timePart] = cleanDate.split(' ');
    const [yearStr, monthStr, dayStr] = datePart.split('-');
    const [hourStr, minuteStr] = timePart.split(':');
    
    // Create date in Nairobi time
    const appointmentDate = new Date(
      parseInt(yearStr), 
      parseInt(monthStr) - 1, // Month is 0-indexed
      parseInt(dayStr), 
      parseInt(hourStr), 
      parseInt(minuteStr)
    );
    
    if (isNaN(appointmentDate.getTime())) {
      return res.status(400).json({ error: "Invalid date value" });
    }
    
    // Store as Nairobi time string (same format as bot)
    const year = appointmentDate.getFullYear();
    const month = (appointmentDate.getMonth() + 1).toString().padStart(2, '0');
    const day = appointmentDate.getDate().toString().padStart(2, '0');
    const hour = appointmentDate.getHours().toString().padStart(2, '0');
    const minute = appointmentDate.getMinutes().toString().padStart(2, '0');
    const second = appointmentDate.getSeconds().toString().padStart(2, '0');
    
    const formattedDate = `${year}-${month}-${day} ${hour}:${minute}:${second}`;
    const endHour = (parseInt(hour) + 1).toString().padStart(2, '0');
    const endDate = `${year}-${month}-${day} ${endHour}:${minute}:${second}`;
    
    console.log("Formatted dates:", { formattedDate, endDate });
    
    const result = await pool.query(
      "UPDATE appointments SET start_ts = $1, end_ts = $2, status = 'pending', updated_at = NOW() WHERE id = $3 AND counselor_id = $4 RETURNING *",
      [formattedDate, endDate, id, req.counselor.id]
    );
    
    console.log("Postpone update result:", result.rows);
    console.log("Rows affected:", result.rowCount);
    
    if (result.rows.length === 0) {
      console.log("❌ No appointment found with ID:", id, "for counselor:", req.counselor.id);
      return res.status(404).json({ error: "Appointment not found" });
    }
    
    console.log("✅ Appointment postponed successfully:", result.rows[0]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error postponing appointment:", err);
    res.status(500).json({ error: "Failed to postpone appointment" });
  }
});

// Transfer or reschedule an appointment (optionally change therapist)
router.post("/appointments/:id/transfer", async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { new_start_ts, new_end_ts, new_counselor_id } = req.body;

    // Fetch existing appointment
    const { rows: apptRows } = await client.query(
      `SELECT a.*, s.telegram_user_id, s.name as student_name FROM appointments a
       LEFT JOIN students s ON a.student_id = s.id
       WHERE a.id = $1`,
      [id]
    );
    if (apptRows.length === 0) {
      return res.status(404).json({ error: "Appointment not found" });
    }
    const appt = apptRows[0];

    // Only the current counselor can transfer their own appointment
    if (appt.counselor_id !== req.counselor.id) {
      return res.status(403).json({ error: "Not authorized to transfer this appointment" });
    }

    // Validate dates if provided
    let startTs = appt.start_ts;
    let endTs = appt.end_ts;
    if (new_start_ts) {
      const dateRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
      const cleanStart = new_start_ts.replace(/[()]/g, '').trim();
      if (!dateRegex.test(cleanStart)) {
        return res.status(400).json({ error: "Invalid new_start_ts format. Use YYYY-MM-DD HH:mm" });
      }
      const [d, t] = cleanStart.split(' ');
      const [Y, M, D] = d.split('-').map(Number);
      const [h, m] = t.split(':').map(Number);
      const startDate = new Date(Y, M - 1, D, h, m, 0);
      if (isNaN(startDate.getTime())) return res.status(400).json({ error: "Invalid new_start_ts value" });
      const year = startDate.getFullYear();
      const month = (startDate.getMonth() + 1).toString().padStart(2, '0');
      const day = startDate.getDate().toString().padStart(2, '0');
      const hour = startDate.getHours().toString().padStart(2, '0');
      const minute = startDate.getMinutes().toString().padStart(2, '0');
      const second = startDate.getSeconds().toString().padStart(2, '0');
      startTs = `${year}-${month}-${day} ${hour}:${minute}:${second}`;

      // Derive end if not provided: default 1 hour later
      if (!new_end_ts) {
        const endHour = (parseInt(hour) + 1).toString().padStart(2, '0');
        endTs = `${year}-${month}-${day} ${endHour}:${minute}:${second}`;
      }
    }
    if (new_end_ts) {
      const dateRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
      const cleanEnd = new_end_ts.replace(/[()]/g, '').trim();
      if (!dateRegex.test(cleanEnd)) {
        return res.status(400).json({ error: "Invalid new_end_ts format. Use YYYY-MM-DD HH:mm" });
      }
      const [d, t] = cleanEnd.split(' ');
      const [Y, M, D] = d.split('-').map(Number);
      const [h, m] = t.split(':').map(Number);
      const endDate = new Date(Y, M - 1, D, h, m, 0);
      if (isNaN(endDate.getTime())) return res.status(400).json({ error: "Invalid new_end_ts value" });
      const year = endDate.getFullYear();
      const month = (endDate.getMonth() + 1).toString().padStart(2, '0');
      const day = endDate.getDate().toString().padStart(2, '0');
      const hour = endDate.getHours().toString().padStart(2, '0');
      const minute = endDate.getMinutes().toString().padStart(2, '0');
      const second = endDate.getSeconds().toString().padStart(2, '0');
      endTs = `${year}-${month}-${day} ${hour}:${minute}:${second}`;
    }

    await client.query('BEGIN');

    // Guard: prevent double booking for target counselor
    const targetCounselorId = new_counselor_id || appt.counselor_id;

    // Check overlap with existing appointments (excluding this appointment)
    const overlapAppointments = await client.query(
      `SELECT 1 FROM appointments
       WHERE counselor_id = $1 AND id <> $2 AND status <> 'cancelled'
       AND NOT ($3 >= end_ts OR $4 <= start_ts)
       LIMIT 1`,
      [targetCounselorId, id, startTs, endTs]
    );
    if (overlapAppointments.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Time conflict: therapist already has an appointment in this time window' });
    }

    // If slots table is in use, ensure an available slot covers this time and reserve it
    let reservedSlotId = null;
    try {
      const slotCover = await client.query(
        `SELECT id FROM counselor_slots
         WHERE counselor_id=$1 AND is_booked=false
         AND start_ts <= $2 AND end_ts >= $3
         LIMIT 1 FOR UPDATE`,
        [targetCounselorId, startTs, endTs]
      );
      if (slotCover.rows.length === 0) {
        // If no slot found, we still allow transfer but warn with 409 unless keeping same therapist without slots system
        // To be strict, block transfer when slots are enforced
        // Comment this out if slots are optional
        // throw new Error('NO_AVAILABLE_SLOT');
      } else {
        reservedSlotId = slotCover.rows[0].id;
      }
    } catch (_) {
      // Slots table may not exist; ignore
    }

    // Apply transfer updates
    const { rows: updatedRows } = await client.query(
      `UPDATE appointments
       SET counselor_id=$1, start_ts=$2, end_ts=$3, status='pending', updated_at=NOW()
       WHERE id=$4 RETURNING *`,
      [targetCounselorId, startTs, endTs, id]
    );
    const updated = updatedRows[0];

    // If we reserved a slot, mark it booked and link it
    if (reservedSlotId) {
      try {
        await client.query(
          `UPDATE counselor_slots SET is_booked=true, appointment_id=$1 WHERE id=$2`,
          [updated.id, reservedSlotId]
        );
      } catch (_) {}
    }

    // Clear existing pending notifications for this appointment
    await client.query(`DELETE FROM notifications WHERE appointment_id=$1 AND status='pending'`, [id]);

    // Schedule new notifications (1 day and 1 hour before)
    try {
      const startDate = new Date(startTs);
      const oneDayBefore = new Date(startDate.getTime() - (24 * 60 * 60 * 1000));
      const oneHourBefore = new Date(startDate.getTime() - (60 * 60 * 1000));
      if (appt.telegram_user_id) {
        await client.query(
          `INSERT INTO notifications (appointment_id, telegram_user_id, notification_type, scheduled_for, status)
           VALUES ($1,$2,'1_day_before',$3,'pending'), ($1,$2,'1_hour_before',$4,'pending')`,
          [id, appt.telegram_user_id, oneDayBefore, oneHourBefore]
        );
      }
    } catch (_) {}

    await client.query('COMMIT');

    // Notify client via Telegram or email fallback (best-effort)
    try {
      const { sendMessageToUser } = await import('../utils/botSender.js');
      const dateText = `${startTs}`;
      const baseMsg = new_counselor_id
        ? `Your appointment has been transferred to another therapist and rescheduled.\n\nNew Therapist ID: ${targetCounselorId}\nNew Date: ${dateText}`
        : `Your appointment has been rescheduled.\n\nNew Date: ${dateText}`;
      if (appt.telegram_user_id) {
        await sendMessageToUser(appt.telegram_user_id, baseMsg);
      } else {
        // Email fallback to student if available
        try {
          const studentRes = await pool.query(`SELECT email, name FROM students WHERE id=$1`, [appt.student_id]);
          if (studentRes.rows.length > 0 && studentRes.rows[0].email) {
            const emailService = (await import('../services/emailService.js')).default;
            await emailService.transporter.sendMail({
              from: 'NextStep Mentorship <nextstepmentorship@gmail.com>',
              to: studentRes.rows[0].email,
              subject: 'Your appointment has been updated',
              text: `Hello ${studentRes.rows[0].name || 'Student'},\n\n${baseMsg.replace(/\n/g, '\n')}\n\nThank you.`,
            });
          }
        } catch (e) {
          console.error('Email fallback error (client transfer):', e.message);
        }
      }
    } catch (e) {
      console.error('Bot notify error (client transfer):', e.message);
    }

    // Notify the new therapist via email when therapist changed
    if (new_counselor_id && new_counselor_id !== appt.counselor_id) {
      try {
        const counselorResult = await pool.query(`SELECT name, email FROM counselors WHERE id=$1`, [new_counselor_id]);
        if (counselorResult.rows.length > 0) {
          const counselor = counselorResult.rows[0];
          const emailService = (await import('../services/emailService.js')).default;
          await emailService.transporter.sendMail({
            from: 'NextStep Mentorship <nextstepmentorship@gmail.com>',
            to: counselor.email,
            subject: 'New transferred appointment assigned to you',
            text: `Hello ${counselor.name},\n\nYou have been assigned a transferred appointment.\nStudent: ${appt.student_name || appt.student_id}\nDate: ${updated.start_ts}\n\nPlease check your dashboard.`,
          });
        }
      } catch (e) {
        console.error('Email notify error (therapist transfer):', e.message);
      }
    }

    res.json(updated);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error("Error transferring appointment:", err);
    res.status(500).json({ error: "Failed to transfer appointment" });
  } finally {
    client.release();
  }
});

// List counselors for transfer UI
router.get("/counselors", async (_req, res) => {
  try {
    const r = await pool.query(`SELECT id, name FROM counselors ORDER BY name ASC`);
    res.json(r.rows);
  } catch (err) {
    console.error('Error fetching counselors list:', err);
    res.status(500).json({ error: 'Failed to fetch counselors' });
  }
});

// Counselors available for a given time window
router.get("/counselors/available", async (req, res) => {
  try {
    const { start_ts, end_ts } = req.query;
    if (!start_ts || !end_ts) {
      return res.status(400).json({ error: 'start_ts and end_ts are required (YYYY-MM-DD HH:mm)' });
    }

    // Build availability using appointments table (and optionally slots)
    const available = await pool.query(
      `SELECT c.id, c.name
       FROM counselors c
       WHERE NOT EXISTS (
         SELECT 1 FROM appointments a
         WHERE a.counselor_id = c.id AND a.status <> 'cancelled'
         AND NOT ($1 >= a.end_ts OR $2 <= a.start_ts)
       )
       ORDER BY c.name ASC`,
      [start_ts, end_ts]
    );

    res.json(available.rows);
  } catch (err) {
    console.error('Error fetching available counselors:', err);
    res.status(500).json({ error: 'Failed to fetch available counselors' });
  }
});

// Books routes - REMOVED: These routes are now handled by /api/dashboard/books (books.js)
// The books.js routes support FormData, file uploads, and all new book fields.
// All CRUD operations (GET, POST, PUT, DELETE) are handled in books.js

// Announcements routes
router.get("/announcements", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM announcements WHERE counselor_id = $1 ORDER BY created_at DESC",
      [req.counselor.id] // Changed from req.counselor.id
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching announcements:", err);
    res.status(500).json({ error: "Failed to fetch announcements" });
  }
});

router.post("/announcements", async (req, res) => {
  try {
    const { message } = req.body;
    const result = await pool.query(
      "INSERT INTO announcements (message, counselor_id) VALUES ($1, $2) RETURNING *",
      [message, req.counselor.id] // Changed from req.counselor.id
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating announcement:", err);
    res.status(500).json({ error: "Failed to create announcement" });
  }
});

router.delete("/announcements/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // First get the announcement details before deleting
    const announcementResult = await pool.query(
      "SELECT * FROM announcements WHERE id = $1 AND counselor_id = $2",
      [id, req.counselor.id]
    );
    
    if (announcementResult.rows.length === 0) {
      return res.status(404).json({ error: "Announcement not found" });
    }
    
    const announcement = announcementResult.rows[0];
    
    // Delete the announcement
    const result = await pool.query(
      "DELETE FROM announcements WHERE id = $1 AND counselor_id = $2 RETURNING *",
      [id, req.counselor.id]
    );
    
    // If it was a force announcement, notify students that it was deleted
    if (announcement.is_force) {
      try {
        const { sendMessageToUser } = await import('../utils/botSender.js');
        
        // Get all registered users
        const usersResult = await pool.query(
          "SELECT telegram_user_id, first_name, last_name, telegram_username FROM user_sessions WHERE telegram_user_id IS NOT NULL"
        );
        const users = usersResult.rows;
        
        const deletionMessage = `Previous announcement has been removed by the counseling department.`;
        
        // Send deletion notification to all users
        for (const user of users) {
          try {
            await sendMessageToUser(user.telegram_user_id, deletionMessage);
          } catch (err) {
            console.error(`Failed to notify user ${user.telegram_user_id} about announcement deletion:`, err);
          }
        }
        
        console.log(`Announcement deletion notification sent to ${users.length} users`);
      } catch (err) {
        console.error("Error sending deletion notification:", err);
        // Don't fail the deletion if notification fails
      }
    }
    
    res.json({ message: "Announcement deleted successfully" });
  } catch (err) {
    console.error("Error deleting announcement:", err);
    res.status(500).json({ error: "Failed to delete announcement" });
  }
});

// Absence routes
router.get("/absence", async (req, res) => {
  try {
    console.log("Fetching absence days for counselor:", req.counselor.id); // Debug log
    const result = await pool.query(
      "SELECT * FROM absence_days WHERE counselor_id = $1 ORDER BY date DESC",
      [req.counselor.id]
    );
    console.log("Found absence days:", result.rows.length); // Debug log
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching absence days:", err);
    res.status(500).json({ error: "Failed to fetch absence days" });
  }
});

router.post("/absence", async (req, res) => {
  try {
    const { date, reason } = req.body;
    console.log("Creating absence:", { date, reason, counselor_id: req.counselor.id }); // Debug log
    const result = await pool.query(
      "INSERT INTO absence_days (date, counselor_id, reason) VALUES ($1, $2, $3) RETURNING *",
      [date, req.counselor.id, reason || "Personal absence"]
    );
    console.log("Absence created:", result.rows[0]); // Debug log
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error marking absence:", err);
    res.status(500).json({ error: "Failed to mark absence" });
  }
});

router.delete("/absence/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM absence_days WHERE id = $1 AND counselor_id = $2 RETURNING *",
      [id, req.counselor.id] // Changed from req.counselor.id
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Absence day not found" });
    }
    res.json({ message: "Absence day removed" });
  } catch (err) {
    console.error("Error removing absence day:", err);
    res.status(500).json({ error: "Failed to remove absence day" });
  }
});

// Force announcement endpoint - sends to all registered users
router.post("/announcements/force", async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    // First, save the announcement to the database
    const announcementResult = await pool.query(
      "INSERT INTO announcements (message, counselor_id, is_force) VALUES ($1, $2, true) RETURNING *",
      [message.trim(), req.counselor.id]
    );

    // Get all registered users from user_sessions table (Telegram users)
    const usersResult = await pool.query(
      "SELECT telegram_user_id, first_name, last_name, telegram_username FROM user_sessions WHERE telegram_user_id IS NOT NULL"
    );
    const users = usersResult.rows;

    console.log(`🚨 Force announcement sent by ${req.counselor.name}: "${message}"`);
    console.log(`📊 Sending to ${users.length} registered users`);

    // Import bot sender utility
    const { sendMessageToUser } = await import('../utils/botSender.js');

    // Send to all registered users via Telegram bot
    let successCount = 0;
    let failCount = 0;
    const failedUsers = [];

    // Format the announcement message
    const announcementMessage = message.trim();

    for (const user of users) {
      try {
        const sent = await sendMessageToUser(user.telegram_user_id, announcementMessage);
        if (sent) {
          console.log(`✅ Sent to ${user.first_name || user.telegram_username || 'User'} (${user.telegram_user_id})`);
          successCount++;
        } else {
          console.log(`❌ Failed to send to ${user.first_name || user.telegram_username || 'User'} (${user.telegram_user_id})`);
          failCount++;
          failedUsers.push({
            name: user.first_name || user.telegram_username || 'Unknown',
            telegram_id: user.telegram_user_id
          });
        }
      } catch (err) {
        console.error(`❌ Error sending to user ${user.telegram_user_id}:`, err);
        failCount++;
        failedUsers.push({
          name: user.first_name || user.telegram_username || 'Unknown',
          telegram_id: user.telegram_user_id,
          error: err.message
        });
      }
    }

    // Log summary
    console.log(`📊 Force announcement summary:`);
    console.log(`   Total users: ${users.length}`);
    console.log(`   Sent successfully: ${successCount}`);
    console.log(`   Failed: ${failCount}`);

    if (failedUsers.length > 0) {
      console.log(`   Failed users:`, failedUsers);
    }

    res.json({
      success: true,
      message: "Force announcement sent successfully",
      announcement: announcementResult.rows[0],
      stats: {
        total_users: users.length,
        sent_successfully: successCount,
        failed: failCount,
        failed_users: failedUsers
      }
    });

  } catch (err) {
    console.error("Error sending force announcement:", err);
    res.status(500).json({ error: "Failed to send force announcement" });
  }
});

// Support tickets routes with pagination
router.get("/support/tickets", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;
    const priority = req.query.priority;
    const offset = (page - 1) * limit;

    // Build dynamic query
    let whereClause = "";
    let queryParams = [];
    let paramCount = 0;

    if (status) {
      whereClause += ` WHERE st.status = $${++paramCount}`;
      queryParams.push(status);
    }

    if (priority) {
      whereClause += whereClause ? ` AND st.priority = $${++paramCount}` : ` WHERE st.priority = $${++paramCount}`;
      queryParams.push(priority);
    }

    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) as total FROM support_tickets st${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const totalTickets = parseInt(countResult.rows[0].total);

    // Get paginated tickets
    const ticketsQuery = `
      SELECT st.*, 
             COALESCE(st.student_name, 'Unknown') as student_name,
             COALESCE(st.admission_no, 'N/A') as admission_no
      FROM support_tickets st
      ${whereClause}
      ORDER BY st.updated_at DESC, st.created_at DESC
      LIMIT $${++paramCount} OFFSET $${++paramCount}
    `;
    
    queryParams.push(limit, offset);
    const result = await pool.query(ticketsQuery, queryParams);
    
    // Only fetch replies for tickets on current page (not all tickets)
    const ticketsWithReplies = await Promise.all(
      result.rows.map(async (ticket) => {
        const repliesResult = await pool.query(
          `SELECT sm.*, c.name as counselor_name
           FROM support_messages sm
           LEFT JOIN counselors c ON sm.sender_id = c.id AND sm.sender_type = 'counselor'
           WHERE sm.ticket_id = $1
           ORDER BY sm.created_at ASC
           LIMIT 50`,
          [ticket.id]
        );
        
        return {
          ...ticket,
          replies: repliesResult.rows
        };
      })
    );
    
    const totalPages = Math.ceil(totalTickets / limit);
    
    res.json({ 
      success: true, 
      tickets: ticketsWithReplies,
      pagination: {
        currentPage: page,
        totalPages,
        totalTickets,
        limit,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (err) {
    console.error("Error fetching support tickets:", err);
    res.status(500).json({ error: "Failed to fetch support tickets" });
  }
});

router.post("/support/tickets/:id/reply", async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    
    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }
    
    // Get ticket details including student's telegram info
    const ticketResult = await pool.query(
      "SELECT * FROM support_tickets WHERE id = $1",
      [id]
    );
    
    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: "Ticket not found" });
    }
    
    const ticket = ticketResult.rows[0];
    
    // Add reply to ticket
    const result = await pool.query(
      `INSERT INTO support_messages (ticket_id, sender_type, sender_id, message, is_internal)
       VALUES ($1, 'counselor', $2, $3, false)
       RETURNING *`,
      [id, req.counselor.id, message.trim()]
    );
    
    // Update ticket status to 'replied'
    await pool.query(
      "UPDATE support_tickets SET status = 'replied', updated_at = NOW() WHERE id = $1",
      [id]
    );
    
    // Send reply to student via Telegram bot
    try {
      const { sendMessageToUser } = await import('../utils/botSender.js');
      const isDM = req.body.isDM || false;
      
      let replyMessage;
      if (isDM) {
        replyMessage = `Message from ${req.counselor.name} (Ticket #${ticket.id}):\n\n${message.trim()}\n\nTo reply, just type: dm ${ticket.id} [your message]`;
      } else {
        replyMessage = `Reply from ${req.counselor.name} (Ticket #${ticket.id}):\n\n${message.trim()}\n\nDid this help you? Type "satisfied ${ticket.id}" if yes, or "not satisfied ${ticket.id}" if you need more help.\n\nYou can also just reply naturally - I'll understand and add it to your ticket!`;
      }
      
      const sent = await sendMessageToUser(ticket.telegram_user_id, replyMessage);
      if (sent) {
        console.log(`✅ ${isDM ? 'DM' : 'Support reply'} sent to student ${ticket.telegram_user_id} for ticket #${ticket.id}`);
      } else {
        console.log(`❌ Failed to send ${isDM ? 'DM' : 'Support reply'} to student ${ticket.telegram_user_id} for ticket #${ticket.id}`);
      }
    } catch (botError) {
      console.error("Error sending reply via bot:", botError);
      // Don't fail the request if bot message fails
    }
    
    res.json({ success: true, message: result.rows[0] });
  } catch (err) {
    console.error("Error replying to ticket:", err);
    res.status(500).json({ error: "Failed to reply to ticket" });
  }
});

router.patch("/support/tickets/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['open', 'replied', 'in_progress', 'resolved', 'closed'].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    
    const result = await pool.query(
      "UPDATE support_tickets SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
      [status, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Ticket not found" });
    }
    
    res.json({ success: true, ticket: result.rows[0] });
  } catch (err) {
    console.error("Error updating ticket status:", err);
    res.status(500).json({ error: "Failed to update ticket status" });
  }
});

// Delete a reply
router.delete("/support/tickets/:ticketId/replies/:replyId", async (req, res) => {
  try {
    const { ticketId, replyId } = req.params;
    
    const result = await pool.query(
      "DELETE FROM support_messages WHERE id = $1 AND ticket_id = $2 RETURNING *",
      [replyId, ticketId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Reply not found" });
    }
    
    res.json({ success: true, message: "Reply deleted successfully" });
  } catch (err) {
    console.error("Error deleting reply:", err);
    res.status(500).json({ error: "Failed to delete reply" });
  }
});

// Clear all support tickets (admin only)
router.delete("/support/tickets/clear-all", async (req, res) => {
  try {
    // Check if user is admin
    if (!req.counselor.is_admin) {
      return res.status(403).json({ error: "Only administrators can clear all tickets" });
    }
    
    // Delete all support messages first (due to foreign key constraint)
    await pool.query("DELETE FROM support_messages");
    
    // Delete all support tickets
    const result = await pool.query("DELETE FROM support_tickets RETURNING *");
    
    res.json({
      success: true,
      message: `Successfully cleared ${result.rows.length} support tickets`,
      clearedCount: result.rows.length
    });
  } catch (err) {
    console.error("Error clearing all support tickets:", err);
    res.status(500).json({ error: "Failed to clear all support tickets" });
  }
});

// Clear individual support ticket
router.delete("/support/tickets/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if ticket exists
    const ticketResult = await pool.query("SELECT * FROM support_tickets WHERE id = $1", [id]);
    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: "Ticket not found" });
    }
    
    // Delete support messages first (due to foreign key constraint)
    await pool.query("DELETE FROM support_messages WHERE ticket_id = $1", [id]);
    
    // Delete the ticket
    const result = await pool.query("DELETE FROM support_tickets WHERE id = $1 RETURNING *", [id]);
    
    res.json({
      success: true,
      message: "Support ticket deleted successfully",
      ticket: result.rows[0]
    });
  } catch (err) {
    console.error("Error deleting support ticket:", err);
    res.status(500).json({ error: "Failed to delete support ticket" });
  }
});

// Clear old support tickets (older than specified days)
router.delete("/support/tickets/clear-old", async (req, res) => {
  try {
    const { days = 30 } = req.body; // Default to clear tickets older than 30 days
    
    // Get tickets to be deleted
    const ticketsToDelete = await pool.query(
      "SELECT id FROM support_tickets WHERE created_at < CURRENT_TIMESTAMP - INTERVAL $1 days",
      [days]
    );
    
    if (ticketsToDelete.rows.length === 0) {
      return res.json({
        success: true,
        message: "No old tickets found to clear",
        clearedCount: 0
      });
    }
    
    const ticketIds = ticketsToDelete.rows.map(row => row.id);
    
    // Delete support messages first
    await pool.query(
      "DELETE FROM support_messages WHERE ticket_id = ANY($1)",
      [ticketIds]
    );
    
    // Delete old tickets
    const result = await pool.query(
      "DELETE FROM support_tickets WHERE id = ANY($1) RETURNING *",
      [ticketIds]
    );
    
    res.json({
      success: true,
      message: `Successfully cleared ${result.rows.length} old support tickets`,
      clearedCount: result.rows.length,
      daysCleared: days
    });
  } catch (err) {
    console.error("Error clearing old support tickets:", err);
    res.status(500).json({ error: "Failed to clear old support tickets" });
  }
});

// Get messages for a specific ticket with pagination
router.get("/support/tickets/:id/messages", async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    
    // Get total message count
    const countResult = await pool.query(
      "SELECT COUNT(*) as total FROM support_messages WHERE ticket_id = $1",
      [id]
    );
    const totalMessages = parseInt(countResult.rows[0].total);
    
    // Get paginated messages
    const result = await pool.query(
      `SELECT sm.*, c.name as counselor_name
       FROM support_messages sm
       LEFT JOIN counselors c ON sm.sender_id = c.id AND sm.sender_type = 'counselor'
       WHERE sm.ticket_id = $1
       ORDER BY sm.created_at ASC
       LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    );
    
    const totalPages = Math.ceil(totalMessages / limit);
    
    res.json({
      success: true,
      messages: result.rows,
      pagination: {
        currentPage: page,
        totalPages,
        totalMessages,
        limit,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (err) {
    console.error("Error fetching ticket messages:", err);
    res.status(500).json({ error: "Failed to fetch ticket messages" });
  }
});

// Clear messages for a specific ticket
router.delete("/support/tickets/:id/clear-messages", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if ticket exists
    const ticketResult = await pool.query("SELECT * FROM support_tickets WHERE id = $1", [id]);
    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: "Ticket not found" });
    }
    
    // Delete all messages for this ticket
    const result = await pool.query(
      "DELETE FROM support_messages WHERE ticket_id = $1 RETURNING *",
      [id]
    );
    
    res.json({
      success: true,
      message: `Successfully cleared ${result.rows.length} messages`,
      clearedCount: result.rows.length
    });
  } catch (err) {
    console.error("Error clearing ticket messages:", err);
    res.status(500).json({ error: "Failed to clear ticket messages" });
  }
});

// Update payment status for an appointment (paid/unpaid/refunded)
router.patch("/appointments/:id/payment-status", async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_status } = req.body;
    if (!['pending','paid','failed','refunded'].includes(payment_status)) {
      return res.status(400).json({ error: 'Invalid payment_status' });
    }
    const result = await pool.query(
      `UPDATE appointments 
       SET payment_status=$1::varchar,
           status=CASE WHEN $1::varchar='paid' THEN 'pending' ELSE status END,
           updated_at=now()
       WHERE id=$2 AND counselor_id=$3 RETURNING *`,
      [payment_status, id, req.counselor.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Appointment not found' });

    const updated = result.rows[0];

    // Notify client via bot when paid
    if (payment_status === 'paid') {
      console.log(`[Payment Notification] ===== PAYMENT STATUS SET TO PAID =====`);
      console.log(`[Payment Notification] Appointment ID: ${id}`);
      console.log(`[Payment Notification] Payment status: ${payment_status}`);
      try {
        const detailRes = await pool.query(
          `SELECT a.id, a.telegram_user_id, a.start_ts, a.end_ts, a.appointment_date, a.end_date, 
                  a.payment_status, a.status, a.appointment_code, a.session_type, a.session_duration,
                  c.full_name as client_name, c.telegram_user_id as client_telegram_user_id, c.contact_info as client_contact_info,
                  cn.name as counselor_name, cn.id as counselor_id
           FROM appointments a
           LEFT JOIN clients c ON a.client_id=c.id
           LEFT JOIN counselors cn ON a.counselor_id=cn.id
           WHERE a.id=$1`,
          [id]
        );
        const row = detailRes.rows[0];
        if (!row) {
          console.log(`[Payment Notification] Appointment ${id} not found`);
          return;
        }
        
        // Get intake form data (for web bookings)
        const intakeRes = await pool.query(
          `SELECT appointment_code, counseling_type, session_mode, session_duration_minutes,
                  reason, issue_duration, consent_timestamp, email as client_email, phone
           FROM client_intake_forms
           WHERE appointment_id=$1
           ORDER BY created_at DESC
           LIMIT 1`,
          [id]
        );
        const intake = intakeRes.rows[0] || {};
        
        // For bot bookings, extract phone/email from client contact_info if intake is empty
        if (!intake.phone && !intake.client_email && row.client_contact_info) {
          const contactInfo = row.client_contact_info;
          // Try to extract phone and email from contact_info
          const phoneMatch = contactInfo.match(/(\+?\d{10,15})/);
          const emailMatch = contactInfo.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
          if (phoneMatch) {
            intake.phone = phoneMatch[1];
          }
          if (emailMatch) {
            intake.client_email = emailMatch[1];
          }
        }
        
        // Use appointment_code from appointments table if intake doesn't have it
        if (!intake.appointment_code && row.appointment_code) {
          intake.appointment_code = row.appointment_code;
        }
        
        // Use session info from appointments table if intake doesn't have it
        if (!intake.session_mode && row.session_type) {
          intake.session_mode = row.session_type;
        }
        if (!intake.session_duration_minutes && row.session_duration) {
          // Extract minutes from "60 mins" format
          const durationMatch = row.session_duration.match(/(\d+)/);
          if (durationMatch) {
            intake.session_duration_minutes = parseInt(durationMatch[1], 10);
          }
        }
        const shorten = (text, len = 180) => {
          if (!text) return '';
          if (text.length <= len) return text;
          return `${text.slice(0, len - 3)}...`;
        };
        const formatTs = (ts) => {
          if (!ts) return '';
          try {
            const d = new Date(ts);
            return d.toLocaleString('en-KE', {
              timeZone: 'Africa/Nairobi', year: 'numeric', month: 'short', day: '2-digit',
              hour: 'numeric', minute: '2-digit', hour12: true
            });
          } catch (_) { return String(ts); }
        };
        const when = formatTs(row.start_ts || row.appointment_date);
        const endWhen = formatTs(row.end_ts || row.end_date);
        
        // Notify via Telegram if available
        let telegramUserId = row?.telegram_user_id;
        console.log(`[Payment Notification] ===== Starting notification check =====`);
        console.log(`[Payment Notification] Appointment ID: ${row.id}`);
        console.log(`[Payment Notification] Appointment telegram_user_id: ${telegramUserId || 'null'}`);
        console.log(`[Payment Notification] Client telegram_user_id: ${row?.client_telegram_user_id || 'null'}`);
        console.log(`[Payment Notification] Client name: ${row?.client_name || 'null'}`);
        console.log(`[Payment Notification] Client contact_info: ${row?.client_contact_info || 'null'}`);
        console.log(`[Payment Notification] Intake phone: ${intake?.phone || 'null'}`);
        console.log(`[Payment Notification] Intake email: ${intake?.client_email || 'null'}`);
        
        // For bot bookings, telegram_user_id should be in appointments table
        if (telegramUserId) {
          console.log(`[Payment Notification] ✅ Found Telegram user from appointment: ${telegramUserId}`);
        }
        
        // Check client's telegram_user_id from clients table
        if (!telegramUserId && row?.client_telegram_user_id) {
          telegramUserId = row.client_telegram_user_id;
          console.log(`[Payment Notification] ✅ Found Telegram user from client record: ${telegramUserId}`);
        }
        
        // If no telegram_user_id, try to find it by phone number or email from clients table
        if (!telegramUserId && intake) {
          try {
            // Try to find Telegram user by phone number from clients table
            if (intake.phone) {
              console.log(`[Payment Notification] Looking up Telegram user by phone: ${intake.phone}`);
              const phoneMatch = await pool.query(
                `SELECT telegram_user_id FROM clients 
                 WHERE (contact_info LIKE $1 OR contact_info LIKE $2)
                 AND telegram_user_id IS NOT NULL
                 LIMIT 1`,
                [`%${intake.phone}%`, `%Phone: ${intake.phone}%`]
              );
              if (phoneMatch.rows.length > 0 && phoneMatch.rows[0].telegram_user_id) {
                telegramUserId = phoneMatch.rows[0].telegram_user_id;
                console.log(`[Payment Notification] Found Telegram user by phone in clients: ${telegramUserId}`);
              } else {
                console.log(`[Payment Notification] No Telegram user found by phone in clients: ${intake.phone}`);
                // Try to find any client with this phone that has a telegram_user_id
                // This handles cases where the client was created via bot booking
                const allClientsWithPhone = await pool.query(
                  `SELECT telegram_user_id FROM clients 
                   WHERE contact_info LIKE $1 
                   AND telegram_user_id IS NOT NULL
                   LIMIT 1`,
                  [`%${intake.phone}%`]
                );
                if (allClientsWithPhone.rows.length > 0 && allClientsWithPhone.rows[0].telegram_user_id) {
                  telegramUserId = allClientsWithPhone.rows[0].telegram_user_id;
                  console.log(`[Payment Notification] ✅ Found Telegram user by phone in other client record: ${telegramUserId}`);
                } else {
                  console.log(`[Payment Notification] No Telegram user found by phone in any client record`);
                }
              }
            }
            
            // Try to find Telegram user by email from clients table
            if (!telegramUserId && intake.client_email) {
              console.log(`[Payment Notification] Looking up Telegram user by email: ${intake.client_email}`);
              const emailMatch = await pool.query(
                `SELECT telegram_user_id FROM clients 
                 WHERE (contact_info LIKE $1 OR contact_info LIKE $2)
                 AND telegram_user_id IS NOT NULL
                 LIMIT 1`,
                [`%${intake.client_email}%`, `%Email: ${intake.client_email}%`]
              );
              if (emailMatch.rows.length > 0 && emailMatch.rows[0].telegram_user_id) {
                telegramUserId = emailMatch.rows[0].telegram_user_id;
                console.log(`[Payment Notification] Found Telegram user by email in clients: ${telegramUserId}`);
              } else {
                console.log(`[Payment Notification] No Telegram user found by email in clients: ${intake.client_email}`);
                // Try to find any client with this email that has a telegram_user_id
                // This handles cases where the client was created via bot booking
                const allClientsWithEmail = await pool.query(
                  `SELECT telegram_user_id FROM clients 
                   WHERE contact_info LIKE $1 
                   AND telegram_user_id IS NOT NULL
                   LIMIT 1`,
                  [`%${intake.client_email}%`]
                );
                if (allClientsWithEmail.rows.length > 0 && allClientsWithEmail.rows[0].telegram_user_id) {
                  telegramUserId = allClientsWithEmail.rows[0].telegram_user_id;
                  console.log(`[Payment Notification] ✅ Found Telegram user by email in other client record: ${telegramUserId}`);
                } else {
                  console.log(`[Payment Notification] No Telegram user found by email in any client record`);
                }
              }
            }
          } catch (lookupErr) {
            console.error('[Payment Notification] Error looking up Telegram user:', lookupErr);
          }
        }
        
        // Send bot notification if we found a Telegram user
        if (row && telegramUserId) {
          try {
            console.log(`[Payment Notification] Sending bot notification to Telegram user: ${telegramUserId}`);
            const { sendMessageToUser } = await import('../utils/botSender.js');
            const summaryLines = [
              '✅ Payment received and appointment approved',
              '',
              `Appointment ID: ${row.id}`,
              intake.appointment_code ? `Appointment Code: ${intake.appointment_code}` : null,
              `Client: ${row.client_name || 'You'}`,
              `Therapist: ${row.counselor_name || ''}`,
              `Date: ${when} → ${endWhen} (EAT)`,
              intake.session_mode ? `Session Mode: ${intake.session_mode}` : null,
              intake.session_duration_minutes
                ? `Duration: ${intake.session_duration_minutes} minutes`
                : null,
              intake.counseling_type ? `Counseling Type: ${intake.counseling_type}` : null,
              intake.issue_duration ? `Issue Duration: ${intake.issue_duration}` : null,
              intake.reason ? `Focus: ${shorten(intake.reason)}` : null,
              '',
              `Payment Status: ${row.payment_status}`,
              `Booking Status: pending`,
            ].filter(Boolean);
            const msg = summaryLines.join('\n');
            const sent = await sendMessageToUser(telegramUserId, msg);
            if (sent) {
              console.log(`[Payment Notification] ✅ Bot notification sent successfully to ${telegramUserId}`);
            } else {
              console.log(`[Payment Notification] ❌ Bot notification failed to send to ${telegramUserId}`);
            }
          } catch (botErr) {
            console.error('[Payment Notification] Error sending bot notification:', botErr);
          }
        } else {
          console.log(`[Payment Notification] No Telegram user found for appointment ${row?.id}. Client: ${row?.client_name}, Phone: ${intake?.phone}, Email: ${intake?.client_email}`);
        }
        
        // Notify via email for web bookings
        if (row && !row.telegram_user_id && intake.client_email) {
          try {
            const emailService = (await import('../services/emailService.js')).default;
            const formattedDate = new Date(row.appointment_date || row.start_ts).toLocaleString('en-KE', {
              timeZone: 'Africa/Nairobi',
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            });
            
            await emailService.transporter.sendMail({
              from: '"NextStep Therapy Services" <nextstepmentorship@gmail.com>',
              to: intake.client_email,
              subject: `Payment Confirmed - Appointment ${intake.appointment_code || row.id}`,
              html: `
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                    .info-box { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #667eea; }
                    .success { background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 15px 0; border-radius: 8px; }
                    .info-label { font-weight: bold; color: #667eea; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <h1>✅ Payment Confirmed</h1>
                      <p>Your appointment has been approved</p>
                    </div>
                    <div class="content">
                      <p>Dear ${row.client_name},</p>
                      <div class="success">
                        <p><strong>✅ Payment received and appointment approved!</strong></p>
                      </div>
                      <div class="info-box">
                        <p><span class="info-label">Appointment Code:</span> ${intake.appointment_code || row.id}</p>
                        <p><span class="info-label">Date & Time:</span> ${formattedDate}</p>
                        <p><span class="info-label">Counselor:</span> ${row.counselor_name || ''}</p>
                        ${intake.session_mode ? `<p><span class="info-label">Session Mode:</span> ${intake.session_mode}</p>` : ''}
                        ${intake.session_duration_minutes ? `<p><span class="info-label">Duration:</span> ${intake.session_duration_minutes} minutes</p>` : ''}
                        <p><span class="info-label">Payment Status:</span> Paid</p>
                        <p><span class="info-label">Appointment Status:</span> Confirmed</p>
                      </div>
                      <p>Your appointment is now confirmed. You will receive reminders 1 day and 1 hour before your appointment.</p>
                      <p>If you have any questions, please contact us at nextstepmentorship@gmail.com</p>
                    </div>
                  </div>
                </body>
                </html>
              `,
              text: `Payment Confirmed - Appointment ${intake.appointment_code || row.id}\n\nDear ${row.client_name},\n\n✅ Payment received and appointment approved!\n\nAppointment Code: ${intake.appointment_code || row.id}\nDate & Time: ${formattedDate}\nCounselor: ${row.counselor_name || ''}\n${intake.session_mode ? `Session Mode: ${intake.session_mode}\n` : ''}${intake.session_duration_minutes ? `Duration: ${intake.session_duration_minutes} minutes\n` : ''}Payment Status: Paid\nAppointment Status: Confirmed\n\nYour appointment is now confirmed. You will receive reminders 1 day and 1 hour before your appointment.\n\nIf you have any questions, please contact us at nextstepmentorship@gmail.com`
            });
            console.log(`✅ Payment confirmation email sent to ${intake.client_email} for appointment ${intake.appointment_code || row.id}`);
          } catch (emailErr) {
            console.error('Error sending payment confirmation email:', emailErr);
          }
        }
      } catch (notifyErr) {
        console.error('[Payment Notification] ===== ERROR IN NOTIFICATION BLOCK =====');
        console.error('[Payment Notification] Error details:', notifyErr);
        console.error('[Payment Notification] Error stack:', notifyErr.stack);
        console.error('[Payment Notification] Error message:', notifyErr.message);
      }
    } else {
      console.log(`[Payment Notification] Payment status is not 'paid', skipping notification. Status: ${payment_status}`);
    }

    res.json(updated);
  } catch (err) {
    console.error('Error updating payment status:', err);
    res.status(500).json({ error: 'Failed to update payment status' });
  }
});

// List refund requests for this counselor
router.get("/refunds", async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT rr.*, a.start_ts, a.end_ts, a.appointment_date, a.end_date
       FROM refund_requests rr
       LEFT JOIN appointments a ON rr.appointment_id=a.id
       WHERE rr.counselor_id=$1 AND rr.status='pending'
       ORDER BY rr.created_at DESC`,
      [req.counselor.id]
    );
    res.json(r.rows);
  } catch (err) {
    console.error('Error listing refunds:', err);
    res.status(500).json({ error: 'Failed to fetch refunds' });
  }
});

// Approve or reject a refund
router.post("/refunds/:id/resolve", async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'approve' or 'reject'
    if (!['approve','reject'].includes(action)) return res.status(400).json({ error: 'Invalid action' });

    const rr = await pool.query(`SELECT * FROM refund_requests WHERE id=$1 AND counselor_id=$2`, [id, req.counselor.id]);
    if (rr.rows.length === 0) return res.status(404).json({ error: 'Refund request not found' });

    const status = action === 'approve' ? 'approved' : 'rejected';
    await pool.query(`UPDATE refund_requests SET status=$1, processed_at=now() WHERE id=$2`, [status, id]);

    if (status === 'approved') {
      await pool.query(`UPDATE appointments SET status='cancelled', payment_status='refunded', updated_at=now() WHERE id=$1 AND counselor_id=$2`, [rr.rows[0].appointment_id, req.counselor.id]);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Error resolving refund:', err);
    res.status(500).json({ error: 'Failed to resolve refund' });
  }
});

export default router;