"use client";

import type { Auth, User } from "firebase/auth";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { AppUserRecord, SessionRecord } from "./types";

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
  window.location.replace("/login");
}

export async function guardUser(options: GuardUserOptions = {}) {
  const auth = getAuth();
  const user = await waitForAuthState(auth);
  const { requireUnlock = false } = options;

  if (!user) {
    window.location.replace("/login");
    return null;
  }

  try {
    // Profil user dipakai untuk menentukan role, status akun, dan session aktif.
    const userSnap = await getDoc(doc(db, "users", user.uid));

    if (!userSnap.exists()) {
      await redirectToLogin(auth);
      return null;
    }

    const userData = {
      id: userSnap.id,
      ...userSnap.data(),
    } as AppUserRecord;

    if (userData.isFrozen) {
      await redirectToLogin(auth, "Akun dibekukan");
      return null;
    }

    // Admin tetap bisa masuk tanpa gerbang profil/unlock agar panel tetap terjangkau.
    if (userData.role === "admin") {
      return user;
    }

    const localSessionId = localStorage.getItem("sessionId");
    if (!localSessionId || localSessionId !== userData.activeSessionId) {
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

    if (!isProfileComplete && currentPath !== "/complete-profile") {
      window.location.replace("/complete-profile");
      return null;
    }

    if (isProfileComplete && currentPath === "/complete-profile") {
      window.location.replace("/dashboard");
      return null;
    }

    const nextPath = `${currentPath}${window.location.search}`;

    if (requireUnlock && !sessionData.isUnlocked && currentPath !== "/unlock") {
      window.location.replace(`/unlock?next=${encodeURIComponent(nextPath)}`);
      return null;
    }

    if (sessionData.isUnlocked && currentPath === "/unlock") {
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
