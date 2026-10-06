"use client";

import { useEffect, useState } from "react";
import { AddPanel } from "@/components/AddPanel";
import { AdminShell } from "@/components/AdminShell";
import { useToast } from "@/components/Feedback";
import { PhotoField } from "@/components/PhotoField";
import { isPackageImage, mediaSrc } from "@/lib/publish-plans";
import { DEFAULT_CAR_IMAGE, nid, type CarKind, type VipPlan } from "@/lib/store";

export default function Page() {
  const { toast, node } = useToast();
  const [rows, setRows] = useState<VipPlan[]>([]);
  const [name, setName] = useState("");
  const [range, setRange] = useState("");
  const [income, setIncome] = useState("");
  const [days, setDays] = useState("30");
  const [kind, setKind] = useState<CarKind>("new");
  const [image, setImage] = useState(DEFAULT_CAR_IMAGE.new);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/packages", { cache: "no-store" });
    const data = (await res.json()) as { packages?: VipPlan[]; error?: string };
    if (!res.ok) {
      toast(data.error || "Could not load car_packages");
      return;
    }
    setRows(Array.isArray(data.packages) ? data.packages : []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function save(plan: VipPlan, message?: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/packages", {
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
      const res = await fetch(`/api/packages?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast(data.error || "Delete failed");
        return;
      }
      await load();
      toast("Removed from car_packages");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell title="Car packages">
      {node}
      <AddPanel
        title="Add car package"
        hint="Saved to Zuvo table car_packages (name, photo, stock, invest, return, term). Member Cars page reads this table."
        submit="Save to database"
        onSubmit={() => {
          if (busy) return;
          if (!name.trim() || !range.trim() || !income.trim()) {
            toast("Name, invest range and expected return are required");
            return;
          }
          if (!isPackageImage(image)) {
            toast("Upload a car photo or paste a photo link");
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
            "Saved to car_packages — live on member Cars"
          );
          setName("");
          setRange("");
          setIncome("");
          setDays("30");
          setImage(DEFAULT_CAR_IMAGE[kind]);
        }}
      >
        <PhotoField value={image} onChange={setImage} onError={toast} />
        <div>
          <label className="field-label">Package name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="admin-input" placeholder="City sedan" />
        </div>
        <div>
          <label className="field-label">Stock</label>
          <select
            value={kind}
            className="admin-input"
            onChange={(e) => {
              const next = e.target.value === "used" ? "used" : "new";
              setKind(next);
              if (image === DEFAULT_CAR_IMAGE.new || image === DEFAULT_CAR_IMAGE.used) {
                setImage(DEFAULT_CAR_IMAGE[next]);
              }
            }}
          >
            <option value="new">New cars</option>
            <option value="used">Used cars</option>
          </select>
        </div>
        <div>
          <label className="field-label">Invest amount</label>
          <input value={range} onChange={(e) => setRange(e.target.value)} className="admin-input" placeholder="$100 – $199" />
        </div>
        <div>
          <label className="field-label">Expected return</label>
          <input value={income} onChange={(e) => setIncome(e.target.value)} className="admin-input" placeholder="$3.00" />
        </div>
        <div>
          <label className="field-label">Term (days)</label>
          <input value={days} onChange={(e) => setDays(e.target.value)} className="admin-input" placeholder="30" />
        </div>
      </AddPanel>
      <p className="mb-4 text-[13px] leading-6 text-white/50">
        Each card is one row in <strong>car_packages</strong>. Enabled rows show on the member New / Used Cars tabs.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((plan) => (
          <article key={plan.id} className="admin-card space-y-2 overflow-hidden p-0">
            <div className="h-40 overflow-hidden bg-[#111]">
              <img src={mediaSrc(plan.image)} alt="" className="h-full w-full object-cover" />
            </div>
            <div className="space-y-2 p-4 pt-3">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  defaultValue={plan.name}
                  className="admin-input h-10 min-w-[140px] flex-1"
                  onBlur={(e) => {
                    if (e.target.value.trim())
                      void save({ ...plan, name: e.target.value.trim() });
                  }}
                />
                <button
                  type="button"
                  className="ghost-btn"
                  disabled={busy}
                  onClick={() => void save({ ...plan, enabled: !plan.enabled }, plan.enabled ? "Hidden from Cars" : "On Cars page")}
                >
                  {plan.enabled ? "On Cars page" : "Hidden"}
                </button>
                <button type="button" className="ghost-btn" disabled={busy} onClick={() => void remove(plan.id)}>
                  Delete
                </button>
              </div>
              <PhotoField
                value={plan.image}
                onError={toast}
                onChange={(url) => void save({ ...plan, image: url })}
              />
              <label className="field-label">Stock</label>
              <select
                defaultValue={plan.kind}
                className="admin-input h-10"
                onChange={(e) => {
                  const next: CarKind = e.target.value === "used" ? "used" : "new";
                  void save({ ...plan, kind: next });
                }}
              >
                <option value="new">New cars</option>
                <option value="used">Used cars</option>
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
        ))}
      </div>
    </AdminShell>
  );
}
