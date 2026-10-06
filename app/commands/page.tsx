"use client";

import { useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { ConfirmBar, useToast } from "@/components/Feedback";
import { getStore, replaceStore, type Store } from "@/lib/store";

export default function Page() {
  const { toast, node } = useToast();
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const res = await fetch("/api/commands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "publish" }),
      });
      const data = (await res.json()) as { message?: string; error?: string; users?: Store["users"] };
      if (!res.ok) {
        toast(data.error || "Command failed");
        return;
      }
      if (data.users) replaceStore({ ...getStore(), users: data.users });
      toast(data.message || "Done");
    } finally {
      setBusy(false);
      setAsk(false);
    }
  }

  return (
    <AdminShell title="Commands">
      {node}
      {ask ? (
        <ConfirmBar
          text={busy ? "Running…" : "Publish enabled packages to the member Cars page?"}
          onYes={() => {
            if (!busy) void run();
          }}
          onNo={() => {
            if (!busy) setAsk(false);
          }}
        />
      ) : null}
      <p className="mb-4 max-w-2xl text-[13px] leading-5 text-white/50">
        Publish pushes enabled car packages and photos to the member Cars page.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <button
          type="button"
          className="admin-card p-5 text-left"
          disabled={busy}
          onClick={() => setAsk(true)}
        >
          <p className="font-semibold">Publish car packages to Cars</p>
          <p className="mt-1 text-[12px] leading-5 text-white/45">
            Pushes enabled packages and photos to the member Cars page.
          </p>
        </button>
      </div>
    </AdminShell>
  );
}
