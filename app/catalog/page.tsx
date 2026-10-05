"use client";

import { useEffect, useState } from "react";
import { AddPanel } from "@/components/AddPanel";
import { AdminShell } from "@/components/AdminShell";
import { useToast } from "@/components/Feedback";
import {
  getStore,
  nid,
  patchStore,
  type ActivityRow,
  type FaqRow,
  type NoticeRow,
} from "@/lib/store";

type Tab = "notices" | "faq" | "activities";

export default function Page() {
  const { toast, node } = useToast();
  const [tab, setTab] = useState<Tab>("notices");
  const [notices, setNotices] = useState<NoticeRow[]>([]);
  const [faqs, setFaqs] = useState<FaqRow[]>([]);
  const [acts, setActs] = useState<ActivityRow[]>([]);
  const [nTitle, setNTitle] = useState("");
  const [nBody, setNBody] = useState("");
  const [fTab, setFTab] = useState("cars");
  const [fTitle, setFTitle] = useState("");
  const [fBody, setFBody] = useState("");
  const [aTitle, setATitle] = useState("");
  const [aDesc, setADesc] = useState("");
  const [aTime, setATime] = useState("Long-term");

  function refresh() {
    const s = getStore();
    setNotices(s.notices);
    setFaqs(s.faqs);
    setActs(s.activities);
  }

  useEffect(() => refresh(), []);

  return (
    <AdminShell title="App catalog">
      {node}
      <div className="mb-4 flex flex-wrap gap-2">
        {(["notices", "faq", "activities"] as const).map((id) => (
          <button key={id} type="button" className={`ghost-btn ${tab === id ? "is-on" : ""}`} onClick={() => setTab(id)}>
            {id === "notices" ? "Home notices" : id === "faq" ? "FAQ articles" : "Activities"}
          </button>
        ))}
      </div>
      {tab === "notices" ? (
        <>
          <AddPanel title="Add notice" hint="Banners / announcements shown on the member home after API wiring." onSubmit={() => {
            if (!nTitle.trim()) {
              toast("Title required");
              return;
            }
            patchStore((s) => {
              s.notices.unshift({ id: nid("n"), title: nTitle.trim(), body: nBody.trim(), enabled: true });
            }, { action: "notice_add", target: nTitle.trim() });
            setNTitle("");
            setNBody("");
            refresh();
            toast("Notice added");
          }}>
            <input value={nTitle} onChange={(e) => setNTitle(e.target.value)} className="admin-input" placeholder="Title" />
            <textarea value={nBody} onChange={(e) => setNBody(e.target.value)} className="admin-input" placeholder="Message" />
          </AddPanel>
          <div className="space-y-3">
            {notices.map((row) => (
              <article key={row.id} className="admin-card space-y-2 p-4">
                <input defaultValue={row.title} className="admin-input" onBlur={(e) => {
                  patchStore((s) => {
                    const n = s.notices.find((x) => x.id === row.id);
                    if (n) n.title = e.target.value;
                  });
                  refresh();
                }} />
                <textarea defaultValue={row.body} className="admin-input" onBlur={(e) => {
                  patchStore((s) => {
                    const n = s.notices.find((x) => x.id === row.id);
                    if (n) n.body = e.target.value;
                  });
                  refresh();
                }} />
                <div className="flex gap-2">
                  <button type="button" className="ghost-btn" onClick={() => {
                    patchStore((s) => {
                      const n = s.notices.find((x) => x.id === row.id);
                      if (n) n.enabled = !n.enabled;
                    });
                    refresh();
                  }}>{row.enabled ? "Enabled" : "Disabled"}</button>
                  <button type="button" className="ghost-btn" onClick={() => {
                    patchStore((s) => {
                      s.notices = s.notices.filter((x) => x.id !== row.id);
                    }, { action: "notice_delete", target: row.id });
                    refresh();
                    toast("Notice removed");
                  }}>Delete</button>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : null}
      {tab === "faq" ? (
        <>
          <AddPanel title="Add FAQ" hint="Help for car packages, wallet, and about." onSubmit={() => {
            if (!fTitle.trim() || !fBody.trim()) {
              toast("Title and body required");
              return;
            }
            patchStore((s) => {
              s.faqs.unshift({ id: nid("f"), tab: fTab, title: fTitle.trim(), body: fBody.trim(), enabled: true });
            }, { action: "faq_add", target: fTitle.trim() });
            setFTitle("");
            setFBody("");
            refresh();
            toast("FAQ added");
          }}>
            <select value={fTab} onChange={(e) => setFTab(e.target.value)} className="admin-input">
              <option value="cars">cars</option>
              <option value="wallet">wallet</option>
              <option value="about">about</option>
            </select>
            <input value={fTitle} onChange={(e) => setFTitle(e.target.value)} className="admin-input" placeholder="Question" />
            <textarea value={fBody} onChange={(e) => setFBody(e.target.value)} className="admin-input md:col-span-2" placeholder="Answer" />
          </AddPanel>
          <div className="space-y-3">
            {faqs.map((row) => (
              <article key={row.id} className="admin-card space-y-2 p-4">
                <p className="text-[11px] uppercase tracking-wide text-white/35">{row.tab}</p>
                <input defaultValue={row.title} className="admin-input" onBlur={(e) => {
                  patchStore((s) => {
                    const n = s.faqs.find((x) => x.id === row.id);
                    if (n) n.title = e.target.value;
                  });
                  refresh();
                }} />
                <textarea defaultValue={row.body} className="admin-input" onBlur={(e) => {
                  patchStore((s) => {
                    const n = s.faqs.find((x) => x.id === row.id);
                    if (n) n.body = e.target.value;
                  });
                  refresh();
                }} />
                <div className="flex gap-2">
                  <button type="button" className="ghost-btn" onClick={() => {
                    patchStore((s) => {
                      const n = s.faqs.find((x) => x.id === row.id);
                      if (n) n.enabled = !n.enabled;
                    });
                    refresh();
                  }}>{row.enabled ? "Enabled" : "Disabled"}</button>
                  <button type="button" className="ghost-btn" onClick={() => {
                    patchStore((s) => {
                      s.faqs = s.faqs.filter((x) => x.id !== row.id);
                    }, { action: "faq_delete", target: row.id });
                    refresh();
                    toast("FAQ removed");
                  }}>Delete</button>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : null}
      {tab === "activities" ? (
        <>
          <AddPanel title="Add activity" hint="Campaigns like check-in, lucky draw, invite." onSubmit={() => {
            if (!aTitle.trim()) {
              toast("Title required");
              return;
            }
            patchStore((s) => {
              s.activities.unshift({
                id: nid("act"),
                title: aTitle.trim(),
                desc: aDesc.trim(),
                time: aTime.trim() || "Long-term",
                status: "live",
                enabled: true,
              });
            }, { action: "activity_add", target: aTitle.trim() });
            setATitle("");
            setADesc("");
            refresh();
            toast("Activity added");
          }}>
            <input value={aTitle} onChange={(e) => setATitle(e.target.value)} className="admin-input" placeholder="Title" />
            <input value={aTime} onChange={(e) => setATime(e.target.value)} className="admin-input" placeholder="Schedule" />
            <textarea value={aDesc} onChange={(e) => setADesc(e.target.value)} className="admin-input md:col-span-2" placeholder="Description" />
          </AddPanel>
          <div className="space-y-3">
            {acts.map((row) => (
              <article key={row.id} className="admin-card space-y-2 p-4">
                <input defaultValue={row.title} className="admin-input" onBlur={(e) => {
                  patchStore((s) => {
                    const n = s.activities.find((x) => x.id === row.id);
                    if (n) n.title = e.target.value;
                  });
                  refresh();
                }} />
                <textarea defaultValue={row.desc} className="admin-input" onBlur={(e) => {
                  patchStore((s) => {
                    const n = s.activities.find((x) => x.id === row.id);
                    if (n) n.desc = e.target.value;
                  });
                  refresh();
                }} />
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="ghost-btn" onClick={() => {
                    patchStore((s) => {
                      const n = s.activities.find((x) => x.id === row.id);
                      if (n) n.status = n.status === "live" ? "ended" : "live";
                    });
                    refresh();
                  }}>{row.status}</button>
                  <button type="button" className="ghost-btn" onClick={() => {
                    patchStore((s) => {
                      const n = s.activities.find((x) => x.id === row.id);
                      if (n) n.enabled = !n.enabled;
                    });
                    refresh();
                  }}>{row.enabled ? "Enabled" : "Disabled"}</button>
                  <button type="button" className="ghost-btn" onClick={() => {
                    patchStore((s) => {
                      s.activities = s.activities.filter((x) => x.id !== row.id);
                    }, { action: "activity_delete", target: row.id });
                    refresh();
                    toast("Activity removed");
                  }}>Delete</button>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : null}
    </AdminShell>
  );
}
