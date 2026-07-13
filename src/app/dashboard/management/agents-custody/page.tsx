import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getAgentsCustodyReport } from "@/app/actions/adminOperations";
import AgentsCustodyClient from "./AgentsCustodyClient";

export const dynamic = "force-dynamic";

export default async function AgentsCustodyPage() {
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

  if (!profile || (profile.role !== "admin" && profile.role !== "senioragent")) {
    redirect("/dashboard?error=unauthorized");
  }

  // 3. Fetch initial custody report data (empty filters by default)
  const reportRes = await getAgentsCustodyReport({});

  // 4. Fetch all active employees (agents/senior agents) for dropdown filters
  const { data: employees } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, role")
    .in("role", ["agent", "senioragent"])
    .eq("is_active", true)
    .order("full_name");

  return (
    <AgentsCustodyClient
      initialAgents={reportRes.success && reportRes.agents ? reportRes.agents : []}
      initialSummary={
        reportRes.success && reportRes.summary
          ? reportRes.summary
          : {
              totalCurrentCustody: 0,
              totalApprovedFundsInPeriod: 0,
              totalExpensesInPeriod: 0,
              totalWalletsCount: 0,
              activeWalletsCount: 0,
            }
      }
      employees={employees || []}
    />
  );
}
