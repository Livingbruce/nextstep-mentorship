import pool from "../db/pool.js";
import { workingHoursValidator } from "../utils/workingHoursValidator.js";
import { generateUniqueAppointmentCode } from "../utils/appointmentCodeGenerator.js";

export async function createAppointment(req, res) {
  try {
    const { student_id, counselor_id, start_ts, end_ts } = req.body;

    // Validate working hours
    const timeValidation = workingHoursValidator.isValidAppointmentRange(start_ts, end_ts);
    if (!timeValidation.isValid) {
      return res.status(400).json({ 
        error: "Invalid appointment time", 
        details: timeValidation.reason 
      });
    }

    // Check if counselor is absent on the appointment date
    const absenceResult = await pool.query(
      "SELECT * FROM absence_days WHERE counselor_id = $1 AND date = $2",
      [counselor_id, new Date(start_ts).toISOString().split('T')[0]]
    );
    
    if (absenceResult.rows.length > 0) {
      return res.status(400).json({ 
        error: "Counselor is not available on this date",
        details: "The counselor has marked this day as an absence day"
      });
    }

    // Check for existing appointments to prevent double booking
    const conflictResult = await pool.query(
      `SELECT id FROM appointments 
       WHERE counselor_id = $1 AND status <> 'cancelled'
       AND NOT ($2 >= end_ts OR $3 <= start_ts)`,
      [counselor_id, start_ts, end_ts]
    );

    if (conflictResult.rows.length > 0) {
      return res.status(409).json({ 
        error: "Time conflict",
        details: "Counselor already has an appointment during this time slot"
      });
    }

    // Generate unique appointment code
    const appointmentCode = await generateUniqueAppointmentCode();
    
    const result = await pool.query(
      `INSERT INTO appointments (student_id, counselor_id, start_ts, end_ts, appointment_code) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [student_id, counselor_id, start_ts, end_ts, appointmentCode]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating appointment:", err);
    res.status(500).json({ error: "Failed to create appointment" });
  }
}

export async function getAppointmentsByCounselor(req, res) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "SELECT * FROM appointments WHERE counselor_id=$1 ORDER BY start_ts",
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch appointments" });
  }
}

export async function updateAppointmentStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const result = await pool.query(
      "UPDATE appointments SET status=$1 WHERE id=$2 RETURNING *",
      [status, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to update appointment status" });
  }
}

export async function cancelAppointment(req, res) {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM appointments WHERE id=$1", [id]);
    res.json({ message: "Appointment cancelled" });
  } catch (err) {
    res.status(500).json({ error: "Failed to cancel appointment" });
  }
}