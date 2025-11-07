import express from 'express';
import pool from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Public route to get all activities (for bot)
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT a.id, a.title, a.description, 
                    a.activity_date::text as activity_date, 
                    a.activity_time::text as activity_time,
                    a.counselor_id, a.created_at, c.name as counselor_name 
             FROM activities a 
             LEFT JOIN counselors c ON a.counselor_id = c.id 
             ORDER BY a.activity_date ASC, a.activity_time ASC`
        );
        
        console.log("Activities query result:", result.rows);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching activities:', error);
        res.status(500).json({ error: 'Failed to fetch activities' });
    }
});

// Protected routes for counselors
router.post('/', requireAuth, async (req, res) => {
    try {
        const { title, description, activity_date, activity_time } = req.body;
        
        console.log('Creating activity with data:', { title, description, activity_date, activity_time });
        console.log('Counselor ID:', req.counselor?.id);
        
        if (!title || !activity_date || !activity_time) {
            return res.status(400).json({ error: 'Title, date, and time are required' });
        }

        if (!req.counselor?.id) {
            return res.status(401).json({ error: 'Counselor not found' });
        }

        const result = await pool.query(
            `INSERT INTO activities (title, description, activity_date, activity_time, counselor_id) 
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [title, description || null, activity_date, activity_time, req.counselor.id]
        );

        console.log('Activity created successfully:', result.rows[0]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creating activity:', err);
        res.status(500).json({ error: 'Failed to create activity' });
    }
});

router.put('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, activity_date, activity_time } = req.body;
        
        console.log('Updating activity:', { id, title, description, activity_date, activity_time });
        console.log('Counselor ID:', req.counselor?.id);
        
        if (!req.counselor?.id) {
            return res.status(401).json({ error: 'Counselor not found' });
        }
        
        // Check if activity exists and belongs to counselor
        const owner = await pool.query('SELECT counselor_id FROM activities WHERE id = $1', [id]);
        if (owner.rowCount === 0) {
            return res.status(404).json({ error: 'Activity not found' });
        }
        if (owner.rows[0].counselor_id !== req.counselor.id) {
            return res.status(403).json({ error: 'Not allowed' });
        }

        const result = await pool.query(
            `UPDATE activities 
             SET title = $1, description = $2, activity_date = $3, activity_time = $4
             WHERE id = $5 
             RETURNING *`,
            [title, description || null, activity_date, activity_time, id]
        );

        console.log('Activity updated successfully:', result.rows[0]);
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating activity:', err);
        res.status(500).json({ error: 'Failed to update activity' });
    }
});

router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log('Deleting activity:', { id });
        console.log('Counselor ID:', req.counselor?.id);
        
        if (!req.counselor?.id) {
            return res.status(401).json({ error: 'Counselor not found' });
        }
        
        // Check if activity exists and belongs to counselor
        const owner = await pool.query('SELECT counselor_id FROM activities WHERE id = $1', [id]);
        if (owner.rowCount === 0) {
            return res.status(404).json({ error: 'Activity not found' });
        }
        if (owner.rows[0].counselor_id !== req.counselor.id) {
            return res.status(403).json({ error: 'Not allowed' });
        }

        await pool.query('DELETE FROM activities WHERE id = $1', [id]);
        console.log('Activity deleted successfully');
        res.json({ message: 'Activity deleted successfully' });
    } catch (err) {
        console.error('Error deleting activity:', err);
        res.status(500).json({ error: 'Failed to delete activity' });
    }
});

export default router;