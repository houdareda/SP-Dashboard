"use client";

import React, { useState, useEffect, useRef, useTransition, useMemo } from "react";
import {
  Briefcase,
  Coins,
  TrendingDown,
  Layers,
  ChevronDown,
  User,
  Calendar,
  Search,
  Check,
  Wallet,
  Users,
  AlertCircle,
  Loader2,
  Clock,
  CheckCircle2,
  X,
} from "lucide-react";
import { getAgentsCustodyReport } from "@/app/actions/adminOperations";

interface WalletData {
  id: string;
  phone_number: string;
  start_of_month_balance: number;
  is_active: boolean;
  calculatedBalance: number;
  approvedFundsInPeriod: number;
}

interface AgentReport {
  id: string;
  full_name: string;
  role: string;
  is_active: boolean;
  wallets: WalletData[];
  allTimeApprovedFunds: number;
  allTimePendingFunds: number;
  allTimeExpenses: number;
  allTimeTransfersSent: number;
  allTimeTransfersReceived: number;
  currentCustody: number;
  approvedFundsInPeriod: number;
  expensesInPeriod: number;
}

interface SummaryData {
  totalCurrentCustody: number;
  totalApprovedFundsInPeriod: number;
  totalExpensesInPeriod: number;
  totalWalletsCount: number;
  activeWalletsCount: number;
}

interface AgentsCustodyClientProps {
  initialAgents: AgentReport[];
  initialSummary: SummaryData;
  employees: { id: string; full_name: string; role: string }[];
}

