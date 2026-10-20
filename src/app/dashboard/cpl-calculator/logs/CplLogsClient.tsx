"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Coins,
  ClipboardList,
  FileEdit,
  Calendar,
  Wallet,
  Loader2,
  ArrowRightLeft,
  Calculator,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  RotateCcw,
  User,
} from "lucide-react";
import {
  getCplAgentFundRequestsPaginated,
  getCplAgentDailyExpensesPaginated,
  getCplAgentEditRequestsPaginated,
  getCplAgentCustodyTransfersPaginated,
} from "@/app/actions/cplOperations";

interface CplLogsClientProps {
  userRole?: string;
  agents?: { id: string; full_name: string }[];
  initialFundRequests: any[];
  initialFundCount: number;
  initialDailyExpenses: any[];
  initialExpenseCount: number;
  initialEditRequests: any[];
  initialEditCount: number;
  initialCustodyTransfers?: any[];
  initialTransferCount?: number;
}

type TabType = "daily-expenses" | "fund-requests" | "edit-requests" | "custody-transfers";

export default function CplLogsClient({
  userRole = "agent",
  agents = [],
  initialFundRequests = [],
  initialFundCount = 0,
  initialDailyExpenses = [],
  initialExpenseCount = 0,
  initialEditRequests = [],
  initialEditCount = 0,
  initialCustodyTransfers = [],
  initialTransferCount = 0,
}: CplLogsClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("daily-expenses");

  const isLeaderOrAdmin = userRole === "admin" || userRole === "senioragent";

  // Filter States
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedAgentId, setSelectedAgentId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [transferTypeFilter, setTransferTypeFilter] = useState<"all" | "sent" | "received">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Data & Pagination States
  const [fundRequests, setFundRequests] = useState<any[]>(initialFundRequests);
  const [fundCount, setFundCount] = useState<number>(initialFundCount);
  const [fundPage, setFundPage] = useState<number>(1);

  const [dailyExpenses, setDailyExpenses] = useState<any[]>(initialDailyExpenses);
  const [expenseCount, setExpenseCount] = useState<number>(initialExpenseCount);
  const [expensePage, setExpensePage] = useState<number>(1);

  const [editRequests, setEditRequests] = useState<any[]>(initialEditRequests);
  const [editCount, setEditCount] = useState<number>(initialEditCount);
  const [editPage, setEditPage] = useState<number>(1);

  const [custodyTransfers, setCustodyTransfers] = useState<any[]>(initialCustodyTransfers);
  const [transferCount, setTransferCount] = useState<number>(initialTransferCount);
  const [transferPage, setTransferPage] = useState<number>(1);

  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Timezone helper
  const getLocalDateString = (offsetDays = 0) => {
    const date = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Riyadh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(date);
  };

  const todayStr = getLocalDateString(0);
  const yesterdayStr = getLocalDateString(-1);
  const sevenDaysAgoStr = getLocalDateString(-7);
  const thirtyDaysAgoStr = getLocalDateString(-30);

  // Fetch logic with active filters
  const loadActiveTabData = async (
    targetTab: TabType,
    page = 1,
    sDate = startDate,
    eDate = endDate,
    agentId = selectedAgentId,
    status = statusFilter,
    tType = transferTypeFilter
  ) => {
    setIsLoading(true);
    if (targetTab === "daily-expenses") {
      const res = await getCplAgentDailyExpensesPaginated({
        page,
        limit: 20,
        startDate: sDate || undefined,
        endDate: eDate || undefined,
        agentId: agentId !== "all" ? agentId : undefined,
      });
      if (res.success && res.data) {
        setDailyExpenses(res.data);
        setExpenseCount(res.totalCount || 0);
        setExpensePage(page);
      }
    } else if (targetTab === "fund-requests") {
      const res = await getCplAgentFundRequestsPaginated({
        page,
        limit: 20,
        status,
        startDate: sDate || undefined,
        endDate: eDate || undefined,
        agentId: agentId !== "all" ? agentId : undefined,
      });
      if (res.success && res.data) {
        setFundRequests(res.data);
        setFundCount(res.totalCount || 0);
        setFundPage(page);
      }
    } else if (targetTab === "edit-requests") {
      const res = await getCplAgentEditRequestsPaginated({
        page,
        limit: 20,
        status,
        startDate: sDate || undefined,
        endDate: eDate || undefined,
        agentId: agentId !== "all" ? agentId : undefined,
      });
      if (res.success && res.data) {
        setEditRequests(res.data);
        setEditCount(res.totalCount || 0);
        setEditPage(page);
      }
    } else if (targetTab === "custody-transfers") {
      const res = await getCplAgentCustodyTransfersPaginated({
        page,
        limit: 20,
        transferType: tType,
        startDate: sDate || undefined,
        endDate: eDate || undefined,
        agentId: agentId !== "all" ? agentId : undefined,
      });
      if (res.success && res.data) {
        setCustodyTransfers(res.data);
        setTransferCount(res.totalCount || 0);
        setTransferPage(page);
      }
    }
    setIsLoading(false);
  };

  // Trigger refetch on tab, date range, selected agent, or select filters change
  useEffect(() => {
    loadActiveTabData(activeTab, 1, startDate, endDate, selectedAgentId, statusFilter, transferTypeFilter);
  }, [activeTab, startDate, endDate, selectedAgentId, statusFilter, transferTypeFilter]);

  const handleResetFilters = () => {
    setStartDate("");
    setEndDate("");
    setSelectedAgentId("all");
    setStatusFilter("all");
    setTransferTypeFilter("all");
    setSearchQuery("");
  };

  // Quick Preset Actions
  const applyPreset = (preset: "today" | "yesterday" | "7days" | "30days") => {
    if (preset === "today") {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === "yesterday") {
      setStartDate(yesterdayStr);
      setEndDate(yesterdayStr);
    } else if (preset === "7days") {
      setStartDate(sevenDaysAgoStr);
      setEndDate(todayStr);
    } else if (preset === "30days") {
      setStartDate(thirtyDaysAgoStr);
      setEndDate(todayStr);
    }
  };

  // Client-side Search Filtering over current page rows
  const filteredDailyExpenses = useMemo(() => {
    if (!searchQuery.trim()) return dailyExpenses;
    const q = searchQuery.toLowerCase().trim();
    return dailyExpenses.filter((exp) => {
      const dateStr = exp.expense_date || "";
      const agentName = exp.agent?.full_name || "";
      const totalStr = String(exp.total_amount || "");
      const m1Str = String(exp.marketing_1 || "");
      const m2Str = String(exp.marketing_2 || "");
      const m3Str = String(exp.marketing_3 || "");
      const persStr = String(exp.personal_expense || "");
      return (
        dateStr.includes(q) ||
        agentName.toLowerCase().includes(q) ||
        totalStr.includes(q) ||
        m1Str.includes(q) ||
        m2Str.includes(q) ||
        m3Str.includes(q) ||
        persStr.includes(q)
      );
    });
  }, [dailyExpenses, searchQuery]);

  const filteredFundRequests = useMemo(() => {
    if (!searchQuery.trim()) return fundRequests;
    const q = searchQuery.toLowerCase().trim();
    return fundRequests.filter((req) => {
      const dateStr = req.request_date || "";
      const agentName = req.agent?.full_name || "";
      const walletPhone = req.wallet?.phone_number || "";
      const amountStr = String(req.amount_requested || "");
      const statusStr = req.status || "";
      return (
        dateStr.includes(q) ||
        agentName.toLowerCase().includes(q) ||
        walletPhone.toLowerCase().includes(q) ||
        amountStr.includes(q) ||
        statusStr.includes(q)
      );
    });
  }, [fundRequests, searchQuery]);

  const filteredEditRequests = useMemo(() => {
    if (!searchQuery.trim()) return editRequests;
    const q = searchQuery.toLowerCase().trim();
    return editRequests.filter((req) => {
      const dateStr = req.expense_date || "";
      const agentName = req.agent?.full_name || "";
      const oldAmount = String(req.old_total_amount || "");
      const newAmount = String(req.new_total_amount || "");
      const reason = req.reason || "";
      return (
        dateStr.includes(q) ||
        agentName.toLowerCase().includes(q) ||
        oldAmount.includes(q) ||
        newAmount.includes(q) ||
        reason.toLowerCase().includes(q)
      );
    });
  }, [editRequests, searchQuery]);

  const filteredCustodyTransfers = useMemo(() => {
    if (!searchQuery.trim()) return custodyTransfers;
    const q = searchQuery.toLowerCase().trim();
    return custodyTransfers.filter((tr) => {
      const dateStr = tr.created_at || "";
      const fromName = tr.fromAgent?.full_name || "";
      const toName = tr.toAgent?.full_name || "";
      const amountStr = String(tr.amount || "");
      return (
        dateStr.includes(q) ||
        fromName.toLowerCase().includes(q) ||
        toName.toLowerCase().includes(q) ||
        amountStr.includes(q)
      );
    });
  }, [custodyTransfers, searchQuery]);

  // KPI calculations for metrics bar
  const metrics = useMemo(() => {
    if (activeTab === "daily-expenses") {
      const total = filteredDailyExpenses.reduce((sum, exp) => sum + (Number(exp.total_amount) || 0), 0);
      const m1 = filteredDailyExpenses.reduce((sum, exp) => sum + (Number(exp.marketing_1) || 0), 0);
      const m2 = filteredDailyExpenses.reduce((sum, exp) => sum + (Number(exp.marketing_2) || 0), 0);
      const m3 = filteredDailyExpenses.reduce((sum, exp) => sum + (Number(exp.marketing_3) || 0), 0);
      const pers = filteredDailyExpenses.reduce((sum, exp) => sum + (Number(exp.personal_expense) || 0), 0);
      return { total, m1, m2, m3, pers, count: filteredDailyExpenses.length };
    }
    if (activeTab === "fund-requests") {
      const total = filteredFundRequests.reduce((sum, req) => sum + (Number(req.amount_requested) || 0), 0);
      const pending = filteredFundRequests.filter((r) => r.status === "pending").length;
      const approved = filteredFundRequests.filter((r) => r.status === "approved").length;
      return { total, pending, approved, count: filteredFundRequests.length };
    }
    if (activeTab === "custody-transfers") {
      const total = filteredCustodyTransfers.reduce((sum, tr) => sum + (Number(tr.amount) || 0), 0);
      return { total, count: filteredCustodyTransfers.length };
    }
    return { count: filteredEditRequests.length };
  }, [
    activeTab,
    filteredDailyExpenses,
    filteredFundRequests,
    filteredCustodyTransfers,
    filteredEditRequests,
  ]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5 w-fit">
            <CheckCircle2 size={13} />
            <span>مقبول</span>
          </span>
        );
      case "rejected":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center gap-1.5 w-fit">
            <XCircle size={13} />
            <span>مرفوض</span>
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center gap-1.5 w-fit">
            <Clock size={13} />
            <span>قيد الانتظار</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 font-cairo" dir="rtl">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0f172a] via-[#1e1b4b] to-[#0f172a] p-6 border border-brand-accent/30 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-brand-accent/20 border border-brand-accent/40 flex items-center justify-center text-brand-accent shadow-lg shrink-0">
              <Calculator size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-brand-accent/20 text-brand-accent border border-brand-accent/30">
                  سجل الأداة المنفصل
                </span>
                {isLeaderOrAdmin && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    عرض كافة الموظفين
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-black text-white mt-1">سجل أداة حساب المصاريف والـ CPL</h1>
              <p className="text-xs text-white/60 mt-0.5">
                {isLeaderOrAdmin
                  ? "إمكانية استعراض وفلترة كافة مصاريف ومعاملات جميع الموظفين المسجلة بأداة CPL."
                  : "عرض وفلترة كافة المعاملات والمصاريف الخاصة بك المسجلة داخل أداة الـ CPL."}
              </p>
            </div>
          </div>

          {userRole !== "admin" && (
            <button
              type="button"
              onClick={() => router.push("/dashboard/cpl-calculator")}
              className="px-4 py-2.5 rounded-xl bg-brand-accent hover:bg-brand-accent/90 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-brand-accent/20 self-end md:self-center"
            >
              <span>العودة للأداة</span>
            </button>
          )}
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2 mt-6 pt-5 border-t border-white/10 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab("daily-expenses")}
            className={`px-5 py-3 rounded-2xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === "daily-expenses"
                ? "bg-brand-accent text-white shadow-lg shadow-brand-accent/30"
                : "bg-white/5 hover:bg-white/10 text-white/70 border border-white/10"
            }`}
          >
            <ClipboardList size={16} />
            <span>المصاريف اليومية ({expenseCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("fund-requests")}
            className={`px-5 py-3 rounded-2xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === "fund-requests"
                ? "bg-brand-accent text-white shadow-lg shadow-brand-accent/30"
                : "bg-white/5 hover:bg-white/10 text-white/70 border border-white/10"
            }`}
          >
            <Coins size={16} />
            <span>طلبات التمويل ({fundCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("edit-requests")}
            className={`px-5 py-3 rounded-2xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === "edit-requests"
                ? "bg-brand-accent text-white shadow-lg shadow-brand-accent/30"
                : "bg-white/5 hover:bg-white/10 text-white/70 border border-white/10"
            }`}
          >
            <FileEdit size={16} />
            <span>طلبات التعديل ({editCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("custody-transfers")}
            className={`px-5 py-3 rounded-2xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === "custody-transfers"
                ? "bg-brand-accent text-white shadow-lg shadow-brand-accent/30"
                : "bg-white/5 hover:bg-white/10 text-white/70 border border-white/10"
            }`}
          >
            <ArrowRightLeft size={16} />
            <span>تحويلات العهد ({transferCount})</span>
          </button>
        </div>
      </div>

      {/* FILTER CONTROL PANEL */}
      <div className="bg-brand-card/90 backdrop-blur-xl border border-brand-border/60 rounded-3xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-brand-border/30 pb-3">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Filter size={16} className="text-brand-accent" />
            <span>فلاتر البحث المتقدمة</span>
          </div>
          {(startDate || endDate || selectedAgentId !== "all" || statusFilter !== "all" || transferTypeFilter !== "all" || searchQuery) && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <RotateCcw size={13} />
              <span>إعادة ضبط الفلاتر</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          {/* Employee Filter (For Leaders & Admins) */}
          {isLeaderOrAdmin && (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-brand-dim">فلترة حسب الموظف</label>
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="w-full bg-[#070814] border border-brand-border/80 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-accent cursor-pointer font-bold"
              >
                <option value="all">جميع الموظفين</option>
                {agents.map((ag) => (
                  <option key={ag.id} value={ag.id}>
                    {ag.full_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 1. Date Range: Start */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-brand-dim">من تاريخ</label>
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-[#070814] border border-brand-border/80 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-accent font-inter cursor-pointer text-left dir-ltr"
              />
              <Calendar size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
            </div>
          </div>

          {/* 2. Date Range: End */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-brand-dim">إلى تاريخ</label>
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-[#070814] border border-brand-border/80 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-accent font-inter cursor-pointer text-left dir-ltr"
              />
              <Calendar size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
            </div>
          </div>

          {/* 3. Conditional Filter Select */}
          {(activeTab === "fund-requests" || activeTab === "edit-requests") && (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-brand-dim">حالة الطلب</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-[#070814] border border-brand-border/80 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-accent cursor-pointer font-bold"
              >
                <option value="all">جميع الحالات</option>
                <option value="pending">قيد الانتظار</option>
                <option value="approved">مقبول</option>
                <option value="rejected">مرفوض</option>
              </select>
            </div>
          )}

          {activeTab === "custody-transfers" && (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-brand-dim">نوع التحويل</label>
              <select
                value={transferTypeFilter}
                onChange={(e) => setTransferTypeFilter(e.target.value as any)}
                className="w-full bg-[#070814] border border-brand-border/80 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-accent cursor-pointer font-bold"
              >
                <option value="all">جميع التحويلات</option>
                <option value="sent">المرسلة فقط</option>
                <option value="received">المستلمة فقط</option>
              </select>
            </div>
          )}

          {/* 4. Live Search Box */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-brand-dim">بحث سريع</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث بالمبلغ، الموظف، التاريخ..."
                className="w-full bg-[#070814] border border-brand-border/80 rounded-xl pr-9 pl-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-brand-accent font-bold"
              />
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Date Presets Quick Buttons */}
        <div className="flex items-center gap-2 pt-2 border-t border-brand-border/20 flex-wrap">
          <span className="text-[11px] font-bold text-brand-dim/70 ml-2">اختيار سريع:</span>
          <button
            type="button"
            onClick={() => applyPreset("today")}
            className="px-3 py-1 rounded-lg bg-white/5 hover:bg-brand-accent/20 border border-white/10 text-[11px] font-bold text-white transition-all cursor-pointer"
          >
            اليوم
          </button>
          <button
            type="button"
            onClick={() => applyPreset("yesterday")}
            className="px-3 py-1 rounded-lg bg-white/5 hover:bg-brand-accent/20 border border-white/10 text-[11px] font-bold text-white transition-all cursor-pointer"
          >
            أمس
          </button>
          <button
            type="button"
            onClick={() => applyPreset("7days")}
            className="px-3 py-1 rounded-lg bg-white/5 hover:bg-brand-accent/20 border border-white/10 text-[11px] font-bold text-white transition-all cursor-pointer"
          >
            آخر 7 أيام
          </button>
          <button
            type="button"
            onClick={() => applyPreset("30days")}
            className="px-3 py-1 rounded-lg bg-white/5 hover:bg-brand-accent/20 border border-white/10 text-[11px] font-bold text-white transition-all cursor-pointer"
          >
            آخر 30 يوم
          </button>
        </div>
      </div>

      {/* DYNAMIC METRICS SUMMARY BAR */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {activeTab === "daily-expenses" && (
          <>
            <div className="bg-brand-card/80 border border-brand-border/40 p-4 rounded-2xl">
              <span className="text-xs text-brand-dim block font-bold">إجمالي المصاريف المفلترة</span>
              <span className="text-lg font-black text-brand-accent font-inter mt-1 block">
                {metrics.total?.toLocaleString("en-US")}
              </span>
            </div>
            <div className="bg-brand-card/80 border border-brand-border/40 p-4 rounded-2xl">
              <span className="text-xs text-brand-dim block font-bold">إجمالي تسويق (1+2+3)</span>
              <span className="text-lg font-black text-emerald-400 font-inter mt-1 block">
                {((metrics.m1 || 0) + (metrics.m2 || 0) + (metrics.m3 || 0)).toLocaleString("en-US")}
              </span>
            </div>
            <div className="bg-brand-card/80 border border-brand-border/40 p-4 rounded-2xl">
              <span className="text-xs text-brand-dim block font-bold">إجمالي المصروف الشخصي</span>
              <span className="text-lg font-black text-amber-400 font-inter mt-1 block">
                {metrics.pers?.toLocaleString("en-US")}
              </span>
            </div>
            <div className="bg-brand-card/80 border border-brand-border/40 p-4 rounded-2xl">
              <span className="text-xs text-brand-dim block font-bold">عدد السجلات المعروضة</span>
              <span className="text-lg font-black text-white font-inter mt-1 block">
                {metrics.count} سجلات
              </span>
            </div>
          </>
        )}

        {activeTab === "fund-requests" && (
          <>
            <div className="bg-brand-card/80 border border-brand-border/40 p-4 rounded-2xl">
              <span className="text-xs text-brand-dim block font-bold">إجمالي المبالغ المطلوبة</span>
              <span className="text-lg font-black text-emerald-400 font-inter mt-1 block">
                {metrics.total?.toLocaleString("en-US")}
              </span>
            </div>
            <div className="bg-brand-card/80 border border-brand-border/40 p-4 rounded-2xl">
              <span className="text-xs text-brand-dim block font-bold">طلبات قيد الانتظار</span>
              <span className="text-lg font-black text-amber-400 font-inter mt-1 block">
                {metrics.pending} طلبات
              </span>
            </div>
            <div className="bg-brand-card/80 border border-brand-border/40 p-4 rounded-2xl">
              <span className="text-xs text-brand-dim block font-bold">طلبات مقبولة</span>
              <span className="text-lg font-black text-emerald-400 font-inter mt-1 block">
                {metrics.approved} طلبات
              </span>
            </div>
            <div className="bg-brand-card/80 border border-brand-border/40 p-4 rounded-2xl">
              <span className="text-xs text-brand-dim block font-bold">عدد الطلبات المعروضة</span>
              <span className="text-lg font-black text-white font-inter mt-1 block">
                {metrics.count} طلبات
              </span>
            </div>
          </>
        )}

        {activeTab === "custody-transfers" && (
          <>
            <div className="bg-brand-card/80 border border-brand-border/40 p-4 rounded-2xl md:col-span-2">
              <span className="text-xs text-brand-dim block font-bold">إجمالي مبالغ التحويلات المفلترة</span>
              <span className="text-xl font-black text-emerald-400 font-inter mt-1 block">
                {metrics.total?.toLocaleString("en-US")}
              </span>
            </div>
            <div className="bg-brand-card/80 border border-brand-border/40 p-4 rounded-2xl md:col-span-2">
              <span className="text-xs text-brand-dim block font-bold">عدد التحويلات المعروضة</span>
              <span className="text-xl font-black text-white font-inter mt-1 block">
                {metrics.count} تحويلات
              </span>
            </div>
          </>
        )}

        {activeTab === "edit-requests" && (
          <div className="bg-brand-card/80 border border-brand-border/40 p-4 rounded-2xl md:col-span-4">
            <span className="text-xs text-brand-dim block font-bold">إجمالي طلبات التعديل المعروضة</span>
            <span className="text-xl font-black text-brand-accent font-inter mt-1 block">
              {metrics.count} طلبات تعديل
            </span>
          </div>
        )}
      </div>

      {/* Content Table Area */}
      <div className="bg-brand-card/70 backdrop-blur-xl border border-brand-border/40 rounded-3xl p-6 shadow-xl">
        {isLoading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center text-white/50 space-y-3">
            <Loader2 size={32} className="animate-spin text-brand-accent" />
            <span className="text-xs font-bold">جاري تحميل وتطبيق الفلاتر...</span>
          </div>
        ) : (
          <>
            {/* TAB 1: DAILY EXPENSES TABLE */}
            {activeTab === "daily-expenses" && (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead>
                    <tr className="border-b border-brand-border/40 text-xs text-white/50 uppercase">
                      {isLeaderOrAdmin && <th className="py-3 px-4">الموظف</th>}
                      <th className="py-3 px-4">تاريخ التقرير</th>
                      <th className="py-3 px-4">تسويق 1</th>
                      <th className="py-3 px-4">تسويق 2 (تلقائي)</th>
                      <th className="py-3 px-4">تسويق 3</th>
                      <th className="py-3 px-4">مصروف شخصي</th>
                      <th className="py-3 px-4">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border/20">
                    {filteredDailyExpenses.length === 0 ? (
                      <tr>
                        <td colSpan={isLeaderOrAdmin ? 7 : 6} className="py-12 text-center text-white/40 text-xs">
                          لا توجد مصاريف يومية مطابقة للفلاتر المحددة.
                        </td>
                      </tr>
                    ) : (
                      filteredDailyExpenses.map((exp) => (
                        <tr key={exp.id} className="hover:bg-white/5 transition-all text-white">
                          {isLeaderOrAdmin && (
                            <td className="py-3.5 px-4 text-xs font-bold text-brand-accent">
                              {exp.agent?.full_name || "مستخدم"}
                            </td>
                          )}
                          <td className="py-3.5 px-4 font-inter text-xs font-bold">{exp.expense_date}</td>
                          <td className="py-3.5 px-4 font-inter">{Number(exp.marketing_1 || 0).toLocaleString("en-US")}</td>
                          <td className="py-3.5 px-4 font-inter text-brand-accent font-bold">{Number(exp.marketing_2 || 0).toLocaleString("en-US")}</td>
                          <td className="py-3.5 px-4 font-inter">{Number(exp.marketing_3 || 0).toLocaleString("en-US")}</td>
                          <td className="py-3.5 px-4 font-inter text-amber-400">{Number(exp.personal_expense || 0).toLocaleString("en-US")}</td>
                          <td className="py-3.5 px-4 font-inter font-black text-emerald-400">
                            {Number(exp.total_amount || 0).toLocaleString("en-US")}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 2: FUND REQUESTS TABLE */}
            {activeTab === "fund-requests" && (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead>
                    <tr className="border-b border-brand-border/40 text-xs text-white/50 uppercase">
                      {isLeaderOrAdmin && <th className="py-3 px-4">الموظف</th>}
                      <th className="py-3 px-4">تاريخ الطلب</th>
                      <th className="py-3 px-4">المحفظة</th>
                      <th className="py-3 px-4">المبلغ</th>
                      <th className="py-3 px-4">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border/20">
                    {filteredFundRequests.length === 0 ? (
                      <tr>
                        <td colSpan={isLeaderOrAdmin ? 5 : 4} className="py-12 text-center text-white/40 text-xs">
                          لا توجد طلبات تمويل مطابقة للفلاتر المحددة.
                        </td>
                      </tr>
                    ) : (
                      filteredFundRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-white/5 transition-all text-white">
                          {isLeaderOrAdmin && (
                            <td className="py-3.5 px-4 text-xs font-bold text-brand-accent">
                              {req.agent?.full_name || "مستخدم"}
                            </td>
                          )}
                          <td className="py-3.5 px-4 font-inter text-xs font-bold">{req.request_date}</td>
                          <td className="py-3.5 px-4 text-xs font-bold">{req.wallet?.phone_number || "عدة محافظ"}</td>
                          <td className="py-3.5 px-4 font-inter font-bold text-emerald-400">
                            {Number(req.amount_requested).toLocaleString("en-US")}
                          </td>
                          <td className="py-3.5 px-4">{getStatusBadge(req.status)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 3: EDIT REQUESTS TABLE */}
            {activeTab === "edit-requests" && (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead>
                    <tr className="border-b border-brand-border/40 text-xs text-white/50 uppercase">
                      {isLeaderOrAdmin && <th className="py-3 px-4">الموظف</th>}
                      <th className="py-3 px-4">تاريخ التقرير</th>
                      <th className="py-3 px-4">المبلغ القديم</th>
                      <th className="py-3 px-4">المبلغ الجديد</th>
                      <th className="py-3 px-4">السبب</th>
                      <th className="py-3 px-4">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border/20">
                    {filteredEditRequests.length === 0 ? (
                      <tr>
                        <td colSpan={isLeaderOrAdmin ? 6 : 5} className="py-12 text-center text-white/40 text-xs">
                          لا توجد طلبات تعديل مطابقة للفلاتر المحددة.
                        </td>
                      </tr>
                    ) : (
                      filteredEditRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-white/5 transition-all text-white">
                          {isLeaderOrAdmin && (
                            <td className="py-3.5 px-4 text-xs font-bold text-brand-accent">
                              {req.agent?.full_name || "مستخدم"}
                            </td>
                          )}
                          <td className="py-3.5 px-4 font-inter text-xs font-bold">{req.expense_date}</td>
                          <td className="py-3.5 px-4 font-inter text-white/60">{Number(req.old_total_amount).toLocaleString("en-US")}</td>
                          <td className="py-3.5 px-4 font-inter font-bold text-brand-accent">{Number(req.new_total_amount).toLocaleString("en-US")}</td>
                          <td className="py-3.5 px-4 text-xs">{req.reason || "-"}</td>
                          <td className="py-3.5 px-4">{getStatusBadge(req.status)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 4: CUSTODY TRANSFERS TABLE */}
            {activeTab === "custody-transfers" && (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead>
                    <tr className="border-b border-brand-border/40 text-xs text-white/50 uppercase">
                      <th className="py-3 px-4">التاريخ</th>
                      <th className="py-3 px-4">من موظف</th>
                      <th className="py-3 px-4">إلى موظف</th>
                      <th className="py-3 px-4">المبلغ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border/20">
                    {filteredCustodyTransfers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-white/40 text-xs">
                          لا توجد تحويلات عهد مطابقة للفلاتر المحددة.
                        </td>
                      </tr>
                    ) : (
                      filteredCustodyTransfers.map((tr) => (
                        <tr key={tr.id} className="hover:bg-white/5 transition-all text-white">
                          <td className="py-3.5 px-4 font-inter text-xs font-bold">
                            {tr.created_at ? new Date(tr.created_at).toLocaleDateString("en-CA") : "-"}
                          </td>
                          <td className="py-3.5 px-4 text-xs font-bold">{tr.fromAgent?.full_name || "مستخدم"}</td>
                          <td className="py-3.5 px-4 text-xs font-bold">{tr.toAgent?.full_name || "مستخدم"}</td>
                          <td className="py-3.5 px-4 font-inter font-bold text-emerald-400">
                            {Number(tr.amount).toLocaleString("en-US")}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* PAGINATION CONTROLS */}
            <div className="flex items-center justify-between border-t border-brand-border/20 pt-4 mt-6 text-xs text-brand-dim">
              <span>
                إجمالي السجلات:{" "}
                <strong className="text-white">
                  {activeTab === "daily-expenses"
                    ? expenseCount
                    : activeTab === "fund-requests"
                    ? fundCount
                    : activeTab === "edit-requests"
                    ? editCount
                    : transferCount}
                </strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={
                    activeTab === "daily-expenses"
                      ? expensePage <= 1
                      : activeTab === "fund-requests"
                      ? fundPage <= 1
                      : activeTab === "edit-requests"
                      ? editPage <= 1
                      : transferPage <= 1
                  }
                  onClick={() => {
                    const curPage =
                      activeTab === "daily-expenses"
                        ? expensePage
                        : activeTab === "fund-requests"
                        ? fundPage
                        : activeTab === "edit-requests"
                        ? editPage
                        : transferPage;
                    loadActiveTabData(activeTab, curPage - 1);
                  }}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-white transition-all"
                >
                  <ChevronRight size={16} />
                </button>
                <span className="font-bold text-white font-inter">
                  صفحة{" "}
                  {activeTab === "daily-expenses"
                    ? expensePage
                    : activeTab === "fund-requests"
                    ? fundPage
                    : activeTab === "edit-requests"
                    ? editPage
                    : transferPage}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const curPage =
                      activeTab === "daily-expenses"
                        ? expensePage
                        : activeTab === "fund-requests"
                        ? fundPage
                        : activeTab === "edit-requests"
                        ? editPage
                        : transferPage;
                    loadActiveTabData(activeTab, curPage + 1);
                  }}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer text-white transition-all"
                >
                  <ChevronLeft size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
