"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Coins,
  ClipboardList,
  FileEdit,
  Calendar,
  Clock,
  AlertCircle,
  RotateCcw,
  User,
  ChevronDown,
  Check,
  Megaphone,
  X,
  Loader2,
  Wallet,
  ArrowRightLeft,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowDownRight,
  Edit3,
  History,
  MessageSquare,
  Sparkles,
  Search,
  Filter,
  Info,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  getAdminFundRequestsPaginated,
  getAdminDailyExpensesPaginated,
  getAdminEditRequestsPaginated,
  getAdminWalletsWithBalances,
  getAdminCustodyTransfersPaginated,
  getFundRequestsLast3DaysStats,
  editApprovedFundRequest,
  getAdminEditedFundRequests,
  FundDayStat,
} from "@/app/actions/adminOperations";
import {
  FundRequestEditRecord,
  extractFundRequestEditHistory,
  extractFundRequestWallets,
} from "@/lib/fundUtils";
import { getExpenseTransfers } from "@/app/actions/operations";
import { MarketingSystem } from "@/app/actions/marketingSystems";

interface HistoryClientProps {
  initialFundRequests: any[];
  initialFundCount: number;
  initialFundSummary?: {
    totalTransferred: number;
    approvedCount: number;
    recipients: Array<{
      agentId: string;
      agentName: string;
      totalAmount: number;
      count: number;
    }>;
  };
  initialLast3DaysStats?: FundDayStat[];
  initialDailyExpenses: any[];
  initialExpenseCount: number;
  initialEditRequests: any[];
  initialEditCount: number;
  initialCustodyTransfers?: any[];
  initialTransferCount?: number;
  initialEditedFundRequests?: any[];
  employees: any[];
  marketingSystems?: MarketingSystem[];
  userRole?: string;
}

type TabType = "fund-requests" | "fund-edits" | "daily-expenses" | "edit-requests" | "custody-transfers";

