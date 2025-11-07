import pool from "../db/pool.js";
import { generateUniqueAppointmentCode } from "../utils/appointmentCodeGenerator.js";

export async function createSlot(req, res) {
  try {
    const { counselor_id, start_ts, end_ts } = req.body;
    if (!counselor_id || !start_ts || !end_ts) {
      return res.status(400).json({ error: "counselor_id, start_ts, end_ts required" });
    }
    const { rows } = await pool.query(
      `INSERT INTO counselor_slots (counselor_id, start_ts, end_ts)
       VALUES ($1,$2,$3) RETURNING *`,
      [counselor_id, start_ts, end_ts]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Error creating slot:", err);
    res.status(500).json({ error: "Failed to create slot" });
  }
}

export async function listSlotsByCounselor(req, res) {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `SELECT * FROM counselor_slots
       WHERE counselor_id=$1
       ORDER BY start_ts`,
      [id]
    );
    res.json(rows);
  } catch (err) {
    console.error("Error listing slots:", err);
    res.status(500).json({ error: "Failed to fetch slots" });
  }
}

export async function deleteSlot(req, res) {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query(
      `DELETE FROM counselor_slots WHERE id=$1 AND is_booked=false`,
      [id]
    );
    if (rowCount === 0) return res.status(404).json({ error: "Slot not found or already booked" });
    res.json({ ok: true });
  } catch (err) {
    console.error("Error deleting slot:", err);
    res.status(500).json({ error: "Failed to delete slot" });
  }
}

export async function bookSlot(req, res) {
  const client = await pool.connect();
  try {
    const { id } = req.params; // slot id
    const { student_id } = req.body;

    if (!student_id) return res.status(400).json({ error: "student_id required" });

    await client.query("BEGIN");

    const { rows: slotRows } = await client.query(
      `SELECT * FROM counselor_slots WHERE id=$1 FOR UPDATE`,
      [id]
    );
    if (slotRows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Slot not found" });
    }
    const slot = slotRows[0];
    if (slot.is_booked) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Slot already booked" });
    }

    // Generate unique appointment code
    const appointmentCode = await generateUniqueAppointmentCode();
    
    const { rows: apptRows } = await client.query(
      `INSERT INTO appointments (student_id, counselor_id, start_ts, end_ts, status, appointment_code)
       VALUES ($1,$2,$3,$4,'confirmed',$5)
       RETURNING *`,
      [student_id, slot.counselor_id, slot.start_ts, slot.end_ts, appointmentCode]
    );

    await client.query(
      `UPDATE counselor_slots SET is_booked=true WHERE id=$1`,
      [id]
    );

    await client.query("COMMIT");
    res.status(201).json({ appointment: apptRows[0] });
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch (_) {}
    console.error("Error booking slot:", err);
    res.status(500).json({ error: "Failed to book slot" });
  } finally {
    client.release();
  }
}