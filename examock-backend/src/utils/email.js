import nodemailer from "nodemailer";
import config from "../config/config.js";
import { OTP_TTL_MINUTES } from "./otp.js";

// Gmail SMTP + App Password — free, no external provider, no domain to verify.
// Setup: enable 2FA on the Gmail account, then create an App Password at
// https://myaccount.google.com/apppasswords and put it in GMAIL_APP_PASSWORD.
//
// Every timeout below is deliberate. Without them, a host that blocks outbound
// SMTP leaves sendMail() pending until the client's proxy gives up, so the user
// sees a spinner that never resolves instead of an error they can act on.
const SMTP_TIMEOUTS = {
  connectionTimeout: 10_000, // TCP connect + TLS handshake
  greetingTimeout: 10_000, // server banner after connecting
  socketTimeout: 20_000, // stall mid-conversation
};

// 587 is only ever tried as a fallback, and only with STARTTLS enforced — a
// silent downgrade to plaintext must never be possible.
const FALLBACK_PORT = 587;

let transporter = null;
let verified = false;

function buildTransport(port) {
  return nodemailer.createTransport({
    host: config.SMTP_HOST,
    port,
    secure: port === 465, // implicit TLS
    requireTLS: port === FALLBACK_PORT, // STARTTLS
    ...SMTP_TIMEOUTS,
    auth: {
      user: config.GMAIL_USER,
      pass: config.GMAIL_APP_PASSWORD,
    },
  });
}

// Returns a connected, authenticated transporter, or throws. The handshake is
// done once and cached, so a bad app password or a blocked port is reported on
// the first send instead of silently degrading on every one.
async function getTransporter() {
  if (!transporter) {
    transporter = buildTransport(config.SMTP_PORT);
  }

  if (!verified) {
    try {
      await transporter.verify();
    } catch (err) {
      // 465 is blocked outright on a lot of hosts and cloud networks. Retry
      // once on 587 before declaring the channel dead.
      if (config.SMTP_PORT !== 465) throw err;

      console.warn(
        `[Email OTP] ${config.SMTP_HOST}:465 unavailable (${err.code ?? err.message}) — retrying on ${FALLBACK_PORT} with STARTTLS`,
      );
      transporter = buildTransport(FALLBACK_PORT);
      await transporter.verify(); // rethrows with the 587 error if that fails too
    }
    verified = true;
    console.log(`[Email OTP] SMTP ready: ${config.SMTP_HOST}:${transporter.options.port} as ${config.GMAIL_USER}`);
  }

  return transporter;
}

// Turns an SMTP failure into something actionable in the logs. Without this
// the message is just "Failed to send OTP email" and the cause is invisible.
//
// Matched as substrings rather than on err.code alone: nodemailer reports its
// own wrapper code (ESOCKET) for most transport failures, and the useful
// syscall-level cause (ECONNREFUSED / ETIMEDOUT) only appears in the message.
// Keying off err.code alone meant the single most common production failure —
// a host that blocks outbound SMTP — logged with no hint at all.
const SMTP_HINTS = [
  ["535", "Gmail rejected the credentials — regenerate GMAIL_APP_PASSWORD (2FA must be on, and a normal account password will not work)"],
  ["534", "Gmail rejected the sender — GMAIL_USER must be the account the app password belongs to"],
  ["421", "Gmail rate limit / too many recipients from this account"],
  ["450", "Gmail rate limit — too many messages sent recently"],
  ["ECONNREFUSED", "nothing is listening on that SMTP port — try SMTP_PORT=587 in .env"],
  ["ETIMEDOUT", "outbound SMTP blocked or filtered on this host — try SMTP_PORT=587 in .env"],
  ["EAUTH", "authentication rejected — check GMAIL_USER / GMAIL_APP_PASSWORD"],
  ["ESOCKET", "transport-level failure — see the detail after this line"],
];

function describeSmtpError(err) {
  const code = err?.code ?? err?.responseCode ?? "UNKNOWN";
  const haystack = `${err?.message ?? ""} ${err?.response ?? ""}`.toUpperCase();
  const hint = SMTP_HINTS.find(([needle]) => haystack.includes(needle))?.[1];
  return `code=${code} command=${err?.command ?? "-"} ${hint ?? err?.message ?? ""}`.trim();
}

/**
 * Email OTP delivery.
 *
 * - `OTP_DELIVERY="email"` → real delivery via Gmail SMTP (nodemailer). This is
 *   the only channel reachable in production; config.js refuses to boot
 *   otherwise, so the console branch below cannot silently swallow a real send.
 * - `OTP_DELIVERY="console"` → the OTP is printed to the server log so local dev
 *   and CI can exercise the full flow without credentials. Same pattern as the
 *   SMS console fallback in utils/sms.js.
 */
export async function sendEmailOtp(email, otp) {
  if (config.OTP_DELIVERY !== "email") {
    console.log(`\n📧 [DEV] Email OTP for ${email}: ${otp}\n`);
    return { success: true, message: "OTP logged to console (dev mode)" };
  }

  try {
    const info = await (await getTransporter()).sendMail({
      from: `"Examock" <${config.GMAIL_USER}>`,
      to: email,
      subject: "Your Examock verification code",
      text: `Your Examock verification code is ${otp}. It expires in ${OTP_TTL_MINUTES} minutes.`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
          <h2 style="margin:0 0 8px;color:#111827">Verify your email</h2>
          <p style="color:#4b5563;font-size:14px;line-height:1.6">
            Use the 6-digit code below to complete your Examock sign-up.
            It expires in ${OTP_TTL_MINUTES} minutes.
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

    // Record the destination and Gmail's response on EVERY success. A silent
    // success is the exact failure mode this file was just hardened against:
    // "OTP sent" with no trace of where it went makes a filtered or misdirected
    // message indistinguishable from a delivered one. `accepted` is Gmail's own
    // list of addresses it took responsibility for — if the address the user is
    // staring at isn't in here, they are checking the wrong mailbox. The OTP
    // itself is deliberately never logged.
    console.log(
      `[Email OTP] Sent to ${email} — id=${info.messageId} ` +
        `accepted=[${(info.accepted ?? []).join(", ")}] ` +
        `response="${info.response ?? ""}"`,
    );

    return { success: true, message: "OTP emailed successfully" };
  } catch (err) {
    console.error(`[Email OTP] Send failed — ${describeSmtpError(err)}`);
    return { success: false, message: "Failed to send OTP email" };
  }
}
