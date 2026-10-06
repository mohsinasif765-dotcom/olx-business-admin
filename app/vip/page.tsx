"use client";

import { useEffect, useState } from "react";
import { AddPanel } from "@/components/AddPanel";
import { AdminShell } from "@/components/AdminShell";
import { useToast } from "@/components/Feedback";
import { PhotoField } from "@/components/PhotoField";
import { isPackageImage, mediaSrc, publishCarCatalog } from "@/lib/publish-plans";
import { DEFAULT_CAR_IMAGE, fetchOpsStore, getStore, nid, patchStore, type CarKind, type VipPlan } from "@/lib/store";

export default function Page() {
  const { toast, node } = useToast();
  const [rows, setRows] = useState<VipPlan[]>([]);
  const [name, setName] = useState("");
  const [range, setRange] = useState("");
  const [income, setIncome] = useState("");
  const [days, setDays] = useState("30");
  const [kind, setKind] = useState<CarKind>("new");
  const [image, setImage] = useState(DEFAULT_CAR_IMAGE.new);

  useEffect(() => {
    void fetchOpsStore().then((s) => setRows(s.vips));
  }, []);

  async function commit(
    update: (store: ReturnType<typeof getStore>) => void,
    audit?: { action: string; target: string },
    notify = true
  ) {
    const store = patchStore(update, audit);
    setRows(store.vips);
    const result = await publishCarCatalog(store.vips);
    if (notify || !result.ok) toast(result.message);
  }

  return (
    <AdminShell title="Car packages">
      {node}
      <AddPanel
        title="Add car package"
        hint="Same card the member sees on Cars. Saved to Zuvo and shown live after publish."
        submit="Add and publish"
        onSubmit={() => {
          if (!name.trim() || !range.trim() || !income.trim()) {
            toast("Name, invest range and expected return are required");
            return;
          }
          if (!isPackageImage(image)) {
            toast("Upload a car photo or paste a photo link");
            return;
          }
          const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "package";
          void commit(
            (s) => {
              s.vips.push({
                id: nid(`${kind}-${slug}-`),
                name: name.trim(),
                range: range.trim(),
                income: income.trim(),
                days: Number(days) || 30,
                kind,
                image: image.trim(),
                enabled: true,
              });
            },
            { action: "package_add", target: name.trim() }
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
        Product → Car packages: add name, invest, return, term, then Upload photo. Enabled packages go to the member Cars page.
        Member app should be running on port 3000 so photos and publish reach it.
      </p>
      <div className="mb-4">
        <button
          type="button"
          className="admin-btn px-8"
          onClick={() =>
            void commit(() => {}, { action: "package_publish", target: "cars" })
          }
        >
          Publish to Cars page
        </button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((plan) => (
          <article key={JSON.stringify(plan)} className="admin-card space-y-2 overflow-hidden p-0">
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
                      void commit((s) => {
                        const p = s.vips.find((v) => v.id === plan.id);
                        if (p) p.name = e.target.value.trim();
                      }, undefined, false);
                  }}
                />
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() =>
                    void commit(
                      (s) => {
                        const p = s.vips.find((v) => v.id === plan.id);
                        if (p) p.enabled = !p.enabled;
                      },
                      { action: "package_toggle", target: plan.id }
                    )
                  }
                >
                  {plan.enabled ? "On Cars page" : "Hidden"}
                </button>
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() =>
                    void commit(
                      (s) => {
                        s.vips = s.vips.filter((v) => v.id !== plan.id);
                      },
                      { action: "package_delete", target: plan.id }
                    )
                  }
                >
                  Delete
                </button>
              </div>
              <PhotoField
                value={plan.image}
                onError={toast}
                onChange={(url) =>
                  void commit((s) => {
                    const p = s.vips.find((v) => v.id === plan.id);
                    if (p) p.image = url;
                  }, undefined, false)
                }
              />
              <label className="field-label">Stock</label>
              <select
                defaultValue={plan.kind}
                className="admin-input h-10"
                onChange={(e) => {
                  const next: CarKind = e.target.value === "used" ? "used" : "new";
                  void commit((s) => {
                    const p = s.vips.find((v) => v.id === plan.id);
                    if (p) p.kind = next;
                  }, undefined, false);
                }}
              >
                <option value="new">New cars</option>
                <option value="used">Used cars</option>
              </select>
              <label className="field-label">Invest amount</label>
              <input
                defaultValue={plan.range}
                className="admin-input h-10"
                onBlur={(e) =>
                  void commit((s) => {
                    const p = s.vips.find((v) => v.id === plan.id);
                    if (p) p.range = e.target.value;
                  }, undefined, false)
                }
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="field-label">Expected return</label>
                  <input
                    defaultValue={plan.income}
                    className="admin-input h-10"
                    onBlur={(e) =>
                      void commit((s) => {
                        const p = s.vips.find((v) => v.id === plan.id);
                        if (p) p.income = e.target.value;
                      }, undefined, false)
                    }
                  />
                </div>
                <div>
                  <label className="field-label">Term (days)</label>
                  <input
                    defaultValue={plan.days}
                    className="admin-input h-10"
                    onBlur={(e) =>
                      void commit((s) => {
                        const p = s.vips.find((v) => v.id === plan.id);
                        if (p) p.days = Number(e.target.value) || 1;
                      }, undefined, false)
                    }
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
