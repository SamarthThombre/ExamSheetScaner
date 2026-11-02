const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT, 10) || 587,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * Send an email notification safely (never throws)
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {string} [options.text] - Plaintext fallback
 */
const sendEmail = async ({ to, subject, html, text }) => {
  // Only send if EMAIL_USER is configured (skip in dev if not set)
  if (!process.env.EMAIL_USER) {
    console.log(`[EmailService] Dev mode (EMAIL_USER not set) - Skipped sending to "${to}": "${subject}"`);
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'ExamScanWeb <no-reply@examscanweb.local>',
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]+>/g, '')
    });
    console.log(`[EmailService] Notification sent to ${to} (MessageId: ${info.messageId})`);
  } catch (err) {
    console.error(`[EmailService Error] Failed to send email to ${to}:`, err.message);
  }
};

module.exports = { sendEmail };
