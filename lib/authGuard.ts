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

type GuardOptions = {
  requireUnlock?: boolean;
};

function waitForAuth(): Promise<User | null> {
  return new Promise((resolve) => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

async function getUserData(uid: string) {
  const db = getFirestore();

  try {
    const snap = await getDoc(doc(db, "users", uid));

    if (!snap.exists()) return null;

    return snap.data();
  } catch (error) {
    console.error("GET USER ERROR:", error);
    return null;
  }
}

async function redirectToLogin(reason?: string) {
  console.warn("REDIRECT LOGIN:", reason);

  try {
    const auth = getAuth();
    await signOut(auth);
  } catch (error) {
    console.error("SIGNOUT ERROR:", error);
  }

  localStorage.removeItem("sessionId");

  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }

  return null;
}

export async function guardUser(
  options: GuardOptions = {}
): Promise<User | null> {
  try {
    const user = await waitForAuth();

    if (!user) {
      return redirectToLogin("Belum login");
    }

    const localSessionId = localStorage.getItem("sessionId");

    const userData = await getUserData(user.uid);

    if (!userData) {
      return redirectToLogin("User tidak ditemukan");
    }

    const firestoreSessionId = userData.activeSessionId;

    console.log("SESSION CHECK:", {
      localSessionId,
      firestoreSessionId,
    });

    // 🔥 FIX UTAMA: retry biar gak false logout
    if (!localSessionId || localSessionId !== firestoreSessionId) {
      console.warn("SESSION MISMATCH");

      await delay(500);

      const retryData = await getUserData(user.uid);

      if (
        retryData &&
        localSessionId === retryData.activeSessionId
      ) {
        console.log("SESSION OK AFTER RETRY");
        return user;
      }

      return redirectToLogin("Session invalid");
    }

    // optional unlock
    if (options.requireUnlock && !userData.isUnlocked) {
      window.location.href = "/unlock";
      return null;
    }

    return user;
  } catch (error) {
    console.error("GUARD ERROR:", error);
    return redirectToLogin("Error");
  }
}