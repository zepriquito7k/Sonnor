import * as crypto from "crypto";
import * as admin from "firebase-admin";
import { HttpsError, onCall } from "firebase-functions/v2/https";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

function generateOtp(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export const sendOtpEmail = onCall(async (request) => {
  const emailRaw = request.data.email;

  if (!emailRaw || typeof emailRaw !== "string") {
    throw new HttpsError("invalid-argument", "Email obrigatório.");
  }

  const email = emailRaw.trim().toLowerCase();
  const otp = generateOtp();
  const otpHash = hashCode(otp);

  const expiresAt = admin.firestore.Timestamp.fromDate(
    new Date(Date.now() + 5 * 60 * 1000),
  );

  await db.collection("otps").doc(email).set({
    codeHash: otpHash,
    expiresAt,
    attempts: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log("OTP:", otp);

  return { success: true };
});
