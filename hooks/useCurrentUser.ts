import { User, onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";

import { auth } from "../firebase/config";

export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return { user, loading };
}
