"use client";

import type { User } from "firebase/auth";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import Image from "next/image";
import { useEffect, useState } from "react";
import { formatDateTime } from "../../lib/date";
import { app, db } from "../../lib/firebase";
import { createLoginPath } from "../../lib/redirect";
import { logoutAllSessions } from "../../lib/session";
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
        window.location.href = createLoginPath();
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
      const userSessions = sessionsSnap.docs.map(
        (docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as SessionRecord
      );
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
    <div className="profile-shell pb-12">
      <section className="section-card profile-summary">
        <p className="eyebrow">Profile</p>

        <div className="mt-5 flex items-center gap-4">
          {user?.photoURL ? (
            <Image
              src={user.photoURL}
              alt={user.email || "Foto profil"}
              width={64}
              height={64}
              className="rounded-full"
            />
          ) : (
            <div className="avatar-fallback h-16 w-16 text-base">
              {user?.email?.charAt(0)?.toUpperCase() || "U"}
            </div>
          )}

          <div>
            <p className="text-lg font-semibold text-[var(--foreground-strong)]">
              {data?.name || "Profil mahasiswa"}
            </p>
            <p className="section-lead text-sm">{user?.email}</p>
          </div>
        </div>

        <div className="profile-meta-list">
          <div className="profile-meta-row">
            <span className="profile-meta-label">Nama</span>
            <span className="profile-meta-value">{data?.name || "-"}</span>
          </div>
          <div className="profile-meta-row">
            <span className="profile-meta-label">NIM</span>
            <span className="profile-meta-value">{data?.nim || "-"}</span>
          </div>
          <div className="profile-meta-row">
            <span className="profile-meta-label">Nomor HP</span>
            <span className="profile-meta-value">{data?.phone || "-"}</span>
          </div>
          <div className="profile-meta-row">
            <span className="profile-meta-label">Device</span>
            <span className="profile-meta-value">{data?.deviceInfo || "-"}</span>
          </div>
          <div className="profile-meta-row">
            <span className="profile-meta-label">Last login</span>
            <span className="profile-meta-value">
              {formatDateTime(data?.lastLogin)}
            </span>
          </div>
        </div>

        <div className="profile-action-row">
          <button onClick={() => setShowEdit(true)} className="primary-button">
            Update profil
          </button>
          <button
            onClick={handleLogoutAll}
            className="admin-action-button admin-action-danger"
          >
            Logout semua device
          </button>
        </div>
      </section>

      <section className="section-card profile-sessions">
        <p className="eyebrow">Riwayat Login</p>
        <div className="mt-5 space-y-3">
          {sessions.length ? (
            sessions.map((session) => (
              <article key={session.id} className="profile-session-item">
                <p className="profile-meta-value text-left">
                  {session.deviceInfo || "Perangkat belum terdeteksi"}
                </p>
                <p className="section-lead text-sm mt-2">
                  IP: {session.ip || "-"}
                </p>
                <p className="section-lead text-sm">
                  Waktu: {formatDateTime(session.createdAt)}
                </p>
              </article>
            ))
          ) : (
            <div className="empty-state-card">
              <p className="empty-state-title">Belum ada riwayat sesi</p>
              <p className="empty-state-body">
                Riwayat login akan muncul di sini setelah sesi perangkat aktif
                tersimpan.
              </p>
            </div>
          )}
        </div>
      </section>

      {showEdit && (
        <div className="modal-backdrop">
          <div className="section-card modal-card">
            <p className="eyebrow">Edit Profile</p>
            <h2 className="mt-4 text-xl font-semibold text-[var(--foreground-strong)]">
              Perbarui identitas dasar
            </h2>

            <div className="form-stack mt-5">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Nama"
                className="input-neon"
              />

              <input
                value={nim}
                onChange={(event) => setNim(event.target.value)}
                placeholder="NIM"
                className="input-neon"
              />

              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Nomor HP"
                className="input-neon"
              />
            </div>

            <div className="profile-action-row mt-5">
              <button
                onClick={() => setShowEdit(false)}
                className="admin-action-button admin-action-secondary"
              >
                Batal
              </button>

              <button
                onClick={handleUpdateProfile}
                className="primary-button"
                disabled={saving}
              >
                {saving ? "Menyimpan..." : "Simpan perubahan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
