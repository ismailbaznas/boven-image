import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getTokensFromCookies, isExpired } from "@/lib/cookies";
import { refreshAccessToken } from "@/lib/blogger";
import crypto from "crypto";
import { slugify } from "@/lib/slug";

async function getAccessToken() {
  const { access, refresh, expiry } = await getTokensFromCookies();
  if (!access) return null;
  if (!isExpired(expiry) || !refresh) return access;
  try { const r = await refreshAccessToken(refresh); return r.access_token; } catch { return access; }
}

async function ensureOrgAndProgram(organisasi: string, program: string) {
  const sb = createAdminSupabase();
  const orgSlug = slugify(organisasi);
  const progSlug = slugify(program);
  // upsert organisasi
  await sb.from("organizations").upsert({ id: orgSlug, name: organisasi.trim(), slug: orgSlug }, { onConflict: "id" });
  // upsert program
  const progId = `${orgSlug}__${progSlug}`;
  if (program.trim()) {
    await sb.from("programs").upsert({ id: progId, organization_id: orgSlug, name: program.trim(), slug: progSlug }, { onConflict: "id" });
  }
  return { orgSlug, progSlug, progId: program.trim() ? progId : null };
}

export async function POST(req: NextRequest) {
  const token = await getAccessToken();
  if (!token) return NextResponse.json({ error: "Not connected. Login Google dulu di /" }, { status: 401 });

  const form = await req.formData();
  const files = form.getAll("files") as File[];
  const titleRaw = (form.get("title") as string) || "";
  const description = (form.get("description") as string) || "";
  const program = (form.get("program") as string) || "";
  const tanggal = (form.get("tanggal") as string) || "";
  const lokasi = (form.get("lokasi") as string) || "";
  const organisasi = (form.get("organisasi") as string) || "BAZNAS Kabupaten Boven Digoel";

  if (!files.length) return NextResponse.json({ error: "files required" }, { status: 400 });

  // ensure org/prog exist (normalisasi) — tetap fokus Blogger sebagai provider
  const { orgSlug, progId } = await ensureOrgAndProgram(organisasi, program);

  const sb0 = createAdminSupabase();

  const results: any[] = [];
  for (let idx = 0; idx < files.length; idx++) {
    const file = files[idx];
    const buf = Buffer.from(await file.arrayBuffer());
    const hash = crypto.createHash("sha256").update(buf).digest("hex").slice(0, 16);
    const size = buf.length;
    const mime = file.type || "image/jpeg";
    const ext = file.name.split(".").pop() || "jpg";

    // Blogger resumable upload
    const uploadSessionUrl = "https://docs.google.com/upload/blogger/photos/resumable";
    const qs = new URLSearchParams({ authuser: "0", opi: "98421741" });
    const payload = {
      protocolVersion: "0.8",
      createSessionRequest: {
        fields: [
          { external: { name: "file", filename: file.name, put: {}, size } },
          { inlined: { name: "title", content: file.name, contentType: "text/plain" } },
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
      if (r.ok) { resumableUrl = r.headers.get("x-goog-upload-url"); if (resumableUrl) break; }
    }
    if (!resumableUrl) { results.push({ filename: file.name, error: "Gagal get resumable URL" }); continue; }

    const up = await fetch(resumableUrl, {
      method: "POST",
      headers: {
        accept: "*/*", "content-type": mime, origin: "https://docs.google.com", referer: "https://docs.google.com/",
        "x-client-pctx": "CgcSBWjtl_cu", "x-goog-upload-command": "upload, finalize", "x-goog-upload-offset": "0",
      },
      body: buf as any,
    });
    const upText = await up.text();
    let upJson: any; try { upJson = JSON.parse(upText); } catch { upJson = { raw: upText.slice(0, 2000) }; }
    if (!up.ok) { results.push({ filename: file.name, error: "Upload failed", details: upJson }); continue; }

    let imageUrl: string | null = null;
    try { imageUrl = upJson.sessionStatus.additionalInfo["uploader_service.GoogleRupioAdditionalInfo"].completionInfo.customerSpecificInfo.url; } catch {}
    if (!imageUrl) { const m = JSON.stringify(upJson).match(/https:\/\/[^"]+googleusercontent\.com[^"]+/); if (m) imageUrl = m[0]; }
    if (!imageUrl) { results.push({ filename: file.name, error: "No URL", upJson }); continue; }

    const parts = imageUrl.split("/"); const base = parts.slice(0, -1).join("/"); const fp = parts[parts.length - 1];
    const s0Url = `${base}/s0/${fp}`; const s1600Url = `${base}/s1600/${fp}`;
    const cs = upJson.sessionStatus?.additionalInfo?.["uploader_service.GoogleRupioAdditionalInfo"]?.completionInfo?.customerSpecificInfo;

    // rename: slug(title) + slug(organisasi) + auto-seq, perketat anti-duplikat
    const title = titleRaw || file.name.replace(/\.[^.]+$/, "");
    const baseSlug = `${slugify(title)}-${orgSlug}`;
    // cari seq berikutnya untuk baseSlug ini (bukan BDG prefix lagi)
    let seq = 1;
    try {
      const { data } = await sb0.from("media").select("id").ilike("id", `${baseSlug}-%`).limit(100);
      if (data && data.length) {
        const nums = data.map((r: any) => {
          const m = String(r.id).match(new RegExp(`${baseSlug}-(\\d+)`));
          return m ? parseInt(m[1], 10) : 0;
        });
        seq = Math.max(...nums) + 1;
      }
    } catch {}
    const candidateId = `${baseSlug}-${String(seq + idx).padStart(3, "0")}`;
    const filename = `${candidateId}.${ext}`;

    const row: any = {
      id: candidateId,
      filename,
      title,
      description,
      blogger_url: s0Url,
      blogger_url_s1600: s1600Url,
      blogger_album_id: cs?.albumid || null,
      blogger_photo_id: cs?.photoid || null,
      provider: "blogger",
      hash, bytes: size, mime, width: cs?.width || null, height: cs?.height || null,
      organization_id: orgSlug,
      program_id: progId,
      metadata: { program, tanggal, lokasi, organisasi },
    };

    try {
      const { error } = await sb0.from("media").insert(row);
      if (error && String(error.message).includes("duplicate")) {
        const alt = `${candidateId}-${hash.slice(0, 4)}`;
        const { error: e2 } = await sb0.from("media").insert({ ...row, id: alt, filename: `${alt}.${ext}` });
        if (e2) throw e2;
        results.push({ ...row, id: alt, filename: `${alt}.${ext}`, note: `ID bentrok, pakai ${alt}` });
        continue;
      }
      if (error) throw error;
    } catch (e: any) {
      results.push({ ...row, warning: `DB insert gagal: ${e.message}` });
      continue;
    }
    results.push(row);
  }

  return NextResponse.json({ success: true, count: results.length, data: results });
}
