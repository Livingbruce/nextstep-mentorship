## Books Marketplace Upgrade Plan

### 1. Current State Summary
- `books` table stores limited metadata: `title`, `author`, optional `isbn`, `price_cents`, `pickup_station`, `condition`, and `is_sold`. No format/cover/file fields.
- No dedicated `book_files`, `book_formats`, `book_inventory`, or `wishlist` tables.
- `book_orders` references appear in routes/controllers but table definition is missing from `optimized_schema.sql` (must confirm in production DB). Likely contains shipping/payment columns inferred from code (`client_*`, `payment_*`, `order_status`, etc.).
- Dashboard (`frontend/src/pages/Books.jsx`) provides CRUD for counselor books plus order management; no public storefront UI.
- API routes in `backend/src/routes/books.js` expose counselor CRUD/orders endpoints and bot-related order APIs, but no public browsing/purchase endpoints for web users.

### 2. Target Experience (NovelNext Inspired)
1. **Public storefront**
   - `Home`: grid of books with filters (format, genre/subject, counselor).
   - `BookDetail`: cover, description, price, metadata (chapters/pages), counselor bio, CTAs (`Buy`, `Add to Wishlist`).
2. **Account areas**
   - `My Library`: unlocked digital purchases; actions `Read online`, `Download`, `Send to email`.
   - `My Orders`: both digital and physical purchases with status tracking.
   - `Wishlist`: saved titles to revisit.
3. **Purchase flows**
   - Soft copy: require email + optional phone; after payment confirmation the title moves to library with download/email options.
   - Hard copy: require shipping address; order tracking until delivered.
   - Payment methods: M-Pesa (phone, reference) and Bank (transaction reference). Payment confirmation happens via dashboard toggle for now.
4. **Counselor dashboard**
   - Upload form includes format (soft/hard), cover preview, file upload (PDF/EPUB), price, description, chapter/page counts.
   - For hard copy, capture inventory count, shipping notes.
   - Ability to preview uploaded file and delete titles.

### 3. Data Model Changes
#### 3.1 `books` table (alter)
- Add columns:
  - `format` (`ENUM('soft', 'hard')`, default `'soft'`).
  - `cover_image_url` (text).
  - `file_url` (text, nullable for hard copies).
  - `preview_url` (text for sample chapters).
  - `page_count` (integer).
  - `chapter_count` (integer).
  - `tags` (text[] or JSONB for genres/subjects).
  - `inventory_count` (integer, nullable; relevant for hard copies).
  - `is_active` (boolean, default true) for soft deletes.
  - `rating_average`, `rating_count` (future-proof; optional).

#### 3.2 `book_orders` table (verify/create/alter)
- If absent, create with UUID PK and fields used in code (`client_*`, `payment_method`, etc.).
- New/updated columns:
  - `format` (`ENUM('soft','hard')`).
  - `payment_status` (`ENUM('pending','paid','failed','refunded')`, default `'pending'`).
  - `fulfillment_status` (`ENUM('ordered','processing','shipped','delivered','cancelled')`, default `'ordered'`).
  - `delivery_address JSONB` (for hard copy shipping).
  - `unlock_code`/`download_url` (soft copy delivery).
  - `email_sent` (boolean) for delivery confirmation.
  - `counselor_notes` (text).
  - `purchased_by` (UUID of `clients` or `students` if login).
  - Timestamps `paid_at`, `shipped_at`, `delivered_at`.

#### 3.3 Supporting tables
- `book_files` (optional) for versioning or storing multiple formats.
- `wishlist` table linking users to books.
- `library_entries` (many-to-many) capturing unlocked digital copies per user with `access_url`, `expires_at`.

### 4. API Surface
#### Public REST endpoints
- `GET /api/books` (query params: `format`, `search`, `tags`, `counselorId`).
- `GET /api/books/:id`.
- `POST /api/books/:id/purchase` (auth optional; takes contact+payment details; returns order summary + payment instructions).
- `POST /api/books/orders/:orderId/confirm` (webhook/manual; toggle payment status).
- `GET /api/books/my-library` (auth required).
- `GET /api/books/my-orders`.
- `POST /api/books/:id/wishlist` & `DELETE /api/books/:id/wishlist`.
- `GET /api/books/wishlist`.

#### Counselor dashboard endpoints (extend existing)
- `POST /api/dashboard/books` to accept new fields + file uploads.
- `PUT /api/dashboard/books/:id` for edits.
- `POST /api/dashboard/books/:id/upload` (cover/file).
- `GET /api/dashboard/books/:id/preview`.
- Extend `/api/dashboard/books/orders` to include payment/fulfillment state transitions and digital delivery controls.

### 5. Frontend Workstreams
1. **Shared**
   - Add API client wrappers for new endpoints.
   - Update route registration and navigation layout.
   - Introduce `BooksContext` or React Query hooks for caching.
2. **Public storefront**
   - Create `BooksHome.jsx`, `BookDetail.jsx`, `Checkout.jsx`.
   - Build components: `BookCard`, `FilterPanel`, `ChapterList`, `PaymentOption`, `AddressForm`, `DigitalDeliveryOptions`.
3. **Account areas**
   - `MyLibrary.jsx`, `MyOrders.jsx`, `Wishlist.jsx`.
   - File viewer modal using `react-pdf` or embed `<iframe>` for PDF.
4. **Counselor dashboard**
   - Enhance existing `Books.jsx` to handle new fields (format switch, cover upload, file management).
   - Add preview modals and inventory controls.

### 6. Payment & Fulfillment Flow
1. Order created with status `pending`/`ordered` and payment details.
2. Counselor marks payment `paid` via dashboard (future: automate via M-Pesa API).
3. Backend:
   - Soft copy: generate signed URL/token, insert into `library_entries`, send email with download link.
   - Hard copy: remains in `My Orders`; counselor updates shipping/tracking; client sees updates.
4. `My Library` shows all `library_entries` with actions to view/download/resend email.

### 7. Migration Strategy
1. Create SQL migration(s) altering `books` and (if necessary) creating/updating `book_orders`.
2. Introduce new tables (`library_entries`, `wishlist`, optional `book_files`).
3. Backfill existing records (mark legacy entries as `format='hard'` if `pickup_station` set, else `soft` with `file_url=NULL`).
4. Update backend code to handle new fields gradually (feature flag or stepwise deployment).

### 8. Next Immediate Tasks
1. Confirm actual `book_orders` schema in production (inspect DB, update migration plan accordingly).
2. Draft detailed backend migration SQL (books, book_orders, library_entries, wishlist).
3. Define API contracts (request/response payloads).
4. Update frontend sitemap and component tree document.


