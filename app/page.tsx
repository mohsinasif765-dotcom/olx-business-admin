"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PasswordField } from "@/components/PasswordField";
import { DEFAULT_ADMIN_USER, isAdminLoggedIn, loginAdmin } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [user, setUser] = useState(DEFAULT_ADMIN_USER);
  const [pass, setPass] = useState("");

  useEffect(() => {
    if (isAdminLoggedIn()) router.replace("/dashboard");
  }, [router]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pass.trim()) {
      setError("Enter your password.");
      return;
    }
    const ok = await loginAdmin(user, pass);
    if (!ok) {
      setError("Wrong username or password.");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <div className="login-wrap">
      <form className="admin-card login-card w-full max-w-[400px] p-8" onSubmit={onSubmit}>
        <div className="mb-8">
          <img src="/logo.png" alt="OLX Business" className="mb-5 h-11 w-11 rounded-xl bg-white object-contain p-1" />
          <h1 className="text-[22px] font-semibold tracking-tight text-[#f4f5f8]">Sign in</h1>
          <p className="mt-1.5 text-[13px] leading-5 text-[#9aa0ae]">OLX Business operations console</p>
        </div>
        <label className="mb-1.5 block text-[12px] font-medium text-white/55">Username</label>
        <input
          value={user}
          onChange={(e) => setUser(e.target.value)}
          className="admin-input mb-4"
          autoComplete="username"
        />
        <label className="mb-1.5 block text-[12px] font-medium text-white/55">Password</label>
        <div className="mb-6">
          <PasswordField
            value={pass}
            onChange={setPass}
            autoComplete="current-password"
            placeholder="Enter password"
            autoFocus
          />
        </div>
        {error ? <p className="mb-4 text-center text-[13px] text-[#ff9aa8]">{error}</p> : null}
        <button type="submit" className="admin-btn w-full">
          Sign in
        </button>
      </form>
    </div>
  );
}
