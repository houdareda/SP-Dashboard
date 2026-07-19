import React from "react";
import { redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getDashboardOverview } from "@/app/actions/dashboard";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const error = params.error;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 1. Fetch user role to determine data visibility
  const { data: userProfile, error: profileError } = await supabase
    .from("profiles")
    .select("role, full_name, is_active")
    .eq("id", user.id)
    .single();

  let profile = userProfile;

  if (profileError || !userProfile) {
    // Fallback using admin client if standard fetch fails due to RLS delays
    const { data: adminProfile } = await supabaseAdmin
      .from("profiles")
      .select("role, full_name, is_active")
      .eq("id", user.id)
      .single();
    if (adminProfile) {
      profile = adminProfile;
    }
  }

  if (!profile) {
    redirect("/login?error=profile_not_found");
  }

  if (profile.is_active === false) {
    redirect("/login?error=deactivated");
  }

  if (profile.role === "accountant") {
    redirect("/dashboard/admin/fund-requests");
  }

  // 2. Determine default date range in Egyptian Local Time (Africa/Cairo)
  const egyptDateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()).split("-");

  const startDate = `${egyptDateParts[0]}-${egyptDateParts[1]}-01`;
  const endDate = `${egyptDateParts[0]}-${egyptDateParts[1]}-${egyptDateParts[2]}`;

  // 3. Fetch active employees lists (only for admin or senior agent views)
  let employeesList: any[] = [];
  if (profile.role === "admin" || profile.role === "senioragent") {
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, role")
      .in("role", ["agent", "senioragent"])
      .eq("is_active", true)
      .order("full_name");
    employeesList = profiles || [];
  }

  // 4. Fetch initial dashboard aggregates
  const dashboardData = await getDashboardOverview({
    startDate,
    endDate,
  });

  return (
    <div className="space-y-6 font-cairo">
      {/* Alert Banner for Unauthorized Access */}
      {error === "unauthorized" && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4.5 rounded-2xl text-sm font-semibold flex items-center gap-3 animate-slide-in select-none" dir="rtl">
          <AlertTriangle size={18} className="shrink-0" />
          <span>عذراً، لا تملك الصلاحية الكافية للوصول إلى تلك الصفحة (Unauthorized).</span>
        </div>
      )}

      {/* Overview client page rendering */}
      <DashboardClient
        initialData={dashboardData}
        employeesList={employeesList}
      />
    </div>
  );
}
