import pool from '../db/pool.js';

// List: public
export async function listActivities(_, res) {
  const r = await pool.query('SELECT a.*, c.name as counselor_name FROM activities a LEFT JOIN counselors c ON a.counselor_id=c.id ORDER BY start_ts ASC');
  res.json(r.rows);
}

// Create by logged-in counselor
export async function createActivity(req, res) {
  const counselorId = req.counselor.id;
  const { title, description, start_ts, end_ts } = req.body;
  if (!title || !start_ts) return res.status(400).json({ error: 'title and start_ts required' });

  const r = await pool.query(
    'INSERT INTO activities (counselor_id, title, description, start_ts, end_ts) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [counselorId, title, description || null, start_ts, end_ts || null]
  );
  res.status(201).json(r.rows[0]);
}

export async function updateActivity(req, res) {
  const counselorId = req.counselor.id;
  const id = parseInt(req.params.id,10);
  const owner = await pool.query('SELECT counselor_id FROM activities WHERE id=$1', [id]);
  if (owner.rowCount === 0) return res.status(404).json({ error: 'Not found' });
  if (owner.rows[0].counselor_id !== counselorId) return res.status(403).json({ error: 'Not allowed' });

  const { title, description, start_ts, end_ts } = req.body;
  const r = await pool.query(
    'UPDATE activities SET title=$1, description=$2, start_ts=$3, end_ts=$4, updated_at=now() WHERE id=$5 RETURNING *',
    [title, description, start_ts, end_ts, id]
  );
  res.json(r.rows[0]);
}

export async function deleteActivity(req, res) {
  const counselorId = req.counselor.id;
  const id = parseInt(req.params.id,10);
  const owner = await pool.query('SELECT counselor_id FROM activities WHERE id=$1', [id]);
  if (owner.rowCount === 0) return res.status(404).json({ error: 'Not found' });
  if (owner.rows[0].counselor_id !== counselorId) return res.status(403).json({ error: 'Not allowed' });

  await pool.query('DELETE FROM activities WHERE id=$1', [id]);
  res.json({ ok: true });
}