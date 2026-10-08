import nodemailer from "nodemailer";
import { env } from "../../configs/env.js";

export const transport = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,
  requireTLS: !env.SMTP_SECURE,
  auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  connectionTimeout: 10000,
  socketTimeout: 20000,
});

export async function sendTokenEmail(
  email: string,
  token: string,
  purpose: "verify" | "reset",
) {
  const path = purpose === "verify" ? "/verify-email" : "/reset-password";
  const url = new URL(path, env.CLIENT_ORIGIN);
  url.searchParams.set("token", token);
  await transport.sendMail({
    from: env.SMTP_FROM,
    to: email,
    subject:
      purpose === "verify" ? "Verify your account" : "Reset your password",
    text: `${purpose === "verify" ? "Verify your email address" : "Reset your password"} using this link:\n\n${url.toString()}\n\nThis link expires ${purpose === "verify" ? "in 24 hours" : "in 30 minutes"} and can be used once. If you did not request this, ignore the message.`,
  });
}

export async function sendReport(
  email: string,
  projectName: string,
  buffer: Buffer,
) {
  await transport.sendMail({
    from: env.SMTP_FROM,
    to: email,
    subject: `Facility Condition Assessment: ${projectName.replace(/[\r\n]/g, " ")}`,
    text: `Please find the Facility Condition Assessment report for ${projectName} attached. Pricing is indicative and subject to QS verification.`,
    attachments: [
      {
        filename: "Facility-Condition-Assessment.pdf",
        content: buffer,
        contentType: "application/pdf",
      },
    ],
  });
}
