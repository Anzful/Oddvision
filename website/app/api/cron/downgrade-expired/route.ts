import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  // Verify the request is from Vercel Cron (or has the correct secret)
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Downgrade all expired pro users (skip founder-granted ones)
  const { data, error } = await supabaseAdmin
    .from("user_usage")
    .update({ is_pro: false })
    .eq("is_pro", true)
    .is("pro_granted_by", null)
    .not("pro_expires_at", "is", null)
    .lte("pro_expires_at", new Date().toISOString())
    .select("user_id");

  if (error) {
    console.error("Downgrade cron error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  const count = data?.length ?? 0;
  if (count > 0) {
    console.log(`Downgraded ${count} expired pro users:`, data.map(u => u.user_id));
  }

  return NextResponse.json({ downgraded: count });
}
