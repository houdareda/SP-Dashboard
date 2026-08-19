"use server";

import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { revalidatePath } from "next/cache";
import type {
  WalletWithBalance,
  ColleagueData,
  ExpenseTransferInput,
  DailyExpensesInput,
  EditExpensesRequestInput,
  FundRequestInput,
} from "@/app/actions/operations";

import {
  getAgentWalletsWithBalances,
  getColleagues,
  getAgentCurrentCustody,
} from "@/app/actions/operations";

async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Helper: Verify user password for security confirmation
 */
async function verifyUserPassword(email: string, password: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return !error;
  } catch {
    return false;
  }
}

/**
 * Action: Submit Fund Request for CPL Tool (Stored in cpl_fund_requests)
 */
export async function submitCplFundRequest(input: FundRequestInput, passwordConfirm: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "غير مصرح بالعملية. الرجاء تسجيل الدخول أولاً." };
    }

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("is_active")
      .eq("id", user.id)
      .single();

    if (profileErr || !profile || !profile.is_active) {
      return { success: false, error: "حسابك موقوف، غير مصرح لك باتخاذ أي إجراء." };
    }

    if (!user.email) {
      return { success: false, error: "لم يتم العثور على البريد الإلكتروني للمستخدم." };
    }

    const isPasswordValid = await verifyUserPassword(user.email, passwordConfirm);
    if (!isPasswordValid) {
      return { success: false, error: "كلمة المرور غير صحيحة. يرجى المحاولة مرة أخرى." };
    }

    if (input.isMultiWallet) {
      if (!input.multiWalletData || input.multiWalletData.length === 0) {
        return { success: false, error: "يرجى تحديد محفظة واحدة على الأقل." };
      }

      for (const item of input.multiWalletData) {
        const { error: insertError } = await supabaseAdmin.from("cpl_fund_requests").insert({
          agent_id: user.id,
          wallet_id: item.walletId,
          request_date: input.requestDate,
          amount_requested: item.amount,
          status: "pending",
          is_multi_wallet: true,
        });

        if (insertError) {
          console.error("Error inserting CPL multi-wallet fund request:", insertError);
          return { success: false, error: `فشل تسجيل طلب التمويل للمحفظة: ${insertError.message}` };
        }
      }
    } else {
      if (!input.walletId) {
        return { success: false, error: "يرجى اختيار المحفظة." };
      }

      const { error: insertError } = await supabaseAdmin.from("cpl_fund_requests").insert({
        agent_id: user.id,
        wallet_id: input.walletId,
        request_date: input.requestDate,
        amount_requested: input.amountRequested,
        status: "pending",
        is_multi_wallet: false,
      });

      if (insertError) {
        console.error("Error inserting CPL single fund request:", insertError);
        return { success: false, error: `فشل تسجيل طلب التمويل: ${insertError.message}` };
      }
    }

    revalidatePath("/dashboard/cpl-calculator");
    revalidatePath("/dashboard/cpl-calculator/logs");
    return { success: true };
  } catch (err: any) {
    console.error("submitCplFundRequest error:", err);
    return { success: false, error: err.message || "حدث خطأ غير متوقع." };
  }
}

/**
 * Action: Submit Daily Expenses for CPL Tool (Stored in cpl_daily_expenses & cpl_expense_transfers)
 */
