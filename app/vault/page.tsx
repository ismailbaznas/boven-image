"use client";
import { useEffect, useState } from "react";

type Media = {
  id: string; filename: string; title: string; blogger_url: string; blogger_url_s1600: string;
  hash: string; created_at: string; metadata: any; width: number; height: number;
};

export default function VaultPage() {
  const [items, setItems] = useState<Media[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState("");
  const [selected, setSelected] = useState<Media | null>(null);
  const [form, setForm] = useState({ program: "Penyaluran Fidyah Tahap 3", tanggal: "2026-09-06", lokasi: "Tanah Merah", organisasi: "BAZNAS Kabupaten Boven Digoel", idPrefix: "BDG-2026-FDY" });

  async function load() {
    const r = await fetch(`/api/vault/media?q=${encodeURIComponent(q)}`);
    const j = await r.json();
    setItems(j.data || []);
    if (j.error) setLog(j.error + (j.hint ? "\n" + j.hint : ""));
  }
  useEffect(() => { load(); }, []);

  async function doUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const files = (fd.getAll("files") as File[]).filter((f) => f.size > 0);
    if (!files.length) return alert("Pilih minimal 1 foto");
    // add meta
    fd.set("program", form.program);
    fd.set("tanggal", form.tanggal);
    fd.set("lokasi", form.lokasi);
    fd.set("organisasi", form.organisasi);
    fd.set("idPrefix", form.idPrefix);
    setLoading(true); setLog("");
    const r = await fetch("/api/vault/upload", { method: "POST", body: fd });
    const j = await r.json();
    setLog(JSON.stringify(j, null, 2));
    setLoading(false);
    if (j.success) { (e.target as HTMLFormElement).reset(); load(); }
  }

  function copy(text: string) { navigator.clipboard.writeText(text); }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 20, fontFamily: "ui-sans-system, -apple-system, Segoe UI, Roboto, sans-serif", background: "#0a0a0a", color: "#ededed", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0 }}>MEDIA VAULT <span style={{ fontWeight: 400, color: "#a1a1aa", fontSize: 14 }}>— Boven Digoel</span></h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <a href="/" style={{ background: "#27272a", color: "#fff", padding: "8px 12px", borderRadius: 999, textDecoration: "none", fontSize: 12 }}>🧪 Lab</a>
          <a href="/api/auth/login" style={{ background: "#fff", color: "#000", padding: "8px 12px", borderRadius: 999, textDecoration: "none", fontWeight: 700, fontSize: 12 }}>🔐 Login Blogger</a>
        </div>
      </div>
      <p style={{ color: "#71717a", fontSize: 12, marginTop: 6 }}>Provider: <b style={{ color: "#fff" }}>Blogger (docs.google resumable)</b> → Supabase katalog (foto tidak disimpan di Supabase) • ID auto: <code>BDG-2026-FDY-001</code></p>

      {/* Upload */}
      <form onSubmit={doUpload} style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 16, padding: 16, marginTop: 16 }}>
        <h3 style={{ margin: 0, fontSize: 13, letterSpacing: 1, color: "#a1a1aa" }}>UPLOAD BATCH</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 12 }}>
          <label style={label}>Program<input value={form.program} onChange={(e) => setForm({ ...form, program: e.target.value })} style={input} /></label>
          <label style={label}>Tanggal<input type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} style={input} /></label>
          <label style={label}>Lokasi<input value={form.lokasi} onChange={(e) => setForm({ ...form, lokasi: e.target.value })} style={input} /></label>
          <label style={label}>Organisasi<input value={form.organisasi} onChange={(e) => setForm({ ...form, organisasi: e.target.value })} style={input} /></label>
          <label style={label}>ID Prefix (batch)<input value={form.idPrefix} onChange={(e) => setForm({ ...form, idPrefix: e.target.value })} placeholder="BDG-2026-FDY" style={input} /></label>
          <label style={label}>Foto (multi)<input type="file" name="files" multiple accept="image/*" style={{ ...input, padding: 6 }} /></label>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button disabled={loading} style={{ background: loading ? "#3f3f46" : "#fff", color: "#000", padding: "10px 16px", borderRadius: 10, fontWeight: 800, border: "none", cursor: "pointer" }}>{loading ? "Uploading..." : "+ Upload ke Blogger"}</button>
          <span style={{ fontSize: 11, color: "#71717a", alignSelf: "center" }}>10 foto → BDG-2026-FDY-001 … 010 otomatis</span>
        </div>
        {log && <pre style={{ marginTop: 12, background: "#09090b", padding: 10, borderRadius: 10, maxHeight: 200, overflow: "auto", fontSize: 11, border: "1px solid #27272a" }}>{log}</pre>}
      </form>

      {/* Search */}
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search id / filename / title..." style={{ ...input, flex: 1 }} />
        <button onClick={load} style={btn}>Search</button>
        <button onClick={load} style={btn}>Refresh</button>
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px,1fr))", gap: 12, marginTop: 16 }}>
        {items.map((m) => (
          <div key={m.id} onClick={() => setSelected(m)} style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 14, overflow: "hidden", cursor: "pointer" }}>
            <img src={m.blogger_url_s1600 || m.blogger_url} alt={m.filename} style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }} loading="lazy" />
            <div style={{ padding: 10 }}>
              <div style={{ fontWeight: 800, fontSize: 12 }}>{m.id}</div>
              <div style={{ fontSize: 11, color: "#a1a1aa", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.title || m.filename}</div>
              <div style={{ fontSize: 10, color: "#52525b" }}>{m.hash?.slice(0, 8)} • {new Date(m.created_at).toLocaleDateString("id-ID")}</div>
            </div>
          </div>
        ))}
        {!items.length && <div style={{ color: "#71717a", fontSize: 12, gridColumn: "1/-1", textAlign: "center", padding: 24 }}>Belum ada media. Upload di atas atau jalankan <code>supabase/media.sql</code> di Supabase SQL Editor jika kosong.</div>}
      </div>

      {/* Detail */}
      {selected && (
        <div onClick={() => setSelected(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 16, maxWidth: 720, width: "100%", overflow: "hidden" }}>
            <img src={selected.blogger_url} alt={selected.filename} style={{ width: "100%", maxHeight: 420, objectFit: "contain", background: "#09090b", display: "block" }} />
            <div style={{ padding: 16 }}>
              <div style={{ fontWeight: 900 }}>{selected.id}</div>
              <div style={{ fontSize: 12, color: "#a1a1aa" }}>{selected.filename} • {selected.hash}</div>
              <div style={{ fontSize: 11, color: "#71717a", wordBreak: "break-all", marginTop: 6 }}>{selected.blogger_url}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
                <button onClick={() => copy(selected.blogger_url)} style={miniBtn}>COPY URL</button>
                <button onClick={() => copy(`![${selected.title}](${selected.blogger_url})`)} style={miniBtn}>COPY MARKDOWN</button>
                <button onClick={() => copy(`<img src="${selected.blogger_url}" alt="${selected.title}" />`)} style={miniBtn}>COPY HTML</button>
                <button onClick={() => copy(`<Image src="${selected.blogger_url}" alt="${selected.title}" width={800} height={600} />`)} style={miniBtn}>COPY NEXT.JS</button>
              </div>
              <button onClick={() => setSelected(null)} style={{ ...btn, width: "100%", marginTop: 12 }}>Tutup</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: 16, fontSize: 11, color: "#52525b" }}>SQL init: <code>supabase/media.sql</code> → Supabase Dashboard → SQL Editor → Run. Gambar tetap di Blogger (lh3.googleusercontent), Supabase hanya katalog.</div>
    </div>
  );
}

const input: React.CSSProperties = { width: "100%", background: "#09090b", color: "#fafafa", border: "1px solid #27272a", borderRadius: 8, padding: "8px 10px", outline: "none", fontSize: 12, marginTop: 4 };
const label: React.CSSProperties = { fontSize: 10, letterSpacing: 0.6, color: "#a1a1aa", fontWeight: 700, display: "flex", flexDirection: "column" };
const btn: React.CSSProperties = { background: "#27272a", color: "#fafafa", border: "1px solid #3f3f46", padding: "8px 12px", borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 12 };
const miniBtn: React.CSSProperties = { background: "#27272a", color: "#fafafa", border: "1px solid #3f3f46", padding: "8px 10px", borderRadius: 8, cursor: "pointer", fontSize: 11, fontWeight: 700 };
