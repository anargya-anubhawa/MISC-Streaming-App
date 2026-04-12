"use client";

import type { User } from "firebase/auth";
import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import Image from "next/image";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { app, db } from "../../lib/firebase";
import { logoutAllSessions } from "../../lib/session";
import { formatDateTime } from "../../lib/date";
import type { AppUserRecord, SessionRecord } from "../../lib/types";

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<AppUserRecord | null>(null);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [name, setName] = useState("");
  const [nim, setNim] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Halaman profil hanya memuat data user aktif dan sesi miliknya.
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        window.location.href = "/login";
        return;
      }

      setUser(currentUser);

      const userRef = doc(db, "users", currentUser.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = {
          id: userSnap.id,
          ...userSnap.data(),
        } as AppUserRecord;

        setData(userData);
        setName(userData.name || "");
        setNim(userData.nim || "");
        setPhone(userData.phone || "");
      }

      const sessionsQuery = query(
        collection(db, "sessions"),
        where("uid", "==", currentUser.uid)
      );
      const sessionsSnap = await getDocs(sessionsQuery);
      const userSessions = sessionsSnap.docs
      .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as SessionRecord)
      setSessions(userSessions);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleUpdateProfile = async () => {
    if (!user || !data) return;

    if (!name.trim() || !nim.trim() || !phone.trim()) {
      alert("Semua field wajib diisi");
      return;
    }

    try {
      setSaving(true);

      await setDoc(
        doc(db, "users", user.uid),
        {
          name: name.trim(),
          nim: nim.trim(),
          phone: phone.trim(),
        },
        { merge: true }
      );

      setData({
        ...data,
        name: name.trim(),
        nim: nim.trim(),
        phone: phone.trim(),
      });

      setShowEdit(false);
      alert("Profil berhasil diperbarui");
    } catch (error) {
      console.error(error);
      alert("Gagal memperbarui profil");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoutAll = async () => {
    if (!user) return;

    await logoutAllSessions(user.uid);
    alert("Logout semua device berhasil");
    window.location.href = "/login";
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Kartu profil utama */}
      <div className="card p-6 shadow-[0_0_20px_rgba(34,197,94,0.2)]">
        <div className="flex items-center gap-4 mb-6">
          {user?.photoURL && (
            <Image
              src={user.photoURL}
              alt={user.email || "Foto profil"}
              width={56}
              height={56}
              className="w-14 h-14 rounded-full"
            />
          )}

          <div>
            <p className="font-semibold">{user?.email}</p>
            <p className="text-sm text-gray-500">User Profile</p>
          </div>
        </div>

        {/* Ringkasan data akun */}
        <div className="space-y-2 text-sm mb-6">
          <p><b>Nama:</b> {data?.name || "-"}</p>
          <p><b>NIM:</b> {data?.nim || "-"}</p>
          <p><b>No HP:</b> {data?.phone || "-"}</p>
          <p><b>Device:</b> {data?.deviceInfo || "-"}</p>
          <p><b>Last Login:</b> {formatDateTime(data?.lastLogin)}</p>
        </div>

        <button
          onClick={() => setShowEdit(true)}
          className="bg-black text-white px-4 py-2 rounded"
        >
          Update Profile
        </button>

        <button
          onClick={handleLogoutAll}
          className="mt-4 bg-red-500 text-white px-4 py-2 rounded"
        >
          Logout semua device
        </button>
      </div>

      {/* Riwayat sesi login milik user */}
      <div className="card p-6 shadow-[0_0_20px_rgba(34,197,94,0.2)]">
        <h2 className="font-semibold mb-4">Riwayat Login</h2>

        <div className="space-y-3 text-sm">
          {sessions.map((session) => (
            <div key={session.id} className="border p-3 rounded">
              <p><b>Device:</b> {session.deviceInfo || "-"}</p>
              <p><b>IP:</b> {session.ip || "-"}</p>
              <p><b>Waktu:</b> {formatDateTime(session.createdAt)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Modal edit profil */}
      {showEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="card p-6 shadow-[0_0_20px_rgba(34,197,94,0.2)]">
            <h2 className="text-lg font-bold mb-4">Edit Profile</h2>

            <div className="space-y-3">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Nama"
                className="w-full border p-2 rounded"
              />

              <input
                value={nim}
                onChange={(event) => setNim(event.target.value)}
                placeholder="NIM"
                className="w-full border p-2 rounded"
              />

              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Nomor HP"
                className="w-full border p-2 rounded"
              />
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowEdit(false)}
                className="px-3 py-2 border rounded"
              >
                Batal
              </button>

              <button
                onClick={handleUpdateProfile}
                className="bg-black text-white px-4 py-2 rounded"
                disabled={saving}
              >
                {saving ? "Menyimpan..." : "Selesai"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
