import pool from '../db/pool.js';

/**
 * Create a notification for a counselor
 * @param {string} counselorId - The ID of the counselor to notify
 * @param {string} message - The notification message
 * @param {string} type - The type of notification (appointment, refund, mentorship, chat, review)
 * @param {string} referenceId - Optional reference ID (appointment ID, refund ID, etc.)
 * @param {string} referenceType - Optional reference type
 * @returns {Promise<Object>} The created notification
 */
export async function createNotification(counselorId, message, type = 'info', referenceId = null, referenceType = null) {
  try {
    const result = await pool.query(
      `INSERT INTO notifications (counselor_id, message, type, reference_id, reference_type, is_read, created_at)
       VALUES ($1, $2, $3, $4, $5, false, NOW())
       RETURNING *`,
      [counselorId, message, type, referenceId, referenceType]
    );
    
    return result.rows[0];
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

/**
 * Create notification when appointment is created or updated
 */
export async function notifyAppointmentChange(counselorId, appointmentId, action) {
  const messages = {
    created: 'New appointment scheduled',
    updated: 'Appointment updated',
    cancelled: 'Appointment cancelled',
    completed: 'Appointment marked as completed'
  };
  
  await createNotification(
    counselorId,
    messages[action] || 'Appointment changed',
    'appointment',
    appointmentId,
    'appointment'
  );
}

/**
 * Create notification for refund request
 */
export async function notifyRefundRequest(counselorId, refundId, clientName) {
  await createNotification(
    counselorId,
    `New refund request from ${clientName || 'client'}`,
    'refund_request',
    refundId,
    'refund'
  );
}

/**
 * Create notification for mentorship program updates
 */
export async function notifyMentorshipUpdate(counselorId, mentorshipId, action) {
  const messages = {
    created: 'You have been added to a new mentorship program',
    updated: 'Mentorship program updated',
    new_applicant: 'New applicant for mentorship program',
    application_approved: 'Mentorship application approved',
    application_rejected: 'Mentorship application rejected'
  };
  
  await createNotification(
    counselorId,
    messages[action] || 'Mentorship program update',
    'mentorship',
    mentorshipId,
    'mentorship'
  );
}

/**
 * Create notification for counselor chat
 */
export async function notifyChatMessage(counselorId, senderName, messagePreview) {
  await createNotification(
    counselorId,
    `New message from ${senderName}: ${messagePreview?.substring(0, 50)}${messagePreview?.length > 50 ? '...' : ''}`,
    'chat',
    null,
    'chat'
  );
}

/**
 * Create notification for new review
 */
export async function notifyNewReview(counselorId, reviewId, clientName, rating) {
  await createNotification(
    counselorId,
    `New ${rating}-star review from ${clientName || 'client'}`,
    'review',
    reviewId,
    'review'
  );
}

/**
 * Get unread notification count for a counselor
 */
export async function getUnreadCount(counselorId) {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) as count
       FROM notifications
       WHERE counselor_id = $1 AND is_read = false`,
      [counselorId]
    );
    
    return parseInt(result.rows[0].count);
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
}

/**
 * Mark all notifications as read for a counselor
 */
export async function markAllAsRead(counselorId) {
  try {
    await pool.query(
      `UPDATE notifications
       SET is_read = true
       WHERE counselor_id = $1 AND is_read = false`,
      [counselorId]
    );
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    throw error;
  }
}
