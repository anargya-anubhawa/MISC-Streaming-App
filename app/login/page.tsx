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

      // Session baru dibuat saat login agar perangkat aktif bisa dilacak.
      const deviceInfo = getDeviceInfo();
      const deviceId = getDeviceId();
      const sessionId = crypto.randomUUID();

      localStorage.setItem("sessionId", sessionId);

      await createSession(
        user.uid,
        sessionId,
        deviceInfo,
        deviceId,
        user.email || ""
      );

      window.location.href = "/dashboard";
    } catch (error) {
      console.error(error);
      alert("Login gagal. Coba ulang beberapa saat lagi.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      {/* Kartu login utama */}
      <div
        className="
          w-full max-w-md
          p-6 sm:p-8
          rounded-2xl
          text-center space-y-6
          bg-black/40 backdrop-blur-2xl
          border border-white/10
          shadow-lg
        "
      >
        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-semibold text-green-300">
            ALTHEORA
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            ~ MISC FK UMY 2025 ~
          </p>
        </div>

        <div className="h-px bg-white/10"></div>

        {/* Tombol login Google */}
        <button
          onClick={loginGoogle}
          className="
            w-full flex items-center justify-center gap-3
            bg-white text-black
            py-3 rounded-lg
            font-medium
            transition-all duration-300
            hover:bg-gray-200
            active:scale-[0.98]
          "
        >
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.73 1.22 9.24 3.61l6.88-6.88C35.92 2.36 30.37 0 24 0 14.82 0 6.8 5.48 2.8 13.44l8.02 6.23C12.76 13.12 17.94 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.1 24.5c0-1.64-.14-3.2-.4-4.72H24v9h12.4c-.54 2.9-2.2 5.36-4.68 7.02l7.2 5.6C43.94 37.28 46.1 31.4 46.1 24.5z"/>
            <path fill="#FBBC05" d="M10.82 28.67a14.5 14.5 0 0 1 0-9.34l-8.02-6.23A23.94 23.94 0 0 0 0 24c0 3.84.92 7.46 2.8 10.9l8.02-6.23z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.92-2.14 15.9-5.82l-7.2-5.6c-2 1.34-4.54 2.12-8.7 2.12-6.06 0-11.24-3.62-13.18-8.8l-8.02 6.23C6.8 42.52 14.82 48 24 48z"/>
          </svg>
          Login dengan Google
        </button>

        <p className="text-xs text-gray-500">
          Dengan login, kamu menyetujui penggunaan sistem ini
        </p>
      </div>
    </div>
  );
}
