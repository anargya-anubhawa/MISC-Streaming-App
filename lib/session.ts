import { db } from "./firebase";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import type { AppUserRecord } from "./types";

function generateUnlockToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);

  return Array.from(array, (value) =>
    value.toString(16).padStart(2, "0")
  ).join("");
}

async function hashToken(token: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  return hashArray.map((value) => value.toString(16).padStart(2, "0")).join("");
}

async function getPublicIp() {
  try {
    const response = await fetch("https://api.ipify.org?format=json");
    const data = (await response.json()) as { ip?: string };
    return data.ip || "Tidak tersedia";
  } catch {
    return "Tidak tersedia";
  }
}

async function deleteSessionsForUser(uid: string) {
  const sessionsQuery = query(
    collection(db, "sessions"),
    where("uid", "==", uid)
  );
  const sessionsSnap = await getDocs(sessionsQuery);

  await Promise.all(
    sessionsSnap.docs.map((sessionDoc) => deleteDoc(sessionDoc.ref))
  );
}

export async function checkUserStatus(uid: string) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return snap.data();
}

export async function isProfileComplete(uid: string): Promise<boolean> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return false;

  const data = snap.data() as AppUserRecord;
  return Boolean(data.name && data.nim && data.phone);
}

export async function createSession(
  uid: string,
  sessionId: string,
  deviceInfo: string,
  deviceId: string,
  email: string
) {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.data() as AppUserRecord | undefined;
  const ip = await getPublicIp();
  const token = generateUnlockToken();
  const tokenHash = await hashToken(token);

  if (!userSnap.exists() || !userData) return;
  if (userData.role !== "admin" && userData.activeSessionId) {
    await deleteDoc(doc(db, "sessions", userData.activeSessionId)).catch(
      () => undefined
    );
  }

  await setDoc(doc(db, "sessions", sessionId), {
    uid,
    email,
    deviceInfo,
    deviceId,
    ip,
    createdAt: new Date(),
    unlockTokenHash: tokenHash,
    unlockAttempts: 0,
    isUnlocked: false,
  });

  await setDoc(
    userRef,
    {
      email,
      activeSessionId: sessionId,
      deviceInfo,
      deviceId,
      lastLogin: new Date(),
      isFrozen: false,
    },
    { merge: true }
  );

  return token;
}

export async function resetUnlockToken(sessionId: string) {
  const token = generateUnlockToken();
  const tokenHash = await hashToken(token);

  await updateDoc(doc(db, "sessions", sessionId), {
    unlockTokenHash: tokenHash,
    unlockAttempts: 0,
    isUnlocked: false,
  });

  return token;
}

export async function logoutAllSessions(uid: string) {
  await deleteSessionsForUser(uid);

  await setDoc(
    doc(db, "users", uid),
    { activeSessionId: "" },
    { merge: true }
  );
}
