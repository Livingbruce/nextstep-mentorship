import express from "express";
import pool from "../db/pool.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  uploadBook,
  uploadCover,
  uploadBookAndCover,
  getFileUrl,
  getFilePath,
  uploadFileToFirebase,
} from "../middleware/upload.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import emailService from "../services/emailService.js";
import {
  upsertBookDocument,
  deleteBookDocument,
  fetchStoreBooks,
  fetchBookById,
  fetchBooksForCounselor,
  fetchAllBooks,
} from "../services/firestoreBooksService.js";
import {
  isFirebaseStorageUrl,
  extractFirebaseStoragePath,
  downloadFromFirebaseStorage,
  downloadFromFirebaseUrl,
  getFirebaseSignedDownloadUrl,
} from "../utils/firebaseStorage.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

async function downloadUrlToBuffer(targetUrl) {
  if (!targetUrl) {
    throw new Error("Missing download URL");
  }

  const https = await import("https");
  const http = await import("http");
  const urlModule = await import("url");
  const parsedUrl = new urlModule.URL(targetUrl);
  const protocol = parsedUrl.protocol === "https:" ? https : http;
  const redirectStatuses = new Set([301, 302, 303, 307, 308]);

  return new Promise((resolve, reject) => {
    const request = protocol.get(parsedUrl, (response) => {
      if (redirectStatuses.has(response.statusCode) && response.headers.location) {
        response.resume();
        const redirectUrl = new urlModule.URL(response.headers.location, parsedUrl);
        downloadUrlToBuffer(redirectUrl.toString()).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download resource: ${response.statusCode}`));
        response.resume();
        return;
      }

      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolve(Buffer.concat(chunks)));
      response.on("error", reject);
    });

    request.on("error", reject);
  });
}

async function fetchCounselorMeta(counselorId) {
  if (!counselorId) return { name: null };
  const counselor = await pool.query(
    "SELECT name FROM counselors WHERE id = $1",
    [counselorId]
  );
  return counselor.rows[0] || { name: null };
}

// ========== DIAGNOSTIC ROUTE (for testing Firebase Storage) ==========
router.get("/test-firebase", authMiddleware, async (req, res) => {
  try {
    const { getFirebaseStorage } = await import('../utils/firebaseAdmin.js');
    const storage = getFirebaseStorage();
    const bucket = storage.bucket();
    
    const results = {
      firebaseConfigured: !!process.env.FIREBASE_PROJECT_ID,
      projectId: process.env.FIREBASE_PROJECT_ID || 'missing',
      bucketName: bucket.name,
      tests: []
    };
    
    // Test 1: List files in books folder
    try {
      const [files] = await bucket.getFiles({ prefix: 'books/', maxResults: 10 });
      results.tests.push({
        test: 'List files in books folder',
        success: true,
        count: files.length,
        files: files.map(f => ({
          name: f.name,
          size: f.metadata.size,
          contentType: f.metadata.contentType,
          created: f.metadata.timeCreated
        }))
      });
    } catch (error) {
      results.tests.push({
        test: 'List files in books folder',
        success: false,
        error: error.message
      });
    }
    
    // Test 2: List files in covers folder
    try {
      const [files] = await bucket.getFiles({ prefix: 'covers/', maxResults: 10 });
      results.tests.push({
        test: 'List files in covers folder',
        success: true,
        count: files.length,
        files: files.map(f => ({
          name: f.name,
          size: f.metadata.size,
          contentType: f.metadata.contentType,
          created: f.metadata.timeCreated
        }))
      });
    } catch (error) {
      results.tests.push({
        test: 'List files in covers folder',
        success: false,
        error: error.message
      });
    }
    
    // Test 3: Get a specific file from database and check if it exists
    try {
      const bookResult = await pool.query(
        `SELECT id, title, file_url FROM books WHERE file_url LIKE '%firebasestorage.googleapis.com%' LIMIT 1`
      );
      
      if (bookResult.rows.length > 0) {
        const book = bookResult.rows[0];
        const storagePath = extractFirebaseStoragePath(book.file_url);
        
        if (storagePath) {
          try {
            const file = bucket.file(storagePath);
            const [exists] = await file.exists();
            const [metadata] = await file.getMetadata();
            
            results.tests.push({
              test: `Check if file exists: ${storagePath}`,
              success: true,
              storagePath: storagePath,
              file_url: book.file_url,
              exists: exists,
              metadata: {
                name: metadata.name,
                size: metadata.size,
                contentType: metadata.contentType,
                created: metadata.timeCreated
              }
            });
            
            // Test 4: Try to download the file
            try {
              const buffer = await downloadFromFirebaseStorage(storagePath);
              results.tests.push({
                test: `Download file: ${storagePath}`,
                success: true,
                bufferSize: buffer.length,
                message: 'File downloaded successfully'
              });
            } catch (downloadError) {
              results.tests.push({
                test: `Download file: ${storagePath}`,
                success: false,
                error: downloadError.message
              });
            }
          } catch (error) {
            results.tests.push({
              test: `Check if file exists: ${storagePath}`,
              success: false,
              storagePath: storagePath,
              file_url: book.file_url,
              error: error.message
            });
          }
        }
      } else {
        results.tests.push({
          test: 'Get file from database',
          success: false,
          message: 'No books with Firebase Storage URLs found in database'
        });
      }
    } catch (error) {
      results.tests.push({
        test: 'Get file from database',
        success: false,
        error: error.message
      });
    }
    
    res.json(results);
  } catch (err) {
    console.error("Error testing Firebase Storage:", err);
    res.status(500).json({ 
      error: "Failed to test Firebase Storage", 
      details: err.message,
      stack: err.stack 
    });
  }
});

// Get all books (dashboard/admin)
router.get("/", async (req, res) => {
  try {
    const books = await fetchAllBooks(500);
    res.json(books);
  } catch (err) {
    console.error("Error fetching books:", err);
    res.status(500).json({ error: "Failed to fetch books" });
  }
});

// ========== PUBLIC STORE ROUTES (no auth) ==========

// Public: list active books with optional filters
router.get("/store/books", async (req, res) => {
  try {
    const books = await fetchStoreBooks(req.query);
    res.json(books);
  } catch (err) {
    console.error("Error fetching store books:", err);
    res.status(500).json({ error: "Failed to fetch books" });
  }
});

// Public: book detail
router.get("/store/books/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const book = await fetchBookById(id);
    if (!book || book.is_active === false) {
      return res.status(404).json({ error: "Book not found" });
    }

    if (!book.counselor_name && book.counselor_id) {
      const counselor = await fetchCounselorMeta(book.counselor_id);
      book.counselor_name = counselor?.name || null;
    }

    res.json(book);
  } catch (err) {
    console.error("Error fetching book detail:", err);
    res.status(500).json({ error: "Failed to fetch book" });
  }
});

// Public: create purchase (web) - minimal validation, no auth
router.post("/store/books/:id/purchase", async (req, res) => {
  try {
    const { id } = req.params;
    const {
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
    } = req.body;

    const book = await fetchBookById(id);
    if (!book || book.is_active === false) {
      return res.status(404).json({ error: "Book not found" });
    }

    if (!client_name || !client_email || !client_phone || !payment_method) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (
      book.format === "hard" &&
      (!client_address || !client_city || !client_country)
    ) {
      return res.status(400).json({
        error: "Shipping address required for hard copy",
      });
    }

    const clientTelegramId = client_email;
    let normalizedPaymentMethod = payment_method;
    if (payment_method === "mpesa") {
      normalizedPaymentMethod = "M-Pesa";
    } else if (payment_method === "bank") {
      normalizedPaymentMethod = "Bank Transfer";
    }

    const totalAmount = book.price_cents;
    const r = await pool.query(
      `INSERT INTO book_orders (
         book_id, client_telegram_id, client_name, client_email, client_phone,
         client_address, client_city, client_country, client_county, client_postal_code,
         payment_method, payment_reference, payment_amount_cents, shipping_cost_cents, total_amount_cents,
         format, payment_status, fulfillment_status
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'pending','ordered'
       ) RETURNING *`,
      [
        book.id,
        clientTelegramId,
        client_name,
        client_email,
        client_phone,
        client_address || null,
        client_city || null,
        client_country || null,
        client_county || null,
        client_postal_code || null,
        normalizedPaymentMethod,
        payment_reference || null,
        book.price_cents,
        0,
        totalAmount,
        book.format,
      ]
    );

    res.status(201).json({ success: true, order: r.rows[0] });
  } catch (err) {
    console.error("Error creating web book order:", err);
    res.status(500).json({ error: "Failed to create order" });
  }
});

// Public: my orders by email
router.get("/store/my-orders", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: "email is required" });
    const r = await pool.query(
      `SELECT bo.*, b.title as book_title, b.author as book_author
       FROM book_orders bo
       JOIN books b ON bo.book_id = b.id
       WHERE bo.client_email = $1
       ORDER BY bo.created_at DESC`,
      [email]
    );
    res.json(r.rows);
  } catch (err) {
    console.error("Error fetching my orders:", err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// Public: my library by email
router.get("/store/my-library", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: "email is required" });
    const r = await pool.query(
      `SELECT le.*, b.title, b.author, b.cover_image_url
       FROM library_entries le
       JOIN books b ON le.book_id = b.id
       WHERE le.user_email = $1
       ORDER BY le.created_at DESC`,
      [email]
    );
    res.json(r.rows);
  } catch (err) {
    console.error("Error fetching my library:", err);
    res.status(500).json({ error: "Failed to fetch library" });
  }
});

// Public: wishlist ops by email
router.post("/store/wishlist/:bookId", async (req, res) => {
  try {
    const { bookId } = req.params;
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "email is required" });

    await pool.query(
      `INSERT INTO wishlist (user_email, book_id) VALUES ($1, $2)
       ON CONFLICT (user_email, book_id) DO NOTHING`,
      [email, bookId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Error adding to wishlist:", err);
    res.status(500).json({ error: "Failed to update wishlist" });
  }
});

router.delete("/store/wishlist/:bookId", async (req, res) => {
  try {
    const { bookId } = req.params;
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "email is required" });

    await pool.query(
      `DELETE FROM wishlist WHERE user_email = $1 AND book_id = $2`,
      [email, bookId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Error removing from wishlist:", err);
    res.status(500).json({ error: "Failed to update wishlist" });
  }
});

// Get books for logged-in counselor
router.get("/my-books", authMiddleware, async (req, res) => {
  try {
    const books = await fetchBooksForCounselor(req.user.counselorId);
    res.json(books);
  } catch (err) {
    console.error("Error fetching counselor books:", err);
    res.status(500).json({ error: "Failed to fetch books" });
  }
});

// Add new book (with file upload support)
router.post("/", authMiddleware, uploadBookAndCover.fields([
  { name: 'bookFile', maxCount: 1 },
  { name: 'coverFile', maxCount: 1 }
]), async (req, res) => {
  try {
    // Log the raw request body to debug FormData parsing
    console.log("Raw req.body:", req.body);
    console.log("req.files:", req.files);
    
    const { 
      title, 
      author, 
      price_cents, 
      description,
      format,
      cover_image_url,
      file_url,
      chapter_count,
      page_count
    } = req.body;
    
    // Log extracted fields
    console.log("Extracted fields:", {
      title,
      author,
      price_cents,
      description,
      format,
      cover_image_url,
      file_url,
      chapter_count,
      page_count
    });
    
    // Parse numeric fields from FormData (they come as strings)
    const parsedPriceCents = price_cents ? parseInt(price_cents, 10) : null;
    const parsedChapterCount = chapter_count ? parseInt(chapter_count, 10) : null;
    const parsedPageCount = page_count ? parseInt(page_count, 10) : null;
    
    // Normalize and validate required fields
    const normalizedTitle = title ? String(title).trim() : '';
    const normalizedAuthor = author ? String(author).trim() : '';
    const normalizedDescription = description ? String(description).trim() : '';
    const normalizedFormat = format ? String(format).trim().toLowerCase() : 'soft';
    
    // Validate format
    if (normalizedFormat !== 'soft' && normalizedFormat !== 'hard') {
      return res.status(400).json({ error: "Format must be 'soft' or 'hard'" });
    }
    
    // Validate required fields - check for undefined, null, or empty strings
    if (!normalizedTitle || normalizedTitle.length === 0) {
      console.error("Validation failed: title is missing or empty", { title, normalizedTitle });
      return res.status(400).json({ error: "Title is required" });
    }
    if (!normalizedAuthor || normalizedAuthor.length === 0) {
      console.error("Validation failed: author is missing or empty", { author, normalizedAuthor });
      return res.status(400).json({ error: "Author is required" });
    }
    if (!parsedPriceCents || parsedPriceCents <= 0 || isNaN(parsedPriceCents)) {
      console.error("Validation failed: price_cents is invalid", { price_cents, parsedPriceCents });
      return res.status(400).json({ error: "Valid price is required" });
    }
    if (!normalizedDescription || normalizedDescription.length === 0) {
      console.error("Validation failed: description is missing or empty", { description, normalizedDescription });
      return res.status(400).json({ error: "Description is required" });
    }
    
    // Handle uploaded files - upload to Firebase Storage
    let finalFileUrl = file_url || null;
    let finalCoverUrl = cover_image_url || null;
    
    if (req.files?.bookFile?.[0]) {
      const uploadedFile = req.files.bookFile[0];
      // Upload to Firebase Storage and get Firebase URL
      finalFileUrl = await uploadFileToFirebase(uploadedFile.path, 'book');
      console.log(`📤 Book file uploaded to Firebase Storage: ${finalFileUrl}`);
    }
    
    if (req.files?.coverFile?.[0]) {
      const uploadedCover = req.files.coverFile[0];
      // Upload to Firebase Storage and get Firebase URL
      finalCoverUrl = await uploadFileToFirebase(uploadedCover.path, 'cover');
      console.log(`📤 Cover image uploaded to Firebase Storage: ${finalCoverUrl}`);
    }
    
    console.log("Creating book:", { 
      title: normalizedTitle, 
      author: normalizedAuthor, 
      price_cents: parsedPriceCents, 
      description: normalizedDescription, 
      format: normalizedFormat,
      originalFormat: format,
      cover_image_url: finalCoverUrl,
      file_url: finalFileUrl,
      chapter_count: parsedChapterCount,
      page_count: parsedPageCount,
      counselorId: req.user.counselorId 
    });
    
    const result = await pool.query(
      `INSERT INTO books (
        counselor_id, title, author, price_cents, description,
        format, cover_image_url, file_url, chapter_count, page_count
      ) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        req.user.counselorId, 
        normalizedTitle, 
        normalizedAuthor, 
        parsedPriceCents, 
        normalizedDescription,
        normalizedFormat,
        finalCoverUrl,
        finalFileUrl,
        parsedChapterCount,
        parsedPageCount
      ]
    );
    const createdBook = result.rows[0];
    const counselorMeta = await fetchCounselorMeta(req.user.counselorId);
    await upsertBookDocument(createdBook, {
      counselor_name: counselorMeta?.name || null,
    });

    console.log("✅ Book created successfully with format:", createdBook.format);
    res.status(201).json(createdBook);
  } catch (err) {
    console.error("Error creating book:", err);
    res.status(500).json({ error: "Failed to add book: " + err.message });
  }
});

// Update book (with file upload support)
router.put("/:id", authMiddleware, uploadBookAndCover.fields([
  { name: 'bookFile', maxCount: 1 },
  { name: 'coverFile', maxCount: 1 }
]), async (req, res) => {
  try {
    const { 
      title, 
      author, 
      price_cents, 
      description,
      format,
      cover_image_url,
      file_url,
      chapter_count,
      page_count
    } = req.body;
    const { id } = req.params;
    
    // Parse numeric fields from FormData (they come as strings)
    const parsedPriceCents = price_cents ? parseInt(price_cents, 10) : null;
    const parsedChapterCount = chapter_count ? parseInt(chapter_count, 10) : null;
    const parsedPageCount = page_count ? parseInt(page_count, 10) : null;
    
    // Normalize format
    const normalizedFormat = format ? String(format).trim().toLowerCase() : 'soft';
    if (normalizedFormat !== 'soft' && normalizedFormat !== 'hard') {
      return res.status(400).json({ error: "Format must be 'soft' or 'hard'" });
    }
    
    // Validate required fields
    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Title is required" });
    }
    if (!author || !author.trim()) {
      return res.status(400).json({ error: "Author is required" });
    }
    if (!parsedPriceCents || parsedPriceCents <= 0) {
      return res.status(400).json({ error: "Valid price is required" });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ error: "Description is required" });
    }
    
    // Handle uploaded files - preserve existing if not provided
    let finalFileUrl = file_url || null;
    let finalCoverUrl = cover_image_url || null;
    
    // Get existing book to preserve URLs if not updating
    const existingBook = await pool.query(
      `SELECT file_url, cover_image_url FROM books WHERE id = $1 AND counselor_id = $2`,
      [id, req.user.counselorId]
    );
    
    if (existingBook.rows.length === 0) {
      return res.status(404).json({ error: "Book not found" });
    }
    
    // Use uploaded file if provided, otherwise keep existing or use provided URL
    if (req.files?.bookFile?.[0]) {
      // Upload to Firebase Storage and get Firebase URL
      finalFileUrl = await uploadFileToFirebase(req.files.bookFile[0].path, 'book');
      console.log(`📤 Book file uploaded to Firebase Storage: ${finalFileUrl}`);
    } else if (!file_url && existingBook.rows[0].file_url) {
      finalFileUrl = existingBook.rows[0].file_url;
    }
    
    if (req.files?.coverFile?.[0]) {
      // Upload to Firebase Storage and get Firebase URL
      finalCoverUrl = await uploadFileToFirebase(req.files.coverFile[0].path, 'cover');
      console.log(`📤 Cover image uploaded to Firebase Storage: ${finalCoverUrl}`);
    } else if (!cover_image_url && existingBook.rows[0].cover_image_url) {
      finalCoverUrl = existingBook.rows[0].cover_image_url;
    }
    
    const result = await pool.query(
      `UPDATE books 
       SET title = $1, author = $2, price_cents = $3, description = $4,
           format = $5, cover_image_url = $6, file_url = $7, 
           chapter_count = $8, page_count = $9, updated_at = now()
       WHERE id = $10 AND counselor_id = $11 RETURNING *`,
      [
        title.trim(), 
        author.trim(), 
        parsedPriceCents, 
        description.trim(),
        normalizedFormat,
        finalCoverUrl,
        finalFileUrl,
        parsedChapterCount,
        parsedPageCount,
        id, 
        req.user.counselorId
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Book not found" });
    }
    
    const updatedBook = result.rows[0];
    const counselorMeta = await fetchCounselorMeta(req.user.counselorId);
    await upsertBookDocument(updatedBook, {
      counselor_name: counselorMeta?.name || null,
    });
    
    res.json(updatedBook);
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
    
    await deleteBookDocument(id);
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
      `SELECT bo.*, b.title as book_title, b.author as book_author, b.format as book_format, c.name as counselor_name
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
    
    // Apply change
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

    let updated = result.rows[0];

    // If marked paid, set payment_status and unlock digital copies
    if (order_status === "paid") {
      const paidRes = await pool.query(
        `UPDATE book_orders
         SET payment_status = 'paid', paid_at = now(), updated_at = now()
         WHERE id = $1
         RETURNING *`,
        [id]
      );
      updated = paidRes.rows[0] || updated;

      // Check book format for soft copy unlock
      const bookRes = await pool.query(
        `SELECT b.id, b.format FROM books b WHERE b.id = $1`,
        [updated.book_id]
      );
      const book = bookRes.rows[0];

      if (book && book.format === "soft") {
        // Generate unlock_code and simple access_url (placeholder: direct download_url if present later)
        const unlockCode = Math.random().toString(36).slice(2, 10).toUpperCase();
        await pool.query(
          `UPDATE book_orders SET unlock_code = $1 WHERE id = $2`,
          [unlockCode, id]
        );

        // Insert into library_entries (idempotent by unique constraint)
        await pool.query(
          `INSERT INTO library_entries (user_email, book_id, order_id, access_url)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (user_email, book_id) DO NOTHING`,
          [updated.client_email, updated.book_id, updated.id, updated.download_url || null]
        );
      }
    }

    res.json(updated);
  } catch (err) {
    console.error("Error updating order status:", err);
    res.status(500).json({ error: "Failed to update order status" });
  }
});

// Delete delivered book order
router.delete("/orders/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // First check if order exists and is delivered or paid soft copy
    const checkResult = await pool.query(
      `SELECT bo.*, b.format FROM book_orders bo
       JOIN books b ON bo.book_id = b.id
       WHERE bo.id = $1 AND b.counselor_id = $2`,
      [id, req.user.counselorId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }
    
    const order = checkResult.rows[0];
    
    // Only allow deletion of delivered orders or paid soft copy orders
    const isSoftCopy = order.format === 'soft';
    const canDelete = order.order_status === 'delivered' || (order.order_status === 'paid' && isSoftCopy);
    
    if (!canDelete) {
      return res.status(400).json({ 
        error: isSoftCopy 
          ? "Only paid or delivered soft copy orders can be deleted" 
          : "Only delivered orders can be deleted" 
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

// Serve book files (download)
router.get("/files/:filename", async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = getFilePath(filename, 'book');
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }
    
    res.download(filePath, (err) => {
      if (err) {
        console.error("Error downloading file:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Failed to download file" });
        }
      }
    });
  } catch (err) {
    console.error("Error serving file:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to serve file" });
    }
  }
});

// Serve cover images
router.get("/covers/:filename", async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = getFilePath(filename, 'cover');
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }
    
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error("Error sending cover file:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Failed to serve cover" });
        }
      }
    });
  } catch (err) {
    console.error("Error serving cover:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to serve cover" });
    }
  }
});

// View book (for PDFs in browser)
router.get("/view/:bookId", async (req, res) => {
  try {
    const { bookId } = req.params;
    
    // Get book file URL
    const bookResult = await pool.query(
      `SELECT file_url, title, format FROM books WHERE id = $1`,
      [bookId]
    );
    
    if (bookResult.rows.length === 0) {
      return res.status(404).json({ error: "Book not found" });
    }
    
    const book = bookResult.rows[0];
    
    if (!book.file_url) {
      return res.status(404).json({ error: "Book file not available" });
    }
    
    // Check if it's a local file
    if (book.file_url.includes('/api/books/files/')) {
      const filename = book.file_url.split('/').pop();
      const filePath = getFilePath(filename, 'book');
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found" });
      }
      
      // Check if it's a PDF
      if (path.extname(filePath).toLowerCase() === '.pdf') {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${book.title}.pdf"`);
        return res.sendFile(filePath, (err) => {
          if (err) {
            console.error("Error sending PDF:", err);
            if (!res.headersSent) {
              res.status(500).json({ error: "Failed to view book" });
            }
          }
        });
      } else {
        // For other file types, offer download
        return res.download(filePath, `${book.title}${path.extname(filePath)}`, (err) => {
          if (err) {
            console.error("Error downloading file:", err);
            if (!res.headersSent) {
              res.status(500).json({ error: "Failed to download book" });
            }
          }
        });
      }
    } else {
      // External URL - redirect
      return res.redirect(book.file_url);
    }
  } catch (err) {
    console.error("Error viewing book:", err);
    res.status(500).json({ error: "Failed to view book" });
  }
});

