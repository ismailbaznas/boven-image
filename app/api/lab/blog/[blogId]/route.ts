import { NextRequest, NextResponse } from "next/server";
import { getTokensFromCookies, isExpired } from "@/lib/cookies";
import { refreshAccessToken } from "@/lib/blogger";

async function getAccessToken() {
  const { access, refresh, expiry } = await getTokensFromCookies();
  if (!access) return null;
  if (!isExpired(expiry) || !refresh) return access;
  try {
    const r = await refreshAccessToken(refresh);
    return r.access_token;
  } catch { return access; }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ blogId: string }> }) {
  const { blogId } = await params;
  const token = await getAccessToken();
  if (!token) return NextResponse.json({ error: "Not connected" }, { status: 401 });
  const r = await fetch(`https://www.googleapis.com/blogger/v3/blogs/${encodeURIComponent(blogId)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await r.json();
  return NextResponse.json(data, { status: r.status });
}
