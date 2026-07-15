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
import { checkWalletVerificationNeeded } from "@/app/actions/wallet";
import WalletVerificationWrapper from "@/components/WalletVerificationWrapper";
import OperationsClient from "./OperationsClient";

export const dynamic = "force-dynamic";

export default async function OperationsPage() {
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
      "Operations Page: User client profile fetch failed, trying admin client fallback:",
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

  // Only allow agent and senioragent
  if (
    !currentProfile ||
    (currentProfile.role !== "agent" && currentProfile.role !== "senioragent")
  ) {
    redirect("/dashboard?error=unauthorized");
  }

  // Run start-of-month verification check
  const verificationRes = await checkWalletVerificationNeeded();

  // Fetch wallets with smart balances
  const walletsRes = await getAgentWalletsWithBalances();
  let initialWallets: WalletWithBalance[] = [];
  if (walletsRes.success && walletsRes.wallets) {
    initialWallets = walletsRes.wallets;
  } else {
    console.error("Error fetching agent wallets with balances:", walletsRes.error);
  }

  // Fetch active colleagues list
  const colleaguesRes = await getColleagues();
  let colleagues: ColleagueData[] = [];
  if (colleaguesRes.success && colleaguesRes.colleagues) {
    colleagues = colleaguesRes.colleagues;
  } else {
    console.error("Error fetching colleagues:", colleaguesRes.error);
  }

  // Fetch current custody balance
  const currentCustody = await getAgentCurrentCustody(user.id);

  return (
    <WalletVerificationWrapper
      needsVerification={verificationRes.needsVerification}
      wallets={verificationRes.wallets}
    >
      <OperationsClient
        initialWallets={initialWallets}
        colleagues={colleagues}
        userFullName={currentProfile.full_name || "مستخدم"}
        currentCustody={currentCustody}
      />
    </WalletVerificationWrapper>
  );
}
