import { NextRequest, NextResponse } from "next/server";
import { createPublicSupabase } from "@/lib/supabase/public";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sb = createPublicSupabase();
    const { data: orgs, error: e1 } = await sb.from("organizations").select("*").order("name");
    if (e1) throw e1;
    const { data: progs, error: e2 } = await sb.from("programs").select("*").order("created_at");
    if (e2) throw e2;

    // hitung count per org/prog (ambil seluruh row via chunked range agar tidak terpotong batas 1000 PostgREST)
    const allCounts: any[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;
    while (hasMore) {
      const { data, error } = await sb
        .from("media")
        .select("organization_id, program_id")
        .range(from, from + pageSize - 1);
      if (error) throw error;
      if (data && data.length > 0) {
        allCounts.push(...data);
        if (data.length < pageSize) hasMore = false;
        else from += pageSize;
      } else {
        hasMore = false;
      }
    }

    const orgCount: Record<string, number> = {};
    const progCount: Record<string, number> = {};
    allCounts.forEach((r: any) => {
      if (r.organization_id) orgCount[r.organization_id] = (orgCount[r.organization_id] || 0) + 1;
      if (r.program_id) progCount[r.program_id] = (progCount[r.program_id] || 0) + 1;
    });

    // 1. Ambil manual cover_media_id jika ada
    const manualCoverIds = (orgs || []).map((o: any) => o.cover_media_id).filter(Boolean);
    const manualCoverMap: Record<string, string> = {};
    if (manualCoverIds.length) {
      const { data: manualMedia } = await sb
        .from("media")
        .select("id, blogger_url")
        .in("id", manualCoverIds);
      (manualMedia || []).forEach((m: any) => {
        manualCoverMap[m.id] = m.blogger_url;
      });
    }

    // 2. Fallback cover: ambil 1 media terbaru per org jika cover_media_id belum diset
    const { data: latest } = await sb
      .from("media")
      .select("id, organization_id, blogger_url")
      .order("created_at", { ascending: false })
      .limit(50);
    const latestCoverMap: Record<string, string> = {};
    (latest || []).forEach((m: any) => {
      if (m.organization_id && !latestCoverMap[m.organization_id]) {
        latestCoverMap[m.organization_id] = m.blogger_url;
      }
    });

    const tree = (orgs || []).map((o: any) => {
      // Prioritaskan manual cover_media_id, baru fallback ke latest media
      const resolvedCover = (o.cover_media_id && manualCoverMap[o.cover_media_id]) || latestCoverMap[o.id] || null;
      return {
        ...o,
        count: orgCount[o.id] || 0,
        cover: resolvedCover,
        programs: (progs || []).filter((p: any) => p.organization_id === o.id).map((p: any) => ({
          ...p,
          count: progCount[p.id] || 0,
        })),
      };
    });

    return NextResponse.json({ data: tree });
  } catch (e: any) {
    // fallback: group by metadata jika tabel belum dimigrasi
    try {
      const sb = createPublicSupabase();
      const { data } = await sb.from("media").select("metadata").limit(200);
      const map: Record<string, Set<string>> = {};
      (data || []).forEach((r: any) => {
        const org = r.metadata?.organisasi || "BAZNAS Kabupaten Boven Digoel";
        const prog = r.metadata?.program || "Dokumentasi Umum";
        if (!map[org]) map[org] = new Set();
        map[org].add(prog);
      });
      const fallback = Object.entries(map).map(([org, progs]) => ({
        id: org,
        name: org,
        programs: Array.from(progs).map((p) => ({ id: p, name: p })),
      }));
      return NextResponse.json({ data: fallback, fallback: true });
    } catch (e2: any) {
      return NextResponse.json({ data: [], error: e.message }, { status: 500 });
    }
  }
}

// Set / unset cover_media_id secara manual
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { org_id, media_id } = body;
    if (!org_id) {
      return NextResponse.json({ error: "org_id wajib diisi" }, { status: 400 });
    }

    const sb = createAdminSupabase();
    const { data, error } = await sb
      .from("organizations")
      .update({ cover_media_id: media_id || null })
      .eq("id", org_id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
