import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

let admin: SupabaseClient | null = null;

/** Service-role Supabase client. Server-only: bypasses RLS. */
export function getSupabaseAdmin(): SupabaseClient {
  if (admin) return admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase admin env vars are not set");
  admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return admin;
}

/**
 * Resolves the signed-in user from an `Authorization: Bearer <access_token>`
 * header by asking Supabase Auth to validate the JWT. Never trust a user id
 * sent in the request body.
 */
export async function getUserFromRequest(req: Request): Promise<User | null> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await getSupabaseAdmin().auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}
