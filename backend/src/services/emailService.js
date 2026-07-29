import nodemailer from 'nodemailer';
import { env, isTest } from '../config/env.js';

let transporter;

// In test runs (and whenever SMTP isn't configured yet) we fall back to
// nodemailer's jsonTransport, which builds the message but never touches the
// network - keeps the test suite fast/offline and avoids crashing local dev
// before EMAIL_* env vars are filled in.
const getTransporter = () => {
  if (transporter) return transporter;

  if (isTest || !env.email.host || !env.email.user || !env.email.pass) {
    transporter = nodemailer.createTransport({ jsonTransport: true });
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: env.email.host,
    port: env.email.port,
    secure: env.email.secure,
    auth: { user: env.email.user, pass: env.email.pass },
  });
  return transporter;
};

export const sendPasswordResetEmail = async ({ to, resetUrl }) => {
  const message = {
    from: env.email.from,
    to,
    subject: 'Reset your SupplyChain Pro password',
    text: `We received a request to reset your password. This link expires in 1 hour:\n\n${resetUrl}\n\nIf you did not request this, you can safely ignore this email.`,
    html: `
      <p>We received a request to reset your password.</p>
      <p><a href="${resetUrl}">Reset your password</a> (this link expires in 1 hour).</p>
      <p>If you did not request this, you can safely ignore this email.</p>
    `,
  };

  try {
    await getTransporter().sendMail(message);
  } catch (err) {
    // Delivery failures shouldn't surface to the caller - forgot-password
    // must stay a generic 200 regardless of whether the email exists or
    // sending succeeded, otherwise the response itself leaks information.
    console.error('Failed to send password reset email:', err.message);
  }
};
