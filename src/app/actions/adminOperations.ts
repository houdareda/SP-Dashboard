"use server";

import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { revalidatePath } from "next/cache";

export interface AdminFundRequest {
  id: string;
  agent_id: string;
  wallet_id: string;
  request_date: string;
  amount_requested: number;
  amount_approved: number | null;
  status: "pending" | "approved" | "rejected";
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  wallet_balance: number;
  wallet_remaining_limit?: number;
  agent: {
    full_name: string;
  } | null;
  wallet: {
    id: string;
    phone_number: string;
    start_of_month_balance: number;
  } | null;
  reviewer: {
    full_name: string;
  } | null;
}

export interface AdminAgentOption {
  id: string;
  full_name: string;
}

export interface EditExpenseRequestData {
  id: string;
  expense_id: string;
  agent_id: string;
  created_at: string;
  status: "pending" | "approved" | "rejected";
  requested_changes: {
    total_amount: number;
    marketing_1: number;
    marketing_2: number;
    marketing_3: number;
    personal_expense: number;
    transfers: { to_agent_id: string; amount: number }[];
  };
  original_transfers: {
    id: string;
    amount: number;
    to_agent_id: string;
    to_agent: {
      full_name: string;
    } | null;
  }[];
  agent: {
    full_name: string;
  } | null;
  expense: {
    id: string;
    agent_id: string;
    expense_date: string;
    personal_expense: number;
    marketing_1: number;
    marketing_2: number;
    marketing_3: number;
    total_amount: number;
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
 * Action: Get all fund requests and agents for administrative listing and filtering
 */
export async function getAdminFundRequests() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "غير مصرح بالعملية. الرجاء تسجيل الدخول أولاً." };
    }

    // 1. Fetch user role to verify allowed roles
    const supabase = await createClient();
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || (profile.role !== "admin" && profile.role !== "accountant")) {
      return { success: false, error: "غير مصرح لك بدخول هذه الصفحة." };
    }

    // 2. Fetch all requests with joined tables
    const { data: requests, error: requestsError } = await supabaseAdmin
      .from("fund_requests")
      .select(`
        *,
        agent:profiles!fund_requests_agent_id_fkey(full_name),
        wallet:wallets(id, phone_number, start_of_month_balance),
        reviewer:profiles!fund_requests_approved_by_fkey(full_name)
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (requestsError) {
      console.error("Error fetching fund requests:", requestsError);
      return { success: false, error: "حدث خطأ أثناء جلب طلبات شحن الرصيد." };
    }

    // 3. Fetch wallets and calculate smart balances
    const { data: wallets, error: walletsError } = await supabaseAdmin
      .from("wallets")
      .select("id, start_of_month_balance");

    if (walletsError) {
      console.error("Error fetching wallets for balances:", walletsError);
      return { success: false, error: "حدث خطأ أثناء حساب أرصدة المحافظ." };
    }

    // Determine current month's bounds in UTC+3 (Asia/Riyadh)
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Riyadh",
      year: "numeric",
      month: "2-digit",
    });
    const parts = formatter.formatToParts(new Date());
    const year = parts.find((p) => p.type === "year")?.value;
    const month = parts.find((p) => p.type === "month")?.value;

    if (!year || !month) {
      return { success: false, error: "فشل حساب الشهر الحالي." };
    }

    const startOfMonth = `${year}-${month}-01`;
    const lastDay = new Date(Number(year), Number(month), 0).getDate();
    const endOfMonth = `${year}-${month}-${String(lastDay).padStart(2, "0")}`;

    // Fetch approved requests in the current month to calculate current balances
    const { data: approvedRequests, error: approvedError } = await supabaseAdmin
      .from("fund_requests")
      .select("wallet_id, amount_approved")
      .eq("status", "approved")
      .gte("request_date", startOfMonth)
      .lte("request_date", endOfMonth);

    if (approvedError) {
      console.error("Error fetching approved requests for balances:", approvedError);
      return { success: false, error: "حدث خطأ أثناء حساب أرصدة المحافظ." };
    }

    // Create a dictionary of current calculated balances for wallets
    const walletBalances: Record<string, number> = {};
    for (const w of wallets) {
      const starting = Number(w.start_of_month_balance) || 0;
      const approvedSum = (approvedRequests || [])
        .filter((req) => req.wallet_id === w.id)
        .reduce((sum, req) => sum + (Number(req.amount_approved) || 0), 0);
      walletBalances[w.id] = starting + approvedSum;
    }

    // Blend wallet balances into requests data
    const formattedRequests: AdminFundRequest[] = (requests || []).map((req: any) => {
      const balance = walletBalances[req.wallet_id] || 0;
      const remainingLimit = Math.max(0, 200000 - balance);
      return {
        ...req,
        wallet_balance: balance,
        wallet_remaining_limit: remainingLimit,
      };
    });

    // Sort: pending first, then newest to oldest
    formattedRequests.sort((a, b) => {
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (a.status !== "pending" && b.status === "pending") return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    // 4. Fetch all active agents/senioragents for filtering dropdown
    const { data: agents, error: agentsError } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name")
      .in("role", ["agent", "senioragent"])
      .eq("is_active", true)
      .order("full_name");

    if (agentsError) {
      console.error("Error fetching agents for dropdown:", agentsError);
      return { success: false, error: "حدث خطأ أثناء جلب قائمة الموظفين للفلاتر." };
    }

    return {
      success: true,
      requests: formattedRequests,
      agents: (agents || []) as AdminAgentOption[],
    };
  } catch (err: any) {
    console.error("getAdminFundRequests error:", err);
    return { success: false, error: err.message || "حدث خطأ غير متوقع." };
  }
}

/**
 * Action: Get details of a single fund request
 */
export async function getSingleFundRequest(requestId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "غير مصرح بالعملية. الرجاء تسجيل الدخول أولاً." };
    }

    const { data: request, error: requestError } = await supabaseAdmin
      .from("fund_requests")
      .select(`
        *,
        agent:profiles!fund_requests_agent_id_fkey(full_name),
        wallet:wallets(id, phone_number, start_of_month_balance),
        reviewer:profiles!fund_requests_approved_by_fkey(full_name)
      `)
      .eq("id", requestId)
      .single();

    if (requestError || !request) {
      return { success: false, error: "لم يتم العثور على طلب شحن الرصيد." };
    }

    // Calculate smart balance
    let walletBalance = 0;
    const walletId = request.wallet_id;
    if (walletId) {
      const { data: wallet } = await supabaseAdmin
        .from("wallets")
        .select("start_of_month_balance")
        .eq("id", walletId)
        .single();

      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Riyadh",
        year: "numeric",
        month: "2-digit",
      });
      const parts = formatter.formatToParts(new Date());
      const year = parts.find((p) => p.type === "year")?.value;
      const month = parts.find((p) => p.type === "month")?.value;

      if (wallet && year && month) {
        const startOfMonth = `${year}-${month}-01`;
        const lastDay = new Date(Number(year), Number(month), 0).getDate();
        const endOfMonth = `${year}-${month}-${String(lastDay).padStart(2, "0")}`;

        const { data: approvedRequests } = await supabaseAdmin
          .from("fund_requests")
          .select("amount_approved")
          .eq("status", "approved")
          .eq("wallet_id", walletId)
          .gte("request_date", startOfMonth)
          .lte("request_date", endOfMonth);

        const starting = Number(wallet.start_of_month_balance) || 0;
        const approvedSum = (approvedRequests || []).reduce(
          (sum, req) => sum + (Number(req.amount_approved) || 0),
          0
        );
        walletBalance = starting + approvedSum;
      }
    }

    const remainingLimit = Math.max(0, 200000 - walletBalance);
    const formattedRequest: AdminFundRequest = {
      ...request,
      wallet_balance: walletBalance,
      wallet_remaining_limit: remainingLimit,
    };

    return { success: true, request: formattedRequest };
  } catch (err: any) {
    console.error("getSingleFundRequest error:", err);
    return { success: false, error: err.message || "حدث خطأ غير متوقع." };
  }
}

/**
 * Action: Review a pending fund request (Approve or Reject)
 */
export async function reviewFundRequest(
  requestId: string,
  status: "approved" | "rejected",
  approvedAmount?: number
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "غير مصرح بالعملية. الرجاء تسجيل الدخول أولاً." };
    }

    // 1. Verify user profile and role (admin or accountant)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || (profile.role !== "admin" && profile.role !== "accountant")) {
      return { success: false, error: "غير مصرح لك بإجراء هذه العملية." };
    }

    if (!requestId) {
      return { success: false, error: "معرف الطلب غير صحيح." };
    }

    // 2. Fetch original request details to check its status
    const { data: request, error: requestError } = await supabaseAdmin
      .from("fund_requests")
      .select("status, amount_requested, wallet_id, agent_id")
      .eq("id", requestId)
      .single();

    if (requestError || !request) {
      return { success: false, error: "لم يتم العثور على طلب شحن الرصيد." };
    }

    if (request.status !== "pending") {
      return { success: false, error: "تمت مراجعة واتخاذ قرار بشأن هذا الطلب مسبقاً." };
    }

    // 3. Prepare update data payload
    const updateData: any = {
      status,
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    };

    if (status === "approved") {
      const finalAmount = approvedAmount !== undefined ? approvedAmount : request.amount_requested;
      if (isNaN(finalAmount) || finalAmount <= 0) {
        return { success: false, error: "يجب إدخال مبلغ معتمد صحيح أكبر من الصفر." };
      }
      updateData.amount_approved = finalAmount;

      // Update the wallet current_balance and approved_monthly_requests in the DB
      const { data: wallet, error: walletError } = await supabaseAdmin
        .from("wallets")
        .select("current_balance, approved_monthly_requests")
        .eq("id", request.wallet_id)
        .single();

      if (walletError || !wallet) {
        console.error("Error fetching wallet details on approval:", walletError);
      } else {
        const newVal = (Number(wallet.current_balance) || 0) + finalAmount;
        const newApproved = (Number(wallet.approved_monthly_requests) || 0) + finalAmount;

        const { error: walletUpdateErr } = await supabaseAdmin
          .from("wallets")
          .update({
            current_balance: newVal,
            approved_monthly_requests: newApproved,
          })
          .eq("id", request.wallet_id);

        if (walletUpdateErr) {
          console.error("Error updating wallet balance on approval:", walletUpdateErr);
          return { success: false, error: "حدث خطأ أثناء تحديث رصيد المحفظة." };
        }
      }
    } else {
      updateData.amount_approved = 0;
    }

    // 4. Update the DB row using admin client
    const { error: updateError } = await supabaseAdmin
      .from("fund_requests")
      .update(updateData)
      .eq("id", requestId);

    if (updateError) {
      console.error("Error updating fund request status:", updateError);
      return { success: false, error: `فشل تسجيل القرار في قاعدة البيانات: ${updateError.message}` };
    }

    // 5. Create notifications
    const title = status === "approved" ? "تم قبول طلب شحن الرصيد" : "تم رفض طلب شحن الرصيد";
    const message = status === "approved"
      ? `تمت الموافقة على طلب شحن الرصيد الخاص بك بقيمة ${updateData.amount_approved} ج.م`
      : `تم رفض طلب شحن الرصيد الخاص بك`;
    await createNotification(request.agent_id, title, message);

    revalidatePath("/dashboard/admin/fund-requests");
    revalidatePath("/dashboard/operations");
    revalidatePath("/dashboard/logs");

    return { success: true };
  } catch (err: any) {
    console.error("reviewFundRequest error:", err);
    return { success: false, error: err.message || "حدث خطأ غير متوقع." };
  }
}

/**
 * Action: Get all pending edit expense requests with joined tables and original transfers
 */
export async function getPendingEditRequests() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "غير مصرح بالعملية. الرجاء تسجيل الدخول أولاً." };
    }

    // 1. Verify user profile and role (admin or senioragent)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || (profile.role !== "admin" && profile.role !== "senioragent")) {
      return { success: false, error: "غير مصرح لك بدخول هذه الصفحة." };
    }

    // 2. Fetch all pending edit requests
    const { data: requests, error: requestsError } = await supabaseAdmin
      .from("edit_expense_requests")
      .select(`
        *,
        agent:profiles!edit_expense_requests_agent_id_fkey(full_name),
        expense:daily_expenses(*)
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (requestsError) {
      console.error("Error fetching edit requests:", requestsError);
      return { success: false, error: "حدث خطأ أثناء جلب طلبات تعديل المصاريف." };
    }

    // 3. For each request, fetch the original transfers associated with the expense
    const requestDataList: EditExpenseRequestData[] = [];
    for (const req of (requests || [])) {
      const { data: transfers, error: transfersError } = await supabaseAdmin
        .from("expense_transfers")
        .select(`
          id,
          amount,
          to_agent_id,
          to_agent:profiles!expense_transfers_to_agent_id_fkey(full_name)
        `)
        .eq("expense_id", req.expense_id);

      if (transfersError) {
        console.warn(`Error fetching transfers for expense ${req.expense_id}:`, transfersError);
      }

      requestDataList.push({
        ...req,
        original_transfers: (transfers || []) as any[],
      });
    }

    // 4. Fetch all active agents/senioragents for filtering dropdown
    const { data: agents, error: agentsError } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name")
      .in("role", ["agent", "senioragent"])
      .eq("is_active", true)
      .order("full_name");

    if (agentsError) {
      console.error("Error fetching agents for dropdown:", agentsError);
    }

    return {
      success: true,
      requests: requestDataList,
      agents: (agents || []) as AdminAgentOption[],
    };
  } catch (err: any) {
    console.error("getPendingEditRequests error:", err);
    return { success: false, error: err.message || "حدث خطأ غير متوقع." };
  }
}

