"use server";

import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { revalidatePath } from "next/cache";

export interface WalletWithBalance {
  id: string;
  phone_number: string;
  is_active: boolean;
  start_of_month_balance: number;
  calculatedBalance: number;
  created_at: string;
  remainingLimit: number;
}

export interface ColleagueData {
  id: string;
  full_name: string;
  role: string;
}

export interface ExpenseTransferInput {
  toAgentId: string;
  amount: number;
}

export interface DailyExpensesInput {
  expenseDate: string; // 'YYYY-MM-DD'
  totalAmount: number;
  marketing1: number;
  marketing2: number;
  marketing3: number;
  personalExpense: number;
  transfers: ExpenseTransferInput[];
  totalCash: number;
  cashAfterExpenses: number;
  walletsBalances: { wallet_id: string; phone_number: string; balance: number }[];
}

export interface EditExpensesRequestInput {
  totalAmount: number;
  marketing1: number;
  marketing2: number;
  marketing3: number;
  personalExpense: number;
  transfers: { to_agent_id: string; amount: number }[];
  totalCash?: number;
  cashAfterExpenses?: number;
  walletsBalances?: { wallet_id: string; phone_number: string; balance: number }[];
}

export interface FundRequestInput {
  walletId: string;
  requestDate: string; // 'YYYY-MM-DD'
  amountRequested: number;
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
 * Verifies the user's password by performing a re-login check
 */
async function verifyUserPassword(email: string, passwordConfirm?: string): Promise<boolean> {
  if (!passwordConfirm) return false;
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: passwordConfirm,
    });
    return !error;
  } catch {
    return false;
  }
}

/**
 * Creates a notification in the database for the user
 */
async function createNotification(userId: string, title: string, message: string) {
  try {
    await supabaseAdmin.from("notifications").insert({
      user_id: userId,
      title,
      message,
      is_read: false,
    });
  } catch (err) {
    console.error("createNotification error:", err);
  }
}

/**
 * Action: Submit a fund request
 */
