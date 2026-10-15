import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getMarketingSystems } from "@/app/actions/marketingSystems";
import MarketingSystemsClient from "./MarketingSystemsClient";

export default async function MarketingSystemsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Verify Admin roleذ
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    redirect("/dashboard");
  }

  const initialSystems = await getMarketingSystems(false);

  return <MarketingSystemsClient initialSystems={initialSystems} />;
}