/**
 * Action: Review pending edit expense request (Approve or Reject)
 */
export async function reviewEditRequest(
  requestId: string,
  expenseId: string,
  status: "approved" | "rejected",
  newChanges?: any
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "غير مصرح بالعملية. الرجاء تسجيل الدخول أولاً." };
    }

    // 1. Verify user profile and role (admin or senioragent)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || (profile.role !== "admin" && profile.role !== "senioragent")) {
      return { success: false, error: "غير مصرح لك بإجراء هذه العملية." };
    }

    if (!requestId || !expenseId) {
      return { success: false, error: "بيانات الطلب غير صحيحة." };
    }

    // 2. Fetch the request to verify pending status
    const { data: editReq, error: editReqError } = await supabaseAdmin
      .from("edit_expense_requests")
      .select("status, agent_id")
      .eq("id", requestId)
      .single();

    if (editReqError || !editReq) {
      return { success: false, error: "لم يتم العثور على طلب تعديل المصاريف." };
    }

    if (editReq.status !== "pending") {
      return { success: false, error: "تمت مراجعة هذا الطلب بالفعل مسبقاً." };
    }

    // 3. Process approval database operations
    if (status === "approved") {
      if (!newChanges) {
        return { success: false, error: "التغييرات المقترحة فارغة." };
      }

      // Step A: Update the base record inside daily_expenses
      const { error: updateExpenseError } = await supabaseAdmin
        .from("daily_expenses")
        .update({
          total_amount: Number(newChanges.total_amount),
          marketing_1: Number(newChanges.marketing_1) || 0,
          marketing_2: Number(newChanges.marketing_2) || 0,
          marketing_3: Number(newChanges.marketing_3) || 0,
          personal_expense: Number(newChanges.personal_expense) || 0,
        })
        .eq("id", expenseId);

      if (updateExpenseError) {
        console.error("Error updating base daily_expenses record:", updateExpenseError);
        return { success: false, error: `فشل تحديث التقرير المالي الأصلي: ${updateExpenseError.message}` };
      }

      // Step B: Replace transfers inside expense_transfers
      // Delete all existing transfers for the expense
      const { error: deleteTransfersError } = await supabaseAdmin
        .from("expense_transfers")
        .delete()
        .eq("expense_id", expenseId);

      if (deleteTransfersError) {
        console.error("Error deleting old transfers for commit:", deleteTransfersError);
        return { success: false, error: `فشل مسح تحويلات العهدة القديمة.` };
      }

      // Insert new transfers if they exist in requested changes
      if (newChanges.transfers && newChanges.transfers.length > 0) {
        const transfersToInsert = newChanges.transfers.map((t: any) => ({
          expense_id: expenseId,
          from_agent_id: editReq.agent_id,
          to_agent_id: t.to_agent_id,
          amount: Number(t.amount) || 0,
        }));

        const { error: insertTransfersError } = await supabaseAdmin
          .from("expense_transfers")
          .insert(transfersToInsert);

        if (insertTransfersError) {
          console.error("Error inserting updated transfers for commit:", insertTransfersError);
          return { success: false, error: `فشل إدراج تحويلات العهدة الجديدة: ${insertTransfersError.message}` };
        }
      }
    }

    // 4. Update status in edit_expense_requests
    const { error: updateRequestError } = await supabaseAdmin
      .from("edit_expense_requests")
      .update({
        status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (updateRequestError) {
      console.error("Error updating edit_expense_requests row status:", updateRequestError);
      return { success: false, error: `فشل تحديث حالة الطلب: ${updateRequestError.message}` };
    }

    // 5. Send real-time notification to the agent
    try {
      const { data: originalExpense } = await supabaseAdmin
        .from("daily_expenses")
        .select("expense_date")
        .eq("id", expenseId)
        .single();

      const expenseDate = originalExpense?.expense_date || "";
      const title = status === "approved" ? "تم قبول طلب التعديل" : "تم رفض طلب التعديل";
      const message = status === "approved"
        ? `تمت الموافقة على طلب تعديل المصاريف الخاص بك لتقرير يوم ${expenseDate}`
        : `تم رفض طلب تعديل المصاريف الخاص بك لتقرير يوم ${expenseDate}`;

      await createNotification(editReq.agent_id, title, message);
    } catch (notifErr) {
      console.error("Failed to send edit review notification to agent:", notifErr);
    }

    revalidatePath("/dashboard/management/edit-requests");
    revalidatePath("/dashboard/operations");
    revalidatePath("/dashboard/logs");

    return { success: true };
  } catch (err: any) {
    console.error("reviewEditRequest error:", err);
    return { success: false, error: err.message || "حدث خطأ غير متوقع." };
  }
}

