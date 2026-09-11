import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getTokensFromCookies, isExpired } from "@/lib/cookies";
import { refreshAccessToken } from "@/lib/blogger";
import crypto from "crypto";
import { slugify, buildBovenDigoelId, buildDescriptiveFilename } from "@/lib/slug";

async function getAccessToken() {
  const { access, refresh, expiry } = await getTokensFromCookies();
  if (!access) return null;
  if (!isExpired(expiry) || !refresh) return access;
  try {
    const r = await refreshAccessToken(refresh);
    return r.access_token;
  } catch {
    return access;
  }
}

async function ensureOrgAndProgram(organisasi: string, program: string) {
  const sb = createAdminSupabase();
  const orgSlug = slugify(organisasi) || "boven-digoel";
  const progSlug = slugify(program);

  // upsert organisasi
  await sb.from("organizations").upsert(
    { id: orgSlug, name: organisasi.trim() || "Boven Digoel", slug: orgSlug },
    { onConflict: "id" }
  );

  // upsert program jika ada
  const progId = progSlug ? `${orgSlug}__${progSlug}` : null;
  if (progId && program.trim()) {
    await sb.from("programs").upsert(
      { id: progId, organization_id: orgSlug, name: program.trim(), slug: progSlug },
      { onConflict: "id" }
    );
  }

  return { orgSlug, progSlug, progId };
}

export async function POST(req: NextRequest) {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ error: "Not connected. Login Google dulu di /" }, { status: 401 });
  }

  const form = await req.formData();
  const files = form.getAll("files") as File[];
  const titleRaw = (form.get("title") as string) || "";
  const description = (form.get("description") as string) || "";
  const organisasi = (form.get("organisasi") as string) || "BAZNAS Kabupaten Boven Digoel";
  const program = (form.get("program") as string) || "";
  const lokasi = (form.get("lokasi") as string) || "";
  const tanggal = (form.get("tanggal") as string) || "";

  if (!files.length) {
    return NextResponse.json({ error: "files required" }, { status: 400 });
  }

  // ensure org/prog exist di Supabase (normalisasi)
  const { orgSlug, progId } = await ensureOrgAndProgram(organisasi, program);
  const sb0 = createAdminSupabase();

  // Hitung nomor urut berikutnya untuk ID format boven-digoel-[N]
  let nextSeq = 1;
  try {
    const { data: existingList } = await sb0
      .from("media")
      .select("id")
      .ilike("id", "boven-digoel%")
      .order("created_at", { ascending: false })
      .limit(300);

    if (existingList && existingList.length) {
      const numbers = existingList.map((row: { id: string }) => {
        const match = String(row.id).match(/^boven-digoel-?(\d+)/i);
        return match ? parseInt(match[1], 10) : 0;
      });
      const maxNum = Math.max(0, ...numbers);
      nextSeq = maxNum + 1;
    }
  } catch {}

  const results: any[] = [];
  for (let idx = 0; idx < files.length; idx++) {
    const file = files[idx];
    const buf = Buffer.from(await file.arrayBuffer());
    const hash = crypto.createHash("sha256").update(buf).digest("hex").slice(0, 16);
    const size = buf.length;
    const mime = file.type || "image/jpeg";

    // Format ID: boven-digoel-1, boven-digoel-2, dst.
    const mediaId = buildBovenDigoelId(nextSeq + idx);

    // Format Filename: rumah-[organisasi]-[program]-[id/prefix].jpg
    const formattedFilename = buildDescriptiveFilename(file.name, organisasi, program, mediaId);
    const displayTitle = titleRaw || file.name.replace(/\.[^.]+$/, "");

    // 1. Blogger resumable upload
    const uploadSessionUrl = "https://docs.google.com/upload/blogger/photos/resumable";
    const qs = new URLSearchParams({ authuser: "0", opi: "98421741" });
    const payload = {
      protocolVersion: "0.8",
      createSessionRequest: {
        fields: [
          { external: { name: "file", filename: formattedFilename, put: {}, size } },
          { inlined: { name: "title", content: formattedFilename, contentType: "text/plain" } },
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
      results.push({ filename: file.name, error: "Gagal get resumable URL" });
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
    try {
      upJson = JSON.parse(upText);
    } catch {
      upJson = { raw: upText.slice(0, 2000) };
    }

    if (!up.ok) {
      results.push({ filename: file.name, error: "Upload failed", details: upJson });
      continue;
    }

    let imageUrl: string | null = null;
    try {
      imageUrl =
        upJson.sessionStatus.additionalInfo["uploader_service.GoogleRupioAdditionalInfo"]
          .completionInfo.customerSpecificInfo.url;
    } catch {}

    if (!imageUrl) {
      const m = JSON.stringify(upJson).match(/https:\/\/[^"]+googleusercontent\.com[^"]+/);
      if (m) imageUrl = m[0];
    }

    if (!imageUrl) {
      results.push({ filename: file.name, error: "No URL", upJson });
      continue;
    }

    const parts = imageUrl.split("/");
    const base = parts.slice(0, -1).join("/");
    const fp = parts[parts.length - 1];
    const s0Url = `${base}/s0/${fp}`;
    const s1600Url = `${base}/s1600/${fp}`;
    const cs =
      upJson.sessionStatus?.additionalInfo?.["uploader_service.GoogleRupioAdditionalInfo"]
        ?.completionInfo?.customerSpecificInfo;

    const row: any = {
      id: mediaId,
      filename: formattedFilename,
      title: displayTitle,
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
      organization_id: orgSlug,
      program_id: progId,
      metadata: { program, tanggal, lokasi, organisasi },
    };

    try {
      const { error } = await sb0.from("media").insert(row);
      if (error && String(error.message).includes("duplicate")) {
        // Fallback jika ID collision: tambahkan suffix hash
        const altId = `${mediaId}-${hash.slice(0, 4)}`;
        const altFilename = buildDescriptiveFilename(file.name, organisasi, program, altId);
        const { error: e2 } = await sb0
          .from("media")
          .insert({ ...row, id: altId, filename: altFilename });
        if (e2) throw e2;
        results.push({ ...row, id: altId, filename: altFilename, note: `ID bentrok, pakai ${altId}` });
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
