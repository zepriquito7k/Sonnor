import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

if (!admin.apps.length) {
  admin.initializeApp();
}

export const verifyOtp = functions.https.onCall(
  async (request: functions.https.CallableRequest<any>) => {
    const email = request.data.email;
    const code = request.data.code;

    if (!email || !code) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing fields"
      );
    }

    const docRef = admin.firestore().collection("otpCodes").doc(email);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new functions.https.HttpsError("not-found", "OTP not found");
    }

    const dataDB = doc.data();

    if (!dataDB || !dataDB.code || !dataDB.expiresAt) {
      throw new functions.https.HttpsError("not-found", "Invalid OTP data");
    }

    // validar código
    if (dataDB.code !== code) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Incorrect code"
      );
    }

    // validar expiração
    const expiresAt = dataDB.expiresAt.toMillis();
    if (Date.now() > expiresAt) {
      throw new functions.https.HttpsError("deadline-exceeded", "Code expired");
    }

    // OTP correto → apagar doc
    await docRef.delete();

    return { success: true };
  }
);
