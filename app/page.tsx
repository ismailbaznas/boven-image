"use client";

import { useEffect, useMemo, useState } from "react";
import "./vault.css";
import { bloggerSrcSet, bloggerVariant } from "@/lib/image";

type Media = {
  id: string;
  filename: string;
  title: string;
  blogger_url: string;
  blogger_url_s1600: string;
  hash: string;
  created_at: string;
  metadata: any;
  width: number;
  height: number;
};

const emptyForm = {
  program: "Penyaluran Fidyah Tahap 3",
  tanggal: "2026-09-06",
  lokasi: "Tanah Merah",
  organisasi: "BAZNAS Kabupaten Boven Digoel",
  idPrefix: "BDG-2026-FDY",
};

export default function VaultPage() {
  const [items, setItems] = useState<Media[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState("");
  const [selected, setSelected] = useState<Media | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [dragging, setDragging] = useState(false);
  const [folders, setFolders] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filterOrg, setFilterOrg] = useState("");
  const [filterProg, setFilterProg] = useState("");

  async function load(org?: string, prog?: string) {
    try {
      const o = org ?? filterOrg;
      const p = prog ?? filterProg;
      const params = new URLSearchParams({ q, limit: "50" });
      if (o) params.set("org", o);
      if (p) params.set("prog", p);
      const r = await fetch(`/api/vault/media?${params.toString()}`);
      const j = await r.json();
      setItems(j.data || []);
      if (j.error) setLog(j.error + (j.hint ? "\n" + j.hint : ""));
    } catch (error) {
      setLog(error instanceof Error ? error.message : "Gagal memuat media");
    }
  }

  async function loadFolders() {
    try {
      const r = await fetch("/api/vault/folders");
      const j = await r.json();
      setFolders(j.data || []);
    } catch {}
  }

  useEffect(() => {
    load();
    loadFolders();
  }, []);

  async function uploadFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList).filter((f) => f.size > 0 && f.type.startsWith("image/"));
    if (!files.length) return;

    const fd = new FormData();
    files.forEach((file) => fd.append("files", file));
    Object.entries(form).forEach(([key, value]) => fd.set(key, value));

    setLoading(true);
    setLog("");
    try {
      const r = await fetch("/api/vault/upload", { method: "POST", body: fd });
      const j = await r.json();
      setLog(JSON.stringify(j, null, 2));
      if (j.success) {
        setShowUpload(false);
        setForm(emptyForm);
        await Promise.all([load(), loadFolders()]);
      }
    } catch (error) {
      setLog(error instanceof Error ? error.message : "Upload gagal");
    } finally {
      setLoading(false);
    }
  }

  async function doUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = e.currentTarget.elements.namedItem("files") as HTMLInputElement | null;
    if (!input?.files?.length) return alert("Pilih minimal 1 foto");
    await uploadFiles(input.files);
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
  }

  const programs = useMemo(() => {
    const values = items.map((m) => m.metadata?.program).filter(Boolean);
    return Array.from(new Set(values));
  }, [items]);

  const displayItems = !filterOrg && !q ? items.slice(0, 8) : items;

  return (
    <main className="vault-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">B</div>
          <div>
            <strong>Boven Image</strong>
            <span>Media Vault</span>
          </div>
        </div>

        <nav className="nav">
          <a className="nav-item active" href="#library" onClick={(e)=>{e.preventDefault(); setFilterOrg(""); setFilterProg(""); load("","");}}><span>▦</span> Library</a>
          <button className="nav-item" onClick={() => setShowUpload(true)}><span>＋</span> Upload</button>
        </nav>

        <div className="sidebar-section">
          <div className="sidebar-label">FOLDERS</div>
          <div className="folder-tree">
            {folders.map((org: any) => (
              <div key={org.id} className="folder-org">
                <button
                  className={`folder-row ${filterOrg===org.id && !filterProg ? "active":""}`}
                  onClick={()=>{
                    const isOpen = expanded===org.id;
                    setExpanded(isOpen? null : org.id);
                    setFilterOrg(org.id); setFilterProg(""); load(org.id,"");
                  }}
                >
                  <span className="folder-chevron">{expanded===org.id ? "▾":"▸"}</span>
                  <span className="folder-icon">📁</span>
                  <span className="folder-name">{org.name}</span>
                  <span className="folder-count">{org.count}</span>
                </button>
                {expanded===org.id && (
                  <div className="folder-programs">
                    {org.programs?.length ? org.programs.map((p:any)=>(
                      <button
                        key={p.id}
                        className={`folder-row sub ${filterProg===p.id ? "active":""}`}
                        onClick={()=>{ setFilterProg(p.id); load(org.id,p.id); }}
                      >
                        <span className="folder-icon">📂</span>
                        <span className="folder-name">{p.name}</span>
                        <span className="folder-count">{p.count}</span>
                      </button>
                    )) : <div className="folder-empty">Belum ada program</div>}
                  </div>
                )}
              </div>
            ))}
            {!folders.length && <div className="folder-empty">Memuat folders...</div>}
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-label">WORKSPACE</div>
          <div className="workspace-card">
            <div className="workspace-dot" />
            <div><strong>Boven Digoel</strong><span>{items.length} media</span></div>
          </div>
        </div>

        <div className="sidebar-bottom">
          <a className="nav-item" href="/lab"><span>⚙</span> Developer / Lab</a>
          <a className="nav-item" href="/api/auth/login"><span>↗</span> Blogger Login</a>
        </div>
      </aside>

      <section className="content" id="library">
        <header className="topbar">
          <div>
            <div className="eyebrow">MEDIA LIBRARY</div>
            <h1>Library</h1>
            <p>Kelola dan temukan seluruh arsip visual Boven Digoel.</p>
          </div>
          <button className="primary-btn" onClick={() => setShowUpload(true)}>＋ Upload media</button>
        </header>

        <div className="toolbar">
          <div className="search-box">
            <span>⌕</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} placeholder="Cari ID, nama file, program..." />
            {q && <button onClick={() => { setQ(""); load("",""); }}>×</button>}
          </div>
          <button className="ghost-btn" onClick={() => load()}>↻ Refresh</button>
          <div className="media-count">{items.length} media</div>
        </div>

        <div className="stats-row">
          <div className="stat-card"><span>Total media</span><strong>{items.length}</strong><small>terdaftar di katalog</small></div>
          <div className="stat-card"><span>Program</span><strong>{programs.length}</strong><small>koleksi teridentifikasi</small></div>
          <div className="stat-card"><span>Storage</span><strong>Blogger</strong><small>Supabase menyimpan katalog</small></div>
        </div>

        {!filterOrg && !q && (
          <div className="section-heading">
            <div><h2>Organisasi</h2><span>Folder organisasi — klik untuk buka program</span></div>
          </div>
        )}
        {!filterOrg && !q && (
          <div className="org-folder-grid">
            {folders.map((org:any)=>(
              <button key={org.id} className="org-folder-card" onClick={()=>{ setExpanded(org.id); setFilterOrg(org.id); setFilterProg(""); load(org.id,""); }}>
                <div className="org-cover">
                  {org.cover ? <img src={bloggerVariant(org.cover,"card")} alt={org.name} loading="lazy" /> : <div className="org-cover-placeholder">📁</div>}
                </div>
                <div className="org-folder-info">
                  <strong>{org.name}</strong>
                  <span>{org.count} media • {org.programs?.length||0} program</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {!filterOrg && !q && items.length>0 && (
          <div className="section-heading">
            <div><h2>Terbaru</h2><span>6-10 gambar terbaru</span></div>
            <button className="ghost-btn" onClick={()=>{ setFilterOrg(""); setFilterProg(""); load("",""); }}>Lihat semua →</button>
          </div>
        )}

        <div className="section-heading" id="collections">
          <div><h2>{filterProg ? folders.find((o:any)=>o.id===filterOrg)?.programs?.find((p:any)=>p.id===filterProg)?.name : filterOrg ? folders.find((o:any)=>o.id===filterOrg)?.name : "All media"}</h2><span>{filterOrg || q ? `${items.length} hasil` : "Terbaru ditampilkan lebih dulu"}</span></div>
          {(filterOrg || filterProg) && <button className="ghost-btn" onClick={()=>{ setFilterOrg(""); setFilterProg(""); load("",""); }}>← Semua organisasi</button>}
        </div>

        <div className="media-grid">
          {displayItems.map((m) => {
            const thumb = bloggerVariant(m.blogger_url, "card");
            const thumbSmall = bloggerVariant(m.blogger_url, "thumb");
            return (
            <article className="media-card" key={m.id} onClick={() => setSelected(m)}>
              <div className="thumb-wrap">
                <img
                  src={thumb}
                  srcSet={`${thumbSmall} 320w, ${thumb} 640w`}
                  sizes="(max-width: 768px) 50vw, 240px"
                  alt={m.title || m.filename}
                  loading="lazy"
                  decoding="async"
                />
                <div className="thumb-overlay"><span>View details</span></div>
              </div>
              <div className="media-info">
                <div className="media-id">{m.id}</div>
                <div className="media-title">{m.title || m.filename}</div>
                <div className="media-meta">
                  <span>{m.metadata?.program || "Tanpa program"}</span>
                  <span>•</span>
                  <span>{new Date(m.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>
                </div>
              </div>
            </article>
          );
          })}
        </div>

        {!items.length && (
          <div className="empty-state">
            <div className="empty-icon">▧</div>
            <h3>Belum ada media</h3>
            <p>Upload foto pertama untuk mulai membangun arsip visual Boven Digoel.</p>
            <button className="primary-btn" onClick={() => setShowUpload(true)}>＋ Upload media</button>
          </div>
        )}
      </section>

      {showUpload && (
        <div className="modal-backdrop" onClick={() => !loading && setShowUpload(false)}>
          <div className="upload-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><div><div className="eyebrow">NEW MEDIA</div><h2>Upload batch</h2></div><button className="close-btn" onClick={() => setShowUpload(false)}>×</button></div>
            <form onSubmit={doUpload}>
              <div className={`dropzone ${dragging ? "dragging" : ""}`} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(e) => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files); }}>
                <div className="upload-icon">↑</div>
                <strong>Tarik foto ke sini</strong>
                <span>atau pilih file dari komputer • bisa multi-upload</span>
                <label className="secondary-btn">Pilih foto<input type="file" name="files" multiple accept="image/*" hidden /></label>
              </div>

              <div className="form-grid">
                <label>Program<input value={form.program} onChange={(e) => setForm({ ...form, program: e.target.value })} /></label>
                <label>Tanggal<input type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} /></label>
                <label>Lokasi<input value={form.lokasi} onChange={(e) => setForm({ ...form, lokasi: e.target.value })} /></label>
                <label>Organisasi<input value={form.organisasi} onChange={(e) => setForm({ ...form, organisasi: e.target.value })} /></label>
                <label className="full">ID Prefix<input value={form.idPrefix} onChange={(e) => setForm({ ...form, idPrefix: e.target.value })} /></label>
              </div>
              {log && <pre className="upload-log">{log}</pre>}
              <div className="modal-actions"><button type="button" className="ghost-btn" onClick={() => setShowUpload(false)}>Batal</button><button className="primary-btn" disabled={loading}>{loading ? "Mengupload..." : "Upload ke Blogger"}</button></div>
            </form>
          </div>
        </div>
      )}

      {selected && (
        <div className="modal-backdrop detail-backdrop" onClick={() => setSelected(null)}>
          <aside className="detail-panel" onClick={(e) => e.stopPropagation()}>
            <div className="detail-image">
              <img
                src={bloggerVariant(selected.blogger_url, "medium")}
                srcSet={bloggerSrcSet(selected.blogger_url)}
                sizes="(max-width: 768px) 100vw, 400px"
                alt={selected.title || selected.filename}
                loading="eager"
              />
            </div>
            <div className="detail-content">
              <div className="modal-header"><div><div className="eyebrow">MEDIA DETAIL</div><h2>{selected.id}</h2></div><button className="close-btn" onClick={() => setSelected(null)}>×</button></div>
              <h3>{selected.title || selected.filename}</h3>
              <dl className="details">
                <div><dt>Program</dt><dd>{selected.metadata?.program || "—"}</dd></div>
                <div><dt>Tanggal</dt><dd>{selected.metadata?.tanggal || new Date(selected.created_at).toLocaleDateString("id-ID")}</dd></div>
                <div><dt>Lokasi</dt><dd>{selected.metadata?.lokasi || "—"}</dd></div>
                <div><dt>Hash SHA-256</dt><dd className="mono">{selected.hash}</dd></div>
                <div><dt>Blogger URL</dt><dd className="mono break">{selected.blogger_url}</dd></div>
              </dl>
              <div className="copy-grid">
                <button onClick={() => copy(selected.blogger_url)}>Copy URL</button>
                <button onClick={() => copy(`![${selected.title}](${selected.blogger_url})`)}>Copy Markdown</button>
                <button onClick={() => copy(`<img src="${selected.blogger_url}" alt="${selected.title}" />`)}>Copy HTML</button>
                <button onClick={() => copy(`<Image src="${selected.blogger_url}" alt="${selected.title}" width={800} height={600} />`)}>Copy Next.js</button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