export async function submitFundRequest(input: FundRequestInput, passwordConfirm?: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "غير مصرح بالعملية. الرجاء تسجيل الدخول أولاً." };
    }

    const { walletId, requestDate, amountRequested } = input;

    // 1. Basic validation
    if (!walletId) {
      return { success: false, error: "المحفظة المحددة غير صالحة." };
    }
    if (amountRequested <= 0) {
      return { success: false, error: "يجب أن يكون المبلغ المطلوب أكبر من الصفر." };
    }

    // 2. Validate date (Egypt local time constraints)
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Riyadh", // UTC+3 Egypt overlap
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const todayStr = formatter.format(new Date());
    const yesterdayStr = formatter.format(new Date(Date.now() - 86400000));

    if (requestDate !== todayStr && requestDate !== yesterdayStr) {
      return { success: false, error: "عذراً، يُسمح فقط باختيار تاريخ اليوم أو الأمس." };
    }

    // Verify user suspension status
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("is_active, full_name")
      .eq("id", user.id)
      .single();

    if (profileErr || !profile || !profile.is_active) {
      return { success: false, error: "حسابك موقوف، غير مصرح لك باتخاذ أي إجراء." };
    }

    // Verify the wallet belongs to the agent and is active
    const { data: wallet, error: walletErr } = await supabaseAdmin
      .from("wallets")
      .select("id, is_active, start_of_month_balance")
      .eq("id", walletId)
      .eq("agent_id", user.id)
      .single();

    if (walletErr || !wallet) {
      return { success: false, error: "المحفظة المحددة غير صحيحة أو لا تنتمي إليك." };
    }
    if (!wallet.is_active) {
      return { success: false, error: "المحفظة المحددة غير نشطة حالياً." };
    }

    // 3. Limit validation using admin client (max 2 fund requests per day)
    const { count, error: countError } = await supabaseAdmin
      .from("fund_requests")
      .select("id", { count: "exact", head: true })
      .eq("agent_id", user.id)
      .eq("request_date", requestDate)
      .in("status", ["pending", "approved"]);

    if (countError) {
      console.error("Error counting daily requests:", countError);
      return { success: false, error: "حدث خطأ أثناء التحقق من حد الطلبات اليومي." };
    }

    if (count !== null && count >= 2) {
      return {
        success: false,
        error: "لقد استنفذت الحد الأقصى للطلبات (2) لهذا التاريخ",
      };
    }

    // 4. Verify wallet balance limit constraint (balance cannot exceed 200k)
    // current monthly limit calculation: start_of_month_balance + approved_monthly_requests in the current calendar month
    const currentMonthStr = todayStr.substring(0, 7);
    const startOfMonth = `${currentMonthStr}-01`;
    const lastDay = new Date(Number(currentMonthStr.substring(0, 4)), Number(currentMonthStr.substring(5, 7)), 0).getDate();
    const endOfMonth = `${currentMonthStr}-${String(lastDay).padStart(2, "0")}`;

    const { data: approvedRequests } = await supabaseAdmin
      .from("fund_requests")
      .select("amount_approved")
      .eq("wallet_id", walletId)
      .eq("status", "approved")
      .gte("request_date", startOfMonth)
      .lte("request_date", endOfMonth);

    const starting = Number(wallet.start_of_month_balance) || 0;
    const approvedSum = (approvedRequests || []).reduce((sum, req) => sum + (Number(req.amount_approved) || 0), 0);
    const totalConsumed = starting + approvedSum;
    const available = 200000 - totalConsumed;

    if (amountRequested > available) {
      return {
        success: false,
        error: `لا يمكنك طلب (${amountRequested.toLocaleString("en-US")} ج.م). المتاح لك هذا الشهر لهذه المحفظة هو (${available.toLocaleString("en-US")} ج.م) فقط لتجنب تجاوز الحد الأقصى للرصيد (200 ألف ج.م).`,
      };
    }

    // 5. Password validation
    if (!user.email) {
      return { success: false, error: "لم يتم العثور على البريد الإلكتروني للمستخدم." };
    }

    const isPasswordValid = await verifyUserPassword(user.email, passwordConfirm);
    if (!isPasswordValid) {
      return { success: false, error: "كلمة المرور غير صحيحة. يرجى المحاولة مرة أخرى." };
    }

    // 6. Insert request as 'pending'
    const { data: request, error: insertError } = await supabaseAdmin
      .from("fund_requests")
      .insert({
        agent_id: user.id,
        wallet_id: walletId,
        request_date: requestDate,
        amount_requested: amountRequested,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting fund request:", insertError);
      return { success: false, error: `فشل إرسال الطلب: ${insertError.message}` };
    }

    // 7. Send notifications to admins and accountants
    try {
      const { data: staffMembers } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .in("role", ["admin", "accountant"])
        .eq("is_active", true);

      if (staffMembers && staffMembers.length > 0) {
        const title = "طلب شحن رصيد جديد";
        const message = `قام الموظف ${profile.full_name} بطلب شحن رصيد بقيمة ${amountRequested.toLocaleString("en-US")} ج.م`;
        
        await Promise.all(
          staffMembers.map((staff) => createNotification(staff.id, title, message))
        );
      }
    } catch (notifErr) {
      console.error("Failed to send fund request notifications:", notifErr);
    }

    revalidatePath("/dashboard/operations");
    revalidatePath("/dashboard/logs");

    return { success: true, request };
  } catch (err: any) {
    console.error("submitFundRequest error:", err);
    return { success: false, error: err.message || "حدث خطأ غير متوقع." };
  }
}

/**
 * Action: Get all colleagues
 */
export async function getColleagues() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "غير مصرح بالعملية. الرجاء تسجيل الدخول أولاً." };
    }

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, role")
      .in("role", ["agent", "senioragent"])
      .eq("is_active", true)
      .neq("id", user.id)
      .order("full_name");

    if (error) {
      console.error("Error fetching colleagues:", error);
      return { success: false, error: `فشل جلب الزملاء: ${error.message}` };
    }

    return { success: true, colleagues: (data || []) as ColleagueData[] };
  } catch (err: any) {
    console.error("getColleagues error:", err);
    return { success: false, error: err.message || "حدث خطأ غير متوقع." };
  }
}

/**
 * Action: Submit daily expenses report
 */
