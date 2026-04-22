"use client";

import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { createSession } from "../../lib/session";
import { getDeviceId, getDeviceInfo } from "../../lib/device";
import { app, db } from "../../lib/firebase";
import type { AppUserRecord } from "../../lib/types";

export default function LoginPage() {
  const loginGoogle = async () => {
    try {
      const auth = getAuth(app);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        const defaultUser: Omit<AppUserRecord, "id"> = {
          name: "",
          nim: "",
          phone: "",
          email: user.email || "",
          role: "user",
          isFrozen: false,
          createdAt: new Date(),
        };

        await setDoc(userRef, defaultUser);
      }

      const deviceInfo = getDeviceInfo();
      const deviceId = getDeviceId();
      const sessionId = crypto.randomUUID();

      localStorage.setItem("sessionId", sessionId);

      // 🔥 FIX: jangan biarkan error session bikin login gagal
      try {
        await createSession(
          user.uid,
          sessionId,
          deviceInfo,
          deviceId,
          user.email || ""
        );
      } catch (err) {
        console.error("Session error (ignored):", err);
      }

      window.location.href = "/dashboard";
    } catch (error) {
      console.error("LOGIN ERROR:", error);
      alert("Login gagal. Coba ulang beberapa saat lagi.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md p-6 sm:p-8 rounded-2xl text-center space-y-6 bg-black/40 backdrop-blur-2xl border border-white/10 shadow-lg">
        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-semibold text-green-300">
            ALTHEORA
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            ~ MISC FK UMY 2025 ~
          </p>
        </div>

        <div className="h-px bg-white/10"></div>

        <button
          onClick={loginGoogle}
          className="w-full flex items-center justify-center gap-3 bg-white text-black py-3 rounded-lg font-medium hover:bg-gray-200 active:scale-[0.98]"
        >
          Login dengan Google
        </button>

        <p className="text-xs text-gray-500">
          Dengan login, kamu menyetujui penggunaan sistem ini
        </p>
      </div>
    </div>
  );
}