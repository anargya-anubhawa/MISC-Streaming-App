import {
  doc,
  setDoc,
  getDoc,
  getFirestore,
  serverTimestamp,
} from "firebase/firestore";

/**
 * Ambil instance Firestore (tanpa tergantung firebase.ts export)
 */
function getDB() {
  return getFirestore();
}

/**
 * Delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * CREATE SESSION
 */
export async function createSession(userId: string): Promise<string> {
  const db = getDB();

  try {
    const sessionId = crypto.randomUUID();

    console.log("CREATE SESSION START:", {
      userId,
      sessionId,
    });

    // simpan ke localStorage dulu
    localStorage.setItem("sessionId", sessionId);

    // simpan ke Firestore
    await setDoc(
      doc(db, "users", userId),
      {
        activeSessionId: sessionId,
        lastLogin: serverTimestamp(),
      },
      { merge: true }
    );

    console.log("CREATE SESSION SUCCESS");

    return sessionId;
  } catch (error) {
    console.error("CREATE SESSION ERROR:", error);

    // rollback kalau gagal
    localStorage.removeItem("sessionId");

    throw error;
  }
}

/**
 * GET LOCAL SESSION
 */
export function getLocalSession(): string | null {
  try {
    return localStorage.getItem("sessionId");
  } catch (error) {
    console.error("GET LOCAL SESSION ERROR:", error);
    return null;
  }
}

/**
 * CLEAR LOCAL SESSION
 */
export function clearSession(): void {
  try {
    localStorage.removeItem("sessionId");
    console.log("SESSION CLEARED");
  } catch (error) {
    console.error("CLEAR SESSION ERROR:", error);
  }
}

/**
 * GET USER SESSION FROM FIRESTORE
 */
export async function getUserSession(
  userId: string,
  retry: number = 2
): Promise<string | null> {
  const db = getDB();

  for (let i = 0; i < retry; i++) {
    try {
      const snap = await getDoc(doc(db, "users", userId));

      if (snap.exists()) {
        const data = snap.data();
        return data.activeSessionId || null;
      }
    } catch (error) {
      console.error("GET USER SESSION ERROR:", error);
    }

    await delay(300);
  }

  return null;
}

/**
 * VALIDATE SESSION (helper)
 */
export async function isSessionValid(
  userId: string
): Promise<boolean> {
  try {
    const localSession = getLocalSession();

    if (!localSession) return false;

    const firestoreSession = await getUserSession(userId);

    console.log("VALIDATE SESSION:", {
      localSession,
      firestoreSession,
    });

    return localSession === firestoreSession;
  } catch (error) {
    console.error("VALIDATE SESSION ERROR:", error);
    return false;
  }
}