import nodemailer from 'nodemailer';
import crypto from 'crypto';

class EmailService {
  constructor() {
    // Configure transporter (using Gmail SMTP for now)
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || 'nextstepmentorship@gmail.com',
        pass: process.env.EMAIL_PASS || 'your-app-password'
      }
    });

    // For development, we'll use a fake transporter that logs emails
    if (process.env.NODE_ENV !== 'production') {
      this.transporter = {
        sendMail: async (options) => {
          console.log('\n📧 EMAIL CONFIRMATION SENT:');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log(`From: NextStep Mentorship <nextstepmentorship@gmail.com>`);
          console.log(`To: ${options.to}`);
          console.log(`Subject: ${options.subject}`);
          console.log('\n📄 Email Content:');
          console.log(options.html || options.text);
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
          
          return { messageId: crypto.randomBytes(16).toString('hex') };
        }
      };
    }
  }

  generateEmailVerificationHTML(userName, verificationToken) {
    const confirmationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to NextStep Mentorship</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: #333;
                margin: 0;
                padding: 0;
                background-color: #f8f9fa;
            }
            .container {
                max-width: 600px;
                margin: 20px auto;
                background: white;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 4px 16px rgba(0,0,0,0.1);
            }
            .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 40px 30px;
                text-align: center;
            }
            .logo {
                width: 60px;
                height: 60px;
                background: rgba(255,255,255,0.2);
                border-radius: 12px;
                margin: 0 auto 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
            }
            .content {
                padding: 40px 30px;
            }
            .title {
                font-size: 24px;
                font-weight: 600;
                margin-bottom: 16px;
                color: #2c3e50;
            }
            .subtitle {
                font-size: 28px;
                font-weight: 700;
                margin-bottom: 20px;
                color: #2c3e50;
            }
            .message {
                font-size: 16px;
                color: #555;
                margin-bottom: 32px;
                line-height: 1.6;
            }
            .cta-button {
                display: inline-block;
                background: linear-gradient(45deg, #667eea, #764ba2);
                color: white;
                padding: 16px 32px;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
                font-size: 16px;
                margin: 20px 0;
            }
            .footer {
                background: #2c3e50;
                color: white;
                padding: 30px;
                text-align: center;
            }
            .social-links {
                margin: 20px 0;
            }
            .social-links a {
                color: white;
                text-decoration: none;
                margin: 0 12px;
                font-size: 18px;
            }
            .copyright {
                font-size: 12px;
                opacity: 0.7;
                margin-top: 16px;
            }
            .security-note {
                font-size: 12px;
                color: #999;
                margin-top: 24px;
                padding-top: 16px;
                border-top: 1px solid #eee;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🚀</div>
                <h1 style="margin: 0; font-size: 28px; font-weight: 600;">NextStep Mentorship</h1>
            </div>
            
            <div class="content">
                <h2 class="subtitle">Welcome to NextStep</h2>
                
                <p class="title">Thank you for signing up!</p>
                
                <p class="message">
                    You're one step away from beginning your mental wellness journey with NextStep, 
                    where mental health experts work together to support your wellbeing.
                </p>
                
                <p class="message">
                    Please confirm your email address to activate your account:
                </p>
                
                <div style="text-align: center;">
                    <a href="${confirmationUrl}" class="cta-button">
                        Confirm My Account
                    </a>
                </div>
                
                <p class="security-note">
                    If you didn't create an account with NextStep, you can safely ignore this email.
                </p>
            </div>
            
            <div class="footer">
                <div class="social-links">
                    <a href="https://facebook.com/nextstepmentorship">📘 Facebook</a>
                    <a href="https://twitter.com/nextstepmentorship">🐦 X</a>
                    <a href="https://linkedin.com/company/nextstepmentorship">💼 LinkedIn</a>
                    <a href="https://instagram.com/nextstepmentorship">📷 Instagram</a>
                </div>
                
                <div class="copyright">
                    © 2025 NextStep Mentorship. All rights reserved.
                </div>
                
                <div style="font-size: 12px; opacity: 0.7; margin-top: 8px;">
                    Your privacy and security are important to us.
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  async sendEmailVerification(email, firstName, verificationToken) {
    const mailOptions = {
      from: '"NextStep Mentorship" <nextstepmentorship@gmail.com>',
      to: email,
      subject: 'Welcome to NextStep - Confirm Your Account',
      html: this.generateEmailVerificationHTML(firstName, verificationToken),
      text: `Welcome to NextStep Mentorship!\n\nThank you for signing up, ${firstName}!\n\nPlease confirm your email address to activate your account by clicking this link:\n${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}\n\nIf you didn't create an account with NextStep, you can safely ignore this email.\n\nBest regards,\nThe NextStep Mentorship Team`
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email sent successfully:', result.messageId);
      return { success: true, token: verificationToken };
    } catch (error) {
      console.error('❌ Email sending failed:', error);
      throw new Error('Failed to send verification email');
    }
  }
}

export default new EmailService();
