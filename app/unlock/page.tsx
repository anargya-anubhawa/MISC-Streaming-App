"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { guardUser } from "@/lib/authGuard";

export default function UnlockPage() {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/dashboard";
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    guardUser().then((user) => {
      if (!user) return;
      setCheckingAuth(false);
    });
  }, []);

  if (checkingAuth) return null;

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="bg-black/70 p-6 rounded-xl space-y-4 w-full max-w-sm">
        {/* Halaman info saat user belum diberi akses video oleh admin. */}
        <h1 className="text-xl font-bold text-center">
          Akses Materi Terkunci
        </h1>
        <p className="text-sm text-muted text-center">
          Akses video akun kamu belum dinyalakan oleh admin. Jika sudah
          menyelesaikan proses berlangganan, silakan hubungi CP agar akses
          dinyalakan secara manual.
        </p>

        <div className="flex flex-col gap-3">
          <Link
            href="/berlangganan"
            className="text-center text-[var(--accent)] underline underline-offset-4 hover:text-[var(--accent-strong)]"
          >
            Berlangganan atau hubungi CP
          </Link>
          <Link href={nextPath} className="btn-neon w-full text-center">
            Cek Ulang Akses
          </Link>
        </div>
      </div>
    </div>
  );
}
