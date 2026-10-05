"use client";

import { FormEvent, ReactNode } from "react";

export function AddPanel({
  title,
  hint,
  children,
  onSubmit,
  submit = "Add",
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  onSubmit: () => void;
  submit?: string;
}) {
  function handle(event: FormEvent) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form className="admin-card mb-4 grid gap-3 p-5 md:grid-cols-2" onSubmit={handle}>
      <div className="md:col-span-2">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {hint ? <p className="mt-1 text-[12px] leading-5 text-white/42">{hint}</p> : null}
      </div>
      {children}
      <div className="md:col-span-2">
        <button type="submit" className="admin-btn px-8">
          {submit}
        </button>
      </div>
    </form>
  );
}
