"use server";

import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { MONTHLY_WALLET_LIMIT } from "@/lib/constants";


export interface WalletData {
  id: string;
  agent_id: string;
  phone_number: string;
  esim_number?: string;
  is_active: boolean;
  start_of_month_balance: number;
  last_verified_at: string | null;
  created_at: string;
  currentMonthTotal?: number;
  remainingLimit?: number;
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
 * Server Action: Get all wallets accessible to the current user (based on RLS)
 */
export async function getWallets() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "غير مصرح بالعملية. الرجاء تسجيل الدخول أولاً." };
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("wallets")
      .select("*, agent_profile:agent_id(full_name)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching wallets:", error);
      return { success: false, error: `فشل جلب المحافظ: ${error.message}` };
    }

    const wallets = (data || []) as WalletData[];

    if (wallets.length === 0) {
      return { success: true, wallets: [] as WalletData[] };
    }

    // Determine current month's bounds in the local timezone (UTC+3)
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Riyadh",
      year: "numeric",
      month: "2-digit",
    });
    const parts = formatter.formatToParts(new Date());
    const year = parts.find((p) => p.type === "year")?.value;
    const month = parts.find((p) => p.type === "month")?.value;

    let walletsWithTotals: WalletData[];

    if (!year || !month) {
      // Fallback: no month totals
      walletsWithTotals = wallets.map((w) => ({
        ...w,
        currentMonthTotal: Number(w.start_of_month_balance) || 0,
        remainingLimit: Math.max(0, MONTHLY_WALLET_LIMIT - (Number(w.start_of_month_balance) || 0)),
      }));
    } else {
      const startOfMonth = `${year}-${month}-01`;
      const lastDay = new Date(Number(year), Number(month), 0).getDate();
      const endOfMonth = `${year}-${month}-${String(lastDay).padStart(2, "0")}`;

      // Fetch approved requests for all wallets in the current month
      const walletIds = wallets.map((w) => w.id);
      const { data: approvedRequests } = await supabaseAdmin
        .from("fund_requests")
        .select("wallet_id, amount_approved")
        .eq("status", "approved")
        .in("wallet_id", walletIds)
        .gte("request_date", startOfMonth)
        .lte("request_date", endOfMonth);

      walletsWithTotals = wallets.map((w) => {
        const starting = Number(w.start_of_month_balance) || 0;
        const approvedSum = (approvedRequests || [])
          .filter((req) => req.wallet_id === w.id)
          .reduce((sum, req) => sum + (Number(req.amount_approved) || 0), 0);
        const currentMonthTotal = starting + approvedSum;
        return {
          ...w,
          currentMonthTotal,
          remainingLimit: Math.max(0, MONTHLY_WALLET_LIMIT - currentMonthTotal),
        };
      });
    }

    return { success: true, wallets: walletsWithTotals };
  } catch (err: any) {
    console.error("getWallets error:", err);
    return { success: false, error: err.message || "حدث خطأ غير متوقع." };
  }
}

/**
 * Server Action: Add a new wallet
 */
export async function addWallet(phoneNumber: string, initialBalance: number, esimNumber?: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "غير مصرح بالعملية. الرجاء تسجيل الدخول أولاً." };
    }

    // Basic validation
    if (!phoneNumber || phoneNumber.trim() === "") {
      return { success: false, error: "رقم الهاتف مطلوب." };
    }
    if (initialBalance === undefined || initialBalance === null || isNaN(initialBalance)) {
      return { success: false, error: "الرصيد الافتتاحي غير صحيح." };
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("wallets")
      .insert({
        agent_id: user.id,
        phone_number: phoneNumber.trim(),
        start_of_month_balance: initialBalance,
        esim_number: esimNumber ? esimNumber.trim() : null,
        is_active: true,
      })
      .select("*, agent_profile:agent_id(full_name)")
      .single();

    if (error) {
      // Check for unique key constraint error (PostgreSQL error code 23505)
      if (
        error.code === "23505" ||
        error.message?.toLowerCase().includes("unique") ||
        error.message?.toLowerCase().includes("already exists")
      ) {
        return { success: false, error: "هذا الرقم مسجل مسبقاً" };
      }
      return { success: false, error: `فشل إضافة المحفظة: ${error.message}` };
    }

    // Newly added wallet has no approved requests yet this month
    const walletData = data as WalletData;
    const startBal = Number(walletData.start_of_month_balance) || 0;
    return {
      success: true,
      wallet: {
        ...walletData,
        currentMonthTotal: startBal,
        remainingLimit: Math.max(0, MONTHLY_WALLET_LIMIT - startBal),
      } as WalletData,
    };
  } catch (err: any) {
    console.error("addWallet error:", err);
    return { success: false, error: err.message || "حدث خطأ غير متوقع." };
  }
}

/**
 * Server Action: Edit an existing wallet's details (phone number, start of month balance, esim number)
 */
