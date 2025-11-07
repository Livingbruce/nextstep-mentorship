import express from "express";
import pool from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Apply auth middleware to all routes
router.use(requireAuth);

// Get recent notifications for current counselor
router.get("/recent", async (req, res) => {
  try {
    const counselorId = req.counselor.id;

    // Get notifications for the last 7 days
    const notifications = await pool.query(
      `SELECT 
        n.id,
        n.message,
        n.type,
        n.created_at,
        n.is_read,
        n.reference_id,
        n.reference_type
      FROM notifications n
      WHERE n.counselor_id = $1
        AND n.created_at >= NOW() - INTERVAL '7 days'
      ORDER BY n.created_at DESC
      LIMIT 20`,
      [counselorId]
    );

    res.json(notifications.rows);
  } catch (err) {
    console.error("Error fetching notifications:", err);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// Get unread count
router.get("/unread-count", async (req, res) => {
  try {
    const counselorId = req.counselor.id;
    const result = await pool.query(
      `SELECT COUNT(*) as count
       FROM notifications
       WHERE counselor_id = $1 AND is_read = false`,
      [counselorId]
    );

    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) {
    console.error("Error fetching unread count:", err);
    res.status(500).json({ error: "Failed to fetch unread count" });
  }
});

// Mark notification as read
router.patch("/:id/read", async (req, res) => {
  try {
    const { id } = req.params;
    const counselorId = req.counselor.id;

    await pool.query(
      `UPDATE notifications
       SET is_read = true
       WHERE id = $1 AND counselor_id = $2`,
      [id, counselorId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Error marking notification as read:", err);
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
});

// Mark all notifications as read
router.patch("/read-all", async (req, res) => {
  try {
    const counselorId = req.counselor.id;

    await pool.query(
      `UPDATE notifications
       SET is_read = true
       WHERE counselor_id = $1 AND is_read = false`,
      [counselorId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Error marking all notifications as read:", err);
    res.status(500).json({ error: "Failed to mark notifications as read" });
  }
});

// Delete notification
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const counselorId = req.counselor.id;

    await pool.query(
      `DELETE FROM notifications
       WHERE id = $1 AND counselor_id = $2`,
      [id, counselorId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting notification:", err);
    res.status(500).json({ error: "Failed to delete notification" });
  }
});

export default router;
