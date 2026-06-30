import { httpsCallable } from "firebase/functions";

import { functions } from "./config";
import { clearContentCache } from "./contentClient";
import { getCallableIdToken } from "./socialClient";

export async function deleteOwnedAlbum(albumId: string) {
  const idToken = await getCallableIdToken();

  await httpsCallable(functions, "deleteOwnedAlbum")({ albumId, idToken });
  clearContentCache();
}
