"use client";

import type { User } from "firebase/auth";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import { app } from "../lib/firebase";
import { createLoginPath } from "../lib/redirect";
import { ensureUserRecord } from "../lib/session";
import type { UserRole } from "../lib/types";

type ThemeMode = "light" | "dark";

function getPreferredTheme(): ThemeMode {
  if (typeof window === "undefined") return "dark";

  const storedTheme = window.localStorage.getItem("theme-mode");
  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

export default function ClientLayout({
  children,
  currentYear,
}: {
  children: ReactNode;
  currentYear: number;
}) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>("user");
  const [showSubscriptionFab, setShowSubscriptionFab] = useState(false);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = getPreferredTheme();
  }, []);

  useEffect(() => {
    // Header global mengikuti status login, role user, dan status akses video.
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setRole("user");
        setShowSubscriptionFab(false);
        return;
      }

      setUser(currentUser);

      const userData = await ensureUserRecord(
        currentUser.uid,
        currentUser.email || ""
      );
      setRole(userData.role || "user");

      if (userData.role === "admin") {
        setShowSubscriptionFab(false);
        return;
      }

      setShowSubscriptionFab(!userData.isUnlocked);
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
    window.location.href = createLoginPath("/dashboard");
  };

  const handleToggleTheme = () => {
    const currentTheme =
      (document.documentElement.dataset.theme as ThemeMode | undefined) ||
      getPreferredTheme();
    const nextTheme: ThemeMode = currentTheme === "dark" ? "light" : "dark";

    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("theme-mode", nextTheme);
  };

  return (
    <>
      <div className="app-backdrop" aria-hidden="true">
        <div className="app-backdrop-grid"></div>
        <div className="app-backdrop-glow app-backdrop-glow-left"></div>
        <div className="app-backdrop-glow app-backdrop-glow-right"></div>
      </div>

      <header className="main-header app-header">
        <div className="app-header-inner">
          <Link href="/" className="brand-link">
            <span className="brand-mark">M</span>
            <span className="brand-copy">
              <span className="brand-title">FK UMY Streaming App</span>
              <span className="brand-subtitle">Maintainer: Anargya</span>
            </span>
          </Link>

          <div className="header-actions">
            <nav className="top-nav">
              <Link className="top-nav-link" href="/">
                Home
              </Link>
              <Link className="top-nav-link" href="/dashboard">
                Dashboard
              </Link>
              {showSubscriptionFab && (
                <Link className="top-nav-link top-nav-link-accent" href="/berlangganan">
                  Berlangganan
                </Link>
              )}
              <Link className="top-nav-link" href="/about">
                About
              </Link>
            </nav>

            <button
              type="button"
              className="theme-toggle"
              aria-label="Beralih mode terang atau gelap"
              onClick={handleToggleTheme}
            >
              <span className="theme-icon theme-icon-sun" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path
                    d="M12 3v2.25M12 18.75V21M5.636 5.636l1.591 1.591M16.773 16.773l1.591 1.591M3 12h2.25M18.75 12H21M5.636 18.364l1.591-1.591M16.773 7.227l1.591-1.591M15.75 12A3.75 3.75 0 1 1 8.25 12a3.75 3.75 0 0 1 7.5 0Z"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.7"
                  />
                </svg>
              </span>
              <span className="theme-icon theme-icon-moon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path
                    d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.7"
                  />
                </svg>
              </span>
            </button>

            <div className="relative shrink-0" ref={dropdownRef}>
              <button
                onClick={() => setOpen((current) => !current)}
                className="avatar-button"
                aria-label="Buka menu akun"
              >
                {user?.photoURL ? (
                  <Image
                    src={user.photoURL}
                    alt={user.email || "Foto profil"}
                    width={36}
                    height={36}
                    className="avatar-image"
                  />
                ) : (
                  <div className="avatar-fallback">
                    {user?.email?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                )}
              </button>

              <div
                className={`account-menu ${
                  open ? "account-menu-open" : "account-menu-closed"
                }`}
              >
                <div className="account-menu-panel">
                  {!user ? (
                    <Link href="/login" className="account-menu-item">
                      Login
                    </Link>
                  ) : (
                    <>
                      <div className="account-menu-email">{user.email}</div>

                      <Link href="/profile" className="account-menu-item">
                        Profile
                      </Link>

                      {role === "admin" && (
                        <Link href="/admin" className="account-menu-item account-menu-item-accent">
                          Admin
                        </Link>
                      )}

                      <button
                        onClick={handleLogout}
                        className="account-menu-item account-menu-item-danger"
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

      <main className="app-main">{children}</main>

      <footer className="site-footer">
        <div className="site-footer-inner">
          <p>{`Copyright ${currentYear} Anargya Prima Anubhawa. All rights reserved.`}</p>
        </div>
      </footer>

      {showSubscriptionFab && pathname !== "/berlangganan" && (
        <Link href="/berlangganan" className="support-fab">
          <span className="support-fab-icon">
            <i className="fas fa-plus"></i>
          </span>
          <span className="support-fab-text">Aktifkan akses materi</span>
        </Link>
      )}
    </>
  );
}