/**
 * Action: Get a single edit request details
 */
export async function getSingleEditRequest(requestId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "غير مصرح بالعملية. الرجاء تسجيل الدخول أولاً." };
    }

    const { data: req, error: reqError } = await supabaseAdmin
      .from("edit_expense_requests")
      .select(`
        *,
        agent:profiles!edit_expense_requests_agent_id_fkey(full_name),
        expense:daily_expenses(*)
      `)
      .eq("id", requestId)
      .single();

    if (reqError || !req) {
      console.error("Error fetching single edit request:", reqError);
      return { success: false, error: "فشل العثور على طلب التعديل." };
    }

    const { data: transfers, error: transfersError } = await supabaseAdmin
      .from("expense_transfers")
      .select(`
        id,
        amount,
        to_agent_id,
        to_agent:profiles!expense_transfers_to_agent_id_fkey(full_name)
      `)
      .eq("expense_id", req.expense_id);

    if (transfersError) {
      console.warn(`Error fetching transfers for expense ${req.expense_id}:`, transfersError);
    }

    const requestData: EditExpenseRequestData = {
      ...req,
      original_transfers: (transfers || []) as any[],
    };

    return {
      success: true,
      request: requestData,
    };
  } catch (err: any) {
    console.error("getSingleEditRequest error:", err);
    return { success: false, error: "حدث خطأ غير متوقع." };
  }
}