export async function submitDailyExpenses(input: DailyExpensesInput, passwordConfirm?: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "غير مصرح بالعملية. الرجاء تسجيل الدخول أولاً." };
    }

    const { expenseDate, totalAmount, marketing1, marketing2, marketing3, personalExpense, transfers, totalCash, cashAfterExpenses, walletsBalances } = input;

    // 1. Basic validation
    if (!expenseDate) {
      return { success: false, error: "تاريخ التقرير مطلوب." };
    }

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

    // Verify user profile is active
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("is_active")
      .eq("id", user.id)
      .single();

    if (profileErr || !profile || !profile.is_active) {
      return { success: false, error: "حسابك موقوف، غير مصرح لك باتخاذ أي إجراء." };
    }

    // 2. Double submission validation
    const { data: existingRecord, error: checkError } = await supabaseAdmin
      .from("daily_expenses")
      .select("id")
      .eq("agent_id", user.id)
      .eq("expense_date", expenseDate)
      .maybeSingle();

    if (checkError) {
      console.error("Error checking existing daily expense:", checkError);
      return { success: false, error: "حدث خطأ أثناء التحقق من حالة الإغلاق اليومي." };
    }

    if (existingRecord) {
      return {
        success: false,
        error: "لقد قمت بإغلاق اليوم المالي لهذا التاريخ مسبقاً، لا يمكنك إرسال تقريرين لنفس اليوم",
      };
    }

    // 3. Password validation
    if (!user.email) {
      return { success: false, error: "لم يتم العثور على البريد الإلكتروني للمستخدم." };
    }

    const isPasswordValid = await verifyUserPassword(user.email, passwordConfirm);
    if (!isPasswordValid) {
      return { success: false, error: "كلمة المرور غير صحيحة. يرجى المحاولة مرة أخرى." };
    }

    // 4. Insert main expense record
    const { data: insertedExpense, error: expenseInsertError } = await supabaseAdmin
      .from("daily_expenses")
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
      console.error("Error inserting daily expense:", expenseInsertError);
      return { success: false, error: `فشل تسجيل اليوم المالي: ${expenseInsertError.message}` };
    }

    // 5. Insert transfers if they exist
    if (transfers && transfers.length > 0) {
      const transfersToInsert = transfers.map((t) => ({
        expense_id: insertedExpense.id,
        from_agent_id: user.id,
        to_agent_id: t.toAgentId,
        amount: t.amount,
      }));

      const { error: transfersInsertError } = await supabaseAdmin
        .from("expense_transfers")
        .insert(transfersToInsert);

      if (transfersInsertError) {
        console.error("Error inserting transfers, rolling back daily expense:", transfersInsertError);
        // Rollback daily expense insert
        await supabaseAdmin
          .from("daily_expenses")
          .delete()
          .eq("id", insertedExpense.id);

        return { success: false, error: `فشل تسجيل تحويلات العهدة: ${transfersInsertError.message}` };
      }
    }

    revalidatePath("/dashboard/operations");
    revalidatePath("/dashboard/logs");
    return { success: true };
  } catch (err: any) {
    console.error("submitDailyExpenses error:", err);
    return { success: false, error: err.message || "حدث خطأ غير متوقع." };
  }
}

/**
 * Action: Get daily expense report details for a specific date
 */
export async function getExpenseReportForDate(dateStr: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "غير مصرح بالعملية. الرجاء تسجيل الدخول أولاً." };
    }

    const { data: expense, error: expenseError } = await supabaseAdmin
      .from("daily_expenses")
      .select("*")
      .eq("agent_id", user.id)
      .eq("expense_date", dateStr)
      .maybeSingle();

    if (expenseError) {
      console.error("Error fetching daily expense report:", expenseError);
      return { success: false, error: "حدث خطأ أثناء فحص البيانات." };
    }

    if (!expense) {
      return { success: true, found: false };
    }

    // Fetch associated transfers
    const { data: transfers, error: transfersError } = await supabaseAdmin
      .from("expense_transfers")
      .select("to_agent_id, amount")
      .eq("expense_id", expense.id);

    if (transfersError) {
      console.error("Error fetching transfers for date:", transfersError);
    }

    return {
      success: true,
      found: true,
      report: {
        id: expense.id,
        totalAmount: Number(expense.total_amount) || 0,
        marketing1: Number(expense.marketing_1) || 0,
        marketing2: Number(expense.marketing_2) || 0,
        marketing3: Number(expense.marketing_3) || 0,
        personalExpense: Number(expense.personal_expense) || 0,
        expenseDate: expense.expense_date,
        totalCash: Number(expense.total_cash) || 0,
        cashAfterExpenses: Number(expense.cash_after_expenses) || 0,
        walletsBalances: expense.wallets_balances || [],
      },
      transfers: (transfers || []).map((t) => ({
        toAgentId: t.to_agent_id,
        amount: Number(t.amount) || 0,
      })),
    };
  } catch (err: any) {
    console.error("getExpenseReportForDate error:", err);
    return { success: false, error: err.message || "حدث خطأ غير متوقع." };
  }
}

