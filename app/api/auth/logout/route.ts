import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/", req.url));
  for (const n of ["bv_access_token", "bv_refresh_token", "bv_expiry", "bv_connected"]) {
    res.cookies.set(n, "", { path: "/", maxAge: 0 });
  }
  return res;
}
