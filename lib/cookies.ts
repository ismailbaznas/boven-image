import { cookies } from "next/headers";

export async function getTokensFromCookies() {
  const c = await cookies();
  const access = c.get("bv_access_token")?.value || null;
  const refresh = c.get("bv_refresh_token")?.value || null;
  const expiry = c.get("bv_expiry")?.value ? Number(c.get("bv_expiry")!.value) : null;
  return { access, refresh, expiry };
}

export function isExpired(expiry: number | null) {
  if (!expiry) return true;
  return Date.now() > expiry - 30_000;
}
