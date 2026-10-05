"use client";

import { useEffect, useState } from "react";

export function useToast() {
  const [msg, setMsg] = useState("");
  useEffect(() => {
    if (!msg) return;
    const t = window.setTimeout(() => setMsg(""), 2200);
    return () => window.clearTimeout(t);
  }, [msg]);
  return {
    toast: setMsg,
    node: msg ? <div className="admin-toast">{msg}</div> : null,
  };
}

export function ConfirmBar({
  text,
  onYes,
  onNo,
}: {
  text: string;
  onYes: () => void;
  onNo: () => void;
}) {
  return (
    <div className="admin-confirm-mask" role="dialog" aria-modal="true">
      <div className="admin-confirm">
        <p>{text}</p>
        <div className="flex gap-2">
          <button type="button" className="admin-btn px-4" onClick={onYes}>
            Confirm
          </button>
          <button type="button" className="ghost-btn h-11 px-4" onClick={onNo}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
