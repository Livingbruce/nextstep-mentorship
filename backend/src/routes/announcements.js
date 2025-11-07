import express from "express";
import pool from "../db/pool.js";

const router = express.Router();

// Get all announcements
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT a.id, a.message, a.created_at, c.name as counselor_name FROM announcements a LEFT JOIN counselors c ON a.counselor_id = c.id ORDER BY a.created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch announcements" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { counselor_id, message } = req.body;
    if (!counselor_id || !message) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const result = await pool.query(
      "INSERT INTO announcements (counselor_id, message) VALUES ($1, $2) RETURNING *",
      [counselor_id, message]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to post announcement" });
  }
});

export default router;