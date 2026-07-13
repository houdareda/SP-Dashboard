"use server";

import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export interface DashboardOverviewData {
  success: boolean;
  error?: string;
  role: string;
  fullName: string;
  metrics: {
    monthlyExpenses: {
      total: number;
      personal: number;
      marketing1: number;
      marketing2: number;
      marketing3: number;
      transfersSent: number;
    };
    custody: {
      total: number; // (approved + received) - (expenses + sent)
      approvedFunds: number;
      receivedCustody: number;
      expensesTotal: number; // personal + marketing
      sentCustody: number;
      pendingFunds: number;
      pendingCount: number;
      totalReceived: number; // approved + received
      totalSpent: number; // expenses + sent
    };
    wallets: {
      totalCash: number;
      activeCount: number;
      list: {
        id: string;
        phone_number: string;
        balance: number;
        agentName?: string;
      }[];
    };
  };
  charts: {
    dailyTrend: { date: string; amount: number }[];
    distribution: {
      category: string;
      name: string;
      amount: number;
      percentage: number;
      color: string;
    }[];
  };
}

/**
 * Generates an array of all date strings (YYYY-MM-DD) between start and end inclusive.
 */
function getDatesInRange(startStr: string, endStr: string) {
  const start = new Date(startStr);
  const end = new Date(endStr);
  const dates: string[] = [];
  const current = new Date(start);
  
  // Set safety check to avoid infinite loops if dates are invalid
  let safety = 0;
  while (current <= end && safety < 366) {
    dates.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
    safety++;
  }
  return dates;
}

