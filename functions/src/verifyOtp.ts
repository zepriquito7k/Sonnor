import * as crypto from "crypto";
import * as admin from "firebase-admin";
import { HttpsError, onCall } from "firebase-functions/v2/https";

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export const verifyOtp = onCall(async (request) => {
  const email = request.data.email?.trim().toLowerCase();
  const code = request.data.code?.trim();

  if (!email || !code) {
    throw new HttpsError("invalid-argument", "Dados inválidos.");
  }

  const docRef = db.collection("otps").doc(email);
  const snap = await docRef.get();

  if (!snap.exists) {
    throw new HttpsError("not-found", "Código não encontrado.");
  }

  const data = snap.data() as any;

  if (data.expiresAt.toMillis() < Date.now()) {
    await docRef.delete();
    throw new HttpsError("deadline-exceeded", "Código expirado.");
  }

  if (data.attempts >= 5) {
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

  return { success: true };
});
