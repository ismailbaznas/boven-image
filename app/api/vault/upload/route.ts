import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getTokensFromCookies, isExpired } from "@/lib/cookies";
import { refreshAccessToken } from "@/lib/blogger";
import crypto from "crypto";

async function getAccessToken() {
  const { access, refresh, expiry } = await getTokensFromCookies();
  if (!access) return null;
  if (!isExpired(expiry) || !refresh) return access;
  try { const r = await refreshAccessToken(refresh); return r.access_token; } catch { return access; }
}

function genId(): string {
  // BDG-2026-FDY-XXX + timestamp fallback for MVP
  const n = Math.floor(Math.random() * 900 + 100);
  const d = new Date();
  const y = d.getFullYear();
  return `BDG-${y}-FDY-${String(n).padStart(3, "0")}-${Date.now().toString().slice(-4)}`;
}

export async function POST(req: NextRequest) {
  const token = await getAccessToken();
  if (!token) return NextResponse.json({ error: "Not connected. Login Google dulu di /" }, { status: 401 });

  const form = await req.formData();
  const files = form.getAll("files") as File[];
  const title = (form.get("title") as string) || "";
  const description = (form.get("description") as string) || "";
  const program = (form.get("program") as string) || "";
  const tanggal = (form.get("tanggal") as string) || "";
  const lokasi = (form.get("lokasi") as string) || "";
  const organisasi = (form.get("organisasi") as string) || "BAZNAS Kabupaten Boven Digoel";
  const idPrefix = (form.get("idPrefix") as string) || "";

  if (!files.length) return NextResponse.json({ error: "files required" }, { status: 400 });

  // Auto-increment ID jika prefix sudah ada
  let startIdx = 1;
  if (idPrefix) {
    try {
      const sb0 = createAdminSupabase();
      const { data: existing } = await sb0.from("media").select("id").ilike("id", `${idPrefix}-%`).limit(100);
      if (existing && existing.length) {
        const nums = existing.map((r: any) => {
          const m = String(r.id).match(new RegExp(`${idPrefix}-(\\d+)`));
          return m ? parseInt(m[1], 10) : 0;
        });
        const max = Math.max(0, ...nums);
        startIdx = max + 1;
      }
    } catch {}
  }

  const results: any[] = [];
  for (let idx = 0; idx < files.length; idx++) {
    const file = files[idx];
    const buf = Buffer.from(await file.arrayBuffer());
    const hash = crypto.createHash("sha256").update(buf).digest("hex").slice(0, 16);
    const size = buf.length;
    const mime = file.type || "image/jpeg";
    const filename = file.name;

    // 1. Blogger resumable upload (same as /api/lab/blogger-resumable)
    const uploadSessionUrl = "https://docs.google.com/upload/blogger/photos/resumable";
    const qs = new URLSearchParams({ authuser: "0", opi: "98421741" });
    const payload = {
      protocolVersion: "0.8",
      createSessionRequest: {
        fields: [
          { external: { name: "file", filename, put: {}, size } },
          { inlined: { name: "title", content: filename, contentType: "text/plain" } },
          { inlined: { name: "addtime", content: String(Date.now()), contentType: "text/plain" } },
          { inlined: { name: "onepick_version", content: "v2", contentType: "text/plain" } },
          { inlined: { name: "onepick_host_id", content: "10", contentType: "text/plain" } },
          { inlined: { name: "onepick_host_usecase", content: "RichEditor", contentType: "text/plain" } },
          { inlined: { name: "album_mode", content: "permanent", contentType: "text/plain" } },
          { inlined: { name: "silo_id", content: "3", contentType: "text/plain" } },
        ],
      },
    };

    let resumableUrl: string | null = null;
    for (let a = 0; a < 2; a++) {
      const r = await fetch(`${uploadSessionUrl}?${qs.toString()}`, {
        method: "POST",
        headers: {
          "x-client-pctx": "CgcSBWjtl_cu",
          "x-goog-upload-command": "start",
          "x-goog-upload-header-content-length": String(size),
          "x-goog-upload-header-content-type": mime,
          "x-goog-upload-protocol": "resumable",
          authorization: `Bearer ${token}`,
          "content-type": "application/x-www-form-urlencoded",
        },
        body: JSON.stringify(payload),
      });
      if (r.ok) {
        resumableUrl = r.headers.get("x-goog-upload-url");
        if (resumableUrl) break;
      }
    }
    if (!resumableUrl) {
      results.push({ filename, error: "Gagal get resumable URL" });
      continue;
    }
    const up = await fetch(resumableUrl, {
      method: "POST",
      headers: {
        accept: "*/*",
        "content-type": mime,
        origin: "https://docs.google.com",
        referer: "https://docs.google.com/",
        "x-client-pctx": "CgcSBWjtl_cu",
        "x-goog-upload-command": "upload, finalize",
        "x-goog-upload-offset": "0",
      },
      body: buf as any,
    });
    const upText = await up.text();
    let upJson: any;
    try { upJson = JSON.parse(upText); } catch { upJson = { raw: upText.slice(0, 2000) }; }
    if (!up.ok) {
      results.push({ filename, error: "Upload failed", details: upJson });
      continue;
    }
    let imageUrl: string | null = null;
    try {
      imageUrl = upJson.sessionStatus.additionalInfo["uploader_service.GoogleRupioAdditionalInfo"].completionInfo.customerSpecificInfo.url;
    } catch {}
    if (!imageUrl) {
      const m = JSON.stringify(upJson).match(/https:\/\/[^"]+googleusercontent\.com[^"]+/);
      if (m) imageUrl = m[0];
    }
    if (!imageUrl) {
      results.push({ filename, error: "No URL in response", upJson });
      continue;
    }
    const parts = imageUrl.split("/");
    const base = parts.slice(0, -1).join("/");
    const fp = parts[parts.length - 1];
    const s0Url = `${base}/s0/${fp}`;
    const s1600Url = `${base}/s1600/${fp}`;

    const cs = upJson.sessionStatus?.additionalInfo?.["uploader_service.GoogleRupioAdditionalInfo"]?.completionInfo?.customerSpecificInfo;
    const id = idPrefix ? `${idPrefix}-${String(startIdx + idx).padStart(3, "0")}` : genId();

    const row = {
      id,
      filename,
      title: title || filename.replace(/\.[^.]+$/, ""),
      description,
      blogger_url: s0Url,
      blogger_url_s1600: s1600Url,
      blogger_album_id: cs?.albumid || null,
      blogger_photo_id: cs?.photoid || null,
      provider: "blogger",
      hash,
      bytes: size,
      mime,
      width: cs?.width || null,
      height: cs?.height || null,
      metadata: { program, tanggal, lokasi, organisasi },
    };

    try {
      const sb = createAdminSupabase();
      const { error } = await sb.from("media").insert(row);
      if (error) {
        // duplicate handling: coba dengan suffix hash
        if (String(error.message).includes("duplicate")) {
          const altId = `${idPrefix ? `${idPrefix}-${String(startIdx + idx).padStart(3, "0")}` : genId()}-${hash.slice(0, 4)}`;
          const { error: e2 } = await sb.from("media").insert({ ...row, id: altId });
          if (e2) throw e2;
          results.push({ ...row, id: altId, note: `ID bentrok, pakai ${altId}` });
          continue;
        }
        throw error;
      }
    } catch (e: any) {
      results.push({ ...row, warning: `DB insert gagal: ${e.message} — jalankan supabase/media.sql` });
      continue;
    }

    results.push(row);
  }

  return NextResponse.json({ success: true, count: results.length, data: results });
}
