import express from "express";
import pool from "../db/pool.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// List all counselors (id, name) for assignment UI
router.get("/", authMiddleware, async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT id, name FROM counselors WHERE is_active = true ORDER BY name");
    res.json(rows);
  } catch (err) {
    console.error("Error fetching counselors:", err);
    res.status(500).json({ error: "Failed to fetch counselors" });
  }
});

export default router;


