import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  getCplAgentFundRequestsPaginated,
  getCplAgentDailyExpensesPaginated,
  getCplAgentEditRequestsPaginated,
  getCplAgentCustodyTransfersPaginated,
  getCplAgentsList,
} from "@/app/actions/cplOperations";
import CplLogsClient from "./CplLogsClient";

export const dynamic = "force-dynamic";

export default async function CplLogsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch current user's profile to inspect role
  let userProfile = null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile) {
    const { data: adminProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, role, full_name")
      .eq("id", user.id)
      .single();
    userProfile = adminProfile;
  } else {
    userProfile = profile;
  }

  const userRole = userProfile?.role || "agent";
  const isLeaderOrAdmin = userRole === "admin" || userRole === "senioragent";

  // Fetch agents list for filter dropdown if leader/admin
  let agents: { id: string; full_name: string }[] = [];
  if (isLeaderOrAdmin) {
    const agentsRes = await getCplAgentsList();
    if (agentsRes.success && agentsRes.agents) {
      agents = agentsRes.agents;
    }
  }

  // Fetch initial paginated data for CPL Tool
  const fundRes = await getCplAgentFundRequestsPaginated({ page: 1, limit: 20 });
  const expenseRes = await getCplAgentDailyExpensesPaginated({ page: 1, limit: 20 });
  const editRes = await getCplAgentEditRequestsPaginated({ page: 1, limit: 20 });
  const transferRes = await getCplAgentCustodyTransfersPaginated({ page: 1, limit: 20 });

  return (
    <CplLogsClient
      userRole={userRole}
      agents={agents}
      initialFundRequests={fundRes.success && fundRes.data ? fundRes.data : []}
      initialFundCount={fundRes.success && fundRes.totalCount !== undefined ? fundRes.totalCount : 0}
      initialDailyExpenses={expenseRes.success && expenseRes.data ? expenseRes.data : []}
      initialExpenseCount={expenseRes.success && expenseRes.totalCount !== undefined ? expenseRes.totalCount : 0}
      initialEditRequests={editRes.success && editRes.data ? editRes.data : []}
      initialEditCount={editRes.success && editRes.totalCount !== undefined ? editRes.totalCount : 0}
      initialCustodyTransfers={transferRes.success && transferRes.data ? transferRes.data : []}
      initialTransferCount={transferRes.success && transferRes.totalCount !== undefined ? transferRes.totalCount : 0}
    />
  );
}
