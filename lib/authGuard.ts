import {
  onAuthStateChanged,
  signOut,
  getAuth,
  User,
} from "firebase/auth";

import {
  doc,
  getDoc,
  getFirestore,
} from "firebase/firestore";

/**
 * OPTIONS TYPE
 */
type GuardOptions = {
  requireUnlock?: boolean;
};

/**
 * Tunggu Firebase Auth siap
 */
function waitForAuth(): Promise<User | null> {
  return new Promise((resolve) => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

/**
 * Delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry ambil data user (hindari race condition)
 */
async function getUserDataWithRetry(
  uid: string,
  retries: number = 3,
  interval: number = 300
): Promise<any | null> {
  const db = getFirestore();

  for (let i = 0; i < retries; i++) {
    try {
      const snap = await getDoc(doc(db, "users", uid));

      if (snap.exists()) {
        return snap.data();
      }
    } catch (error) {
      console.error("Error get user data:", error);
    }

    await delay(interval);
  }

  return null;
}

/**
 * Redirect + cleanup
 */
async function redirectToLogin(reason?: string): Promise<null> {
  try {
    console.warn("Redirecting to login:", reason);

    const auth = getAuth();
    await signOut(auth);
  } catch (error) {
    console.error("Error signOut:", error);
  }

  try {
    localStorage.removeItem("sessionId");
  } catch (error) {
    console.error("Error clearing localStorage:", error);
  }

  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }

  return null;
}

/**
 * 🔥 MAIN GUARD (sudah support options)
 */
export async function guardUser(
  options: GuardOptions = {}
): Promise<User | null> {
  try {
    const { requireUnlock = false } = options;

    // 1. Tunggu auth ready
    const user = await waitForAuth();

    if (!user) {
      return await redirectToLogin("User belum login");
    }

    // 2. Ambil session lokal
    let localSessionId: string | null = null;

    try {
      localSessionId = localStorage.getItem("sessionId");
    } catch (error) {
      console.error("Error localStorage:", error);
    }

    // 3. Ambil user data
    const userData = await getUserDataWithRetry(user.uid);

    if (!userData) {
      return await redirectToLogin("User data tidak ditemukan");
    }

    const firestoreSessionId = userData.activeSessionId || null;

    console.log("SESSION CHECK:", {
      uid: user.uid,
      localSessionId,
      firestoreSessionId,
    });

    // 4. Validasi session
    if (!localSessionId || localSessionId !== firestoreSessionId) {
      console.warn("Session mismatch");

      // retry sekali (race condition fix)
      await delay(500);

      const retryData = await getUserDataWithRetry(user.uid, 2, 300);
      const retrySessionId = retryData?.activeSessionId || null;

      console.log("RETRY CHECK:", {
        localSessionId,
        retrySessionId,
      });

      if (localSessionId && localSessionId === retrySessionId) {
        return user;
      }

      return await redirectToLogin("Session invalid");
    }

    // 5. OPTIONAL: requireUnlock logic
    if (requireUnlock) {
      if (!userData.isUnlocked) {
        console.warn("User belum unlock");

        // kamu bisa redirect ke halaman unlock kalau ada
        if (typeof window !== "undefined") {
          window.location.href = "/unlock";
        }

        return null;
      }
    }

    return user;
  } catch (error) {
    console.error("guardUser error:", error);
    return await redirectToLogin("Unexpected error");
  }
}