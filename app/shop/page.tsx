"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { useToast } from "@/components/Feedback";
import { PhotoField } from "@/components/PhotoField";
import { isPackageImage, mediaSrc } from "@/lib/publish-plans";
import { DEFAULT_SHOP_IMAGE, nid, type ShopKind, type ShopPlan } from "@/lib/store";

const COPY: Record<
  ShopKind,
  {
    title: string;
    blurb: string;
    photoLabel: string;
    photoHint: string;
    nameLabel: string;
    namePh: string;
    investPh: string;
    returnPh: string;
    termPh: string;
    examples: string;
    badge: string;
  }
> = {
  jewelry: {
    title: "Add jewelry package",
    blurb: "Gold, diamonds, rings, bracelets, and sets. Clear photo, invest range, and return — saved to the shop database and shown on member Shop → Jewelry.",
    photoLabel: "Jewelry photo",
    photoHint: "Use a clean product shot (ring, bracelet, necklace, or set). JPG / PNG / WEBP up to 4 MB. Stored in the database with this package.",
    nameLabel: "Jewelry name",
    namePh: "e.g. 22K gold bracelet — 10g",
    investPh: "$100 – $250",
    returnPh: "$1.50",
    termPh: "90",
    examples: "Rings · Necklaces · Bracelets · Bangles · Diamond sets",
    badge: "Jewelry",
  },
  electronics: {
    title: "Add electronics package",
    blurb: "Phones, laptops, TVs, and gadgets. Clear product photo, invest range, and return — saved to the shop database and shown on member Shop → Electronics.",
    photoLabel: "Electronics photo",
    photoHint: "Use a clear product shot (phone, laptop, TV, or appliance). JPG / PNG / WEBP up to 4 MB. Stored in the database with this package.",
    nameLabel: "Product name",
    namePh: "e.g. Samsung Galaxy A55 128GB",
    investPh: "$200 – $500",
    returnPh: "$2.40",
    termPh: "120",
    examples: "Mobiles · Laptops · Tablets · TVs · Home appliances",
    badge: "Electronics",
  },
};