/**
 * Action: Submit an edit expense request
 */
export async function submitEditExpenseRequest(
  expenseId: string,
  requestedChanges: EditExpensesRequestInput,
  passwordConfirm?: string
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "غير مصرح بالعملية. الرجاء تسجيل الدخول أولاً." };
    }

    if (!expenseId) {
      return { success: false, error: "معرف التقرير الأصلي مطلوب." };
    }
    if (!requestedChanges) {
      return { success: false, error: "التعديلات المطلوبة فارغة." };
    }

    // Verify user profile is active
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("is_active, full_name")
      .eq("id", user.id)
      .single();

    if (profileErr || !profile || !profile.is_active) {
      return { success: false, error: "حسابك موقوف، غير مصرح لك باتخاذ أي إجراء." };
    }

    // 1. Check for duplicate pending requests
    const { data: existingPending, error: checkError } = await supabaseAdmin
      .from("edit_expense_requests")
      .select("id")
      .eq("expense_id", expenseId)
      .eq("status", "pending")
      .maybeSingle();

    if (checkError) {
      console.error("Error checking duplicate edit requests:", checkError);
      return { success: false, error: "حدث خطأ أثناء التحقق من طلبات التعديل السابقة." };
    }

    if (existingPending) {
      return {
        success: false,
        error: "يوجد طلب تعديل قيد المراجعة لهذا التقرير بالفعل، يرجى انتظار رد الإدارة",
      };
    }

    // 2. Fetch original expense details and transfers to verify if changes were actually made
    const { data: originalExpense, error: originalError } = await supabaseAdmin
      .from("daily_expenses")
      .select("*")
      .eq("id", expenseId)
      .single();

    if (originalError || !originalExpense) {
      console.error("Error fetching original expense for change check:", originalError);
      return { success: false, error: "فشل العثور على التقرير المالي الأصلي للتحقق." };
    }

    const { data: originalTransfers, error: transError } = await supabaseAdmin
      .from("expense_transfers")
      .select("to_agent_id, amount")
      .eq("expense_id", expenseId);

    if (transError) {
      console.error("Error fetching original transfers for change check:", transError);
    }

    // Compare fields
    const isPersonalChanged = Number(requestedChanges.personalExpense) !== Number(originalExpense.personal_expense);
    const isMarketing1Changed = Number(requestedChanges.marketing1) !== Number(originalExpense.marketing_1);
    const isMarketing2Changed = Number(requestedChanges.marketing2) !== Number(originalExpense.marketing_2);
    const isMarketing3Changed = Number(requestedChanges.marketing3) !== Number(originalExpense.marketing_3);
    const isTotalChanged = Number(requestedChanges.totalAmount) !== Number(originalExpense.total_amount);

    // Compare transfers
    const origTransfersMap: Record<string, number> = {};
    (originalTransfers || []).forEach((t) => {
      origTransfersMap[t.to_agent_id] = Number(t.amount);
    });

    const reqTransfersMap: Record<string, number> = {};
    (requestedChanges.transfers || []).forEach((t) => {
      reqTransfersMap[t.to_agent_id] = Number(t.amount);
    });

    const origKeys = Object.keys(origTransfersMap);
    const reqKeys = Object.keys(reqTransfersMap);

    let isTransfersChanged = false;
    if (origKeys.length !== reqKeys.length) {
      isTransfersChanged = true;
    } else {
      for (const key of origKeys) {
        if (origTransfersMap[key] !== reqTransfersMap[key]) {
          isTransfersChanged = true;
          break;
        }
      }
    }

    const isTotalCashChanged = requestedChanges.totalCash !== undefined && Number(requestedChanges.totalCash) !== Number(originalExpense.total_cash);

    const hasAnyChanges = isPersonalChanged || isMarketing1Changed || isMarketing2Changed || isMarketing3Changed || isTotalChanged || isTransfersChanged || isTotalCashChanged;

    if (!hasAnyChanges) {
      return { success: false, error: "لم تقم بتعديل أي قيم. يجب تغيير قيمة واحدة على الأقل لتقديم طلب تعديل." };
    }

    // Format changes to JSON specification
    const dbRequestedChanges = {
      total_amount: requestedChanges.totalAmount,
      marketing_1: requestedChanges.marketing1,
      marketing_2: requestedChanges.marketing2,
      marketing_3: requestedChanges.marketing3,
      personal_expense: requestedChanges.personalExpense,
      transfers: requestedChanges.transfers.map((t) => ({
        to_agent_id: t.to_agent_id,
        amount: t.amount,
      })),
      total_cash: requestedChanges.totalCash !== undefined ? requestedChanges.totalCash : Number(originalExpense.total_cash || 0),
      cash_after_expenses: requestedChanges.cashAfterExpenses !== undefined ? requestedChanges.cashAfterExpenses : Number(originalExpense.cash_after_expenses || 0),
      wallets_balances: requestedChanges.walletsBalances || originalExpense.wallets_balances || [],
    };

    // 3. Insert pending request
    const { error: insertError } = await supabaseAdmin
      .from("edit_expense_requests")
      .insert({
        expense_id: expenseId,
        agent_id: user.id,
        status: "pending",
        requested_changes: dbRequestedChanges,
      });

    if (insertError) {
      console.error("Error inserting edit expense request:", insertError);
      return { success: false, error: `فشل تسجيل طلب التعديل: ${insertError.message}` };
    }

    // 4. Send real-time notifications to admins and senior agents
    try {
      const { data: staffMembers } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .in("role", ["admin", "senioragent"])
        .eq("is_active", true);

      if (staffMembers && staffMembers.length > 0) {
        const title = "طلب تعديل مصاريف جديد";
        const message = `قام الموظف ${profile.full_name} بتقديم طلب تعديل مصاريف لتقرير يوم ${originalExpense.expense_date}`;
        
        await Promise.all(
          staffMembers.map((staff) => createNotification(staff.id, title, message))
        );
      }
    } catch (notifErr) {
      console.error("Failed to send edit request notifications:", notifErr);
    }

    revalidatePath("/dashboard/operations");
    revalidatePath("/dashboard/logs");
    return { success: true };
  } catch (err: any) {
    console.error("submitEditExpenseRequest error:", err);
    return { success: false, error: err.message || "حدث خطأ غير متوقع." };
  }
}

