const nodemailer = require('nodemailer');

// Gmail SMTP with an App Password — chosen over a transactional-email
// service (Resend/SendGrid) specifically to avoid adding a new third-party
// account/API key: the app's own operator already has a Gmail address, and
// an App Password is a few clicks in existing account settings, not a new
// signup. Only ever used for this one admin-notification purpose (new
// mosque submissions, reports) — never anything user-facing.
let transporter = null;
function getTransporter() {
  if (!transporter && process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    });
  }
  return transporter;
}

// Best-effort — a failed or unconfigured notification email should never
// break the API request that triggered it (a mosque submission/report
// still has to succeed for the user even if the admin doesn't get pinged).
async function notifyAdmin(subject, text) {
  const to = process.env.ADMIN_NOTIFY_EMAIL || process.env.GMAIL_USER;
  const mailer = getTransporter();
  if (!mailer || !to) return;
  try {
    await mailer.sendMail({ from: process.env.GMAIL_USER, to, subject, text });
  } catch (err) {
    console.error('[mailer] failed to send admin notification:', err.message);
  }
}

module.exports = { notifyAdmin };
