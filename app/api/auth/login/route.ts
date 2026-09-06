import { NextRequest, NextResponse } from "next/server";
import { buildAuthUrl } from "@/lib/blogger";

export async function GET(req: NextRequest) {
  const redirectUri = `${req.nextUrl.origin}/api/auth/callback/google`;
  const url = buildAuthUrl(undefined, redirectUri);
  return NextResponse.redirect(url);
}
