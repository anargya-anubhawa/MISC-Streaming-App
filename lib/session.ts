import { db } from "./firebase";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import type { AppUserRecord, SessionRecord } from "./types";

const MAX_USER_SESSIONS = 2;

function createDefaultUserRecord(email: string): Omit<AppUserRecord, "id"> {
  return {
    name: "",
    nim: "",
    phone: "",
    email,
    role: "user",
    activeSessionId: "",
    activeSessionIds: [],
    createdAt: new Date(),
    isFrozen: false,
    isUnlocked: false,
  };
}

export type CreateSessionResult =
  | { status: "created" | "reused"; sessionId: string }
  | { status: "device-limit-reached"; sessionId?: never };

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

async function getSessionsForUser(uid: string) {
  const sessionsQuery = query(
    collection(db, "sessions"),
    where("uid", "==", uid)
  );
  const sessionsSnap = await getDocs(sessionsQuery);

  return sessionsSnap.docs.map((sessionDoc) => ({
    id: sessionDoc.id,
    ...sessionDoc.data(),
  })) as SessionRecord[];
}

export async function checkUserStatus(uid: string) {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return snap.data();
}

export async function ensureUserRecord(uid: string, email: string) {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    const defaultUser = createDefaultUserRecord(email);
    await setDoc(userRef, defaultUser, { merge: true });

    return {
      id: uid,
      ...defaultUser,
    } as AppUserRecord;
  }

  const userData = userSnap.data() as AppUserRecord;
  const normalizedUser: Partial<AppUserRecord> = {};

  if (!userData.email && email) {
    normalizedUser.email = email;
  }

  if (!userData.role) {
    normalizedUser.role = "user";
  }

  if (userData.isFrozen === undefined) {
    normalizedUser.isFrozen = false;
  }

  if (userData.isUnlocked === undefined) {
    normalizedUser.isUnlocked = false;
  }

  if (!userData.activeSessionIds) {
    normalizedUser.activeSessionIds = [];
  }

  if (userData.activeSessionId === undefined) {
    normalizedUser.activeSessionId = "";
  }

  if (Object.keys(normalizedUser).length > 0) {
    await setDoc(userRef, normalizedUser, { merge: true });
  }

  return {
    ...userData,
    ...normalizedUser,
    id: userSnap.id,
  } as AppUserRecord;
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
): Promise<CreateSessionResult | undefined> {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.data() as AppUserRecord | undefined;
  const ip = await getPublicIp();

  if (!userSnap.exists() || !userData) return;

  if (userData.role !== "admin") {
    const sessions = await getSessionsForUser(uid);
    const existingDeviceSession = sessions.find(
      (session) => session.deviceId === deviceId
    );

    if (existingDeviceSession) {
      await setDoc(
        doc(db, "sessions", existingDeviceSession.id),
        {
          email,
          deviceInfo,
          deviceId,
          ip,
          lastSeenAt: new Date(),
        },
        { merge: true }
      );

      await setDoc(
        userRef,
        {
          email,
          activeSessionId: existingDeviceSession.id,
          activeSessionIds: Array.from(
            new Set(sessions.map((session) => session.id))
          ),
          deviceInfo,
          deviceId,
          lastLogin: new Date(),
          isFrozen: false,
        },
        { merge: true }
      );

      return { status: "reused", sessionId: existingDeviceSession.id };
    }

    if (sessions.length >= MAX_USER_SESSIONS) {
      await deleteSessionsForUser(uid);
      await setDoc(
        userRef,
        {
          activeSessionId: "",
          activeSessionIds: [],
          isUnlocked: false,
          lastLogin: new Date(),
        },
        { merge: true }
      );

      return { status: "device-limit-reached" };
    }
  }

  await setDoc(doc(db, "sessions", sessionId), {
    uid,
    email,
    deviceInfo,
    deviceId,
    ip,
    createdAt: new Date(),
  });

  const sessions = userData.role === "admin" ? [] : await getSessionsForUser(uid);
  const activeSessionIds = Array.from(
    new Set([...sessions.map((session) => session.id), sessionId])
  );

  await setDoc(
    userRef,
    {
      email,
      activeSessionId: sessionId,
      activeSessionIds,
      deviceInfo,
      deviceId,
      lastLogin: new Date(),
      isFrozen: false,
    },
    { merge: true }
  );

  return { status: "created", sessionId };
}

export async function logoutAllSessions(uid: string) {
  await deleteSessionsForUser(uid);

  await setDoc(
    doc(db, "users", uid),
    { activeSessionId: "", activeSessionIds: [] },
    { merge: true }
  );
}