export async function getDashboardOverview(params: {
  startDate: string;
  endDate: string;
  filterAgentId?: string;
  filterAgentIds?: string[];
  myOnly?: boolean;
}): Promise<DashboardOverviewData> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: "غير مصرح بالعملية. الرجاء تسجيل الدخول أولاً.",
        role: "agent",
        fullName: "",
        metrics: {
          monthlyExpenses: { total: 0, personal: 0, marketing1: 0, marketing2: 0, marketing3: 0, transfersSent: 0 },
          custody: { total: 0, approvedFunds: 0, receivedCustody: 0, expensesTotal: 0, sentCustody: 0, pendingFunds: 0, pendingCount: 0, totalReceived: 0, totalSpent: 0 },
          wallets: { totalCash: 0, activeCount: 0, list: [] },
        },
        charts: { dailyTrend: [], distribution: [] },
      };
    }

    // 1. Fetch current profile role
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .single();

    if (profileErr || !profile) {
      return {
        success: false,
        error: "فشل جلب الملف الشخصي للمستخدم.",
        role: "agent",
        fullName: "",
        metrics: {
          monthlyExpenses: { total: 0, personal: 0, marketing1: 0, marketing2: 0, marketing3: 0, transfersSent: 0 },
          custody: { total: 0, approvedFunds: 0, receivedCustody: 0, expensesTotal: 0, sentCustody: 0, pendingFunds: 0, pendingCount: 0, totalReceived: 0, totalSpent: 0 },
          wallets: { totalCash: 0, activeCount: 0, list: [] },
        },
        charts: { dailyTrend: [], distribution: [] },
      };
    }

    const { role, full_name: fullName } = profile;

    // Determine targeted agent IDs based on role & filters
    let targetAgentIds: string[] = [];

    if (role === "agent") {
      targetAgentIds = [user.id];
    } else if (role === "senioragent" && params.myOnly) {
      targetAgentIds = [user.id];
    } else {
      // Admin or Senior Agent looking at dynamic selections
      if (params.filterAgentIds && params.filterAgentIds.length > 0) {
        targetAgentIds = params.filterAgentIds;
      } else if (params.filterAgentId && params.filterAgentId !== "all") {
        targetAgentIds = [params.filterAgentId];
      } else {
        // Fetch all agents & senior agents
        const { data: allAgents } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .in("role", ["agent", "senioragent"])
          .eq("is_active", true);

        targetAgentIds = (allAgents || []).map((a) => a.id);
      }
    }

    if (targetAgentIds.length === 0) {
      // Add user ID as fallback if database profiles are empty
      targetAgentIds = [user.id];
    }

    // Determine dates in Egypt timezone (Africa/Cairo)
    const egyptDateParts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Cairo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date()).split("-");

    const currentMonthStart = `${egyptDateParts[0]}-${egyptDateParts[1]}-01`;
    const currentMonthEnd = `${egyptDateParts[0]}-${egyptDateParts[1]}-${egyptDateParts[2]}`;

    const startDate = params.startDate || currentMonthStart;
    const endDate = params.endDate || currentMonthEnd;

    // --- QUERY 1: Fetch Daily Expenses in current month (for Monthly Expenses card & charts) ---
    const { data: expensesCurrentMonth, error: expError } = await supabaseAdmin
      .from("daily_expenses")
      .select("id, total_amount, marketing_1, marketing_2, marketing_3, personal_expense, expense_date, agent_id")
      .in("agent_id", targetAgentIds)
      .gte("expense_date", currentMonthStart)
      .lte("expense_date", currentMonthEnd);

    if (expError) {
      console.error("Dashboard overview daily_expenses query error:", expError);
    }

    // --- QUERY 2: Fetch current month Transfers Sent (for Monthly Expenses card) ---
    const currentMonthExpenseIds = (expensesCurrentMonth || []).map((e) => e.id);
    let sentTransfersCurrentMonth: any[] = [];
    if (currentMonthExpenseIds.length > 0) {
      const { data: transfers } = await supabaseAdmin
        .from("expense_transfers")
        .select("amount, from_agent_id, to_agent_id, expense_id")
        .in("expense_id", currentMonthExpenseIds);

      if (transfers) {
        sentTransfersCurrentMonth = transfers.filter(
          (t) => targetAgentIds.includes(t.from_agent_id)
        );
      }
    }

    // --- QUERY 3: Fetch all-time Daily Expenses (for Custody total) ---
    const { data: expensesAllTime } = await supabaseAdmin
      .from("daily_expenses")
      .select("id, personal_expense, marketing_1, marketing_2, marketing_3")
      .in("agent_id", targetAgentIds);

    const personalAllTime = (expensesAllTime || []).reduce((sum, e) => sum + (Number(e.personal_expense) || 0), 0);
    const marketing1AllTime = (expensesAllTime || []).reduce((sum, e) => sum + (Number(e.marketing_1) || 0), 0);
    const marketing2AllTime = (expensesAllTime || []).reduce((sum, e) => sum + (Number(e.marketing_2) || 0), 0);
    const marketing3AllTime = (expensesAllTime || []).reduce((sum, e) => sum + (Number(e.marketing_3) || 0), 0);
    const expensesTotalSum = personalAllTime + marketing1AllTime + marketing2AllTime + marketing3AllTime;

    // --- QUERY 4: Fetch all-time Transfers Sent & Received (for Custody total) ---
    const { data: transfersAllTime } = await supabaseAdmin
      .from("expense_transfers")
      .select("amount, from_agent_id, to_agent_id");

    let sentCustodySum = 0;
    let receivedCustodySum = 0;

    if (transfersAllTime) {
      transfersAllTime.forEach((t) => {
        if (targetAgentIds.includes(t.from_agent_id)) {
          sentCustodySum += Number(t.amount) || 0;
        }
        if (targetAgentIds.includes(t.to_agent_id)) {
          receivedCustodySum += Number(t.amount) || 0;
        }
      });
    }

    // --- QUERY 5: Fetch all-time Fund Requests (for Custody total) ---
    const { data: fundRequestsAllTime } = await supabaseAdmin
      .from("fund_requests")
      .select("status, amount_requested, amount_approved")
      .in("agent_id", targetAgentIds);

    const approvedFundsSum = (fundRequestsAllTime || [])
      .filter((req) => req.status === "approved")
      .reduce((sum, req) => sum + (Number(req.amount_approved) || 0), 0);

    const pendingFundsSum = (fundRequestsAllTime || [])
      .filter((req) => req.status === "pending")
      .reduce((sum, req) => sum + (Number(req.amount_requested) || 0), 0);

    // --- QUERY 6: Fetch active wallets of targeted agent(s) ---
    let walletsQuery = supabaseAdmin
      .from("wallets")
      .select(`
        id,
        phone_number,
        start_of_month_balance,
        agent_id,
        is_active,
        agent_profile:agent_id(full_name)
      `)
      .eq("is_active", true);

    if (role === "agent" || (role === "senioragent" && params.myOnly) || (params.filterAgentId && params.filterAgentId !== "all")) {
      walletsQuery = walletsQuery.in("agent_id", targetAgentIds);
    }

    const { data: wallets } = await walletsQuery;

    // Calculate current month's bounds to query wallet calculated balances
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Riyadh",
      year: "numeric",
      month: "2-digit",
    });
    const parts = formatter.formatToParts(new Date());
    const currYear = parts.find((p) => p.type === "year")?.value;
    const currMonth = parts.find((p) => p.type === "month")?.value;

    let walletCalculatedList: any[] = [];
    let totalCashInWallets = 0;

    if (wallets && wallets.length > 0 && currYear && currMonth) {
      const startOfMonth = `${currYear}-${currMonth}-01`;
      const lastDay = new Date(Number(currYear), Number(currMonth), 0).getDate();
      const endOfMonth = `${currYear}-${currMonth}-${String(lastDay).padStart(2, "0")}`;

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
        const currentBalance = starting + approvedSum;
        totalCashInWallets += currentBalance;

        return {
          id: w.id,
          phone_number: w.phone_number,
          balance: currentBalance,
          agentName: (w.agent_profile as any)?.full_name || undefined,
        };
      });
    }

    // --- CALCULATE CARD METRICS (Current Month) ---
    const personalSum = (expensesCurrentMonth || []).reduce((sum, e) => sum + (Number(e.personal_expense) || 0), 0);
    const marketing1Sum = (expensesCurrentMonth || []).reduce((sum, e) => sum + (Number(e.marketing_1) || 0), 0);
    const marketing2Sum = (expensesCurrentMonth || []).reduce((sum, e) => sum + (Number(e.marketing_2) || 0), 0);
    const marketing3Sum = (expensesCurrentMonth || []).reduce((sum, e) => sum + (Number(e.marketing_3) || 0), 0);
    const transfersSentSum = sentTransfersCurrentMonth.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const monthlyExpensesTotal = personalSum + marketing1Sum + marketing2Sum + marketing3Sum + transfersSentSum;

    // --- CALCULATE CUSTODY METRICS (All-Time) ---
    const custodyTotalReceived = approvedFundsSum + receivedCustodySum;
    const custodyTotalSpent = expensesTotalSum + sentCustodySum;
    const custodyCurrentTotal = custodyTotalReceived - custodyTotalSpent;

    // --- CHARTS FORMATTING ---

    // 1. Daily trend Line chart series
    const dateRangeList = getDatesInRange(startDate, endDate);
    const dailyTrendMap: Record<string, number> = {};
    
    // Initialize map with zeroes
    dateRangeList.forEach((d) => {
      dailyTrendMap[d] = 0;
    });

    // Accumulate total daily expense per date
    (expensesCurrentMonth || []).forEach((e) => {
      const dateVal = e.expense_date;
      if (dailyTrendMap[dateVal] !== undefined) {
        dailyTrendMap[dateVal] += Number(e.total_amount) || 0;
      }
    });

    const dailyTrendSeries = dateRangeList.map((d) => {
      // Format X-axis day index (e.g. "06-12" or "12")
      const dayLabel = d.slice(8, 10);
      return {
        date: dayLabel,
        amount: dailyTrendMap[d],
      };
    });

    // 2. Distribution chart series
    const totalDistributionSum = monthlyExpensesTotal || 1; // avoid divide by zero
    const categoriesBreakdown = [
      { category: "personal", name: "مصروف شخصي", amount: personalSum, color: "#3b82f6" },
      { category: "marketing_1", name: "سيستم 1 التسويق", amount: marketing1Sum, color: "#a855f7" },
      { category: "marketing_2", name: "سيستم 2 التسويق", amount: marketing2Sum, color: "#10b981" },
      { category: "marketing_3", name: "سيستم 3 التسويق", amount: marketing3Sum, color: "#ec4899" },
      { category: "transfers_sent", name: "تحويل عهدة لزميل", amount: transfersSentSum, color: "#f43f5e" },
    ];

    const distributionSeries = categoriesBreakdown.map((c) => ({
      ...c,
      percentage: Math.round((c.amount / totalDistributionSum) * 1000) / 10,
    }));

    return {
      success: true,
      role,
      fullName,
      metrics: {
        monthlyExpenses: {
          total: monthlyExpensesTotal,
          personal: personalSum,
          marketing1: marketing1Sum,
          marketing2: marketing2Sum,
          marketing3: marketing3Sum,
          transfersSent: transfersSentSum,
        },
        custody: {
          total: custodyCurrentTotal,
          approvedFunds: approvedFundsSum,
          receivedCustody: receivedCustodySum,
          expensesTotal: expensesTotalSum,
          sentCustody: sentCustodySum,
          pendingFunds: pendingFundsSum,
          pendingCount: (fundRequestsAllTime || []).filter((req) => req.status === "pending").length,
          totalReceived: custodyTotalReceived,
          totalSpent: custodyTotalSpent,
        },
        wallets: {
          totalCash: totalCashInWallets,
          activeCount: walletCalculatedList.length,
          list: walletCalculatedList,
        },
      },
      charts: {
        dailyTrend: dailyTrendSeries,
        distribution: distributionSeries,
      },
    };
  } catch (err: any) {
    console.error("getDashboardOverview error:", err);
    return {
      success: false,
      error: err.message || "حدث خطأ غير متوقع.",
      role: "agent",
      fullName: "",
      metrics: {
        monthlyExpenses: { total: 0, personal: 0, marketing1: 0, marketing2: 0, marketing3: 0, transfersSent: 0 },
        custody: { total: 0, approvedFunds: 0, receivedCustody: 0, expensesTotal: 0, sentCustody: 0, pendingFunds: 0, pendingCount: 0, totalReceived: 0, totalSpent: 0 },
        wallets: { totalCash: 0, activeCount: 0, list: [] },
      },
      charts: { dailyTrend: [], distribution: [] },
    };
  }
}
