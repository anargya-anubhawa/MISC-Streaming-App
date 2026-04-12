"use client";

import { useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import Link from "next/link";
import { db } from "../../lib/firebase";
import type { AppUserRecord } from "../../lib/types";
import { guardUser } from "../../lib/authGuard";

interface SubscriptionUser {
  uid: string;
  name: string;
  email: string;
}

interface SubscriptionSettings {
  whatsappNumber?: string;
  whatsappCpText?: string;
  whatsappConfirmText?: string;
  isOpen?: boolean;
}

function normalizeWhatsAppNumber(number: string) {
  const digits = number.replace(/\D/g, "");

  if (digits.startsWith("0")) {
    return `62${digits.slice(1)}`;
  }

  return digits;
}

function getSubscriptionHref(
  user: SubscriptionUser | null,
  whatsappNumber: string,
  template: string
) {
  if (!whatsappNumber || !template) {
    return "";
  }

  const normalizedWhatsappNumber = normalizeWhatsAppNumber(whatsappNumber);
  const name = user?.name || "Belum tersedia";
  const email = user?.email || "Belum tersedia";
  const uid = user?.uid || "Belum tersedia";

  const text = encodeURIComponent(
    template
      .replaceAll("{name}", name)
      .replaceAll("{email}", email)
      .replaceAll("{uid}", uid)
  );

  return `https://wa.me/${normalizedWhatsappNumber}?text=${text}`;
}

export default function BerlanggananPage() {
  const [subscriptionUser, setSubscriptionUser] =
    useState<SubscriptionUser | null>(null);

  const [subscriptionWhatsappNumber, setSubscriptionWhatsappNumber] =
    useState("");
  const [subscriptionWhatsappConfirmText, setSubscriptionWhatsappConfirmText] =
    useState("");
  const [subscriptionIsOpen, setSubscriptionIsOpen] = useState(true);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // ✅ AUTH GUARD (WAJIB LOGIN)
  useEffect(() => {
    guardUser().then(async (user) => {
      if (!user) return;

      const userSnap = await getDoc(doc(db, "users", user.uid));
      const userData = userSnap.exists()
        ? (userSnap.data() as AppUserRecord)
        : null;

      setSubscriptionUser({
        uid: user.uid,
        name: userData?.name || user.displayName || "-",
        email: userData?.email || user.email || "-",
      });

      setIsCheckingAuth(false);
    });
  }, []);

  // ✅ FETCH SETTINGS
  useEffect(() => {
    const fetchSubscriptionSettings = async () => {
      const settingsSnap = await getDoc(doc(db, "settings", "subscription"));
      const settings = settingsSnap.exists()
        ? (settingsSnap.data() as SubscriptionSettings)
        : null;

      setSubscriptionWhatsappNumber(settings?.whatsappNumber || "");
      setSubscriptionWhatsappConfirmText(
        settings?.whatsappConfirmText || ""
      );
      setSubscriptionIsOpen(settings?.isOpen ?? true);
      setSettingsLoaded(true);
    };

    void fetchSubscriptionSettings();
  }, []);

  const contactHref = useMemo(() => {
    if (!subscriptionWhatsappNumber) return "";

    return `https://wa.me/${normalizeWhatsAppNumber(
      subscriptionWhatsappNumber
    )}`;
  }, [subscriptionWhatsappNumber]);

  const confirmationHref = useMemo(
    () =>
      getSubscriptionHref(
        subscriptionUser,
        subscriptionWhatsappNumber,
        subscriptionWhatsappConfirmText
      ),
    [
      subscriptionUser,
      subscriptionWhatsappNumber,
      subscriptionWhatsappConfirmText,
    ]
  );

  // ⛔ BLOCK RENDER SAMPAI AUTH SELESAI
  if (isCheckingAuth) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-12">
      {settingsLoaded && !subscriptionIsOpen ? (
        <section className="card p-6 space-y-4 text-center">
          <p className="dashboard-user-label">Berlangganan</p>
          <h1 className="text-2xl font-semibold text-white">
            Langganan akses video belum dibuka
          </h1>
          <p className="text-slate-300">
            Pembelian akses video saat ini belum tersedia. Silakan cek kembali
            nanti atau tunggu informasi resmi dari admin.
          </p>
          <Link
            href="/dashboard"
            className="admin-action-button admin-action-secondary inline-flex justify-center"
          >
            Kembali ke Dashboard
          </Link>
        </section>
      ) : (
        <section className="card p-6 space-y-5">
          <div className="space-y-2">
            <p className="dashboard-user-label">Contact Person</p>
            <h2 className="text-2xl font-semibold text-white">
              Recorder MISC FK UMY 2025
            </h2>
            <p className="text-slate-300">
              {subscriptionWhatsappNumber
                ? `WhatsApp: ${normalizeWhatsAppNumber(
                    subscriptionWhatsappNumber
                  )}`
                : "Nomor WhatsApp contact person belum diatur di sistem."}
            </p>
          </div>

          <div className="admin-form-group">
            <p className="admin-form-label">Data yang akan dikirim</p>
            <div className="space-y-2 text-slate-300">
              <p>Nama: {subscriptionUser?.name}</p>
              <p>Email: {subscriptionUser?.email}</p>
              <p>User ID: {subscriptionUser?.uid}</p>
            </div>
          </div>

          <div className="admin-form-group">
            <p className="admin-form-label">Cara Berlangganan</p>
            <div className="space-y-3 text-slate-300">
              <p>
                1. Isi formulir pada link berikut ini:{" "}
                <Link
                  href="/form"
                  target="_blank"
                  rel="noreferrer"
                  className="text-green-300 underline underline-offset-4 hover:text-green-200"
                >
                  Form Berlangganan
                </Link>
                .
              </p>
              <p>
                2. Hubungi contact person untuk pembelian akses video materi
                melalui tombol dibawah.
              </p>
              <p>
                3. Setelah proses selesai, kamu akan menerima token untuk membuka
                blok materi.
              </p>
              <p>
                4. Token cukup dimasukkan satu kali per device, kecuali login di
                device lain atau token di-reset oleh admin.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {contactHref ? (
              <Link
                href={contactHref}
                target="_blank"
                rel="noreferrer"
                className="btn-neon"
              >
                Hubungi CP
              </Link>
            ) : (
              <div className="empty-state-card w-full">
                <p className="empty-state-title">
                  Nomor contact person belum tersedia
                </p>
                <p className="empty-state-body">
                  Tambahkan nomor WhatsApp di panel admin agar pembelian bisa
                  langsung diarahkan ke contact person.
                </p>
              </div>
            )}

            {confirmationHref ? (
              <Link
                href={confirmationHref}
                target="_blank"
                rel="noreferrer"
                className="btn-neon"
              >
                Konfirmasi pembelian
              </Link>
            ) : (
              <div className="empty-state-card w-full">
                <p className="empty-state-title">
                  Nomor contact person belum tersedia
                </p>
                <p className="empty-state-body">
                  Tambahkan nomor WhatsApp di panel admin agar pembelian bisa
                  langsung diarahkan ke contact person.
                </p>
              </div>
            )}

            <Link
              href="/dashboard"
              className="admin-action-button admin-action-secondary"
            >
              Kembali ke Dashboard
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}