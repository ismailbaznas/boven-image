"use client";

import { useEffect, useMemo, useState } from "react";
import "./vault.css";
import { bloggerSrcSet, bloggerVariant } from "@/lib/image";
import { slugify } from "@/lib/slug";
import { compressImageIfNeeded, StagedMediaFile } from "@/lib/compress";

type Media = {
  id: string;
  filename: string;
  title: string;
  blogger_url: string;
  blogger_url_s1600: string;
  hash: string;
  created_at: string;
  metadata: any;
  organization_id?: string;
  program_id?: string;
  width: number;
  height: number;
};

type UploadProgress = {
  current: number;
  total: number;
  filename: string;
  percent: number;
  statusText: string;
};

const getTodayDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

function formatDisplayDate(manualDate?: string, fallbackCreatedAt?: string, full = false): string {
  if (manualDate) {
    const parts = String(manualDate).split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("id-ID", {
          day: "numeric",
          month: full ? "long" : "short",
          year: "numeric",
        });
      }
    }
    const d = new Date(manualDate);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: full ? "long" : "short",
        year: "numeric",
      });
    }
  }

  if (fallbackCreatedAt) {
    const d = new Date(fallbackCreatedAt);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: full ? "long" : "short",
        year: "numeric",
      });
    }
  }

  return "—";
}

const emptyForm = {
  organisasi: "",
  program: "",
  lokasi: "Tanah Merah",
  tanggal: getTodayDate(),
};

