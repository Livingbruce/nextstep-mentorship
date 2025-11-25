import express from "express";
import pool from "../db/pool.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { requireAdmin } from "../middleware/requireAdmin.js";

const router = express.Router();

router.use(authMiddleware);
router.use(requireAdmin);

async function ensurePricingSettings() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pricing_settings (
      id SERIAL PRIMARY KEY,
      duration VARCHAR(50) UNIQUE NOT NULL,
      amount_cents INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    )
  `);

  const { rows } = await pool.query(
    "SELECT COUNT(*)::int AS count FROM pricing_settings"
  );
  if (rows[0]?.count === 0) {
    await pool.query(
      `INSERT INTO pricing_settings (duration, amount_cents) VALUES
      ('45 mins', 2500),
      ('60 mins', 3000),
      ('90 mins', 4000)`
    );
  }
}

router.get("/overview", async (req, res) => {
  try {
    const [
      counselorStats,
      appointmentStats,
      ratingStats,
      recentAppointments,
      performanceRows,
    ] = await Promise.all([
      pool.query(
        `SELECT 
            COUNT(*) FILTER (WHERE is_active = true) AS active,
            COUNT(*) FILTER (WHERE verification_status = 'pending') AS pending,
            COUNT(*) AS total
         FROM counselors`
      ),
      pool.query(
        `SELECT 
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE payment_status = 'pending') AS pending_payments,
            COUNT(*) FILTER (WHERE status = 'confirmed') AS confirmed,
            COUNT(*) FILTER (WHERE status = 'completed') AS completed
         FROM appointments`
      ),
      pool.query(
        `SELECT 
            COUNT(*) AS total_reviews,
            AVG(rating)::numeric(10,2) AS avg_rating
         FROM appointment_reviews`
      ),
      pool.query(
        `SELECT id, appointment_code, counselor_id, status, payment_status, appointment_date
         FROM appointments
         ORDER BY appointment_date DESC
         LIMIT 10`
      ),
      pool.query(
        `SELECT 
            c.id,
            c.name,
            COALESCE(AVG(ar.rating), 0)::numeric(10,2) AS avg_rating,
            COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'completed') AS completed_sessions,
            COUNT(DISTINCT mp.id) AS mentorship_programs
         FROM counselors c
         LEFT JOIN appointment_reviews ar ON ar.counselor_id = c.id
         LEFT JOIN appointments a ON a.counselor_id = c.id
         LEFT JOIN mentorship_programs mp ON mp.counselor_id = c.id
         GROUP BY c.id
         ORDER BY avg_rating DESC NULLS LAST, completed_sessions DESC
         LIMIT 20`
      ),
    ]);

    res.json({
      stats: {
        counselors: counselorStats.rows[0],
        appointments: appointmentStats.rows[0],
        reviews: ratingStats.rows[0],
      },
      recentAppointments: recentAppointments.rows,
      performance: performanceRows.rows,
    });
  } catch (error) {
    console.error("Admin overview error:", error);
    res.status(500).json({ error: "Failed to load admin overview" });
  }
});

router.get("/counselors/pending", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, email, phone, specialization, license_number,
              therapist_id, verification_status, created_at,
              license_document_path, id_document_path, certificate_document_path
       FROM counselors
       WHERE verification_status = 'pending'
       ORDER BY created_at ASC`
    );
    res.json(rows);
  } catch (error) {
    console.error("Pending counselor fetch error:", error);
    res.status(500).json({ error: "Failed to load pending counselors" });
  }
});

router.post("/counselors/:id/approve", async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `UPDATE counselors
       SET verification_status = 'approved',
           is_active = true,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, name, email, verification_status`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Counselor not found" });
    }
    res.json({ success: true, counselor: rows[0] });
  } catch (error) {
    console.error("Approve counselor error:", error);
    res.status(500).json({ error: "Failed to approve counselor" });
  }
});

router.post("/counselors/:id/reject", async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `UPDATE counselors
       SET verification_status = 'rejected',
           is_active = false,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, name, email, verification_status`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Counselor not found" });
    }
    res.json({ success: true, counselor: rows[0] });
  } catch (error) {
    console.error("Reject counselor error:", error);
    res.status(500).json({ error: "Failed to reject counselor" });
  }
});

router.post("/counselors/:id/deactivate", async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `UPDATE counselors
       SET is_active = false,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, name, email, is_active`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Counselor not found" });
    }
    res.json({ success: true, counselor: rows[0] });
  } catch (error) {
    console.error("Deactivate counselor error:", error);
    res.status(500).json({ error: "Failed to deactivate counselor" });
  }
});

router.get("/counselors/:id/documents", async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `SELECT license_document_path, id_document_path, certificate_document_path
       FROM counselors
       WHERE id = $1`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Counselor not found" });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error("Counselor document fetch error:", error);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

router.get("/performance", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT 
          c.id,
          c.name,
          c.specialization,
          COALESCE(AVG(ar.rating), 0)::numeric(10,2) AS avg_rating,
          COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'completed') AS completed_sessions
       FROM counselors c
       LEFT JOIN appointment_reviews ar ON ar.counselor_id = c.id
       LEFT JOIN appointments a ON a.counselor_id = c.id
       GROUP BY c.id
       ORDER BY avg_rating DESC NULLS LAST, completed_sessions DESC
       LIMIT 50`
    );
    res.json(rows);
  } catch (error) {
    console.error("Performance fetch error:", error);
    res.status(500).json({ error: "Failed to load performance data" });
  }
});

router.get("/pricing/standard", async (req, res) => {
  try {
    await ensurePricingSettings();
    const { rows } = await pool.query(
      "SELECT id, duration, amount_cents, updated_at FROM pricing_settings ORDER BY amount_cents ASC"
    );
    res.json(rows);
  } catch (error) {
    console.error("Standard pricing fetch error:", error);
    res.status(500).json({ error: "Failed to load pricing" });
  }
});

router.put("/pricing/standard", async (req, res) => {
  try {
    const { pricing } = req.body;
    if (!Array.isArray(pricing) || pricing.length === 0) {
      return res.status(400).json({ error: "Pricing array required" });
    }
    await ensurePricingSettings();
    const updates = pricing.map((item) =>
      pool.query(
        `INSERT INTO pricing_settings (duration, amount_cents, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (duration) DO UPDATE SET
           amount_cents = EXCLUDED.amount_cents,
           updated_at = NOW()`,
        [item.duration, item.amount_cents]
      )
    );
    await Promise.all(updates);
    const { rows } = await pool.query(
      "SELECT id, duration, amount_cents, updated_at FROM pricing_settings ORDER BY amount_cents ASC"
    );
    res.json(rows);
  } catch (error) {
    console.error("Standard pricing update error:", error);
    res.status(500).json({ error: "Failed to update pricing" });
  }
});

router.get("/pricing/mentorship", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT mp.id, mp.title, mp.price_cents, mp.duration_weeks,
              mp.mode, mp.frequency, mp.created_at,
              c.id AS counselor_id, c.name AS counselor_name
       FROM mentorship_programs mp
       LEFT JOIN counselors c ON c.id = mp.counselor_id
       ORDER BY mp.created_at DESC
       LIMIT 100`
    );
    res.json(rows);
  } catch (error) {
    console.error("Mentorship pricing error:", error);
    res.status(500).json({ error: "Failed to load mentorship pricing" });
  }
});

export default router;


