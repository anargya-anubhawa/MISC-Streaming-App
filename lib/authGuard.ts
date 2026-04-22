import {
  onAuthStateChanged,
  signOut,
  User,
} from "firebase/auth";
import {
  doc,
  getDoc,
} from "firebase/firestore";
import { auth, db } from "./firebase";

/**
 * Tunggu sampai Firebase Auth siap
 */
function waitForAuth(): Promise<User | null> {
  return new Promise((resolve) => {
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
 * Ambil user data dengan retry (hindari race condition Firestore)
 */
async function getUserDataWithRetry(
  uid: string,
  retries: number = 3,
  interval: number = 300
): Promise<any | null> {
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
 * Guard utama
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

    // 3. Ambil data firestore (dengan retry)
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

      // 🔥 Retry sekali (hindari race condition setelah login)
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

    // 5. Semua aman
    return user;
  } catch (error) {
    console.error("guardUser error:", error);
    return await redirectToLogin("Unexpected error");
  }
}