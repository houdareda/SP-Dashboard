"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Clock,
  TrendingDown,
  Coins,
  Wallet,
  ChevronDown,
  Check,
  RotateCcw,
  User,
  Users,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { getDashboardOverview, DashboardOverviewData } from "@/app/actions/dashboard";

const getAgentBadgeStyle = (name: string) => {
  const cleanName = name.trim().toLowerCase();
  if (cleanName.includes("leader") || cleanName.includes("مدير") || cleanName.includes("admin")) {
    return "bg-blue-500/10 border-blue-500/20 text-blue-400";
  }
  if (cleanName.includes("senior") || cleanName.includes("سينيور")) {
    return "bg-emerald-500/10 border-emerald-500/20 text-emerald-400";
  }
  const colors = [
    "bg-purple-500/10 border-purple-500/20 text-purple-400",
    "bg-amber-500/10 border-amber-500/20 text-amber-400",
    "bg-pink-500/10 border-pink-500/20 text-pink-400",
    "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
    "bg-cyan-500/10 border-cyan-500/20 text-cyan-400",
  ];
  let sum = 0;
  for (let i = 0; i < cleanName.length; i++) {
    sum += cleanName.charCodeAt(i);
  }
  return colors[sum % colors.length];
};

interface EmployeeOption {
  id: string;
  full_name: string;
  role: string;
}

interface DashboardClientProps {
  initialData: DashboardOverviewData;
  employeesList: EmployeeOption[];
}

