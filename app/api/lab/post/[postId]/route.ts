import { NextRequest, NextResponse } from "next/server";
import { getTokensFromCookies, isExpired } from "@/lib/cookies";
import { refreshAccessToken } from "@/lib/blogger";

async function getAccessToken() {
  const { access, refresh, expiry } = await getTokensFromCookies();
  if (!access) return null;
  if (!isExpired(expiry) || !refresh) return access;
  try { const r = await refreshAccessToken(refresh); return r.access_token; } catch { return access; }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const token = await getAccessToken();
  if (!token) return NextResponse.json({ error: "Not connected" }, { status: 401 });
  const blogId = req.nextUrl.searchParams.get("blogId");
  if (!blogId) return NextResponse.json({ error: "blogId required ?blogId=..." }, { status: 400 });

  const urls = [
    `https://www.googleapis.com/blogger/v3/blogs/${encodeURIComponent(blogId)}/posts/${encodeURIComponent(postId)}?fetchImages=true&fetchBody=true&view=ADMIN`,
    `https://www.googleapis.com/blogger/v3/blogs/${encodeURIComponent(blogId)}/posts/${encodeURIComponent(postId)}?view=ADMIN`,
  ];
  for (const url of urls) {
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    const j = await r.json();
    if (r.ok) return NextResponse.json({ url, post: j });
  }
  // fallback
  const r = await fetch(`https://www.googleapis.com/blogger/v3/blogs/${encodeURIComponent(blogId)}/posts/${encodeURIComponent(postId)}`, { headers: { Authorization: `Bearer ${token}` } });
  const j = await r.json();
  return NextResponse.json(j, { status: r.status });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const token = await getAccessToken();
  if (!token) return NextResponse.json({ error: "Not connected" }, { status: 401 });
  const blogId = req.nextUrl.searchParams.get("blogId");
  if (!blogId) return NextResponse.json({ error: "blogId required" }, { status: 400 });
  const r = await fetch(`https://www.googleapis.com/blogger/v3/blogs/${encodeURIComponent(blogId)}/posts/${encodeURIComponent(postId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  return NextResponse.json({ status: r.status, ok: r.ok });
}