export async function editWallet(
  walletId: string,
  phoneNumber: string,
  startOfMonthBalance: number,
  esimNumber?: string
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "غير مصرح بالعملية. الرجاء تسجيل الدخول أولاً." };
    }

    if (!phoneNumber || phoneNumber.trim() === "") {
      return { success: false, error: "رقم الهاتف مطلوب." };
    }
    if (startOfMonthBalance === undefined || startOfMonthBalance === null || isNaN(startOfMonthBalance)) {
      return { success: false, error: "رصيد أول الشهر غير صحيح." };
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("wallets")
      .update({
        phone_number: phoneNumber.trim(),
        start_of_month_balance: startOfMonthBalance,
        esim_number: esimNumber ? esimNumber.trim() : null,
      })
      .eq("id", walletId)
      .select("*, agent_profile:agent_id(full_name)")
      .single();

    if (error) {
      if (
        error.code === "23505" ||
        error.message?.toLowerCase().includes("unique") ||
        error.message?.toLowerCase().includes("already exists")
      ) {
        return { success: false, error: "هذا الرقم مسجل مسبقاً" };
      }
      return { success: false, error: `فشل تعديل المحفظة: ${error.message}` };
    }

    const walletData = data as WalletData;
    const startBal = Number(walletData.start_of_month_balance) || 0;
    
    return {
      success: true,
      wallet: {
        ...walletData,
        currentMonthTotal: startBal,
        remainingLimit: Math.max(0, MONTHLY_WALLET_LIMIT - startBal),
      } as WalletData,
    };
  } catch (err: any) {
    console.error("editWallet error:", err);
    return { success: false, error: err.message || "حدث خطأ غير متوقع." };
  }
}

/**
 * Server Action: Toggle wallet active status
 */
export async function toggleWalletStatus(walletId: string, isActive: boolean) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "غير مصرح بالعملية. الرجاء تسجيل الدخول أولاً." };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("wallets")
      .update({ is_active: isActive })
      .eq("id", walletId);

    if (error) {
      return { success: false, error: `فشل تعديل حالة المحفظة: ${error.message}` };
    }

    return { success: true };
  } catch (err: any) {
    console.error("toggleWalletStatus error:", err);
    return { success: false, error: err.message || "حدث خطأ غير متوقع." };
  }
}

/**
 * Server Action: Check if wallet verification is required for the start of the current month
 */
export async function checkWalletVerificationNeeded() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { needsVerification: false, wallets: [] as WalletData[] };
    }

    const supabase = await createClient();
    
    // Fetch all active wallets owned by the current user
    const { data: wallets, error } = await supabase
      .from("wallets")
      .select("*")
      .eq("agent_id", user.id)
      .eq("is_active", true);

    if (error) {
      console.error("checkWalletVerificationNeeded error fetching wallets:", error);
      return { needsVerification: false, wallets: [] as WalletData[] };
    }

    if (!wallets || wallets.length === 0) {
      return { needsVerification: false, wallets: [] as WalletData[] };
    }

    // Determine the first day of the current Gregorian calendar month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    // Filter wallets whose last verification date is null or before the start of this month
    const walletsToVerify = (wallets as any[]).filter((wallet) => {
      if (!wallet.last_verified_at) {
        return true;
      }
      const lastVerified = new Date(wallet.last_verified_at);
      return lastVerified < startOfMonth;
    }) as WalletData[];

    return {
      needsVerification: walletsToVerify.length > 0,
      wallets: walletsToVerify,
    };
  } catch (err: any) {
    console.error("checkWalletVerificationNeeded unexpected error:", err);
    return { needsVerification: false, wallets: [] as WalletData[] };
  }
}

/**
 * Server Action: Submit current actual balances for multiple wallets at start of month
 */
export async function verifyMonthlyBalances(balances: { walletId: string; balance: number }[]) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "غير مصرح بالعملية. الرجاء تسجيل الدخول أولاً." };
    }

    if (!balances || balances.length === 0) {
      return { success: false, error: "لا توجد بيانات أرصدة لتحديثها." };
    }

    const supabase = await createClient();
    const nowISO = new Date().toISOString();

    // Perform balance updates in database
    for (const item of balances) {
      if (item.balance === undefined || item.balance === null || isNaN(item.balance)) {
        return { success: false, error: "أحد المدخلات غير صالحة. يرجى التأكد من إدخال رصيد صحيح." };
      }

      const { error } = await supabase
        .from("wallets")
        .update({
          start_of_month_balance: item.balance,
          last_verified_at: nowISO,
        })
        .eq("id", item.walletId)
        .eq("agent_id", user.id); // Secure RLS constraint

      if (error) {
        console.error(`verifyMonthlyBalances: error updating wallet ${item.walletId}:`, error);
        return { success: false, error: `فشل تحديث المحفظة: ${error.message}` };
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error("verifyMonthlyBalances unexpected error:", err);
    return { success: false, error: err.message || "حدث خطأ غير متوقع." };
  }
}
