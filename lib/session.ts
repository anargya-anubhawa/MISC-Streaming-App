import { doc, setDoc, getFirestore, serverTimestamp } from "firebase/firestore";

/**
 * Membuat session user (SAFE + ANTI ERROR)
 */
export async function createSession(userId: string) {
  const db = getFirestore();

  try {
    const sessionId = crypto.randomUUID();

    // simpan local dulu
    localStorage.setItem("sessionId", sessionId);

    console.log("CREATE SESSION START:", {
      userId,
      sessionId,
    });

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

    // rollback
    localStorage.removeItem("sessionId");

    throw error;
  }
}

/**
 * Clear session lokal
 */
export function clearSession() {
  localStorage.removeItem("sessionId");
}