/**
 * Action: Get all operations history for administrative and senior agent auditing
 */
export async function getManagementHistory() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "غير مصرح بالعملية. الرجاء تسجيل الدخول أولاً." };
    }

    // 1. Fetch user role to verify allowed roles
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role, id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || (profile.role !== "admin" && profile.role !== "senioragent")) {
      return { success: false, error: "غير مصرح لك بدخول هذه الصفحة." };
    }

    // 2. Fetch Fund Requests (all agents)
    const { data: fundRequests, error: fundError } = await supabaseAdmin
      .from("fund_requests")
      .select(`
        *,
        agent:profiles!fund_requests_agent_id_fkey(id, full_name),
        wallet:wallets(phone_number),
        reviewer:profiles!fund_requests_approved_by_fkey(full_name)
      `)
      .order("created_at", { ascending: false });

    if (fundError) {
      console.error("getManagementHistory fund_requests error:", fundError);
    }

    // 3. Fetch Daily Expenses (all agents)
    const { data: dailyExpenses, error: expenseError } = await supabaseAdmin
      .from("daily_expenses")
      .select(`
        *,
        agent:profiles(id, full_name)
      `)
      .order("expense_date", { ascending: false });

    if (expenseError) {
      console.error("getManagementHistory daily_expenses error:", expenseError);
    }

    // 4. Fetch Edit Requests (all agents)
    const { data: editRequests, error: editError } = await supabaseAdmin
      .from("edit_expense_requests")
      .select(`
        *,
        agent:profiles!edit_expense_requests_agent_id_fkey(id, full_name),
        expense:daily_expenses(id, agent_id, expense_date, personal_expense, marketing_1, marketing_2, marketing_3, total_amount),
        reviewer:profiles!edit_expense_requests_reviewed_by_fkey(full_name)
      `)
      .order("created_at", { ascending: false });

    if (editError) {
      console.error("getManagementHistory edit_expense_requests error:", editError);
    }

    // 5. Fetch active employees (agents and senior agents)
    const { data: employees, error: empError } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, role")
      .in("role", ["agent", "senioragent"])
      .eq("is_active", true)
      .order("full_name", { ascending: true });

    if (empError) {
      console.error("getManagementHistory employees error:", empError);
    }

    return {
      success: true,
      currentUserRole: profile.role,
      currentUserId: profile.id,
      fundRequests: fundRequests || [],
      dailyExpenses: dailyExpenses || [],
      editRequests: editRequests || [],
      employees: employees || [],
    };
  } catch (err: any) {
    console.error("getManagementHistory error:", err);
    return { success: false, error: err.message || "حدث خطأ غير متوقع." };
  }
}

