"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Coins,
  ClipboardList,
  FileEdit,
  Calendar,
  AlertCircle,
  RotateCcw,
  User,
  ChevronDown,
  Check,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  getAdminFundRequestsPaginated,
  getAdminDailyExpensesPaginated,
  getAdminEditRequestsPaginated,
  getAdminWalletsWithBalances,
} from "@/app/actions/adminOperations";

interface HistoryClientProps {
  initialFundRequests: any[];
  initialFundCount: number;
  initialDailyExpenses: any[];
  initialExpenseCount: number;
  initialEditRequests: any[];
  initialEditCount: number;
  employees: any[];
}

type TabType = "fund-requests" | "daily-expenses" | "edit-requests";

export default function HistoryClient({
  initialFundRequests = [],
  initialFundCount = 0,
  initialDailyExpenses = [],
  initialExpenseCount = 0,
  initialEditRequests = [],
  initialEditCount = 0,
  employees = [],
}: HistoryClientProps) {
  const [activeTab, setActiveTab] = useState<TabType>("fund-requests");

  // Local state for data & counts
  const [fundRequests, setFundRequests] = useState<any[]>(initialFundRequests);
  const [fundCount, setFundCount] = useState<number>(initialFundCount);
  const [fundPage, setFundPage] = useState<number>(1);

  const [dailyExpenses, setDailyExpenses] = useState<any[]>(initialDailyExpenses);
  const [expenseCount, setExpenseCount] = useState<number>(initialExpenseCount);
  const [expensePage, setExpensePage] = useState<number>(1);

  const [editRequests, setEditRequests] = useState<any[]>(initialEditRequests);
  const [editCount, setEditCount] = useState<number>(initialEditCount);
  const [editPage, setEditPage] = useState<number>(1);

  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Sync props to state if props change (e.g. on server navigations)
  useEffect(() => {
    setFundRequests(initialFundRequests);
    setFundCount(initialFundCount);
    setFundPage(1);
  }, [initialFundRequests, initialFundCount]);

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

  // Filters State
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedWallets, setSelectedWallets] = useState<string[]>([]);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [walletsList, setWalletsList] = useState<string[]>([]);

  // Refresh Triggers for Realtime updates
  const [fundRefresh, setFundRefresh] = useState(0);
  const [expenseRefresh, setExpenseRefresh] = useState(0);
  const [editRefresh, setEditRefresh] = useState(0);

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
        status: selectedStatus,
        agentIds: selectedAgentIds.length > 0 ? selectedAgentIds : undefined,
        walletPhoneNumbers: selectedWallets.length > 0 ? selectedWallets : undefined,
      });
      if (isCurrent) {
        if (res.success && res.data) {
          setFundRequests(res.data);
          setFundCount(res.totalCount);
        }
        setIsLoading(false);
      }
    }
    fetchFunds();
    return () => {
      isCurrent = false;
    };
  }, [fundPage, startDate, endDate, selectedStatus, selectedWallets, selectedAgentIds, fundRefresh]);

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

  // Reset page parameters to 1 when filters are changed
  useEffect(() => {
    if (isFirstFundFetch.current && isFirstExpenseFetch.current && isFirstEditFetch.current) {
      return;
    }
    setFundPage(1);
    setExpensePage(1);
    setEditPage(1);
  }, [startDate, endDate, selectedStatus, selectedWallets, selectedAgentIds]);

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
      )
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
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("ar-EG-u-nu-latn", {
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
    setSelectedStatus("all");
    setSelectedWallets([]);
    setSelectedAgentIds([]);
  };

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
      <div className="flex flex-col items-center justify-center gap-1 select-none">
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
    <div className="text-center py-20 text-brand-dim/40 flex flex-col items-center justify-center gap-3 animate-fade-in select-none">
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
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-brand-border/20 select-none" dir="rtl">
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

  return (
    <div className="space-y-6 text-right font-cairo select-none" dir="rtl">
      {/* Page Title */}
      <div className="flex flex-col gap-1 text-right">
        <h1 className="text-2xl md:text-3xl font-extrabold text-white">سجل العمليات العام</h1>
        <p className="text-sm text-brand-dim">متابعة وتصفية كافة المعاملات المالية وتقارير المصروفات الخاصة بجميع الموظفين.</p>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-[#0c0f1d] border border-brand-border/40 p-4 rounded-2xl flex flex-wrap items-end gap-5 w-full">
        
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
            className="w-full h-10 px-3.5 rounded-xl bg-[#070912] border border-brand-border/60 text-white text-xs focus:outline-none focus:border-brand-accent transition-all cursor-pointer flex items-center justify-between select-none"
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

        {/* Start Date */}
        <div className="space-y-1 w-full sm:w-[170px]">
          <label className="text-[10px] font-bold text-brand-dim/60 block pr-1 font-cairo">تاريخ البدء (من)</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            onClick={(e) => e.currentTarget.showPicker()}
            className="w-full h-10 px-3 rounded-xl bg-[#070912] border border-brand-border/60 text-white font-inter text-xs focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent/20 transition-all cursor-pointer"
          />
        </div>

        {/* End Date */}
        <div className="space-y-1 w-full sm:w-[170px]">
          <label className="text-[10px] font-bold text-brand-dim/60 block pr-1 font-cairo">تاريخ الانتهاء (إلى)</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            onClick={(e) => e.currentTarget.showPicker()}
            className="w-full h-10 px-3 rounded-xl bg-[#070912] border border-brand-border/60 text-white font-inter text-xs focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent/20 transition-all cursor-pointer"
          />
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
              className="w-full h-10 px-3.5 rounded-xl bg-[#070912] border border-brand-border/60 text-white text-xs focus:outline-none focus:border-brand-accent transition-all cursor-pointer flex items-center justify-between select-none"
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
              className="w-full h-10 px-3.5 rounded-xl bg-[#070912] border border-brand-border/60 text-white text-xs focus:outline-none focus:border-brand-accent transition-all cursor-pointer flex items-center justify-between select-none"
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
        {(startDate || endDate || selectedStatus !== "all" || selectedWallets.length > 0 || selectedAgentIds.length > 0) && (
          <button
            onClick={handleResetFilters}
            className="h-10 px-5 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10 hover:text-red-300 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98] w-full sm:w-auto shrink-0 font-cairo"
          >
            <RotateCcw size={13} />
            <span>مسح الفلاتر</span>
          </button>
        )}
      </div>

      {/* Tabs Controller */}
      <div className="flex items-center gap-2 border-b border-brand-border/40 pb-px overflow-x-auto scrollbar-none">
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
      </div>

      {/* Tab Panels */}
      <div className="bg-[#0a0d16]/60 border border-brand-border/40 backdrop-blur-xl rounded-3xl p-6 shadow-xl animate-fade-in min-h-[350px] relative">
        {isLoading && (
          <div className="absolute inset-0 bg-[#0a0d16]/60 backdrop-blur-[2px] flex items-center justify-center rounded-3xl z-50 transition-all duration-300">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-brand-accent/20 border-t-brand-accent rounded-full animate-spin"></div>
              <span className="text-xs text-brand-dim/80 font-medium font-cairo">جاري تحميل البيانات...</span>
            </div>
          </div>
        )}

        {/* TAB 1: Fund Requests */}
        {activeTab === "fund-requests" && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-white mb-2">تاريخ طلبات شحن الرصيد والعهدة للجميع</h3>
            
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
                    </tr>
                  </thead>
                  <tbody>
                    {fundRequests.map((req) => (
                      <tr
                        key={req.id}
                        className="border-b border-brand-border/20 text-xs text-white/80 hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="py-4 pr-2 font-bold text-brand-accent capitalize">
                          {req.agent?.full_name || "-"}
                        </td>
                        <td className="py-4 font-medium">
                          {formatDate(req.request_date)}
                        </td>
                        <td className="py-4 font-mono font-bold text-white/90">
                          {req.wallet?.phone_number || "-"}
                        </td>
                        <td className="py-4 font-bold text-white font-inter text-sm">
                          {Number(req.amount_requested).toLocaleString("en-US")} ج.م
                        </td>
                        <td className="py-4">
                          {req.status === "approved" ? (
                            <span className="font-bold text-brand-accent text-sm font-inter">
                              {Number(req.amount_approved).toLocaleString("en-US")} ج.م
                            </span>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
                {renderPaginationControls(fundPage, fundCount, Math.ceil(fundCount / 20), setFundPage)}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Daily Expenses */}
        {activeTab === "daily-expenses" && (
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
                      <th className="pb-3.5 font-bold">الإجمالي اليومي</th>
                      <th className="pb-3.5 font-bold">تسويق 1</th>
                      <th className="pb-3.5 font-bold">تسويق 2</th>
                      <th className="pb-3.5 font-bold">تسويق 3</th>
                      <th className="pb-3.5 pl-2 font-bold">شخصي / نثريات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyExpenses.map((exp) => (
                      <tr
                        key={exp.id}
                        className="border-b border-brand-border/20 text-xs text-white/80 hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="py-4 pr-2 font-bold text-brand-accent capitalize">
                          {exp.agent?.full_name || "-"}
                        </td>
                        <td className="py-4 font-medium">
                          {formatDate(exp.expense_date)}
                        </td>
                        <td className="py-4">
                          <span className="font-bold text-brand-accent text-sm font-inter">
                            {Number(exp.total_amount).toLocaleString("en-US")} ج.م
                          </span>
                        </td>
                        <td className="py-4 font-inter text-white/90">
                          {Number(exp.marketing_1).toLocaleString("en-US")} ج.م
                        </td>
                        <td className="py-4 font-inter text-white/90">
                          {Number(exp.marketing_2).toLocaleString("en-US")} ج.م
                        </td>
                        <td className="py-4 font-inter text-white/90">
                          {Number(exp.marketing_3).toLocaleString("en-US")} ج.م
                        </td>
                        <td className="py-4 pl-2 font-inter text-white/90">
                          {Number(exp.personal_expense).toLocaleString("en-US")} ج.م
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

        {/* TAB 3: Edit Requests */}
        {activeTab === "edit-requests" && (
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
                            <div className="flex flex-col gap-1 bg-white/[0.02] border border-brand-border/20 rounded-xl p-2.5 text-[10px] leading-relaxed text-brand-dim">
                              <div>إجمالي جديد: <strong className="text-white font-inter">{changes.total_amount} ج.م</strong></div>
                              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 mt-1 border-t border-brand-border/10 pt-1">
                                <div>تسويق 1: <span className="font-inter">{changes.marketing_1} ج.م</span></div>
                                <div>تسويق 2: <span className="font-inter">{changes.marketing_2} ج.م</span></div>
                                <div>تسويق 3: <span className="font-inter">{changes.marketing_3} ج.م</span></div>
                                <div>شخصي: <span className="font-inter">{changes.personal_expense} ج.م</span></div>
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

      </div>
    </div>
  );
}
