import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  getAgentWalletsWithBalances,
  getColleagues,
  WalletWithBalance,
  ColleagueData,
  getAgentCurrentCustody,
} from "@/app/actions/operations";
import CplOperationsClient from "./CplOperationsClient";

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

  // Fetch current user's profile details to check role constraints
  let currentProfile = null;
  const { data: userProfile, error: profileError } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (profileError || !userProfile) {
    console.warn(
      "CPL Operations Page: User client profile fetch failed, trying admin client fallback:",
      profileError?.message
    );
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

  if (currentProfile?.role === "admin") {
    redirect("/dashboard/cpl-calculator/logs");
  }

  // Fetch wallets for dropdown choices
  const walletsRes = await getAgentWalletsWithBalances();
  let initialWallets: WalletWithBalance[] = [];
  if (walletsRes.success && walletsRes.wallets) {
    initialWallets = walletsRes.wallets;
  } else {
    console.error("Error fetching agent wallets for CPL tool:", walletsRes.error);
  }

  // Fetch active colleagues list
  const colleaguesRes = await getColleagues();
  let colleagues: ColleagueData[] = [];
  if (colleaguesRes.success && colleaguesRes.colleagues) {
    colleagues = colleaguesRes.colleagues;
  } else {
    console.error("Error fetching colleagues for CPL tool:", colleaguesRes.error);
  }

  // Fetch current custody balance for display
  const currentCustody = await getAgentCurrentCustody(user.id);

  return (
    <CplOperationsClient
      initialWallets={initialWallets}
      colleagues={colleagues}
      userFullName={currentProfile?.full_name || "مستخدم"}
      currentCustody={currentCustody}
    />
  );
}
