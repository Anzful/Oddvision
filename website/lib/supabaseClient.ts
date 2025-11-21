import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://czetxxmjcvfiavwzcvqb.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6ZXR4eG1qY3ZmaWF2d3pjdnFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NjU0MDAsImV4cCI6MjA3OTI0MTQwMH0.E098WUiAP7AykQepyJR58cqU6Li6B2JrZdrSag06iVw";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

