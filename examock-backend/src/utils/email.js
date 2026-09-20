import nodemailer from "nodemailer";
import config from "../config/config.js";

// Gmail SMTP + App Password — free, no external provider, no domain to verify.
// Setup: enable 2FA on the Gmail account, then create an App Password at
// https://myaccount.google.com/apppasswords and put it in GMAIL_APP_PASSWORD.
let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true, // implicit TLS
      auth: {
        user: config.GMAIL_USER,
        pass: config.GMAIL_APP_PASSWORD,
      },
    });
  }
  return transporter;
}

/**
 * Email OTP delivery.
 *
 * - `OTP_DELIVERY="email"` → real delivery via Gmail SMTP (nodemailer).
 * - otherwise (default "console") → the OTP is printed to the server log so
 *   local dev / CI can exercise the full flow without credentials. Same
 *   pattern as the SMS console fallback in utils/sms.js.
 */
export async function sendEmailOtp(email, otp) {
  if (config.OTP_DELIVERY !== "email") {
    console.log(`\n📧 [DEV] Email OTP for ${email}: ${otp}\n`);
    return { success: true, message: "OTP logged to console (dev mode)" };
  }

  try {
    await getTransporter().sendMail({
      from: `"Examock" <${config.GMAIL_USER}>`,
      to: email,
      subject: "Your Examock verification code",
      text: `Your Examock verification code is ${otp}. It expires in 10 minutes.`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
          <h2 style="margin:0 0 8px;color:#111827">Verify your email</h2>
          <p style="color:#4b5563;font-size:14px;line-height:1.6">
            Use the 6-digit code below to complete your Examock sign-up.
            It expires in 10 minutes.
          </p>
          <div style="font-size:32px;font-weight:700;letter-spacing:8px;color:#2563eb;padding:16px 0">
            ${otp}
          </div>
          <p style="color:#9ca3af;font-size:12px;margin:0">
            If you didn't request this, you can safely ignore this email.
          </p>
        </div>
      `,
    });
    return { success: true, message: "OTP emailed successfully" };
  } catch (err) {
    console.error("[Email OTP] Error:", err?.response?.data ?? err.message);
    return { success: false, message: "Failed to send OTP email" };
  }
}