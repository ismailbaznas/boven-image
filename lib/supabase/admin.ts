import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseSecretKey, getSupabaseUrl } from "./env";

export function createAdminSupabase() {
  const url = getSupabaseUrl();
  const secret = getSupabaseSecretKey();
  if (!url || !secret) throw new Error("Supabase Secret Key belum diatur.");
  return createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
}