export default function HistoryClient({
  initialFundRequests = [],
  initialFundCount = 0,
  initialFundSummary,
  initialLast3DaysStats = [],
  initialDailyExpenses = [],
  initialExpenseCount = 0,
  initialEditRequests = [],
  initialEditCount = 0,
  initialCustodyTransfers = [],
  initialTransferCount = 0,
  initialEditedFundRequests = [],
  employees = [],
  marketingSystems = [],
  userRole,
}: HistoryClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("fund-requests");

  // Local state for data & counts
  const [fundRequests, setFundRequests] = useState<any[]>(initialFundRequests);
  const [fundCount, setFundCount] = useState<number>(initialFundCount);
  const [fundPage, setFundPage] = useState<number>(1);

  // Edited Fund Requests State
  const [editedFundRequests, setEditedFundRequests] = useState<any[]>(initialEditedFundRequests || []);
  const [editingFundRequest, setEditingFundRequest] = useState<any | null>(null);
  const [editAmount, setEditAmount] = useState<string>("");
  const [editDate, setEditDate] = useState<string>("");
  const [editNotes, setEditNotes] = useState<string>("");
  const [editMultiAmounts, setEditMultiAmounts] = useState<Record<string, string>>({});
  const [isSubmittingEdit, setIsSubmittingEdit] = useState<boolean>(false);
  const [editModalError, setEditModalError] = useState<string | null>(null);
  const [expandedEditHistoryIds, setExpandedEditHistoryIds] = useState<Record<string, boolean>>({});
  const [editsSearchTerm, setEditsSearchTerm] = useState<string>("");

  const toggleExpandHistory = (id: string) => {
    setExpandedEditHistoryIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleOpenEditModal = (req: any) => {
    setEditingFundRequest(req);
    const currentApproved = Number(req.amount_approved) || Number(req.amount_requested) || 0;
    setEditAmount(String(currentApproved));
    setEditDate(req.request_date || "");
    setEditNotes("");
    setEditModalError(null);

    if (req.is_multi_wallet && Array.isArray(req.multi_wallet_data)) {
      const initialMap: Record<string, string> = {};
      const wallets = extractFundRequestWallets(req);
      wallets.forEach((w: any) => {
        initialMap[w.wallet_id] = String(w.amount_approved ?? w.amount_requested ?? 0);
      });
      setEditMultiAmounts(initialMap);
    } else {
      setEditMultiAmounts({});
    }
  };

  const handleSaveEdit = async () => {
    if (!editingFundRequest) return;
    const parsedAmount = parseFloat(editAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setEditModalError("يرجى إدخال مبلغ صحيح أكبر من الصفر.");
      return;
    }
    if (!editNotes || !editNotes.trim()) {
      setEditModalError("يرجى إدخال سبب / ملاحظات التعديل (مطلوب).");
      return;
    }

    let multiBreakdown: Array<{ walletId: string; amountApproved: number }> | undefined = undefined;
    if (editingFundRequest.is_multi_wallet) {
      const wallets = extractFundRequestWallets(editingFundRequest);
      multiBreakdown = [];
      let total = 0;
      for (const w of wallets) {
        const val = parseFloat(editMultiAmounts[w.wallet_id] || "0");
        if (isNaN(val) || val < 0) {
          setEditModalError(`يرجى إدخال مبلغ صحيح للمحفظة ${w.phone_number}`);
          return;
        }
        total += val;
        multiBreakdown.push({
          walletId: w.wallet_id,
          amountApproved: val,
        });
      }
      if (total <= 0) {
        setEditModalError("يجب أن يكون إجمالي المبالغ أكبر من الصفر.");
        return;
      }
    }

    setIsSubmittingEdit(true);
    setEditModalError(null);

    try {
      const res = await editApprovedFundRequest({
        requestId: editingFundRequest.id,
        newAmount: parsedAmount,
        newDate: editDate,
        notes: editNotes.trim(),
        multiBreakdown,
      });

      if (res.success) {
        setEditingFundRequest(null);
        setFundRefresh((p) => p + 1);
        const updatedEdits = await getAdminEditedFundRequests();
        if (updatedEdits.success) {
          setEditedFundRequests(updatedEdits.data);
        }
        router.refresh();
      } else {
        setEditModalError(res.error || "فشل تعديل الطلب.");
      }
    } catch (err: any) {
      setEditModalError(err.message || "حدث خطأ غير متوقع.");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const [dailyExpenses, setDailyExpenses] = useState<any[]>(initialDailyExpenses);
  const [expenseCount, setExpenseCount] = useState<number>(initialExpenseCount);
  const [expensePage, setExpensePage] = useState<number>(1);

  const [editRequests, setEditRequests] = useState<any[]>(initialEditRequests);
  const [editCount, setEditCount] = useState<number>(initialEditCount);
  const [editPage, setEditPage] = useState<number>(1);

  const [custodyTransfers, setCustodyTransfers] = useState<any[]>(initialCustodyTransfers);
  const [transferCount, setTransferCount] = useState<number>(initialTransferCount);
  const [transferPage, setTransferPage] = useState<number>(1);

  // Refresh Triggers for Realtime updates
  const [fundRefresh, setFundRefresh] = useState(0);
  const [expenseRefresh, setExpenseRefresh] = useState(0);
  const [editRefresh, setEditRefresh] = useState(0);

  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Detailed Expense Modal view
  const [selectedExpense, setSelectedExpense] = useState<any | null>(null);
  const [expenseTransfers, setExpenseTransfers] = useState<any[]>([]);
  const [isLoadingTransfers, setIsLoadingTransfers] = useState<boolean>(false);

  const openExpenseDetailModal = async (exp: any) => {
    setSelectedExpense(exp);
    setExpenseTransfers([]);
    setIsLoadingTransfers(true);
    try {
      const res = await getExpenseTransfers(exp.id);
      if (res.success) {
        setExpenseTransfers(res.transfers || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingTransfers(false);
    }
  };

  // Sync props to state if props change (e.g. on server navigations)
  useEffect(() => {
    setFundRequests(initialFundRequests);
    setFundCount(initialFundCount);
    if (initialFundSummary) {
      setFundSummary(initialFundSummary);
    }
    setFundPage(1);
  }, [initialFundRequests, initialFundCount, initialFundSummary]);

  useEffect(() => {
    setDailyExpenses(initialDailyExpenses);
    setExpenseCount(initialExpenseCount);
    setExpensePage(1);
  }, [initialDailyExpenses, initialExpenseCount]);

  useEffect(() => {
    setEditRequests(initialEditRequests);
    setEditCount(initialEditCount);
    setEditPage(1);
  }, [initialEditRequests, initialEditCount]);

  useEffect(() => {
    setCustodyTransfers(initialCustodyTransfers || []);
    setTransferCount(initialTransferCount || 0);
    setTransferPage(1);
  }, [initialCustodyTransfers, initialTransferCount]);

  useEffect(() => {
    if (initialEditedFundRequests) {
      setEditedFundRequests(initialEditedFundRequests);
    }
  }, [initialEditedFundRequests]);

  // Rolling 3-Days Stats State
  const [last3DaysStats, setLast3DaysStats] = useState<FundDayStat[]>(
    initialLast3DaysStats || []
  );

  useEffect(() => {
    if (initialLast3DaysStats && initialLast3DaysStats.length > 0) {
      setLast3DaysStats(initialLast3DaysStats);
    }
  }, [initialLast3DaysStats]);

  // Refetch 3-day stats & edited funds when fundRefresh changes (real-time or approval or edit)
  useEffect(() => {
    if (isFirstFundFetch.current) return;
    async function refresh3DaysStats() {
      const res = await getFundRequestsLast3DaysStats();
      if (res.success && res.stats) {
        setLast3DaysStats(res.stats);
      }
      if (userRole === "admin" || userRole === "accountant") {
        const editsRes = await getAdminEditedFundRequests();
        if (editsRes.success && editsRes.data) {
          setEditedFundRequests(editsRes.data);
        }
      }
    }
    refresh3DaysStats();
  }, [fundRefresh, userRole]);

  // Filters State
  // 1. Manual Transaction Date ("التاريخ" - request_date)
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // 2. Action Timestamp in System ("توقيت الإجراء" - approved_at)
  const [actionStartDate, setActionStartDate] = useState<string>("");
  const [actionEndDate, setActionEndDate] = useState<string>("");

  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedWallets, setSelectedWallets] = useState<string[]>([]);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [walletsList, setWalletsList] = useState<string[]>([]);
  const [fundSummary, setFundSummary] = useState<any>(
    initialFundSummary || { totalTransferred: 0, approvedCount: 0, recipients: [] }
  );

  const isDayCardSelected = (date: string) => {
    return startDate === date && endDate === date && !actionStartDate && !actionEndDate;
  };

  const handleDayCardClick = (date: string) => {
    if (isDayCardSelected(date)) {
      setStartDate("");
      setEndDate("");
    } else {
      setStartDate(date);
      setEndDate(date);
      setActionStartDate("");
      setActionEndDate("");
      setSelectedStatus("all");
    }
    setFundPage(1);
  };

  // Quick date setter helper
  const handleSetQuickDate = (
    target: "manual" | "action",
    type: "today" | "yesterday" | "thisMonth" | "clear"
  ) => {
    if (type === "clear") {
      if (target === "manual") {
        setStartDate("");
        setEndDate("");
      } else {
        setActionStartDate("");
        setActionEndDate("");
      }
      return;
    }

    const egyptParts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Cairo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date()).split("-");

    const todayStr = `${egyptParts[0]}-${egyptParts[1]}-${egyptParts[2]}`;

    let sDate = "";
    let eDate = "";

    if (type === "today") {
      sDate = todayStr;
      eDate = todayStr;
    } else if (type === "yesterday") {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      const yParts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Africa/Cairo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(d).split("-");
      sDate = `${yParts[0]}-${yParts[1]}-${yParts[2]}`;
      eDate = sDate;
    } else if (type === "thisMonth") {
      sDate = `${egyptParts[0]}-${egyptParts[1]}-01`;
      eDate = todayStr;
    }

    if (target === "manual") {
      if (startDate === sDate && endDate === eDate) {
        setStartDate("");
        setEndDate("");
      } else {
        setStartDate(sDate);
        setEndDate(eDate);
      }
    } else {
      if (actionStartDate === sDate && actionEndDate === eDate) {
        setActionStartDate("");
        setActionEndDate("");
      } else {
        setActionStartDate(sDate);
        setActionEndDate(eDate);
      }
    }
  };

  // Load all agent wallets dynamically on mount
  useEffect(() => {
    async function loadWallets() {
      const res = await getAdminWalletsWithBalances();
      if (res.success && res.wallets) {
        setWalletsList(res.wallets.map((w: any) => w.phone_number));
      }
    }
    loadWallets();
  }, []);

  // First fetch trackers to skip fetching on initial mount (which has server-supplied data)
  const isFirstFundFetch = useRef(true);
  const isFirstExpenseFetch = useRef(true);
  const isFirstEditFetch = useRef(true);
  const isFirstTransferFetch = useRef(true);

  // Fetch paginated & filtered Fund Requests
  useEffect(() => {
    if (isFirstFundFetch.current) {
      isFirstFundFetch.current = false;
      return;
    }
    let isCurrent = true;
    async function fetchFunds() {
      setIsLoading(true);
      const res = await getAdminFundRequestsPaginated({
        page: fundPage,
        limit: 20,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        actionStartDate: actionStartDate || undefined,
        actionEndDate: actionEndDate || undefined,
        status: selectedStatus,
        agentIds: selectedAgentIds.length > 0 ? selectedAgentIds : undefined,
        walletPhoneNumbers: selectedWallets.length > 0 ? selectedWallets : undefined,
      });
      if (isCurrent) {
        if (res.success && res.data) {
          setFundRequests(res.data);
          setFundCount(res.totalCount);
          if (res.summary) {
            setFundSummary(res.summary);
          }
        }
        setIsLoading(false);
      }
    }
    fetchFunds();
    return () => {
      isCurrent = false;
    };
  }, [fundPage, startDate, endDate, actionStartDate, actionEndDate, selectedStatus, selectedWallets, selectedAgentIds, fundRefresh]);

  // Fetch paginated & filtered Daily Expenses
  useEffect(() => {
    if (isFirstExpenseFetch.current) {
      isFirstExpenseFetch.current = false;
      return;
    }
    let isCurrent = true;
    async function fetchExpenses() {
      setIsLoading(true);
      const res = await getAdminDailyExpensesPaginated({
        page: expensePage,
        limit: 20,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        agentIds: selectedAgentIds.length > 0 ? selectedAgentIds : undefined,
      });
      if (isCurrent) {
        if (res.success && res.data) {
          setDailyExpenses(res.data);
          setExpenseCount(res.totalCount);
        }
        setIsLoading(false);
      }
    }
    fetchExpenses();
    return () => {
      isCurrent = false;
    };
  }, [expensePage, startDate, endDate, selectedAgentIds, expenseRefresh]);

  // Fetch paginated & filtered Edit Requests
  useEffect(() => {
    if (isFirstEditFetch.current) {
      isFirstEditFetch.current = false;
      return;
    }
    let isCurrent = true;
    async function fetchEdits() {
      setIsLoading(true);
      const res = await getAdminEditRequestsPaginated({
        page: editPage,
        limit: 20,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        status: selectedStatus,
        agentIds: selectedAgentIds.length > 0 ? selectedAgentIds : undefined,
      });
      if (isCurrent) {
        if (res.success && res.data) {
          setEditRequests(res.data);
          setEditCount(res.totalCount);
        }
        setIsLoading(false);
      }
    }
    fetchEdits();
    return () => {
      isCurrent = false;
    };
  }, [editPage, startDate, endDate, selectedStatus, selectedAgentIds, editRefresh]);

  // Fetch paginated & filtered Custody Transfers for Admin
  useEffect(() => {
    if (isFirstTransferFetch.current) {
      isFirstTransferFetch.current = false;
      return;
    }
    let isCurrent = true;
    async function fetchTransfers() {
      setIsLoading(true);
      const res = await getAdminCustodyTransfersPaginated({
        page: transferPage,
        limit: 20,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        agentId: selectedAgentIds.length === 1 ? selectedAgentIds[0] : undefined,
      });
      if (isCurrent) {
        if (res.success && res.data) {
          setCustodyTransfers(res.data);
          setTransferCount(res.totalCount);
        }
        setIsLoading(false);
      }
    }
    fetchTransfers();
    return () => {
      isCurrent = false;
    };
  }, [transferPage, startDate, endDate, selectedAgentIds, expenseRefresh]);

  // Reset page parameters to 1 when filters are changed
  useEffect(() => {
    if (isFirstFundFetch.current && isFirstExpenseFetch.current && isFirstEditFetch.current) {
      return;
    }
    setFundPage(1);
    setExpensePage(1);
    setEditPage(1);
  }, [startDate, endDate, actionStartDate, actionEndDate, selectedStatus, selectedWallets, selectedAgentIds]);

  // Filtered Edited Fund Requests for the Dedicated Tab
  const filteredEditedFundRequests = useMemo(() => {
    return editedFundRequests.filter((req) => {
      // Filter by agent dropdown
      if (selectedAgentIds.length > 0 && !selectedAgentIds.includes(req.agent_id)) {
        return false;
      }
      // Filter by manual date (startDate / endDate)
      if (startDate && req.request_date < startDate) return false;
      if (endDate && req.request_date > endDate) return false;
      // Search term
      if (editsSearchTerm && editsSearchTerm.trim()) {
        const term = editsSearchTerm.trim().toLowerCase();
        const agentName = (req.agent?.full_name || "").toLowerCase();
        const history = extractFundRequestEditHistory(req.multi_wallet_data);
        const notesMatch = history.some(
          (h) =>
            (h.notes || "").toLowerCase().includes(term) ||
            (h.editor_name || "").toLowerCase().includes(term)
        );
        const phoneMatch = (req.wallet?.phone_number || "").includes(term);
        if (!agentName.includes(term) && !notesMatch && !phoneMatch) {
          return false;
        }
      }
      return true;
    });
  }, [editedFundRequests, selectedAgentIds, startDate, endDate, editsSearchTerm]);

  // Subscribe to real-time updates from Supabase to silently trigger refetching
  useEffect(() => {
    const channel = supabase
      .channel("history_realtime_channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fund_requests" },
        () => {
          setFundRefresh((prev) => prev + 1);
        }
      );

    if (userRole !== "accountant") {
      channel
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "daily_expenses" },
          () => {
            setExpenseRefresh((prev) => prev + 1);
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "edit_expense_requests" },
          () => {
            setEditRefresh((prev) => prev + 1);
          }
        );
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userRole]);

  // Dropdown Toggles and Refs
  const statusDropdownRef = React.useRef<HTMLDivElement>(null);
  const walletDropdownRef = React.useRef<HTMLDivElement>(null);
  const agentDropdownRef = React.useRef<HTMLDivElement>(null);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isWalletDropdownOpen, setIsWalletDropdownOpen] = useState(false);
  const [isAgentDropdownOpen, setIsAgentDropdownOpen] = useState(false);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setIsStatusDropdownOpen(false);
      }
      if (walletDropdownRef.current && !walletDropdownRef.current.contains(event.target as Node)) {
        setIsWalletDropdownOpen(false);
      }
      if (agentDropdownRef.current && !agentDropdownRef.current.contains(event.target as Node)) {
        setIsAgentDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Helpers
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split("-");
      return `${year}/${month}/${day}`;
    }
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("ar-EG-u-nu-latn", {
        timeZone: "Africa/Cairo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      return d.toLocaleString("ar-EG-u-nu-latn", {
        timeZone: "Africa/Cairo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  // Reset Filters
  const handleResetFilters = () => {
    setStartDate("");
    setEndDate("");
    setActionStartDate("");
    setActionEndDate("");
    setSelectedStatus("all");
    setSelectedWallets([]);
    setSelectedAgentIds([]);
  };

  const hasActiveFilters = Boolean(
    startDate ||
    endDate ||
    actionStartDate ||
    actionEndDate ||
    selectedStatus !== "all" ||
    selectedWallets.length > 0 ||
    selectedAgentIds.length > 0
  );

  // Helper to render status badge with reviewer name displayed inline below it
  const renderStatusBadge = (
    status: string,
    reviewerName?: string,
    reviewedAt?: string
  ) => {
    let badgeClass = "";
    let badgeText = "";

    switch (status) {
      case "approved":
        badgeClass = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
        badgeText = "تمت الموافقة";
        break;
      case "rejected":
        badgeClass = "bg-red-500/10 text-red-400 border border-red-500/20";
        badgeText = "مرفوض";
        break;
      default:
        badgeClass = "bg-amber-500/10 text-amber-400 border border-amber-500/20";
        badgeText = "قيد المراجعة";
    }

    return (
      <div className="flex flex-col items-center justify-center gap-1">
        <span className={`inline-flex items-center justify-center px-2.5 py-1 text-xs font-bold rounded-full transition-all duration-200 ${badgeClass}`}>
          {badgeText}
        </span>
        {status !== "pending" && reviewerName && (
          <span className="text-[10px] text-brand-dim/50 font-medium block mt-0.5">
            بواسطة: {reviewerName}
          </span>
        )}
      </div>
    );
  };

  // Render Empty State Component
  const renderEmptyState = (message: string, IconComponent: any) => (
    <div className="text-center py-20 text-brand-dim/40 flex flex-col items-center justify-center gap-3 animate-fade-in">
      <IconComponent size={40} className="opacity-20 text-brand-accent animate-pulse" />
      <span className="text-sm font-bold text-brand-dim/50">{message}</span>
      <button
        onClick={handleResetFilters}
        className="mt-2 text-xs font-semibold text-brand-accent hover:text-brand-accent/80 transition-colors flex items-center gap-1 cursor-pointer"
      >
        <RotateCcw size={12} />
        <span>مسح الفلاتر النشطة</span>
      </button>
    </div>
  );

  const renderPaginationControls = (
    currentPage: number,
    totalCount: number,
    totalPages: number,
    onPageChange: (page: number) => void
  ) => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-brand-border/20" dir="rtl">
        <span className="text-xs text-brand-dim/60">
          إجمالي السجلات: <span className="text-white font-bold font-inter">{totalCount}</span>
        </span>

        <div className="flex items-center gap-2">
          {/* Next Page */}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="px-3 py-1.5 rounded-xl border border-brand-border/60 text-white text-xs font-semibold hover:border-brand-accent hover:text-brand-accent disabled:opacity-40 disabled:hover:text-white disabled:hover:border-brand-border/60 transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            التالي
          </button>

          <span className="text-xs text-brand-dim/80 px-2">
            الصفحة <span className="text-white font-bold font-inter">{currentPage}</span> من <span className="text-white font-bold font-inter">{totalPages}</span>
          </span>

          {/* Previous Page */}
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="px-3 py-1.5 rounded-xl border border-brand-border/60 text-white text-xs font-semibold hover:border-brand-accent hover:text-brand-accent disabled:opacity-40 disabled:hover:text-white disabled:hover:border-brand-border/60 transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            السابق
          </button>
        </div>
      </div>
    );
  };

  const getEgyptToday = () => {
    const egyptParts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Cairo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date()).split("-");
    return `${egyptParts[0]}-${egyptParts[1]}-${egyptParts[2]}`;
  };

  const getEgyptYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yParts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Cairo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d).split("-");
    return `${yParts[0]}-${yParts[1]}-${yParts[2]}`;
  };

  const todayStr = getEgyptToday();
  const yesterdayStr = getEgyptYesterday();
  const startOfMonthStr = `${todayStr.slice(0, 7)}-01`;

  return (
    <div className="space-y-6 text-right font-cairo" dir="rtl">
      {/* Page Title */}
      <div className="flex flex-col gap-1 text-right">
        <h1 className="text-2xl md:text-3xl font-extrabold text-white">سجل العمليات العام</h1>
        <p className="text-sm text-brand-dim">متابعة وتصفية كافة المعاملات المالية وتقارير المصروفات الخاصة بجميع الموظفين.</p>
      </div>

      {/* 3-Days Rolling Summary Section (Fund Requests) */}
      {activeTab === "fund-requests" && last3DaysStats.length > 0 && (
        <div className="space-y-3 animate-fade-in">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-brand-accent/15 border border-brand-accent/30 flex items-center justify-center text-brand-accent shadow-[0_0_12px_rgba(139,92,246,0.2)] shrink-0">
                <Coins size={16} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm md:text-base font-bold text-white">إجمالي العمليات والفلوس لآخر 3 أيام</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-brand-accent/15 text-brand-accent border border-brand-accent/30">
                    مباشر ومتحرك
                  </span>
                </div>
                <span className="text-[11px] text-brand-dim block">اضغط على أي مربع لتصفية وعرض كل عمليات اليوم بتفاصيلها فوراً.</span>
              </div>
            </div>

            {/* If any of the 3 days is active, show clear selection button */}
            {last3DaysStats.some((s) => isDayCardSelected(s.date)) && (
              <button
                type="button"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  setFundPage(1);
                }}
                className="text-xs font-bold text-brand-accent hover:text-brand-accent/80 transition-colors flex items-center gap-1.5 cursor-pointer bg-brand-accent/10 border border-brand-accent/25 px-3 py-1.5 rounded-xl hover:bg-brand-accent/20 active:scale-[0.98]"
              >
                <RotateCcw size={12} />
                <span>إلغاء التحديد وعرض كل الأيام</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {last3DaysStats.map((item) => {
              const isSelected = isDayCardSelected(item.date);

              // Distinct theme colors based on dayLabel
              const theme =
                item.dayLabel === "today"
                  ? {
                      badgeBg: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400",
                      badgeLabel: "اليوم",
                      activeBorder: "border-emerald-400 ring-2 ring-emerald-400/50 shadow-[0_0_25px_rgba(16,185,129,0.25)]",
                      hoverBorder: "hover:border-emerald-500/50",
                      amountColor: "text-emerald-400",
                    }
                  : item.dayLabel === "yesterday"
                  ? {
                      badgeBg: "bg-cyan-500/15 border-cyan-500/30 text-cyan-400",
                      badgeLabel: "أمس",
                      activeBorder: "border-cyan-400 ring-2 ring-cyan-400/50 shadow-[0_0_25px_rgba(6,182,212,0.25)]",
                      hoverBorder: "hover:border-cyan-500/50",
                      amountColor: "text-cyan-400",
                    }
                  : {
                      badgeBg: "bg-purple-500/15 border-purple-500/30 text-purple-400",
                      badgeLabel: "أول أمس",
                      activeBorder: "border-purple-400 ring-2 ring-purple-400/50 shadow-[0_0_25px_rgba(168,85,247,0.25)]",
                      hoverBorder: "hover:border-purple-500/50",
                      amountColor: "text-purple-400",
                    };

              return (
                <button
                  key={item.date}
                  type="button"
                  onClick={() => handleDayCardClick(item.date)}
                  className={`relative p-4 rounded-2xl border text-right transition-all duration-300 cursor-pointer group flex flex-col justify-between gap-3.5 backdrop-blur-xl ${
                    isSelected
                      ? `bg-gradient-to-br from-[#161a36] via-[#10142d] to-[#0c0f24] ${theme.activeBorder}`
                      : `bg-[#0c0f1e]/80 border-brand-border/60 ${theme.hoverBorder} hover:bg-[#0f1326] shadow-lg`
                  }`}
                >
                  {/* Top: Day Label, Arabic Date & Selection Indicator */}
                  <div className="flex items-center justify-between w-full gap-2 border-b border-white/5 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-extrabold border ${theme.badgeBg}`}>
                        {theme.badgeLabel}
                      </span>
                      <span className="text-xs font-bold text-white">{item.formattedDate}</span>
                    </div>

                    {isSelected ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full shrink-0">
                        <Check size={11} className="stroke-[3]" />
                        <span>محدد الآن</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-brand-dim/50 group-hover:text-brand-accent transition-colors flex items-center gap-0.5 shrink-0">
                        <span>عرض اليوم</span>
                        <ArrowUpRight size={11} />
                      </span>
                    )}
                  </div>

                  {/* Middle: Amount & Total Count */}
                  <div className="flex items-end justify-between gap-3 w-full">
                    <div>
                      <span className="text-[10px] font-semibold text-brand-dim/70 block">إجمالي الفلوس المحولة:</span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className={`text-2xl md:text-3xl font-black font-inter tracking-tight ${theme.amountColor}`}>
                          {item.totalTransferred.toLocaleString("en-US")}
                        </span>
                        <span className="text-xs text-brand-dim font-normal font-cairo">ج.م</span>
                      </div>
                    </div>

                    <div className="text-left shrink-0">
                      <span className="inline-block px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-bold text-white/90 font-inter">
                        {item.totalOperations} <span className="text-[10px] text-brand-dim font-cairo">عملية</span>
                      </span>
                    </div>
                  </div>

                  {/* Bottom: Breakdown Pills (قبلنا - انتظار - رفضنا) */}
                  <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-white/5 w-full text-center">
                    {/* Approved */}
                    <div className="px-2 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 space-y-0.5">
                      <span className="block text-[9.5px] font-bold text-emerald-300/80 font-cairo">قبلنا</span>
                      <span className="block text-xs font-bold font-inter">{item.approvedCount}</span>
                    </div>

                    {/* Pending */}
                    <div className="px-2 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 space-y-0.5">
                      <span className="block text-[9.5px] font-bold text-amber-300/80 font-cairo">انتظار</span>
                      <span className="block text-xs font-bold font-inter">{item.pendingCount}</span>
                    </div>

                    {/* Rejected */}
                    <div className="px-2 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 space-y-0.5">
                      <span className="block text-[9.5px] font-bold text-red-300/80 font-cairo">رفضنا</span>
                      <span className="block text-xs font-bold font-inter">{item.rejectedCount}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="bg-[#0c0f1d] border border-brand-border/40 p-5 rounded-2xl space-y-4 w-full">
        {/* Row 1: General Filters (Agent, Status, Wallet, and Clear All) */}
        <div className="flex flex-wrap items-end gap-4 w-full">
          {/* Agent Filter */}
          <div className="space-y-1 w-full sm:w-[210px] relative" ref={agentDropdownRef}>
            <label className="text-[10px] font-bold text-brand-dim/60 block pr-1 font-cairo">الموظف</label>
            <button
              type="button"
              dir="rtl"
              onClick={() => {
                setIsAgentDropdownOpen(!isAgentDropdownOpen);
                setIsStatusDropdownOpen(false);
                setIsWalletDropdownOpen(false);
              }}
              className="w-full h-10 px-3.5 rounded-xl bg-[#070912] border border-brand-border/60 text-white text-xs focus:outline-none focus:border-brand-accent transition-all cursor-pointer flex items-center justify-between"
            >
              <span className="text-white text-xs font-cairo text-right">
                {selectedAgentIds.length === 0
                  ? "الكل (جميع الموظفين)"
                  : selectedAgentIds.length === 1
                  ? employees.find((e) => e.id === selectedAgentIds[0])?.full_name || "موظف محدد"
                  : `الموظفون المختارون (${selectedAgentIds.length})`}
              </span>
              <ChevronDown size={14} className={`text-white/40 transition-transform duration-200 ${isAgentDropdownOpen ? "rotate-180 text-brand-accent" : ""}`} />
            </button>

            {isAgentDropdownOpen && (
              <div className="absolute right-0 left-0 mt-2 bg-[#0c0e18]/95 backdrop-blur-xl border border-brand-border/80 rounded-xl shadow-2xl p-3 z-[9999] animate-scale-in text-right max-h-56 overflow-y-auto custom-scrollbar" dir="rtl">
                <span className="block text-xs font-semibold text-brand-dim/60 mb-2 border-b border-brand-border/20 pb-1.5 font-cairo">تصفية حسب الموظف</span>
                <button
                  type="button"
                  dir="rtl"
                  onClick={() => {
                    setSelectedAgentIds([]);
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer text-brand-accent hover:text-brand-accent/80 font-bold font-cairo"
                >
                  <span className="text-xs text-right">تحديد الكل</span>
                  {selectedAgentIds.length === 0 || selectedAgentIds.length === employees.length ? (
                    <div className="w-4 h-4 rounded border border-brand-accent bg-brand-accent/20 flex items-center justify-center shrink-0">
                      <Check size={12} className="text-brand-accent stroke-[3]" />
                    </div>
                  ) : (
                    <div className="w-4 h-4 rounded border border-white/25 bg-white/[0.02] shrink-0" />
                  )}
                </button>

                <div className="border-t border-brand-border/10 my-1.5" />

                <div className="space-y-0.5">
                  {employees.map((emp) => {
                    const isChecked = selectedAgentIds.includes(emp.id);
                    return (
                      <button
                        key={emp.id}
                        type="button"
                        dir="rtl"
                        onClick={() => {
                          if (isChecked) {
                            setSelectedAgentIds(selectedAgentIds.filter((id) => id !== emp.id));
                          } else {
                            setSelectedAgentIds([...selectedAgentIds, emp.id]);
                          }
                        }}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer text-white/80 transition-colors w-full"
                      >
                        <span className="text-xs font-semibold text-right">{emp.full_name}</span>
                        {isChecked ? (
                          <div className="w-4 h-4 rounded border border-brand-accent bg-brand-accent/20 flex items-center justify-center shrink-0">
                            <Check size={12} className="text-brand-accent stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-4 h-4 rounded border border-white/25 bg-white/[0.02] shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Status Dropdown */}
          {activeTab !== "daily-expenses" && (
            <div className="space-y-1 w-full sm:w-[180px] relative" ref={statusDropdownRef}>
              <label className="text-[10px] font-bold text-brand-dim/60 block pr-1 font-cairo">حالة الطلب</label>
              <button
                type="button"
                dir="rtl"
                onClick={() => {
                  setIsStatusDropdownOpen(!isStatusDropdownOpen);
                  setIsWalletDropdownOpen(false);
                  setIsAgentDropdownOpen(false);
                }}
                className="w-full h-10 px-3.5 rounded-xl bg-[#070912] border border-brand-border/60 text-white text-xs focus:outline-none focus:border-brand-accent transition-all cursor-pointer flex items-center justify-between"
              >
                <span className="text-white text-xs font-cairo">
                  {selectedStatus === "all"
                    ? "كل الحالات"
                    : selectedStatus === "pending"
                    ? "قيد المراجعة"
                    : selectedStatus === "approved"
                    ? "تمت الموافقة"
                    : "مرفوض"}
                </span>
                <ChevronDown size={14} className={`text-white/40 transition-transform duration-200 ${isStatusDropdownOpen ? "rotate-180 text-brand-accent" : ""}`} />
              </button>

              {isStatusDropdownOpen && (
                <div className="absolute right-0 left-0 mt-2 bg-[#0c0e18] border border-brand-border/80 rounded-xl shadow-2xl p-1.5 z-[9999] animate-scale-in text-right">
                  {[
                    { value: "all", label: "كل الحالات" },
                    { value: "pending", label: "قيد المراجعة" },
                    { value: "approved", label: "تمت الموافقة" },
                    { value: "rejected", label: "مرفوض" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      dir="rtl"
                      onClick={() => {
                        setSelectedStatus(opt.value);
                        setIsStatusDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2 rounded-lg text-right text-xs transition-colors block cursor-pointer font-cairo ${
                        selectedStatus === opt.value
                          ? "text-brand-accent bg-brand-accent/15 font-bold"
                          : "text-white/80 hover:bg-white/5"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Wallet Dropdown */}
          {activeTab === "fund-requests" && (
            <div className="space-y-1 w-full sm:w-[180px] relative" ref={walletDropdownRef}>
              <label className="text-[10px] font-bold text-brand-dim/60 block pr-1 font-cairo">المحفظة</label>
              <button
                type="button"
                dir="rtl"
                onClick={() => {
                  setIsWalletDropdownOpen(!isWalletDropdownOpen);
                  setIsStatusDropdownOpen(false);
                  setIsAgentDropdownOpen(false);
                }}
                className="w-full h-10 px-3.5 rounded-xl bg-[#070912] border border-brand-border/60 text-white text-xs focus:outline-none focus:border-brand-accent transition-all cursor-pointer flex items-center justify-between"
              >
                <span className={`text-white text-xs font-cairo ${selectedWallets.length === 1 ? "font-mono" : ""}`}>
                  {selectedWallets.length === 0 ? "كل المحافظ" : `${selectedWallets.length} محفظة`}
                </span>
                <ChevronDown size={14} className={`text-white/40 transition-transform duration-200 ${isWalletDropdownOpen ? "rotate-180 text-brand-accent" : ""}`} />
              </button>

              {isWalletDropdownOpen && (
                <div className="absolute right-0 left-0 mt-2 bg-[#0c0e18] border border-brand-border/80 rounded-xl shadow-2xl p-3 z-[9999] animate-scale-in text-right max-h-56 overflow-y-auto custom-scrollbar" dir="rtl">
                  <span className="block text-xs font-semibold text-brand-dim/60 mb-2 border-b border-brand-border/20 pb-1.5 font-cairo">تصفية حسب المحفظة</span>
                  <button
                    type="button"
                    dir="rtl"
                    onClick={() => {
                      setSelectedWallets([]);
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer text-brand-accent hover:text-brand-accent/80 font-bold font-cairo"
                  >
                    <span className="text-xs text-right">تحديد الكل</span>
                    {selectedWallets.length === 0 || selectedWallets.length === walletsList.length ? (
                      <div className="w-4 h-4 rounded border border-brand-accent bg-brand-accent/20 flex items-center justify-center shrink-0">
                        <Check size={12} className="text-brand-accent stroke-[3]" />
                      </div>
                    ) : (
                      <div className="w-4 h-4 rounded border border-white/25 bg-white/[0.02] shrink-0" />
                    )}
                  </button>

                  <div className="border-t border-brand-border/10 my-1.5" />

                  <div className="space-y-0.5">
                    {walletsList.map((ph) => {
                      const isSelected = selectedWallets.includes(ph);
                      return (
                        <button
                          key={ph}
                          type="button"
                          dir="rtl"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedWallets(selectedWallets.filter((w) => w !== ph));
                            } else {
                              setSelectedWallets([...selectedWallets, ph]);
                            }
                          }}
                          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer text-white/80 transition-colors w-full"
                        >
                          <span className="text-xs font-mono text-right">{ph}</span>
                          {isSelected ? (
                            <div className="w-4 h-4 rounded border border-brand-accent bg-brand-accent/20 flex items-center justify-center shrink-0">
                              <Check size={12} className="text-brand-accent stroke-[3]" />
                            </div>
                          ) : (
                            <div className="w-4 h-4 rounded border border-white/25 bg-white/[0.02] shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="h-10 px-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] w-full sm:w-auto shrink-0 font-cairo mr-auto"
            >
              <RotateCcw size={13} />
              <span>إعادة ضبط كل الفلاتر</span>
            </button>
          )}
        </div>

        {/* Row 2: Date Filters Section */}
        {activeTab === "fund-requests" ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-3 border-t border-brand-border/25">
            {/* Filter 1: Action Timestamp in System (توقيت الإجراء) */}
            <div className="bg-[#070914]/90 border border-brand-border/60 hover:border-cyan-500/30 rounded-xl p-3.5 space-y-3 transition-colors">
              <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                    <Clock size={13} />
                  </div>
                  <span className="text-xs font-bold text-white font-cairo">توقيت الإجراء (تاريخ التنفيذ في السيستم)</span>
                </div>
                <span className="text-[10px] font-semibold text-cyan-400/80 bg-cyan-500/10 px-2 py-0.5 rounded-md font-cairo">
                  عمود: توقيت الإجراء
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="space-y-1 flex-1 min-w-[125px]">
                  <label className="text-[10px] font-bold text-brand-dim/60 block pr-1 font-cairo">من</label>
                  <input
                    type="date"
                    value={actionStartDate}
                    onChange={(e) => setActionStartDate(e.target.value)}
                    onClick={(e) => e.currentTarget.showPicker?.()}
                    className="w-full h-9 px-2.5 rounded-lg bg-[#0c0f1d] border border-brand-border/60 text-white font-inter text-xs focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20 transition-all cursor-pointer"
                  />
                </div>
                <div className="space-y-1 flex-1 min-w-[125px]">
                  <label className="text-[10px] font-bold text-brand-dim/60 block pr-1 font-cairo">إلى</label>
                  <input
                    type="date"
                    value={actionEndDate}
                    onChange={(e) => setActionEndDate(e.target.value)}
                    onClick={(e) => e.currentTarget.showPicker?.()}
                    className="w-full h-9 px-2.5 rounded-lg bg-[#0c0f1d] border border-brand-border/60 text-white font-inter text-xs focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20 transition-all cursor-pointer"
                  />
                </div>
              </div>

              {/* Quick presets for Action date */}
              <div className="flex items-center gap-1.5 pt-1">
                <span className="text-[10px] text-brand-dim/60 pl-1 font-cairo">سريع:</span>
                <button
                  type="button"
                  onClick={() => handleSetQuickDate("action", "today")}
                  className={`px-2.5 py-1 rounded-md text-[10.5px] font-bold transition-all cursor-pointer border ${
                    actionStartDate === todayStr && actionEndDate === todayStr
                      ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                      : "bg-[#0c0f1d] border-brand-border/40 text-brand-dim hover:text-white hover:border-brand-border"
                  }`}
                >
                  اليوم
                </button>
                <button
                  type="button"
                  onClick={() => handleSetQuickDate("action", "yesterday")}
                  className={`px-2.5 py-1 rounded-md text-[10.5px] font-bold transition-all cursor-pointer border ${
                    actionStartDate === yesterdayStr && actionEndDate === yesterdayStr
                      ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                      : "bg-[#0c0f1d] border-brand-border/40 text-brand-dim hover:text-white hover:border-brand-border"
                  }`}
                >
                  أمس
                </button>
                <button
                  type="button"
                  onClick={() => handleSetQuickDate("action", "thisMonth")}
                  className={`px-2.5 py-1 rounded-md text-[10.5px] font-bold transition-all cursor-pointer border ${
                    actionStartDate === startOfMonthStr && actionEndDate === todayStr
                      ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                      : "bg-[#0c0f1d] border-brand-border/40 text-brand-dim hover:text-white hover:border-brand-border"
                  }`}
                >
                  هذا الشهر
                </button>
                {(actionStartDate || actionEndDate) && (
                  <button
                    type="button"
                    onClick={() => handleSetQuickDate("action", "clear")}
                    className="px-2 py-1 rounded-md text-[10px] text-red-400 hover:text-red-300 transition-colors mr-auto font-cairo cursor-pointer"
                  >
                    مسح
                  </button>
                )}
              </div>
            </div>

            {/* Filter 2: Manual Transaction Date (التاريخ المدخل يدوي) */}
            <div className="bg-[#070914]/90 border border-brand-border/60 hover:border-brand-accent/30 rounded-xl p-3.5 space-y-3 transition-colors">
              <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-brand-accent/15 border border-brand-accent/30 flex items-center justify-center text-brand-accent shrink-0">
                    <Calendar size={13} />
                  </div>
                  <span className="text-xs font-bold text-white font-cairo">التاريخ (المدخل يدوي عند قبول الطلب)</span>
                </div>
                <span className="text-[10px] font-semibold text-brand-accent/90 bg-brand-accent/10 px-2 py-0.5 rounded-md font-cairo">
                  عمود: التاريخ
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="space-y-1 flex-1 min-w-[125px]">
                  <label className="text-[10px] font-bold text-brand-dim/60 block pr-1 font-cairo">من</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    onClick={(e) => e.currentTarget.showPicker?.()}
                    className="w-full h-9 px-2.5 rounded-lg bg-[#0c0f1d] border border-brand-border/60 text-white font-inter text-xs focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent/20 transition-all cursor-pointer"
                  />
                </div>
                <div className="space-y-1 flex-1 min-w-[125px]">
                  <label className="text-[10px] font-bold text-brand-dim/60 block pr-1 font-cairo">إلى</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    onClick={(e) => e.currentTarget.showPicker?.()}
                    className="w-full h-9 px-2.5 rounded-lg bg-[#0c0f1d] border border-brand-border/60 text-white font-inter text-xs focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent/20 transition-all cursor-pointer"
                  />
                </div>
              </div>

              {/* Quick presets for Manual date */}
              <div className="flex items-center gap-1.5 pt-1">
                <span className="text-[10px] text-brand-dim/60 pl-1 font-cairo">سريع:</span>
                <button
                  type="button"
                  onClick={() => handleSetQuickDate("manual", "today")}
                  className={`px-2.5 py-1 rounded-md text-[10.5px] font-bold transition-all cursor-pointer border ${
                    startDate === todayStr && endDate === todayStr
                      ? "bg-brand-accent/20 border-brand-accent text-brand-accent"
                      : "bg-[#0c0f1d] border-brand-border/40 text-brand-dim hover:text-white hover:border-brand-border"
                  }`}
                >
                  اليوم
                </button>
                <button
                  type="button"
                  onClick={() => handleSetQuickDate("manual", "yesterday")}
                  className={`px-2.5 py-1 rounded-md text-[10.5px] font-bold transition-all cursor-pointer border ${
                    startDate === yesterdayStr && endDate === yesterdayStr
                      ? "bg-brand-accent/20 border-brand-accent text-brand-accent"
                      : "bg-[#0c0f1d] border-brand-border/40 text-brand-dim hover:text-white hover:border-brand-border"
                  }`}
                >
                  أمس
                </button>
                <button
                  type="button"
                  onClick={() => handleSetQuickDate("manual", "thisMonth")}
                  className={`px-2.5 py-1 rounded-md text-[10.5px] font-bold transition-all cursor-pointer border ${
                    startDate === startOfMonthStr && endDate === todayStr
                      ? "bg-brand-accent/20 border-brand-accent text-brand-accent"
                      : "bg-[#0c0f1d] border-brand-border/40 text-brand-dim hover:text-white hover:border-brand-border"
                  }`}
                >
                  هذا الشهر
                </button>
                {(startDate || endDate) && (
                  <button
                    type="button"
                    onClick={() => handleSetQuickDate("manual", "clear")}
                    className="px-2 py-1 rounded-md text-[10px] text-red-400 hover:text-red-300 transition-colors mr-auto font-cairo cursor-pointer"
                  >
                    مسح
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Other Tabs: Daily Expenses, Edit Requests, Custody Transfers */
          <div className="pt-3 border-t border-brand-border/25 flex flex-wrap items-end gap-4">
            <div className="space-y-1 w-full sm:w-[160px]">
              <label className="text-[10px] font-bold text-brand-dim/60 block pr-1 font-cairo">تاريخ البدء (من)</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                onClick={(e) => e.currentTarget.showPicker?.()}
                className="w-full h-10 px-3 rounded-xl bg-[#070912] border border-brand-border/60 text-white font-inter text-xs focus:outline-none focus:border-brand-accent transition-all cursor-pointer"
              />
            </div>
            <div className="space-y-1 w-full sm:w-[160px]">
              <label className="text-[10px] font-bold text-brand-dim/60 block pr-1 font-cairo">تاريخ الانتهاء (إلى)</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                onClick={(e) => e.currentTarget.showPicker?.()}
                className="w-full h-10 px-3 rounded-xl bg-[#070912] border border-brand-border/60 text-white font-inter text-xs focus:outline-none focus:border-brand-accent transition-all cursor-pointer"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-brand-dim/60 block pr-1 font-cairo">فترات سريعة</label>
              <div className="flex items-center gap-1.5 h-10">
                <button
                  type="button"
                  onClick={() => handleSetQuickDate("manual", "today")}
                  className={`px-3 py-2 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                    startDate === todayStr && endDate === todayStr
                      ? "bg-brand-accent/20 border-brand-accent text-brand-accent"
                      : "border-brand-border/50 bg-[#070912] hover:bg-brand-accent/15 text-white/80"
                  }`}
                >
                  اليوم
                </button>
                <button
                  type="button"
                  onClick={() => handleSetQuickDate("manual", "yesterday")}
                  className="px-3 py-2 rounded-lg border border-brand-border/50 bg-[#070912] hover:bg-brand-accent/15 text-white/80 text-xs font-bold transition-all cursor-pointer"
                >
                  أمس
                </button>
                <button
                  type="button"
                  onClick={() => handleSetQuickDate("manual", "thisMonth")}
                  className="px-3 py-2 rounded-lg border border-brand-border/50 bg-[#070912] hover:bg-brand-accent/15 text-white/80 text-xs font-bold transition-all cursor-pointer"
                >
                  هذا الشهر
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs Controller */}
      <div className="flex items-center gap-2 border-b border-brand-border/40 pb-px overflow-x-auto scrollbar-none">
        {/* Tab 1: Fund Requests (Always visible) */}
        <button
          onClick={() => {
            setActiveTab("fund-requests");
            setSelectedStatus("all");
          }}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all duration-300 cursor-pointer shrink-0 ${
            activeTab === "fund-requests"
              ? "border-brand-accent text-white"
              : "border-transparent text-white/50 hover:text-white/80"
          }`}
        >
          <Coins size={16} />
          <span>طلبات الأموال للجميع</span>
        </button>

        {/* Tab 1.5: Fund Edits (Dedicated to Accountant & Admin) */}
        {(userRole === "admin" || userRole === "accountant") && (
          <button
            onClick={() => {
              setActiveTab("fund-edits");
              setSelectedStatus("all");
            }}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all duration-300 cursor-pointer shrink-0 ${
              activeTab === "fund-edits"
                ? "border-amber-400 text-white"
                : "border-transparent text-white/50 hover:text-white/80"
            }`}
          >
            <History size={16} className={activeTab === "fund-edits" ? "text-amber-400" : ""} />
            <span>سجل طلبات الأموال المعدلة</span>
            {editedFundRequests.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-inter bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {editedFundRequests.length}
              </span>
            )}
          </button>
        )}

        {/* Other Tabs (Hidden for Accountant) */}
        {userRole !== "accountant" && (
          <>
            <button
              onClick={() => {
                setActiveTab("daily-expenses");
                setSelectedStatus("all");
              }}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all duration-300 cursor-pointer shrink-0 ${
                activeTab === "daily-expenses"
                  ? "border-brand-accent text-white"
                  : "border-transparent text-white/50 hover:text-white/80"
              }`}
            >
              <ClipboardList size={16} />
              <span>المصاريف والتحويلات للجميع</span>
            </button>
            <button
              onClick={() => {
                setActiveTab("edit-requests");
                setSelectedStatus("all");
              }}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all duration-300 cursor-pointer shrink-0 ${
                activeTab === "edit-requests"
                  ? "border-brand-accent text-white"
                  : "border-transparent text-white/50 hover:text-white/80"
              }`}
            >
              <FileEdit size={16} />
              <span>طلبات التعديل للجميع</span>
            </button>
            <button
              onClick={() => {
                setActiveTab("custody-transfers");
                setSelectedStatus("all");
              }}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-sm transition-all duration-300 cursor-pointer shrink-0 ${
                activeTab === "custody-transfers"
                  ? "border-brand-accent text-white"
                  : "border-transparent text-white/50 hover:text-white/80"
              }`}
            >
              <ArrowRightLeft size={16} />
              <span>تحويلات العهدة بين الزملاء</span>
            </button>
          </>
        )}
      </div>

      {/* Tab Panels */}
      <div className="bg-[#0a0d16]/60 border border-brand-border/40 backdrop-blur-xl rounded-3xl p-6 shadow-xl animate-fade-in min-h-[350px] relative">
        {isLoading && (
          <div className="absolute inset-0 bg-[#0a0d16]/80 backdrop-blur-md flex items-center justify-center rounded-3xl z-50 transition-all duration-300">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="relative w-16 h-16 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-brand-accent/10 border-t-brand-accent border-r-brand-accent/50 animate-spin" style={{ animationDuration: "1s" }} />
                <div className="w-8 h-8 rounded-lg bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.25)] animate-pulse">
                  <span className="text-white text-[10px] font-bold font-inter">SP</span>
                </div>
              </div>
              <div className="space-y-1">
                <span className="block text-xs font-bold text-white font-cairo">جاري تحديث البيانات...</span>
                <span className="block text-[10px] text-brand-dim animate-pulse font-cairo">يتم الآن مزامنة تفاصيل المصاريف والتحويلات</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: Fund Requests */}
        {activeTab === "fund-requests" && (
          <div className="space-y-5">
            {/* Header Title & Summary Card */}
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white">تاريخ طلبات شحن الرصيد والعهدة للجميع</h3>

              {/* Transferred Funds Summary Card */}
              {(() => {
                const isActionDateActive = Boolean(actionStartDate || actionEndDate);
                const isManualDateActive = Boolean(startDate || endDate);

                let summaryTitle = "إجمالي المبالغ المحولة المعتمدة للجميع";
                let summarySubtitle = "عرض عام لكافة التحويلات المعتمدة (بدون تحديد تاريخ)";

                if (selectedStatus && selectedStatus !== "all" && selectedStatus !== "approved") {
                  summaryTitle = "إجمالي المبالغ المحولة المعتمدة";
                  summarySubtitle = "تم اختيار حالة طلبات غير معتمدة (المبالغ المحولة = 0 ج.م)";
                } else if (isActionDateActive && !isManualDateActive) {
                  if (actionStartDate && actionEndDate && actionStartDate === actionEndDate) {
                    summaryTitle = `إجمالي التحويلات المنفذة بتاريخ إجرائي (${actionStartDate})`;
                  } else if (actionStartDate && actionEndDate) {
                    summaryTitle = `إجمالي التحويلات المنفذة بين (${actionStartDate}) و (${actionEndDate})`;
                  } else if (actionStartDate) {
                    summaryTitle = `إجمالي التحويلات المنفذة منذ (${actionStartDate})`;
                  } else {
                    summaryTitle = `إجمالي التحويلات المنفذة حتى (${actionEndDate})`;
                  }
                  summarySubtitle = "محسوبة بناءً على توقيت الإجراء الفعلي في السيستم (عمود توقيت الإجراء)";
                } else if (isManualDateActive && !isActionDateActive) {
                  if (startDate && endDate && startDate === endDate) {
                    summaryTitle = `إجمالي التحويلات لتاريخ معاملة (${startDate})`;
                  } else if (startDate && endDate) {
                    summaryTitle = `إجمالي التحويلات لتاريخ معاملة بين (${startDate}) و (${endDate})`;
                  } else if (startDate) {
                    summaryTitle = `إجمالي التحويلات لتاريخ معاملة منذ (${startDate})`;
                  } else {
                    summaryTitle = `إجمالي التحويلات لتاريخ معاملة حتى (${endDate})`;
                  }
                  summarySubtitle = "محسوبة بناءً على التاريخ المدخل يدوي عند قبول الطلب (عمود التاريخ)";
                } else if (isActionDateActive && isManualDateActive) {
                  summaryTitle = "إجمالي التحويلات المطابقة للفلاتر المزدوجة";
                  summarySubtitle = "مفلترة حسب توقيت الإجراء وتاريخ المعاملة المدخل يدوي معاً";
                }

                return (
                  <div className="bg-gradient-to-r from-[#0c1024]/90 via-[#0e1630]/90 to-[#0c1024]/90 border border-brand-border/60 rounded-2xl p-5 shadow-xl space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-brand-border/20 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-brand-accent/15 border border-brand-accent/30 flex items-center justify-center text-brand-accent shrink-0 shadow-[0_0_15px_rgba(139,92,246,0.2)]">
                          <Coins size={22} />
                        </div>
                        <div>
                          <h4 className="text-sm md:text-base font-bold text-white">
                            {summaryTitle}
                          </h4>
                          <span className="text-[11px] text-brand-dim">
                            {summarySubtitle}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <span className="text-[11px] text-brand-dim block font-medium">إجمالي المبالغ المحولة:</span>
                          <span className="text-2xl md:text-3xl font-black text-brand-accent font-inter tracking-tight">
                            {(fundSummary?.totalTransferred || 0).toLocaleString("en-US")}{" "}
                            <span className="text-xs text-brand-dim font-normal font-cairo">ج.م</span>
                          </span>
                        </div>
                        <div className="h-9 w-px bg-brand-border/40 hidden sm:block" />
                        <div className="text-right hidden sm:block">
                          <span className="text-[11px] text-brand-dim block font-medium">عدد التحويلات:</span>
                          <span className="text-lg font-bold text-white font-inter">
                            {fundSummary?.approvedCount || 0}{" "}
                            <span className="text-[11px] text-brand-dim font-cairo">عملية</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Recipients Breakdown: "وبعت لمين ولمين ولمين وبعتلهم قد ايه" */}
                    {fundSummary?.recipients && fundSummary.recipients.length > 0 ? (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-brand-dim/80">
                            المستلمون في هذه الفترة ({fundSummary.recipients.length} موظف):
                          </span>
                          <span className="text-[11px] text-brand-dim/60">
                            (اضغط على اسم الموظف لتصفيته حصراً)
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2.5 max-h-48 overflow-y-auto custom-scrollbar pt-0.5">
                          {fundSummary.recipients.map((rec: any) => {
                            const isSelected = selectedAgentIds.length === 1 && selectedAgentIds[0] === rec.agentId;
                            return (
                              <button
                                key={rec.agentId}
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedAgentIds([]);
                                  } else {
                                    setSelectedAgentIds([rec.agentId]);
                                  }
                                }}
                                className={`rounded-xl px-3.5 py-2.5 flex items-center gap-2.5 transition-all text-xs cursor-pointer border text-right ${
                                  isSelected
                                    ? "bg-brand-accent/20 border-brand-accent text-white shadow-[0_0_12px_rgba(139,92,246,0.25)]"
                                    : "bg-[#070914]/80 border-brand-border/50 hover:border-brand-accent/40 text-white/90 hover:bg-[#070914]"
                                }`}
                              >
                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                                  isSelected ? "bg-brand-accent text-white" : "bg-white/5 border border-white/10 text-brand-accent"
                                }`}>
                                  <User size={12} />
                                </div>
                                <div>
                                  <span className="font-bold block text-xs">{rec.agentName}</span>
                                  <div className="flex items-center gap-1.5 text-[10px] mt-0.5">
                                    <span className="font-bold text-emerald-400 font-inter">
                                      {rec.totalAmount.toLocaleString("en-US")} ج.م
                                    </span>
                                    {rec.count > 1 && (
                                      <span className="text-brand-dim font-inter">({rec.count} عمليات)</span>
                                    )}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-brand-dim/60 py-1">
                        لا توجد مبالغ محولة معتمدة مسجلة في هذا النطاق الزمني.
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
            
            {fundRequests.length === 0 ? (
              renderEmptyState("لم يتم العثور على أي طلبات أموال مطابقة للفلاتر.", Coins)
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-right border-collapse min-w-[900px]">
                  <thead>
                    <tr className="border-b border-brand-border/40 text-brand-dim/70 text-xs font-bold">
                      <th className="pb-3.5 pr-2 font-bold">الموظف</th>
                      <th className="pb-3.5 font-bold">التاريخ</th>
                      <th className="pb-3.5 font-bold">محفظة الاستلام</th>
                      <th className="pb-3.5 font-bold">المبلغ المطلوب</th>
                      <th className="pb-3.5 font-bold">المبلغ المحول</th>
                      <th className="pb-3.5 font-bold text-center">حالة الطلب</th>
                      <th className="pb-3.5 pl-2 font-bold text-left">توقيت الإجراء</th>
                      {(userRole === "admin" || userRole === "accountant") && (
                        <th className="pb-3.5 pl-2 font-bold text-center">الإجراءات</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {fundRequests.map((req) => {
                      const history = extractFundRequestEditHistory(req.multi_wallet_data);
                      const isHistoryExpanded = Boolean(expandedEditHistoryIds[req.id]);
                      const wallets = extractFundRequestWallets(req);

                      return (
                        <React.Fragment key={req.id}>
                          <tr className="border-b border-brand-border/20 text-xs text-white/80 hover:bg-white/[0.02] transition-colors">
                            <td className="py-4 pr-2 font-bold text-brand-accent capitalize">
                              <div className="flex items-center gap-1.5">
                                {history.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => toggleExpandHistory(req.id)}
                                    className="cursor-pointer text-amber-400 hover:text-amber-300 transition-colors"
                                    title="يوجد تعديلات على هذا الطلب"
                                  >
                                    <ChevronDown
                                      size={14}
                                      className={`transition-transform duration-200 ${
                                        isHistoryExpanded ? "rotate-180" : ""
                                      }`}
                                    />
                                  </button>
                                )}
                                <span>{req.agent?.full_name || "-"}</span>
                              </div>
                            </td>
                            <td className="py-4 font-medium font-inter">
                              {formatDate(req.request_date)}
                            </td>
                            <td className="py-4 font-mono font-bold text-white/90">
                              {req.is_multi_wallet ? (
                                <div className="space-y-0.5 text-right font-cairo">
                                  <span className="inline-block px-1.5 py-0.5 text-[8.5px] font-extrabold bg-brand-accent/20 text-brand-accent border border-brand-accent/30 rounded-md mb-1">
                                    متعدد المحافظ
                                  </span>
                                  {wallets.length > 0 ? (
                                    wallets.map((item: any, idx: number) => (
                                      <div key={idx} className="text-[10px] font-semibold text-white/80">
                                        {item.phone_number} {item.esim_number ? `(${item.esim_number})` : ""}
                                      </div>
                                    ))
                                  ) : (
                                    <span>{req.wallet?.phone_number || "-"}</span>
                                  )}
                                </div>
                              ) : (
                                req.wallet?.phone_number || "-"
                              )}
                            </td>
                            <td className="py-4 font-bold text-white font-inter text-sm">
                              <div>{Number(req.amount_requested).toLocaleString("en-US")}</div>
                              {req.is_multi_wallet && wallets.length > 0 && (
                                <div className="text-[9.5px] text-brand-dim/80 space-y-0.5 mt-0.5 font-normal font-inter">
                                  {wallets.map((item: any, idx: number) => (
                                    <div key={idx}>
                                      {Number(item.amount_requested || item.amount).toLocaleString("en-US")}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="py-4 font-inter">
                              {req.status === "approved" ? (
                                <div>
                                  <span className="font-bold text-brand-accent text-sm">
                                    {Number(req.amount_approved).toLocaleString("en-US")}
                                  </span>
                                  {req.is_multi_wallet && wallets.length > 0 && (
                                    <div className="text-[9.5px] text-brand-dim/80 space-y-0.5 mt-0.5 font-normal">
                                      {wallets.map((item: any, idx: number) => (
                                        <div key={idx}>
                                          {Number(item.amount_approved).toLocaleString("en-US")}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {history.length > 0 && (
                                    <div>
                                      <button
                                        type="button"
                                        onClick={() => toggleExpandHistory(req.id)}
                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 cursor-pointer hover:bg-amber-500/25 transition-all mt-1"
                                        title="تم تعديل هذا الطلب - اضغط لعرض تفاصيل التعديل"
                                      >
                                        <History size={10} />
                                        <span>مُعدّل ({history.length})</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-brand-dim/30">—</span>
                              )}
                            </td>
                            <td className="py-4 text-center">
                              {renderStatusBadge(
                                req.status,
                                req.reviewer?.full_name,
                                req.approved_at
                              )}
                            </td>
                            <td className="py-4 pl-2 font-mono text-brand-dim/70 text-left">
                              {req.status !== "pending" && req.approved_at ? (
                                <span>{formatDateTime(req.approved_at)}</span>
                              ) : (
                                <span className="text-brand-dim/30">قيد الانتظار...</span>
                              )}
                            </td>

                            {/* Actions Column */}
                            {(userRole === "admin" || userRole === "accountant") && (
                              <td className="py-4 pl-2 text-center" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-center gap-1.5">
                                  {req.status === "approved" && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditModal(req)}
                                      className="px-2.5 py-1.5 rounded-lg bg-brand-accent/15 hover:bg-brand-accent/25 border border-brand-accent/30 text-brand-accent font-bold text-[11px] transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-sm"
                                      title="تعديل المبلغ أو التاريخ أو إضافة ملاحظات"
                                    >
                                      <Edit3 size={12} />
                                      <span>تعديل</span>
                                    </button>
                                  )}
                                  {history.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => toggleExpandHistory(req.id)}
                                      className={`px-2 py-1.5 rounded-lg border text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                                        isHistoryExpanded
                                          ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                                          : "bg-white/5 hover:bg-white/10 border-white/10 text-brand-dim hover:text-white"
                                      }`}
                                      title="عرض سجل التعديلات"
                                    >
                                      <History size={12} className="text-amber-400" />
                                      <ChevronDown
                                        size={11}
                                        className={`transition-transform duration-200 ${
                                          isHistoryExpanded ? "rotate-180 text-amber-400" : ""
                                        }`}
                                      />
                                    </button>
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>

                          {/* Expanded Full Audit Timeline Row inside fund-requests tab */}
                          {isHistoryExpanded && history.length > 0 && (
                            <tr className="bg-[#0b0e1e]/95 border-b border-brand-border/40 animate-fade-in">
                              <td colSpan={(userRole === "admin" || userRole === "accountant") ? 8 : 7} className="p-4 md:p-5">
                                <div className="space-y-3.5 max-w-4xl mr-auto ml-0">
                                  <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                                    <div className="flex items-center gap-2">
                                      <History size={16} className="text-amber-400" />
                                      <h5 className="text-xs font-bold text-white">
                                        سجل التعديلات والتدقيق المحاسبي لهذا الطلب ({history.length} تعديل)
                                      </h5>
                                    </div>
                                    {req.status === "approved" && (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEditModal(req)}
                                        className="text-xs font-bold text-brand-accent hover:text-brand-accent/80 transition-colors flex items-center gap-1 cursor-pointer"
                                      >
                                        <Edit3 size={12} />
                                        <span>إجراء تعديل إضافي</span>
                                      </button>
                                    )}
                                  </div>

                                  <div className="space-y-2.5">
                                    {history.map((record: FundRequestEditRecord, idx: number) => {
                                      const isLatest = idx === 0;
                                      return (
                                        <div
                                          key={record.id || idx}
                                          className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                                            isLatest
                                              ? "bg-[#0e142a] border-amber-500/35"
                                              : "bg-[#070914] border-brand-border/25"
                                          }`}
                                        >
                                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2">
                                            <div className="flex items-center gap-2">
                                              <span
                                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                  isLatest
                                                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                                    : "bg-white/10 text-white/60 border border-white/15"
                                                }`}
                                              >
                                                {isLatest ? "التعديل الأحدث" : `تعديل سابق (#${history.length - idx})`}
                                              </span>
                                              <span className="font-bold text-white text-xs">
                                                بواسطة:{" "}
                                                <span className="text-brand-accent">{record.editor_name}</span>{" "}
                                                <span className="text-[9.5px] text-brand-dim font-normal font-cairo">
                                                  ({record.editor_role === "admin" ? "المدير" : "المحاسب"})
                                                </span>
                                              </span>
                                            </div>
                                            <div className="text-[11px] font-mono text-brand-dim/70 flex items-center gap-1">
                                              <Clock size={11} />
                                              <span>{formatDateTime(record.edited_at)}</span>
                                            </div>
                                          </div>

                                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                                            <div className="bg-[#05060f]/60 p-2 rounded-lg border border-brand-border/20">
                                              <span className="text-[10px] text-brand-dim block font-bold">المبلغ المعتمد:</span>
                                              <div className="flex items-center gap-2 font-inter mt-0.5">
                                                <span className="line-through text-red-400 font-bold">
                                                  {record.old_amount.toLocaleString("en-US")}
                                                </span>
                                                <span className="text-white/40">←</span>
                                                <span className="text-emerald-400 font-bold">
                                                  {record.new_amount.toLocaleString("en-US")} ج.م
                                                </span>
                                              </div>
                                              <span className="text-[9.5px] text-brand-dim/70 block mt-0.5">
                                                الفرق: {record.difference > 0 ? `+${record.difference.toLocaleString("en-US")}` : record.difference.toLocaleString("en-US")} ج.م
                                              </span>
                                            </div>

                                            <div className="bg-[#05060f]/60 p-2 rounded-lg border border-brand-border/20">
                                              <span className="text-[10px] text-brand-dim block font-bold">تاريخ المعاملة:</span>
                                              <div className="flex items-center gap-1.5 font-inter text-xs mt-0.5">
                                                {record.old_date !== record.new_date ? (
                                                  <>
                                                    <span className="line-through text-white/50">{record.old_date}</span>
                                                    <span className="text-white/40">←</span>
                                                    <span className="text-brand-accent font-bold">{record.new_date}</span>
                                                  </>
                                                ) : (
                                                  <span className="text-white font-medium">{record.new_date}</span>
                                                )}
                                              </div>
                                            </div>

                                            <div className="bg-[#05060f]/60 p-2 rounded-lg border border-brand-border/20">
                                              <span className="text-[10px] text-brand-dim block font-bold flex items-center gap-1">
                                                <MessageSquare size={10} className="text-amber-400" />
                                                <span>ملاحظات التعديل:</span>
                                              </span>
                                              <p className="text-white text-xs leading-relaxed font-cairo mt-0.5 bg-white/[0.02] p-1 rounded">
                                                {record.notes}
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
                {renderPaginationControls(fundPage, fundCount, Math.ceil(fundCount / 20), setFundPage)}
              </div>
            )}
          </div>
        )}

        {/* TAB 1.5: Fund Edits (Dedicated to Accountant & Admin) */}
        {(userRole === "admin" || userRole === "accountant") && activeTab === "fund-edits" && (
          <div className="space-y-5 animate-fade-in">
            {/* Header Title & Summary Card */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <History size={18} className="text-amber-400" />
                    <span>سجل طلبات شحن الرصيد المعدلة</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      خاص بالمحاسب والمدير
                    </span>
                  </h3>
                  <p className="text-xs text-brand-dim mt-0.5">
                    متابعة وتصفية كافة طلبات الأموال التي تم تعديل قيمتها أو بياناتها بعد الموافقة، مع تفاصيل القائم بالتعديل والملاحظات وفروق المبالغ.
                  </p>
                </div>
              </div>

              {/* Summary KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-[#0e1224] to-[#070914] border border-brand-border/40 p-4 rounded-2xl flex items-center gap-3 shadow-lg">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                    <History size={20} />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-brand-dim/70 block">عدد العمليات المعدلة</span>
                    <span className="text-lg font-extrabold text-white font-inter">
                      {filteredEditedFundRequests.length}
                    </span>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-[#0e1224] to-[#070914] border border-brand-border/40 p-4 rounded-2xl flex items-center gap-3 shadow-lg">
                  <div className="w-10 h-10 rounded-xl bg-brand-accent/15 border border-brand-accent/30 flex items-center justify-center text-brand-accent shrink-0">
                    <Coins size={20} />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-brand-dim/70 block">إجمالي المبالغ الحالية المعتمدة</span>
                    <span className="text-lg font-extrabold text-brand-accent font-inter">
                      {filteredEditedFundRequests
                        .reduce((sum, r) => sum + (Number(r.amount_approved) || 0), 0)
                        .toLocaleString("en-US")}{" "}
                      ج.م
                    </span>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-[#0e1224] to-[#070914] border border-brand-border/40 p-4 rounded-2xl flex items-center gap-3 shadow-lg">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-brand-dim/70 block">إجمالي الفروق المحاسبية</span>
                    {(() => {
                      const netDiff = filteredEditedFundRequests.reduce((sum, r) => {
                        const history = extractFundRequestEditHistory(r.multi_wallet_data);
                        const first = history[history.length - 1];
                        const original = first ? first.old_amount : Number(r.amount_approved) || 0;
                        return sum + ((Number(r.amount_approved) || 0) - original);
                      }, 0);
                      return (
                        <span
                          className={`text-lg font-extrabold font-inter ${
                            netDiff < 0
                              ? "text-amber-400"
                              : netDiff > 0
                              ? "text-emerald-400"
                              : "text-white"
                          }`}
                        >
                          {netDiff > 0 ? `+${netDiff.toLocaleString("en-US")}` : `${netDiff.toLocaleString("en-US")}`} ج.م
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Search & Quick Filter */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#070912]/80 border border-brand-border/30 p-3 rounded-xl">
                <div className="relative flex-1 min-w-[240px]">
                  <input
                    type="text"
                    value={editsSearchTerm}
                    onChange={(e) => setEditsSearchTerm(e.target.value)}
                    placeholder="بحث باسم الموظف، الملاحظات، أو القائم بالتعديل..."
                    className="w-full bg-[#0c0e1a] border border-brand-border/50 rounded-lg pl-3 pr-9 py-2 text-xs text-white placeholder-brand-dim/40 focus:outline-none focus:border-brand-accent transition-all text-right font-cairo"
                  />
                  <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30" />
                </div>
                {editsSearchTerm && (
                  <button
                    type="button"
                    onClick={() => setEditsSearchTerm("")}
                    className="text-xs text-brand-dim hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <X size={12} />
                    <span>مسح البحث</span>
                  </button>
                )}
              </div>
            </div>

            {filteredEditedFundRequests.length === 0 ? (
              renderEmptyState("لا توجد طلبات أموال معدلة مطابقة للفلاتر.", History)
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-right border-collapse min-w-[950px]">
                  <thead>
                    <tr className="border-b border-brand-border/40 text-brand-dim/70 text-xs font-bold">
                      <th className="pb-3.5 pr-2 font-bold">الموظف</th>
                      <th className="pb-3.5 font-bold">تاريخ المعاملة</th>
                      <th className="pb-3.5 font-bold">المبلغ قبل التعديل</th>
                      <th className="pb-3.5 font-bold">المبلغ الحالي</th>
                      <th className="pb-3.5 font-bold">صافي الفرق</th>
                      <th className="pb-3.5 font-bold">آخر تعديل بواسطة</th>
                      <th className="pb-3.5 font-bold">توقيت التعديل</th>
                      <th className="pb-3.5 font-bold">ملاحظات المحاسب</th>
                      <th className="pb-3.5 pl-2 font-bold text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEditedFundRequests.map((req) => {
                      const history = extractFundRequestEditHistory(req.multi_wallet_data);
                      const latestEdit = history[0];
                      const firstEdit = history[history.length - 1];
                      const originalBeforeEdits = firstEdit ? firstEdit.old_amount : Number(req.amount_requested);
                      const currentAmount = Number(req.amount_approved) || 0;
                      const netDiff = currentAmount - originalBeforeEdits;
                      const isExpanded = Boolean(expandedEditHistoryIds[req.id]);

                      return (
                        <React.Fragment key={req.id}>
                          <tr
                            onClick={() => toggleExpandHistory(req.id)}
                            className={`border-b border-brand-border/20 text-xs text-white/80 hover:bg-white/[0.03] transition-colors cursor-pointer ${
                              isExpanded ? "bg-white/[0.02]" : ""
                            }`}
                          >
                            <td className="py-4 pr-2 font-bold text-brand-accent capitalize">
                              <div className="flex items-center gap-2">
                                <ChevronDown
                                  size={14}
                                  className={`text-brand-dim transition-transform duration-200 ${
                                    isExpanded ? "rotate-180 text-brand-accent" : ""
                                  }`}
                                />
                                <span>{req.agent?.full_name || "-"}</span>
                              </div>
                            </td>
                            <td className="py-4 font-medium font-inter">
                              {formatDate(req.request_date)}
                            </td>
                            <td className="py-4 font-bold font-inter text-brand-dim/80">
                              <span className="line-through decoration-red-400/60">
                                {originalBeforeEdits.toLocaleString("en-US")}
                              </span>{" "}
                              ج.م
                            </td>
                            <td className="py-4 font-bold font-inter text-white text-sm">
                              <span className="text-emerald-400">
                                {currentAmount.toLocaleString("en-US")}
                              </span>{" "}
                              ج.م
                            </td>
                            <td className="py-4 font-inter">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold ${
                                  netDiff < 0
                                    ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                                    : netDiff > 0
                                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                    : "bg-white/10 text-white/70 border border-white/20"
                                }`}
                              >
                                {netDiff < 0 ? (
                                  <ArrowDownRight size={11} />
                                ) : netDiff > 0 ? (
                                  <ArrowUpRight size={11} />
                                ) : null}
                                <span>
                                  {netDiff > 0
                                    ? `+${netDiff.toLocaleString("en-US")}`
                                    : netDiff.toLocaleString("en-US")}{" "}
                                  ج.م
                                </span>
                              </span>
                            </td>
                            <td className="py-4 font-cairo">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-white text-xs">
                                  {latestEdit?.editor_name || "محاسب"}
                                </span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-brand-accent/20 text-brand-accent border border-brand-accent/30 font-semibold">
                                  {latestEdit?.editor_role === "admin" ? "مدير" : "محاسب"}
                                </span>
                              </div>
                            </td>
                            <td className="py-4 font-mono text-brand-dim/70 text-xs">
                              {latestEdit?.edited_at ? formatDateTime(latestEdit.edited_at) : "-"}
                            </td>
                            <td
                              className="py-4 max-w-[200px] truncate text-brand-dim text-xs"
                              title={latestEdit?.notes || ""}
                            >
                              {latestEdit?.notes ? (
                                <span className="italic text-white/90">"{latestEdit.notes}"</span>
                              ) : (
                                <span className="text-brand-dim/30">—</span>
                              )}
                            </td>
                            <td className="py-4 pl-2 text-center" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(req)}
                                  className="px-2.5 py-1.5 rounded-lg bg-brand-accent/15 hover:bg-brand-accent/25 border border-brand-accent/30 text-brand-accent font-bold text-[11px] transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-sm"
                                  title="تعديل هذا الطلب"
                                >
                                  <Edit3 size={12} />
                                  <span>تعديل إضافي</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleExpandHistory(req.id)}
                                  className="px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-brand-dim hover:text-white text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
                                  title="عرض أو إخفاء السجل التفصيلي"
                                >
                                  <History size={12} className="text-amber-400" />
                                  <span className="font-inter text-[10px] text-amber-400 font-bold">
                                    {history.length}
                                  </span>
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Expanded Full Audit Timeline Row */}
                          {isExpanded && (
                            <tr className="bg-[#0b0e1e]/90 border-b border-brand-border/30 animate-fade-in">
                              <td colSpan={9} className="p-4 md:p-6">
                                <div className="space-y-4">
                                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                                    <div className="flex items-center gap-2">
                                      <History size={16} className="text-amber-400" />
                                      <h4 className="text-sm font-bold text-white">
                                        سجل التدقيق والتعديلات بالكامل ({history.length} تعديل)
                                      </h4>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditModal(req)}
                                      className="px-3 py-1.5 rounded-xl bg-brand-accent hover:bg-brand-accent/90 text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(139,92,246,0.3)]"
                                    >
                                      <Edit3 size={13} />
                                      <span>تعديل هذا الطلب الآن</span>
                                    </button>
                                  </div>

                                  <div className="space-y-3">
                                    {history.map((record: FundRequestEditRecord, idx: number) => {
                                      const isLatest = idx === 0;
                                      return (
                                        <div
                                          key={record.id || idx}
                                          className={`p-4 rounded-xl border transition-all ${
                                            isLatest
                                              ? "bg-[#0e142a] border-amber-500/40 shadow-md"
                                              : "bg-[#080a14] border-brand-border/30"
                                          }`}
                                        >
                                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2.5 mb-2.5">
                                            <div className="flex items-center gap-2">
                                              <span
                                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                  isLatest
                                                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                                    : "bg-white/10 text-white/60 border border-white/15"
                                                }`}
                                              >
                                                {isLatest ? "التعديل الأحدث" : `تعديل سابق (#${history.length - idx})`}
                                              </span>
                                              <span className="text-xs font-bold text-white flex items-center gap-1">
                                                <span>بواسطة:</span>
                                                <span className="text-brand-accent">{record.editor_name}</span>
                                                <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-white/5 text-brand-dim border border-white/10">
                                                  {record.editor_role === "admin" ? "مدير النظام" : "المحاسب"}
                                                </span>
                                              </span>
                                            </div>
                                            <div className="text-[11px] font-mono text-brand-dim/80 flex items-center gap-1.5">
                                              <Clock size={12} />
                                              <span>{formatDateTime(record.edited_at)}</span>
                                            </div>
                                          </div>

                                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                            {/* Amount change */}
                                            <div className="bg-[#05060f]/60 p-2.5 rounded-lg border border-brand-border/20 space-y-1">
                                              <span className="text-[10px] text-brand-dim block font-bold">
                                                المبلغ المعتمد:
                                              </span>
                                              <div className="flex items-center gap-2 font-inter">
                                                <span className="line-through text-red-400 font-bold">
                                                  {record.old_amount.toLocaleString("en-US")}
                                                </span>
                                                <span className="text-white/40">←</span>
                                                <span className="text-emerald-400 font-bold">
                                                  {record.new_amount.toLocaleString("en-US")} ج.م
                                                </span>
                                              </div>
                                              <span className="text-[10px] text-brand-dim/70 block">
                                                الفرق:{" "}
                                                {record.difference > 0
                                                  ? `+${record.difference.toLocaleString("en-US")}`
                                                  : record.difference.toLocaleString("en-US")}{" "}
                                                ج.م
                                              </span>
                                            </div>

                                            {/* Date change */}
                                            <div className="bg-[#05060f]/60 p-2.5 rounded-lg border border-brand-border/20 space-y-1">
                                              <span className="text-[10px] text-brand-dim block font-bold">
                                                تاريخ المعاملة:
                                              </span>
                                              <div className="flex items-center gap-2 font-inter text-xs">
                                                {record.old_date !== record.new_date ? (
                                                  <>
                                                    <span className="line-through text-white/50">
                                                      {record.old_date}
                                                    </span>
                                                    <span className="text-white/40">←</span>
                                                    <span className="text-brand-accent font-bold">
                                                      {record.new_date}
                                                    </span>
                                                  </>
                                                ) : (
                                                  <span className="text-white font-medium">
                                                    {record.new_date} (لم يتغير)
                                                  </span>
                                                )}
                                              </div>
                                            </div>

                                            {/* Notes */}
                                            <div className="bg-[#05060f]/60 p-2.5 rounded-lg border border-brand-border/20 space-y-1 md:col-span-1">
                                              <span className="text-[10px] text-brand-dim block font-bold flex items-center gap-1">
                                                <MessageSquare size={11} className="text-brand-accent" />
                                                <span>ملاحظات وتفاصيل التعديل:</span>
                                              </span>
                                              <p className="text-white text-xs leading-relaxed font-cairo bg-white/[0.02] p-1.5 rounded border border-white/5">
                                                {record.notes}
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Daily Expenses (Hidden for Accountant) */}
        {userRole !== "accountant" && activeTab === "daily-expenses" && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-white mb-2">سجل المصاريف والتحويلات للجميع</h3>
            
            {dailyExpenses.length === 0 ? (
              renderEmptyState("لم يتم العثور على أي تقارير مصاريف مطابقة للفلاتر.", ClipboardList)
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-right border-collapse min-w-[800px]">
                  <thead>
                    <tr className="border-b border-brand-border/40 text-brand-dim/70 text-xs font-bold">
                      <th className="pb-3.5 pr-2 font-bold">الموظف</th>
                      <th className="pb-3.5 font-bold">تاريخ التقرير</th>
                      <th className="pb-3.5 font-bold">توتال الكاش</th>
                      <th className="pb-3.5 font-bold">إجمالي المصروفات</th>
                      {marketingSystems.length > 0 ? (
                        marketingSystems.map((sys) => (
                          <th key={sys.id} className="pb-3.5 font-bold">{sys.name}</th>
                        ))
                      ) : (
                        <>
                          <th className="pb-3.5 font-bold">تسويق 1</th>
                          <th className="pb-3.5 font-bold">تسويق 2</th>
                          <th className="pb-3.5 font-bold">تسويق 3</th>
                        </>
                      )}
                      <th className="pb-3.5 pl-2 font-bold">شخصي / نثريات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyExpenses.map((exp) => (
                      <tr
                        key={exp.id}
                        onClick={() => openExpenseDetailModal(exp)}
                        className="border-b border-brand-border/20 text-xs text-white/80 hover:bg-white/[0.02] transition-colors cursor-pointer active:scale-[0.99]"
                      >
                        <td className="py-4 pr-2 font-bold text-brand-accent capitalize">
                          {exp.agent?.full_name || "-"}
                        </td>
                        <td className="py-4 font-medium">
                          {formatDate(exp.expense_date)}
                        </td>
                        <td className="py-4 font-inter text-white/90">
                          {Number(exp.total_cash || 0).toLocaleString("en-US")}
                        </td>
                        <td className="py-4 font-inter text-white/90">
                          {Number(exp.total_amount).toLocaleString("en-US")}
                        </td>
                        {marketingSystems.length > 0 ? (
                          marketingSystems.map((sys) => {
                            const val = exp.marketing_expenses?.[sys.id] ?? (
                              sys.id === '11111111-1111-1111-1111-111111111111' ? exp.marketing_1 :
                              sys.id === '22222222-2222-2222-2222-222222222222' ? exp.marketing_2 :
                              sys.id === '33333333-3333-3333-3333-333333333333' ? exp.marketing_3 : 0
                            );
                            return (
                              <td key={sys.id} className="py-4 font-inter text-white/90">
                                {Number(val || 0).toLocaleString("en-US")}
                              </td>
                            );
                          })
                        ) : (
                          <>
                            <td className="py-4 font-inter text-white/90">
                              {Number(exp.marketing_1).toLocaleString("en-US")}
                            </td>
                            <td className="py-4 font-inter text-white/90">
                              {Number(exp.marketing_2).toLocaleString("en-US")}
                            </td>
                            <td className="py-4 font-inter text-white/90">
                              {Number(exp.marketing_3).toLocaleString("en-US")}
                            </td>
                          </>
                        )}
                        <td className="py-4 pl-2 font-inter text-white/90">
                          {Number(exp.personal_expense).toLocaleString("en-US")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {renderPaginationControls(expensePage, expenseCount, Math.ceil(expenseCount / 20), setExpensePage)}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Edit Requests (Hidden for Accountant) */}
        {userRole !== "accountant" && activeTab === "edit-requests" && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-white mb-2">طلبات تعديل المصاريف للجميع</h3>
            
            {editRequests.length === 0 ? (
              renderEmptyState("لم يتم العثور على أي طلبات تعديل مطابقة للفلاتر.", FileEdit)
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-right border-collapse min-w-[850px]">
                  <thead>
                    <tr className="border-b border-brand-border/40 text-brand-dim/70 text-xs font-bold">
                      <th className="pb-3.5 pr-2 font-bold">الموظف</th>
                      <th className="pb-3.5 font-bold">تاريخ الطلب</th>
                      <th className="pb-3.5 font-bold">تاريخ التقرير الأصلي</th>
                      <th className="pb-3.5 font-bold">التعديلات المقترحة</th>
                      <th className="pb-3.5 font-bold text-center">حالة الطلب</th>
                      <th className="pb-3.5 pl-2 font-bold text-left">توقيت الإجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editRequests.map((req) => {
                      const changes = req.requested_changes || {};
                      
                      return (
                        <tr
                          key={req.id}
                          className="border-b border-brand-border/20 text-xs text-white/80 hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="py-4 pr-2 font-bold text-brand-accent capitalize">
                            {req.agent?.full_name || "-"}
                          </td>
                          <td className="py-4 font-medium">
                            {formatDateTime(req.created_at)}
                          </td>
                          <td className="py-4 font-bold text-white">
                            {req.expense?.expense_date ? formatDate(req.expense.expense_date) : "-"}
                          </td>
                          <td className="py-4 max-w-[280px]">
                            <div className="flex flex-col gap-1 bg-[#090b16]/40 border border-brand-border/20 rounded-xl p-2.5 text-[10px] leading-relaxed text-brand-dim">
                              {changes.total_cash !== undefined && (
                                <div>توتال كاش جديد: <strong className="text-white font-inter">{changes.total_cash}</strong></div>
                              )}
                              {changes.cash_after_expenses !== undefined && (
                                <div>كاش بعد الخصم جديد: <strong className="text-white font-inter">{changes.cash_after_expenses}</strong></div>
                              )}
                              <div>إجمالي جديد: <strong className="text-white font-inter">{changes.total_amount}</strong></div>
                              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 mt-1 border-t border-brand-border/10 pt-1">
                                {marketingSystems.length > 0 ? (
                                  marketingSystems.map((sys) => {
                                    const val = changes.marketing_expenses?.[sys.id] ?? (
                                      sys.id === '11111111-1111-1111-1111-111111111111' ? changes.marketing_1 :
                                      sys.id === '22222222-2222-2222-2222-222222222222' ? changes.marketing_2 :
                                      sys.id === '33333333-3333-3333-3333-333333333333' ? changes.marketing_3 : undefined
                                    );
                                    if (val === undefined) return null;
                                    return (
                                      <div key={sys.id}>{sys.name}: <span className="font-inter">{val}</span></div>
                                    );
                                  })
                                ) : (
                                  <>
                                    <div>تسويق 1: <span className="font-inter">{changes.marketing_1}</span></div>
                                    <div>تسويق 2: <span className="font-inter">{changes.marketing_2}</span></div>
                                    <div>تسويق 3: <span className="font-inter">{changes.marketing_3}</span></div>
                                  </>
                                )}
                                <div>شخصي: <span className="font-inter">{changes.personal_expense}</span></div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 text-center">
                            {renderStatusBadge(
                              req.status,
                              req.reviewer?.full_name,
                              req.reviewed_at
                            )}
                          </td>
                          <td className="py-4 pl-2 font-mono text-brand-dim/70 text-left">
                            {req.status !== "pending" && req.reviewed_at ? (
                              <span>{formatDateTime(req.reviewed_at)}</span>
                            ) : (
                              <span className="text-brand-dim/30">قيد الانتظار...</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {renderPaginationControls(editPage, editCount, Math.ceil(editCount / 20), setEditPage)}
              </div>
            )}
          </div>
        )}

        {/* 4. Custody Transfers Tab Content (Hidden for Accountant) */}
        {userRole !== "accountant" && activeTab === "custody-transfers" && (
          <div className="space-y-4 animate-fade-in">
            {custodyTransfers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {custodyTransfers.map((item: any) => (
                  <div
                    key={item.id}
                    className="bg-[#0c0f1d] border border-brand-border/40 hover:border-brand-accent/40 p-5 rounded-2xl transition-all relative overflow-hidden flex flex-col justify-between gap-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      {/* Amount & Badge */}
                      <div className="space-y-1 text-right">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full border bg-brand-accent/15 text-brand-accent border-brand-accent/30">
                          <ArrowRightLeft size={13} />
                          <span>تحويل عهدة بين زملاء</span>
                        </span>
                        <div className="pt-2">
                          <span className="text-xs text-brand-dim block font-medium">المبلغ المحول:</span>
                          <span className="text-xl font-extrabold text-white font-inter">
                            {item.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      {/* Sender & Receiver details */}
                      <div className="text-right space-y-1.5">
                        <div className="text-xs">
                          <span className="text-brand-dim/60 block font-medium">المُحوِّـل (من الموظف):</span>
                          <span className="text-sm font-bold text-white font-cairo">
                            {item.from_agent?.full_name || "موظف"}
                          </span>
                        </div>
                        <div className="text-xs border-t border-brand-border/20 pt-1.5">
                          <span className="text-brand-dim/60 block font-medium">المستلم (إلى الموظف):</span>
                          <span className="text-sm font-bold text-white font-cairo">
                            {item.to_agent?.full_name || "موظف"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Footer: Date & Time */}
                    <div className="border-t border-brand-border/20 pt-3 flex items-center justify-between text-[11px] text-brand-dim/60">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-brand-accent/70" />
                        <span>{formatDateTime(item.created_at)}</span>
                      </div>
                      <span className="font-mono text-[10px] opacity-40">#{item.id.slice(0, 8)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              renderEmptyState("لا توجد سجلات تحويلات عهدة بين الموظفين مطابقة للبحث", ArrowRightLeft)
            )}

            {renderPaginationControls(
              transferPage,
              transferCount,
              Math.ceil(transferCount / 20),
              setTransferPage
            )}
          </div>
        )}

      {/* Detailed Expense Modal Popup */}
      {selectedExpense && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-[#020208]/80 backdrop-blur-md transition-opacity"
            onClick={() => setSelectedExpense(null)}
          />

          {/* Modal Container */}
          <div className="relative w-full max-w-5xl bg-[#090c1e] border border-brand-border/60 rounded-[28px] shadow-2xl p-6 md:p-8 overflow-y-auto max-h-[90vh] text-right font-cairo animate-scale-in text-white" dir="rtl">
            
            {/* Close Icon */}
            <button
              onClick={() => setSelectedExpense(null)}
              className="absolute top-5 left-5 text-white/40 hover:text-white transition-colors cursor-pointer w-8 h-8 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center"
            >
              <X size={16} />
            </button>

            {/* Header */}
            <div className="border-b border-brand-border/20 pb-4 mb-6">
              <h3 className="text-lg md:text-xl font-extrabold text-white flex items-center gap-2.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-accent opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-accent"></span>
                </span>
                <span>تفاصيل التقرير المالي ليوم {formatDate(selectedExpense.expense_date)}</span>
              </h3>
              {selectedExpense.agent?.full_name && (
                <p className="text-xs text-brand-dim mt-1.5">
                  بواسطة الموظف: <strong className="text-brand-accent">{selectedExpense.agent.full_name}</strong>
                </p>
              )}
            </div>

            {/* Content Responsive Grid */}
            <div className={`grid grid-cols-1 ${selectedExpense.wallets_balances && selectedExpense.wallets_balances.length > 0 ? "lg:grid-cols-3" : ""} gap-6`}>
              
              {/* Right Side: Form details */}
              <div className={`${selectedExpense.wallets_balances && selectedExpense.wallets_balances.length > 0 ? "lg:col-span-2" : "col-span-1 lg:col-span-3"} space-y-6`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  
                  {/* Date */}
                  <div className="space-y-1.5">
                    <span className="block text-[11px] font-semibold text-brand-dim opacity-70">تاريخ اليوم المالي</span>
                    <div className="bg-[#070814]/40 border border-brand-border/40 px-4 py-3 rounded-xl text-xs text-white/90 font-inter text-left dir-ltr select-all">
                      {selectedExpense.expense_date}
                    </div>
                  </div>

                  {/* Total Cash */}
                  <div className="space-y-1.5">
                    <span className="block text-[11px] font-semibold text-brand-dim">توتال الكاش</span>
                    <div className="bg-[#070814]/40 border border-brand-border/40 px-4 py-3 rounded-xl text-xs text-white/90 font-inter text-left dir-ltr">
                      {Number(selectedExpense.total_cash || 0).toLocaleString("en-US")}
                    </div>
                  </div>

                  {/* Personal Expense */}
                  <div className="space-y-1.5">
                    <span className="block text-[11px] font-semibold text-brand-dim">المصاريف الشخصية</span>
                    <div className="bg-[#070814]/40 border border-brand-border/40 px-4 py-3 rounded-xl text-xs text-white/90 font-inter text-left dir-ltr">
                      {Number(selectedExpense.personal_expense || 0).toLocaleString("en-US")}
                    </div>
                  </div>

                  {/* Marketing Systems */}
                  {marketingSystems.length > 0 ? (
                    marketingSystems.map((sys) => {
                      const val = selectedExpense.marketing_expenses?.[sys.id] ?? (
                        sys.id === '11111111-1111-1111-1111-111111111111' ? selectedExpense.marketing_1 :
                        sys.id === '22222222-2222-2222-2222-222222222222' ? selectedExpense.marketing_2 :
                        sys.id === '33333333-3333-3333-3333-333333333333' ? selectedExpense.marketing_3 : 0
                      );
                      return (
                        <div key={sys.id} className="space-y-1.5">
                          <span className="block text-[11px] font-semibold text-brand-dim">{sys.name}</span>
                          <div className="bg-[#070814]/40 border border-brand-border/40 px-4 py-3 rounded-xl text-xs text-white/90 font-inter text-left dir-ltr">
                            {Number(val || 0).toLocaleString("en-US")}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        <span className="block text-[11px] font-semibold text-brand-dim">مصاريف ماركتنج 1</span>
                        <div className="bg-[#070814]/40 border border-brand-border/40 px-4 py-3 rounded-xl text-xs text-white/90 font-inter text-left dir-ltr">
                          {Number(selectedExpense.marketing_1 || 0).toLocaleString("en-US")}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <span className="block text-[11px] font-semibold text-brand-dim">مصاريف ماركتنج 2</span>
                        <div className="bg-[#070814]/40 border border-brand-border/40 px-4 py-3 rounded-xl text-xs text-white/90 font-inter text-left dir-ltr">
                          {Number(selectedExpense.marketing_2 || 0).toLocaleString("en-US")}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <span className="block text-[11px] font-semibold text-brand-dim">مصاريف ماركتنج 3</span>
                        <div className="bg-[#070814]/40 border border-brand-border/40 px-4 py-3 rounded-xl text-xs text-white/90 font-inter text-left dir-ltr">
                          {Number(selectedExpense.marketing_3 || 0).toLocaleString("en-US")}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Total Expenses */}
                  <div className="space-y-1.5">
                    <span className="block text-[11px] font-semibold text-brand-dim">إجمالي مصروفات المحفظة (التوتال)</span>
                    <div className="bg-[#070814]/40 border border-brand-border/40 px-4 py-3 rounded-xl text-xs text-white/90 font-inter text-left dir-ltr">
                      {Number(selectedExpense.total_amount || 0).toLocaleString("en-US")}
                    </div>
                  </div>



                </div>

                {/* Transfers List */}
                <div className="border-t border-brand-border/20 pt-5 mt-4 space-y-3">
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <Coins size={14} className="text-brand-accent" />
                    <span>تحويلات العهدة للزملاء في هذا اليوم</span>
                  </h4>
                  {isLoadingTransfers ? (
                    <div className="py-6 flex items-center justify-center gap-2 text-xs text-brand-dim">
                      <Loader2 size={14} className="animate-spin text-brand-accent" />
                      <span>جاري تحميل التحويلات...</span>
                    </div>
                  ) : expenseTransfers.length === 0 ? (
                    <div className="text-xs text-brand-dim/50 py-3 bg-[#070814]/20 rounded-xl text-center">
                      لم يتم تسجيل أي تحويلات عهدة للزملاء في هذا اليوم.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {expenseTransfers.map((t) => (
                        <div key={t.id} className="flex justify-between items-center bg-[#070814]/30 border border-brand-border/30 px-4 py-3 rounded-xl text-xs">
                          <span className="font-semibold text-white/90">{t.toAgentName}</span>
                          <span className="font-bold text-brand-accent font-inter">{Number(t.amount).toLocaleString("en-US")} ج.م</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Left Side: Wallets list snapshot (1/3 col) */}
              {selectedExpense.wallets_balances && selectedExpense.wallets_balances.length > 0 && (
                <div className="lg:col-span-1 bg-[#090b16]/95 border border-brand-border/40 p-5 rounded-2xl flex flex-col justify-between min-h-[350px]">
                  <div>
                    <h4 className="text-xs font-bold text-white border-b border-brand-border/20 pb-2.5 mb-3 flex items-center gap-2">
                      <Wallet size={14} className="text-brand-accent" />
                      <span>رصيد كاش المحافظ المسجل (Snapshot)</span>
                    </h4>

                    {(() => {
                      const wallets = selectedExpense.wallets_balances || [];

                      // Calculate totals
                      let wTotal = 0;
                      let wWithoutCamp = 0;
                      wallets.forEach((w: any) => {
                        const bal = Number(w.balance) || 0;
                        wTotal += bal;
                        if (w.wallet_id !== "campaign") {
                          wWithoutCamp += bal;
                        }
                      });

                      return (
                        <div className="space-y-2.5">
                          <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1.5 custom-scrollbar">
                            {wallets.map((w: any) => {
                              const isCamp = w.wallet_id === "campaign";
                              const label = isCamp ? "كامبين" : w.phone_number;
                              return (
                                <div
                                  key={w.wallet_id}
                                  className={`px-3 py-2 rounded-xl flex items-center justify-between text-xs border ${
                                    isCamp
                                      ? "bg-brand-accent/5 border-brand-accent/30 text-brand-accent"
                                      : "bg-[#070814]/60 border-brand-border/25 text-white/95"
                                  }`}
                                >
                                  <span className={`flex items-center gap-1.5 ${isCamp ? "font-bold font-cairo" : "font-mono select-all font-semibold"}`}>
                                    {isCamp && <Megaphone size={12} />}
                                    {label}
                                  </span>
                                  <span className="font-bold font-inter">
                                    {Number(w.balance || 0).toLocaleString("en-US")}
                                  </span>
                                </div>
                              );
                            })}
                          </div>

                          {/* Totals */}
                          <div className="border-t border-brand-border/20 pt-3 mt-3 space-y-2">
                            <div className="flex justify-between items-center text-[11px] font-semibold text-brand-dim">
                              <span>إجمالي كاش المحافظ:</span>
                              <span className="text-white font-inter font-bold">
                                {wTotal.toLocaleString("en-US")}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-[11px] font-semibold text-brand-dim">
                              <span>إجمالي الكاش بدون الكامبين:</span>
                              <span className="text-brand-accent font-inter font-bold">
                                {wWithoutCamp.toLocaleString("en-US")}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

            </div>

            {/* Footer Action */}
            <div className="pt-4 border-t border-brand-border/10 mt-6">
              <button
                onClick={() => setSelectedExpense(null)}
                type="button"
                className="w-full py-2.5 bg-brand-border/30 hover:bg-brand-border/50 text-white font-bold rounded-xl text-xs transition-all cursor-pointer text-center"
              >
                إغلاق التفاصيل
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Edit Fund Request Modal Dialog */}
      {editingFundRequest && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#05060f]/85 backdrop-blur-md p-4 animate-fade-in text-right">
          <div className="w-full max-w-lg bg-brand-card border border-brand-border rounded-[24px] shadow-2xl p-6 md:p-8 space-y-5 relative animate-scale-in max-h-[90vh] overflow-y-auto custom-scrollbar">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-brand-border/20 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit3 size={20} className="text-brand-accent" />
                <span>تعديل طلب شحن الرصيد المعتمد</span>
              </h3>
              <button
                type="button"
                onClick={() => !isSubmittingEdit && setEditingFundRequest(null)}
                disabled={isSubmittingEdit}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </div>

            {/* Error Message */}
            {editModalError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs flex items-center gap-2 animate-fade-in font-cairo">
                <AlertCircle size={15} className="shrink-0" />
                <span>{editModalError}</span>
              </div>
            )}

            {/* Request Summary Info */}
            <div className="bg-[#070814]/70 border border-brand-border/40 rounded-xl p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-brand-dim">الموظف:</span>
                <span className="font-bold text-white">{editingFundRequest.agent?.full_name || "-"}</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-brand-dim">المبلغ المطلوب الأصلي:</span>
                <span className="font-bold font-inter text-brand-accent">
                  {Number(editingFundRequest.amount_requested).toLocaleString("en-US")} ج.م
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-brand-dim">المبلغ المعتمد الحالي:</span>
                <span className="font-bold font-inter text-emerald-400">
                  {Number(editingFundRequest.amount_approved || editingFundRequest.amount_requested).toLocaleString("en-US")} ج.م
                </span>
              </div>
            </div>

            {/* Multi-Wallet inputs if multi-wallet */}
            {editingFundRequest.is_multi_wallet && Array.isArray(editingFundRequest.multi_wallet_data) && (
              <div className="space-y-3 p-4 bg-[#070814]/40 border border-brand-border/45 rounded-xl">
                <label className="text-xs font-bold text-white mb-1 font-cairo block">
                  المبلغ المعتمد الجديد لكل محفظة:
                </label>
                <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                  {extractFundRequestWallets(editingFundRequest).map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-3 text-xs bg-[#070814]/60 p-2.5 rounded-lg border border-brand-border/20"
                    >
                      <div className="text-right font-mono font-bold text-white">
                        <span>{item.phone_number}</span>
                        {item.esim_number && (
                          <span className="text-[10px] text-brand-dim block font-cairo">({item.esim_number})</span>
                        )}
                      </div>
                      <div className="relative w-36">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          disabled={isSubmittingEdit}
                          value={editMultiAmounts[item.wallet_id] ?? ""}
                          onChange={(e) => {
                            const newAmounts: Record<string, string> = { ...editMultiAmounts, [item.wallet_id]: e.target.value };
                            setEditMultiAmounts(newAmounts);
                            let total = 0;
                            extractFundRequestWallets(editingFundRequest).forEach((w: any) => {
                              const val = parseFloat(w.wallet_id === item.wallet_id ? e.target.value : (newAmounts[w.wallet_id] || "0"));
                              if (!isNaN(val)) total += val;
                            });
                            setEditAmount(String(total));
                          }}
                          className="w-full bg-[#05060f] border border-brand-border/80 rounded-lg pl-3 pr-8 py-2 text-xs text-white focus:outline-none focus:border-brand-accent text-left dir-ltr font-inter"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 font-bold text-[10px] font-inter">
                          ج.م
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Total / Single Amount Input */}
            <div className="space-y-2 text-right">
              <label className="block text-[13px] font-medium text-brand-dim font-cairo">
                {editingFundRequest.is_multi_wallet ? "إجمالي المبلغ المعتمد الجديد (ج.م)" : "المبلغ المعتمد الجديد (ج.م)"}
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  disabled={isSubmittingEdit || editingFundRequest.is_multi_wallet}
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className={`w-full bg-[#070814]/80 border rounded-xl pl-4 pr-11 py-3 text-sm text-white focus:outline-none transition-all text-left dir-ltr font-inter ${
                    editingFundRequest.is_multi_wallet ? "opacity-75 cursor-not-allowed border-brand-border/40" : "border-brand-border/80 focus:border-brand-accent"
                  }`}
                  placeholder="أدخل المبلغ الجديد..."
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 font-bold text-xs">
                  ج.م
                </span>
              </div>
            </div>

            {/* Transaction Date Input */}
            <div className="space-y-2 text-right">
              <label className="block text-[13px] font-medium text-brand-dim font-cairo">
                تاريخ التحويل / الاعتماد
              </label>
              <div className="relative">
                <input
                  type="date"
                  disabled={isSubmittingEdit}
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  onClick={(e) => e.currentTarget.showPicker?.()}
                  className="w-full bg-[#070814]/80 border border-brand-border/80 rounded-xl pl-4 pr-11 py-3 text-sm text-white focus:outline-none focus:border-brand-accent transition-all text-left dir-ltr font-inter cursor-pointer"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none">
                  <Calendar size={16} />
                </span>
              </div>
            </div>

            {/* Notes / Reason Textarea (MANDATORY) */}
            <div className="space-y-2 text-right">
              <div className="flex items-center justify-between">
                <label className="text-[13px] font-medium text-brand-dim font-cairo flex items-center gap-1.5">
                  <MessageSquare size={14} className="text-amber-400" />
                  <span>ملاحظات وسبب التعديل</span>
                  <span className="text-red-400 font-bold">*</span>
                </label>
                <span className="text-[10px] text-amber-400/90 font-semibold font-cairo">
                  مطلوب لحفظ سجل التدقيق
                </span>
              </div>
              <textarea
                rows={3}
                required
                disabled={isSubmittingEdit}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="اكتب سبب التعديل بالتفصيل (مثال: تم تحويل 30 ألف فقط لعدم توفر رصيد كافي بالمحفظة وقت التحويل)..."
                className="w-full bg-[#070814]/80 border border-brand-border/80 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-brand-accent transition-all font-cairo resize-none leading-relaxed placeholder-brand-dim/40"
              />
            </div>

            {/* Live Difference Impact Preview */}
            {(() => {
              const currentVal = Number(editingFundRequest.amount_approved) || Number(editingFundRequest.amount_requested) || 0;
              const newVal = parseFloat(editAmount || "0");
              const diff = newVal - currentVal;

              if (isNaN(newVal) || newVal <= 0) return null;

              return (
                <div className={`p-3 rounded-xl border text-xs font-cairo flex items-start gap-2.5 transition-all ${
                  diff < 0
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                    : diff > 0
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : "bg-white/5 border-white/10 text-brand-dim"
                }`}>
                  <div className="mt-0.5 shrink-0">
                    {diff < 0 ? <ArrowDownRight size={16} /> : diff > 0 ? <ArrowUpRight size={16} /> : <Info size={16} />}
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-bold">
                      {diff < 0
                        ? `سيتم تخفيض المبلغ بمقدار ${Math.abs(diff).toLocaleString("en-US")} ج.م`
                        : diff > 0
                        ? `سيتم زيادة المبلغ بمقدار ${diff.toLocaleString("en-US")} ج.م`
                        : "المبلغ لم يتغير، سيتم تحديث التاريخ والملاحظات فقط"}
                    </p>
                    <p className="text-[11px] opacity-80">
                      سيتم تسجيل اسمك وتوقيت هذا الإجراء وحفظ الملاحظات في سجل التدقيق التاريخي للطلب.
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Modal Actions */}
            <div className="flex items-center gap-3 pt-4 border-t border-brand-border/20">
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isSubmittingEdit || !editNotes.trim() || !editAmount || parseFloat(editAmount) <= 0}
                className="flex-1 flex items-center justify-center gap-1.5 px-4.5 py-3 bg-brand-accent hover:bg-brand-accent/90 disabled:bg-brand-accent/30 disabled:text-white/40 text-white font-bold rounded-xl transition-all cursor-pointer text-xs active:scale-[0.98] disabled:scale-100 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(139,92,246,0.3)] disabled:shadow-none"
              >
                {isSubmittingEdit ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>جاري حفظ التعديل...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    <span>حفظ وتطبيق التعديل</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => !isSubmittingEdit && setEditingFundRequest(null)}
                disabled={isSubmittingEdit}
                className="px-6 py-3 bg-[#070814]/40 hover:bg-white/5 border border-brand-border/40 text-brand-dim hover:text-white rounded-xl transition-colors cursor-pointer text-xs"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