export async function submitCplDailyExpenses(input: DailyExpensesInput, passwordConfirm: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "غير مصرح بالعملية. الرجاء تسجيل الدخول أولاً." };
    }

    const {
      expenseDate,
      totalAmount,
      marketing1,
      marketing2,
      marketing3,
      personalExpense,
      transfers,
      totalCash,
      cashAfterExpenses,
      walletsBalances,
    } = input;

    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Riyadh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const todayStr = formatter.format(new Date());
    const yesterdayStr = formatter.format(new Date(Date.now() - 86400000));

    if (expenseDate !== todayStr && expenseDate !== yesterdayStr) {
      return { success: false, error: "عذراً، يُسمح فقط باختيار تاريخ اليوم أو الأمس." };
    }

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("is_active")
      .eq("id", user.id)
      .single();

    if (profileErr || !profile || !profile.is_active) {
      return { success: false, error: "حسابك موقوف، غير مصرح لك باتخاذ أي إجراء." };
    }

    // Check double submission in cpl_daily_expenses
    const { data: existingRecord, error: checkError } = await supabaseAdmin
      .from("cpl_daily_expenses")
      .select("id")
      .eq("agent_id", user.id)
      .eq("expense_date", expenseDate)
      .maybeSingle();

    if (checkError) {
      console.error("Error checking existing CPL daily expense:", checkError);
      return { success: false, error: "حدث خطأ أثناء التحقق من حالة الإغلاق اليومي." };
    }

    if (existingRecord) {
      return {
        success: false,
        error: "لقد قمت بإغلاق اليوم المالي لهذه الأداة لهذا التاريخ مسبقاً، لا يمكنك إرسال تقريرين لنفس اليوم",
      };
    }

    if (!user.email) {
      return { success: false, error: "لم يتم العثور على البريد الإلكتروني للمستخدم." };
    }

    const isPasswordValid = await verifyUserPassword(user.email, passwordConfirm);
    if (!isPasswordValid) {
      return { success: false, error: "كلمة المرور غير صحيحة. يرجى المحاولة مرة أخرى." };
    }

    // Insert main CPL expense record
    const { data: insertedExpense, error: expenseInsertError } = await supabaseAdmin
      .from("cpl_daily_expenses")
      .insert({
        agent_id: user.id,
        expense_date: expenseDate,
        total_amount: totalAmount,
        marketing_1: marketing1,
        marketing_2: marketing2,
        marketing_3: marketing3,
        personal_expense: personalExpense,
        total_cash: totalCash,
        cash_after_expenses: cashAfterExpenses,
        wallets_balances: walletsBalances,
      })
      .select("id")
      .single();

    if (expenseInsertError) {
      console.error("Error inserting CPL daily expense:", expenseInsertError);
      return { success: false, error: `فشل تسجيل اليوم المالي للأداة: ${expenseInsertError.message}` };
    }

    // Insert CPL transfers if they exist
    if (transfers && transfers.length > 0) {
      const transfersToInsert = transfers.map((t) => ({
        expense_id: insertedExpense.id,
        from_agent_id: user.id,
        to_agent_id: t.toAgentId,
        amount: t.amount,
      }));

      const { error: transfersInsertError } = await supabaseAdmin
        .from("cpl_expense_transfers")
        .insert(transfersToInsert);

      if (transfersInsertError) {
        console.error("Error inserting CPL transfers, rolling back:", transfersInsertError);
        await supabaseAdmin.from("cpl_daily_expenses").delete().eq("id", insertedExpense.id);
        return { success: false, error: `فشل تسجيل تحويلات العهدة: ${transfersInsertError.message}` };
      }
    }

    revalidatePath("/dashboard/cpl-calculator");
    revalidatePath("/dashboard/cpl-calculator/logs");
    return { success: true };
  } catch (err: any) {
    console.error("submitCplDailyExpenses error:", err);
    return { success: false, error: err.message || "حدث خطأ غير متوقع." };
  }
}

/**
 * Action: Get daily CPL expense report for date
 */
