import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { httpsCallable } from "firebase/functions";

import { auth, functions } from "./config";
import { ensureUserProfile } from "./userProfile";

type VerifyPasswordResetCodeResponse = {
  resetToken: string;
  success: boolean;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function tryEnsureUserProfile(user: Parameters<typeof ensureUserProfile>[0]) {
  try {
    await ensureUserProfile(user);
  } catch (error) {
    console.log("ENSURE USER PROFILE ERROR:", error);
  }
}

function waitForSignedInUser() {
  return new Promise<User>((resolve, reject) => {
    if (auth.currentUser) {
      resolve(auth.currentUser);
      return;
    }

    const timeout = setTimeout(() => {
      unsubscribe();
      reject(Object.assign(new Error("Session expired. Sign in again."), {
        code: "auth/no-current-user",
      }));
    }, 5000);

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      if (!nextUser) {
        return;
      }

      clearTimeout(timeout);
      unsubscribe();
      resolve(nextUser);
    });
  });
}

export async function register(email: string, password: string) {
  const credentials = await createUserWithEmailAndPassword(
    auth,
    normalizeEmail(email),
    password,
  );

  await tryEnsureUserProfile(credentials.user);

  return credentials;
}

export async function login(email: string, password: string) {
  const credentials = await signInWithEmailAndPassword(
    auth,
    normalizeEmail(email),
    password,
  );

  await tryEnsureUserProfile(credentials.user);

  return credentials;
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

export async function sendDeleteAccountCode(email: string) {
  const user = await waitForSignedInUser();
  const idToken = await user.getIdToken(true);
  const sendDeleteAccountOtpEmail = httpsCallable<
    { email: string; idToken?: string },
    { success: boolean }
  >(functions, "sendDeleteAccountOtpEmail");

  return sendDeleteAccountOtpEmail({ email: normalizeEmail(email), idToken });
}

export async function deleteAccountWithCode(input: {
  code: string;
  confirmation: string;
  email: string;
}) {
  const user = await waitForSignedInUser();
  const idToken = await user.getIdToken(true);
  const payload = {
    email: normalizeEmail(input.email),
    code: input.code.trim(),
    confirmation: input.confirmation.trim(),
    idToken,
  };
  const deleteAccountWithOtp = httpsCallable<
    { code: string; confirmation: string; email: string; idToken?: string },
    { success: boolean }
  >(functions, "deleteAccountWithOtp");

  try {
    return await deleteAccountWithOtp(payload);
  } catch (error) {
    if (getFirebaseErrorCode(error) !== "functions/unauthenticated") {
      throw error;
    }

    return postDeleteAccountEndpoint(payload);
  }
}

export async function sendSignupCode(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const sendSignupOtpEmail = httpsCallable<
    { email: string },
    { success: boolean }
  >(functions, "sendSignupOtpEmail");

  try {
    return await sendSignupOtpEmail({ email: normalizedEmail });
  } catch (error) {
    if (!shouldUseSignupHttpFallback(error)) {
      throw error;
    }

    return postSignupEndpoint("sendSignupOtpHttp", {
      email: normalizedEmail,
    });
  }
}

export async function verifySignupCode(email: string, code: string) {
  const normalizedEmail = normalizeEmail(email);
  const verifySignupOtp = httpsCallable<
    { code: string; email: string },
    { success: boolean }
  >(functions, "verifySignupOtp");

  try {
    return await verifySignupOtp({
      email: normalizedEmail,
      code: code.trim(),
    });
  } catch (error) {
    if (!shouldUseSignupHttpFallback(error)) {
      throw error;
    }

    return postSignupEndpoint("verifySignupOtpHttp", {
      email: normalizedEmail,
      code: code.trim(),
    });
  }
}

function getFirebaseErrorCode(error: unknown) {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return null;
  }

  return typeof (error as { code?: unknown }).code === "string"
    ? (error as { code: string }).code
    : null;
}

function shouldUseSignupHttpFallback(error: unknown) {
  const code = getFirebaseErrorCode(error);

  return (
    code === "functions/permission-denied" ||
    code === "functions/not-found" ||
    code === "functions/unavailable" ||
    (code === null &&
      typeof (error as { message?: unknown })?.message === "string" &&
      ((error as { message: string }).message.includes("Failed to fetch") ||
        (error as { message: string }).message.includes("Network request failed")))
  );
}

async function postSignupEndpoint(
  functionName: "sendSignupOtpHttp" | "verifySignupOtpHttp",
  body: Record<string, string>,
) {
  const regions = ["us-central1", "europe-west1"];
  let lastError: unknown = null;

  for (const region of regions) {
    try {
      const response = await fetch(
        `https://${region}-sonnor-d8a30.cloudfunctions.net/${functionName}`,
        {
          body: JSON.stringify(body),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        if (response.status === 404) {
          lastError = Object.assign(new Error("Function not found."), {
            code: "functions/not-found",
          });
          continue;
        }

        const code =
          typeof payload?.code === "string"
            ? `functions/${payload.code}`
            : response.status === 403
              ? "functions/permission-denied"
              : "functions/internal";
        const fallbackMessage =
          functionName === "sendSignupOtpHttp"
            ? "Could not send the code."
            : "Could not confirmar o code.";
        const message =
          typeof payload?.error === "string" ? payload.error : fallbackMessage;

        throw Object.assign(new Error(message), { code });
      }

      return payload;
    } catch (error: any) {
      lastError = error;

      if (
        typeof error?.message !== "string" ||
        !error.message.includes("404")
      ) {
        throw error;
      }
    }
  }

  throw lastError;
}

async function postDeleteAccountEndpoint(body: {
  code: string;
  confirmation: string;
  email: string;
  idToken: string;
}) {
  const regions = ["us-central1", "europe-west1"];
  let lastError: unknown = null;

  for (const region of regions) {
    try {
      const response = await fetch(
        `https://${region}-sonnor-d8a30.cloudfunctions.net/deleteAccountWithOtpHttp`,
        {
          body: JSON.stringify(body),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        },
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        if (response.status === 404) {
          lastError = Object.assign(new Error("Function not found."), {
            code: "functions/not-found",
          });
          continue;
        }

        const code =
          typeof payload?.code === "string"
            ? `functions/${payload.code}`
            : response.status === 401
              ? "functions/unauthenticated"
              : "functions/internal";
        const message =
          typeof payload?.error === "string"
            ? payload.error
            : "Could not delete the account.";

        throw Object.assign(new Error(message), { code });
      }

      return payload;
    } catch (error: any) {
      lastError = error;

      if (
        typeof error?.message !== "string" ||
        !error.message.includes("404")
      ) {
        throw error;
      }
    }
  }

  throw lastError;
}