/**
 * Action: Get wallets of logged-in agent with calculated balances for current month
 */
export async function getAgentWalletsWithBalances() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "غير مصرح بالعملية. الرجاء تسجيل الدخول أولاً." };
    }

    // Verify user profile is active
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("is_active")
      .eq("id", user.id)
      .single();

    if (profileErr || !profile || !profile.is_active) {
      return { success: false, error: "الحساب موقوف حالياً." };
    }

    // Fetch active wallets owned by the agent
    const { data: wallets, error: walletsError } = await supabaseAdmin
      .from("wallets")
      .select("*")
      .eq("agent_id", user.id)
      .eq("is_active", true);

    if (walletsError) {
      console.error("Error fetching agent wallets:", walletsError);
      return { success: false, error: "حدث خطأ أثناء جلب المحافظ." };
    }

    if (!wallets || wallets.length === 0) {
      return { success: true, wallets: [] };
    }

    // Calculate balances based on approved requests this month
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Riyadh",
      year: "numeric",
      month: "2-digit",
    });
    const parts = formatter.formatToParts(new Date());
    const year = parts.find((p) => p.type === "year")?.value;
    const month = parts.find((p) => p.type === "month")?.value;

    let walletCalculatedList: WalletWithBalance[] = [];

    if (year && month) {
      const startOfMonth = `${year}-${month}-01`;
      const lastDay = new Date(Number(year), Number(month), 0).getDate();
      const endOfMonth = `${year}-${month}-${String(lastDay).padStart(2, "0")}`;

      const walletIds = wallets.map((w) => w.id);
      const { data: approvedRequests } = await supabaseAdmin
        .from("fund_requests")
        .select("wallet_id, amount_approved")
        .eq("status", "approved")
        .in("wallet_id", walletIds)
        .gte("request_date", startOfMonth)
        .lte("request_date", endOfMonth);

      walletCalculatedList = wallets.map((w) => {
        const starting = Number(w.start_of_month_balance) || 0;
        const approvedSum = (approvedRequests || [])
          .filter((req) => req.wallet_id === w.id)
          .reduce((sum, req) => sum + (Number(req.amount_approved) || 0), 0);
        const calculatedBalance = starting + approvedSum;
        const remainingLimit = Math.max(0, 200000 - calculatedBalance);

        return {
          id: w.id,
          phone_number: w.phone_number,
          is_active: w.is_active,
          start_of_month_balance: starting,
          calculatedBalance,
          remainingLimit,
          created_at: w.created_at,
        };
      });
    } else {
      walletCalculatedList = wallets.map((w) => ({
        id: w.id,
        phone_number: w.phone_number,
        is_active: w.is_active,
        start_of_month_balance: Number(w.start_of_month_balance) || 0,
        calculatedBalance: Number(w.start_of_month_balance) || 0,
        remainingLimit: Math.max(0, 200000 - (Number(w.start_of_month_balance) || 0)),
        created_at: w.created_at,
      }));
    }

    return { success: true, wallets: walletCalculatedList };
  } catch (err: any) {
    console.error("getAgentWalletsWithBalances error:", err);
    return { success: false, error: err.message || "حدث خطأ غير متوقع." };
  }
}

