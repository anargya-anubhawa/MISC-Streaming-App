"use client";

import type { User } from "firebase/auth";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import photo1 from "../public/record/1.jpg";
import photo2 from "../public/record/2.jpg";
import photo3 from "../public/record/3.jpg";
import photo4 from "../public/record/4.jpg";
import photo5 from "../public/record/5.jpg";
import { app } from "../lib/firebase";

const highlights = [
  {
    title: "Materi tersusun per blok",
    description:
      "Mahasiswa bisa langsung masuk ke blok yang dibutuhkan tanpa harus mencari manual di banyak chat atau drive.",
  },
  {
    title: "Akses cepat dari satu dashboard",
    description:
      "Semua materi penting dikumpulkan dalam satu tempat yang lebih rapi, konsisten, dan mudah diulang kapan saja.",
  },
  {
    title: "Cocok untuk belajar ulang",
    description:
      "Desain platform dibuat agar nyaman dipakai saat mengejar kuliah, praktikum, atau persiapan ujian blok.",
  },
];

const heroSlides = [
  { src: photo1, alt: "Dokumentasi utama kegiatan belajar 1" },
  { src: photo2, alt: "Dokumentasi utama kegiatan belajar 2" },
  { src: photo3, alt: "Dokumentasi utama kegiatan belajar 3" },
  { src: photo4, alt: "Dokumentasi utama kegiatan belajar 4" },
  { src: photo5, alt: "Dokumentasi utama kegiatan belajar 5" },
];

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    // Landing page hanya perlu tahu status login untuk menentukan CTA utama.
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % heroSlides.length);
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <div className="space-y-14 pb-16">
      {/* Hero utama kembali ke format yang lebih rapi, foto hanya jadi aksen pendukung. */}
      <section className="hero-panel overflow-hidden">
        <div className="hero-glow hero-glow-left"></div>
        <div className="hero-glow hero-glow-right"></div>

        <div className="relative z-10 grid gap-10 lg:grid-cols-[1.2fr_0.88fr] items-center">
          <div className="space-y-6">
            <p className="hero-kicker">MISC FK UMY 2025</p>

            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl font-semibold leading-tight">
                MISC Streaming App
              </h1>
              <p className="text-base md:text-lg text-slate-300 max-w-2xl">
                Arsip materi digital untuk mahasiswa FK UMY 2025. 
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {!user ? (
                <Link href="/login" className="hero-primary-btn">
                  Login untuk Mulai
                </Link>
              ) : (
                <Link href="/dashboard" className="hero-primary-btn">
                  Masuk ke Dashboard
                </Link>
              )}

              <Link href="/berlangganan" className="hero-secondary-btn">
                Berlangganan
              </Link>

              <Link href="/about" className="hero-secondary-btn">
                About
              </Link>

            </div>
          </div>

          <div className="space-y-4">
            <div className="hero-preview-card">
              <div className="hero-preview-header">
                <span className="hero-dot"></span>
                <span className="hero-dot"></span>
                <span className="hero-dot"></span>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.28em] text-green-300/80">
                    ALTHEORA
                  </p>
                  <h2 className="text-2xl font-semibold text-white">
                    Kedokteran Umum UMY 2025
                  </h2>
                </div>

                <div className="hero-photo-main">
                  {heroSlides.map((slide, index) => (
                    <Image
                      key={slide.alt}
                      src={slide.src}
                      alt={slide.alt}
                      fill
                      sizes="(max-width: 1024px) 100vw, 38vw"
                      className={`hero-photo-main-image ${
                        index === activeSlide
                          ? "hero-photo-main-image-active"
                          : "hero-photo-main-image-hidden"
                      }`}
                      priority={index === 0}
                    />
                  ))}

                  <div className="hero-photo-dots">
                    {heroSlides.map((slide, index) => (
                      <span
                        key={slide.alt}
                        className={`hero-photo-dot ${
                          index === activeSlide ? "hero-photo-dot-active" : ""
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="hero-support-strip">
                  <div>
                    <p className="text-sm font-medium text-white">
                      Butuh bantuan?
                    </p>
                    <p className="text-xs text-slate-300">
                      Hubungi CP untuk pertanyaan terkait akun dan sistem berlangganan.
                    </p>
                  </div>
                  <Link href="/berlangganan" className="hero-inline-link">
                    <i className="fab fa-whatsapp"></i>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