export default function DashboardClient({
  initialData,
  employeesList = [],
}: DashboardClientProps) {
  const [data, setData] = useState<DashboardOverviewData>(initialData);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Default dates: Start of current month to today
  const getStartOfCurrentMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}-01`;
  };

  const getTodayDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Filter States
  const [startDate, setStartDate] = useState<string>(getStartOfCurrentMonth());
  const [endDate, setEndDate] = useState<string>(getTodayDate());
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [myOnly, setMyOnly] = useState<boolean>(false);

  // Dropdown UI states
  const [isAgentDropdownOpen, setIsAgentDropdownOpen] = useState<boolean>(false);
  const agentDropdownRef = useRef<HTMLDivElement>(null);
  const isFirstRun = useRef<boolean>(true);

  // Sync props to state if initialData changes
  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  // Click outside listener for dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (agentDropdownRef.current && !agentDropdownRef.current.contains(event.target as Node)) {
        setIsAgentDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch updated dashboard aggregates when filters change
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }

    let isCurrent = true;
    async function loadData() {
      setIsLoading(true);
      const res = await getDashboardOverview({
        startDate,
        endDate,
        filterAgentIds: selectedAgentIds,
        myOnly,
      });
      if (isCurrent) {
        if (res.success) {
          setData(res);
        }
        setIsLoading(false);
      }
    }

    loadData();
    return () => {
      isCurrent = false;
    };
  }, [startDate, endDate, selectedAgentIds, myOnly]);

  const handleResetFilters = () => {
    setStartDate(getStartOfCurrentMonth());
    setEndDate(getTodayDate());
    setSelectedAgentIds([]);
    setMyOnly(false);
  };

  // Format Helper for Currency Egyptian Pound
  const formatCurrency = (val: number) => {
    return `${val.toLocaleString("en-US")} ج.م`;
  };

  // Dynamic Date string formatting for Card Subtitles
  const getSelectedMonthName = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("ar-EG", { month: "long", year: "numeric" });
    } catch {
      return "الشهر الحالي";
    }
  };

  const { metrics, charts, role, fullName } = data;

  // Determine role subtitle
  let roleText = "موظف";
  if (role === "admin") roleText = "مدير النظام";
  else if (role === "senioragent") roleText = "سينيور إيجنت";

  return (
    <div className="space-y-6 text-right font-cairo select-none" dir="rtl">
      
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-brand-border/40 pb-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent shrink-0 mt-1 animate-pulse">
            <Clock size={22} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
              <span>لوحة المعلومات الرئيسية</span>
              {(role === "admin" || role === "senioragent") && (
                <span className="text-xs font-semibold text-brand-accent border border-brand-accent/20 bg-brand-accent/5 px-2 py-0.5 rounded-full font-inter">
                  God Mode Overview
                </span>
              )}
            </h1>
            <p className="text-xs text-brand-dim mt-1 font-medium">
              مرحباً بك، <span className="text-white font-bold">{fullName}</span> ({roleText}). إليك ملخص المعاملات المالية والمحفظة الخاصة بك.
            </p>
          </div>
        </div>
      </div>

      {/* Filters Area (Admin & Senior Agent Only) */}
      {(role === "admin" || role === "senioragent") && (
        <div className="backdrop-blur-xl bg-brand-card/95 border border-brand-border/55 p-6 rounded-[24px] shadow-xl relative z-20 flex flex-wrap items-end gap-4 text-right">
          {/* Agent Select Dropdown */}
          <div className="space-y-2 relative w-full sm:w-[280px]" ref={agentDropdownRef}>
            <label className="block text-xs font-semibold text-brand-dim">الموظفين (Agents)</label>
            <div className="relative">
              <button
                type="button"
                dir="rtl"
                onClick={() => setIsAgentDropdownOpen(!isAgentDropdownOpen)}
                disabled={myOnly}
                className={`w-full h-[46px] px-4 rounded-xl bg-[#070912] border transition-all cursor-pointer flex items-center justify-between select-none disabled:opacity-40 disabled:cursor-not-allowed ${
                  isAgentDropdownOpen ? "border-brand-accent shadow-[0_0_10px_rgba(139,92,246,0.2)]" : "border-brand-border/80"
                }`}
              >
                <span className="truncate pr-2 text-white text-xs font-semibold text-right">
                  {selectedAgentIds.length === 0
                    ? "الكل (جميع الموظفين)"
                    : selectedAgentIds.length === employeesList.length
                    ? "الكل (جميع الموظفين)"
                    : selectedAgentIds.length === 1
                    ? employeesList.find((e) => e.id === selectedAgentIds[0])?.full_name || "موظف محدد"
                    : `الموظفون المختارون (${selectedAgentIds.length})`}
                </span>
                <ChevronDown className={`h-4.5 w-4.5 text-white/40 transition-transform duration-300 shrink-0 ${isAgentDropdownOpen ? "rotate-180 text-brand-accent" : ""}`} />
              </button>
            </div>

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
                  {selectedAgentIds.length === 0 || selectedAgentIds.length === employeesList.length ? (
                    <div className="w-4 h-4 rounded border border-brand-accent bg-brand-accent/20 flex items-center justify-center shrink-0">
                      <Check size={12} className="text-brand-accent stroke-[3]" />
                    </div>
                  ) : (
                    <div className="w-4 h-4 rounded border border-white/25 bg-white/[0.02] shrink-0" />
                  )}
                </button>

                <div className="border-t border-brand-border/10 my-1.5" />

                <div className="space-y-0.5">
                  {employeesList.map((emp) => {
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

          {/* Senior Agent My Data Only Toggle */}
          {role === "senioragent" && (
            <div className="flex items-center gap-2 bg-[#070912] border border-brand-border/80 rounded-xl px-3 py-1.5 select-none h-[46px]">
              <span className="text-xs font-bold text-brand-dim">عرض بياناتي فقط</span>
              <button
                type="button"
                onClick={() => {
                  setMyOnly(!myOnly);
                  if (!myOnly) setSelectedAgentIds([]);
                }}
                className={`relative inline-flex h-4.5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  myOnly ? "bg-brand-accent" : "bg-white/[0.08]"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    myOnly ? "-translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          )}

          {/* Reset filters button */}
          {(selectedAgentIds.length > 0 || myOnly) && (
            <button
              onClick={handleResetFilters}
              className="px-3.5 h-[46px] rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10 hover:text-red-300 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
            >
              <RotateCcw size={12} />
              <span>مسح الفلاتر</span>
            </button>
          )}
        </div>
      )}
      {/* Main Grid for Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative min-h-[350px]">
        {isLoading && (
          <div className="absolute inset-0 bg-[#0a0d16]/60 backdrop-blur-[1.5px] flex items-center justify-center rounded-[24px] z-50 transition-all duration-300">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-brand-accent/20 border-t-brand-accent rounded-full animate-spin"></div>
              <span className="text-xs text-brand-dim/80 font-medium font-cairo">جاري تحديث البيانات...</span>
            </div>
          </div>
        )}

        {/* Card 1: Monthly Expenses */}
        <div className="group relative rounded-[24px] bg-brand-card border border-brand-border backdrop-blur-xl p-6 hover:border-brand-accent/30 transition-all duration-300 shadow-[0_4px_24px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_32px_rgba(139,92,246,0.06)] overflow-hidden flex flex-col justify-between">
          <div>
            <div className="absolute -top-[100px] -left-[100px] w-[200px] h-[200px] bg-brand-accent/5 rounded-full blur-[50px] pointer-events-none"></div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-accent/10 border border-brand-border text-brand-accent group-hover:scale-105 transition-transform duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-receipt h-6 w-6" aria-hidden="true">
                  <path d="M12 17V7"></path>
                  <path d="M16 8h-6a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4H8"></path>
                  <path d="M4 3a1 1 0 0 1 1-1 1.3 1.3 0 0 1 .7.2l.933.6a1.3 1.3 0 0 0 1.4 0l.934-.6a1.3 1.3 0 0 1 1.4 0l.933.6a1.3 1.3 0 0 0 1.4 0l.933-.6a1.3 1.3 0 0 1 1.4 0l.934.6a1.3 1.3 0 0 0 1.4 0l.933-.6A1.3 1.3 0 0 1 19 2a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1 1.3 1.3 0 0 1-.7-.2l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.934.6a1.3 1.3 0 0 1-1.4 0l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-1.4 0l-.934-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-.7.2 1 1 0 0 1-1-1z"></path>
                </svg>
              </div>
              <span className="text-xs font-semibold text-brand-dim">
                {role === "admin" || role === "senioragent" ? "المصاريف لهذا الشهر" : "المصاريف الشهرية"}
              </span>
            </div>
            <h3 className="text-sm font-medium text-brand-dim">إجمالي المصروفات لهذا الشهر</h3>
            <p className="mt-2 text-2xl md:text-3xl font-extrabold text-white tracking-tight font-mono">
              {metrics.monthlyExpenses.total.toLocaleString("en-US")} <span className="text-xs font-normal text-brand-dim font-sans">ج.م</span>
            </p>
            <p className="mt-1 text-xs text-brand-dim/80">
              {role === "admin" || role === "senioragent"
                ? "مصروفات الموظفين المحددين خلال الشهر الحالي"
                : `مصروفاتك المسجلة خلال ${getSelectedMonthName(startDate)}`}
            </p>
            <div className="my-5 border-t border-brand-border/60"></div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.01] border border-white/[0.03] hover:border-white/[0.08] transition-all">
                <span className="text-sm font-bold text-white font-mono">{metrics.monthlyExpenses.personal.toLocaleString("en-US")} ج.م</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border text-blue-400 bg-blue-400/10 border-blue-500/20">مصروف شخصي</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.01] border border-white/[0.03] hover:border-white/[0.08] transition-all">
                <span className="text-sm font-bold text-white font-mono">{metrics.monthlyExpenses.marketing1.toLocaleString("en-US")} ج.م</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border" style={{ color: "rgb(129, 140, 248)", borderColor: "rgba(129, 140, 248, 0.125)", backgroundColor: "rgba(129, 140, 248, 0.063)" }}>ماركتنج 1</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.01] border border-white/[0.03] hover:border-white/[0.08] transition-all">
                <span className="text-sm font-bold text-white font-mono">{metrics.monthlyExpenses.marketing2.toLocaleString("en-US")} ج.م</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border" style={{ color: "rgb(74, 222, 128)", borderColor: "rgba(74, 222, 128, 0.125)", backgroundColor: "rgba(74, 222, 128, 0.063)" }}>ماركتنج 2</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.01] border border-white/[0.03] hover:border-white/[0.08] transition-all">
                <span className="text-sm font-bold text-white font-mono">{metrics.monthlyExpenses.marketing3.toLocaleString("en-US")} ج.م</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border" style={{ color: "rgb(192, 132, 252)", borderColor: "rgba(192, 132, 252, 0.125)", backgroundColor: "rgba(192, 132, 252, 0.063)" }}>ماركتنج 3</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.01] border border-white/[0.03] hover:border-white/[0.08] transition-all">
                <span className="text-sm font-bold text-white font-mono">{metrics.monthlyExpenses.transfersSent.toLocaleString("en-US")} ج.م</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border text-pink-400 bg-pink-400/10 border-pink-500/20">تحويل عهدة لزميل</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Current Custody */}
        <div className="group relative rounded-[24px] bg-brand-card border border-brand-border backdrop-blur-xl p-6 hover:border-brand-accent/30 transition-all duration-300 shadow-[0_4px_24px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_32px_rgba(139,92,246,0.06)] overflow-hidden flex flex-col justify-between">
          <div>
            <div className="absolute -top-[100px] -left-[100px] w-[200px] h-[200px] bg-emerald-500/5 rounded-full blur-[50px] pointer-events-none"></div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/10 border border-brand-border text-emerald-400 group-hover:scale-105 transition-transform duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-briefcase h-6 w-6" aria-hidden="true">
                  <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                  <rect width="20" height="14" x="2" y="6" rx="2"></rect>
                </svg>
              </div>
              <span className="text-xs font-semibold text-brand-dim">
                {role === "admin" || role === "senioragent" ? "العهدة المجمعة للموظفين" : "العهدة الحالية للعمل"}
              </span>
            </div>
            <h3 className="text-sm font-medium text-brand-dim">إجمالي العهدة الحالية</h3>
            <p className="mt-2 text-2xl md:text-3xl font-extrabold text-white tracking-tight font-mono">
              {metrics.custody.total.toLocaleString("en-US")} <span className="text-xs font-normal text-brand-dim font-sans">ج.م</span>
            </p>
            <p className="mt-1 text-xs text-brand-dim/80">
              {role === "admin" || role === "senioragent"
                ? "الرصيد المالي الإجمالي المتبقي بعهدة الموظفين المحددين"
                : "الرصيد المالي المتبقي في عهدتك للعمل"}
            </p>
            <div className="my-5 border-t border-brand-border/60"></div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-white/[0.01] border border-white/[0.03] hover:border-white/[0.08] transition-all">
                <span className="text-xs font-bold text-emerald-400 font-mono">+{metrics.custody.approvedFunds.toLocaleString("en-US")} ج.م</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border border-emerald-500/20 bg-emerald-500/5 text-emerald-400">طلبات شحن مقبولة</span>
              </div>
              <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-white/[0.01] border border-white/[0.03] hover:border-white/[0.08] transition-all">
                <span className="text-xs font-bold text-emerald-400 font-mono">+{metrics.custody.receivedCustody.toLocaleString("en-US")} ج.م</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border border-emerald-500/20 bg-emerald-500/5 text-emerald-400">عهد مستلمة من زملاء</span>
              </div>
              <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-white/[0.01] border border-white/[0.03] hover:border-white/[0.08] transition-all">
                <span className="text-xs font-bold text-rose-400 font-mono">-{metrics.custody.expensesTotal.toLocaleString("en-US")} ج.م</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border border-rose-500/20 bg-rose-500/5 text-rose-400">مصاريف شخصية وتسويق</span>
              </div>
              <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-white/[0.01] border border-white/[0.03] hover:border-white/[0.08] transition-all">
                <span className="text-xs font-bold text-rose-400 font-mono">-{metrics.custody.sentCustody.toLocaleString("en-US")} ج.م</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border border-rose-500/20 bg-rose-500/5 text-rose-400">عهد مرسلة لزملاء</span>
              </div>
              <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-white/[0.01] border border-white/[0.03] hover:border-white/[0.08] transition-all">
                <span className="text-xs font-bold text-amber-400 font-mono">{metrics.custody.pendingFunds.toLocaleString("en-US")} ج.م</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border border-amber-500/20 bg-amber-500/5 text-amber-400">
                  طلبات معلقة ({metrics.custody.pendingCount})
                </span>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-brand-border/40 text-center">
            <span className="text-[10px] text-brand-dim block font-mono">
              (إجمالي المستلم: {metrics.custody.totalReceived.toLocaleString("en-US")} ج.م | إجمالي المنصرف: {metrics.custody.totalSpent.toLocaleString("en-US")} ج.م)
            </span>
          </div>
        </div>

        {/* Card 3: Wallets Overview */}
        <div className="group relative rounded-[24px] bg-brand-card border border-brand-border backdrop-blur-xl p-6 hover:border-brand-accent/30 transition-all duration-300 shadow-[0_4px_24px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_32px_rgba(139,92,246,0.06)] overflow-hidden flex flex-col justify-between">
          <div>
            <div className="absolute -top-[100px] -left-[100px] w-[200px] h-[200px] bg-brand-accent/5 rounded-full blur-[50px] pointer-events-none"></div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-accent/10 border border-brand-border text-brand-accent group-hover:scale-105 transition-transform duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-wallet h-6 w-6" aria-hidden="true">
                  <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"></path>
                  <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"></path>
                </svg>
              </div>
              <span className="text-xs font-semibold text-brand-dim">
                {role === "admin" || role === "senioragent" ? "محافظ الكاش المجمعة لهذا الشهر" : "محافظ الكاش المجمعة"}
              </span>
            </div>
            <h3 className="text-sm font-medium text-brand-dim">الكاش المجمع في المحافظ لهذا الشهر</h3>
            <p className="mt-2 text-2xl md:text-3xl font-extrabold text-white tracking-tight font-mono">
              {metrics.wallets.totalCash.toLocaleString("en-US")} <span className="text-xs font-normal text-brand-dim font-sans">ج.م</span>
            </p>
            <p className="mt-1 text-xs text-brand-dim/80">
              {role === "admin" || role === "senioragent"
                ? `موزعة على (${metrics.wallets.activeCount}) محافظ نشطة للموظفين المحددين خلال الشهر الحالي`
                : `موزعة على (${metrics.wallets.activeCount}) محافظ نشطة خلال الشهر الحالي`}
            </p>
            <div className="my-5 border-t border-brand-border/60"></div>
            <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
              {metrics.wallets.list.map((wallet) => {
                const badgeStyle = wallet.agentName ? getAgentBadgeStyle(wallet.agentName) : "";
                return (
                  <div
                    key={wallet.id}
                    className="flex items-center justify-between gap-2.5 py-1 px-3.5 rounded-xl bg-white/[0.01] border border-white/[0.03] hover:border-white/[0.06] transition-all duration-300"
                  >
                    <span className="text-xs font-extrabold text-white font-mono whitespace-nowrap">
                      {wallet.balance.toLocaleString("en-US")} ج.م
                    </span>
                    <div className="flex items-center gap-2 text-right">
                      {/* Smartphone SVG */}
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-smartphone h-3.5 w-3.5 text-brand-accent" aria-hidden="true">
                        <rect width="14" height="20" x="5" y="2" rx="2" ry="2"></rect>
                        <path d="M12 18h.01"></path>
                      </svg>
                      <span className="text-[17px] font-bold text-white font-mono tracking-wide">
                        {wallet.phone_number}
                      </span>
                      {/* Owner Badge (Only displayed for Admin/Senior) */}
                      {(role === "admin" || role === "senioragent") && wallet.agentName && (
                        <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-lg text-[9px] font-bold border whitespace-nowrap ${badgeStyle}`}>
                          {wallet.agentName}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {metrics.wallets.list.length === 0 && (
                <div className="text-center py-10 text-xs text-brand-dim/30">
                  لا توجد محافظ نشطة للموظف المحدد حالياً.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Line Chart: Daily Expenditure Trend (2/3 width) */}
        <div className="lg:col-span-2 bg-[#0a0d16]/70 border border-brand-border/40 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div className="border-b border-brand-border/10 pb-3 mb-4 text-right">
            <h3 className="text-sm font-bold text-white">مخطط اتجاه الصرف اليومي</h3>
            <p className="text-[10px] text-brand-dim/50 font-medium">حجم المصروفات اليومية المسجلة خلال الفترة المحددة</p>
          </div>
          
          <div className="w-full flex items-center justify-center">
            {charts.dailyTrend.length === 0 ? (
              <div className="text-center py-20 text-xs text-brand-dim/30">لا توجد بيانات مصروفات متوفرة للرسم البياني.</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={charts.dailyTrend}>
                  <defs>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="date" 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    tickLine={false} 
                    dy={10}
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    tickLine={false} 
                    dx={-10}
                    tickFormatter={(v: any) => `${v.toLocaleString()}`} 
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "var(--card-bg)", borderColor: "var(--accent-primary)", borderRadius: "12px", textAlign: "right", border: "1px solid var(--glass-border)", color: "var(--text-main)" }}
                    labelStyle={{ color: "var(--text-dim)" }}
                    formatter={(v: any) => [`${Number(v).toLocaleString()} ج.م`, "المصروفات"]}
                  />
                  <Area type="monotone" dataKey="amount" stroke="#a855f7" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Expenditure Distribution segmented progress (1/3 width) */}
        <div className="lg:col-span-1 bg-[#0a0d16]/70 border border-brand-border/40 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div className="border-b border-brand-border/10 pb-3 mb-4 text-right">
            <h3 className="text-sm font-bold text-white">توزيع النفقات</h3>
            <p className="text-[10px] text-brand-dim/50 font-medium">نسب الصرف حسب التصنيف للمدة الزمنية المحددة</p>
          </div>

          <div className="space-y-6">
            {/* Custom Flex Row Segmented Progress Bar */}
            <div className="w-full h-3 rounded-full overflow-hidden flex bg-brand-border/20">
              {charts.distribution.map((item, idx) => (
                item.percentage > 0 && (
                  <div 
                    key={idx}
                    style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                    className="h-full transition-all duration-500 first:rounded-r-full last:rounded-l-full"
                    title={`${item.name}: ${item.percentage}%`}
                  />
                )
              ))}
            </div>

            {/* List breakdown of categories */}
            <div className="space-y-3.5 select-none">
              {charts.distribution.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 text-brand-dim/70 font-semibold">
                    <span className="font-inter">({item.percentage.toFixed(1)}%)</span>
                    <span className="font-inter text-white">{item.amount.toLocaleString()} ج.م</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white/90 font-bold font-cairo">{item.name}</span>
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
