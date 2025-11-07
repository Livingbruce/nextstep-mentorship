import express from "express";
import pool from "../db/pool.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import bot from "../bot.js";

const router = express.Router();

// List all mentorship programs (visible to all counselors)
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT mp.*, 
              COALESCE(json_agg(json_build_object('id', c.id, 'name', c.name, 'role', mpc.role_description)) 
                FILTER (WHERE c.id IS NOT NULL), '[]') AS counselors
       FROM mentorship_programs mp
       LEFT JOIN mentorship_program_counselors mpc ON mpc.program_id = mp.id
       LEFT JOIN counselors c ON c.id = mpc.counselor_id
       GROUP BY mp.id
       ORDER BY mp.created_at DESC`
    );
    res.json(result.rows.map(r => ({ ...r, counselors: Array.isArray(r.counselors) ? r.counselors : [] })));
  } catch (err) {
    console.error("Error fetching mentorship programs:", err);
    res.status(500).json({ error: "Failed to fetch mentorship programs" });
  }
});

// List mentorship programs for the logged-in counselor (programs where they're assigned OR they created)
router.get("/my-programs", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT mp.*, 
              COALESCE(json_agg(json_build_object('id', c.id, 'name', c.name, 'role', mpc.role_description)) 
                FILTER (WHERE c.id IS NOT NULL), '[]') AS counselors
       FROM mentorship_programs mp
       LEFT JOIN mentorship_program_counselors mpc ON mpc.program_id = mp.id
       LEFT JOIN counselors c ON c.id = mpc.counselor_id
       WHERE mp.counselor_id = $1 OR mpc.counselor_id = $1
       GROUP BY mp.id
       ORDER BY mp.created_at DESC`,
      [req.user.counselorId]
    );
    res.json(result.rows.map(r => ({ ...r, counselors: Array.isArray(r.counselors) ? r.counselors : [] })));
  } catch (err) {
    console.error("Error fetching my mentorship programs:", err);
    res.status(500).json({ error: "Failed to fetch mentorship programs" });
  }
});

// Create a mentorship program
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { title, description, price_cents, duration_weeks, mode, frequency, start_date, counselor_ids, counselor_roles } = req.body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const ins = await client.query(
        `INSERT INTO mentorship_programs (counselor_id, title, description, price_cents, duration_weeks, mode, frequency, start_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING *`,
        [req.user.counselorId, title, description || null, price_cents, duration_weeks || null, mode || null, frequency || null, start_date || null]
      );
      const program = ins.rows[0];
      const ids = Array.isArray(counselor_ids) ? counselor_ids.filter(Boolean) : [];
      const rolesMap = (counselor_roles && typeof counselor_roles === 'object') ? counselor_roles : {};
      const allIds = Array.from(new Set([req.user.counselorId, ...ids]));
      for (const cid of allIds) {
        const role = typeof rolesMap[cid] === 'string' ? rolesMap[cid] : null;
        await client.query(
          `INSERT INTO mentorship_program_counselors (program_id, counselor_id, role_description)
           VALUES ($1,$2,$3)
           ON CONFLICT (program_id, counselor_id) DO UPDATE SET role_description=EXCLUDED.role_description`,
          [program.id, cid, role]
        );
      }
      await client.query('COMMIT');
      res.status(201).json(program);
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Error creating mentorship program:", err);
    res.status(500).json({ error: "Failed to create mentorship program" });
  }
});

// Update a mentorship program (only owner counselor)
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, price_cents, duration_weeks, mode, frequency, start_date, counselor_ids, counselor_roles } = req.body;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const upd = await client.query(
        `UPDATE mentorship_programs
         SET title=$1, description=$2, price_cents=$3, duration_weeks=$4, mode=$5, frequency=$6, start_date=$7, updated_at=now()
         WHERE id=$8
         RETURNING *`,
        [title, description || null, price_cents, duration_weeks || null, mode || null, frequency || null, start_date || null, id]
      );
      if (upd.rows.length === 0) return res.status(404).json({ error: "Mentorship program not found" });

      if (Array.isArray(counselor_ids)) {
        await client.query(`DELETE FROM mentorship_program_counselors WHERE program_id=$1`, [id]);
        const allIds = Array.from(new Set(counselor_ids.filter(Boolean)));
        const rolesMap = (counselor_roles && typeof counselor_roles === 'object') ? counselor_roles : {};
        for (const cid of allIds) {
          const role = typeof rolesMap[cid] === 'string' ? rolesMap[cid] : null;
          await client.query(
            `INSERT INTO mentorship_program_counselors (program_id, counselor_id, role_description)
             VALUES ($1,$2,$3)
             ON CONFLICT (program_id, counselor_id) DO UPDATE SET role_description=EXCLUDED.role_description`,
            [id, cid, role]
          );
        }
      }
      await client.query('COMMIT');
      res.json(upd.rows[0]);
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Error updating mentorship program:", err);
    res.status(500).json({ error: "Failed to update mentorship program" });
  }
});

// Delete a mentorship program (only owner counselor)
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `DELETE FROM mentorship_programs WHERE id=$1 AND counselor_id=$2 RETURNING id`,
      [id, req.user.counselorId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Mentorship program not found" });
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting mentorship program:", err);
    res.status(500).json({ error: "Failed to delete mentorship program" });
  }
});

// List applications for the counselor's programs
router.get("/applications", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ma.* FROM mentorship_applications ma
       WHERE ma.counselor_id = $1
       ORDER BY ma.created_at DESC`,
      [req.user.counselorId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching mentorship applications:", err);
    res.status(500).json({ error: "Failed to fetch applications" });
  }
});

// Confirm payment for an application and DM the client
router.post("/applications/:id/confirm-payment", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const { rows } = await pool.query(
      `UPDATE mentorship_applications SET status='paid', updated_at=NOW()
       WHERE id=$1 AND counselor_id=$2
       RETURNING id, telegram_user_id, program_title, applicant_name`,
      [id, req.user.counselorId]
    );

    if (rows.length === 0) return res.status(404).json({ error: "Application not found" });

    const appRow = rows[0];
    if (appRow.telegram_user_id) {
      try {
        await bot.telegram.sendMessage(
          appRow.telegram_user_id,
          `✅ Payment confirmed for your mentorship application!\n\n` +
          `Program: ${appRow.program_title || 'Mentorship'}\n` +
          `Applicant: ${appRow.applicant_name || 'You'}\n` +
          `Status: Paid\n\n` +
          `We will contact you shortly with next steps. Thank you!`
        );
      } catch (dmErr) {
        console.error("Failed to DM applicant:", dmErr.message);
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Error confirming mentorship payment:", err);
    res.status(500).json({ error: "Failed to confirm payment" });
  }
});

export default router;


