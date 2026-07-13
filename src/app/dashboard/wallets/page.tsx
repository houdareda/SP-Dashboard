import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabaseServer";
import { getWallets, WalletData } from "@/app/actions/wallet";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import WalletsClient from "./WalletsClient";

export const dynamic = "force-dynamic";

export default async function WalletsPage() {
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
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !userProfile) {
    console.warn("Wallets Page: User client profile fetch failed, trying admin client fallback:", profileError?.message);
    const { data: adminProfile } = await supabaseAdmin
      .from("profiles")
      .select("role")
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

  // Fetch initial wallets using server action
  const res = await getWallets();
  let initialWallets: WalletData[] = [];
  if (res.success && res.wallets) {
    initialWallets = res.wallets;
  } else {
    console.error("Error fetching initial wallets:", res.error);
  }

  return <WalletsClient initialWallets={initialWallets} />;
}