export async function getCplExpenseReportForDate(dateStr: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "غير مصرح بالعملية. الرجاء تسجيل الدخول أولاً." };
    }

    const { data: expense, error: expenseError } = await supabaseAdmin
      .from("cpl_daily_expenses")
      .select("*")
      .eq("agent_id", user.id)
      .eq("expense_date", dateStr)
      .maybeSingle();

    if (expenseError) {
      console.error("Error fetching CPL daily expense report:", expenseError);
      return { success: false, error: "حدث خطأ أثناء فحص البيانات." };
    }

    if (!expense) {
      return { success: true, found: false };
    }

    const { data: transfers } = await supabaseAdmin
      .from("cpl_expense_transfers")
      .select("to_agent_id, amount")
      .eq("expense_id", expense.id);

    return {
      success: true,
      found: true,
      expense: {
        id: expense.id,
        totalAmount: Number(expense.total_amount || 0),
        marketing1: Number(expense.marketing_1 || 0),
        marketing2: Number(expense.marketing_2 || 0),
        marketing3: Number(expense.marketing_3 || 0),
        personalExpense: Number(expense.personal_expense || 0),
        totalCash: Number(expense.total_cash || 0),
        cashAfterExpenses: Number(expense.cash_after_expenses || 0),
        walletsBalances: expense.wallets_balances || [],
        transfers: (transfers || []).map((t: any) => ({
          toAgentId: t.to_agent_id,
          amount: Number(t.amount || 0),
        })),
      },
    };
  } catch (err: any) {
    console.error("getCplExpenseReportForDate error:", err);
    return { success: false, error: err.message || "حدث خطأ غير متوقع." };
  }
}

/**
 * Action: Submit Edit Expense Request for CPL Tool (Stored in cpl_edit_expense_requests)
 */
export async function submitCplEditExpenseRequest(
  expenseDate: string,
  newValues: EditExpensesRequestInput,
  reason: string,
  passwordConfirm: string
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "غير مصرح بالعملية. الرجاء تسجيل الدخول أولاً." };
    }

    if (!reason || reason.trim() === "") {
      return { success: false, error: "يرجى كتابة سبب التعديل." };
    }

    const { data: existingExpense } = await supabaseAdmin
      .from("cpl_daily_expenses")
      .select("*")
      .eq("agent_id", user.id)
      .eq("expense_date", expenseDate)
      .maybeSingle();

    if (!existingExpense) {
      return { success: false, error: "لم يتم العثور على تقرير مصاريف مالي لهذا التاريخ لتعديله." };
    }

    // Check if pending edit request already exists
    const { data: pendingEdit } = await supabaseAdmin
      .from("cpl_edit_expense_requests")
      .select("id")
      .eq("expense_id", existingExpense.id)
      .eq("status", "pending")
      .maybeSingle();

    if (pendingEdit) {
      return { success: false, error: "يوجد طلب تعديل قيد الانتظار لهذا اليوم بالفعل." };
    }

    if (!user.email) {
      return { success: false, error: "لم يتم العثور على البريد الإلكتروني للمستخدم." };
    }

    const isPasswordValid = await verifyUserPassword(user.email, passwordConfirm);
    if (!isPasswordValid) {
      return { success: false, error: "كلمة المرور غير صحيحة. يرجى المحاولة مرة أخرى." };
    }

    const { data: existingTransfers } = await supabaseAdmin
      .from("cpl_expense_transfers")
      .select("to_agent_id, amount")
      .eq("expense_id", existingExpense.id);

    const { error: insertError } = await supabaseAdmin
      .from("cpl_edit_expense_requests")
      .insert({
        expense_id: existingExpense.id,
        agent_id: user.id,
        expense_date: expenseDate,
        old_total_amount: existingExpense.total_amount,
        new_total_amount: newValues.totalAmount,
        old_marketing_1: existingExpense.marketing_1,
        new_marketing_1: newValues.marketing1,
        old_marketing_2: existingExpense.marketing_2,
        new_marketing_2: newValues.marketing2,
        old_marketing_3: existingExpense.marketing_3,
        new_marketing_3: newValues.marketing3,
        old_personal_expense: existingExpense.personal_expense,
        new_personal_expense: newValues.personalExpense,
        old_transfers: existingTransfers || [],
        new_transfers: newValues.transfers || [],
        old_total_cash: existingExpense.total_cash,
        new_total_cash: newValues.totalCash,
        old_cash_after_expenses: existingExpense.cash_after_expenses,
        new_cash_after_expenses: newValues.cashAfterExpenses,
        old_wallets_balances: existingExpense.wallets_balances,
        new_wallets_balances: newValues.walletsBalances,
        reason,
        status: "pending",
      });

    if (insertError) {
      console.error("Error inserting CPL edit expense request:", insertError);
      return { success: false, error: `فشل إرسال طلب التعديل: ${insertError.message}` };
    }

    revalidatePath("/dashboard/cpl-calculator");
    revalidatePath("/dashboard/cpl-calculator/logs");
    return { success: true };
  } catch (err: any) {
    console.error("submitCplEditExpenseRequest error:", err);
    return { success: false, error: err.message || "حدث خطأ غير متوقع." };
  }
}

