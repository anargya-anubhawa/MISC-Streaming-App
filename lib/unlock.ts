import { db } from "./firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import type { SessionRecord } from "./types";

async function hashToken(token: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  return hashArray.map((value) => value.toString(16).padStart(2, "0")).join("");
}

export async function verifyUnlockToken(sessionId: string, input: string) {
  const ref = doc(db, "sessions", sessionId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    return { success: false, message: "Session tidak ditemukan" };
  }

  const data = snap.data() as SessionRecord;
  if ((data.unlockAttempts || 0) >= 5) {
    return { success: false, message: "Terlalu banyak percobaan" };
  }

  const hash = await hashToken(input);
  if (hash !== data.unlockTokenHash) {
    await updateDoc(ref, {
      unlockAttempts: (data.unlockAttempts || 0) + 1,
    });

    return { success: false, message: "Token salah" };
  }

  await updateDoc(ref, {
    isUnlocked: true,
    unlockAttempts: 0,
  });

  return { success: true };
}
