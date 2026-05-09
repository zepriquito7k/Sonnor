import * as crypto from "crypto";
import * as admin from "firebase-admin";
import { HttpsError, onCall } from "firebase-functions/v2/https";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

const OTP_TTL_MS = 5 * 60 * 1000;
const RESET_SESSION_TTL_MS = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const RESEND_API_URL = "https://api.resend.com/emails";
const DEFAULT_FROM_EMAIL = "Sonnor <onboarding@resend.dev>";

type FirestoreTimestampLike = {
  toMillis: () => number;
};

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const email = value.trim().toLowerCase();
  return email ? email : null;
}

function normalizeCode(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const code = value.trim();
  return /^\d{4}$/.test(code) ? code : null;
}

function generateOtp(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function generateResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function hashCode(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function getTimestampInMillis(value: unknown): number | null {
  if (
    value &&
    typeof value === "object" &&
    typeof (value as FirestoreTimestampLike).toMillis === "function"
  ) {
    return (value as FirestoreTimestampLike).toMillis();
  }

  return null;
}

async function ensurePasswordResetUser(email: string) {
  try {
    await admin.auth().getUserByEmail(email);
  } catch (error: any) {
    if (error?.code === "auth/user-not-found") {
      throw new HttpsError("not-found", "No account was found for this email.");
    }

    if (error?.code === "auth/invalid-email") {
      throw new HttpsError("invalid-argument", "Invalid email.");
    }

    console.error("GET USER BY EMAIL ERROR:", error);
    throw new HttpsError(
      "internal",
      "We could not validate the email right now.",
    );
  }
}

async function sendTransactionalEmail(options: {
  email: string;
  subject: string;
  html: string;
  text: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new HttpsError(
      "failed-precondition",
      "Email delivery is not configured on the server.",
    );
  }

  let response: Response;

  try {
    response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL ?? DEFAULT_FROM_EMAIL,
        to: [options.email],
        subject: options.subject,
        html: options.html,
        text: options.text,
      }),
    });
  } catch (error) {
    console.error("SEND EMAIL NETWORK ERROR:", error);
    throw new HttpsError(
      "unavailable",
      "The email service is temporarily unavailable.",
    );
  }

  if (response.ok) {
    return;
  }

  const errorText = await response.text();
  console.error("SEND EMAIL ERROR:", errorText);

  if (response.status === 401 || response.status === 403) {
    throw new HttpsError(
      "failed-precondition",
      "The email sender is not configured correctly.",
    );
  }

  if (response.status === 429) {
    throw new HttpsError(
      "resource-exhausted",
      "Too many email requests were made. Please try again in a moment.",
    );
  }

  throw new HttpsError(
    "internal",
    "Unable to send the verification email.",
  );
}

async function sendPasswordResetOtp(email: string, code: string) {
  const subject = "Your Sonnor password reset code";
  const text =
    `Use this 4-digit code to reset your Sonnor password: ${code}. ` +
    "It expires in 5 minutes. If you did not request this, you can ignore this email.";
  const html = `
    <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.5;">
      <h2 style="margin-bottom: 12px;">Reset your Sonnor password</h2>
      <p style="margin: 0 0 16px;">
        Use the 4-digit code below to verify your account and continue changing your password.
      </p>
      <div style="font-size: 32px; font-weight: 700; letter-spacing: 10px; margin: 24px 0;">
        ${code}
      </div>
      <p style="margin: 0 0 8px;">This code expires in 5 minutes.</p>
      <p style="margin: 0; color: #666;">If you did not request this, you can ignore this email.</p>
    </div>
  `;

  await sendTransactionalEmail({
    email,
    subject,
    html,
    text,
  });
}

