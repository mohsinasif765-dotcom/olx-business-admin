"use client";

import { useRef, useState } from "react";
import { isPackageImage, mediaSrc, uploadCarPhoto } from "@/lib/publish-plans";

export function PhotoField({
  value,
  onChange,
  onError,
}: {
  value: string;
  onChange: (url: string) => void;
  onError: (message: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    const result = await uploadCarPhoto(file);
    if (result.ok) {
      setBusy(false);
      onChange(result.url);
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setBusy(false);
      onError(result.error);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setBusy(false);
      const url = typeof reader.result === "string" ? reader.result : "";
      if (!url.startsWith("data:image/")) {
        onError(result.error);
        return;
      }
      onChange(url);
    };
    reader.onerror = () => {
      setBusy(false);
      onError(result.error);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="md:col-span-2 space-y-2">
      <p className="text-[12px] font-medium text-white/55">Car photo</p>
      <div className="photo-field">
        <div className="photo-preview">
          {isPackageImage(value) ? (
            <img src={mediaSrc(value)} alt="" />
          ) : (
            <span>No photo</span>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              void onFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            className="admin-btn w-full sm:w-auto px-5"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? "Uploading…" : "Upload photo"}
          </button>
          <p className="text-[12px] leading-5 text-white/40">
            JPG, PNG or WEBP, up to 4 MB. Members see this on the Cars card. Later this same file will go to your database storage.
          </p>
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="admin-input"
            placeholder="Or paste a photo link"
          />
        </div>
      </div>
    </div>
  );
}