function StagedFileItem({
  item,
  onRemove,
  disabled,
}: {
  item: StagedMediaFile;
  onRemove: () => void;
  disabled: boolean;
}) {
  const [thumbUrl, setThumbUrl] = useState<string>("");

  useEffect(() => {
    let url = "";
    try {
      url = URL.createObjectURL(item.file);
      setThumbUrl(url);
    } catch {}
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [item.file]);

  const origMb = (item.originalSize / (1024 * 1024)).toFixed(1);
  const compMb = (item.compressedSize / (1024 * 1024)).toFixed(1);
  const compKb = (item.compressedSize / 1024).toFixed(0);
  const displaySize = item.compressedSize > 1024 * 1024 ? `${compMb} MB` : `${compKb} KB`;

  return (
    <div className="staged-item">
      <div className="staged-thumb-wrap">
        {thumbUrl ? (
          <img src={thumbUrl} alt={item.file.name} className="staged-thumb" />
        ) : (
          <div className="staged-thumb-fallback">🖼</div>
        )}
        {item.isCompressed && <span className="staged-badge">✓ Optimized</span>}
      </div>
      <div className="staged-info">
        <span className="staged-filename" title={item.file.name}>
          {item.file.name}
        </span>
        <div className="staged-size-row">
          {item.isCompressed ? (
            <>
              <span className="staged-old-size">{origMb} MB</span>
              <span className="staged-size-arrow">➔</span>
              <strong className="staged-filesize">{displaySize}</strong>
            </>
          ) : (
            <span className="staged-filesize">{displaySize}</span>
          )}
        </div>
      </div>
      <button
        type="button"
        className="staged-remove-btn"
        onClick={onRemove}
        disabled={disabled}
        title="Hapus foto ini"
      >
        ×
      </button>
    </div>
  );
}

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
  const [settingCover, setSettingCover] = useState(false);
  const [stagedItems, setStagedItems] = useState<StagedMediaFile[]>([]);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizingProgress, setOptimizingProgress] = useState<{ current: number; total: number } | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [syncingManifest, setSyncingManifest] = useState(false);
  const [manifestStatus, setManifestStatus] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  async function handleSyncManifest() {
    setSyncingManifest(true);
    setManifestStatus("Menyinkronkan...");
    try {
      const res = await fetch("/api/vault/manifest/sync", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        setManifestStatus(`✓ Synced (${json.data?.total_media || 0})`);
        setTimeout(() => setManifestStatus(null), 4000);
      } else {
        setManifestStatus(`⚠️ Gagal: ${json.error || "Error"}`);
        setTimeout(() => setManifestStatus(null), 5000);
      }
    } catch (err: any) {
      setManifestStatus(`⚠️ Error`);
      setTimeout(() => setManifestStatus(null), 5000);
    } finally {
      setSyncingManifest(false);
    }
  }

  async function load(org?: string, prog?: string, pageNum = 1, append = false) {
    try {
      const o = org !== undefined ? org : filterOrg;
      const p = prog !== undefined ? prog : filterProg;
      const params = new URLSearchParams({ limit: "50", page: String(pageNum) });
      if (q) params.set("q", q);
      if (o) params.set("org", o);
      if (p) params.set("prog", p);

      if (pageNum === 1 && !append) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const r = await fetch(`/api/vault/media?${params.toString()}`);
      const j = await r.json();

      if (append) {
        setItems((prev) => [...prev, ...(j.data || [])]);
      } else {
        setItems(j.data || []);
      }

      setPage(pageNum);
      setTotalCount(j.pagination?.total ?? (j.data?.length || 0));
      setHasMore(j.pagination?.has_more ?? false);

      if (j.error) setLog(j.error + (j.hint ? "\n" + j.hint : ""));
    } catch (error) {
      setLog(error instanceof Error ? error.message : "Gagal memuat media");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    await load(filterOrg, filterProg, page + 1, true);
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

  async function addFiles(fileList: FileList | File[]) {
    const valid = Array.from(fileList).filter((f) => f.size > 0 && f.type.startsWith("image/"));
    if (!valid.length) return;

    setOptimizing(true);
    const newStaged: StagedMediaFile[] = [];

    for (let i = 0; i < valid.length; i++) {
      const f = valid[i];
      setOptimizingProgress({ current: i + 1, total: valid.length });
      const processed = await compressImageIfNeeded(f);
      newStaged.push(processed);
    }

    setStagedItems((prev) => {
      const existingKeys = new Set(prev.map((item) => `${item.file.name}-${item.originalSize}`));
      const uniqueIncoming = newStaged.filter(
        (item) => !existingKeys.has(`${item.file.name}-${item.originalSize}`)
      );
      return [...prev, ...uniqueIncoming];
    });

    setOptimizing(false);
    setOptimizingProgress(null);
  }

  function removeStagedFile(index: number) {
    setStagedItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function startBatchUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!stagedItems.length) {
      alert("Silakan pilih minimal 1 foto terlebih dahulu.");
      return;
    }

    setLoading(true);
    setLog("");

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < stagedItems.length; i++) {
      const item = stagedItems[i];
      const file = item.file;
      const currentNum = i + 1;
      const currentPercent = Math.round((i / stagedItems.length) * 100);

      setUploadProgress({
        current: currentNum,
        total: stagedItems.length,
        filename: file.name,
        percent: currentPercent,
        statusText: `Mengupload ${currentNum} dari ${stagedItems.length}: ${file.name}...`,
      });

      try {
        const fd = new FormData();
        fd.append("files", file);
        fd.set("organisasi", form.organisasi);
        fd.set("program", form.program);
        fd.set("lokasi", form.lokasi);
        fd.set("tanggal", form.tanggal);

        const res = await fetch("/api/vault/upload", {
          method: "POST",
          body: fd,
        });

        const data = await res.json();
        if (res.ok && data.success) {
          successCount += 1;
        } else {
          failCount += 1;
          errors.push(`${file.name}: ${data.error || "Gagal upload"}`);
        }
      } catch (err: any) {
        failCount += 1;
        errors.push(`${file.name}: ${err.message || "Koneksi terputus"}`);
      }

      setUploadProgress({
        current: currentNum,
        total: stagedItems.length,
        filename: file.name,
        percent: Math.round((currentNum / stagedItems.length) * 100),
        statusText:
          currentNum === stagedItems.length
            ? "Selesai memproses semua foto!"
            : `Mengupload ${currentNum + 1} dari ${stagedItems.length}...`,
      });
    }

    setLoading(false);

    if (failCount === 0) {
      setLog(`Berhasil mengupload ${successCount} foto ke Blogger & Supabase.`);
      setStagedItems([]);
      setUploadProgress(null);
      setShowUpload(false);
      await Promise.all([load(), loadFolders()]);
    } else {
      setLog(
        `Selesai: ${successCount} berhasil, ${failCount} gagal:\n` +
          errors.map((err) => `• ${err}`).join("\n")
      );
      await Promise.all([load(), loadFolders()]);
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
  }

  async function handleSetCover(media: Media) {
    const orgId = media.organization_id || slugify(media.metadata?.organisasi || "");
    if (!orgId) return alert("Organisasi tidak ditemukan");

    const currentOrg = folders.find((o: any) => o.id === orgId);
    const isAlreadyCover = currentOrg?.cover_media_id === media.id;
    const newMediaId = isAlreadyCover ? null : media.id;

    setSettingCover(true);
    try {
      const r = await fetch("/api/vault/folders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_id: orgId, media_id: newMediaId }),
      });
      const j = await r.json();
      if (j.success) {
        await loadFolders();
      } else {
        alert("Gagal mengatur sampul: " + (j.error || ""));
      }
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setSettingCover(false);
    }
  }

  async function handleSetProgramCover(media: Media) {
    const progId = media.program_id;
    if (!progId) return alert("Program tidak ditemukan pada foto ini");

    const allProgs = folders.flatMap((o: any) => o.programs || []);
    const currentProg = allProgs.find((p: any) => p.id === progId);
    const isAlreadyCover = currentProg?.cover_media_id === media.id;
    const newMediaId = isAlreadyCover ? null : media.id;

    setSettingCover(true);
    try {
      const r = await fetch("/api/vault/folders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prog_id: progId, media_id: newMediaId }),
      });
      const j = await r.json();
      if (j.success) {
        await loadFolders();
      } else {
        alert("Gagal mengatur sampul program: " + (j.error || ""));
      }
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setSettingCover(false);
    }
  }

  const isCurrentCover = useMemo(() => {
    if (!selected) return false;
    const orgId = selected.organization_id || slugify(selected.metadata?.organisasi || "");
    const org = folders.find((o: any) => o.id === orgId);
    return org?.cover_media_id === selected.id;
  }, [folders, selected]);

  const isCurrentProgCover = useMemo(() => {
    if (!selected || !selected.program_id) return false;
    const allProgs = folders.flatMap((o: any) => o.programs || []);
    const currentProg = allProgs.find((p: any) => p.id === selected.program_id);
    return currentProg?.cover_media_id === selected.id;
  }, [folders, selected]);

  const globalTotalMedia = useMemo(() => {
    return folders.reduce((sum: number, o: any) => sum + (o.count || 0), 0);
  }, [folders]);

  const globalTotalPrograms = useMemo(() => {
    return folders.reduce((sum: number, o: any) => sum + (o.programs?.length || 0), 0);
  }, [folders]);

  const availablePrograms = useMemo(() => {
    if (!form.organisasi) {
      const allProgs = folders.flatMap((o: any) => o.programs || []);
      return Array.from(new Set(allProgs.map((p: any) => p.name)));
    }
    const matchedOrg = folders.find(
      (o: any) =>
        o.id === slugify(form.organisasi) ||
        o.name.toLowerCase() === form.organisasi.trim().toLowerCase()
    );
    if (matchedOrg?.programs?.length) {
      return matchedOrg.programs.map((p: any) => p.name);
    }
    const allProgs = folders.flatMap((o: any) => o.programs || []);
    return Array.from(new Set(allProgs.map((p: any) => p.name)));
  }, [folders, form.organisasi]);

  const displayItems = items;

  return (
    <main className="vault-shell">
      {/* Backdrop for mobile drawer */}
      <div
        className={`mobile-backdrop ${mobileMenuOpen ? "active" : ""}`}
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden="true"
      />

      <aside className={`sidebar ${mobileMenuOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-top-bar">
          <div className="brand">
            <div className="brand-mark">B</div>
            <div>
              <strong>Boven Image</strong>
              <span>Media Vault</span>
            </div>
          </div>
          <button
            type="button"
            className="mobile-close-btn"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Tutup menu"
          >
            ×
          </button>
        </div>

        <nav className="nav">
          <a
            className={`nav-item ${!filterOrg && !filterProg ? "active" : ""}`}
            href="#library"
            onClick={(e) => {
              e.preventDefault();
              setFilterOrg("");
              setFilterProg("");
              load("", "");
              setMobileMenuOpen(false);
            }}
          >
            <span>▦</span> Library
          </a>
          <button
            type="button"
            className="nav-item"
            onClick={() => {
              setShowUpload(true);
              setMobileMenuOpen(false);
            }}
          >
            <span>＋</span> Upload Media
          </button>
        </nav>

        <div className="sidebar-section">
          <div className="sidebar-label">FOLDER & PROGRAM</div>
          <div className="folder-tree">
            {folders.map((org: any) => (
              <div key={org.id} className="folder-org">
                <button
                  type="button"
                  className={`folder-row ${filterOrg === org.id && !filterProg ? "active" : ""}`}
                  onClick={() => {
                    const isOpen = expanded === org.id;
                    setExpanded(isOpen ? null : org.id);
                    setFilterOrg(org.id);
                    setFilterProg("");
                    load(org.id, "");
                  }}
                >
                  <span className="folder-chevron">{expanded === org.id ? "▾" : "▸"}</span>
                  <span className="folder-icon">📁</span>
                  <span className="folder-name">{org.name}</span>
                  <span className="folder-count">{org.count}</span>
                </button>
                {expanded === org.id && (
                  <div className="folder-programs">
                    {org.programs?.length ? (
                      org.programs.map((p: any) => (
                        <button
                          key={p.id}
                          type="button"
                          className={`folder-row sub ${filterProg === p.id ? "active" : ""}`}
                          onClick={() => {
                            setFilterProg(p.id);
                            load(org.id, p.id);
                            setMobileMenuOpen(false);
                          }}
                        >
                          <span className="folder-icon">📂</span>
                          <span className="folder-name">{p.name}</span>
                          <span className="folder-count">{p.count}</span>
                        </button>
                      ))
                    ) : (
                      <div className="folder-empty">Belum ada program</div>
                    )}
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
            <div>
              <strong>Boven Digoel</strong>
              <span>{items.length} media</span>
            </div>
          </div>
        </div>

        <div className="sidebar-bottom">
          <button
            type="button"
            className="nav-item manifest-sync-btn"
            disabled={syncingManifest}
            onClick={handleSyncManifest}
            title="Sinkronkan seluruh katalog media ke repo backup GitHub"
          >
            <span>{syncingManifest ? "⏳" : "💾"}</span>
            {manifestStatus || (syncingManifest ? "Menyinkronkan..." : "Backup ke GitHub")}
          </button>
          <a
            className="nav-item"
            href="/lab"
            onClick={() => setMobileMenuOpen(false)}
          >
            <span>⚙</span> Developer / Lab
          </a>
          <a
            className="nav-item"
            href="/api/auth/login"
            onClick={() => setMobileMenuOpen(false)}
          >
            <span>↗</span> Blogger Login
          </a>
          <div className="sidebar-legal">
            <a href="/privacy-policy" onClick={() => setMobileMenuOpen(false)}>Privacy Policy</a>
            <span>•</span>
            <a href="/terms" onClick={() => setMobileMenuOpen(false)}>Terms</a>
          </div>
        </div>
      </aside>

      <section className="content" id="library">
        <header className="topbar">
          <div>
            <div className="eyebrow">ARSIP VISUAL RESMI</div>
            <h1>Media Vault</h1>
            <p className="topbar-desc">
              Katalog dokumentasi kegiatan Boven Digoel. Gambar pada galeri ditampilkan dalam resolusi pratinjau hemat kuota — untuk mendapatkan foto resolusi asli penuh, klik foto lalu gunakan tombol <strong>Salin URL Original</strong>.
            </p>
          </div>
          <div className="topbar-actions">
            <button
              type="button"
              className="mobile-sandwich-btn"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Buka Menu & Folder"
            >
              <span className="sandwich-icon">☰</span>
              <span className="sandwich-text">Menu & Folder</span>
              {folders.length > 0 && <span className="sandwich-badge">{folders.length}</span>}
            </button>
            <button
              type="button"
              className="primary-btn topbar-upload-btn"
              onClick={() => setShowUpload(true)}
            >
              ＋ Upload media
            </button>
          </div>
        </header>

        <div className="toolbar">
          <div className="search-box">
            <span>⌕</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
              placeholder="Cari ID, nama file, program..."
            />
            {q && (
              <button
                onClick={() => {
                  setQ("");
                  load("", "");
                }}
              >
                ×
              </button>
            )}
          </div>
          <button
            className="ghost-btn"
            onClick={() => {
              load();
              loadFolders();
            }}
          >
            ↻ Refresh
          </button>
          <div className="media-count">
            {filterOrg || filterProg || q
              ? `Menampilkan ${items.length} dari ${totalCount} media`
              : `${globalTotalMedia || totalCount || items.length} media`}
          </div>
        </div>

        <div className="stats-strip">
          <div className="stat-item">
            <span className="stat-label">Total</span>
            <strong className="stat-value">
              {globalTotalMedia || totalCount || items.length} <small>Media</small>
            </strong>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-label">Program</span>
            <strong className="stat-value">
              {globalTotalPrograms || availablePrograms.length} <small>Koleksi</small>
            </strong>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-label">Storage</span>
            <strong className="stat-value">
              <span className="status-dot" />Blogger
            </strong>
          </div>
        </div>

        {!filterOrg && !q && (
          <div className="section-heading">
            <div>
              <h2>Organisasi</h2>
              <span>Folder organisasi — klik untuk buka program</span>
            </div>
          </div>
        )}
        {!filterOrg && !q && (
          <div className="org-folder-grid">
            {folders.map((org: any) => (
              <button
                key={org.id}
                className="org-folder-card"
                onClick={() => {
                  setExpanded(org.id);
                  setFilterOrg(org.id);
                  setFilterProg("");
                  load(org.id, "");
                }}
              >
                <div className="org-cover">
                  {org.cover ? (
                    <img src={bloggerVariant(org.cover, "thumb")} alt={org.name} loading="lazy" />
                  ) : (
                    <div className="org-cover-placeholder">📁</div>
                  )}
                </div>
                <div className="org-folder-info">
                  <strong>{org.name}</strong>
                  <span>
                    {org.count} media • {org.programs?.length || 0} program
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="section-heading" id="collections">
          <div>
            <h2>
              {filterProg
                ? folders.find((o: any) => o.id === filterOrg)?.programs?.find((p: any) => p.id === filterProg)?.name || "Program"
                : filterOrg
                ? folders.find((o: any) => o.id === filterOrg)?.name || "Organisasi"
                : "Semua Media"}
            </h2>
            <span>
              {filterOrg || filterProg || q
                ? `${totalCount} media ditemukan`
                : `${globalTotalMedia || totalCount} total arsip • Terbaru ditampilkan lebih dulu`}
            </span>
          </div>
          {(filterOrg || filterProg) && (
            <button
              className="ghost-btn"
              onClick={() => {
                setFilterOrg("");
                setFilterProg("");
                load("", "");
              }}
            >
              ← Semua organisasi
            </button>
          )}
        </div>

        <div className="media-grid">
          {displayItems.map((m) => {
            const thumb = bloggerVariant(m.blogger_url, "card");
            const thumbSmall = bloggerVariant(m.blogger_url, "thumb");
            return (
              <article className="media-card" key={m.id} onClick={() => setSelected(m)}>
                <div className="thumb-wrap">
                  <img
                    src={thumbSmall}
                    srcSet={`${thumbSmall} 200w, ${thumb} 320w`}
                    sizes="(max-width: 620px) 180px, 240px"
                    alt={m.title || m.filename}
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="thumb-overlay">
                    <span>View details</span>
                  </div>
                </div>
                <div className="media-info">
                  <div className="media-id">
                    {m.organization_id || slugify(m.metadata?.organisasi || "boven-digoel")}
                  </div>
                  <div className="media-title">{m.title || m.filename}</div>
                  <div className="media-meta">
                    <span>{m.metadata?.program || "Tanpa program"}</span>
                    <span>•</span>
                    <span>{formatDisplayDate(m.metadata?.tanggal, m.created_at)}</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {hasMore && (
          <div className="load-more-wrap">
            <button
              type="button"
              className="load-more-btn"
              disabled={loadingMore}
              onClick={loadMore}
            >
              {loadingMore ? (
                <>
                  <span className="optimizing-spinner" /> Memuat foto berikutnya...
                </>
              ) : (
                <>
                  <span>⬇️</span> Muat Lebih Banyak (Tersisa {totalCount - items.length} foto)
                </>
              )}
            </button>
          </div>
        )}

        {!items.length && (
          <div className="empty-state">
            <div className="empty-icon">▧</div>
            <h3>Belum ada media</h3>
            <p>Upload foto pertama untuk mulai membangun arsip visual Boven Digoel.</p>
            <button className="primary-btn" onClick={() => setShowUpload(true)}>＋ Upload media</button>
          </div>
        )}

        <footer className="page-footer">
          <div>© {new Date().getFullYear()} Boven Image — Media Vault Boven Digoel</div>
          <div className="footer-legal">
            <a href="/privacy-policy">Kebijakan Privasi</a>
            <span>•</span>
            <a href="/terms">Ketentuan Layanan</a>
          </div>
        </footer>
      </section>

      {showUpload && (
        <div
          className="modal-backdrop"
          onClick={() => {
            if (!loading && !optimizing) {
              setShowUpload(false);
              setStagedItems([]);
              setUploadProgress(null);
            }
          }}
        >
          <div className="upload-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="eyebrow">NEW MEDIA</div>
                <h2>Upload Batch</h2>
              </div>
              <button
                type="button"
                className="close-btn"
                disabled={loading || optimizing}
                onClick={() => {
                  setShowUpload(false);
                  setStagedItems([]);
                  setUploadProgress(null);
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={startBatchUpload}>
              {stagedItems.length === 0 ? (
                <div
                  className={`dropzone ${dragging ? "dragging" : ""}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
                  }}
                >
                  <div className="upload-icon">↑</div>
                  <strong>Tarik & lepas foto ke sini</strong>
                  <span>atau pilih file dari komputer • foto besar otomatis dioptimalkan</span>
                  <label className="secondary-btn">
                    📁 Pilih Foto dari Komputer
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      hidden
                      onChange={(e) => {
                        if (e.target.files) addFiles(e.target.files);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              ) : (
                <div className="staged-box">
                  <div className="staged-box-header">
                    <div className="staged-box-title">
                      <strong>📷 {stagedItems.length} foto terpilih</strong>
                      <span className="staged-total-size">
                        {stagedItems.some((f) => f.isCompressed)
                          ? `(Total ${(stagedItems.reduce((acc, f) => acc + f.compressedSize, 0) / (1024 * 1024)).toFixed(1)} MB — hemat ${((stagedItems.reduce((acc, f) => acc + f.originalSize, 0) - stagedItems.reduce((acc, f) => acc + f.compressedSize, 0)) / (1024 * 1024)).toFixed(1)} MB dari ${(stagedItems.reduce((acc, f) => acc + f.originalSize, 0) / (1024 * 1024)).toFixed(1)} MB)`
                          : `(Total ${(stagedItems.reduce((acc, f) => acc + f.compressedSize, 0) / (1024 * 1024)).toFixed(1)} MB)`}
                      </span>
                    </div>
                    <div className="staged-box-actions">
                      <label className="staged-add-btn">
                        ＋ Tambah
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          hidden
                          disabled={loading || optimizing}
                          onChange={(e) => {
                            if (e.target.files) addFiles(e.target.files);
                            e.target.value = "";
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        className="staged-clear-btn"
                        disabled={loading || optimizing}
                        onClick={() => setStagedItems([])}
                      >
                        Bersihkan
                      </button>
                    </div>
                  </div>

                  {optimizing && (
                    <div className="optimizing-banner">
                      <div className="optimizing-spinner" />
                      <span>
                        ⚡ Mengoptimalkan foto untuk upload ({optimizingProgress?.current || 0}/{optimizingProgress?.total || 0})...
                      </span>
                    </div>
                  )}

                  <div className="staged-list">
                    {stagedItems.map((item, idx) => (
                      <StagedFileItem
                        key={`${item.file.name}-${item.originalSize}-${idx}`}
                        item={item}
                        disabled={loading || optimizing}
                        onRemove={() => removeStagedFile(idx)}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="form-grid">
                <label>
                  Organisasi
                  <input
                    list="org-datalist"
                    value={form.organisasi}
                    onChange={(e) => setForm({ ...form, organisasi: e.target.value })}
                    onFocus={(e) => {
                      if (e.target.value) e.target.select();
                    }}
                    placeholder="Pilih list atau ketik manual..."
                    autoComplete="off"
                    disabled={loading || optimizing}
                  />
                  <datalist id="org-datalist">
                    {folders.map((o: any) => (
                      <option key={o.id} value={o.name} />
                    ))}
                  </datalist>
                </label>
                <label>
                  Program
                  <input
                    list="prog-datalist"
                    value={form.program}
                    onChange={(e) => setForm({ ...form, program: e.target.value })}
                    onFocus={(e) => {
                      if (e.target.value) e.target.select();
                    }}
                    placeholder="Pilih list atau ketik manual..."
                    autoComplete="off"
                    disabled={loading || optimizing}
                  />
                  <datalist id="prog-datalist">
                    {availablePrograms.map((pName: string) => (
                      <option key={pName} value={pName} />
                    ))}
                  </datalist>
                </label>
                <label>
                  Lokasi
                  <input
                    value={form.lokasi}
                    onChange={(e) => setForm({ ...form, lokasi: e.target.value })}
                    placeholder="Contoh: Tanah Merah"
                    disabled={loading || optimizing}
                  />
                </label>
                <label>
                  Tanggal
                  <input
                    type="date"
                    value={form.tanggal}
                    onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
                    disabled={loading || optimizing}
                  />
                </label>
              </div>

              {uploadProgress && (
                <div className="upload-progress-card">
                  <div className="progress-header">
                    <span className="progress-status">{uploadProgress.statusText}</span>
                    <span className="progress-percent">{uploadProgress.percent}%</span>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{ width: `${uploadProgress.percent}%` }}
                    />
                  </div>
                  <div className="progress-sub">
                    <span>
                      File: <strong>{uploadProgress.filename}</strong>
                    </span>
                    <span>
                      {uploadProgress.current} / {uploadProgress.total}
                    </span>
                  </div>
                </div>
              )}

              {log && <pre className="upload-log">{log}</pre>}

              <div className="modal-actions">
                <button
                  type="button"
                  className="ghost-btn"
                  disabled={loading || optimizing}
                  onClick={() => {
                    setShowUpload(false);
                    setStagedItems([]);
                    setUploadProgress(null);
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={loading || optimizing || stagedItems.length === 0}
                >
                  {loading
                    ? `Mengupload (${uploadProgress?.current || 0}/${stagedItems.length})...`
                    : optimizing
                    ? "Mengoptimalkan foto..."
                    : stagedItems.length > 0
                    ? `🚀 Upload ${stagedItems.length} Foto ke Blogger`
                    : "Pilih foto dulu"}
                </button>
              </div>
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
                <div><dt>Organisasi</dt><dd>{selected.organization_id || selected.metadata?.organisasi || "—"}</dd></div>
                <div><dt>Program</dt><dd>{selected.metadata?.program || "—"}</dd></div>
                <div><dt>Tanggal Kegiatan</dt><dd>{formatDisplayDate(selected.metadata?.tanggal, selected.created_at, true)}</dd></div>
                <div><dt>Lokasi</dt><dd>{selected.metadata?.lokasi || "—"}</dd></div>
                <div><dt>Waktu Upload</dt><dd>{new Date(selected.created_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</dd></div>
                <div><dt>Hash SHA-256</dt><dd className="mono">{selected.hash}</dd></div>
                <div><dt>Blogger URL</dt><dd className="mono break">{selected.blogger_url}</dd></div>
              </dl>
              <div className="view-original-wrap">
                <a
                  href={selected.blogger_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="view-original-btn"
                >
                  <span>🔍</span> Buka Gambar Resolusi Asli (s0) ↗
                </a>
              </div>

              <div className="cover-action-wrap">
                <button
                  type="button"
                  className={`cover-btn ${isCurrentCover ? "active-cover" : ""}`}
                  disabled={settingCover}
                  onClick={() => handleSetCover(selected)}
                >
                  {settingCover
                    ? "Menyimpan sampul..."
                    : isCurrentCover
                    ? "✓ Sampul Organisasi Aktif (Klik untuk lepas)"
                    : "🖼 Jadikan Sampul Organisasi"}
                </button>
                {selected.program_id && (
                  <button
                    type="button"
                    style={{ marginTop: "8px" }}
                    className={`cover-btn ${isCurrentProgCover ? "active-cover" : ""}`}
                    disabled={settingCover}
                    onClick={() => handleSetProgramCover(selected)}
                  >
                    {settingCover
                      ? "Menyimpan sampul..."
                      : isCurrentProgCover
                      ? "✓ Sampul Program Aktif (Klik untuk lepas)"
                      : "🎯 Jadikan Sampul Program Kegiatan"}
                  </button>
                )}
              </div>

              <div className="copy-section-title">SALIN KODE / TAUTAN</div>
              <div className="copy-grid">
                <button type="button" onClick={() => copy(selected.blogger_url)}>
                  <span>📋</span> Copy URL
                </button>
                <button
                  type="button"
                  onClick={() => copy(`![${selected.title}](${selected.blogger_url})`)}
                >
                  <span>📝</span> Copy Markdown
                </button>
                <button
                  type="button"
                  onClick={() =>
                    copy(`<img src="${selected.blogger_url}" alt="${selected.title}" />`)
                  }
                >
                  <span>🌐</span> Copy HTML
                </button>
                <button
                  type="button"
                  onClick={() =>
                    copy(
                      `<Image src="${selected.blogger_url}" alt="${selected.title}" width={800} height={600} />`
                    )
                  }
                >
                  <span>⚛️</span> Copy Next.js
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Floating Bottom Navigation Bar for Mobile */}
      {!selected && !showUpload && (
        <nav className="mobile-floating-bar" aria-label="Navigasi cepat mobile">
          <button
            type="button"
            className={`mobile-fab-btn ${!filterOrg && !filterProg && !mobileMenuOpen ? "active" : ""}`}
            onClick={() => {
              setFilterOrg("");
              setFilterProg("");
              load("", "");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            <span className="fab-icon">▦</span>
            <small>Semua</small>
          </button>
          <button
            type="button"
            className={`mobile-fab-btn ${filterOrg || mobileMenuOpen ? "active" : ""}`}
            onClick={() => setMobileMenuOpen(true)}
          >
            <span className="fab-icon">📁</span>
            <small>Folder {folders.length ? `(${folders.length})` : ""}</small>
          </button>
          <button
            type="button"
            className="mobile-fab-btn fab-upload"
            onClick={() => setShowUpload(true)}
          >
            <span className="fab-icon">＋</span>
            <small>Upload</small>
          </button>
          <button
            type="button"
            className="mobile-fab-btn"
            onClick={() => {
              const searchEl = document.querySelector(".search-box input") as HTMLInputElement;
              if (searchEl) {
                searchEl.scrollIntoView({ behavior: "smooth", block: "center" });
                searchEl.focus();
              }
            }}
          >
            <span className="fab-icon">🔍</span>
            <small>Cari</small>
          </button>
        </nav>
      )}
    </main>
  );
}
