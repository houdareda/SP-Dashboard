"use server";

import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { revalidatePath } from "next/cache";

export interface MarketingSystemData {
  systemName: string;
  spend: number;
  leads: number;
  cpl: number;
}

export interface WalletBalanceData {
  wallet_id: string;
  phone_number: string;
  balance: number;
}

export interface CplReportData {
  id?: string;
  agent_id?: string;
  report_date: string; // YYYY-MM-DD
  total_received_cash: number;
  personal_expenses: number;
  colleague_transfers: number;
  marketing_systems: MarketingSystemData[];
  wallets_balances: WalletBalanceData[];
  created_at?: string;
  agent_profile?: {
    full_name: string;
  } | null;
}

/**
 * Gets the current logged-in user on the server side
 */
async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Server Action: Submit a new CPL & Cash closing report
 */
export async function submitDailyCplReport(report: Omit<CplReportData, "id" | "agent_id" | "created_at">) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "غير مصرح بالعملية. الرجاء تسجيل الدخول أولاً." };
    }

    // Basic Validation
    if (!report.report_date) {
      return { success: false, error: "تاريخ التقرير مطلوب." };
    }

    const { data, error } = await supabaseAdmin
      .from("daily_cpl_reports")
      .insert({
        agent_id: user.id,
        report_date: report.report_date,
        total_received_cash: report.total_received_cash,
        personal_expenses: report.personal_expenses,
        colleague_transfers: report.colleague_transfers,
        marketing_systems: report.marketing_systems,
        wallets_balances: report.wallets_balances,
      })
      .select()
      .single();

    if (error) {
      console.error("Error inserting CPL report:", error);
      // Check for unique key constraint error (PostgreSQL error code 23505)
      if (
        error.code === "23505" ||
        error.message?.toLowerCase().includes("unique") ||
        error.message?.toLowerCase().includes("already exists")
      ) {
        return { success: false, error: "لقد قمت بحفظ تقرير CPL لهذا التاريخ بالفعل. لا يمكنك إدخال تقريرين لنفس اليوم." };
      }
      return { success: false, error: `فشل تسجيل التقرير: ${error.message}` };
    }

    revalidatePath("/dashboard/cpl-calculator");
    return { success: true, report: data };
  } catch (err: unknown) {
    console.error("submitDailyCplReport error:", err);
    const msg = err instanceof Error ? err.message : "حدث خطأ غير متوقع.";
    return { success: false, error: msg };
  }
}

/**
 * Server Action: Update an existing CPL & Cash closing report
 */
export async function updateDailyCplReport(id: string, report: Omit<CplReportData, "id" | "agent_id" | "created_at">) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "غير مصرح بالعملية. الرجاء تسجيل الدخول أولاً." };
    }

    if (!id) {
      return { success: false, error: "معرف التقرير غير صحيح." };
    }

    // Verify report ownership or role via RLS, or directly in the update clause
    const { data, error } = await supabaseAdmin
      .from("daily_cpl_reports")
      .update({
        total_received_cash: report.total_received_cash,
        personal_expenses: report.personal_expenses,
        colleague_transfers: report.colleague_transfers,
        marketing_systems: report.marketing_systems,
        wallets_balances: report.wallets_balances,
      })
      .eq("id", id)
      .eq("agent_id", user.id) // Ensure security check
      .select()
      .single();

    if (error) {
      console.error("Error updating CPL report:", error);
      return { success: false, error: `فشل تعديل التقرير: ${error.message}` };
    }

    revalidatePath("/dashboard/cpl-calculator");
    return { success: true, report: data };
  } catch (err: unknown) {
    console.error("updateDailyCplReport error:", err);
    const msg = err instanceof Error ? err.message : "حدث خطأ غير متوقع.";
    return { success: false, error: msg };
  }
}

/**
 * Server Action: Get all CPL reports for the currently logged-in agent
 */
export async function getDailyCplReports() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "غير مصرح بالعملية. الرجاء تسجيل الدخول أولاً." };
    }

    const { data, error } = await supabaseAdmin
      .from("daily_cpl_reports")
      .select("*, agent_profile:agent_id(full_name)")
      .eq("agent_id", user.id)
      .order("report_date", { ascending: false });

    if (error) {
      console.error("Error fetching CPL reports:", error);
      return { success: false, error: `فشل جلب التقارير: ${error.message}` };
    }

    return { success: true, reports: (data || []) as CplReportData[] };
  } catch (err: unknown) {
    console.error("getDailyCplReports error:", err);
    const msg = err instanceof Error ? err.message : "حدث خطأ غير متوقع.";
    return { success: false, error: msg };
  }
}

/**
 * Server Action: Get active wallets of the logged-in agent
 */
export async function getActiveWalletsForAgent() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "غير مصرح بالعملية. الرجاء تسجيل الدخول أولاً." };
    }

    const { data, error } = await supabaseAdmin
      .from("wallets")
      .select("id, phone_number, start_of_month_balance")
      .eq("agent_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching active wallets for agent:", error);
      return { success: false, error: `فشل جلب المحافظ النشطة: ${error.message}` };
    }

    return { success: true, wallets: data || [] };
  } catch (err: unknown) {
    console.error("getActiveWalletsForAgent error:", err);
    const msg = err instanceof Error ? err.message : "حدث خطأ غير متوقع.";
    return { success: false, error: msg };
  }
}

/**
 * Server Action: Get all CPL reports for management view (admin / senioragent)
 */
export async function getManagementDailyCplReports() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "غير مصرح بالعملية. الرجاء تسجيل الدخول أولاً." };
    }

    // Verify role is admin or senioragent
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "admin" && profile.role !== "senioragent")) {
      return { success: false, error: "غير مصرح لك بعرض هذه التقارير." };
    }

    const { data, error } = await supabaseAdmin
      .from("daily_cpl_reports")
      .select("*, agent_profile:agent_id(full_name)")
      .order("report_date", { ascending: false });

    if (error) {
      console.error("Error fetching management CPL reports:", error);
      return { success: false, error: `فشل جلب التقارير: ${error.message}` };
    }

    return { success: true, reports: (data || []) as CplReportData[] };
  } catch (err: unknown) {
    console.error("getManagementDailyCplReports error:", err);
    const msg = err instanceof Error ? err.message : "حدث خطأ غير متوقع.";
    return { success: false, error: msg };
  }
}
