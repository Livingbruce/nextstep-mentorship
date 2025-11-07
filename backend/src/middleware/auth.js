import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import pool from '../db/pool.js';
dotenv.config();

export async function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });

  const token = auth.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const counselorId = payload.counselorId;
    const r = await pool.query('SELECT id,name,email FROM counselors WHERE id=$1', [counselorId]);
    if (r.rowCount === 0) return res.status(401).json({ error: 'Invalid token (no user)' });

    req.counselor = r.rows[0]; // {id,name,email}
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}