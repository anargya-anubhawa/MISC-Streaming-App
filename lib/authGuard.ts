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
 * Tunggu sampai Firebase Auth siap
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
 * Ambil data user dengan retry (hindari race condition)
 */
async function getUserDataWithRetry(
  uid: string,
  retries: number = 3,
  interval: number = 300
): Promise<any | null> {
  const db = getFirestore();

  for (let i = 0; i < retries; i++) {
    try {
      const ref = doc(db, "users", uid);
      const snap = await getDoc(ref);

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
 * Redirect ke login + cleanup session
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
 * Guard utama (ANTI RACE CONDITION)
 */
export async function guardUser(): Promise<User | null> {
  try {
    // 1. Tunggu auth siap
    const user = await waitForAuth();

    if (!user) {
      return await redirectToLogin("User belum login");
    }

    // 2. Ambil session lokal
    let localSessionId: string | null = null;

    try {
      localSessionId = localStorage.getItem("sessionId");
    } catch (error) {
      console.error("Error reading localStorage:", error);
    }

    // 3. Ambil data user firestore (retry)
    const userData = await getUserDataWithRetry(user.uid, 3, 300);

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
      console.warn("Session mismatch detected");

      // 🔥 retry sekali (hindari race setelah login)
      await delay(500);

      const retryData = await getUserDataWithRetry(user.uid, 2, 300);
      const retrySessionId = retryData?.activeSessionId || null;

      console.log("RETRY SESSION CHECK:", {
        localSessionId,
        retrySessionId,
      });

      if (localSessionId && localSessionId === retrySessionId) {
        console.log("Session valid after retry");
        return user;
      }

      return await redirectToLogin("Session tidak valid");
    }

    // 5. Aman
    return user;
  } catch (error) {
    console.error("guardUser error:", error);
    return await redirectToLogin("Unexpected error");
  }
}