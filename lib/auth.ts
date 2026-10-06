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

function sessionStore() {
  if (typeof window === "undefined") return null;
  window.localStorage.removeItem(SESSION_KEY);
  return window.sessionStorage;
}

export function isAdminLoggedIn() {
  return sessionStore()?.getItem(SESSION_KEY) === "1";
}

export async function loginAdmin(user: string, pass: string) {
  const store = sessionStore();
  if (!store) return false;
  try {
    const res = await fetch("/api/admin-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user, pass }),
    });
    if (!res.ok) return false;
    store.setItem(SESSION_KEY, "1");
    return true;
  } catch {
    return false;
  }
}

export function logoutAdmin() {
  sessionStore()?.removeItem(SESSION_KEY);
}

export async function changeAdminPassword(current: string, next: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const password = next.trim();
  if (password.length < 8) {
    return { ok: false, error: "New password must be at least 8 characters." };
  }
  try {
    const res = await fetch("/api/admin-login", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current, next: password }),
    });
    const data = (await res.json()) as { error?: string };
    if (res.status === 401 || data.error === "badpass") {
      return { ok: false, error: "Current password is incorrect." };
    }
    if (data.error === "same") {
      return { ok: false, error: "Choose a password different from the current one." };
    }
    if (!res.ok) {
      return { ok: false, error: data.error || "Could not save password." };
    }
    writeCreds({ user: readCreds().user, pass: password });
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not save password." };
  }
}
