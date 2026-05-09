import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { httpsCallable } from "firebase/functions";

import { auth, functions } from "./config";

type VerifyPasswordResetCodeResponse = {
  resetToken: string;
  success: boolean;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function register(email: string, password: string) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function login(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function logout() {
  return signOut(auth);
}

export async function sendPasswordResetCode(email: string) {
  const sendOtpEmail = httpsCallable<{ email: string }, { success: boolean }>(
    functions,
    "sendOtpEmail",
  );

  return sendOtpEmail({ email: normalizeEmail(email) });
}

export async function verifyPasswordResetCode(email: string, code: string) {
  const verifyOtp = httpsCallable<
    { code: string; email: string },
    VerifyPasswordResetCodeResponse
  >(functions, "verifyOtp");

  const response = await verifyOtp({
    email: normalizeEmail(email),
    code: code.trim(),
  });

  return response.data;
}

export async function completePasswordReset(
  email: string,
  resetToken: string,
  newPassword: string,
) {
  const resetPasswordWithOtp = httpsCallable<
    { email: string; newPassword: string; resetToken: string },
    { success: boolean }
  >(functions, "resetPasswordWithOtp");

  return resetPasswordWithOtp({
    email: normalizeEmail(email),
    resetToken,
    newPassword,
  });
}

export const resetPassword = sendPasswordResetCode;
