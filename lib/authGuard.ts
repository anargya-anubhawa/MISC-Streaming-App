"use client";

import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { AppUserRecord, SessionRecord } from "./types";

function waitForAuthState(auth: any) {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      resolve(user);
    });
  });
}

async function redirectToLogin(auth: any, message?: string) {
  if (message) alert(message);
  localStorage.removeItem("sessionId");
  await signOut(auth).catch(() => {});
  window.location.replace("/login");
}

export async function guardUser() {
  const auth = getAuth();
  const user: any = await waitForAuthState(auth);

  if (!user) {
    window.location.replace("/login");
    return null;
  }

  try {
    const userSnap = await getDoc(doc(db, "users", user.uid));

    if (!userSnap.exists()) {
      await redirectToLogin(auth);
      return null;
    }

    const userData = userSnap.data() as AppUserRecord;

    const localSessionId = localStorage.getItem("sessionId");

    // 🔥 FIX: jangan langsung logout kalau session belum kebentuk
    if (!localSessionId) {
      console.warn("No session yet, allow temporary access");
      return user;
    }

    if (localSessionId !== userData.activeSessionId) {
      await redirectToLogin(auth, "Session tidak valid");
      return null;
    }

    const sessionSnap = await getDoc(doc(db, "sessions", localSessionId));

    if (!sessionSnap.exists()) {
      console.warn("Session doc missing, allow temporary");
      return user;
    }

    const sessionData = sessionSnap.data() as SessionRecord;

    if (sessionData.uid !== user.uid) {
      await redirectToLogin(auth);
      return null;
    }

    return user;
  } catch (err) {
    console.error(err);
    await redirectToLogin(auth);
    return null;
  }
}