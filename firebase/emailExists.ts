import { fetchSignInMethodsForEmail } from "firebase/auth";
import { auth } from "./config";

export async function emailExists(email: string): Promise<boolean> {
  try {
    const formatted = email.trim().toLowerCase();

    const methods = await fetchSignInMethodsForEmail(auth, formatted);

    console.log("METHODS RETURNED:", methods);

    return methods.length > 0;
  } catch (err) {
    console.log("EMAIL EXISTS ERROR:", err);
    return false;
  }
}
