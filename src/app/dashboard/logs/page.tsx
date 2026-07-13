import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  getAgentFundRequestsPaginated,
  getAgentDailyExpensesPaginated,
  getAgentEditRequestsPaginated,
} from "@/app/actions/operations";
import LogsClient from "./LogsClient";

export const dynamic = "force-dynamic";

export default async function LogsPage() {
  const supabase = await createClient();

  // 1. Verify user authentication status
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 2. Fetch logged-in profile details and check roles (agent or senioragent)
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "agent" && profile.role !== "senioragent")) {
    redirect("/dashboard?error=unauthorized");
  }

  // 3. Fetch initial paginated data
  const fundRes = await getAgentFundRequestsPaginated({ page: 1, limit: 20 });
  const expenseRes = await getAgentDailyExpensesPaginated({ page: 1, limit: 20 });
  const editRes = await getAgentEditRequestsPaginated({ page: 1, limit: 20 });

  return (
    <LogsClient
      initialFundRequests={fundRes.success && fundRes.data ? fundRes.data : []}
      initialFundCount={fundRes.success && fundRes.totalCount !== undefined ? fundRes.totalCount : 0}
      initialDailyExpenses={expenseRes.success && expenseRes.data ? expenseRes.data : []}
      initialExpenseCount={expenseRes.success && expenseRes.totalCount !== undefined ? expenseRes.totalCount : 0}
      initialEditRequests={editRes.success && editRes.data ? editRes.data : []}
      initialEditCount={editRes.success && editRes.totalCount !== undefined ? editRes.totalCount : 0}
    />
  );
}
