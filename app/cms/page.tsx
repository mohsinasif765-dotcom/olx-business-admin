"use client";

import { useEffect, useState } from "react";
import { AddPanel } from "@/components/AddPanel";
import { AdminShell } from "@/components/AdminShell";
import { useToast } from "@/components/Feedback";
import { fetchOpsStore, getStore, patchStore, type CmsPage } from "@/lib/store";

export default function Page() {
  const { toast, node } = useToast();
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [body, setBody] = useState("");
  useEffect(() => {
    void fetchOpsStore().then((s) => setPages(s.cms));
  }, []);

  function save(item: CmsPage) {
    patchStore((s) => {
      const p = s.cms.find((x) => x.slug === item.slug);
      if (p) {
        p.title = item.title;
        p.body = item.body;
      }
    }, { action: "cms_save", target: item.slug });
    setPages(getStore().cms);
    toast("Content saved");
  }

  return (
    <AdminShell title="Content CMS">
      {node}
      <AddPanel title="Add page" hint="Legal or help copy. Slug is the page key (about, terms, …)." onSubmit={() => {
        const key = slug.trim().toLowerCase().replace(/\s+/g, "-");
        if (!key || !title.trim()) {
          toast("Title and slug required");
          return;
        }
        patchStore((s) => {
          if (s.cms.some((p) => p.slug === key)) return;
          s.cms.push({ slug: key, title: title.trim(), body: body.trim() });
        }, { action: "cms_add", target: key });
        setTitle("");
        setSlug("");
        setBody("");
        setPages(getStore().cms);
        toast("Page added");
      }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="admin-input" placeholder="Title" />
        <input value={slug} onChange={(e) => setSlug(e.target.value)} className="admin-input" placeholder="Slug e.g. terms" />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} className="admin-input md:col-span-2" placeholder="Body copy" />
      </AddPanel>
      <p className="mb-4 text-[13px] text-white/50">
        Saved to Zuvo. Agreement, privacy, FAQ intro, and support use these pages. About Us story / company details
        are edited under <strong className="text-white/70">Settings → About Us</strong> (CMS <code className="text-white/55">about</code> body is only a fallback).
      </p>
      <div className="space-y-4">
        {pages.map((page) => (
          <article key={page.slug} className="admin-card space-y-2 p-4">
            <input
              defaultValue={page.title}
              className="admin-input"
              onBlur={(e) => save({ ...page, title: e.target.value })}
            />
            <p className="text-[11px] text-white/35">{page.slug}</p>
            <textarea
              defaultValue={page.body}
              className="admin-input"
              onBlur={(e) => save({ ...page, body: e.target.value })}
            />
            <button
              type="button"
              className="ghost-btn"
              onClick={() => {
                patchStore((s) => {
                  s.cms = s.cms.filter((p) => p.slug !== page.slug);
                }, { action: "cms_delete", target: page.slug });
                setPages(getStore().cms);
                toast("Page removed");
              }}
            >
              Delete page
            </button>
          </article>
        ))}
      </div>
    </AdminShell>
  );
}
