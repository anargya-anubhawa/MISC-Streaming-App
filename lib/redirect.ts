"use client";

const DEFAULT_REDIRECT_PATH = "/dashboard";

export function getCurrentPathWithSearch() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function getSafeRedirectPath(
  value: string | null | undefined,
  fallback = DEFAULT_REDIRECT_PATH
) {
  if (!value) return fallback;

  try {
    const url = new URL(value, window.location.origin);

    if (url.origin !== window.location.origin) {
      return fallback;
    }

    const path = `${url.pathname}${url.search}${url.hash}`;
    return url.pathname === "/login" || url.pathname === "/complete-profile"
      ? fallback
      : path;
  } catch {
    return value.startsWith("/") && !value.startsWith("//") ? value : fallback;
  }
}

export function createLoginPath(nextPath = getCurrentPathWithSearch()) {
  const safeNextPath = getSafeRedirectPath(nextPath);
  return `/login?next=${encodeURIComponent(safeNextPath)}`;
}

export function createCompleteProfilePath(nextPath = DEFAULT_REDIRECT_PATH) {
  const safeNextPath = getSafeRedirectPath(nextPath);
  return `/complete-profile?next=${encodeURIComponent(safeNextPath)}`;
}
