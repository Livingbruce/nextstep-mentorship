import express from "express";
import pool from "../db/pool.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// Get all books
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM books ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching books:", err);
    res.status(500).json({ error: "Failed to fetch books" });
  }
});

// Get books for logged-in counselor
router.get("/my-books", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM books WHERE counselor_id = $1 ORDER BY created_at DESC",
      [req.user.counselorId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching counselor books:", err);
    res.status(500).json({ error: "Failed to fetch books" });
  }
});

// Add new book
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { title, author, price_cents, description } = req.body;
    
    console.log("Creating book:", { title, author, price_cents, description, counselorId: req.user.counselorId });
    
    const result = await pool.query(
      `INSERT INTO books (counselor_id, title, author, price_cents, description) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.counselorId, title, author, price_cents, description]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating book:", err);
    res.status(500).json({ error: "Failed to add book: " + err.message });
  }
});

// Update book
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { title, author, price_cents, description } = req.body;
    const { id } = req.params;
    
    const result = await pool.query(
      `UPDATE books 
       SET title = $1, author = $2, price_cents = $3, description = $4 
       WHERE id = $5 AND counselor_id = $6 RETURNING *`,
      [title, author, price_cents, description, id, req.user.counselorId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Book not found" });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating book:", err);
    res.status(500).json({ error: "Failed to update book" });
  }
});

// Delete book
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      "DELETE FROM books WHERE id = $1 AND counselor_id = $2 RETURNING id",
      [id, req.user.counselorId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Book not found" });
    }
    
    res.json({ success: true, message: "Book deleted successfully" });
  } catch (err) {
    console.error("Error deleting book:", err);
    res.status(500).json({ error: "Failed to delete book" });
  }
});

// ===== BOOK ORDERS ROUTES =====

// Get all book orders for counselor's books
router.get("/orders", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT bo.*, b.title as book_title, b.author as book_author, c.name as counselor_name
       FROM book_orders bo
       JOIN books b ON bo.book_id = b.id
       JOIN counselors c ON b.counselor_id = c.id
       WHERE b.counselor_id = $1
       ORDER BY bo.created_at DESC`,
      [req.user.counselorId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching book orders:", err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// Get specific book order
router.get("/orders/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT bo.*, b.title as book_title, b.author as book_author, c.name as counselor_name
       FROM book_orders bo
       JOIN books b ON bo.book_id = b.id
       JOIN counselors c ON b.counselor_id = c.id
       WHERE bo.id = $1 AND b.counselor_id = $2`,
      [id, req.user.counselorId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching book order:", err);
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

// Update order status
router.put("/orders/:id/status", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { order_status, tracking_number, shipping_company, estimated_delivery_date, notes } = req.body;
    
    // Validate status
    const validStatuses = ['ordered', 'paid', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(order_status)) {
      return res.status(400).json({ error: "Invalid order status" });
    }
    
    const result = await pool.query(
      `UPDATE book_orders 
       SET order_status = $1, tracking_number = $2, shipping_company = $3, 
           estimated_delivery_date = $4, notes = $5, updated_at = now()
       WHERE id = $6 AND book_id IN (
         SELECT id FROM books WHERE counselor_id = $7
       ) RETURNING *`,
      [order_status, tracking_number, shipping_company, estimated_delivery_date, notes, id, req.user.counselorId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating order status:", err);
    res.status(500).json({ error: "Failed to update order status" });
  }
});

// Delete delivered book order
router.delete("/orders/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // First check if order exists and is delivered
    const checkResult = await pool.query(
      `SELECT bo.* FROM book_orders bo
       JOIN books b ON bo.book_id = b.id
       WHERE bo.id = $1 AND b.counselor_id = $2`,
      [id, req.user.counselorId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }
    
    const order = checkResult.rows[0];
    
    // Only allow deletion of delivered orders
    if (order.order_status !== 'delivered') {
      return res.status(400).json({ 
        error: "Only delivered orders can be deleted" 
      });
    }
    
    // Delete the order
    const result = await pool.query(
      `DELETE FROM book_orders 
       WHERE id = $1 AND book_id IN (
         SELECT id FROM books WHERE counselor_id = $2
       ) RETURNING id`,
      [id, req.user.counselorId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }
    
    res.json({ success: true, message: "Order deleted successfully" });
  } catch (err) {
    console.error("Error deleting order:", err);
    res.status(500).json({ error: "Failed to delete order" });
  }
});

// Create new book order (for bot)
router.post("/orders", async (req, res) => {
  try {
    const {
      book_id,
      client_telegram_id,
      client_name,
      client_email,
      client_phone,
      client_address,
      client_city,
      client_country,
      client_county,
      client_postal_code,
      payment_method,
      payment_reference,
      payment_amount_cents,
      shipping_cost_cents,
      total_amount_cents
    } = req.body;
    
    // Validate required fields
    if (!book_id || !client_telegram_id || !client_name || !client_email || !client_phone || 
        !client_address || !client_city || !client_country || !payment_method || !total_amount_cents) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    const result = await pool.query(
      `INSERT INTO book_orders (
        book_id, client_telegram_id, client_name, client_email, client_phone,
        client_address, client_city, client_country, client_county, client_postal_code,
        payment_method, payment_reference, payment_amount_cents, shipping_cost_cents, total_amount_cents
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
      [
        book_id, client_telegram_id, client_name, client_email, client_phone,
        client_address, client_city, client_country, client_county, client_postal_code,
        payment_method, payment_reference, payment_amount_cents, shipping_cost_cents, total_amount_cents
      ]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating book order:", err);
    res.status(500).json({ error: "Failed to create order: " + err.message });
  }
});

// Get client's orders (for bot)
router.get("/orders/client/:telegram_id", async (req, res) => {
  try {
    const { telegram_id } = req.params;
    const result = await pool.query(
      `SELECT bo.*, b.title as book_title, b.author as book_author, c.name as counselor_name
       FROM book_orders bo
       JOIN books b ON bo.book_id = b.id
       JOIN counselors c ON b.counselor_id = c.id
       WHERE bo.client_telegram_id = $1
       ORDER BY bo.created_at DESC`,
      [telegram_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching client orders:", err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

export default router;