export default function AgentsCustodyClient({
  initialAgents,
  initialSummary,
  employees,
}: AgentsCustodyClientProps) {
  const [agents, setAgents] = useState<AgentReport[]>(initialAgents);
  const [summary, setSummary] = useState<SummaryData>(initialSummary);
  const [isPending, startTransition] = useTransition();

  // Filters State
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [walletSearch, setWalletSearch] = useState<string>("");

  // Dropdown UI state
  const [isAgentDropdownOpen, setIsAgentDropdownOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const agentDropdownRef = useRef<HTMLDivElement>(null);
  const roleDropdownRef = useRef<HTMLDivElement>(null);

  // Accordion open states per agent ID
  const [expandedAgents, setExpandedAgents] = useState<Record<string, boolean>>({});

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (agentDropdownRef.current && !agentDropdownRef.current.contains(event.target as Node)) {
        setIsAgentDropdownOpen(false);
      }
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target as Node)) {
        setIsRoleDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleExpandAgent = (agentId: string) => {
    setExpandedAgents((prev) => ({
      ...prev,
      [agentId]: !prev[agentId],
    }));
  };

  // Trigger report fetch when filters change
  const handleFetchReport = () => {
    startTransition(async () => {
      const res = await getAgentsCustodyReport({
        agentIds: selectedAgentIds,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        role: selectedRole || undefined,
        walletSearch: walletSearch || undefined,
      });

      if (res.success) {
        setAgents(res.agents);
        setSummary(res.summary);
      }
    });
  };

  // Debounced fetch when wallet search or dropdown selections change
  useEffect(() => {
    const handler = setTimeout(() => {
      handleFetchReport();
    }, 300);
    return () => clearTimeout(handler);
  }, [selectedAgentIds, startDate, endDate, selectedRole, walletSearch]);

  const clearFilters = () => {
    setSelectedAgentIds([]);
    setStartDate("");
    setEndDate("");
    setSelectedRole("all");
    setWalletSearch("");
  };

  return (
    <div className="space-y-8 font-cairo select-none relative text-right" dir="rtl">
      {/* Header section */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent shrink-0 mt-1">
          <Briefcase size={24} />
        </div>
        <div className="space-y-1.5 text-right">
          <h1 className="text-2xl font-bold text-white">أرصدة العهد والمحافظ</h1>
          <p className="text-sm text-brand-dim leading-relaxed">
            متابعة أرصدة العهد النقدية الإجمالية للموظفين، وحساب رصيد محافظ كاش العمل تفصيلياً مع فلاتر مخصصة للتحليل المالي.
          </p>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 select-none">
        {/* Card 1: Total Current Custody */}
        <div className="group relative rounded-[24px] bg-brand-card border border-brand-border backdrop-blur-xl p-6 hover:border-brand-accent/30 transition-all duration-300 shadow-[0_4px_24px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_32px_rgba(139,92,246,0.06)] overflow-hidden">
          <div className="absolute -top-[100px] -left-[100px] w-[200px] h-[200px] bg-emerald-500/5 rounded-full blur-[50px] pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/10 border border-brand-border text-emerald-400 group-hover:scale-105 transition-transform duration-300">
              <Briefcase size={22} />
            </div>
            {isPending && <Loader2 size={16} className="animate-spin text-brand-accent" />}
          </div>
          <h3 className="text-xs font-semibold text-brand-dim">إجمالي العهد المجمعة للموظفين</h3>
          <p className="mt-2 text-2xl font-extrabold text-white font-mono tracking-wide">
            {summary.totalCurrentCustody.toLocaleString("en-US")} <span className="text-[11px] font-normal text-brand-dim font-sans">ج.م</span>
          </p>
          <p className="mt-1 text-[10px] text-brand-dim/80">إجمالي المبالغ النقدية المتبقية عهدة مع الموظفين حالياً.</p>
        </div>

        {/* Card 2: Approved Charging in Period */}
        <div className="group relative rounded-[24px] bg-brand-card border border-brand-border backdrop-blur-xl p-6 hover:border-brand-accent/30 transition-all duration-300 shadow-[0_4px_24px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_32px_rgba(139,92,246,0.06)] overflow-hidden">
          <div className="absolute -top-[100px] -left-[100px] w-[200px] h-[200px] bg-brand-accent/5 rounded-full blur-[50px] pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-accent/10 border border-brand-border text-brand-accent group-hover:scale-105 transition-transform duration-300">
              <Coins size={22} />
            </div>
          </div>
          <h3 className="text-xs font-semibold text-brand-dim">إجمالي شحن العهد للفترة</h3>
          <p className="mt-2 text-2xl font-extrabold text-white font-mono tracking-wide">
            {summary.totalApprovedFundsInPeriod.toLocaleString("en-US")} <span className="text-[11px] font-normal text-brand-dim font-sans">ج.م</span>
          </p>
          <p className="mt-1 text-[10px] text-brand-dim/80">مجموع المبالغ المعتمد شحنها للمحافظ خلال الفترة المحددة.</p>
        </div>

        {/* Card 3: Total Expenses in Period */}
        <div className="group relative rounded-[24px] bg-brand-card border border-brand-border backdrop-blur-xl p-6 hover:border-brand-accent/30 transition-all duration-300 shadow-[0_4px_24px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_32px_rgba(139,92,246,0.06)] overflow-hidden">
          <div className="absolute -top-[100px] -left-[100px] w-[200px] h-[200px] bg-rose-500/5 rounded-full blur-[50px] pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-rose-500/10 border border-brand-border text-rose-400 group-hover:scale-105 transition-transform duration-300">
              <TrendingDown size={22} />
            </div>
          </div>
          <h3 className="text-xs font-semibold text-brand-dim">إجمالي المصاريف للفترة</h3>
          <p className="mt-2 text-2xl font-extrabold text-white font-mono tracking-wide">
            {summary.totalExpensesInPeriod.toLocaleString("en-US")} <span className="text-[11px] font-normal text-brand-dim font-sans">ج.م</span>
          </p>
          <p className="mt-1 text-[10px] text-brand-dim/80">مجموع تقارير مصاريف الموظفين المقبولة في الفترة المحددة.</p>
        </div>

        {/* Card 4: Wallets Covered */}
        <div className="group relative rounded-[24px] bg-brand-card border border-brand-border backdrop-blur-xl p-6 hover:border-brand-accent/30 transition-all duration-300 shadow-[0_4px_24px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_32px_rgba(139,92,246,0.06)] overflow-hidden">
          <div className="absolute -top-[100px] -left-[100px] w-[200px] h-[200px] bg-amber-500/5 rounded-full blur-[50px] pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500/10 border border-brand-border text-amber-400 group-hover:scale-105 transition-transform duration-300">
              <Layers size={22} />
            </div>
          </div>
          <h3 className="text-xs font-semibold text-brand-dim">المحافظ المشمولة بالتقرير</h3>
          <p className="mt-2 text-2xl font-extrabold text-white font-mono tracking-wide">
            {summary.activeWalletsCount} <span className="text-xs font-normal text-brand-dim font-sans">نشطة / {summary.totalWalletsCount} كلي</span>
          </p>
          <p className="mt-1 text-[10px] text-brand-dim/80">إحصائية بعدد المحافظ المطابقة لشروط التصفية والبحث حالياً.</p>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="backdrop-blur-xl bg-brand-card/95 border border-brand-border/55 p-6 rounded-[24px] shadow-xl relative z-40">
        <div className="flex flex-wrap items-end gap-6 text-right">
          
          {/* 1. Multi-select Agents Dropdown */}
          <div className="space-y-2 w-full sm:w-[260px] relative" ref={agentDropdownRef}>
            <label className="block text-[13px] font-medium text-brand-dim">اسم الموظف</label>
            <div className="relative">
              <button
                type="button"
                dir="rtl"
                onClick={() => {
                  setIsAgentDropdownOpen(!isAgentDropdownOpen);
                  setIsRoleDropdownOpen(false);
                }}
                className={`w-full h-[46px] px-4 rounded-xl bg-[#070912] border transition-all cursor-pointer flex items-center justify-between select-none ${
                  isAgentDropdownOpen ? "border-brand-accent shadow-[0_0_10px_rgba(139,92,246,0.2)]" : "border-brand-border/80"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-white text-xs font-semibold">
                    {selectedAgentIds.length === 0
                      ? "الكل (جميع الموظفين)"
                      : selectedAgentIds.length === employees.length
                      ? "الكل (جميع الموظفين)"
                      : `الموظفون المختارون (${selectedAgentIds.length})`}
                  </span>
                  <User size={14} className="text-brand-dim/50" />
                </div>
                <ChevronDown size={14} className={`text-white/40 transition-transform duration-200 ${isAgentDropdownOpen ? "rotate-180 text-brand-accent" : ""}`} />
              </button>

              {isAgentDropdownOpen && (
                <div className="absolute right-0 left-0 mt-2 bg-[#0c0e18]/95 backdrop-blur-xl border border-brand-border/80 rounded-xl shadow-2xl p-3 z-30 animate-scale-in text-right" dir="rtl">
                  <span className="block text-xs font-semibold text-brand-dim/60 mb-2 border-b border-brand-border/20 pb-1.5 font-cairo">تصفية حسب الموظف</span>
                  
                  <button
                    type="button"
                    dir="rtl"
                    onClick={() => {
                      if (selectedAgentIds.length === employees.length || selectedAgentIds.length === 0) {
                        setSelectedAgentIds([]);
                      } else {
                        setSelectedAgentIds(employees.map((e) => e.id));
                      }
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

                  <div className="space-y-0.5 max-h-48 overflow-y-auto custom-scrollbar">
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
          </div>

          {/* 2. Date Range Filters */}
          <div className="space-y-2 w-full sm:w-[320px]">
            <label className="block text-[13px] font-medium text-brand-dim">تاريخ الفترة (لإجمالي شحن ومصاريف الفترة)</label>
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  onClick={(e) => e.currentTarget.showPicker()}
                  placeholder="من"
                  className="w-full bg-[#070814]/80 border border-brand-border/80 rounded-xl pl-4 pr-10 py-3 text-xs text-white focus:outline-none focus:border-brand-accent transition-all text-left dir-ltr cursor-pointer"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none">
                  <Calendar size={13} />
                </span>
              </div>
              <span className="text-brand-dim text-xs select-none">إلى</span>
              <div className="relative flex-1">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  onClick={(e) => e.currentTarget.showPicker()}
                  placeholder="إلى"
                  className="w-full bg-[#070814]/80 border border-brand-border/80 rounded-xl pl-4 pr-10 py-3 text-xs text-white focus:outline-none focus:border-brand-accent transition-all text-left dir-ltr cursor-pointer"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none">
                  <Calendar size={13} />
                </span>
              </div>
            </div>
          </div>

          {/* 3. Role Select Dropdown */}
          <div className="space-y-2 w-full sm:w-[200px] relative" ref={roleDropdownRef}>
            <label className="block text-[13px] font-medium text-brand-dim">صلاحية الموظف</label>
            <div className="relative">
              <button
                type="button"
                dir="rtl"
                onClick={() => {
                  setIsRoleDropdownOpen(!isRoleDropdownOpen);
                  setIsAgentDropdownOpen(false);
                }}
                className={`w-full h-[46px] px-4 rounded-xl bg-[#070912] border transition-all cursor-pointer flex items-center justify-between select-none ${
                  isRoleDropdownOpen ? "border-brand-accent shadow-[0_0_10px_rgba(139,92,246,0.2)]" : "border-brand-border/80"
                }`}
              >
                <span className="text-white text-xs font-semibold">
                  {selectedRole === "all"
                    ? "الكل (جميع الموظفين)"
                    : selectedRole === "agent"
                    ? "موظف (Agent)"
                    : "Senior Agent"}
                </span>
                <ChevronDown size={14} className={`text-white/40 transition-transform duration-200 ${isRoleDropdownOpen ? "rotate-180 text-brand-accent" : ""}`} />
              </button>

              {isRoleDropdownOpen && (
                <div className="absolute right-0 left-0 mt-2 bg-[#0c0e18]/95 backdrop-blur-xl border border-brand-border/80 rounded-xl shadow-2xl p-1.5 z-30 animate-scale-in text-right">
                  <div className="space-y-1">
                    <button
                      type="button"
                      dir="rtl"
                      onClick={() => {
                        setSelectedRole("all");
                        setIsRoleDropdownOpen(false);
                      }}
                      className={`w-full text-right px-3 py-2 text-xs rounded-lg hover:bg-white/5 transition-colors cursor-pointer block font-cairo ${
                        selectedRole === "all" ? "bg-brand-accent/15 text-brand-accent font-bold" : "text-white/80"
                      }`}
                    >
                      الكل (جميع الأدوار)
                    </button>
                    <button
                      type="button"
                      dir="rtl"
                      onClick={() => {
                        setSelectedRole("agent");
                        setIsRoleDropdownOpen(false);
                      }}
                      className={`w-full text-right px-3 py-2 text-xs rounded-lg hover:bg-white/5 transition-colors cursor-pointer block font-cairo ${
                        selectedRole === "agent" ? "bg-brand-accent/15 text-brand-accent font-bold" : "text-white/80"
                      }`}
                    >
                      موظف (Agent)
                    </button>
                    <button
                      type="button"
                      dir="rtl"
                      onClick={() => {
                        setSelectedRole("senioragent");
                        setIsRoleDropdownOpen(false);
                      }}
                      className={`w-full text-right px-3 py-2 text-xs rounded-lg hover:bg-white/5 transition-colors cursor-pointer block font-cairo ${
                        selectedRole === "senioragent" ? "bg-brand-accent/15 text-brand-accent font-bold" : "text-white/80"
                      }`}
                    >
                      Senior Agent
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 4. Wallet Phone Search Input */}
          <div className="space-y-2 w-full sm:w-[240px] relative">
            <label className="block text-[13px] font-medium text-brand-dim">بحث برقم المحفظة</label>
            <div className="relative">
              <input
                type="text"
                value={walletSearch}
                onChange={(e) => setWalletSearch(e.target.value)}
                placeholder="أدخل رقم المحفظة..."
                className="w-full h-[46px] pl-4 pr-10 bg-[#070814]/80 border border-brand-border/80 rounded-xl text-xs text-white focus:outline-none focus:border-brand-accent transition-all text-right"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none">
                <Search size={14} />
              </span>
              {walletSearch && (
                <button
                  type="button"
                  onClick={() => setWalletSearch("")}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Clear Filters Button */}
          {(selectedAgentIds.length > 0 || startDate || endDate || selectedRole !== "all" || walletSearch) && (
            <button
              onClick={clearFilters}
              className="h-[46px] px-5 bg-white/5 hover:bg-white/10 border border-brand-border/50 text-white hover:text-brand-accent rounded-xl text-xs font-semibold cursor-pointer transition-all active:scale-[0.98] select-none shrink-0"
            >
              إعادة تعيين
            </button>
          )}
        </div>
      </div>

      {/* Main Data Report list */}
      <div className="backdrop-blur-xl bg-brand-card/95 border border-brand-border/55 rounded-[24px] overflow-hidden shadow-xl relative z-20">
        <div className="overflow-x-auto">
          {agents.length > 0 ? (
            <table className="w-full text-right border-collapse text-xs md:text-sm">
              <thead>
                <tr className="border-b border-brand-border/40 text-brand-dim/80 bg-[#070814]/20 select-none">
                  <th className="py-4 px-6 font-bold w-12" />
                  <th className="py-4 px-6 font-bold">الموظف</th>
                  <th className="py-4 px-6 font-bold">صلاحية الحساب</th>
                  <th className="py-4 px-6 font-bold text-center">العهدة الحالية</th>
                  <th className="py-4 px-6 font-bold text-center">شحن عهد للفترة</th>
                  <th className="py-4 px-6 font-bold text-center">مصاريف الفترة</th>
                  <th className="py-4 px-6 font-bold text-center">عدد المحافظ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/20">
                {agents.map((agent) => {
                  const isExpanded = !!expandedAgents[agent.id];
                  return (
                    <React.Fragment key={agent.id}>
                      <tr
                        className={`hover:bg-white/[0.01] transition-colors cursor-pointer ${
                          isExpanded ? "bg-white/[0.01]" : ""
                        }`}
                        onClick={() => toggleExpandAgent(agent.id)}
                      >
                        {/* Accordion Expand indicator */}
                        <td className="py-4.5 px-6 text-center select-none">
                          <ChevronDown
                            size={16}
                            className={`text-white/40 transition-transform duration-200 ${
                              isExpanded ? "rotate-180 text-brand-accent" : ""
                            }`}
                          />
                        </td>

                        {/* Employee profile */}
                        <td className="py-4.5 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent shrink-0 select-none">
                              <User size={14} />
                            </div>
                            <div className="space-y-0.5">
                              <span className="font-semibold text-white capitalize">
                                {agent.full_name}
                              </span>
                              {!agent.is_active && (
                                <span className="block text-[9px] text-red-400 font-bold leading-none">موقوف</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Account Role */}
                        <td className="py-4.5 px-6">
                          {agent.role === "senioragent" ? (
                            <span className="inline-flex items-center px-2 py-0.5 text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full select-none">
                              Senior Agent
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 text-[9px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full select-none">
                              موظف
                            </span>
                          )}
                        </td>

                        {/* Current Custody */}
                        <td className="py-4.5 px-6 text-center">
                          <span className={`font-bold font-mono text-sm tracking-wide ${
                            agent.currentCustody >= 0 ? "text-emerald-400" : "text-red-400"
                          }`}>
                            {agent.currentCustody.toLocaleString("en-US")} ج.م
                          </span>
                        </td>

                        {/* Approved charging sum in period */}
                        <td className="py-4.5 px-6 text-center font-bold font-mono text-white/95 tracking-wide">
                          {agent.approvedFundsInPeriod > 0 ? (
                            <span className="text-brand-accent">+{agent.approvedFundsInPeriod.toLocaleString("en-US")} ج.م</span>
                          ) : (
                            <span className="text-white/40">-</span>
                          )}
                        </td>

                        {/* Expense sum in period */}
                        <td className="py-4.5 px-6 text-center font-bold font-mono text-white/95 tracking-wide">
                          {agent.expensesInPeriod > 0 ? (
                            <span className="text-rose-400">-{agent.expensesInPeriod.toLocaleString("en-US")} ج.m</span>
                          ) : (
                            <span className="text-white/40">-</span>
                          )}
                        </td>

                        {/* Wallets Count */}
                        <td className="py-4.5 px-6 text-center font-bold font-mono text-brand-dim">
                          {agent.wallets.filter(w => w.is_active).length} / {agent.wallets.length}
                        </td>
                      </tr>

                      {/* Accordion wallets list block */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="p-0 bg-[#070810]/40 border-t border-b border-brand-border/10 select-none animate-slide-in">
                            <div className="px-12 py-5 space-y-4">
                              <div className="flex items-center gap-2 border-b border-brand-border/20 pb-2">
                                <Wallet size={14} className="text-brand-accent" />
                                <h4 className="text-[11.5px] font-bold text-white leading-none">تفاصيل المحافظ لـ {agent.full_name}</h4>
                              </div>

                              {agent.wallets.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {agent.wallets.map((wallet) => (
                                    <div
                                      key={wallet.id}
                                      className="flex items-center justify-between p-3.5 rounded-xl border bg-[#05060a]/80 border-brand-border/50 text-xs hover:border-brand-accent/25 transition-all select-none"
                                    >
                                      {/* Left: phone number & status */}
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                          <span className="font-bold text-white font-mono tracking-wider">{wallet.phone_number}</span>
                                          {wallet.is_active ? (
                                            <span className="inline-flex items-center px-1.5 py-0.5 text-[8.5px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-md select-none">نشطة</span>
                                          ) : (
                                            <span className="inline-flex items-center px-1.5 py-0.5 text-[8.5px] font-bold text-white/30 bg-white/5 border border-white/10 rounded-md select-none">غير نشطة</span>
                                          )}
                                        </div>
                                        <p className="text-[9.5px] text-brand-dim/60 leading-none">شحن للفترة: <span className="font-bold font-mono text-white/80">{wallet.approvedFundsInPeriod.toLocaleString("en-US")} ج.م</span></p>
                                      </div>

                                      {/* Right: monthly balance */}
                                      <div className="text-left">
                                        <p className="text-[10px] text-brand-dim leading-none mb-1 font-semibold">الرصيد المحسوب (هذا الشهر)</p>
                                        <p className="font-bold font-mono text-brand-accent text-sm tracking-wide leading-none">
                                          {wallet.calculatedBalance.toLocaleString("en-US")} ج.م
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center py-6 text-[10.5px] text-brand-dim/40 flex items-center justify-center gap-2 border border-dashed border-brand-border/20 rounded-xl bg-white/[0.01]">
                                  <AlertCircle size={14} />
                                  <span>لا توجد محافظ مسجلة لهذا الموظف أو مطابقة لشروط البحث.</span>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="border border-dashed border-brand-border/20 rounded-[24px] bg-[#070814]/10 py-20 text-center select-none">
              <div className="flex flex-col items-center justify-center space-y-4 max-w-sm mx-auto">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.01] border border-brand-border/30 text-brand-dim/40 flex items-center justify-center shadow-inner">
                  <Users size={28} />
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-base font-bold text-white">لا توجد سجلات مطابقة</h4>
                  <p className="text-xs text-brand-dim/70 leading-relaxed">
                    لا يتوفر موظفون أو محافظ تطابق معايير التصفية أو البحث المحددة حالياً.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
