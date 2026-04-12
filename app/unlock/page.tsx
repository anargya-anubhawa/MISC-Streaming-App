"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { verifyUnlockToken } from "@/lib/unlock";

export default function UnlockPage() {
  const searchParams = useSearchParams();
  const [token, setToken] = useState("");
  const [sessionId] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("sessionId") || "";
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!sessionId) {
      alert("Session tidak ditemukan");
      return;
    }

    setSubmitting(true);
    const result = await verifyUnlockToken(sessionId, token.trim());
    setSubmitting(false);

    if (result.success) {
      window.location.href = searchParams.get("next") || "/dashboard";
      return;
    }

    alert(result.message || "Token salah");
  };

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="bg-black/70 p-6 rounded-xl space-y-4 w-full max-w-sm">
        {/* Form unlock saat user ingin membuka blok atau video */}
        <h1 className="text-xl font-bold text-center">
          Akses Materi Terkunci
        </h1>
        <p className="text-sm text-muted text-center">
          Untuk membuka blok dan video, masukkan token yang Anda dapatkan dari CP.
          Belum punya token?{" "}
          <Link href="/berlangganan" className="text-green-300 hover:text-green-200 underline underline-offset-4">
            Berlangganan di sini
          </Link>
          .
        </p>

        <input
          type="text"
          placeholder="Masukkan Token"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          className="input-neon w-full"
        />

        <button
          onClick={handleSubmit}
          className="btn-neon w-full"
          disabled={submitting}
        >
          {submitting ? "Memeriksa..." : "Unlock"}
        </button>
      </div>
    </div>
  );
}
