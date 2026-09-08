import { NextRequest, NextResponse } from "next/server";
import { createPublicSupabase } from "@/lib/supabase/public";
import { syncManifestToGitHub } from "@/lib/manifest";

export const dynamic = "force-dynamic";

// Vercel Cron akan hit GET /api/cron/keep-alive setiap Senin/Rabu/Jumat 06:00 UTC
// Untuk keamanan, Vercel mengirim header Authorization: Bearer <CRON_SECRET> jika env CRON_SECRET diset di Vercel
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const start = Date.now();
  let manifestSyncResult = null;

  try {
    const sb = createPublicSupabase();
    // Ping ringan: query 1 row dari media (tabel katalog utama)
    const { error, count } = await sb.from("media").select("id", { count: "exact", head: true }).limit(1);
    if (error) throw error;

    // Automatic Disaster Recovery Sync to GitHub Manifest (if token is configured)
    if (process.env.GITHUB_MANIFEST_TOKEN) {
      try {
        manifestSyncResult = await syncManifestToGitHub();
      } catch (mErr: any) {
        manifestSyncResult = { error: mErr.message };
      }
    }

    return NextResponse.json({
      ok: true,
      message: "Supabase keep-alive ping sukses & manifest sync",
      count,
      manifestSync: manifestSyncResult,
      durationMs: Date.now() - start,
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message, durationMs: Date.now() - start }, { status: 500 });
  }
}