/**
 * Action: Get fund requests for management with filters and pagination
 */
export async function getAdminFundRequestsPaginated(params: {
  page: number;
  limit: number;
  startDate?: string;
  endDate?: string;
  status?: string;
  agentIds?: string[];
  walletPhoneNumbers?: string[];
}) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "غير مصرح بالعملية" };

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "admin" && profile.role !== "senioragent" && profile.role !== "accountant")) {
      return { success: false, error: "غير مصرح بالعملية" };
    }

    let query = supabaseAdmin
      .from("fund_requests")
      .select(`
        *,
        agent:profiles!fund_requests_agent_id_fkey(id, full_name),
        wallet:wallets(phone_number),
        reviewer:profiles!fund_requests_approved_by_fkey(full_name)
      `, { count: "exact" });

    if (params.startDate) {
      query = query.gte("request_date", params.startDate);
    }
    if (params.endDate) {
      query = query.lte("request_date", params.endDate);
    }
    if (params.status && params.status !== "all") {
      query = query.eq("status", params.status);
    }
    if (params.agentIds && params.agentIds.length > 0) {
      query = query.in("agent_id", params.agentIds);
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
    console.error("getAdminFundRequestsPaginated error:", err);
    return { success: false, error: err.message, data: [], totalCount: 0 };
  }
}

