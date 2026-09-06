import { NextRequest, NextResponse } from "next/server";
import { getTokensFromCookies, isExpired } from "@/lib/cookies";
import { refreshAccessToken } from "@/lib/blogger";

async function getAccessToken() {
  const { access, refresh, expiry } = await getTokensFromCookies();
  if (!access) return null;
  if (!isExpired(expiry) || !refresh) return access;
  try { const r = await refreshAccessToken(refresh); return r.access_token; } catch { return access; }
}

export async function GET(req: NextRequest) {
  const token = await getAccessToken();
  if (!token) return NextResponse.json({ error: "Not connected" }, { status: 401 });
  const blogId = req.nextUrl.searchParams.get("blogId");
  const fetchImages = req.nextUrl.searchParams.get("fetchImages") || "true";
  const fetchBodies = req.nextUrl.searchParams.get("fetchBodies") || "true";
  const maxResults = req.nextUrl.searchParams.get("maxResults") || "5";
  const status = req.nextUrl.searchParams.get("status") || "draft"; // draft + live
  if (!blogId) return NextResponse.json({ error: "blogId required" }, { status: 400 });

  // Try without fetchImages first (always allowed), then with if requested
  const queries = [
    `https://www.googleapis.com/blogger/v3/blogs/${encodeURIComponent(blogId)}/posts?fetchImages=${fetchImages}&fetchBodies=${fetchBodies}&maxResults=${maxResults}&status=${status}&view=ADMIN`,
    `https://www.googleapis.com/blogger/v3/blogs/${encodeURIComponent(blogId)}/posts?fetchBodies=true&maxResults=${maxResults}&status=${status}&view=ADMIN`,
  ];
  const results: any[] = [];
  for (const url of queries) {
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    const j = await r.json();
    results.push({ url, status: r.status, ok: r.ok, body: j });
    if (r.ok) break;
  }
  return NextResponse.json({ results });
}
