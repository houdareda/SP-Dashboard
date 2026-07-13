import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  getAdminFundRequestsPaginated,
  getAdminDailyExpensesPaginated,
  getAdminEditRequestsPaginated,
} from "@/app/actions/adminOperations";
import HistoryClient from "./HistoryClient";

export const dynamic = "force-dynamic";

export default async function HistoryManagementPage() {
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
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "admin" && profile.role !== "senioragent" && profile.role !== "accountant")) {
    redirect("/dashboard?error=unauthorized");
  }

  // 3. Fetch initial paginated data for admin/senior
  const fundRes = await getAdminFundRequestsPaginated({ page: 1, limit: 20 });
  const expenseRes = await getAdminDailyExpensesPaginated({ page: 1, limit: 20 });
  const editRes = await getAdminEditRequestsPaginated({ page: 1, limit: 20 });

  // 4. Fetch all active employees (agents/senior agents) for filters
  const { data: employees } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, role")
    .in("role", ["agent", "senioragent"])
    .eq("is_active", true)
    .order("full_name");

  return (
    <HistoryClient
      initialFundRequests={fundRes.success && fundRes.data ? fundRes.data : []}
      initialFundCount={fundRes.success && fundRes.totalCount !== undefined ? fundRes.totalCount : 0}
      initialDailyExpenses={expenseRes.success && expenseRes.data ? expenseRes.data : []}
      initialExpenseCount={expenseRes.success && expenseRes.totalCount !== undefined ? expenseRes.totalCount : 0}
      initialEditRequests={editRes.success && editRes.data ? editRes.data : []}
      initialEditCount={editRes.success && editRes.totalCount !== undefined ? editRes.totalCount : 0}
      employees={employees || []}
    />
  );
}
