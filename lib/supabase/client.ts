import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublishableKey, getSupabaseUrl } from "./env";

export function createBrowserSupabase() {
  return createBrowserClient(getSupabaseUrl(), getSupabasePublishableKey());
}
