import { NextRequest, NextResponse } from "next/server";
import { getTokensFromCookies, isExpired } from "@/lib/cookies";
import { refreshAccessToken } from "@/lib/blogger";

async function getAccessToken() {
  const { access, refresh, expiry } = await getTokensFromCookies();
  if (!access) return null;
  if (!isExpired(expiry) || !refresh) return access;
  try { const r = await refreshAccessToken(refresh); return r.access_token; } catch { return access; }
}

// Coba endpoint private yang dipakai blogger.com web UI
// Dari inspect: blogger web POST ke https://www.blogger.com/blog/post-image-upload atau /feeds
export async function POST(req: NextRequest) {
  const token = await getAccessToken();
  if (!token) return NextResponse.json({ error: "Not connected" }, { status: 401 });
  const form = await req.formData();
  const blogId = form.get("blogId") as string;
  const file = form.get("file") as File | null;
  if (!blogId || !file) return NextResponse.json({ error: "blogId & file required" }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  const candidates = [
    // GData Picasa-like (masih dipakai blogger web untuk image)
    { url: `https://www.blogger.com/feeds/${blogId}/photos`, method: "POST", contentType: file.type || "image/jpeg" },
    { url: `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts/0`, method: "POST", contentType: file.type },
  ];

  const results: any[] = [];
  for (const c of candidates) {
    try {
      const r = await fetch(c.url, {
        method: c.method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": c.contentType,
          "Content-Length": String(buf.length),
        },
        body: buf as any,
      });
      const text = await r.text();
      let json: any;
      try { json = JSON.parse(text); } catch { json = text.slice(0, 3000); }
      results.push({ url: c.url, status: r.status, ok: r.ok, body: json, headers: Object.fromEntries(r.headers.entries()) });
    } catch (e: any) {
      results.push({ url: c.url, error: String(e) });
    }
  }

  // Also try Google Photos Library API upload (if Photos scope nanti ditambah)
  // For now just report

  return NextResponse.json({ results, note: "Endpoint web blogger private - hasil eksperimen, cek mana yang 200 dan balikan googleusercontent URL" });
}
