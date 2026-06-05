"use client";

import type { User } from "firebase/auth";
import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { app, db } from "../../lib/firebase";
import { createLoginPath, getSafeRedirectPath } from "../../lib/redirect";
import { ensureUserRecord } from "../../lib/session";
import type { AppUserRecord } from "../../lib/types";

export default function CompleteProfile() {
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [nim, setNim] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Halaman ini hanya untuk user yang profilnya belum lengkap.
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        window.location.href = createLoginPath();
        return;
      }

      await ensureUserRecord(currentUser.uid, currentUser.email || "");

      const userSnap = await getDoc(doc(db, "users", currentUser.uid));
      const userData = userSnap.data() as AppUserRecord | undefined;

      if (userData?.name && userData?.nim && userData?.phone) {
        const params = new URLSearchParams(window.location.search);
        window.location.href = getSafeRedirectPath(params.get("next"));
        return;
      }

      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async () => {
    if (!user) return;

    if (!name.trim() || !nim.trim() || !phone.trim()) {
      alert("Semua field wajib diisi");
      return;
    }

    setSubmitting(true);

    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          name: name.trim(),
          nim: nim.trim(),
          phone: phone.trim(),
        },
        { merge: true }
      );

      const params = new URLSearchParams(window.location.search);
      window.location.href = getSafeRedirectPath(params.get("next"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <div className="card max-w-md mx-auto p-6 rounded-xl shadow-[0_0_20px_rgba(34,197,94,0.2)] mt-20">
      {/* Form pelengkapan identitas dasar */}
      <h1 className="text-xl font-bold mb-4">Lengkapi Profil</h1>

      <div className="space-y-4">
        <input
          placeholder="Nama"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="w-full border p-2 rounded"
        />

        <input
          placeholder="NIM"
          value={nim}
          onChange={(event) => setNim(event.target.value)}
          className="w-full border p-2 rounded"
        />

        <input
          placeholder="Nomor HP"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          className="w-full border p-2 rounded"
        />

        <p className="text-sm text-muted">
          Mohon diisi dengan data yang dapat dipertanggungjawabkan kebenarannya.
        </p>

        <button
          onClick={handleSubmit}
          className="w-full bg-[var(--accent)] text-[var(--accent-contrast)] py-2 rounded"
          disabled={submitting}
        >
          {submitting ? "Menyimpan..." : "Simpan"}
        </button>
      </div>
    </div>
  );
}