/**
 * Action: Get daily expenses for management with filters and pagination
 */
export async function getAdminDailyExpensesPaginated(params: {
  page: number;
  limit: number;
  startDate?: string;
  endDate?: string;
  agentIds?: string[];
}) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "غير مصرح بالعملية" };

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "admin" && profile.role !== "senioragent" && profile.role !== "accountant")) {
      return { success: false, error: "غير مصرح بالعملية" };
    }

    let query = supabaseAdmin
      .from("daily_expenses")
      .select(`
        *,
        agent:profiles(id, full_name)
      `, { count: "exact" });

    if (params.startDate) {
      query = query.gte("expense_date", params.startDate);
    }
    if (params.endDate) {
      query = query.lte("expense_date", params.endDate);
    }
    if (params.agentIds && params.agentIds.length > 0) {
      query = query.in("agent_id", params.agentIds);
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
      agent: exp.agent,
    }));

    return { success: true, data: formattedData, totalCount: count || 0 };
  } catch (err: any) {
    console.error("getAdminDailyExpensesPaginated error:", err);
    return { success: false, error: err.message, data: [], totalCount: 0 };
  }
}

/**
 * Action: Get edit expense requests for management with filters and pagination
 */
export async function getAdminEditRequestsPaginated(params: {
  page: number;
  limit: number;
  startDate?: string;
  endDate?: string;
  status?: string;
  agentIds?: string[];
}) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "غير مصرح بالعملية" };

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "admin" && profile.role !== "senioragent" && profile.role !== "accountant")) {
      return { success: false, error: "غير مصرح بالعملية" };
    }

    let query = supabaseAdmin
      .from("edit_expense_requests")
      .select(`
        *,
        agent:profiles!edit_expense_requests_agent_id_fkey(id, full_name),
        expense:daily_expenses(id, agent_id, expense_date, personal_expense, marketing_1, marketing_2, marketing_3, total_amount),
        reviewer:profiles!edit_expense_requests_reviewed_by_fkey(full_name)
      `, { count: "exact" });

    if (params.startDate) {
      query = query.gte("created_at", params.startDate);
    }
    if (params.endDate) {
      query = query.lte("created_at", params.endDate + "T23:59:59.999Z");
    }
    if (params.status && params.status !== "all") {
      query = query.eq("status", params.status);
    }
    if (params.agentIds && params.agentIds.length > 0) {
      query = query.in("agent_id", params.agentIds);
    }

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range((params.page - 1) * params.limit, params.page * params.limit - 1);

    if (error) throw error;

    return { success: true, data: data || [], totalCount: count || 0 };
  } catch (err: any) {
    console.error("getAdminEditRequestsPaginated error:", err);
    return { success: false, error: err.message, data: [], totalCount: 0 };
  }
}

/**
 * Action: Get all wallets with balances for admin filters
 */
export async function getAdminWalletsWithBalances() {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "غير مصرح بالعملية" };

    const { data: wallets, error: walletsError } = await supabaseAdmin
      .from("wallets")
      .select("*, agent_profile:agent_id(full_name)")
      .eq("is_active", true);

    if (walletsError) throw walletsError;

    return { success: true, wallets: wallets || [] };
  } catch (err: any) {
    console.error("getAdminWalletsWithBalances error:", err);
    return { success: false, error: err.message, wallets: [] };
  }
}

