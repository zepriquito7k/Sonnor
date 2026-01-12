import { fetchSignInMethodsForEmail } from "firebase/auth";
import { auth } from "./config";

export async function emailExists(email: string): Promise<boolean> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const methods = await fetchSignInMethodsForEmail(auth, cleanEmail);

    console.log("FIREBASE METHODS:", methods);
    return methods.length > 0;
  } catch (err) {
    console.log("EMAIL EXISTS ERROR:", err);
    return false;
  }
}
