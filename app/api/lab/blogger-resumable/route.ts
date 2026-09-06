import { NextRequest, NextResponse } from "next/server";
import { getTokensFromCookies, isExpired } from "@/lib/cookies";
import { refreshAccessToken } from "@/lib/blogger";

async function getAccessToken() {
  const { access, refresh, expiry } = await getTokensFromCookies();
  if (!access) return null;
  if (!isExpired(expiry) || !refresh) return access;
  try { const r = await refreshAccessToken(refresh); return r.access_token; } catch { return access; }
}

export async function POST(req: NextRequest) {
  const token = await getAccessToken();
  if (!token) return NextResponse.json({ error: "Not connected" }, { status: 401 });
  const form = await req.formData();
  const file = form.get("file") as File | null;
  const keep = form.get("keep") === "1";
  if (!file) return NextResponse.json({ error: "file required" }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  const size = buf.length;
  const filename = file.name || "image.jpg";
  const mime = file.type || "image/jpeg";

  // Step 1: get resumable upload URL from Blogger photo storage
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
  let sessionRes: any = null;
  for (let attempt = 0; attempt < 3; attempt++) {
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
    const text = await r.text();
    sessionRes = { status: r.status, ok: r.ok, headers: Object.fromEntries(r.headers.entries()), body: text.slice(0, 5000) };
    if (r.ok && !text.includes("AUTH_REQUIRED")) {
      resumableUrl = r.headers.get("x-goog-upload-url");
      if (resumableUrl) break;
    }
    if (attempt < 2) await new Promise((res) => setTimeout(res, 800));
  }

  if (!resumableUrl) {
    return NextResponse.json({ success: false, step: "getUploadUrl", sessionRes, note: "Gagal dapat x-goog-upload-url. Token mungkin expired atau scope blogger tidak cukup untuk photos endpoint." }, { status: 502 });
  }

  // Step 2: upload binary
  const uploadRes = await fetch(resumableUrl, {
    method: "POST",
    headers: {
      accept: "*/*",
      "content-type": mime,
      origin: "https://docs.google.com",
      referer: "https://docs.google.com/",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
      "x-client-pctx": "CgcSBWjtl_cu",
      "x-goog-upload-command": "upload, finalize",
      "x-goog-upload-offset": "0",
    },
    body: buf as any,
  });
  const uploadText = await uploadRes.text();
  let uploadJson: any;
  try { uploadJson = JSON.parse(uploadText); } catch { uploadJson = { raw: uploadText.slice(0, 5000) }; }

  if (!uploadRes.ok) {
    return NextResponse.json({ success: false, step: "upload", resumableUrl, sessionRes, uploadStatus: uploadRes.status, uploadJson }, { status: 502 });
  }

  // Extract URL like Python does
  let imageUrl: string | null = null;
  try {
    imageUrl =
      uploadJson.sessionStatus.additionalInfo["uploader_service.GoogleRupioAdditionalInfo"].completionInfo.customerSpecificInfo.url;
  } catch {}
  if (!imageUrl) {
    // fallback: try to find any https url in json
    const str = JSON.stringify(uploadJson);
    const m = str.match(/https:\/\/[^"]+googleusercontent\.com[^"]+/);
    if (m) imageUrl = m[0];
  }

  if (!imageUrl) return NextResponse.json({ success: false, step: "parse", uploadJson, sessionRes, resumableUrl }, { status: 502 });

  // Convert to s0 for original resolution as Python does
  const parts = imageUrl.split("/");
  const base = parts.slice(0, -1).join("/");
  const filePart = parts[parts.length - 1];
  const s0Url = `${base}/s0/${filePart}`;
  const s1600Url = `${base}/s1600/${filePart}`;

  // Also verify HEAD works
  let headOk = false;
  try {
    const h = await fetch(s0Url, { method: "HEAD" });
    headOk = h.ok;
  } catch {}

  return NextResponse.json({
    success: true,
    imageUrl,
    s0Url,
    s1600Url,
    headOk,
    resumableUrl,
    uploadJson: uploadJson.sessionStatus ? { sessionStatus: uploadJson.sessionStatus } : uploadJson,
  });
}
