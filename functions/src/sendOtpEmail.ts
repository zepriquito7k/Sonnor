import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { Resend } from "resend";

if (!admin.apps.length) {
  admin.initializeApp();
}

const resendKey = process.env.RESEND_API_KEY!;
const resend = new Resend(resendKey);

// Gera código REALMENTE novo SEM caches
function generateOTP(): string {
  const code = Math.floor(1000 + Math.random() * 9000).toString();
  console.log("Generated OTP:", code);
  return code;
}

export const sendOtpEmail = functions.https.onCall(
  async (request: functions.https.CallableRequest<any>) => {
    const email = request.data.email;

    if (!email) {
      throw new functions.https.HttpsError("invalid-argument", "Email missing");
    }

    const code = generateOTP(); // <-- novo sempre

    console.log("Saving OTP for:", email, "CODE:", code);

    // GUARDA SEM MERGE (apaga o doc anterior e cria novo)
    await admin
      .firestore()
      .collection("otpCodes")
      .doc(email)
      .set(
        {
          code,
          createdAt: admin.firestore.Timestamp.now(),
          expiresAt: admin.firestore.Timestamp.fromMillis(
            Date.now() + 5 * 60 * 1000
          ),
        },
        { merge: false } // <-- ISTO FORÇA A SUBSTITUIÇÃO SEM FALHAS
      );

    // ENVIA EMAIL
    await resend.emails.send({
      from: "Sonnor <onboarding@resend.dev>",
      to: email,
      subject: "Your verification code",
      html: `
        <div style="font-family: sans-serif;">
          <h2>Your verification code</h2>
          <h1 style="font-size: 38px; letter-spacing: 8px;">${code}</h1>
          <p>This code expires in 5 minutes.</p>
        </div>
      `,
    });

    return { success: true };
  }
);
