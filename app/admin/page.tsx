"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { app, db } from "../../lib/firebase";
import { formatDateTime } from "../../lib/date";
import { resetUnlockToken } from "../../lib/session";
import { normalizeYouTubeId } from "../../lib/youtube";
import type { AppUserRecord, BlockRecord, VideoRecord } from "../../lib/types";

function normalizeExternalUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function normalizeWhatsAppNumber(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.startsWith("0")) {
    return `62${digits.slice(1)}`;
  }

  return digits;
}

export default function AdminPage() {
  const [users, setUsers] = useState<AppUserRecord[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<BlockRecord[]>([]);
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [openBlock, setOpenBlock] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [blockName, setBlockName] = useState("");
  const [blockDescription, setBlockDescription] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [youtubeId, setYoutubeId] = useState("");
  const [selectedBlock, setSelectedBlock] = useState("");
  const [videoDescription, setVideoDescription] = useState("");
  const [videoUploader, setVideoUploader] = useState("");
  const [editingBlock, setEditingBlock] = useState<BlockRecord | null>(null);
  const [editingVideo, setEditingVideo] = useState<VideoRecord | null>(null);
  const [tokens, setTokens] = useState<Record<string, string>>({});
  const [resettingTokens, setResettingTokens] = useState(false);
  const [subscriptionFormUrl, setSubscriptionFormUrl] = useState("");
  const [subscriptionWhatsappNumber, setSubscriptionWhatsappNumber] = useState("");
  const [subscriptionWhatsappCpText, setSubscriptionWhatsappCpText] = useState("");
  const [subscriptionWhatsappConfirmText, setSubscriptionWhatsappConfirmText] =
    useState("");
  const [subscriptionIsOpen, setSubscriptionIsOpen] = useState(true);
  const [savingFormUrl, setSavingFormUrl] = useState(false);

  async function fetchAll() {
    const usersSnap = await getDocs(collection(db, "users"));
    const blocksSnap = await getDocs(collection(db, "blocks"));
    const videosSnap = await getDocs(collection(db, "videos"));
    const settingsSnap = await getDoc(doc(db, "settings", "subscription"));

    setUsers(
      usersSnap.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as AppUserRecord)
        .sort((a, b) =>
          (a.name || a.email || "").localeCompare(b.name || b.email || "")
        )
    );

    setBlocks(
      blocksSnap.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as BlockRecord)
        .sort((a, b) => a.name.localeCompare(b.name))
    );

    setVideos(
      videosSnap.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }) as VideoRecord)
        .sort((a, b) => (a.order || 0) - (b.order || 0))
    );

    if (settingsSnap.exists()) {
      const settings = settingsSnap.data() as {
        formUrl?: string;
        whatsappNumber?: string;
        whatsappCpText?: string;
        whatsappConfirmText?: string;
        isOpen?: boolean;
      };
      setSubscriptionFormUrl(settings.formUrl || "");
      setSubscriptionWhatsappNumber(settings.whatsappNumber || "");
      setSubscriptionWhatsappCpText(settings.whatsappCpText || "");
      setSubscriptionWhatsappConfirmText(settings.whatsappConfirmText || "");
      setSubscriptionIsOpen(settings.isOpen ?? true);
    }

    setLoading(false);
  }

  useEffect(() => {
    // Panel admin hanya boleh diakses oleh akun dengan role admin.
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = "/login";
        return;
      }

      const userSnap = await getDoc(doc(db, "users", user.uid));
      if (!userSnap.exists() || userSnap.data().role !== "admin") {
        window.location.href = "/dashboard";
        return;
      }

      setAuthorized(true);
      void fetchAll();
    });

    return () => unsubscribe();
  }, []);

  const blockOptions = useMemo(
    () => [...blocks].sort((a, b) => a.name.localeCompare(b.name)),
    [blocks]
  );

  const filteredUsers = useMemo(() => {
    const keyword = userSearch.trim().toLowerCase();
    if (!keyword) return users;

    return users.filter((user) =>
      [user.name, user.email, user.nim, user.phone]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [userSearch, users]);

  const generateToken = async (sessionId?: string) => {
    if (!sessionId) return;

    const newToken = await resetUnlockToken(sessionId);
    setTokens((previous) => ({
      ...previous,
      [sessionId]: newToken,
    }));
  };

  const copyToken = async (token?: string) => {
    if (!token) return;

    try {
      await navigator.clipboard.writeText(token);
      alert("Token berhasil disalin");
    } catch {
      alert("Gagal menyalin token");
    }
  };

  const resetAllTokens = async () => {
    const confirmed = confirm(
      "Reset semua token? Semua user akan terkunci lagi dan token lama tidak bisa dipakai. Admin perlu membuat token baru untuk user yang membutuhkan akses."
    );

    if (!confirmed) return;

    setResettingTokens(true);

    try {
      const sessionsSnap = await getDocs(collection(db, "sessions"));

      await Promise.all(
        sessionsSnap.docs.map((sessionDoc) =>
          updateDoc(sessionDoc.ref, {
            unlockTokenHash: "",
            unlockAttempts: 0,
            isUnlocked: false,
          })
        )
      );

      setTokens({});
      alert(`Berhasil reset ${sessionsSnap.size} token aktif.`);
    } catch {
      alert("Gagal reset semua token.");
    } finally {
      setResettingTokens(false);
      await fetchAll();
    }
  };

  const saveSubscriptionFormUrl = async () => {
    const normalizedUrl = normalizeExternalUrl(subscriptionFormUrl);
    const normalizedWhatsappNumber = normalizeWhatsAppNumber(
      subscriptionWhatsappNumber
    );

    if (!normalizedUrl) {
      alert("Link form tidak boleh kosong.");
      return;
    }

    setSavingFormUrl(true);

    try {
      await setDoc(
        doc(db, "settings", "subscription"),
        {
          formUrl: normalizedUrl,
          whatsappNumber: normalizedWhatsappNumber,
          whatsappCpText: subscriptionWhatsappCpText.trim(),
          whatsappConfirmText: subscriptionWhatsappConfirmText.trim(),
          isOpen: subscriptionIsOpen,
          updatedAt: new Date(),
        },
        { merge: true }
      );

      setSubscriptionFormUrl(normalizedUrl);
      setSubscriptionWhatsappNumber(normalizedWhatsappNumber);
      setSubscriptionWhatsappCpText(subscriptionWhatsappCpText.trim());
      setSubscriptionWhatsappConfirmText(subscriptionWhatsappConfirmText.trim());
      alert("Berhasil disimpan.");
    } catch {
      alert("Gagal menyimpan.");
    } finally {
      setSavingFormUrl(false);
    }
  };

  const handleLogout = async (uid: string, sessionId?: string) => {
    if (sessionId) {
      await deleteDoc(doc(db, "sessions", sessionId));
    }

    await updateDoc(doc(db, "users", uid), {
      activeSessionId: "",
    });

    await fetchAll();
  };

  const toggleFreeze = async (uid: string, frozen?: boolean) => {
    await updateDoc(doc(db, "users", uid), {
      isFrozen: !frozen,
    });

    await fetchAll();
  };

  const deleteUser = async (uid: string) => {
    if (!confirm("Hapus user?")) return;

    const sessionsSnap = await getDocs(collection(db, "sessions"));
    await Promise.all(
      sessionsSnap.docs
        .filter((sessionDoc) => sessionDoc.data().uid === uid)
        .map((sessionDoc) => deleteDoc(sessionDoc.ref))
    );

    await deleteDoc(doc(db, "users", uid));
    await fetchAll();
  };

  const addBlock = async () => {
    if (!blockName.trim()) return;

    await addDoc(collection(db, "blocks"), {
      name: blockName.trim(),
      description: blockDescription.trim(),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    setBlockName("");
    setBlockDescription("");
    await fetchAll();
  };

  const updateBlock = async () => {
    if (!editingBlock) return;

    await updateDoc(doc(db, "blocks", editingBlock.id), {
      name: editingBlock.name.trim(),
      description: editingBlock.description?.trim() || "",
      updatedAt: new Date(),
    });

    setEditingBlock(null);
    await fetchAll();
  };

  const toggleBlock = async (id: string, active: boolean) => {
    await updateDoc(doc(db, "blocks", id), {
      isActive: !active,
      updatedAt: new Date(),
    });

    await fetchAll();
  };

  const deleteBlock = async (id: string) => {
    await deleteDoc(doc(db, "blocks", id));
    await fetchAll();
  };

  const addVideo = async () => {
    const normalizedYoutubeId = normalizeYouTubeId(youtubeId);
    const nextVideoOrder =
      videos.filter((video) => video.blockId === selectedBlock).length + 1;

    if (!videoTitle.trim() || !normalizedYoutubeId || !selectedBlock) {
      if (youtubeId) {
        alert("Link atau ID YouTube tidak valid");
      }
      return;
    }

    await addDoc(collection(db, "videos"), {
      title: videoTitle.trim(),
      youtubeId: normalizedYoutubeId,
      blockId: selectedBlock,
      description: videoDescription.trim(),
      uploadedBy: videoUploader.trim(),
      order: nextVideoOrder,
      isActive: true,
      likes: 0,
      dislikes: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    setVideoTitle("");
    setYoutubeId("");
    setVideoDescription("");
    setVideoUploader("");
    await fetchAll();
  };

  const toggleVideo = async (id: string, active: boolean) => {
    await updateDoc(doc(db, "videos", id), {
      isActive: !active,
      updatedAt: new Date(),
    });

    await fetchAll();
  };

  const deleteVideo = async (id: string) => {
    await deleteDoc(doc(db, "videos", id));
    await fetchAll();
  };

  const updateVideo = async () => {
    if (!editingVideo) return;

    const normalizedYoutubeId = normalizeYouTubeId(editingVideo.youtubeId);
    if (!normalizedYoutubeId) {
      alert("Link atau ID YouTube tidak valid");
      return;
    }

    await updateDoc(doc(db, "videos", editingVideo.id), {
      title: editingVideo.title.trim(),
      youtubeId: normalizedYoutubeId,
      description: editingVideo.description?.trim() || "",
      uploadedBy: editingVideo.uploadedBy?.trim() || "",
      updatedAt: new Date(),
    });

    setEditingVideo(null);
    await fetchAll();
  };

  if (!authorized || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-12">
      {/* Header admin */}
      <section className="dashboard-shell">
        <div className="dashboard-shell-header">
          <div>
            <p className="dashboard-breadcrumb">MISC / Admin Panel</p>
            <h1 className="text-3xl font-semibold text-white mt-2">
              Kelola user, urutan blok, dan konten video
            </h1>
            <p className="dashboard-subtitle">
              Panel ini dipakai untuk mengatur akun, menyusun blok, dan menjaga
              daftar video tetap rapi dari satu tempat.
            </p>
          </div>

          <div className="dashboard-user-card">
            <p className="dashboard-user-label">Ringkasan Data</p>
            <p className="dashboard-user-name">{users.length} user</p>
            <p className="dashboard-user-meta">
              {blocks.length} blok aktif dan tidak aktif, {videos.length} video
              tersimpan
            </p>
            <div className="dashboard-user-chip-row">
              <span className="dashboard-chip">User control</span>
              <span className="dashboard-chip">Content ready</span>
            </div>
          </div>
        </div>
      </section> 

      {/* Panel manajemen user */}
      <section className="card p-6">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">User Management</h2>
            <p className="text-slate-300 mt-2">
              Cari user lebih cepat lewat nama, email, NIM, atau nomor telepon.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 md:w-auto md:min-w-[26rem]">
            <label className="dashboard-search">
              <span className="dashboard-search-icon">Cari</span>
              <input
                value={userSearch}
                onChange={(event) => setUserSearch(event.target.value)}
                placeholder="Cari user..."
                className="dashboard-search-input"
              />
            </label>

            <button
              onClick={resetAllTokens}
              disabled={resettingTokens}
              className="admin-action-button admin-action-danger w-full justify-center"
            >
              {resettingTokens ? "Mereset Token..." : "Reset Semua Token"}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border border-white/10 text-sm">
            <thead>
              <tr className="bg-white/5">
                <th className="p-3 border border-white/10">Nama</th>
                <th className="p-3 border border-white/10">NIM</th>
                <th className="p-3 border border-white/10">Email</th>
                <th className="p-3 border border-white/10">Phone</th>
                <th className="p-3 border border-white/10">Status</th>
                <th className="p-3 border border-white/10">Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredUsers.map((user) => {
                const isOpen = expandedUser === user.id;

                return (
                  <Fragment key={user.id}>
                    <tr
                      onClick={() => setExpandedUser(isOpen ? null : user.id)}
                      className="hover:bg-white/5 cursor-pointer"
                    >
                      <td className="p-3 border border-white/10">{user.name || "-"}</td>
                      <td className="p-3 border border-white/10">{user.nim || "-"}</td>
                      <td className="p-3 border border-white/10">{user.email || "-"}</td>
                      <td className="p-3 border border-white/10">{user.phone || "-"}</td>
                      <td className="p-3 border border-white/10">
                        {user.isFrozen ? "Frozen" : "Active"}
                      </td>
                      <td className="p-3 border border-white/10 text-center">
                        <div className="flex justify-center gap-2 flex-wrap">
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleLogout(user.id, user.activeSessionId);
                            }}
                            className="admin-action-button admin-action-primary"
                          >
                            Logout
                          </button>

                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              void toggleFreeze(user.id, user.isFrozen);
                            }}
                            className="admin-action-button admin-action-warn"
                          >
                            {user.isFrozen ? "Unfreeze" : "Freeze"}
                          </button>

                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              void deleteUser(user.id);
                            }}
                            className="admin-action-button admin-action-danger"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>

                    {isOpen && (
                      <tr>
                        <td
                          colSpan={6}
                          className="p-4 bg-black/30 border border-white/10 text-xs"
                        >
                          <div className="grid md:grid-cols-2 gap-2">
                            <p><b>UID:</b> {user.id}</p>
                            <p><b>Device:</b> {user.deviceInfo || "-"}</p>
                            <p><b>Session:</b> {user.activeSessionId || "-"}</p>
                            <p><b>Last Login:</b> {formatDateTime(user.lastLogin)}</p>

                            <div className="flex items-center gap-2 flex-wrap">
                              <b>Token Unlock:</b>
                              {tokens[user.activeSessionId || ""] ? (
                                <>
                                  <span className="text-green-300 break-all">
                                    {tokens[user.activeSessionId || ""]}
                                  </span>
                                  <button
                                    onClick={() =>
                                      copyToken(tokens[user.activeSessionId || ""])
                                    }
                                    className="admin-action-button admin-action-primary"
                                  >
                                    Copy
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() =>
                                    void generateToken(user.activeSessionId)
                                  }
                                  className="admin-action-button admin-action-secondary"
                                >
                                  Buat Token Baru
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {!filteredUsers.length && (
          <div className="empty-state-card mt-5">
            <p className="empty-state-title">User tidak ditemukan</p>
            <p className="empty-state-body">
              Coba gunakan kata kunci lain dari nama, email, NIM, atau nomor
              telepon.
            </p>
          </div>
        )}
      </section>

      {/* Panel pengelolaan blok */}
      <section className="card p-6 space-y-5">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold text-white">Blok</h2>
          <p className="text-slate-300">
            Tambah, tampilkan, atau sembunyikan blok materi dari panel ini.
          </p>
        </div>

        <div className="admin-form-grid">
          <div className="admin-form-group md:col-span-2">
            <p className="admin-form-label">Blok Baru</p>
            <div className="admin-form-fields">
              <input
                value={blockName}
                onChange={(event) => setBlockName(event.target.value)}
                placeholder="Nama blok"
                className="input-neon w-full min-w-0"
              />
              <textarea
                value={blockDescription}
                onChange={(event) => setBlockDescription(event.target.value)}
                placeholder="Deskripsi blok untuk tampil di dashboard"
                className="input-neon w-full min-w-0 min-h-28 resize-y"
              />
            </div>
          </div>

          <div className="md:col-span-2 flex justify-end">
            <button onClick={addBlock} className="btn-neon w-full sm:w-auto sm:min-w-40">
              Tambah Blok
            </button>
          </div>
        </div>

        {blockOptions.map((block) => (
          <div key={block.id} className="admin-list-card">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-white font-semibold">{block.name}</p>
                <p className="text-sm text-slate-300 mt-1">
                  {block.description?.trim() || "Deskripsi blok belum diisi."}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setEditingBlock(block)}
                  className="admin-action-button admin-action-primary"
                >
                  Edit Blok
                </button>

                <button
                  onClick={() => void toggleBlock(block.id, block.isActive)}
                  className="admin-action-button admin-action-warn"
                >
                  {block.isActive ? "Hide" : "Show"}
                </button>

                <button
                  onClick={() => void deleteBlock(block.id)}
                  className="admin-action-button admin-action-danger"
                >
                  Delete
                </button>

                <button
                  onClick={() =>
                    setOpenBlock(openBlock === block.id ? null : block.id)
                  }
                  className="admin-action-button admin-action-secondary"
                >
                  {openBlock === block.id ? "Tutup Video" : "Lihat Video"}
                </button>
              </div>
            </div>

            {openBlock === block.id && (
              <div className="mt-4 space-y-3">
                {videos
                  .filter((video) => video.blockId === block.id)
                  .sort((a, b) => (a.order || 0) - (b.order || 0))
                  .map((video) => (
                    <div key={video.id} className="admin-subitem-card">
                      <div className="space-y-1">
                        <p className="text-white font-medium">{video.title}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => void toggleVideo(video.id, video.isActive)}
                          className="admin-action-button admin-action-warn"
                        >
                          {video.isActive ? "Hide" : "Show"}
                        </button>

                        <button
                          onClick={() => setEditingVideo(video)}
                          className="admin-action-button admin-action-primary"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => void deleteVideo(video.id)}
                          className="admin-action-button admin-action-danger"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        ))}
      </section>

      {/* Form tambah video */}
      <section className="card p-6 space-y-5">
        <div>
          <h2 className="text-2xl font-bold text-white">Tambah Video</h2>
          <p className="text-slate-300 mt-2">
            Video baru akan otomatis masuk ke urutan paling akhir dalam blok
            yang dipilih.
          </p>
        </div>

        <div className="admin-form-grid">
          <div className="admin-form-group md:col-span-2">
            <p className="admin-form-label">Identitas Video</p>
            <div className="admin-form-fields admin-form-fields-2">
              <input
                placeholder="Judul video"
                value={videoTitle}
                onChange={(event) => setVideoTitle(event.target.value)}
                className="input-neon w-full min-w-0"
              />

              <select
                value={selectedBlock}
                onChange={(event) => setSelectedBlock(event.target.value)}
                className="input-neon w-full min-w-0"
              >
                <option value="">Pilih blok tujuan</option>
                {blockOptions.map((block) => (
                  <option key={block.id} value={block.id}>
                    {block.name}
                  </option>
                ))}
              </select>

              <input
                placeholder="YouTube ID atau URL"
                value={youtubeId}
                onChange={(event) => setYoutubeId(event.target.value)}
                className="input-neon w-full min-w-0 admin-form-span-2"
              />
            </div>
          </div>

          <div className="admin-form-group md:col-span-2">
            <p className="admin-form-label">Keterangan Tambahan</p>
            <div className="admin-form-fields admin-form-fields-2">
              <input
                placeholder="Nama uploader"
                value={videoUploader}
                onChange={(event) => setVideoUploader(event.target.value)}
                className="input-neon w-full min-w-0"
              />

              <input
                placeholder="Deskripsi singkat video"
                value={videoDescription}
                onChange={(event) => setVideoDescription(event.target.value)}
                className="input-neon w-full min-w-0"
              />
            </div>
          </div>

          <div className="md:col-span-2 flex justify-end">
            <button onClick={addVideo} className="btn-neon w-full sm:w-auto sm:min-w-40">
              Tambah Video
            </button>
          </div>
        </div>
      </section>

      {/* Pengaturan berlangganan */}
      <section className="card p-6 space-y-5">
        <div>
          <h2 className="text-2xl font-bold text-white">Pengaturan Berlangganan</h2>
          <p className="text-slate-300 mt-2">
            Atur link form dan nomor CP yang dipakai halaman berlangganan.
          </p>
        </div>

        <div className="admin-form-group">
          <p className="admin-form-label">Form dan Contact Person</p>
          <div className="admin-form-fields">
            <label className="flex items-center justify-between gap-4 rounded-2xl border border-green-400/15 bg-black/20 px-4 py-3">
              <span>
                <span className="block text-sm font-semibold text-white">
                  Berlangganan dibuka
                </span>
                <span className="block text-xs text-slate-300">
                  Jika off, halaman berlangganan hanya menampilkan pesan belum dibuka.
                </span>
              </span>
              <input
                type="checkbox"
                checked={subscriptionIsOpen}
                onChange={(event) => setSubscriptionIsOpen(event.target.checked)}
                className="h-5 w-5 accent-green-400"
              />
            </label>

            <input
              value={subscriptionFormUrl}
              onChange={(event) => setSubscriptionFormUrl(event.target.value)}
              placeholder="https://forms.gle/..."
              className="input-neon w-full min-w-0"
            />

            <input
              value={subscriptionWhatsappNumber}
              onChange={(event) =>
                setSubscriptionWhatsappNumber(event.target.value)
              }
              placeholder="Nomor WhatsApp CP, contoh 085174177427"
              className="input-neon w-full min-w-0"
            />

            <textarea
              value={subscriptionWhatsappCpText}
              onChange={(event) =>
                setSubscriptionWhatsappCpText(event.target.value)
              }
              placeholder="Template pesan WA untuk Hubungi CP"
              className="input-neon w-full min-w-0 min-h-28 resize-y"
            />

            <textarea
              value={subscriptionWhatsappConfirmText}
              onChange={(event) =>
                setSubscriptionWhatsappConfirmText(event.target.value)
              }
              placeholder="Template pesan WA untuk Konfirmasi Pembelian. Gunakan {name}, {email}, dan {uid} jika perlu."
              className="input-neon w-full min-w-0 min-h-32 resize-y"
            />

            <div className="flex flex-wrap gap-3">
              <button
                onClick={saveSubscriptionFormUrl}
                disabled={savingFormUrl}
                className="btn-neon"
              >
                {savingFormUrl ? "Menyimpan..." : "Simpan Pengaturan"}
              </button>

              {subscriptionFormUrl && (
                <a
                  href={normalizeExternalUrl(subscriptionFormUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="admin-action-button admin-action-secondary"
                >
                  Preview Form
                </a>
              )}

              {subscriptionWhatsappNumber && (
                <a
                  href={`https://wa.me/${normalizeWhatsAppNumber(
                    subscriptionWhatsappNumber
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="admin-action-button admin-action-secondary"
                >
                  Preview WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Modal edit video */}
      {editingBlock && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="card p-6 w-full max-w-xl space-y-4">
            <h2 className="text-lg font-bold text-white">Edit Blok</h2>

            <input
              placeholder="Nama blok"
              value={editingBlock.name}
              onChange={(event) =>
                setEditingBlock({ ...editingBlock, name: event.target.value })
              }
              className="input-neon w-full"
            />

            <textarea
              placeholder="Deskripsi blok untuk tampil di dashboard"
              value={editingBlock.description || ""}
              onChange={(event) =>
                setEditingBlock({
                  ...editingBlock,
                  description: event.target.value,
                })
              }
              className="input-neon w-full min-h-32 resize-y"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditingBlock(null)}
                className="admin-action-button admin-action-secondary"
              >
                Cancel
              </button>

              <button
                onClick={updateBlock}
                className="admin-action-button admin-action-primary"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal edit video */}
      {editingVideo && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="card p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-bold text-white">Edit Video</h2>

            <input
              placeholder="Judul video"
              value={editingVideo.title}
              onChange={(event) =>
                setEditingVideo({ ...editingVideo, title: event.target.value })
              }
              className="input-neon w-full"
            />

            <input
              placeholder="YouTube ID atau URL"
              value={editingVideo.youtubeId}
              onChange={(event) =>
                setEditingVideo({
                  ...editingVideo,
                  youtubeId: event.target.value,
                })
              }
              className="input-neon w-full"
            />

            <input
              placeholder="Nama uploader"
              value={editingVideo.uploadedBy || ""}
              onChange={(event) =>
                setEditingVideo({
                  ...editingVideo,
                  uploadedBy: event.target.value,
                })
              }
              className="input-neon w-full"
            />

            <textarea
              placeholder="Deskripsi video"
              value={editingVideo.description || ""}
              onChange={(event) =>
                setEditingVideo({
                  ...editingVideo,
                  description: event.target.value,
                })
              }
              className="input-neon w-full"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditingVideo(null)}
                className="admin-action-button admin-action-secondary"
              >
                Cancel
              </button>

              <button
                onClick={updateVideo}
                className="admin-action-button admin-action-primary"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
