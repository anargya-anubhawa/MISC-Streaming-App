"use client";

import { doc, getDoc } from "firebase/firestore";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { guardUser } from "../../lib/authGuard";
import { db } from "../../lib/firebase";
import type { AppUserRecord } from "../../lib/types";

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

  useEffect(() => {
    const fetchSubscriptionSettings = async () => {
      const settingsSnap = await getDoc(doc(db, "settings", "subscription"));
      const settings = settingsSnap.exists()
        ? (settingsSnap.data() as SubscriptionSettings)
        : null;

      setSubscriptionWhatsappNumber(settings?.whatsappNumber || "");
      setSubscriptionWhatsappConfirmText(settings?.whatsappConfirmText || "");
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

  if (isCheckingAuth) return null;

  return (
    <div className="subscription-shell space-y-8 pb-12">
      {settingsLoaded && !subscriptionIsOpen ? (
        <section className="section-card space-y-4 text-center">
          <p className="dashboard-user-label">Berlangganan</p>
          <h1 className="text-2xl font-semibold text-[var(--foreground-strong)]">
            Langganan akses video belum dibuka
          </h1>
          <p className="section-lead">
            Pembelian akses video saat ini belum tersedia. Silakan cek kembali
            nanti atau tunggu informasi resmi dari admin.
          </p>
          <Link
            href="/dashboard"
            className="admin-action-button admin-action-secondary inline-flex justify-center"
          >
            Kembali ke dashboard
          </Link>
        </section>
      ) : (
        <section className="section-card space-y-5">
          <div className="space-y-2">
            <p className="dashboard-user-label">Contact Person</p>
            <h2 className="text-2xl font-semibold text-[var(--foreground-strong)]">
              Recorder MISC FK UMY 2025
            </h2>
            <p className="section-lead">
              {subscriptionWhatsappNumber
                ? `WhatsApp: ${normalizeWhatsAppNumber(
                    subscriptionWhatsappNumber
                  )}`
                : "Nomor WhatsApp contact person belum diatur di sistem."}
            </p>
          </div>

          <div className="admin-form-group">
            <p className="admin-form-label">Data yang akan dikirim</p>
            <div className="space-y-2">
              <p>Nama: {subscriptionUser?.name}</p>
              <p>Email: {subscriptionUser?.email}</p>
              <p>User ID: {subscriptionUser?.uid}</p>
            </div>
          </div>

          <div className="admin-form-group">
            <p className="admin-form-label">Cara Berlangganan</p>
            <div className="space-y-3">
              <p>
                1. Isi formulir pada link berikut ini:{" "}
                <Link
                  href="/form"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--accent-strong)] underline underline-offset-4"
                >
                  Form berlangganan
                </Link>
                .
              </p>
              <p>
                2. Setelah mengisi formulir dan membayar sejumlah yang telah ditentukan, silahkan tekan tombol <b>"Konfirmasi pembelian"</b> dibawah. 
              </p>
              <p>
                3. Jangan lupa melampirkan screenshot formulir yang telah di submit dan bukti pembayaran.  
              </p>
              
              <p>
                4. Setelah proses verifikasi selesai, admin akan memberikan akses video pada
                akun kamu. 
              </p>
              <p>
                5. Akses berlaku selama batas login maksimal 2 device tidak
                terlampaui. Jika melewati batas, akses akan mati otomatis dan
                perlu disetting ulang oleh admin.
              </p>
            </div>
          </div>

          <div className="subscription-actions">
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
              Kembali ke dashboard
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
