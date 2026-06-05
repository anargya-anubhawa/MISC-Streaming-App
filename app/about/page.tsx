"use client";

import { useEffect, useState, useRef } from "react";
import { collection, getCountFromServer } from "firebase/firestore";
import { db } from "../../lib/firebase";

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

const facts = [
  { value: "1 dashboard", label: "untuk akses materi lebih rapi" },
  { value: "2 mode", label: "terang dan gelap untuk kenyamanan baca" },
  { value: "Medical-first", label: "gaya visual tenang dan profesional" },
];

export default function AboutPage() {
  const [stats, setStats] = useState<SiteStats | null>(null);
  const [loading, setLoading] = useState(true);

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
      setLoading(false);
    };

    void fetchStats();
  }, []);

  return (
    <div className="about-shell space-y-6 pb-12">
      <section className="section-card">
        <p className="eyebrow">About</p>
        <div className="mt-5 space-y-4">
          <h1 className="section-title text-3xl md:text-5xl">
            Platform belajar yang dibuat agar materi kedokteran terasa lebih
            tertata.
          </h1>
          <p className="section-lead max-w-3xl">
            MISCSA adalah platform digital dari tim Recorder MISC FK UMY 2025
            untuk merangkum video materi dari semester awal hingga akhir
            perkuliahan. Fokus utamanya adalah membuat akses materi lebih
            mudah, lebih konsisten, dan nyaman dipakai dalam ritme belajar
            harian.
          </p>
        </div>
      </section>

      {!loading && stats && (
        <section className="about-stats-grid">
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
        </section>
      )}

      <section className="about-grid">
        <article className="section-card">
          <p className="eyebrow">How It Works</p>
          <div className="mt-5 space-y-4">
            <p className="section-lead">
              Mahasiswa FK UMY dapat berlangganan untuk mendapatkan akses materi
              video per blok. Setelah proses berlangganan selesai, admin akan
              mengaktifkan akses akun secara manual agar penggunaan tetap
              terkontrol dan rapi.
            </p>
            <p className="section-lead">
              Sistem ini juga menjaga batas sesi perangkat agar akses tetap
              sesuai aturan penggunaan yang berlaku di platform.
            </p>
          </div>
        </article>

        <div className="space-y-4">
          {facts.map((fact) => (
            <article key={fact.label} className="about-stat">
              <p className="about-stat-value">{fact.value}</p>
              <p className="about-stat-label">{fact.label}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