export default function Page() {
  const { toast, node } = useToast();
  const [rows, setRows] = useState<ShopPlan[]>([]);
  const [name, setName] = useState("");
  const [range, setRange] = useState("");
  const [income, setIncome] = useState("");
  const [days, setDays] = useState("90");
  const [kind, setKind] = useState<ShopKind>("jewelry");
  const [image, setImage] = useState(DEFAULT_SHOP_IMAGE.jewelry);
  const [busy, setBusy] = useState(false);
  const guide = COPY[kind];

  const counts = useMemo(
    () => ({
      jewelry: rows.filter((r) => r.kind === "jewelry").length,
      electronics: rows.filter((r) => r.kind === "electronics").length,
    }),
    [rows]
  );

  async function load() {
    const res = await fetch("/api/shop-packages", { cache: "no-store" });
    const data = (await res.json()) as { packages?: ShopPlan[]; error?: string };
    if (!res.ok) {
      const err = data.error || "Could not load shop_packages";
      toast(
        err.includes("schema cache") || err.includes("Could not find the table")
          ? "Run scripts/shop-tables.sql in Zuvo SQL Editor, then refresh this page."
          : err
      );
      return;
    }
    setRows(Array.isArray(data.packages) ? data.packages : []);
  }

  useEffect(() => {
    void load();
  }, []);

  function switchKind(next: ShopKind) {
    setKind(next);
    if (image === DEFAULT_SHOP_IMAGE.jewelry || image === DEFAULT_SHOP_IMAGE.electronics) {
      setImage(DEFAULT_SHOP_IMAGE[next]);
    }
    setDays(next === "jewelry" ? "90" : "120");
  }

  async function save(plan: ShopPlan, message?: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/shop-packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(plan),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast(data.error || "Save failed");
        return;
      }
      await load();
      if (message) toast(message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/shop-packages?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast(data.error || "Delete failed");
        return;
      }
      await load();
      toast("Removed from shop_packages");
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (!name.trim() || !range.trim() || !income.trim()) {
      toast("Name, invest amount and expected return are required");
      return;
    }
    if (!isPackageImage(image)) {
      toast(`Upload a ${kind === "jewelry" ? "jewelry" : "product"} photo first`);
      return;
    }
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "package";
    void save(
      {
        id: nid(`${kind}-${slug}-`),
        name: name.trim(),
        range: range.trim(),
        income: income.trim(),
        days: Number(days) || 30,
        kind,
        image: image.trim(),
        enabled: true,
      },
      `${guide.badge} package live on member Shop`
    );
    setName("");
    setRange("");
    setIncome("");
    setDays(kind === "jewelry" ? "90" : "120");
    setImage(DEFAULT_SHOP_IMAGE[kind]);
  }

  return (
    <AdminShell title="Shop packages">
      {node}

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="admin-card px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.12em] text-white/40">Jewelry</p>
          <p className="mt-1 text-[22px] font-semibold tabular-nums">{counts.jewelry}</p>
          <p className="text-[12px] text-white/45">live on Shop → Jewelry</p>
        </div>
        <div className="admin-card px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.12em] text-white/40">Electronics</p>
          <p className="mt-1 text-[22px] font-semibold tabular-nums">{counts.electronics}</p>
          <p className="text-[12px] text-white/45">live on Shop → Electronics</p>
        </div>
      </div>

      <form className="admin-card mb-4 overflow-hidden p-0" onSubmit={onSubmit}>
        <div className="shop-kind-bar">
          <button
            type="button"
            className={`shop-kind-tab ${kind === "jewelry" ? "is-on" : ""}`}
            onClick={() => switchKind("jewelry")}
          >
            Jewelry
          </button>
          <button
            type="button"
            className={`shop-kind-tab ${kind === "electronics" ? "is-on" : ""}`}
            onClick={() => switchKind("electronics")}
          >
            Electronics
          </button>
        </div>

        <div className="grid gap-3 p-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <h2 className="text-[16px] font-semibold tracking-tight">{guide.title}</h2>
            <p className="mt-1.5 text-[13px] leading-6 text-white/50">{guide.blurb}</p>
            <p className="mt-2 text-[12px] text-white/35">{guide.examples}</p>
          </div>

          <PhotoField
            value={image}
            onChange={setImage}
            onError={toast}
            label={guide.photoLabel}
            hint={guide.photoHint}
          />

          <div>
            <label className="field-label">{guide.nameLabel}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="admin-input"
              placeholder={guide.namePh}
            />
          </div>

          <div>
            <label className="field-label">Invest amount</label>
            <input
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="admin-input"
              placeholder={guide.investPh}
            />
            <p className="mt-1.5 text-[11px] text-white/35">Shown on the member card as the invest range.</p>
          </div>

          <div>
            <label className="field-label">Expected return</label>
            <input
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              className="admin-input"
              placeholder={guide.returnPh}
            />
          </div>

          <div>
            <label className="field-label">Plan term (days)</label>
            <input
              value={days}
              onChange={(e) => setDays(e.target.value)}
              className="admin-input"
              placeholder={guide.termPh}
              inputMode="numeric"
            />
          </div>

          <div className="md:col-span-2 flex flex-wrap items-center gap-3 pt-1">
            <button type="submit" className="admin-btn px-8" disabled={busy}>
              {busy ? "Saving…" : `Publish ${guide.badge.toLowerCase()} package`}
            </button>
            <p className="text-[12px] text-white/40">Details → shop_packages · photos → Storage package-photos · live on member Shop.</p>
          </div>
        </div>
      </form>

      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h3 className="text-[14px] font-semibold">Published packages</h3>
          <p className="text-[12px] text-white/45">Edit any field — changes save to the database and update the member app.</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="admin-card px-5 py-10 text-center text-[13px] text-white/45">
          No shop packages yet. Choose Jewelry or Electronics above and publish the first package.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((plan) => {
            const label = plan.kind === "electronics" ? "Electronics" : "Jewelry";
            return (
              <article key={plan.id} className="admin-card space-y-2 overflow-hidden p-0">
                <div className="relative h-40 overflow-hidden bg-[#111]">
                  <img src={mediaSrc(plan.image)} alt="" className="h-full w-full object-cover" />
                  <span className={`shop-badge ${plan.kind === "electronics" ? "is-electronics" : "is-jewelry"}`}>
                    {label}
                  </span>
                </div>
                <div className="space-y-2 p-4 pt-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      defaultValue={plan.name}
                      className="admin-input h-10 min-w-[140px] flex-1"
                      onBlur={(e) => {
                        if (e.target.value.trim()) void save({ ...plan, name: e.target.value.trim() });
                      }}
                    />
                    <button
                      type="button"
                      className="ghost-btn"
                      disabled={busy}
                      onClick={() =>
                        void save({ ...plan, enabled: !plan.enabled }, plan.enabled ? "Hidden from Shop" : "On Shop page")
                      }
                    >
                      {plan.enabled ? "On Shop" : "Hidden"}
                    </button>
                    <button type="button" className="ghost-btn" disabled={busy} onClick={() => void remove(plan.id)}>
                      Delete
                    </button>
                  </div>
                  <PhotoField
                    value={plan.image}
                    onError={toast}
                    onChange={(url) => void save({ ...plan, image: url })}
                    label={plan.kind === "electronics" ? "Electronics photo" : "Jewelry photo"}
                    hint="Photo is saved in Storage bucket package-photos."
                  />
                  <label className="field-label">Category</label>
                  <select
                    defaultValue={plan.kind}
                    className="admin-input h-10"
                    onChange={(e) => {
                      const next: ShopKind = e.target.value === "electronics" ? "electronics" : "jewelry";
                      void save({ ...plan, kind: next });
                    }}
                  >
                    <option value="jewelry">Jewelry</option>
                    <option value="electronics">Electronics</option>
                  </select>
                  <label className="field-label">Invest amount</label>
                  <input
                    defaultValue={plan.range}
                    className="admin-input h-10"
                    onBlur={(e) => void save({ ...plan, range: e.target.value })}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="field-label">Expected return</label>
                      <input
                        defaultValue={plan.income}
                        className="admin-input h-10"
                        onBlur={(e) => void save({ ...plan, income: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="field-label">Term (days)</label>
                      <input
                        defaultValue={plan.days}
                        className="admin-input h-10"
                        onBlur={(e) => void save({ ...plan, days: Number(e.target.value) || 1 })}
                      />
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}
