import { betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';
import { pool } from '../../../packages/database/index';
import nodemailer from 'nodemailer';
import { trustedOrigins } from './origins';
async function sendMail(to: string, url: string, subject: string) {
  if (!process.env.SMTP_HOST) throw new Error('SMTP is not configured.');
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_PORT === '465',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
  await transport.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    text: `${subject}\n\n${url}\n\nIf you did not request this, ignore this email.`,
  });
}
export const auth = betterAuth({
  database: pool,
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
    requireEmailVerification: process.env.REQUIRE_EMAIL_VERIFICATION === 'true',
    sendResetPassword: async ({ user, url }) =>
      sendMail(user.email, url, 'Reset your SIGNAL password'),
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) =>
      sendMail(user.email, url, 'Verify your SIGNAL email'),
  },
  user: {
    additionalFields: { role: { type: 'string', defaultValue: 'user', input: false } },
    deleteUser: { enabled: true },
  },
  session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 12 },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 30,
    storage: 'database',
    customRules: { '/get-session': { window: 60, max: 300 } },
  },
  plugins: [nextCookies()],
});
