import pool from "../db/pool.js";

/**
 * Generates a unique random alphanumeric appointment code.
 * Starts at 6 characters and increases if too many appointments exist.
 * 
 * @param {number} minLength - Minimum length for the code (default: 6)
 * @returns {Promise<string>} - Unique appointment code
 */
export async function generateUniqueAppointmentCode(minLength = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars: 0, O, I, 1
  let length = minLength;
  const maxAttempts = 100; // Prevent infinite loops
  const maxLength = 10; // Maximum code length to prevent infinite recursion
  
  // Check total appointment count to determine appropriate length
  const countResult = await pool.query(
    'SELECT COUNT(*) as count FROM appointments'
  );
  const totalAppointments = parseInt(countResult.rows[0].count, 10);
  
  // Increase length based on appointment count
  // For 6 chars: ~1.8 billion combinations (32^6)
  // For 7 chars: ~78 billion combinations (32^7)
  // For 8 chars: ~3.3 trillion combinations (32^8)
  if (totalAppointments > 1000000 && length < 9) {
    length = 9;
  } else if (totalAppointments > 100000 && length < 8) {
    length = 8;
  } else if (totalAppointments > 10000 && length < 7) {
    length = 7;
  } else if (length < 6) {
    length = 6;
  }
  
  // Prevent recursion depth issues
  if (length > maxLength) {
    length = maxLength;
  }
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Generate random code
    let code = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      code += chars[randomIndex];
    }
    
    // Check if code already exists
    const result = await pool.query(
      'SELECT id FROM appointments WHERE appointment_code = $1',
      [code]
    );
    
    if (result.rows.length === 0) {
      return code;
    }
    
    // If we've tried many times and still no unique code, increase length
    if (attempt === maxAttempts - 1 && length < maxLength) {
      length++;
      attempt = -1; // Reset counter for new length
      continue;
    }
  }
  
  // Last resort: increase length and try once more (but prevent infinite recursion)
  if (length < maxLength) {
    return generateUniqueAppointmentCode(length + 1);
  }
  
  // If we still can't generate a unique code after all attempts, throw an error
  throw new Error('Failed to generate unique appointment code after maximum attempts');
}

