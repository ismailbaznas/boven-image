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
  const blogId = req.nextUrl.searchParams.get("blogId") || "3348673630650024103";
  const dry = req.nextUrl.searchParams.get("dry") === "1";

  const listUrl = `https://www.googleapis.com/blogger/v3/blogs/${encodeURIComponent(blogId)}/posts?fetchBodies=true&maxResults=50&status=draft&view=ADMIN`;
  const r = await fetch(listUrl, { headers: { Authorization: `Bearer ${token}` } });
  const j: any = await r.json();
  if (!r.ok) return NextResponse.json({ error: "list failed", details: j }, { status: r.status });

  const items: any[] = j.items || [];
  // target: LAB-* drafts (dataURI) atau semua draft media-vault-lab
  const targets = items.filter((p: any) => String(p.title || "").startsWith("LAB-") || (p.labels || []).includes("media-vault-lab"));
  const results: any[] = [];
  for (const p of targets) {
    if (dry) { results.push({ id: p.id, title: p.title, dry: true }); continue; }
    const del = await fetch(`https://www.googleapis.com/blogger/v3/blogs/${encodeURIComponent(blogId)}/posts/${encodeURIComponent(p.id)}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token}` },
    });
    results.push({ id: p.id, title: p.title, deleted: del.ok, status: del.status });
  }
  return NextResponse.json({ totalDrafts: items.length, targets: targets.length, results, kept: items.length - targets.length });
}

export async function DELETE(req: NextRequest) { return GET(req); }