/**
 * Action: Get fund requests for logged-in agent with filters and pagination
 */
export async function getAgentFundRequestsPaginated(params: {
  page: number;
  limit: number;
  startDate?: string;
  endDate?: string;
  status?: string;
  walletPhoneNumbers?: string[];
}) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "غير مصرح بالعملية" };

    const supabase = await createClient();

    let query = supabase
      .from("fund_requests")
      .select(`
        *,
        wallet:wallets(phone_number),
        reviewer:profiles!fund_requests_approved_by_fkey(full_name)
      `, { count: "exact" })
      .eq("agent_id", user.id);

    if (params.startDate) {
      query = query.gte("request_date", params.startDate);
    }
    if (params.endDate) {
      query = query.lte("request_date", params.endDate);
    }
    if (params.status && params.status !== "all") {
      query = query.eq("status", params.status);
    }

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range((params.page - 1) * params.limit, params.page * params.limit - 1);

    if (error) throw error;

    let filteredData = data || [];
    if (params.walletPhoneNumbers && params.walletPhoneNumbers.length > 0) {
      filteredData = filteredData.filter((req: any) =>
        req.wallet && params.walletPhoneNumbers!.includes(req.wallet.phone_number)
      );
    }

    return { success: true, data: filteredData, totalCount: count || 0 };
  } catch (err: any) {
    console.error("getAgentFundRequestsPaginated error:", err);
    return { success: false, error: err.message, data: [], totalCount: 0 };
  }
}

/**
 * Action: Get daily expenses for logged-in agent with filters and pagination
 */
export async function getAgentDailyExpensesPaginated(params: {
  page: number;
  limit: number;
  startDate?: string;
  endDate?: string;
}) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "غير مصرح بالعملية" };

    let query = supabaseAdmin
      .from("daily_expenses")
      .select("*", { count: "exact" })
      .eq("agent_id", user.id);

    if (params.startDate) {
      query = query.gte("expense_date", params.startDate);
    }
    if (params.endDate) {
      query = query.lte("expense_date", params.endDate);
    }

    const { data, count, error } = await query
      .order("expense_date", { ascending: false })
      .range((params.page - 1) * params.limit, params.page * params.limit - 1);

    if (error) throw error;

    const formattedData = (data || []).map((exp: any) => ({
      id: exp.id,
      expense_date: exp.expense_date,
      total_amount: exp.total_amount,
      marketing_1: exp.marketing_1,
      marketing_2: exp.marketing_2,
      marketing_3: exp.marketing_3,
      personal_expense: exp.personal_expense,
      total_cash: exp.total_cash,
      cash_after_expenses: exp.cash_after_expenses,
      wallets_balances: exp.wallets_balances,
    }));

    return { success: true, data: formattedData, totalCount: count || 0 };
  } catch (err: any) {
    console.error("getAgentDailyExpensesPaginated error:", err);
    return { success: false, error: err.message, data: [], totalCount: 0 };
  }
}

