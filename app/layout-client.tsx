"use client";

import "./globals.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import type { User } from "firebase/auth";
import { ReactNode, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import Link from "next/link";
import Image from "next/image";
import { app, db } from "../lib/firebase";
import type { AppUserRecord, SessionRecord, UserRole } from "../lib/types";

export default function RootLayout({ children }: { children: ReactNode }) {
  const currentYear = new Date().getFullYear();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>("user");
  const [showSubscriptionFab, setShowSubscriptionFab] = useState(false);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Header global mengikuti status login, role user, dan status unlock session aktif.
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setRole("user");
        setShowSubscriptionFab(false);
        return;
      }

      setUser(currentUser);

      const userSnap = await getDoc(doc(db, "users", currentUser.uid));
      if (!userSnap.exists()) {
        setShowSubscriptionFab(false);
        return;
      }

      const userData = userSnap.data() as AppUserRecord;
      setRole(userData.role || "user");

      if (userData.role === "admin") {
        setShowSubscriptionFab(false);
        return;
      }

      const localSessionId = localStorage.getItem("sessionId");
      if (!localSessionId || localSessionId !== userData.activeSessionId) {
        setShowSubscriptionFab(true);
        return;
      }

      const sessionSnap = await getDoc(doc(db, "sessions", localSessionId));
      if (!sessionSnap.exists()) {
        setShowSubscriptionFab(true);
        return;
      }

      const sessionData = {
        id: sessionSnap.id,
        ...sessionSnap.data(),
      } as SessionRecord;

      setShowSubscriptionFab(!sessionData.isUnlocked);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Tutup dropdown saat klik terjadi di luar area menu akun.
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        event.target instanceof Node &&
        !dropdownRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await signOut(getAuth(app));
    window.location.href = "/login";
  };

  return (
    <html lang="en">
      <body className="bg-black text-white min-h-screen overflow-x-hidden">
        {/* Latar global aplikasi */}
        <div className="fixed inset-0 -z-10 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#012a1f,#000)]"></div>
          <div className="absolute w-[400px] h-[400px] bg-green-400/5 blur-[100px] top-[-80px] left-[-80px]"></div>
        </div>

        {/* Header utama dan navigasi global */}
        <header className="main-header fixed top-0 left-0 w-full z-[1000] bg-black/30 backdrop-blur-lg border-b border-white/5">
          <div className="flex items-center w-full px-4 md:px-8 py-3">
            <Link
              href="/"
              className="text-base sm:text-lg font-semibold text-green-300 shrink-0"
            >
              MISC FK UMY 2025
            </Link>

            <div className="flex items-center gap-3 sm:gap-4 md:gap-6 ml-auto w-fit text-xs sm:text-sm text-gray-300">
              <nav className="flex items-center gap-3 sm:gap-4 md:gap-6">
                <Link className="hover:text-white whitespace-nowrap" href="/">
                  Home
                </Link>
                <Link className="hover:text-white whitespace-nowrap" href="/dashboard">
                  Dashboard
                </Link>
                {showSubscriptionFab && (
                  <Link
                    className="hover:text-white whitespace-nowrap text-green-300"
                    href="/berlangganan"
                  >
                    Berlangganan
                  </Link>
                )}
                <Link className="hover:text-white whitespace-nowrap" href="/about">
                  About
                </Link>
              </nav>

              {/* Menu akun di sisi kanan header */}
              <div className="relative shrink-0" ref={dropdownRef}>
                <button
                  onClick={() => setOpen((current) => !current)}
                  className="transition hover:scale-105"
                  aria-label="Buka menu akun"
                >
                  {user?.photoURL ? (
                    <Image
                      src={user.photoURL}
                      alt={user.email || "Foto profil"}
                      width={32}
                      height={32}
                      className="w-8 h-8 rounded-full border border-white/20"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-sm">
                      {user?.email?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                  )}
                </button>

                <div
                  className={`absolute right-0 mt-2 w-56 transition-all duration-200 origin-top-right ${
                    open
                      ? "opacity-100 scale-100 translate-y-0"
                      : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
                  }`}
                >
                  <div className="bg-black/60 backdrop-blur-xl rounded-lg border border-white/10 shadow-lg">
                    {!user ? (
                      <Link href="/login" className="block px-4 py-3 hover:bg-white/10">
                        Login
                      </Link>
                    ) : (
                      <>
                        <div className="px-4 py-3 text-xs text-gray-400 border-b border-white/10">
                          {user.email}
                        </div>

                        <Link href="/profile" className="block px-4 py-3 hover:bg-white/10">
                          Profile
                        </Link>

                        {role === "admin" && (
                          <Link href="/admin" className="block px-4 py-3 text-green-300 hover:bg-white/10">
                            Admin
                          </Link>
                        )}

                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-3 text-red-400 hover:bg-red-500/20"
                        >
                          Logout
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Area konten setiap halaman */}
        <main className="pt-20 px-4 md:px-8 max-w-7xl mx-auto">
          {children}
        </main>

        <footer className="site-footer">
          <div className="site-footer-inner">
            <p>{`Copyright © ${currentYear} Anargya Prima Anubhawa. All rights reserved.`}</p>
          </div>
        </footer>

        {/* Tombol pembelian akses hanya muncul jika token belum diaktifkan */}
        {showSubscriptionFab && pathname !== "/berlangganan" && (
          <Link href="/berlangganan" className="support-fab">
            <span className="support-fab-icon"><i className="fab fa-whatsapp"></i></span>
            <span className="support-fab-text">Beli Akses Video</span>
          </Link>
        )}
      </body>
    </html>
  );
}
