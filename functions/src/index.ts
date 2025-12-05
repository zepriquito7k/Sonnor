import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

admin.initializeApp();
const db = admin.firestore();

/**
 * Gera um código OTP de 4 dígitos
 */
function generateOtp(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Função: sendOtpEmail
 * Gera o código e guarda no Firestore
 */
export const sendOtpEmail = functions.https.onCall(async (request) => {
  const emailRaw = request.data?.email;

  if (!emailRaw || typeof emailRaw !== "string") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Email é obrigatório."
    );
  }

  const email = emailRaw.trim().toLowerCase();
  const code = generateOtp();

  const expiresAt = admin.firestore.Timestamp.fromDate(
    new Date(Date.now() + 5 * 60 * 1000) // 5 minutos
  );

  await db.collection("otps").doc(email).set(
    {
      email,
      code,
      expiresAt,
      used: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  console.log(`OTP enviado para ${email}: ${code}`);

  return { success: true };
});

/**
 * Função: verifyOtp
 * Valida o código guardado no Firestore
 */
export const verifyOtp = functions.https.onCall(async (request) => {
  const emailRaw = request.data?.email;
  const codeRaw = request.data?.code;

  if (!emailRaw || typeof emailRaw !== "string") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Email é obrigatório."
    );
  }

  if (!codeRaw || typeof codeRaw !== "string") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Código é obrigatório."
    );
  }

  const email = emailRaw.trim().toLowerCase();
  const code = codeRaw.trim();

  const docRef = db.collection("otps").doc(email);
  const snap = await docRef.get();

  if (!snap.exists) {
    throw new functions.https.HttpsError("not-found", "Código não encontrado.");
  }

  const data = snap.data() as {
    code: string;
    expiresAt: admin.firestore.Timestamp;
    used?: boolean;
  };

  if (data.used) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Código já utilizado."
    );
  }

  const now = admin.firestore.Timestamp.now();
  if (data.expiresAt.toMillis() < now.toMillis()) {
    throw new functions.https.HttpsError(
      "deadline-exceeded",
      "Código expirado."
    );
  }

  if (data.code !== code) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Código incorreto."
    );
  }

  await docRef.update({
    used: true,
    usedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true };
});
