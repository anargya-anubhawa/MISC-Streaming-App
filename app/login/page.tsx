"use client";

import type { FirebaseError } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { getDeviceId, getDeviceInfo } from "../../lib/device";
import { app } from "../../lib/firebase";
import {
  createCompleteProfilePath,
  getSafeRedirectPath,
} from "../../lib/redirect";
import {
  createSession,
  ensureUserRecord,
  isProfileComplete,
} from "../../lib/session";

const loginHighlights = [
  "Akses materi per blok dari satu dashboard yang lebih rapi.",
  "Tampilan minimalis dengan mode terang dan gelap untuk belajar lebih nyaman.",
  "Sistem sesi perangkat membantu menjaga akses tetap aman dan terkendali.",
];

function getLoginErrorMessage(error: unknown) {
  const firebaseError = error as FirebaseError | undefined;

  switch (firebaseError?.code) {
    case "auth/popup-closed-by-user":
      return "Popup login ditutup sebelum proses selesai.";
    case "auth/popup-blocked":
      return "Browser memblokir popup login. Izinkan popup lalu coba lagi.";
    case "auth/cancelled-popup-request":
      return "Permintaan login sebelumnya dibatalkan. Coba lagi.";
    case "auth/unauthorized-domain":
      return "Domain atau host ini belum diizinkan di Firebase Auth. Tambahkan host yang dipakai saat akses app ke Authorized domains Firebase.";
    default:
      return "Login gagal. Coba ulang beberapa saat lagi.";
  }
}

export default function LoginPage() {
  const loginGoogle = async () => {
    try {
      const auth = getAuth(app);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      await ensureUserRecord(user.uid, user.email || "");

      const deviceInfo = getDeviceInfo();
      const deviceId = getDeviceId();
      const nextPath = getSafeRedirectPath(
        new URLSearchParams(window.location.search).get("next")
      );
      const sessionResult = await createSession(
        user.uid,
        crypto.randomUUID(),
        deviceInfo,
        deviceId,
        user.email || ""
      );

      if (sessionResult?.status === "device-limit-reached") {
        localStorage.removeItem("sessionId");
        await signOut(auth).catch(() => undefined);
        alert(
          "Login dibatasi maksimal 2 device. Akses video dimatikan otomatis dan semua session direset. Silakan hubungi admin untuk mengaktifkan akses kembali."
        );
        window.location.href = "/login";
        return;
      }

      if (!sessionResult) {
        throw new Error("Session gagal dibuat");
      }

      localStorage.setItem("sessionId", sessionResult.sessionId);

      const complete = await isProfileComplete(user.uid);
      window.location.href = complete
        ? nextPath
        : createCompleteProfilePath(nextPath);
    } catch (error) {
      console.error(error);
      alert(getLoginErrorMessage(error));
    }
  };

  return (
    <div className="login-shell pb-12">

      <section className="section-card login-panel">
        <div className="space-y-3 text-center">
          <p className="eyebrow justify-center">ALTHEORA</p>
          <h2 className="text-2xl font-semibold text-[var(--foreground-strong)]">
            Login dengan Google
          </h2>
          <p className="section-lead text-sm">
            Setelah berhasil login, sistem akan mengecek profil dan status sesi
            perangkat secara otomatis.
          </p>
        </div>

        <div className="login-divider my-6"></div>

        <button onClick={loginGoogle} className="primary-button w-full">
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path
              fill="#EA4335"
              d="M24 9.5c3.54 0 6.73 1.22 9.24 3.61l6.88-6.88C35.92 2.36 30.37 0 24 0 14.82 0 6.8 5.48 2.8 13.44l8.02 6.23C12.76 13.12 17.94 9.5 24 9.5z"
            />
            <path
              fill="#4285F4"
              d="M46.1 24.5c0-1.64-.14-3.2-.4-4.72H24v9h12.4c-.54 2.9-2.2 5.36-4.68 7.02l7.2 5.6C43.94 37.28 46.1 31.4 46.1 24.5z"
            />
            <path
              fill="#FBBC05"
              d="M10.82 28.67a14.5 14.5 0 0 1 0-9.34l-8.02-6.23A23.94 23.94 0 0 0 0 24c0 3.84.92 7.46 2.8 10.9l8.02-6.23z"
            />
            <path
              fill="#34A853"
              d="M24 48c6.48 0 11.92-2.14 15.9-5.82l-7.2-5.6c-2 1.34-4.54 2.12-8.7 2.12-6.06 0-11.24-3.62-13.18-8.8l-8.02 6.23C6.8 42.52 14.82 48 24 48z"
            />
          </svg>
          Lanjutkan dengan Google
        </button>

        <p className="login-note mt-4 text-center">
          Dengan login, kamu menyetujui penggunaan sistem ini untuk akses materi
          pembelajaran MISC FK UMY 2025.
        </p>
      </section>
    </div>
  );
}
