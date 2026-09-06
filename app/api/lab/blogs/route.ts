import { NextRequest, NextResponse } from "next/server";
import { getTokensFromCookies, isExpired } from "@/lib/cookies";
import { refreshAccessToken } from "@/lib/blogger";

async function getAccessToken(req: NextRequest) {
  const { access, refresh, expiry } = await getTokensFromCookies();
  if (!access) return { token: null as string | null, refreshed: null as string | null };
  if (!isExpired(expiry) || !refresh) return { token: access, refreshed: null };
  try {
    const r = await refreshAccessToken(refresh);
    return { token: r.access_token, refreshed: r.access_token, expiresIn: r.expires_in };
  } catch {
    return { token: access, refreshed: null };
  }
}

export async function GET(req: NextRequest) {
  const { token, refreshed, expiresIn } = await getAccessToken(req);
  if (!token) return NextResponse.json({ error: "Not connected. Login dulu via /api/auth/login" }, { status: 401 });

  const apiRes = await fetch("https://www.googleapis.com/blogger/v3/users/self/blogs", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await apiRes.json();
  const res = NextResponse.json(data, { status: apiRes.status });
  if (refreshed && expiresIn) {
    const secure = req.nextUrl.protocol === "https:";
    res.cookies.set("bv_access_token", refreshed, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: expiresIn });
    res.cookies.set("bv_expiry", String(Date.now() + expiresIn * 1000), { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: expiresIn });
  }
  return res;
}
