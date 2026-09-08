import { NextRequest, NextResponse } from "next/server";
import { createPublicSupabase } from "@/lib/supabase/public";
import { createAdminSupabase } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.toLowerCase() || "";
  const org = req.nextUrl.searchParams.get("org") || "";
  const prog = req.nextUrl.searchParams.get("prog") || "";
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") || "1"));
  const limit = Math.min(Math.max(1, Number(req.nextUrl.searchParams.get("limit") || "50")), 200);
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  try {
    const sb = createPublicSupabase();
    let query = sb
      .from("media")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (q) query = query.or(`id.ilike.%${q}%,filename.ilike.%${q}%,title.ilike.%${q}%`);
    if (org) query = query.eq("organization_id", org);
    if (prog) query = query.eq("program_id", prog);

    const { data, error, count } = await query.range(from, to);
    if (error) throw error;

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      data: data || [],
      pagination: {
        page,
        limit,
        total,
        total_pages: totalPages,
        has_more: page < totalPages,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        data: [],
        pagination: { page: 1, limit: 50, total: 0, total_pages: 0, has_more: false },
        error: e.message,
        hint: "Jalankan supabase/002_normalize_folders.sql",
      },
      { status: 500 }
    );
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
