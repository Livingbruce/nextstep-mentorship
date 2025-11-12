/**
 * Working Hours Validation Utility
 * Implements appointment scheduling
 * 
 * Working Hours: 8:00 AM - 5:00 PM (All days including weekends)
 * No lunch break restrictions
 * Weekends allowed
 */

export class WorkingHoursValidator {
  constructor() {
    this.WORKING_HOURS = {
      START_HOUR: 8,    // 8:00 AM
      END_HOUR: 17,     // 5:00 PM
    };
    
    this.WORKING_DAYS = [0, 1, 2, 3, 4, 5, 6]; // All days (0 = Sunday, 6 = Saturday)
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

    // Get time components in Kenya timezone (Africa/Nairobi, UTC+3)
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Africa/Nairobi",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
      weekday: "short"
    });
    
    const parts = formatter.formatToParts(date);
    const hour = parseInt(parts.find(p => p.type === "hour").value, 10);
    const minute = parseInt(parts.find(p => p.type === "minute").value, 10);
    const weekday = parts.find(p => p.type === "weekday").value;
    const timeInHours = hour + (minute / 60);
    
    // Map weekday to day of week (0 = Sunday)
    const weekdayMap = { "Sun": 0, "Mon": 1, "Tue": 2, "Wed": 3, "Thu": 4, "Fri": 5, "Sat": 6 };
    const dayOfWeek = weekdayMap[weekday];
    
    // Check if it's a working day (all days allowed) in Kenya timezone
    if (!this.WORKING_DAYS.includes(dayOfWeek)) {
      const dayName = this.getDayName(dayOfWeek);
      return { isValid: false, reason: `Appointments are not available on ${dayName}s` };
    }

    // Check if it's before working hours
    if (timeInHours < this.WORKING_HOURS.START_HOUR) {
      return { isValid: false, reason: "Appointments are only available from 8:00 AM onwards" };
    }

    // Check if it's after working hours
    if (timeInHours >= this.WORKING_HOURS.END_HOUR) {
      return { isValid: false, reason: "Appointments are only available until 5:00 PM" };
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

    // Check if both times are on the same day (in Kenya timezone)
    const getKenyaDateString = (date) => {
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "Africa/Nairobi",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      });
      return formatter.format(date);
    };
    
    if (getKenyaDateString(start) !== getKenyaDateString(end)) {
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

    // Check if the appointment duration crosses break times (in Kenya timezone)
    const getKenyaTime = (date) => {
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "Africa/Nairobi",
        hour: "numeric",
        minute: "numeric",
        hour12: false
      });
      const parts = formatter.formatToParts(date);
      const hour = parseInt(parts.find(p => p.type === "hour").value, 10);
      const minute = parseInt(parts.find(p => p.type === "minute").value, 10);
      return hour + (minute / 60);
    };
    
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
      totalWorkingHours: 9
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