async function getCurrentUserAndRole() {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", user.id)
    .single();
  return {
    user,
    role: profile?.role || "agent",
    fullName: profile?.full_name || "",
    isLeaderOrAdmin: profile?.role === "admin" || profile?.role === "senioragent",
  };
}

export async function getCplAgentsList() {
  try {
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, role")
      .in("role", ["agent", "senioragent"])
      .eq("is_active", true)
      .order("full_name");
    return { success: true, agents: data || [] };
  } catch (err: any) {
    return { success: false, agents: [] };
  }
}

/**
 * Action: Get CPL Agent Daily Expenses Paginated
 */
export async function getCplAgentDailyExpensesPaginated(params: {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  agentId?: string;
}) {
  try {
    const authInfo = await getCurrentUserAndRole();
    if (!authInfo) {
      return { success: false, error: "غير مصرح." };
    }

    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 20;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from("cpl_daily_expenses")
      .select("*, agent:profiles!cpl_daily_expenses_agent_id_fkey(id, full_name)", { count: "exact" });

    if (authInfo.isLeaderOrAdmin) {
      if (params.agentId && params.agentId !== "all") {
        query = query.eq("agent_id", params.agentId);
      }
    } else {
      query = query.eq("agent_id", authInfo.user.id);
    }

    if (params.startDate) {
      query = query.gte("expense_date", params.startDate);
    }
    if (params.endDate) {
      query = query.lte("expense_date", params.endDate);
    }

    const { data: rows, count, error: dataErr } = await query
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (dataErr) {
      return { success: false, error: dataErr.message };
    }

    return {
      success: true,
      data: rows || [],
      totalCount: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    };
  } catch (err: any) {
    return { success: false, error: err.message || "حدث خطأ غير متوقع." };
  }
}

/**
 * Action: Get CPL Agent Fund Requests Paginated
 */
export async function getCplAgentFundRequestsPaginated(params: {
  page?: number;
  limit?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
  agentId?: string;
}) {
  try {
    const authInfo = await getCurrentUserAndRole();
    if (!authInfo) {
      return { success: false, error: "غير مصرح." };
    }

    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 20;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from("cpl_fund_requests")
      .select("*, wallet:wallets(phone_number), agent:profiles!cpl_fund_requests_agent_id_fkey(id, full_name)", { count: "exact" });

    if (authInfo.isLeaderOrAdmin) {
      if (params.agentId && params.agentId !== "all") {
        query = query.eq("agent_id", params.agentId);
      }
    } else {
      query = query.eq("agent_id", authInfo.user.id);
    }

    if (params.status && params.status !== "all") {
      query = query.eq("status", params.status);
    }
    if (params.startDate) {
      query = query.gte("request_date", params.startDate);
    }
    if (params.endDate) {
      query = query.lte("request_date", params.endDate);
    }

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: data || [],
      totalCount: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    };
  } catch (err: any) {
    return { success: false, error: err.message || "حدث خطأ غير متوقع." };
  }
}

/**
 * Action: Get CPL Agent Edit Requests Paginated
 */
