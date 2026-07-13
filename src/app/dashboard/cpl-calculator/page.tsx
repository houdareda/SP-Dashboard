import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getDailyCplReports, getActiveWalletsForAgent } from "@/app/actions/cpl";
import CplCalculatorClient from "./CplCalculatorClient";

export const dynamic = "force-dynamic";

export default async function CplCalculatorPage() {
  const supabase = await createClient();

  // Ensure user is logged in
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch current user's profile details with supabaseAdmin as a fallback to avoid RLS block
  let currentProfile = null;
  const { data: userProfile, error: profileError } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (profileError || !userProfile) {
    console.warn("CPL Page: User client profile fetch failed, trying admin client fallback:", profileError?.message);
    const { data: adminProfile } = await supabaseAdmin
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single();
    if (adminProfile) {
      currentProfile = adminProfile;
    }
  } else {
    currentProfile = userProfile;
  }

  // Route protection: only agent and senioragent allowed (admin and accountant are blocked)
  if (
    !currentProfile ||
    (currentProfile.role !== "agent" && currentProfile.role !== "senioragent")
  ) {
    redirect("/dashboard?error=unauthorized");
  }

  // Fetch initial wallets and reports history
  const walletsRes = await getActiveWalletsForAgent();
  const reportsRes = await getDailyCplReports();

  const initialWallets = walletsRes.success ? walletsRes.wallets || [] : [];
  const initialReports = reportsRes.success ? reportsRes.reports || [] : [];

  return (
    <CplCalculatorClient
      initialWallets={initialWallets}
      initialReports={initialReports}
      agentName={currentProfile.full_name}
    />
  );
}
