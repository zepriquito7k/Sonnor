import * as crypto from "crypto";
import * as admin from "firebase-admin";
import { defineSecret } from "firebase-functions/params";
import { onDocumentCreated, onDocumentWritten } from "firebase-functions/v2/firestore";
import { HttpsError, onCall, onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";

const nodemailer = require("nodemailer");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

const OTP_TTL_MS = 5 * 60 * 1000;
const RESET_SESSION_TTL_MS = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const VERIFIED_MIN_FOLLOWERS = 1000000;
const VERIFIED_MIN_HIT_TRACKS = 10;
const VERIFIED_MIN_TRACK_LIKES = 100000;
const VERIFIED_MAX_APPROVED_REPORTS = 2;
const GMAIL_USER = defineSecret("GMAIL_USER");
const GMAIL_APP_PASSWORD = defineSecret("GMAIL_APP_PASSWORD");

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

async function createInAppNotification(input: {
  body: string;
  targetId?: string;
  targetType?: "post" | "track" | "album" | "comment" | "user";
  title: string;
  type?: "new_release" | "admin_update" | "system";
  userId: string;
}) {
  if (!input.userId) return;

  await db.collection("notifications").add({
    body: input.body,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    read: false,
    targetId: input.targetId ?? "",
    targetType: input.targetType ?? "user",
    title: input.title,
    type: input.type ?? "admin_update",
    userId: input.userId,
  });
}

function statusChanged(
  before: FirebaseFirestore.DocumentData | undefined,
  after: FirebaseFirestore.DocumentData | undefined,
) {
  return Boolean(before && after && before.status !== after.status);
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
  const gmailUser = GMAIL_USER.value() || process.env.GMAIL_USER;
  const gmailAppPassword =
    GMAIL_APP_PASSWORD.value() || process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailAppPassword) {
    throw new HttpsError(
      "failed-precondition",
      "Email delivery is not configured on the server.",
    );
  }

  const transporter = nodemailer.createTransport({
    auth: {
      pass: gmailAppPassword,
      user: gmailUser,
    },
    service: "gmail",
  });

  try {
    await transporter.sendMail({
      from: `Sonnor <${gmailUser}>`,
      html: options.html,
      subject: options.subject,
      text: options.text,
      to: options.email,
    });
  } catch (error) {
    console.error("SEND EMAIL ERROR:", error);
    throw new HttpsError(
      "unavailable",
      "The email service is temporarily unavailable.",
    );
  }
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

async function sendDeleteAccountOtp(email: string, code: string) {
  const subject = "Your Sonnor account deletion code";
  const text =
    `Use this 4-digit code to confirm deleting your Sonnor account: ${code}. ` +
    "It expires in 5 minutes. If you did not request this, secure your account.";
  const html = `
    <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.5;">
      <h2 style="margin-bottom: 12px;">Delete your Sonnor account</h2>
      <p style="margin: 0 0 16px;">
        Use the 4-digit code below to confirm this sensitive action.
      </p>
      <div style="font-size: 32px; font-weight: 700; letter-spacing: 10px; margin: 24px 0;">
        ${code}
      </div>
      <p style="margin: 0 0 8px;">This code expires in 5 minutes.</p>
      <p style="margin: 0; color: #666;">If you did not request this, secure your account.</p>
    </div>
  `;

  await sendTransactionalEmail({
    email,
    subject,
    html,
    text,
  });
}

async function sendSignupOtp(email: string, code: string) {
  const subject = "Your Sonnor signup code";
  const text =
    `Use this 4-digit code to continue creating your Sonnor account: ${code}. ` +
    "It expires in 5 minutes.";
  const html = `
    <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.5;">
      <h2 style="margin-bottom: 12px;">Welcome to Sonnor</h2>
      <p style="margin: 0 0 16px;">
        Use the 4-digit code below to continue creating your account.
      </p>
      <div style="font-size: 32px; font-weight: 700; letter-spacing: 10px; margin: 24px 0;">
        ${code}
      </div>
      <p style="margin: 0 0 8px;">This code expires in 5 minutes.</p>
    </div>
  `;

  await sendTransactionalEmail({
    email,
    subject,
    html,
    text,
  });
}

export const sendOtpEmail = onCall({ secrets: [GMAIL_USER, GMAIL_APP_PASSWORD] }, async (request) => {
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
    debugCode: otp,
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

export const sendDeleteAccountOtpEmail = onCall(
  { secrets: [GMAIL_USER, GMAIL_APP_PASSWORD] },
  async (request) => {
  const identity = await getCallableIdentity(request);
  const uid = identity?.uid;
  const email = normalizeEmail(request.data.email);

  if (!uid || !email) {
    throw new HttpsError("unauthenticated", "Conta autenticada obrigatoria.");
  }

  const user = await admin.auth().getUser(uid);

  if (user.email?.toLowerCase() !== email) {
    throw new HttpsError("permission-denied", "Email nao pertence a esta conta.");
  }

  const otp = generateOtp();
  const otpHash = hashCode(otp);
  const expiresAt = admin.firestore.Timestamp.fromDate(
    new Date(Date.now() + OTP_TTL_MS),
  );

  await db.collection("accountDeletionOtps").doc(uid).set({
    codeHash: otpHash,
    debugCode: otp,
    email,
    expiresAt,
    attempts: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  try {
    await sendDeleteAccountOtp(email, otp);
  } catch (error) {
    await db.collection("accountDeletionOtps").doc(uid).delete();
    throw error;
  }

  return { success: true };
  },
);

export const sendSignupOtpEmail = onCall(
  { invoker: "public", secrets: [GMAIL_USER, GMAIL_APP_PASSWORD] },
  async (request) => {
  const email = normalizeEmail(request.data.email);

  if (!email) {
    throw new HttpsError("invalid-argument", "Email obrigatorio.");
  }

  try {
    await admin.auth().getUserByEmail(email);
    throw new HttpsError("already-exists", "Este email ja tem conta.");
  } catch (error: any) {
    if (error instanceof HttpsError) {
      throw error;
    }

    if (error?.code !== "auth/user-not-found") {
      console.error("CHECK SIGNUP EMAIL ERROR:", error);
      throw new HttpsError("internal", "Nao foi possivel validar este email.");
    }
  }

  const otp = generateOtp();
  const otpHash = hashCode(otp);
  const expiresAt = admin.firestore.Timestamp.fromDate(
    new Date(Date.now() + OTP_TTL_MS),
  );

  await db.collection("signupOtps").doc(email).set({
    codeHash: otpHash,
    debugCode: otp,
    expiresAt,
    attempts: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  try {
    await sendSignupOtp(email, otp);
  } catch (error) {
    await db.collection("signupOtps").doc(email).delete();
    throw error;
  }

  return { success: true };
  },
);

export const verifySignupOtp = onCall({ invoker: "public" }, async (request) => {
  const email = normalizeEmail(request.data.email);
  const code = normalizeCode(request.data.code);

  if (!email || !code) {
    throw new HttpsError("invalid-argument", "Dados invalidos.");
  }

  const docRef = db.collection("signupOtps").doc(email);
  const snap = await docRef.get();

  if (!snap.exists) {
    throw new HttpsError("not-found", "Codigo nao encontrado.");
  }

  const data = snap.data() ?? {};
  const expiresAt = getTimestampInMillis(data.expiresAt);
  const attempts = typeof data.attempts === "number" ? data.attempts : 0;

  if (!expiresAt || expiresAt < Date.now()) {
    await docRef.delete();
    throw new HttpsError("deadline-exceeded", "Codigo expirado.");
  }

  if (attempts >= MAX_OTP_ATTEMPTS) {
    await docRef.delete();
    throw new HttpsError("permission-denied", "Muitas tentativas.");
  }

  if (hashCode(code) !== data.codeHash) {
    await docRef.update({
      attempts: admin.firestore.FieldValue.increment(1),
    });
    throw new HttpsError("permission-denied", "Codigo incorreto.");
  }

  await docRef.delete();

  return { success: true };
});

function sendJson(response: any, status: number, body: Record<string, unknown>) {
  response.status(status).json(body);
}

function readRequestBody(request: any) {
  if (request.body && typeof request.body === "object") {
    return request.body;
  }

  if (typeof request.body === "string") {
    try {
      return JSON.parse(request.body);
    } catch {
      return {};
    }
  }

  return {};
}

async function createSignupOtp(email: string) {
  try {
    await admin.auth().getUserByEmail(email);
    throw new HttpsError("already-exists", "Este email ja tem conta.");
  } catch (error: any) {
    if (error instanceof HttpsError) {
      throw error;
    }

    if (error?.code !== "auth/user-not-found") {
      console.error("CHECK SIGNUP EMAIL ERROR:", error);
      throw new HttpsError("internal", "Nao foi possivel validar este email.");
    }
  }

  const otp = generateOtp();
  const otpHash = hashCode(otp);
  const expiresAt = admin.firestore.Timestamp.fromDate(
    new Date(Date.now() + OTP_TTL_MS),
  );

  await db.collection("signupOtps").doc(email).set({
    codeHash: otpHash,
    debugCode: otp,
    expiresAt,
    attempts: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  try {
    await sendSignupOtp(email, otp);
  } catch (error) {
    await db.collection("signupOtps").doc(email).delete();
    throw error;
  }
}

async function checkSignupOtp(email: string, code: string) {
  const docRef = db.collection("signupOtps").doc(email);
  const snap = await docRef.get();

  if (!snap.exists) {
    throw new HttpsError("not-found", "Codigo nao encontrado.");
  }

  const data = snap.data() ?? {};
  const expiresAt = getTimestampInMillis(data.expiresAt);
  const attempts = typeof data.attempts === "number" ? data.attempts : 0;

  if (!expiresAt || expiresAt < Date.now()) {
    await docRef.delete();
    throw new HttpsError("deadline-exceeded", "Codigo expirado.");
  }

  if (attempts >= MAX_OTP_ATTEMPTS) {
    await docRef.delete();
    throw new HttpsError("permission-denied", "Muitas tentativas.");
  }

  if (hashCode(code) !== data.codeHash) {
    await docRef.update({
      attempts: admin.firestore.FieldValue.increment(1),
    });
    throw new HttpsError("permission-denied", "Codigo incorreto.");
  }

  await docRef.delete();
}

export const sendSignupOtpHttp = onRequest(
  { cors: true, invoker: "public", secrets: [GMAIL_USER, GMAIL_APP_PASSWORD] },
  async (request, response) => {
    if (request.method !== "POST") {
      sendJson(response, 405, { error: "Metodo invalido." });
      return;
    }

    const email = normalizeEmail(readRequestBody(request).email);

    if (!email) {
      sendJson(response, 400, { error: "Email obrigatorio." });
      return;
    }

    try {
      await createSignupOtp(email);
      sendJson(response, 200, { success: true });
    } catch (error: any) {
      const code = error instanceof HttpsError ? error.code : "internal";
      const message = error?.message || "Nao foi possivel enviar o codigo.";

      sendJson(response, code === "already-exists" ? 409 : 500, {
        code,
        error: message,
      });
    }
  },
);

export const verifySignupOtpHttp = onRequest(
  { cors: true, invoker: "public" },
  async (request, response) => {
    if (request.method !== "POST") {
      sendJson(response, 405, { error: "Metodo invalido." });
      return;
    }

    const body = readRequestBody(request);
    const email = normalizeEmail(body.email);
    const code = normalizeCode(body.code);

    if (!email || !code) {
      sendJson(response, 400, { error: "Dados invalidos." });
      return;
    }

    try {
      await checkSignupOtp(email, code);
      sendJson(response, 200, { success: true });
    } catch (error: any) {
      const codeName = error instanceof HttpsError ? error.code : "internal";
      const message = error?.message || "Codigo invalido.";

      sendJson(response, codeName === "not-found" ? 404 : 400, {
        code: codeName,
        error: message,
      });
    }
  },
);

async function deleteDocumentRefs(
  refs: FirebaseFirestore.DocumentReference[],
) {
  const uniqueRefs = Array.from(
    new Map(refs.map((ref) => [ref.path, ref])).values(),
  );

  for (let index = 0; index < uniqueRefs.length; index += 400) {
    const batch = db.batch();
    const chunk = uniqueRefs.slice(index, index + 400);

    chunk.forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
}

async function collectQueryRefs(
  refs: FirebaseFirestore.DocumentReference[],
  query: FirebaseFirestore.Query,
  filter?: (data: FirebaseFirestore.DocumentData) => boolean,
) {
  const snapshot = await query.get();

  snapshot.docs.forEach((docSnap) => {
    if (!filter || filter(docSnap.data())) {
      refs.push(docSnap.ref);
    }
  });

  return snapshot.docs;
}

async function deleteStorageForAccount(input: {
  albumIds: string[];
  messageThreadIds: string[];
  postIds: string[];
  submissionIds: string[];
  trackIds: string[];
  uid: string;
}) {
  const bucket = admin.storage().bucket();
  const prefixes = [
    `users/${input.uid}/`,
    `tempUploads/${input.uid}/`,
    ...input.albumIds.map((id) => `albums/${id}/`),
    ...input.trackIds.map((id) => `tracks/${id}/`),
    ...input.postIds.map((id) => `posts/${id}/`),
    ...input.submissionIds.map((id) => `musicSubmissions/${id}/`),
    ...input.messageThreadIds.map((id) => `messages/${id}/`),
  ];

  await Promise.all(
    prefixes.map((prefix) =>
      bucket.deleteFiles({ force: true, prefix }).catch((error) => {
        console.error("DELETE STORAGE PREFIX ERROR:", prefix, error);
      }),
    ),
  );
}

async function isCallableAdmin(request: any) {
  const identity = await getCallableIdentity(request);
  const uid = identity?.uid;
  const email = identity?.email;

  if (!uid) {
    return false;
  }

  if (identity?.admin === true) {
    return true;
  }

  if (typeof email !== "string") {
    return false;
  }

  const adminsSnap = await db.collection("appConfig").doc("admins").get();
  const adminEmails = adminsSnap.data()?.adminEmails;

  return Array.isArray(adminEmails) && adminEmails.includes(email);
}

async function getCallableIdentity(request: any) {
  if (request.auth?.uid) {
    return {
      admin: request.auth.token.admin === true,
      email: typeof request.auth.token.email === "string" ? request.auth.token.email : null,
      uid: request.auth.uid,
    };
  }

  const idToken =
    typeof request.data?.idToken === "string" ? request.data.idToken : "";

  if (!idToken) {
    return null;
  }

  const decoded = await admin.auth().verifyIdToken(idToken).catch(() => null);

  if (!decoded?.uid) {
    return null;
  }

  return {
    admin: decoded.admin === true,
    email: typeof decoded.email === "string" ? decoded.email : null,
    uid: decoded.uid,
  };
}

async function countApprovedReportsForUser(uid: string) {
  const reportsSnap = await db
    .collection("reports")
    .where("targetId", "==", uid)
    .get();

  return reportsSnap.docs.filter((docSnap) => {
    const data = docSnap.data();

    return (
      data.targetType === "user" &&
      (data.status === "action_taken" || data.status === "approved")
    );
  }).length;
}

async function countHitTracksForUser(uid: string) {
  const tracksSnap = await db
    .collection("tracks")
    .where("userId", "==", uid)
    .get();

  return tracksSnap.docs.filter((docSnap) => {
    const likesCount = docSnap.data().likesCount;

    return typeof likesCount === "number" && likesCount >= VERIFIED_MIN_TRACK_LIKES;
  }).length;
}

async function recalculateUserVerification(uid: string) {
  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();

  if (!userSnap.exists) {
    return;
  }

  const userData = userSnap.data() ?? {};

  if (userData.verificationOverride === true) {
    const updates: Record<string, unknown> = {
      verified: true,
      verifiedBy: "admin",
      verifiedReason: "Verificado manualmente pela equipa Sonnor.",
    };

    if (
      userData.verified !== updates.verified ||
      userData.verifiedBy !== updates.verifiedBy ||
      userData.verifiedReason !== updates.verifiedReason
    ) {
      await userRef.set({
        ...updates,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }

    return;
  }

  const followersCount =
    typeof userData.followersCount === "number" ? userData.followersCount : 0;
  const [hitTracksCount, approvedReportsCount] = await Promise.all([
    countHitTracksForUser(uid),
    countApprovedReportsForUser(uid),
  ]);
  const meetsRequirements =
    followersCount >= VERIFIED_MIN_FOLLOWERS &&
    hitTracksCount >= VERIFIED_MIN_HIT_TRACKS &&
    approvedReportsCount <= VERIFIED_MAX_APPROVED_REPORTS;
  const nextReason = meetsRequirements
    ? "Cumpre os requisitos automaticos da Sonnor."
    : "";
  const nextVerifiedBy = meetsRequirements ? "automatic" : "";

  if (
    userData.verified !== meetsRequirements ||
    userData.verifiedBy !== nextVerifiedBy ||
    userData.verifiedReason !== nextReason
  ) {
    await userRef.set({
      verified: meetsRequirements,
      verifiedBy: nextVerifiedBy,
      verifiedReason: nextReason,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  }
}

async function getImpactedVerificationUserIdsFromReport(
  before?: FirebaseFirestore.DocumentData,
  after?: FirebaseFirestore.DocumentData,
) {
  return Array.from(
    new Set(
      [before, after]
        .map((data) =>
          data?.targetType === "user" && typeof data.targetId === "string"
            ? data.targetId
            : "",
        )
        .filter(Boolean),
    ),
  );
}

async function deleteAccountEverywhere(uid: string, email?: string | null) {
  const refsToDelete: FirebaseFirestore.DocumentReference[] = [
    db.collection("users").doc(uid),
    db.collection("accountDeletionOtps").doc(uid),
  ];

  if (email) {
    refsToDelete.push(
      db.collection("otps").doc(email),
      db.collection("signupOtps").doc(email),
      db.collection("passwordResetSessions").doc(email),
    );
  }

  const [
    albumDocs,
    trackDocs,
    postDocs,
    submissionDocs,
    sentFollowDocs,
    receivedFollowDocs,
    threadDocs,
  ] = await Promise.all([
    collectQueryRefs(refsToDelete, db.collection("albums").where("userId", "==", uid)),
    collectQueryRefs(refsToDelete, db.collection("tracks").where("userId", "==", uid)),
    collectQueryRefs(refsToDelete, db.collection("posts").where("userId", "==", uid)),
    collectQueryRefs(refsToDelete, db.collection("musicSubmissions").where("userId", "==", uid)),
    collectQueryRefs(refsToDelete, db.collection("follows").where("followerId", "==", uid)),
    collectQueryRefs(refsToDelete, db.collection("follows").where("followingId", "==", uid)),
    collectQueryRefs(
      refsToDelete,
      db.collection("messageThreads").where("participantIds", "array-contains", uid),
    ),
    collectQueryRefs(refsToDelete, db.collection("comments").where("userId", "==", uid)),
    collectQueryRefs(refsToDelete, db.collection("likes").where("userId", "==", uid)),
    collectQueryRefs(refsToDelete, db.collection("reports").where("reporterId", "==", uid)),
    collectQueryRefs(
      refsToDelete,
      db.collection("reports").where("targetId", "==", uid),
      (data) => data.targetType === "user",
    ),
    collectQueryRefs(refsToDelete, db.collection("notifications").where("userId", "==", uid)),
    collectQueryRefs(refsToDelete, db.collection("notifications").where("fromUserId", "==", uid)),
    collectQueryRefs(refsToDelete, db.collection("adminDeletionRequests").where("targetUid", "==", uid)),
    collectQueryRefs(refsToDelete, db.collection("adminDeletionRequests").where("requestedBy", "==", uid)),
    collectQueryRefs(refsToDelete, db.collection("profileRequests").where("userId", "==", uid)),
    collectQueryRefs(refsToDelete, db.collection("verificationRequests").where("userId", "==", uid)),
    collectQueryRefs(refsToDelete, db.collection("recentPlays").where("userId", "==", uid)),
    collectQueryRefs(refsToDelete, db.collection("playlists").where("userId", "==", uid)),
    collectQueryRefs(refsToDelete, db.collection("collections").where("userId", "==", uid)),
    collectQueryRefs(refsToDelete, db.collection("messages").where("senderId", "==", uid)),
  ]);

  const albumIds = albumDocs.map((docSnap) => docSnap.id);
  const trackIds = trackDocs.map((docSnap) => docSnap.id);
  const postIds = postDocs.map((docSnap) => docSnap.id);
  const submissionIds = submissionDocs.map((docSnap) => docSnap.id);
  const messageThreadIds = threadDocs.map((docSnap) => docSnap.id);
  const contentTargets = [
    ...albumIds.map((id) => ({ id, type: "album" })),
    ...trackIds.map((id) => ({ id, type: "track" })),
    ...postIds.map((id) => ({ id, type: "post" })),
  ];

  sentFollowDocs.forEach((docSnap) => {
    const followingId = docSnap.data().followingId;

    if (typeof followingId === "string") {
      refsToDelete.push(
        db.collection("users").doc(uid).collection("following").doc(followingId),
        db.collection("users").doc(followingId).collection("followers").doc(uid),
      );
    }
  });

  receivedFollowDocs.forEach((docSnap) => {
    const followerId = docSnap.data().followerId;

    if (typeof followerId === "string") {
      refsToDelete.push(
        db.collection("users").doc(uid).collection("followers").doc(followerId),
        db.collection("users").doc(followerId).collection("following").doc(uid),
      );
    }
  });

  await Promise.all([
    ...messageThreadIds.map((threadId) =>
      collectQueryRefs(refsToDelete, db.collection("messages").where("threadId", "==", threadId)),
    ),
    ...contentTargets.flatMap((target) => [
      collectQueryRefs(
        refsToDelete,
        db.collection("comments").where("targetId", "==", target.id),
        (data) => data.targetType === target.type,
      ),
      collectQueryRefs(
        refsToDelete,
        db.collection("likes").where("targetId", "==", target.id),
        (data) => data.targetType === target.type,
      ),
      collectQueryRefs(
        refsToDelete,
        db.collection("reports").where("targetId", "==", target.id),
        (data) => data.targetType === target.type,
      ),
    ]),
  ]);

  await deleteDocumentRefs(refsToDelete);
  await deleteStorageForAccount({
    albumIds,
    messageThreadIds,
    postIds,
    submissionIds,
    trackIds,
    uid,
  });
  await admin.auth().deleteUser(uid).catch((error) => {
    if (error?.code !== "auth/user-not-found") {
      throw error;
    }
  });
}

export const deleteAccountWithOtp = onCall(async (request) => {
  const identity = await getCallableIdentity(request);
  const uid = identity?.uid;
  const email = normalizeEmail(request.data.email);
  const code = normalizeCode(request.data.code);
  const confirmation =
    typeof request.data.confirmation === "string"
      ? request.data.confirmation.trim().toLowerCase()
      : "";

  if (!uid || !email || !code || confirmation !== "apagar") {
    throw new HttpsError("invalid-argument", "Confirmacao invalida.");
  }

  const user = await admin.auth().getUser(uid);

  if (user.email?.toLowerCase() !== email) {
    throw new HttpsError("permission-denied", "Email nao pertence a esta conta.");
  }

  const otpRef = db.collection("accountDeletionOtps").doc(uid);
  const otpSnap = await otpRef.get();

  if (!otpSnap.exists) {
    throw new HttpsError("not-found", "Codigo nao encontrado.");
  }

  const data = otpSnap.data() ?? {};
  const expiresAt = getTimestampInMillis(data.expiresAt);
  const attempts = typeof data.attempts === "number" ? data.attempts : 0;

  if (!expiresAt || expiresAt < Date.now()) {
    await otpRef.delete();
    throw new HttpsError("deadline-exceeded", "Codigo expirado.");
  }

  if (attempts >= MAX_OTP_ATTEMPTS) {
    await otpRef.delete();
    throw new HttpsError("permission-denied", "Muitas tentativas.");
  }

  if (hashCode(code) !== data.codeHash) {
    await otpRef.update({
      attempts: admin.firestore.FieldValue.increment(1),
    });
    throw new HttpsError("permission-denied", "Codigo incorreto.");
  }

  await deleteAccountEverywhere(uid, email);

  return { success: true };
});

export const deleteAccountWithOtpHttp = onRequest(
  { cors: true },
  async (request, response) => {
    if (request.method !== "POST") {
      sendJson(response, 405, { error: "Metodo invalido." });
      return;
    }

    const body = readRequestBody(request);
    const email = normalizeEmail(body.email);
    const code = normalizeCode(body.code);
    const confirmation =
      typeof body.confirmation === "string"
        ? body.confirmation.trim().toLowerCase()
        : "";
    const idToken = typeof body.idToken === "string" ? body.idToken : "";
    const decoded = idToken
      ? await admin.auth().verifyIdToken(idToken).catch(() => null)
      : null;
    const uid = decoded?.uid;

    if (!uid || !email || !code || confirmation !== "apagar") {
      sendJson(response, 401, {
        code: "unauthenticated",
        error: "Sessao autenticada obrigatoria.",
      });
      return;
    }

    try {
      const user = await admin.auth().getUser(uid);

      if (user.email?.toLowerCase() !== email) {
        throw new HttpsError("permission-denied", "Email nao pertence a esta conta.");
      }

      const otpRef = db.collection("accountDeletionOtps").doc(uid);
      const otpSnap = await otpRef.get();

      if (!otpSnap.exists) {
        throw new HttpsError("not-found", "Codigo nao encontrado.");
      }

      const data = otpSnap.data() ?? {};
      const expiresAt = getTimestampInMillis(data.expiresAt);
      const attempts = typeof data.attempts === "number" ? data.attempts : 0;

      if (!expiresAt || expiresAt < Date.now()) {
        await otpRef.delete();
        throw new HttpsError("deadline-exceeded", "Codigo expirado.");
      }

      if (attempts >= MAX_OTP_ATTEMPTS) {
        await otpRef.delete();
        throw new HttpsError("permission-denied", "Muitas tentativas.");
      }

      if (hashCode(code) !== data.codeHash) {
        await otpRef.update({
          attempts: admin.firestore.FieldValue.increment(1),
        });
        throw new HttpsError("permission-denied", "Codigo incorreto.");
      }

      await deleteAccountEverywhere(uid, email);

      sendJson(response, 200, { success: true });
    } catch (error: any) {
      const codeName = error instanceof HttpsError ? error.code : "internal";
      const message = error?.message || "Nao foi possivel apagar a conta.";

      sendJson(response, codeName === "not-found" ? 404 : 400, {
        code: codeName,
        error: message,
      });
    }
  },
);

export const adminDeleteUserAccount = onCall(async (request) => {
  const identity = await getCallableIdentity(request);
  const targetUid =
    typeof request.data.uid === "string" ? request.data.uid.trim() : "";

  if (!targetUid) {
    throw new HttpsError("invalid-argument", "Utilizador obrigatorio.");
  }

  if (!(await isCallableAdmin(request))) {
    throw new HttpsError("permission-denied", "Permissao admin obrigatoria.");
  }

  if (identity?.uid === targetUid) {
    throw new HttpsError("failed-precondition", "Um admin nao pode apagar a propria conta aqui.");
  }

  const targetUser = await admin.auth().getUser(targetUid).catch((error) => {
    if (error?.code === "auth/user-not-found") {
      return null;
    }

    throw error;
  });

  await deleteAccountEverywhere(targetUid, targetUser?.email?.toLowerCase() ?? null);

  return { success: true };
});

export const setUserVerifiedOverride = onCall(async (request) => {
  const targetUid =
    typeof request.data.uid === "string" ? request.data.uid.trim() : "";
  const verified = request.data.verified === true;

  if (!targetUid) {
    throw new HttpsError("invalid-argument", "Utilizador obrigatorio.");
  }

  if (!(await isCallableAdmin(request))) {
    throw new HttpsError("permission-denied", "Permissao admin obrigatoria.");
  }

  await db.collection("users").doc(targetUid).set({
    verificationOverride: verified,
    verified: verified,
    verifiedBy: verified ? "admin" : "",
    verifiedReason: verified ? "Verificado manualmente pela equipa Sonnor." : "",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  if (!verified) {
    await recalculateUserVerification(targetUid);
  }

  return { success: true };
});

async function publishDueScheduledReleases() {
  const now = admin.firestore.Timestamp.now();
  const scheduled = await db.collection("albums").where("status", "==", "scheduled").get();
  const dueAlbums = scheduled.docs.filter((album) => {
    const releaseDate = getTimestampInMillis(album.data().releaseDate);
    return releaseDate !== null && releaseDate <= now.toMillis();
  });

  for (const album of dueAlbums) {
    const albumData = album.data();
    const releaseDate = getTimestampInMillis(albumData.releaseDate) ?? now.toMillis();
    const tracks = await db.collection("tracks").where("albumId", "==", album.id).get();
    const publishBatch = db.batch();

    publishBatch.set(album.ref, {
      preReleaseEnabled: false,
      preReleaseHighlightUntil: admin.firestore.Timestamp.fromMillis(releaseDate + 24 * 60 * 60 * 1000),
      status: "published",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    tracks.docs.forEach((track) => {
      publishBatch.set(track.ref, {
        status: "published",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    });
    await publishBatch.commit();

    const reminders = await db.collection("releaseReminders").where("albumId", "==", album.id).get();
    await Promise.all(reminders.docs.map(async (reminder) => {
      const userId = reminder.data().userId;

      if (typeof userId === "string" && userId) {
        await createInAppNotification({
          body: `${typeof albumData.title === "string" ? albumData.title : "O lançamento"} já está disponível.`,
          targetId: album.id,
          targetType: "album",
          title: "Novo lançamento disponível",
          type: "new_release",
          userId,
        });
      }

      await reminder.ref.delete();
    }));
  }
}

export const publishScheduledReleases = onSchedule("every 1 minutes", async () => {
  await publishDueScheduledReleases();
});

export const publishDueReleasesNow = onCall(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError("unauthenticated", "Sessao obrigatoria.");
  }

  await publishDueScheduledReleases();
  return { success: true };
});

export const notifyMusicSubmissionDecision = onDocumentWritten(
  "musicSubmissions/{submissionId}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    if (!before || !after || typeof after.userId !== "string") return;

    const allowedChanged =
      before.reviewBatchAllowed !== true && after.reviewBatchAllowed === true;
    const decisionChanged =
      before.status !== after.status && ["approved", "rejected"].includes(after.status);

    if (!allowedChanged && !decisionChanged) return;

    const approved = allowedChanged || after.status === "approved";
    await createInAppNotification({
      body: approved
        ? "A equipa aprovou a música. Já podes terminar os dados do lançamento."
        : after.rightsReview?.note || "A equipa não aprovou esta música.",
      targetId: event.params.submissionId,
      targetType: "track",
      title: approved ? "Música aprovada" : "Música não aprovada",
      userId: after.userId,
    });
  },
);

export const notifyReportDecision = onDocumentWritten(
  "reports/{reportId}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    if (!statusChanged(before, after) || typeof after?.reporterId !== "string") return;

    await createInAppNotification({
      body: typeof after.adminResponse === "string"
        ? after.adminResponse
        : `O teu report foi atualizado para ${after.status}.`,
      targetId: typeof after.targetId === "string" ? after.targetId : event.params.reportId,
      targetType: after.targetType,
      title: "Resposta ao teu report",
      userId: after.reporterId,
    });
  },
);

export const notifyVerificationDecision = onDocumentWritten(
  "verificationRequests/{requestId}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    if (!statusChanged(before, after) || typeof after?.userId !== "string") return;

    await createInAppNotification({
      body: after.status === "approved"
        ? "A tua verificação foi aprovada."
        : after.rejectionReason || "A tua verificação não foi aprovada.",
      targetId: after.userId,
      targetType: "user",
      title: after.status === "approved" ? "Verificação aprovada" : "Atualização da verificação",
      userId: after.userId,
    });
  },
);

export const notifyProfileRequestDecision = onDocumentWritten(
  "profileRequests/{requestId}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    if (!statusChanged(before, after) || typeof after?.userId !== "string") return;

    await createInAppNotification({
      body: after.status === "approved"
        ? "O teu pedido foi aprovado pela equipa."
        : after.rejectionReason || "O teu pedido não foi aprovado.",
      targetId: typeof after.targetId === "string" ? after.targetId : after.userId,
      targetType: "user",
      title: after.status === "approved" ? "Pedido aprovado" : "Atualização do teu pedido",
      userId: after.userId,
    });
  },
);

export const recalculateVerificationOnUserWrite = onDocumentWritten(
  "users/{uid}",
  async (event) => {
    const uid = event.params.uid;
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    if (!after) {
      return;
    }

    if (
      before?.followersCount === after.followersCount &&
      before?.verificationOverride === after.verificationOverride
    ) {
      return;
    }

    await recalculateUserVerification(uid);
  },
);

export const recalculateVerificationOnTrackWrite = onDocumentWritten(
  "tracks/{trackId}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    const userIds = Array.from(
      new Set(
        [before?.userId, after?.userId].filter(
          (value): value is string => typeof value === "string" && value.length > 0,
        ),
      ),
    );

    await Promise.all(userIds.map((uid) => recalculateUserVerification(uid)));
  },
);

export const recalculateVerificationOnReportWrite = onDocumentWritten(
  "reports/{reportId}",
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    const userIds = await getImpactedVerificationUserIdsFromReport(before, after);

    await Promise.all(userIds.map((uid) => recalculateUserVerification(uid)));
  },
);

export const processAdminDeletionRequest = onDocumentCreated(
  "adminDeletionRequests/{requestId}",
  async (event) => {
    const snapshot = event.data;

    if (!snapshot) {
      return;
    }

    const data = snapshot.data();
    const targetUid =
      typeof data.targetUid === "string" ? data.targetUid.trim() : "";
    const requestedBy =
      typeof data.requestedBy === "string" ? data.requestedBy.trim() : "";
    const selfDelete = data.selfDelete === true;

    if (!targetUid || !requestedBy || (targetUid === requestedBy && !selfDelete)) {
      await snapshot.ref.update({
        error: "Pedido invalido.",
        status: "failed",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return;
    }

    const requester = await admin.auth().getUser(requestedBy).catch(() => null);
    const requesterEmail = requester?.email?.toLowerCase() ?? null;
    const adminsSnap = await db.collection("appConfig").doc("admins").get();
    const adminEmails = adminsSnap.data()?.adminEmails;
    const isAdminUser =
      requester?.customClaims?.admin === true ||
      (Array.isArray(adminEmails) &&
        typeof requesterEmail === "string" &&
        adminEmails.includes(requesterEmail));

    if (!isAdminUser) {
      await snapshot.ref.update({
        error: "Permissao admin obrigatoria.",
        status: "failed",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return;
    }

    await snapshot.ref.update({
      status: "deleting",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const targetUser = await admin.auth().getUser(targetUid).catch((error) => {
      if (error?.code === "auth/user-not-found") {
        return null;
      }

      throw error;
    });

    await deleteAccountEverywhere(targetUid, targetUser?.email?.toLowerCase() ?? null);
  },
);
