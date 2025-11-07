import express from 'express';
import pool from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Get recent activity for dashboard
router.get('/', requireAuth, async (req, res) => {
  try {
    const counselorId = req.counselor.id;
    
    // Get recent activities (last 7 days)
    const activitiesQuery = `
      SELECT 
        'activity' as type,
        id,
        title as description,
        activity_date,
        activity_time,
        created_at,
        'Activity' as category
      FROM activities 
      WHERE counselor_id = $1 
        AND activity_date >= CURRENT_DATE - INTERVAL '7 days'
      ORDER BY activity_date DESC, activity_time DESC
      LIMIT 5
    `;
    
    // Get recent appointments (last 7 days)
    const appointmentsQuery = `
      SELECT 
        'appointment' as type,
        a.id,
        CONCAT('Appointment with ', s.name, ' (', s.admission_no, ')') as description,
        a.start_ts as activity_date,
        a.start_ts as activity_time,
        a.created_at,
        CASE 
          WHEN a.status = 'pending' THEN 'Pending Appointment'
          WHEN a.status = 'confirmed' THEN 'Confirmed Appointment'
          WHEN a.status = 'canceled' THEN 'Canceled Appointment'
          ELSE 'Appointment'
        END as category
      FROM appointments a
      JOIN students s ON a.student_id = s.id
      WHERE a.counselor_id = $1 
        AND a.start_ts >= CURRENT_TIMESTAMP - INTERVAL '7 days'
      ORDER BY a.start_ts DESC
      LIMIT 5
    `;
    
    // Get recent announcements (last 7 days)
    const announcementsQuery = `
      SELECT 
        'announcement' as type,
        id,
        CASE 
          WHEN LENGTH(message) > 50 THEN SUBSTRING(message, 1, 50) || '...'
          ELSE message
        END as description,
        created_at as activity_date,
        created_at as activity_time,
        created_at,
        CASE 
          WHEN is_force = true THEN 'Force Announcement'
          ELSE 'Announcement'
        END as category
      FROM announcements 
      WHERE counselor_id = $1 
        AND created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
      ORDER BY created_at DESC
      LIMIT 5
    `;
    
    // Get recent support tickets (last 7 days)
    const supportTicketsQuery = `
      SELECT 
        'support' as type,
        st.id,
        CONCAT('Support ticket: ', st.subject) as description,
        st.created_at as activity_date,
        st.created_at as activity_time,
        st.created_at,
        CASE 
          WHEN st.status = 'open' THEN 'Open Support Ticket'
          WHEN st.status = 'in_progress' THEN 'In Progress Ticket'
          WHEN st.status = 'resolved' THEN 'Resolved Ticket'
          WHEN st.status = 'closed' THEN 'Closed Ticket'
          ELSE 'Support Ticket'
        END as category
      FROM support_tickets st
      WHERE st.assigned_counselor_id = $1 
        AND st.created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
      ORDER BY st.created_at DESC
      LIMIT 5
    `;
    
    // Execute all queries in parallel
    const [activitiesResult, appointmentsResult, announcementsResult, supportTicketsResult] = await Promise.all([
      pool.query(activitiesQuery, [counselorId]),
      pool.query(appointmentsQuery, [counselorId]),
      pool.query(announcementsQuery, [counselorId]),
      pool.query(supportTicketsQuery, [counselorId])
    ]);
    
    // Combine all results
    const allActivities = [
      ...activitiesResult.rows,
      ...appointmentsResult.rows,
      ...announcementsResult.rows,
      ...supportTicketsResult.rows
    ];
    
    // Sort by date/time (most recent first)
    allActivities.sort((a, b) => new Date(b.activity_date || b.activity_time) - new Date(a.activity_date || a.activity_time));
    
    // Take only the 10 most recent activities
    const recentActivities = allActivities.slice(0, 10);
    
    // Format the response
    const formattedActivities = recentActivities.map(activity => ({
      id: activity.id,
      type: activity.type,
      category: activity.category,
      description: activity.description,
      date: activity.activity_date || activity.activity_time,
      time: activity.activity_time,
      created_at: activity.created_at
    }));
    
    res.json({
      success: true,
      activities: formattedActivities,
      total: formattedActivities.length
    });
    
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch recent activity' 
    });
  }
});

// Clear recent activities (delete old activities, appointments, announcements)
router.delete('/clear', requireAuth, async (req, res) => {
  try {
    const counselorId = req.counselor.id;
    const { days = 30 } = req.body; // Default to clear activities older than 30 days
    
    console.log(`Clearing activities older than ${days} days for counselor ${counselorId}`);
    
    // Clear old activities
    const activitiesResult = await pool.query(
      'DELETE FROM activities WHERE counselor_id = $1 AND created_at < CURRENT_TIMESTAMP - INTERVAL $2 days',
      [counselorId, days]
    );
    
    // Clear old announcements
    const announcementsResult = await pool.query(
      'DELETE FROM announcements WHERE counselor_id = $1 AND created_at < CURRENT_TIMESTAMP - INTERVAL $2 days',
      [counselorId, days]
    );
    
    // Clear old appointments (only pending/canceled ones, not confirmed)
    const appointmentsResult = await pool.query(
      'DELETE FROM appointments WHERE counselor_id = $1 AND created_at < CURRENT_TIMESTAMP - INTERVAL $2 days AND status IN ($3, $4)',
      [counselorId, days, 'pending', 'canceled']
    );
    
    const totalCleared = activitiesResult.rowCount + announcementsResult.rowCount + appointmentsResult.rowCount;
    
    res.json({
      success: true,
      message: `Successfully cleared ${totalCleared} old activities`,
      details: {
        activities: activitiesResult.rowCount,
        announcements: announcementsResult.rowCount,
        appointments: appointmentsResult.rowCount,
        daysCleared: days
      }
    });
    
  } catch (error) {
    console.error('Error clearing recent activities:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to clear recent activities' 
    });
  }
});

export default router;
