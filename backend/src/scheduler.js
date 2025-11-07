import cron from "node-cron";
import pool from "./db/pool.js";

export function scheduleReminders(bot) {

  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
      const oneDayLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const result = await pool.query(
        `SELECT a.id, s.name, s.phone, a.start_ts, c.name AS counselor_name
         FROM appointments a
         JOIN students s ON s.id=a.student_id
         JOIN counselors c ON c.id=a.counselor_id
         WHERE a.start_ts BETWEEN $1 AND $2`,
        [now, oneDayLater]
      );

      result.rows.forEach((appt) => {
        const when = new Date(appt.start_ts);
        const minutesLeft = Math.round((when - now) / 60000);

        if (minutesLeft === 60) {
          bot.telegram.sendMessage(
            appt.phone,
            `Reminder: Your session with ${appt.counselor_name} is in 1 hour!`
          );
        }
        if (minutesLeft === 1440) {
          bot.telegram.sendMessage(
            appt.phone,
            `Reminder: You have a counseling session with ${appt.counselor_name} tomorrow at ${when.toLocaleString()}`
          );
        }
      });
    } catch (err) {
      console.error("Reminder scheduler error:", err);
    }
  });
}