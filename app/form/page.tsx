"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";

interface SubscriptionSettings {
  formUrl?: string;
}

export default function FormRedirectPage() {
  const [formUrl, setFormUrl] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const redirectToForm = async () => {
      const settingsSnap = await getDoc(doc(db, "settings", "subscription"));
      const settings = settingsSnap.exists()
        ? (settingsSnap.data() as SubscriptionSettings)
        : null;
      const url = settings?.formUrl || "";

      setFormUrl(url);
      setLoading(false);

      if (url) {
        window.location.replace(url);
      }
    };

    void redirectToForm();
  }, []);

  return (
    <div className="mx-auto max-w-2xl pb-12">
      <section className="card p-6 space-y-4 text-center">
        <p className="dashboard-user-label">Form Berlangganan</p>
        <h1 className="text-2xl font-semibold text-white">
          {loading ? "Redirecting..." : "Form belum tersedia"}
        </h1>
        <p className="text-slate-300">
          Jika halaman tidak otomatis berpindah, tekan tombol dibawah.
        </p>

        {formUrl ? (
          <Link
            href={formUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-neon inline-flex justify-center"
          >
            Buka Form
          </Link>
        ) : (
          <p className="text-red-300">
            Link Google Form belum diatur dari panel admin.
          </p>
        )}
      </section>
    </div>
  );
}
