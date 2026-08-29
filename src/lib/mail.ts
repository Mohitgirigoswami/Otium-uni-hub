import nodemailer from "nodemailer";

/**
 * Configure Nodemailer Transporter specifically for Gmail SMTP using Google App Passwords
 */
export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD, // Must use Google App Password (16 characters)
  },
});

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

/**
 * Send an email asynchronously with safe error handling
 */
export async function sendEmail({
  to,
  subject,
  html,
  from = process.env.EMAIL_USER || "Otium Uni Hub <support@otium.edu>",
}: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
      console.warn(
        "[Nodemailer] EMAIL_USER or EMAIL_APP_PASSWORD not set in .env. Skipping email delivery."
      );
      return { success: false, error: "Email credentials not configured." };
    }

    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });

    console.log(`[Nodemailer] Email sent successfully to ${to}. MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error("[Nodemailer] Error sending email:", error?.message || error);
    return { success: false, error: error?.message || "Failed to send email." };
  }
}
