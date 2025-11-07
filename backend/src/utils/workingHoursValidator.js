/**
 * Working Hours Validation Utility
 * Implements Kenya Labor Standards for appointment scheduling
 * 
 * Working Hours: 8:00 AM - 5:00 PM (Monday to Friday)
 * Lunch Break: 12:00 PM - 1:00 PM (1 hour)
 * Weekends: No appointments allowed
 */

export class WorkingHoursValidator {
  constructor() {
    this.WORKING_HOURS = {
      START_HOUR: 8,    // 8:00 AM
      END_HOUR: 17,     // 5:00 PM
      LUNCH_START: 12,  // 12:00 PM
      LUNCH_END: 13     // 1:00 PM
    };
    
    this.WORKING_DAYS = [1, 2, 3, 4, 5]; // Monday to Friday (0 = Sunday)
  }

  /**
   * Check if a given date and time is within working hours
   * @param {Date|string} dateTime - The date and time to check
   * @returns {Object} - { isValid: boolean, reason: string }
   */
  isValidWorkingTime(dateTime) {
    const date = new Date(dateTime);
    
    // Check if it's a valid date
    if (isNaN(date.getTime())) {
      return { isValid: false, reason: "Invalid date format" };
    }

    // Check if it's a working day (Monday to Friday)
    const dayOfWeek = date.getDay();
    if (!this.WORKING_DAYS.includes(dayOfWeek)) {
      const dayName = this.getDayName(dayOfWeek);
      return { isValid: false, reason: `Appointments are not available on ${dayName}s` };
    }

    // Get time components
    const hour = date.getHours();
    const minute = date.getMinutes();
    const timeInHours = hour + (minute / 60);

    // Check if it's before working hours
    if (timeInHours < this.WORKING_HOURS.START_HOUR) {
      return { isValid: false, reason: "Appointments are only available from 8:00 AM onwards" };
    }

    // Check if it's after working hours
    if (timeInHours >= this.WORKING_HOURS.END_HOUR) {
      return { isValid: false, reason: "Appointments are only available until 5:00 PM" };
    }

    // Check if it's during lunch break
    if (timeInHours >= this.WORKING_HOURS.LUNCH_START && timeInHours < this.WORKING_HOURS.LUNCH_END) {
      return { isValid: false, reason: "Appointments are not available during lunch break (12:00 PM - 1:00 PM)" };
    }

    return { isValid: true, reason: "Valid working time" };
  }

  /**
   * Check if a time range is valid for appointments
   * @param {Date|string} startTime - Start time
   * @param {Date|string} endTime - End time
   * @returns {Object} - { isValid: boolean, reason: string }
   */
  isValidAppointmentRange(startTime, endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);

    // Check if end time is after start time
    if (end <= start) {
      return { isValid: false, reason: "End time must be after start time" };
    }

    // Check if both times are on the same day
    if (start.toDateString() !== end.toDateString()) {
      return { isValid: false, reason: "Appointments cannot span multiple days" };
    }

    // Check start time
    const startValidation = this.isValidWorkingTime(start);
    if (!startValidation.isValid) {
      return startValidation;
    }

    // Check end time
    const endValidation = this.isValidWorkingTime(end);
    if (!endValidation.isValid) {
      return endValidation;
    }

    // Check if the appointment duration crosses break times
    const startHour = start.getHours() + (start.getMinutes() / 60);
    const endHour = end.getHours() + (end.getMinutes() / 60);

    // Check if appointment crosses lunch break
    if (startHour < this.WORKING_HOURS.LUNCH_START && endHour > this.WORKING_HOURS.LUNCH_START) {
      return { isValid: false, reason: "Appointments cannot be scheduled across lunch break (12:00 PM - 1:00 PM)" };
    }

    return { isValid: true, reason: "Valid appointment time range" };
  }

  /**
   * Get available time slots for a given date
   * @param {Date|string} date - The date to get slots for
   * @param {number} slotDurationMinutes - Duration of each slot in minutes (default: 30)
   * @returns {Array} - Array of available time slots
   */
  getAvailableSlots(date, slotDurationMinutes = 30) {
    const targetDate = new Date(date);
    const slots = [];

    // Check if it's a working day
    const dayOfWeek = targetDate.getDay();
    if (!this.WORKING_DAYS.includes(dayOfWeek)) {
      return slots;
    }

    const slotDurationHours = slotDurationMinutes / 60;
    let currentHour = this.WORKING_HOURS.START_HOUR;

    while (currentHour + slotDurationHours <= this.WORKING_HOURS.END_HOUR) {
      // Skip lunch break
      if (currentHour >= this.WORKING_HOURS.LUNCH_START && currentHour < this.WORKING_HOURS.LUNCH_END) {
        currentHour = this.WORKING_HOURS.LUNCH_END;
        continue;
      }

      // Create slot
      const slotStart = new Date(targetDate);
      slotStart.setHours(Math.floor(currentHour), (currentHour % 1) * 60, 0, 0);

      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + slotDurationMinutes);

      slots.push({
        start: slotStart,
        end: slotEnd,
        startTime: this.formatTime(slotStart),
        endTime: this.formatTime(slotEnd)
      });

      currentHour += slotDurationHours;
    }

    return slots;
  }

  /**
   * Get working hours information
   * @returns {Object} - Working hours details
   */
  getWorkingHoursInfo() {
    return {
      workingDays: this.WORKING_DAYS.map(day => this.getDayName(day)),
      workingHours: "8:00 AM - 5:00 PM",
      lunchBreak: "12:00 PM - 1:00 PM",
      totalWorkingHours: 8,
      breakHours: 1
    };
  }

  /**
   * Helper function to get day name
   * @param {number} dayOfWeek - Day of week (0-6)
   * @returns {string} - Day name
   */
  getDayName(dayOfWeek) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayOfWeek];
  }

  /**
   * Helper function to format time
   * @param {Date} date - Date object
   * @returns {string} - Formatted time string
   */
  formatTime(date) {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  /**
   * Check if a counselor is absent on a given date
   * @param {Date|string} date - The date to check
   * @param {Array} absenceDays - Array of absence days from database
   * @returns {boolean} - True if counselor is absent
   */
  isCounselorAbsent(date, absenceDays) {
    const targetDate = new Date(date);
    const targetDateString = targetDate.toISOString().split('T')[0];
    
    return absenceDays.some(absence => {
      const absenceDate = new Date(absence.date);
      const absenceDateString = absenceDate.toISOString().split('T')[0];
      return absenceDateString === targetDateString;
    });
  }
}

// Export singleton instance
export const workingHoursValidator = new WorkingHoursValidator();

// Export for use in other modules
export default workingHoursValidator;
