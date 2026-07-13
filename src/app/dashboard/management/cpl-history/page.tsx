import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getManagementDailyCplReports } from "@/app/actions/cpl";
import CplHistoryManagementClient from "./CplHistoryManagementClient";

export const dynamic = "force-dynamic";

export default async function CplHistoryManagementPage() {
  const supabase = await createClient();

  // 1. Verify user authentication status
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 2. Fetch logged in profile details and check roles (admin or senioragent)
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "admin" && profile.role !== "senioragent")) {
    redirect("/dashboard?error=unauthorized");
  }

  // 3. Fetch CPL reports for management view
  const reportsRes = await getManagementDailyCplReports();
  const initialReports = reportsRes.success ? reportsRes.reports || [] : [];

  // 4. Fetch all active employees (agents/senior agents) for dropdown filter
  const { data: employees } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, role")
    .in("role", ["agent", "senioragent"])
    .eq("is_active", true)
    .order("full_name");

  return (
    <CplHistoryManagementClient
      initialReports={initialReports}
      employees={employees || []}
      currentUserId={user.id}
      currentUserRole={profile.role}
    />
  );
}
