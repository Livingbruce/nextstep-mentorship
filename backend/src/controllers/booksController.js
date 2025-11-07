import pool from '../db/pool.js';

export async function listBooks(req, res) {
  const r = await pool.query('SELECT b.*, c.name as counselor_name FROM books b LEFT JOIN counselors c ON b.counselor_id=c.id WHERE b.is_sold=false ORDER BY b.created_at DESC');
  res.json(r.rows);
}

export async function listMyBooks(req, res) {
  const cid = req.counselor.id;
  const r = await pool.query('SELECT * FROM books WHERE counselor_id=$1 ORDER BY created_at DESC', [cid]);
  res.json(r.rows);
}

export async function createBook(req, res) {
  const cid = req.counselor.id;
  const { title, description, price_cents, currency, payment_method, pickup_station } = req.body;
  if (!title || !price_cents) return res.status(400).json({ error: 'title & price_cents required' });
  const r = await pool.query(
    'INSERT INTO books (counselor_id, title, description, price_cents, currency, payment_method, pickup_station) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
    [cid, title, description || null, price_cents, currency || 'KES', payment_method || null, pickup_station || null]
  );
  res.status(201).json(r.rows[0]);
}

export async function markSold(req, res) {
  const cid = req.counselor.id;
  const id = parseInt(req.params.id,10);
  // ensure owner
  const owner = await pool.query('SELECT counselor_id FROM books WHERE id=$1', [id]);
  if (owner.rowCount === 0) return res.status(404).json({ error: 'Not found' });
  if (owner.rows[0].counselor_id !== cid) return res.status(403).json({ error: 'Not allowed' });

  const r = await pool.query('UPDATE books SET is_sold=true, updated_at=now() WHERE id=$1 RETURNING *', [id]);
  res.json(r.rows[0]);
}

export async function deleteBook(req,res) {
  const cid = req.counselor.id;
  const id = parseInt(req.params.id,10);
  const owner = await pool.query('SELECT counselor_id FROM books WHERE id=$1', [id]);
  if (owner.rowCount === 0) return res.status(404).json({ error: 'Not found' });
  if (owner.rows[0].counselor_id !== cid) return res.status(403).json({ error: 'Not allowed' });
  await pool.query('DELETE FROM books WHERE id=$1', [id]);
  res.json({ ok:true });
}