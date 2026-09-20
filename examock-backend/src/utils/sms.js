import config from "../config/config.js";
import axios from "axios";

// Send OTP via MSG91 (production)
async function sendOtpSms(mobile, otp) {
  const normalised = mobile.replace(/^\+?91/, "").replace(/\D/g, "");

  try {
    const res = await axios.post(
      "https://control.msg91.com/api/v5/flow/",
      {
        template_id: config.MSG91_TEMPLATE_ID,
        sender: config.MSG91_SENDER_ID ?? "EXAMOCK",
        short_url: "0",
        mobiles: `91${normalised}`,
        otp,
      },
      {
        headers: {
          authkey: config.MSG91_AUTH_KEY,
          "Content-Type": "application/json",
          accept: "application/json",
        },
        timeout: 8000,
      },
    );

    if (res.data?.type === "success") {
      return { success: true, message: "OTP sent successfully" };
    }

    console.error("[MSG91] Unexpected response:", res.data);
    return { success: false, message: "SMS gateway returned an error" };
  } catch (err) {
    console.error("[MSG91] Error:", err?.response?.data ?? err.message);
    return { success: false, message: "Failed to send OTP" };
  }
}

// In development just log the OTP — saves MSG91 credits
async function sendOtpDev(mobile, otp) {
  console.log(`\n📱 [DEV] OTP for ${mobile}: ${otp}\n`);
  return { success: true, message: "OTP logged to console (dev mode)" };
}

// OTP delivery dispatcher for PHONE numbers.
//
// NOTE: the phone/mobile OTP flow is currently PAUSED (email OTP is the live
// channel during the deployment test phase — see auth.service.js + email.js).
// SMS stays wired here: to re-enable the phone flow, set OTP_DELIVERY=sms with
// MSG91 creds, then uncomment the mobile service functions/routes/UI.
export const sendOtp = config.OTP_DELIVERY === "sms" ? sendOtpSms : sendOtpDev;
