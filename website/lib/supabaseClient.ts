import { createClient } from "@supabase/supabase-js";
import { SUPABASE_CONFIG } from "./config";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_CONFIG.url;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || SUPABASE_CONFIG.anonKey;

console.log("Initializing Supabase with URL:", SUPABASE_URL);

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