export async function getCplAgentEditRequestsPaginated(params: {
  page?: number;
  limit?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
  agentId?: string;
}) {
  try {
    const authInfo = await getCurrentUserAndRole();
    if (!authInfo) {
      return { success: false, error: "غير مصرح." };
    }

    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 20;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from("cpl_edit_expense_requests")
      .select("*, agent:profiles!cpl_edit_expense_requests_agent_id_fkey(id, full_name)", { count: "exact" });

    if (authInfo.isLeaderOrAdmin) {
      if (params.agentId && params.agentId !== "all") {
        query = query.eq("agent_id", params.agentId);
      }
    } else {
      query = query.eq("agent_id", authInfo.user.id);
    }

    if (params.status && params.status !== "all") {
      query = query.eq("status", params.status);
    }
    if (params.startDate) {
      query = query.gte("expense_date", params.startDate);
    }
    if (params.endDate) {
      query = query.lte("expense_date", params.endDate);
    }

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: data || [],
      totalCount: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    };
  } catch (err: any) {
    return { success: false, error: err.message || "حدث خطأ غير متوقع." };
  }
}

/**
 * Action: Get CPL Custody Transfers Paginated
 */
export async function getCplAgentCustodyTransfersPaginated(params: {
  page?: number;
  limit?: number;
  transferType?: "all" | "sent" | "received";
  startDate?: string;
  endDate?: string;
  agentId?: string;
}) {
  try {
    const authInfo = await getCurrentUserAndRole();
    if (!authInfo) {
      return { success: false, error: "غير مصرح." };
    }

    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 20;
    const offset = (page - 1) * limit;

    let countQuery = supabaseAdmin
      .from("cpl_expense_transfers")
      .select("*", { count: "exact", head: true });

    let dataQuery = supabaseAdmin
      .from("cpl_expense_transfers")
      .select(`
        *,
        fromAgent:profiles!cpl_expense_transfers_from_agent_id_fkey(full_name),
        toAgent:profiles!cpl_expense_transfers_to_agent_id_fkey(full_name)
      `);

    const type = params.transferType || "all";

    if (authInfo.isLeaderOrAdmin) {
      if (params.agentId && params.agentId !== "all") {
        if (type === "sent") {
          countQuery = countQuery.eq("from_agent_id", params.agentId);
          dataQuery = dataQuery.eq("from_agent_id", params.agentId);
        } else if (type === "received") {
          countQuery = countQuery.eq("to_agent_id", params.agentId);
          dataQuery = dataQuery.eq("to_agent_id", params.agentId);
        } else {
          countQuery = countQuery.or(`from_agent_id.eq.${params.agentId},to_agent_id.eq.${params.agentId}`);
          dataQuery = dataQuery.or(`from_agent_id.eq.${params.agentId},to_agent_id.eq.${params.agentId}`);
        }
      }
    } else {
      if (type === "sent") {
        countQuery = countQuery.eq("from_agent_id", authInfo.user.id);
        dataQuery = dataQuery.eq("from_agent_id", authInfo.user.id);
      } else if (type === "received") {
        countQuery = countQuery.eq("to_agent_id", authInfo.user.id);
        dataQuery = dataQuery.eq("to_agent_id", authInfo.user.id);
      } else {
        countQuery = countQuery.or(`from_agent_id.eq.${authInfo.user.id},to_agent_id.eq.${authInfo.user.id}`);
        dataQuery = dataQuery.or(`from_agent_id.eq.${authInfo.user.id},to_agent_id.eq.${authInfo.user.id}`);
      }
    }

    if (params.startDate) {
      countQuery = countQuery.gte("created_at", `${params.startDate}T00:00:00`);
      dataQuery = dataQuery.gte("created_at", `${params.startDate}T00:00:00`);
    }
    if (params.endDate) {
      countQuery = countQuery.lte("created_at", `${params.endDate}T23:59:59`);
      dataQuery = dataQuery.lte("created_at", `${params.endDate}T23:59:59`);
    }

    const { count, error: countErr } = await countQuery;
    if (countErr) {
      return { success: false, error: countErr.message };
    }

    const { data, error: dataErr } = await dataQuery
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (dataErr) {
      return { success: false, error: dataErr.message };
    }

    return {
      success: true,
      data: data || [],
      totalCount: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    };
  } catch (err: any) {
    return { success: false, error: err.message || "حدث خطأ غير متوقع." };
  }
}
