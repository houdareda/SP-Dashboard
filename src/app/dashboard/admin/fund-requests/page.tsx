import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getAdminFundRequests } from "@/app/actions/adminOperations";
import FundRequestsClient from "./FundRequestsClient";

export const dynamic = "force-dynamic";

export default async function FundRequestsAdminPage() {
  const supabase = await createClient();

  // 1. Verify user authentication status
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 2. Fetch logged in profile details and check roles (admin or accountant)
  let currentProfile = null;
  const { data: userProfile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !userProfile) {
    console.warn(
      "Admin Fund Requests: Profile fetch failed, falling back to admin client:",
      profileError?.message
    );
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

  if (
    !currentProfile ||
    (currentProfile.role !== "admin" && currentProfile.role !== "accountant")
  ) {
    redirect("/dashboard?error=unauthorized");
  }

  // 3. Fetch initial requests and agents list
  const dataRes = await getAdminFundRequests();
  
  if (!dataRes.success) {
    console.error("Error fetching fund requests in page wrapper:", dataRes.error);
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-center space-y-4">
        <h2 className="text-xl font-bold text-red-400">فشل تحميل البيانات</h2>
        <p className="text-sm text-brand-dim">{dataRes.error || "حدث خطأ غير متوقع."}</p>
      </div>
    );
  }

  return (
    <FundRequestsClient
      initialRequests={dataRes.requests || []}
      initialAgents={dataRes.agents || []}
    />
  );
}
