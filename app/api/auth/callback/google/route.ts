import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/blogger";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");
  if (error) return new NextResponse(`OAuth error: ${error}`, { status: 400 });
  if (!code) return new NextResponse("Missing code", { status: 400 });

  const tokens = await exchangeCodeForTokens(code);
  const res = NextResponse.redirect(new URL("/?connected=1", req.url));

  const expiryMs = Date.now() + tokens.expires_in * 1000;
  const secure = req.nextUrl.protocol === "https:";
  const base = { httpOnly: true, secure, sameSite: "lax" as const, path: "/" };

  res.cookies.set("bv_access_token", tokens.access_token, { ...base, maxAge: tokens.expires_in });
  res.cookies.set("bv_expiry", String(expiryMs), { ...base, maxAge: tokens.expires_in });
  if (tokens.refresh_token) {
    res.cookies.set("bv_refresh_token", tokens.refresh_token, { ...base, maxAge: 60 * 60 * 24 * 30 });
  }
  // non-httpOnly for UI
  res.cookies.set("bv_connected", "1", { secure, sameSite: "lax", path: "/", maxAge: 3600 });

  return res;
}
