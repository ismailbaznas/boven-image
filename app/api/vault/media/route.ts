import { NextRequest, NextResponse } from "next/server";
import { createPublicSupabase } from "@/lib/supabase/public";
import { createAdminSupabase } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.toLowerCase() || "";
  const org = req.nextUrl.searchParams.get("org") || "";
  const prog = req.nextUrl.searchParams.get("prog") || "";
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") || "50"), 100);
  try {
    const sb = createPublicSupabase();
    let query = sb.from("media").select("*").order("created_at", { ascending: false }).limit(limit);
    if (q) query = query.or(`id.ilike.%${q}%,filename.ilike.%${q}%,title.ilike.%${q}%`);
    if (org) query = query.eq("organization_id", org);
    if (prog) query = query.eq("program_id", prog);
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ data: data || [] });
  } catch (e: any) {
    return NextResponse.json({ data: [], error: e.message, hint: "Jalankan supabase/002_normalize_folders.sql" });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sb = createAdminSupabase();
    const { data, error } = await sb.from("media").insert(body).select().single();
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