/**
 * Action: Get edit expense requests for logged-in agent with filters and pagination
 */
export async function getAgentEditRequestsPaginated(params: {
  page: number;
  limit: number;
  startDate?: string;
  endDate?: string;
  status?: string;
}) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "غير مصرح بالعملية" };

    const supabase = await createClient();

    let query = supabase
      .from("edit_expense_requests")
      .select(`
        *,
        expense:daily_expenses(expense_date),
        reviewer:profiles!edit_expense_requests_reviewed_by_fkey(full_name)
      `, { count: "exact" })
      .eq("agent_id", user.id);

    if (params.startDate) {
      query = query.gte("created_at", params.startDate);
    }
    if (params.endDate) {
      query = query.lte("created_at", params.endDate + "T23:59:59.999Z");
    }
    if (params.status && params.status !== "all") {
      query = query.eq("status", params.status);
    }

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range((params.page - 1) * params.limit, params.page * params.limit - 1);

    if (error) throw error;

    return { success: true, data: data || [], totalCount: count || 0 };
  } catch (err: any) {
    console.error("getAgentEditRequestsPaginated error:", err);
    return { success: false, error: err.message, data: [], totalCount: 0 };
  }
}

/**
 * Fetches the current custody balance for a specific agent
 */
export async function getAgentCurrentCustody(agentId: string): Promise<number> {
  try {
    // 1. Fetch approved funds (all-time)
    const { data: approvedFunds } = await supabaseAdmin
      .from("fund_requests")
      .select("amount_approved")
      .eq("agent_id", agentId)
      .eq("status", "approved");

    const approvedSum = (approvedFunds || []).reduce((sum, f) => sum + (Number(f.amount_approved) || 0), 0);

    // 2. Fetch daily expenses spent (all-time)
    const { data: expenses } = await supabaseAdmin
      .from("daily_expenses")
      .select("personal_expense, marketing_1, marketing_2, marketing_3")
      .eq("agent_id", agentId);

    const expensesSum = (expenses || []).reduce((sum, e) => {
      const p = Number(e.personal_expense) || 0;
      const m1 = Number(e.marketing_1) || 0;
      const m2 = Number(e.marketing_2) || 0;
      const m3 = Number(e.marketing_3) || 0;
      return sum + p + m1 + m2 + m3;
    }, 0);

    // 3. Fetch custody transfers sent and received (all-time)
    const { data: transfers } = await supabaseAdmin
      .from("expense_transfers")
      .select("amount, from_agent_id, to_agent_id")
      .or(`from_agent_id.eq.${agentId},to_agent_id.eq.${agentId}`);

    let sentSum = 0;
    let receivedSum = 0;

    if (transfers) {
      transfers.forEach((t) => {
        if (t.from_agent_id === agentId) {
          sentSum += Number(t.amount) || 0;
        }
        if (t.to_agent_id === agentId) {
          receivedSum += Number(t.amount) || 0;
        }
      });
    }

    return approvedSum + receivedSum - (expensesSum + sentSum);
  } catch (err) {
    console.error("Error calculating current custody for agent:", err);
    return 0;
  }
}

/**
 * Action: Get transfers associated with a daily expense ID
 */
export async function getExpenseTransfers(expenseId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "غير مصرح بالعملية" };

    const { data, error } = await supabaseAdmin
      .from("expense_transfers")
      .select(`
        id,
        amount,
        to_agent_id,
        to_agent:profiles!expense_transfers_to_agent_id_fkey(full_name)
      `)
      .eq("expense_id", expenseId);

    if (error) throw error;
    
    const formatted = (data || []).map((t: any) => ({
      id: t.id,
      amount: t.amount,
      toAgentId: t.to_agent_id,
      toAgentName: t.to_agent?.full_name || "موظف",
    }));

    return { success: true, transfers: formatted };
  } catch (err: any) {
    console.error("getExpenseTransfers error:", err);
    return { success: false, error: err.message, transfers: [] };
  }
}