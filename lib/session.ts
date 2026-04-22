import { db } from "./firebase";
import {
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";

/* ========================
   HELPERS
======================== */

function generateUnlockToken() {
  return Math.random().toString(36).slice(2);
}

async function safeHash(token: string) {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return token;
  }
}

async function getPublicIp() {
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const data = await res.json();
    return data.ip || "unknown";
  } catch {
    return "unknown";
  }
}

/* ========================
   CREATE SESSION
======================== */

export async function createSession(
  uid: string,
  sessionId: string,
  deviceInfo: string,
  deviceId: string,
  email: string
) {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return;

  const userData: any = userSnap.data();

  const token = generateUnlockToken();
  const tokenHash = await safeHash(token);
  const ip = await getPublicIp();

  // hapus session lama
  if (userData.activeSessionId) {
    await deleteDoc(doc(db, "sessions", userData.activeSessionId)).catch(() => {});
  }

  await setDoc(doc(db, "sessions", sessionId), {
    uid,
    email,
    deviceInfo,
    deviceId,
    ip,
    createdAt: new Date(),
    unlockTokenHash: tokenHash,
    isUnlocked: false,
  });

  await setDoc(
    userRef,
    {
      activeSessionId: sessionId,
      lastLogin: new Date(),
    },
    { merge: true }
  );

  return token;
}

/* ========================
   🔥 FIX 1: LOGOUT ALL
======================== */

export async function logoutAllSessions(uid: string) {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) return;

  const userData: any = userSnap.data();

  if (userData.activeSessionId) {
    await deleteDoc(doc(db, "sessions", userData.activeSessionId)).catch(() => {});
  }

  await updateDoc(userRef, {
    activeSessionId: null,
  });
}

/* ========================
   🔥 FIX 2: RESET TOKEN
======================== */

export async function resetUnlockToken(sessionId: string) {
  const sessionRef = doc(db, "sessions", sessionId);
  const sessionSnap = await getDoc(sessionRef);

  if (!sessionSnap.exists()) return null;

  const newToken = generateUnlockToken();
  const newHash = await safeHash(newToken);

  await updateDoc(sessionRef, {
    unlockTokenHash: newHash,
    isUnlocked: false,
  });

  return newToken;
}