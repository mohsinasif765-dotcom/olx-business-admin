"use client";

const SESSION_KEY = "olx-admin-session";
const CREDS_KEY = "olx-admin-credentials";

export const DEFAULT_ADMIN_USER = "admin";
export const DEFAULT_ADMIN_PASS = "olx2026";

type Creds = { user: string; pass: string };

function readCreds(): Creds {
  if (typeof window === "undefined") {
    return { user: DEFAULT_ADMIN_USER, pass: DEFAULT_ADMIN_PASS };
  }
  const raw = window.localStorage.getItem(CREDS_KEY);
  if (!raw) {
    const seed = { user: DEFAULT_ADMIN_USER, pass: DEFAULT_ADMIN_PASS };
    window.localStorage.setItem(CREDS_KEY, JSON.stringify(seed));
    return seed;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<Creds>;
    return {
      user: String(parsed.user || DEFAULT_ADMIN_USER).trim() || DEFAULT_ADMIN_USER,
      pass: String(parsed.pass ?? DEFAULT_ADMIN_PASS),
    };
  } catch {
    return { user: DEFAULT_ADMIN_USER, pass: DEFAULT_ADMIN_PASS };
  }
}

function writeCreds(creds: Creds) {
  window.localStorage.setItem(CREDS_KEY, JSON.stringify(creds));
}

export function getAdminUsername() {
  return readCreds().user;
}

export function isAdminLoggedIn() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(SESSION_KEY) === "1";
}

export function loginAdmin(user: string, pass: string) {
  const creds = readCreds();
  if (user.trim() === creds.user && pass === creds.pass) {
    window.localStorage.setItem(SESSION_KEY, "1");
    return true;
  }
  return false;
}

export function logoutAdmin() {
  window.localStorage.removeItem(SESSION_KEY);
}

export function changeAdminPassword(current: string, next: string): { ok: true } | { ok: false; error: string } {
  const creds = readCreds();
  if (current !== creds.pass) {
    return { ok: false, error: "Current password is incorrect." };
  }
  const password = next.trim();
  if (password.length < 8) {
    return { ok: false, error: "New password must be at least 8 characters." };
  }
  if (password === current) {
    return { ok: false, error: "Choose a password different from the current one." };
  }
  writeCreds({ ...creds, pass: password });
  return { ok: true };
}
