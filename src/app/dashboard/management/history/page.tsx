import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  getAdminFundRequestsPaginated,
  getAdminDailyExpensesPaginated,
  getAdminEditRequestsPaginated,
  getAdminCustodyTransfersPaginated,
  getFundRequestsLast3DaysStats,
  getAdminEditedFundRequests,
} from "@/app/actions/adminOperations";
import { getMarketingSystems } from "@/app/actions/marketingSystems";
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

  // 2. Fetch logged in profile details and check roles (admin or senioragent or accountant)
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "admin" && profile.role !== "senioragent" && profile.role !== "accountant")) {
    redirect("/dashboard?error=unauthorized");
  }

  const isAccountant = profile.role === "accountant";
  const canAccessEdits = profile.role === "admin" || profile.role === "accountant";

  // 3. Fetch initial paginated data for admin/senior, marketing systems, 3-days stats, and edited fund requests
  const [fundRes, expenseRes, editRes, transferRes, marketingSystems, stats3DaysRes, editedFundsRes] = await Promise.all([
    getAdminFundRequestsPaginated({ page: 1, limit: 20 }),
    isAccountant
      ? Promise.resolve({ success: true, data: [], totalCount: 0 })
      : getAdminDailyExpensesPaginated({ page: 1, limit: 20 }),
    isAccountant
      ? Promise.resolve({ success: true, data: [], totalCount: 0 })
      : getAdminEditRequestsPaginated({ page: 1, limit: 20 }),
    isAccountant
      ? Promise.resolve({ success: true, data: [], totalCount: 0 })
      : getAdminCustodyTransfersPaginated({ page: 1, limit: 20 }),
    isAccountant ? Promise.resolve([]) : getMarketingSystems(),
    getFundRequestsLast3DaysStats(),
    canAccessEdits ? getAdminEditedFundRequests() : Promise.resolve({ success: true, data: [] }),
  ]);

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
      initialFundSummary={fundRes.summary}
      initialLast3DaysStats={stats3DaysRes.success ? stats3DaysRes.stats : []}
      initialDailyExpenses={expenseRes.success && expenseRes.data ? expenseRes.data : []}
      initialExpenseCount={expenseRes.success && expenseRes.totalCount !== undefined ? expenseRes.totalCount : 0}
      initialEditRequests={editRes.success && editRes.data ? editRes.data : []}
      initialEditCount={editRes.success && editRes.totalCount !== undefined ? editRes.totalCount : 0}
      initialCustodyTransfers={transferRes.success && transferRes.data ? transferRes.data : []}
      initialTransferCount={transferRes.success && transferRes.totalCount !== undefined ? transferRes.totalCount : 0}
      initialEditedFundRequests={editedFundsRes.success && editedFundsRes.data ? editedFundsRes.data : []}
      employees={employees || []}
      marketingSystems={marketingSystems}
      userRole={profile.role}
    />
  );
}
