import cron from "node-cron";
import pool from "./db/pool.js";
import emailService from "./services/emailService.js";

export function scheduleReminders(bot) {

  // Telegram reminders for bot bookings
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
         WHERE a.start_ts BETWEEN $1 AND $2
         AND a.telegram_user_id IS NOT NULL`,
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

  // Email reminders for web bookings
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
      const oneDayLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // Get appointments that need reminders (web bookings without telegram_user_id)
      const result = await pool.query(
        `SELECT a.id, a.start_ts, a.appointment_code, c.full_name as client_name, cif.email as client_email, 
                cn.name AS counselor_name, a.status, a.payment_status
         FROM appointments a
         JOIN clients c ON c.id=a.client_id
         LEFT JOIN client_intake_forms cif ON cif.appointment_id=a.id
         JOIN counselors cn ON cn.id=a.counselor_id
         WHERE a.start_ts BETWEEN $1 AND $2
         AND a.telegram_user_id IS NULL
         AND a.status != 'cancelled'
         AND cif.email IS NOT NULL`,
        [now, oneDayLater]
      );

      for (const appt of result.rows) {
        if (!appt.client_email) continue;

        const when = new Date(appt.start_ts);
        const minutesLeft = Math.round((when - now) / 60000);
        const formattedDate = when.toLocaleString('en-KE', {
          timeZone: 'Africa/Nairobi',
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });

        // 1 hour before reminder
        if (minutesLeft === 60) {
          try {
            await emailService.transporter.sendMail({
              from: '"NextStep Therapy Services" <nextstepmentorship@gmail.com>',
              to: appt.client_email,
              subject: `Appointment Reminder - ${appt.appointment_code}`,
              html: `
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                    .info-box { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #667eea; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <h1>🔔 Appointment Reminder</h1>
                      <p>Your appointment is in 1 hour!</p>
                    </div>
                    <div class="content">
                      <p>Dear ${appt.client_name},</p>
                      <p>This is a reminder that your appointment is in 1 hour.</p>
                      <div class="info-box">
                        <p><strong>Appointment Code:</strong> ${appt.appointment_code}</p>
                        <p><strong>Date & Time:</strong> ${formattedDate}</p>
                        <p><strong>Counselor:</strong> ${appt.counselor_name}</p>
                      </div>
                      <p>Please be ready for your session!</p>
                    </div>
                  </div>
                </body>
                </html>
              `,
              text: `Appointment Reminder - ${appt.appointment_code}\n\nDear ${appt.client_name},\n\nThis is a reminder that your appointment is in 1 hour.\n\nAppointment Code: ${appt.appointment_code}\nDate & Time: ${formattedDate}\nCounselor: ${appt.counselor_name}\n\nPlease be ready for your session!`
            });
            console.log(`✅ 1-hour reminder email sent to ${appt.client_email} for appointment ${appt.appointment_code}`);
          } catch (err) {
            console.error(`Error sending 1-hour reminder email:`, err);
          }
        }

        // 1 day before reminder
        if (minutesLeft === 1440) {
          try {
            await emailService.transporter.sendMail({
              from: '"NextStep Therapy Services" <nextstepmentorship@gmail.com>',
              to: appt.client_email,
              subject: `Appointment Reminder - ${appt.appointment_code}`,
              html: `
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                    .info-box { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #667eea; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <h1>🔔 Appointment Reminder</h1>
                      <p>Your appointment is tomorrow!</p>
                    </div>
                    <div class="content">
                      <p>Dear ${appt.client_name},</p>
                      <p>This is a reminder that your appointment is tomorrow.</p>
                      <div class="info-box">
                        <p><strong>Appointment Code:</strong> ${appt.appointment_code}</p>
                        <p><strong>Date & Time:</strong> ${formattedDate}</p>
                        <p><strong>Counselor:</strong> ${appt.counselor_name}</p>
                      </div>
                      <p>Please be on time!</p>
                    </div>
                  </div>
                </body>
                </html>
              `,
              text: `Appointment Reminder - ${appt.appointment_code}\n\nDear ${appt.client_name},\n\nThis is a reminder that your appointment is tomorrow.\n\nAppointment Code: ${appt.appointment_code}\nDate & Time: ${formattedDate}\nCounselor: ${appt.counselor_name}\n\nPlease be on time!`
            });
            console.log(`✅ 1-day reminder email sent to ${appt.client_email} for appointment ${appt.appointment_code}`);
          } catch (err) {
            console.error(`Error sending 1-day reminder email:`, err);
          }
        }
      }
    } catch (err) {
      console.error("Email reminder scheduler error:", err);
    }
  });

  // Payment reminder for unpaid appointments (24 hours after booking)
  cron.schedule("0 9 * * *", async () => {
    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

      // Get unpaid appointments from 24-48 hours ago
      const result = await pool.query(
        `SELECT a.id, a.appointment_code, a.created_at, c.full_name as client_name, 
                cif.email as client_email, cn.name AS counselor_name, a.payment_method
         FROM appointments a
         JOIN clients c ON c.id=a.client_id
         LEFT JOIN client_intake_forms cif ON cif.appointment_id=a.id
         JOIN counselors cn ON cn.id=a.counselor_id
         WHERE a.created_at BETWEEN $1 AND $2
         AND a.payment_status = 'pending'
         AND a.status != 'cancelled'
         AND a.telegram_user_id IS NULL
         AND cif.email IS NOT NULL`,
        [twoDaysAgo, oneDayAgo]
      );

      for (const appt of result.rows) {
        if (!appt.client_email) continue;

        try {
          await emailService.transporter.sendMail({
            from: '"NextStep Therapy Services" <nextstepmentorship@gmail.com>',
            to: appt.client_email,
            subject: `Payment Reminder - Appointment ${appt.appointment_code}`,
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                  .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                  .info-box { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #667eea; }
                  .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0; border-radius: 8px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>💳 Payment Reminder</h1>
                    <p>Complete your payment to confirm your appointment</p>
                  </div>
                  <div class="content">
                    <p>Dear ${appt.client_name},</p>
                    <p>This is a reminder that payment is still pending for your appointment.</p>
                    <div class="info-box">
                      <p><strong>Appointment Code:</strong> ${appt.appointment_code}</p>
                      <p><strong>Counselor:</strong> ${appt.counselor_name}</p>
                      <p><strong>Payment Method:</strong> ${appt.payment_method}</p>
                    </div>
                    <div class="warning">
                      <p><strong>⚠️ Important:</strong> Your appointment will be confirmed once payment is received. Please complete payment as soon as possible.</p>
                    </div>
                    <p>If you have already made payment, please contact us at nextstepmentorship@gmail.com</p>
                  </div>
                </div>
              </body>
              </html>
            `,
            text: `Payment Reminder - Appointment ${appt.appointment_code}\n\nDear ${appt.client_name},\n\nThis is a reminder that payment is still pending for your appointment.\n\nAppointment Code: ${appt.appointment_code}\nCounselor: ${appt.counselor_name}\nPayment Method: ${appt.payment_method}\n\n⚠️ Important: Your appointment will be confirmed once payment is received. Please complete payment as soon as possible.\n\nIf you have already made payment, please contact us at nextstepmentorship@gmail.com`
          });
          console.log(`✅ Payment reminder email sent to ${appt.client_email} for appointment ${appt.appointment_code}`);
        } catch (err) {
          console.error(`Error sending payment reminder email:`, err);
        }
      }
    } catch (err) {
      console.error("Payment reminder scheduler error:", err);
    }
  });
}