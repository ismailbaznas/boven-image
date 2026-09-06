"use client";
import { useEffect, useState } from "react";

type Blog = { id: string; name: string; url: string; description?: string };

export default function Page() {
  const [connected, setConnected] = useState(false);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [blogId, setBlogId] = useState("");
  const [log, setLog] = useState<string>("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    const p = new URLSearchParams(location.search);
    if (p.get("connected")) setConnected(true);
    // auto check cookie
    fetch("/api/lab/blogs").then(async (r) => {
      if (r.ok) {
        const j = await r.json();
        if (j.items) {
          setConnected(true);
          setBlogs(j.items);
          const boven = j.items.find((b: Blog) => b.url.includes("boven-image")) || j.items[0];
          if (boven) setBlogId(boven.id);
        }
      }
    }).catch(()=>{});
  }, []);

  async function test1() {
    setLoading("Test 1: GET my blogs...");
    setLog("");
    setResult(null);
    const r = await fetch("/api/lab/blogs");
    const j = await r.json();
    setResult(j);
    setLog(JSON.stringify(j, null, 2));
    if (j.items) {
      setBlogs(j.items);
      const boven = j.items.find((b: Blog) => String(b.url).includes("boven-image")) || j.items[0];
      if (boven) setBlogId(boven.id);
    }
    setLoading(null);
  }

  async function test2() {
    if (!blogId) return alert("isi blogId dulu");
    setLoading("Test 2: GET blog info...");
    const r = await fetch(`/api/lab/blog/${encodeURIComponent(blogId)}`);
    const j = await r.json();
    setResult(j); setLog(JSON.stringify(j,null,2)); setLoading(null);
  }

  async function doUpload(keep: boolean) {
    if (!blogId) return alert("isi blogId dulu");
    const input = document.getElementById("fileInput") as HTMLInputElement;
    if (!input.files?.[0]) return alert("pilih file gambar dulu");
    const fd = new FormData();
    fd.set("blogId", blogId);
    fd.set("file", input.files[0]);
    if (keep) fd.set("keepPost","1");
    setLoading(`Test ${keep ? "keep" : "4+5+6"}: upload ${input.files[0].name}...`);
    setResult(null); setLog("");
    const r = await fetch("/api/lab/upload", { method: "POST", body: fd });
    const j = await r.json();
    setResult(j); setLog(JSON.stringify(j,null,2)); setLoading(null);
  }

  async function inspectPosts() {
    if (!blogId) return alert("isi blogId dulu");
    setLoading("Inspect: GET posts?fetchImages=true...");
    setResult(null); setLog("");
    const r = await fetch(`/api/lab/posts?blogId=${encodeURIComponent(blogId)}&maxResults=5&status=draft`);
    const j = await r.json();
    setResult(j); setLog(JSON.stringify(j,null,2)); setLoading(null);
  }
  async function getPost() {
    if (!blogId) return alert("isi blogId dulu");
    const pid = (document.getElementById("postIdInput") as HTMLInputElement).value.trim();
    if (!pid) return alert("isi postId dulu");
    setLoading(`GET post ${pid}...`);
    const r = await fetch(`/api/lab/post/${encodeURIComponent(pid)}?blogId=${encodeURIComponent(blogId)}`);
    const j = await r.json();
    setResult(j); setLog(JSON.stringify(j,null,2)); setLoading(null);
  }
  async function tryWebUpload() {
    if (!blogId) return alert("isi blogId dulu");
    const input = document.getElementById("fileInput") as HTMLInputElement;
    if (!input.files?.[0]) return alert("pilih file gambar dulu");
    const fd = new FormData();
    fd.set("blogId", blogId);
    fd.set("file", input.files[0]);
    setLoading(`Web-upload test: POST feeds/photos ...`);
    setResult(null); setLog("");
    const r = await fetch("/api/lab/blogger-web-upload", { method: "POST", body: fd });
    const j = await r.json();
    setResult(j); setLog(JSON.stringify(j,null,2)); setLoading(null);
  }
  async function tryResumable() {
    const input = document.getElementById("fileInput") as HTMLInputElement;
    if (!input.files?.[0]) return alert("pilih file gambar dulu");
    const fd = new FormData();
    fd.set("file", input.files[0]);
    setLoading(`Resumable upload: docs.google.com/upload/blogger/photos ...`);
    setResult(null); setLog("");
    const r = await fetch("/api/lab/blogger-resumable", { method: "POST", body: fd });
    const j = await r.json();
    setResult(j); setLog(JSON.stringify(j,null,2)); setLoading(null);
  }

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>🧪 Blogger API Lab <span style={{ fontWeight:400, color:"#aaa", fontSize:16 }}>— Media Vault Phase 0</span></h1>
      <p style={{ color:"#aaa", marginTop:6, lineHeight:1.6 }}>
        Target: <b style={{color:"#fff"}}>boven-image.blogspot.com</b> • Scope <code>blogger</code> • Jawab 6 tes di <code>brainstorm.md:118-158</code>: apakah <code>posts.insert</code> bisa jadi image uploader dan URL <code>blogger.googleusercontent.com</code> permanen?
      </p>

      <div style={{ display:"flex", gap:12, marginTop:18, flexWrap:"wrap" }}>
        {!connected ? (
          <a href="/api/auth/login" style={{ background:"#fff", color:"#000", padding:"12px 18px", borderRadius:10, fontWeight:700, textDecoration:"none" }}>🔐 Login dengan Google (Blogger scope)</a>
        ) : (
          <>
            <span style={{ background:"#166534", color:"#fff", padding:"10px 14px", borderRadius:999, fontSize:13, fontWeight:700 }}>● Connected</span>
            <a href="/api/auth/logout" style={{ background:"#27272a", color:"#fff", padding:"10px 14px", borderRadius:999, textDecoration:"none", fontSize:13 }}>Logout</a>
          </>
        )}
        <a href="/" style={{ background:"#2563eb", color:"#fff", padding:"10px 14px", borderRadius:999, textDecoration:"none", fontSize:13, fontWeight:700 }}>← Media Vault</a>
        <span style={{ color:"#71717a", fontSize:12, alignSelf:"center" }}>Project: boven-image • Redirect: localhost:3000/api/auth/callback/google</span>
      </div>

      {/* Steps */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginTop:24 }}>
        <div style={{ background:"#18181b", border:"1px solid #27272a", borderRadius:16, padding:16 }}>
          <h3 style={{ margin:0, fontSize:14, letterSpacing:1, color:"#a1a1aa" }}>TEST 1 & 2 — READ</h3>
          <div style={{ display:"flex", gap:8, marginTop:12, flexWrap:"wrap" }}>
            <button onClick={test1} style={btn}>Test 1: GET my blogs</button>
            <button onClick={test2} style={btn}>Test 2: GET blog info</button>
          </div>
          <div style={{ marginTop:12 }}>
            <label style={label}>blogId (auto terisi setelah Test 1)</label>
            <input value={blogId} onChange={e=>setBlogId(e.target.value)} placeholder="contoh: 123456..." style={input} />
            {blogs.length>0 && <div style={{ marginTop:8, fontSize:12, color:"#a1a1aa" }}>Ditemukan {blogs.length} blog: {blogs.map(b=>b.name).join(", ")}</div>}
          </div>
        </div>

        <div style={{ background:"#18181b", border:"1px solid #27272a", borderRadius:16, padding:16 }}>
          <h3 style={{ margin:0, fontSize:14, letterSpacing:1, color:"#a1a1aa" }}>TEST 3–6 — UPLOAD & LIFETIME</h3>
          <div style={{ marginTop:12 }}>
            <label style={label}>Pilih gambar (jpg/png/webp, &lt; 2MB untuk tes pertama)</label>
            <input id="fileInput" type="file" accept="image/*" style={{ ...input, padding:8 }} />
          </div>
          <div style={{ display:"flex", gap:8, marginTop:12, flexWrap:"wrap" }}>
            <button onClick={()=>doUpload(true)} style={{ ...btn, background:"#2563eb", color:"#fff", borderColor:"#2563eb" }}>Test 3+4: CREATE DRAFT + cek URL (keep post)</button>
            <button onClick={()=>doUpload(false)} style={{ ...btn, background:"#e11d48", color:"#fff", borderColor:"#e11d48" }}>Test 4+5+6: upload lalu HAPUS & cek apakah URL masih hidup</button>
          </div>
          <p style={{ fontSize:11, color:"#71717a", marginTop:8, lineHeight:1.5 }}>Keep = post tidak dihapus (aman untuk cek manual). Hapus = jawaban paling penting di <code>brainstorm.md:157-158</code>.</p>
        </div>
      </div>

      {/* Inspector */}
      <div style={{ marginTop:16, background:"#18181b", border:"1px solid #27272a", borderRadius:16, padding:16 }}>
        <h3 style={{ margin:0, fontSize:14, letterSpacing:1, color:"#a1a1aa" }}>INSPECT — CEK POST MANUAL DARI BLOGGER WEB</h3>
        <p style={{ fontSize:11, color:"#71717a", marginTop:6 }}>Upload 1 foto manual lewat <b style={{color:"#fff"}}>boven-image.blogspot.com → New Post → Insert Image</b> (publish/draft), lalu inspect di sini untuk lihat URL asli `bp.blogspot.com` / `googleusercontent` yang dihasilkan Blogger.</p>
        <div style={{ display:"flex", gap:8, marginTop:12, flexWrap:"wrap" }}>
          <button onClick={inspectPosts} style={btn}>List 5 draft terakhir (fetchImages)</button>
          <button onClick={tryWebUpload} style={{ ...btn, background:"#7c3aed", color:"#fff", borderColor:"#7c3aed" }}>Coba endpoint web /feeds/photos</button>
          <button onClick={tryResumable} style={{ ...btn, background:"#059669", color:"#fff", borderColor:"#059669" }}>🔥 Resumable upload (docs.google.com) — JACKPOT?</button>
          <button onClick={async()=>{ if(!blogId) return alert("blogId dulu"); if(!confirm("Hapus semua draft LAB-* (dataURI) ?")) return; const r=await fetch(`/api/lab/cleanup?blogId=${encodeURIComponent(blogId)}`); const j=await r.json(); setResult(j); setLog(JSON.stringify(j,null,2)); }} style={{ ...btn, background:"#e11d48", color:"#fff", borderColor:"#e11d48" }}>🗑 Bersihkan draft LAB-*</button>
        </div>
        <div style={{ display:"flex", gap:8, marginTop:12 }}>
          <input id="postIdInput" placeholder="postId untuk GET detail (copy dari post.id di atas)" style={{ ...input, flex:1 }} />
          <button onClick={getPost} style={btn}>GET post detail</button>
        </div>
      </div>

      {loading && <div style={{ marginTop:16, background:"#27272a", padding:12, borderRadius:12, fontSize:13 }}>{loading} ⏳</div>}

      {result && (
        <div style={{ marginTop:16, background:"#18181b", border:"1px solid #27272a", borderRadius:16, padding:16 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <h3 style={{ margin:0 }}>Result</h3>
            {result.rehosted !== undefined && (
              <span style={{ padding:"6px 10px", borderRadius:999, fontSize:12, fontWeight:800, background: result.rehosted ? "#166534" : "#7f1d1d", color:"#fff" }}>
                {result.rehosted ? "✓ REHOSTED ke googleusercontent.com" : "✗ TIDAK rehosted"}
              </span>
            )}
          </div>

          {result.imageUrls?.length ? (
            <div style={{ marginTop:12, display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(180px,1fr))", gap:12 }}>
              {result.imageUrls.map((u:string)=>(
                <div key={u} style={{ background:"#09090b", border:"1px solid #27272a", borderRadius:12, overflow:"hidden" }}>
                  <img src={u} alt="result" style={{ width:"100%", height:140, objectFit:"cover", display:"block" }} />
                  <div style={{ padding:8 }}>
                    <div style={{ fontSize:11, color:"#a1a1aa", wordBreak:"break-all" }}>{u.slice(0,80)}...</div>
                    <div style={{ display:"flex", gap:6, marginTop:8 }}>
                      <button onClick={()=>navigator.clipboard.writeText(u)} style={miniBtn}>Copy URL</button>
                      <a href={u} target="_blank" style={{ ...miniBtn, textDecoration:"none", textAlign:"center" }}>Open</a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {result.stillAliveAfterDelete !== null && result.stillAliveAfterDelete !== undefined && (
            <div style={{ marginTop:12, padding:10, borderRadius:10, background: result.stillAliveAfterDelete ? "#052e16" : "#450a0a", border:"1px solid #27272a", fontSize:12 }}>
              <b>Test 6 — URL setelah post dihapus:</b> {result.stillAliveAfterDelete ? "MASIH HIDUP ✓ (jackpot, bisa jadi storage)" : "MATI ✗ (Blogger hapus image ikut post)"}
            </div>
          )}

          <pre style={{ marginTop:12, background:"#09090b", padding:12, borderRadius:12, border:"1px solid #27272a", maxHeight:420, overflow:"auto" }}>{log}</pre>
        </div>
      )}

      <div style={{ marginTop:24, color:"#71717a", fontSize:12, lineHeight:1.7, borderTop:"1px solid #27272a", paddingTop:16 }}>
        <b style={{ color:"#a1a1aa" }}>Cara pakai:</b> 1) Login Google (akun pemilik boven-image.blogspot.com, harus sudah jadi Test User di OAuth consent) → 2) Test 1 → 3) Pilih gambar → 4) CREATE DRAFT (keep) cek apakah dapat <code>blogger.googleusercontent.com</code> → 5) Ulangi dengan HAPUS untuk cek lifetime. Jika rehosted & tetap hidup setelah delete → <code>brainstorm.md:184-194</code> jackpot.
      </div>
    </div>
  );
}

const btn: React.CSSProperties = { background:"#27272a", color:"#fafafa", border:"1px solid #3f3f46", padding:"10px 12px", borderRadius:10, cursor:"pointer", fontWeight:600, fontSize:13 };
const input: React.CSSProperties = { width:"100%", background:"#09090b", color:"#fafafa", border:"1px solid #27272a", borderRadius:10, padding:"10px 12px", outline:"none" };
const label: React.CSSProperties = { fontSize:11, letterSpacing:0.6, color:"#a1a1aa", fontWeight:700 };
const miniBtn: React.CSSProperties = { flex:1, background:"#27272a", color:"#fafafa", border:"1px solid #3f3f46", padding:"6px 8px", borderRadius:8, cursor:"pointer", fontSize:11, fontWeight:700 };
