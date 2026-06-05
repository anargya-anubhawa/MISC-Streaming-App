"use client";

import type { Auth, User } from "firebase/auth";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import {
  createCompleteProfilePath,
  createLoginPath,
  getCurrentPathWithSearch,
  getSafeRedirectPath,
} from "./redirect";
import { ensureUserRecord } from "./session";
import type { SessionRecord } from "./types";

interface GuardUserOptions {
  requireUnlock?: boolean;
}

function waitForAuthState(auth: Auth) {
  return new Promise<User | null>((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

async function redirectToLogin(auth: Auth, message?: string) {
  if (message) {
    alert(message);
  }

  localStorage.removeItem("sessionId");
  await signOut(auth).catch(() => undefined);
  window.location.replace(createLoginPath());
}

export async function guardUser(options: GuardUserOptions = {}) {
  const auth = getAuth();
  const user = await waitForAuthState(auth);
  const { requireUnlock = false } = options;

  if (!user) {
    window.location.replace(createLoginPath());
    return null;
  }

  try {
    // Profil user dipakai untuk menentukan role, status akun, dan session aktif.
    const userData = await ensureUserRecord(user.uid, user.email || "");

    if (userData.isFrozen) {
      await redirectToLogin(auth, "Akun dibekukan");
      return null;
    }

    // Admin tetap bisa masuk tanpa gerbang profil/unlock agar panel tetap terjangkau.
    if (userData.role === "admin") {
      return user;
    }

    const localSessionId = localStorage.getItem("sessionId");
    const activeSessionIds = userData.activeSessionIds || [];
    const isKnownSession =
      activeSessionIds.includes(localSessionId || "") ||
      (!activeSessionIds.length && localSessionId === userData.activeSessionId);

    if (!localSessionId || !isKnownSession) {
      await redirectToLogin(auth, "Session berakhir atau login dilakukan di device lain");
      return null;
    }

    // Session user biasa harus cocok dengan dokumen sesi yang terdaftar di Firestore.
    const sessionSnap = await getDoc(doc(db, "sessions", localSessionId));
    if (!sessionSnap.exists()) {
      await redirectToLogin(auth, "Session tidak ditemukan");
      return null;
    }

    const sessionData = {
      id: sessionSnap.id,
      ...sessionSnap.data(),
    } as SessionRecord;

    if (sessionData.uid !== user.uid) {
      await redirectToLogin(auth, "Session tidak valid");
      return null;
    }

    const currentPath = window.location.pathname;
    const isProfileComplete = Boolean(
      userData.name && userData.nim && userData.phone
    );

    const nextPath = getCurrentPathWithSearch();

    if (!isProfileComplete && currentPath !== "/complete-profile") {
      window.location.replace(createCompleteProfilePath(nextPath));
      return null;
    }

    if (isProfileComplete && currentPath === "/complete-profile") {
      const params = new URLSearchParams(window.location.search);
      window.location.replace(getSafeRedirectPath(params.get("next")));
      return null;
    }

    if (requireUnlock && !userData.isUnlocked && currentPath !== "/unlock") {
      window.location.replace(`/unlock?next=${encodeURIComponent(nextPath)}`);
      return null;
    }

    if (userData.isUnlocked && currentPath === "/unlock") {
      const params = new URLSearchParams(window.location.search);
      const redirectPath = params.get("next") || "/dashboard";
      window.location.replace(redirectPath);
      return null;
    }

    return user;
  } catch (error) {
    console.error("Auth guard error:", error);
    await redirectToLogin(auth);
    return null;
  }
}