/**
 * Action: Get dynamic custody & wallets report for admins and senior agents
 */
export async function getAgentsCustodyReport(params: {
  agentIds?: string[];
  startDate?: string;
  endDate?: string;
  role?: string;
  walletSearch?: string;
}) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: "غير مصرح بالعملية. الرجاء تسجيل الدخول أولاً.",
        agents: [],
        summary: { totalCurrentCustody: 0, totalApprovedFundsInPeriod: 0, totalExpensesInPeriod: 0, totalWalletsCount: 0, activeWalletsCount: 0 }
      };
    }

    // 1. Verify user profile and role (admin or senioragent)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || (profile.role !== "admin" && profile.role !== "senioragent")) {
      return {
        success: false,
        error: "غير مصرح لك بدخول هذه الصفحة.",
        agents: [],
        summary: { totalCurrentCustody: 0, totalApprovedFundsInPeriod: 0, totalExpensesInPeriod: 0, totalWalletsCount: 0, activeWalletsCount: 0 }
      };
    }

    // 2. Fetch profiles of matched agents/senior agents
    let profilesQuery = supabaseAdmin
      .from("profiles")
      .select("id, full_name, role, is_active")
      .in("role", ["agent", "senioragent"]);

    if (params.role && params.role !== "all") {
      profilesQuery = profilesQuery.eq("role", params.role);
    }
    if (params.agentIds && params.agentIds.length > 0) {
      profilesQuery = profilesQuery.in("id", params.agentIds);
    }

    const { data: profiles, error: profilesErr } = await profilesQuery.order("full_name");
    if (profilesErr) throw profilesErr;

    if (!profiles || profiles.length === 0) {
      return {
        success: true,
        agents: [],
        summary: { totalCurrentCustody: 0, totalApprovedFundsInPeriod: 0, totalExpensesInPeriod: 0, totalWalletsCount: 0, activeWalletsCount: 0 }
      };
    }

    const profileIds = profiles.map((p) => p.id);

    // 3. Fetch wallets
    let walletsQuery = supabaseAdmin
      .from("wallets")
      .select("id, phone_number, start_of_month_balance, agent_id, is_active");
    if (params.walletSearch) {
      walletsQuery = walletsQuery.ilike("phone_number", `%${params.walletSearch}%`);
    }
    const { data: wallets, error: walletsErr } = await walletsQuery.in("agent_id", profileIds);
    if (walletsErr) throw walletsErr;

    const matchedWallets = wallets || [];

    // 4. Fetch all-time fund requests
    const { data: fundRequestsAll, error: fundErr } = await supabaseAdmin
      .from("fund_requests")
      .select("agent_id, wallet_id, status, amount_requested, amount_approved, request_date")
      .in("agent_id", profileIds);
    if (fundErr) throw fundErr;

    const matchedRequests = fundRequestsAll || [];

    // 5. Fetch all-time daily expenses
    const { data: expensesAll, error: expErr } = await supabaseAdmin
      .from("daily_expenses")
      .select("agent_id, total_amount, marketing_1, marketing_2, marketing_3, personal_expense, expense_date")
      .in("agent_id", profileIds);
    if (expErr) throw expErr;

    const matchedExpenses = expensesAll || [];

    // 6. Fetch all-time transfers
    const { data: transfersAll, error: transErr } = await supabaseAdmin
      .from("expense_transfers")
      .select("from_agent_id, to_agent_id, amount");
    if (transErr) throw transErr;

    const matchedTransfers = transfersAll || [];

    // Determine current month bounds for wallet monthly balance calculation
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Riyadh",
      year: "numeric",
      month: "2-digit",
    });
    const parts = formatter.formatToParts(new Date());
    const currYear = parts.find((p) => p.type === "year")?.value;
    const currMonth = parts.find((p) => p.type === "month")?.value;
    const startOfMonth = `${currYear}-${currMonth}-01`;
    const lastDay = new Date(Number(currYear), Number(currMonth), 0).getDate();
    const endOfMonth = `${currYear}-${currMonth}-${String(lastDay).padStart(2, "0")}`;

    // 7. Calculate in-memory summaries per agent
    const agentsList: any[] = [];
    let totalCurrentCustody = 0;
    let totalApprovedFundsInPeriod = 0;
    let totalExpensesInPeriod = 0;
    let totalWalletsCount = 0;
    let activeWalletsCount = 0;

    for (const p of profiles) {
      // Find wallets matching the agent (and optionally matching the phone number search)
      const agentWallets = matchedWallets.filter((w) => w.agent_id === p.id);

      // If search filter is active and agent has no matching wallets, skip agent
      if (params.walletSearch && agentWallets.length === 0) {
        continue;
      }

      // Calculations all-time sums
      const approvedFundsSum = matchedRequests
        .filter((r) => r.agent_id === p.id && r.status === "approved")
        .reduce((sum, r) => sum + (Number(r.amount_approved) || 0), 0);

      const pendingFundsSum = matchedRequests
        .filter((r) => r.agent_id === p.id && r.status === "pending")
        .reduce((sum, r) => sum + (Number(r.amount_requested) || 0), 0);

      const expensesTotalSum = matchedExpenses
        .filter((e) => e.agent_id === p.id)
        .reduce((sum, e) => sum + (Number(e.total_amount) || 0), 0);

      const sentTransfersSum = matchedTransfers
        .filter((t) => t.from_agent_id === p.id)
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      const receivedTransfersSum = matchedTransfers
        .filter((t) => t.to_agent_id === p.id)
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      const custodyCurrent = (approvedFundsSum + receivedTransfersSum) - (expensesTotalSum + sentTransfersSum);

      // Period sums
      const approvedFundsPeriod = matchedRequests
        .filter((r) => r.agent_id === p.id && r.status === "approved" && (!params.startDate || r.request_date >= params.startDate) && (!params.endDate || r.request_date <= params.endDate))
        .reduce((sum, r) => sum + (Number(r.amount_approved) || 0), 0);

      const expensesPeriod = matchedExpenses
        .filter((e) => e.agent_id === p.id && (!params.startDate || e.expense_date >= params.startDate) && (!params.endDate || e.expense_date <= params.endDate))
        .reduce((sum, e) => sum + (Number(e.total_amount) || 0), 0);

      // Map wallets with current calculated monthly balances
      const walletsData = agentWallets.map((w) => {
        const approvedCurrentMonth = matchedRequests
          .filter((r) => r.wallet_id === w.id && r.status === "approved" && r.request_date >= startOfMonth && r.request_date <= endOfMonth)
          .reduce((sum, r) => sum + (Number(r.amount_approved) || 0), 0);

        const approvedFundsPeriodWallet = matchedRequests
          .filter((r) => r.wallet_id === w.id && r.status === "approved" && (!params.startDate || r.request_date >= params.startDate) && (!params.endDate || r.request_date <= params.endDate))
          .reduce((sum, r) => sum + (Number(r.amount_approved) || 0), 0);

        totalWalletsCount++;
        if (w.is_active) activeWalletsCount++;

        return {
          id: w.id,
          phone_number: w.phone_number,
          start_of_month_balance: Number(w.start_of_month_balance) || 0,
          is_active: w.is_active,
          calculatedBalance: (Number(w.start_of_month_balance) || 0) + approvedCurrentMonth,
          approvedFundsInPeriod: approvedFundsPeriodWallet,
        };
      });

      totalCurrentCustody += custodyCurrent;
      totalApprovedFundsInPeriod += approvedFundsPeriod;
      totalExpensesInPeriod += expensesPeriod;

      agentsList.push({
        id: p.id,
        full_name: p.full_name,
        role: p.role,
        is_active: p.is_active,
        wallets: walletsData,
        allTimeApprovedFunds: approvedFundsSum,
        allTimePendingFunds: pendingFundsSum,
        allTimeExpenses: expensesTotalSum,
        allTimeTransfersSent: sentTransfersSum,
        allTimeTransfersReceived: receivedTransfersSum,
        currentCustody: custodyCurrent,
        approvedFundsInPeriod: approvedFundsPeriod,
        expensesInPeriod: expensesPeriod,
      });
    }

    return {
      success: true,
      agents: agentsList,
      summary: {
        totalCurrentCustody,
        totalApprovedFundsInPeriod,
        totalExpensesInPeriod,
        totalWalletsCount,
        activeWalletsCount,
      },
    };
  } catch (err: any) {
    console.error("getAgentsCustodyReport error:", err);
    return {
      success: false,
      error: err.message,
      agents: [],
      summary: { totalCurrentCustody: 0, totalApprovedFundsInPeriod: 0, totalExpensesInPeriod: 0, totalWalletsCount: 0, activeWalletsCount: 0 },
    };
  }
}