export const sendOtpEmail = onCall(async (request) => {
  const email = normalizeEmail(request.data.email);

  if (!email) {
    throw new HttpsError("invalid-argument", "Email obrigatório.");
  }

  await ensurePasswordResetUser(email);
  const otp = generateOtp();
  const otpHash = hashCode(otp);

  const expiresAt = admin.firestore.Timestamp.fromDate(
    new Date(Date.now() + OTP_TTL_MS),
  );

  await db.collection("otps").doc(email).set({
    codeHash: otpHash,
    expiresAt,
    attempts: 0,
    purpose: "password-reset",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  try {
    await sendPasswordResetOtp(email, otp);
  } catch (error) {
    await db.collection("otps").doc(email).delete();
    throw error;
  }

  return { success: true };
});

export const verifyOtp = onCall(async (request) => {
  const email = normalizeEmail(request.data.email);
  const code = normalizeCode(request.data.code);

  if (!email || !code) {
    throw new HttpsError("invalid-argument", "Dados inválidos.");
  }

  const docRef = db.collection("otps").doc(email);
  const snap = await docRef.get();

  if (!snap.exists) {
    throw new HttpsError("not-found", "Código não encontrado.");
  }

  const data = snap.data() ?? {};
  const expiresAt = getTimestampInMillis(data?.expiresAt);
  const attempts = typeof data?.attempts === "number" ? data.attempts : 0;

  if (!expiresAt || expiresAt < Date.now()) {
    await docRef.delete();
    throw new HttpsError("deadline-exceeded", "Código expirado.");
  }

  if (attempts >= MAX_OTP_ATTEMPTS) {
    await docRef.delete();
    throw new HttpsError("permission-denied", "Muitas tentativas.");
  }

  const incomingHash = hashCode(code);

  if (incomingHash !== data.codeHash) {
    await docRef.update({
      attempts: admin.firestore.FieldValue.increment(1),
    });

    throw new HttpsError("permission-denied", "Código incorreto.");
  }

  await docRef.delete();

  const resetToken = generateResetToken();
  const resetExpiresAt = admin.firestore.Timestamp.fromDate(
    new Date(Date.now() + RESET_SESSION_TTL_MS),
  );

  await db.collection("passwordResetSessions").doc(email).set({
    tokenHash: hashCode(resetToken),
    expiresAt: resetExpiresAt,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    success: true,
    resetToken,
  };
});

export const resetPasswordWithOtp = onCall(async (request) => {
  const email = normalizeEmail(request.data.email);
  const resetToken =
    typeof request.data.resetToken === "string"
      ? request.data.resetToken.trim()
      : "";
  const newPassword =
    typeof request.data.newPassword === "string"
      ? request.data.newPassword
      : "";

  if (!email || !resetToken || newPassword.trim().length < 6) {
    throw new HttpsError(
      "invalid-argument",
      "Email, reset token, and a valid password are required.",
    );
  }

  const sessionRef = db.collection("passwordResetSessions").doc(email);
  const sessionSnap = await sessionRef.get();

  if (!sessionSnap.exists) {
    throw new HttpsError("not-found", "Password reset session not found.");
  }

  const sessionData = sessionSnap.data();
  const expiresAt = getTimestampInMillis(sessionData?.expiresAt);

  if (!expiresAt || expiresAt < Date.now()) {
    await sessionRef.delete();
    throw new HttpsError("deadline-exceeded", "Password reset session expired.");
  }

  if (hashCode(resetToken) !== sessionData?.tokenHash) {
    throw new HttpsError("permission-denied", "Password reset session is invalid.");
  }

  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().updateUser(user.uid, { password: newPassword });
    await admin.auth().revokeRefreshTokens(user.uid);
  } catch (error: any) {
    console.error("RESET PASSWORD WITH OTP ERROR:", error);

    if (error?.code === "auth/user-not-found") {
      throw new HttpsError("not-found", "No account was found for this email.");
    }

    if (
      error?.code === "auth/invalid-password" ||
      error?.code === "auth/password-does-not-meet-requirements"
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Password does not meet the requirements.",
      );
    }

    throw new HttpsError(
      "internal",
      "Unable to update the password right now.",
    );
  }

  await sessionRef.delete();

  return { success: true };
});
