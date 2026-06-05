"use client";

import type { User } from "firebase/auth";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { collection, getCountFromServer } from "firebase/firestore";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { app, db } from "../lib/firebase";
import photo1 from "../public/record/1.jpg";
import photo2 from "../public/record/2.jpg";
import photo3 from "../public/record/3.jpg";
import photo4 from "../public/record/4.jpg";
import photo5 from "../public/record/5.jpg";  

const heroSlides = [
  { src: photo1, alt: "Dokumentasi utama kegiatan belajar 1" },
  { src: photo2, alt: "Dokumentasi utama kegiatan belajar 2" },
  { src: photo3, alt: "Dokumentasi utama kegiatan belajar 3" },
  { src: photo4, alt: "Dokumentasi utama kegiatan belajar 4" },
  { src: photo5, alt: "Dokumentasi utama kegiatan belajar 5" },
];

interface SiteStats {
  users: number;
  videos: number;
  blocks: number;
  comments: number;
}

function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (ref.current) clearInterval(ref.current);
    if (value === 0) { setDisplay(0); return; }

    const duration = 1200;
    const steps = 30;
    const increment = value / steps;
    let current = 0;
    let step = 0;

    ref.current = setInterval(() => {
      step++;
      current = Math.min(Math.round(increment * step), value);
      setDisplay(current);
      if (step >= steps) {
        if (ref.current) clearInterval(ref.current);
      }
    }, duration / steps);

    return () => { if (ref.current) clearInterval(ref.current); };
  }, [value]);

  return <>{display.toLocaleString()}{suffix}</>;
}

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [stats, setStats] = useState<SiteStats | null>(null);

  useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % heroSlides.length);
    }, 3200);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [usersSnap, videosSnap, blocksSnap, commentsSnap] = await Promise.all([
          getCountFromServer(collection(db, "users")),
          getCountFromServer(collection(db, "videos")),
          getCountFromServer(collection(db, "blocks")),
          getCountFromServer(collection(db, "comments")),
        ]);
        setStats({
          users: usersSnap.data().count,
          videos: videosSnap.data().count,
          blocks: blocksSnap.data().count,
          comments: commentsSnap.data().count,
        });
      } catch {
        setStats({ users: 0, videos: 0, blocks: 0, comments: 0 });
      }
    };

    void fetchStats();
  }, []);

  return (
    <div className="page-shell space-y-14 pb-16">
      <section className="hero-panel overflow-hidden">
        <div className="hero-glow hero-glow-left"></div>
        <div className="hero-glow hero-glow-right"></div>

        <div className="relative z-10 grid gap-10 lg:grid-cols-[1.2fr_0.88fr] items-center">
          <div className="space-y-6">
            <p className="hero-kicker">MISC FK UMY 2025</p>

            <div className="space-y-4">
              <h1 className="section-title">
                MISC Streaming App
              </h1>
              <p className="section-lead max-w-2xl text-base md:text-lg">
                Arsip materi digital untuk mahasiswa FK UMY 2025.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {!user ? (
                <Link href="/login" className="hero-primary-btn">
                  Login untuk mulai
                </Link>
              ) : (
                <Link href="/dashboard" className="hero-primary-btn">
                  Masuk ke dashboard
                </Link>
              )}

              <Link href="/berlangganan" className="hero-secondary-btn">
                Berlangganan
              </Link>

              <Link href="/about" className="hero-secondary-btn">
                About
              </Link>
            </div>

            {stats && (
              <div className="about-stats-grid !mt-8">
                <div className="about-stat-card">
                  <span className="about-stat-icon about-stat-icon-users">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  </span>
                  <div>
                    <p className="about-stat-number"><AnimatedCounter value={stats.users} /></p>
                    <p className="about-stat-label">Mahasiswa Terdaftar</p>
                  </div>
                </div>
                <div className="about-stat-card">
                  <span className="about-stat-icon about-stat-icon-videos">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                  </span>
                  <div>
                    <p className="about-stat-number"><AnimatedCounter value={stats.videos} /></p>
                    <p className="about-stat-label">Video Materi</p>
                  </div>
                </div>
                <div className="about-stat-card">
                  <span className="about-stat-icon about-stat-icon-blocks">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                  </span>
                  <div>
                    <p className="about-stat-number"><AnimatedCounter value={stats.blocks} /></p>
                    <p className="about-stat-label">Blok Materi</p>
                  </div>
                </div>
                <div className="about-stat-card">
                  <span className="about-stat-icon about-stat-icon-comments">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  </span>
                  <div>
                    <p className="about-stat-number"><AnimatedCounter value={stats.comments} /></p>
                    <p className="about-stat-label">Komentar Diskusi</p>
                  </div>
                </div>
              </div>
            )}
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
                  <p className="eyebrow">ALTHEORA</p>
                  <h2 className="text-2xl font-semibold text-[var(--foreground-strong)]">
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
                    <p className="text-sm font-medium text-[var(--foreground-strong)]">
                      Butuh bantuan?
                    </p>
                    <p className="text-xs">
                      Hubungi contact person untuk pertanyaan perihal akun dan sistem
                      berlangganan.
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