// Send book to email
router.post("/send-email/:bookId", async (req, res) => {
  try {
    const { bookId } = req.params;
    const { email } = req.body;
    
    console.log(`📧 Sending book ${bookId} to email: ${email}`);
    
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }
    
    // Check if email service is configured
    const hasEmailConfig = process.env.EMAIL_USER && process.env.EMAIL_PASS && 
                          process.env.EMAIL_USER !== 'your-email' && 
                          process.env.EMAIL_PASS !== 'your-app-password';
    
    if (!hasEmailConfig) {
      console.warn('⚠️  Email credentials not configured. Email will be logged but not sent.');
      console.warn('⚠️  Please set EMAIL_USER and EMAIL_PASS environment variables in Vercel.');
    }
    
    // Get book details including cover image
    const bookResult = await pool.query(
      `SELECT file_url, title, author, format, cover_image_url FROM books WHERE id = $1`,
      [bookId]
    );
    
    console.log(`📋 Book file_url from DB: ${bookResult.rows[0]?.file_url}`);
    
    if (bookResult.rows.length === 0) {
      return res.status(404).json({ error: "Book not found" });
    }
    
    const book = bookResult.rows[0];
    
    if (!book.file_url) {
      return res.status(404).json({ error: "Book file not available" });
    }
    
    // Check if file is in Firebase Storage or local
    let attachment = null;
    let fileExists = false;
    let downloadUrl = null;
    
    // Check if it's a Firebase Storage URL
    if (isFirebaseStorageUrl(book.file_url)) {
      // Extract storage path and download directly from Firebase Storage using Admin SDK
      try {
        const storagePath = extractFirebaseStoragePath(book.file_url);
        if (!storagePath) {
          throw new Error('Invalid Firebase Storage URL format');
        }
        
        console.log(`✅ Extracted storage path: ${storagePath}`);
        console.log(`📋 Original Firebase Storage URL: ${book.file_url}`);
        
          // Download directly from Firebase Storage using Admin SDK (bypasses authentication issues)
          try {
            const fileBuffer = await downloadFromFirebaseStorage(storagePath);
            fileExists = true;
            
            // Validate file buffer
            if (!fileBuffer || fileBuffer.length === 0) {
              throw new Error('Downloaded file is empty');
            }
            
            // Determine file extension from storage path or URL
            const fileExt = path.extname(storagePath) || path.extname(book.file_url) || '.pdf';
            const sanitizedTitle = book.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
            
            // Validate PDF header if it's a PDF
            if (fileExt === '.pdf') {
              const pdfHeader = fileBuffer.slice(0, 4).toString();
              if (pdfHeader !== '%PDF') {
                console.warn(`⚠️  Warning: File does not appear to be a valid PDF (header: ${pdfHeader})`);
              } else {
                console.log(`✅ Valid PDF detected (header: ${pdfHeader})`);
              }
            }
            
            attachment = {
              filename: `${sanitizedTitle}${fileExt}`,
              content: fileBuffer,
              contentType: fileExt === '.pdf' ? 'application/pdf' : 
                          fileExt === '.epub' ? 'application/epub+zip' :
                          fileExt === '.mobi' ? 'application/x-mobipocket-ebook' :
                          'application/octet-stream'
            };
            
            console.log(`✅ Downloaded file from Firebase Storage for attachment (${fileBuffer.length} bytes, type: ${attachment.contentType}, filename: ${attachment.filename})`);
            
            // Generate a signed URL for the email download link (with longer expiry)
            downloadUrl = await getFirebaseSignedDownloadUrl(storagePath, 86400); // 24 hours expiry
            console.log(`✅ Generated signed download URL for email`);
          } catch (downloadError) {
            console.warn(`⚠️  Could not download from Firebase Storage (${downloadError.message}), generating signed URL only`);
            // Still provide a signed download URL even if we can't attach the file
            try {
              downloadUrl = await getFirebaseSignedDownloadUrl(storagePath, 86400); // 24 hours expiry
              console.log(`✅ Generated signed download URL (file not attached)`);
            } catch (urlError) {
              console.warn(`⚠️  Could not generate signed URL, using original URL`);
              downloadUrl = book.file_url;
            }
          }
      } catch (error) {
        console.warn(`⚠️  Error processing Firebase Storage URL:`, error);
        // Fallback: use original URL
        downloadUrl = book.file_url;
      }
    } else if (book.file_url.includes('/api/books/files/')) {
      // Local file - check if it exists
      const filename = book.file_url.split('/').pop();
      const filePath = getFilePath(filename, 'book');
      
      if (fs.existsSync(filePath)) {
        fileExists = true;
        attachment = {
          filename: `${book.title}${path.extname(filePath)}`,
          path: filePath
        };
        console.log(`✅ File found at: ${filePath}`);
      } else {
        console.warn(`⚠️  File not found at path: ${filePath}`);
        // Generate download URL for the file
        const baseUrl = process.env.VERCEL_URL 
          ? `https://${process.env.VERCEL_URL}` 
          : (process.env.API_BASE_URL || process.env.BACKEND_URL || 'http://localhost:5000');
        downloadUrl = `${baseUrl}/api/books/files/${filename}`;
        console.log(`ℹ️  Providing download link: ${downloadUrl}`);
      }
    } else {
      // External URL - use it as download link
      downloadUrl = book.file_url;
      console.log(`ℹ️  Book file is external URL: ${book.file_url}`);
    }
    
    // Prepare attachments - book file for download, cover image embedded (not downloadable)
    const attachments = [];
    if (attachment) {
      attachments.push(attachment); // Book file - downloadable
    }
    
    // Include cover image if available (embedded, not downloadable)
    let coverImageCid = null;
    if (book.cover_image_url) {
      try {
        let coverBuffer = null;
        console.log(`📷 Attempting to download cover image from: ${book.cover_image_url}`);
        
        // Check if it's a Firebase Storage URL first - use Admin SDK directly
        if (isFirebaseStorageUrl(book.cover_image_url)) {
          console.log(`✅ Detected Firebase Storage URL for cover image`);
          const storagePath = extractFirebaseStoragePath(book.cover_image_url);
          if (storagePath) {
            console.log(`✅ Extracted storage path: ${storagePath}`);
            coverBuffer = await downloadFromFirebaseStorage(storagePath);
            console.log(`✅ Downloaded cover image from Firebase Storage (${coverBuffer.length} bytes)`);
          } else {
            console.warn(`⚠️  Could not extract storage path from cover image URL: ${book.cover_image_url}`);
            // Try to download anyway as fallback
            try {
              coverBuffer = await downloadUrlToBuffer(book.cover_image_url);
              console.log(`✅ Downloaded cover image via direct URL (fallback)`);
            } catch (fallbackError) {
              console.warn(`⚠️  Fallback download also failed: ${fallbackError.message}`);
              throw new Error(`Could not download cover image: ${fallbackError.message}`);
            }
          }
        } else {
          // For non-Firebase URLs, try direct download
          console.log(`ℹ️  Cover image is not a Firebase Storage URL, attempting direct download`);
          try {
            coverBuffer = await downloadUrlToBuffer(book.cover_image_url);
            console.log(`✅ Downloaded cover image via direct URL`);
          } catch (coverError) {
            console.warn(`⚠️  Direct download failed: ${coverError.message}`);
            // If it looks like it might be a Firebase URL but wasn't detected, try Firebase anyway
            if (book.cover_image_url.includes('firebase') || book.cover_image_url.includes('googleapis')) {
              console.log(`🔄 Retrying as Firebase Storage URL...`);
              try {
                const storagePath = extractFirebaseStoragePath(book.cover_image_url);
                if (storagePath) {
                  coverBuffer = await downloadFromFirebaseStorage(storagePath);
                  console.log(`✅ Downloaded cover image from Firebase Storage (retry)`);
                } else {
                  throw coverError;
                }
              } catch (firebaseError) {
                throw coverError; // Throw original error
              }
            } else {
              throw coverError;
            }
          }
        }

        coverImageCid = "cover-image";
        const coverExt = path.extname(book.cover_image_url) || ".jpg";
        const coverContentType = coverExt === '.png' ? 'image/png' :
                                 coverExt === '.gif' ? 'image/gif' :
                                 coverExt === '.webp' ? 'image/webp' :
                                 'image/jpeg';
        
        attachments.push({
          filename: `cover-${book.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50)}${coverExt}`,
          content: coverBuffer,
          cid: coverImageCid,
          contentType: coverContentType,
          contentDisposition: "inline", // Not downloadable
        });
        console.log(`✅ Cover image included in email (embedded, ${coverBuffer.length} bytes, ${coverContentType})`);
      } catch (error) {
        console.warn(`⚠️  Error downloading cover image:`, error);
      }
    }
    
    // Send email with attachment
    const mailOptions = {
      from: `"NextStep Mentorship" <${process.env.EMAIL_USER || 'dsnurturers@gmail.com'}>`,
      to: email,
      subject: `Your Book: ${book.title}`,
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
            .cover-image { max-width: 200px; height: auto; margin: 20px auto; display: block; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📚 Your Book is Ready!</h1>
            </div>
            <div class="content">
              <p>Dear Reader,</p>
              <p>Thank you for your purchase! ${fileExists ? 'Your book is attached to this email for download.' : downloadUrl ? 'Your book is available for download using the link below.' : 'Your book is available for download from your library.'}</p>
              ${coverImageCid ? `<img src="cid:${coverImageCid}" alt="${book.title} Cover" class="cover-image" />` : ''}
              <div class="info-box">
                <p><strong>Title:</strong> ${book.title}</p>
                <p><strong>Author:</strong> ${book.author || 'Unknown'}</p>
                <p><strong>Format:</strong> ${book.format === 'soft' ? 'Digital Copy' : 'Hard Copy'}</p>
              </div>
              ${downloadUrl ? `<p style="text-align: center; margin: 20px 0;"><a href="${downloadUrl}" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">📥 Download Your Book</a></p>` : ''}
              <p>You can also access your book from your library at any time.</p>
              <p>Enjoy reading!</p>
              <p>Best regards,<br>The NextStep Mentorship Team</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Thank you for your purchase! Your book "${book.title}" by ${book.author || 'Unknown'} ${fileExists ? 'is attached to this email.' : downloadUrl ? `is available for download at: ${downloadUrl}` : 'is available for download from your library.'}`,
      ...(attachments.length > 0 && { attachments })
    };
    
    console.log(`📤 Attempting to send email to: ${email}`);
    const result = await emailService.transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully. Message ID: ${result.messageId}`);
    
    res.json({ 
      success: true, 
      message: hasEmailConfig ? "Book sent to email successfully" : "Email logged (credentials not configured - check server logs)",
      emailConfigured: hasEmailConfig,
      fileAttached: fileExists,
      messageId: result.messageId
    });
  } catch (err) {
    console.error("❌ Error sending book to email:", err);
    console.error("Error details:", {
      message: err.message,
      stack: err.stack,
      code: err.code,
      response: err.response
    });
    res.status(500).json({ error: "Failed to send book to email: " + err.message });
  }
});

export default router;