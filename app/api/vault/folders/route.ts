import { NextResponse } from "next/server";
import { createPublicSupabase } from "@/lib/supabase/public";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sb = createPublicSupabase();
    const { data: orgs, error: e1 } = await sb.from("organizations").select("*").order("name");
    if (e1) throw e1;
    const { data: progs, error: e2 } = await sb.from("programs").select("*").order("created_at");
    if (e2) throw e2;
    // hitung count per org/prog + cover (latest media per org)
    const { data: counts } = await sb.from("media").select("organization_id, program_id");
    const orgCount: Record<string, number> = {};
    const progCount: Record<string, number> = {};
    (counts || []).forEach((r: any) => {
      if (r.organization_id) orgCount[r.organization_id] = (orgCount[r.organization_id] || 0) + 1;
      if (r.program_id) progCount[r.program_id] = (progCount[r.program_id] || 0) + 1;
    });
    // cover: ambil 1 media terbaru per org
    const { data: latest } = await sb.from("media").select("id, organization_id, blogger_url").order("created_at", { ascending: false }).limit(50);
    const coverMap: Record<string, string> = {};
    (latest || []).forEach((m: any) => {
      if (m.organization_id && !coverMap[m.organization_id]) coverMap[m.organization_id] = m.blogger_url;
    });

    const tree = (orgs || []).map((o: any) => ({
      ...o,
      count: orgCount[o.id] || 0,
      cover: coverMap[o.id] || null,
      programs: (progs || []).filter((p: any) => p.organization_id === o.id).map((p: any) => ({ ...p, count: progCount[p.id] || 0 })),
    }));

    return NextResponse.json({ data: tree });
  } catch (e: any) {
    // fallback: group by metadata jika tabel baru belum dimigrasi
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
      const fallback = Object.entries(map).map(([org, progs]) => ({ id: org, name: org, programs: Array.from(progs).map((p) => ({ id: p, name: p })) }));
      return NextResponse.json({ data: fallback, fallback: true });
    } catch (e2: any) {
      return NextResponse.json({ data: [], error: e.message }, { status: 500 });
    }
  }
}
