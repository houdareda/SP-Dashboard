"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Calculator,
  ChevronDown,
  ChevronUp,
  Copy,
  CheckCircle,
  Filter,
  Users,
} from "lucide-react";
import { CplReportData } from "@/app/actions/cpl";

interface CplHistoryManagementClientProps {
  initialReports: CplReportData[];
  employees: {
    id: string;
    full_name: string;
    role: string;
  }[];
  currentUserId: string;
  currentUserRole: string;
}

export default function CplHistoryManagementClient({
  initialReports,
  employees,
  currentUserId,
  currentUserRole,
}: CplHistoryManagementClientProps) {
  // Filters State
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [myDataOnly, setMyDataOnly] = useState<boolean>(false);

  // Expandable rows state
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  // Custom Dropdown State
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);
  const employeeDropdownRef = useRef<HTMLDivElement>(null);

  // Click outside to close custom dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        employeeDropdownRef.current &&
        !employeeDropdownRef.current.contains(event.target as Node)
      ) {
        setIsEmployeeDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Copy status
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSelectedEmployeeIds([]);
    setStartDate("");
    setEndDate("");
    setMyDataOnly(false);
  };

  // Filtered reports calculation
  const filteredReports = initialReports.filter((report) => {
    // 1. Employee filter
    if (selectedEmployeeIds.length > 0 && !selectedEmployeeIds.includes(report.agent_id || "")) {
      return false;
    }

    // 2. "My Data Only" filter (visible to senioragent)
    if (myDataOnly && currentUserRole === "senioragent" && report.agent_id !== currentUserId) {
      return false;
    }

    // 3. Date range filters
    if (startDate && report.report_date < startDate) {
      return false;
    }
    if (endDate && report.report_date > endDate) {
      return false;
    }

    return true;
  });

  const toggleRowExpanded = (id: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <div className="space-y-6 font-cairo text-right" dir="rtl">
      
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-brand-border/40 pb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-accent/15 border border-brand-accent/35 flex items-center justify-center text-brand-accent shadow-lg shadow-brand-accent/5">
              <Calculator size={20} />
            </div>
            <span>سجل CPL وإغلاق الكاش للإدارة</span>
          </h1>
          <p className="text-xs text-brand-dim/80 mt-1.5 font-semibold">
            لوحة تحكم المشرفين لمراجعة تقارير إغلاق الكاش اليومي وحسابات الـ CPL للموظفين
          </p>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="backdrop-blur-xl bg-brand-card/40 border border-brand-border/40 p-5 rounded-3xl shadow-xl space-y-4 relative z-30">
        <div className="flex items-center gap-2 text-white font-extrabold text-xs">
          <Filter size={14} className="text-brand-accent" />
          <span>تصفية وفلترة التقارير:</span>
        </div>

        <div className="flex flex-wrap items-end gap-5">
          
          {/* Employee Dropdown Filter */}
          <div className="space-y-1.5 w-full sm:w-[220px] relative" ref={employeeDropdownRef}>
            <label className="block text-[11px] font-bold text-brand-dim/75 pr-1">تصفية بالموظف:</label>
            <button
              type="button"
              onClick={() => setIsEmployeeDropdownOpen(!isEmployeeDropdownOpen)}
              className="w-full h-10 px-4 rounded-xl bg-[#060811]/90 border border-brand-border/50 text-white focus:outline-none focus:border-brand-accent transition-all cursor-pointer flex items-center justify-between select-none font-cairo text-xs"
            >
              <span className="flex items-center gap-1.5">
                <Users size={13} className="text-white/40" />
                <span className="truncate max-w-[150px]">
                  {selectedEmployeeIds.length === 0
                    ? "كل الموظفين"
                    : selectedEmployeeIds.length === 1
                    ? employees.find((e) => e.id === selectedEmployeeIds[0])?.full_name || "موظف محدد"
                    : `تم اختيار (${selectedEmployeeIds.length}) موظفين`}
                </span>
              </span>
              <ChevronDown
                size={14}
                className={`text-white/40 transition-transform duration-200 ${isEmployeeDropdownOpen ? "rotate-180 text-brand-accent" : ""}`}
              />
            </button>

            {isEmployeeDropdownOpen && (
              <div className="absolute right-0 left-0 mt-2 bg-[#0c0e18] border border-brand-border/80 rounded-xl shadow-2xl p-1.5 z-[9999] animate-scale-in text-right max-h-56 overflow-y-auto custom-scrollbar">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedEmployeeIds([]);
                  }}
                  className={`w-full px-3 py-2 rounded-lg text-right text-xs transition-colors block cursor-pointer font-cairo ${
                    selectedEmployeeIds.length === 0
                      ? "text-brand-accent bg-brand-accent/15 font-bold"
                      : "text-white/70 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span>كل الموظفين</span>
                    {selectedEmployeeIds.length === 0 && (
                      <span className="w-2 h-2 rounded-full bg-brand-accent shadow-[0_0_8px_#8b5cf6]" />
                    )}
                  </div>
                </button>
                {employees.map((e) => {
                  const isSelected = selectedEmployeeIds.includes(e.id);
                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => {
                        setSelectedEmployeeIds((prev) =>
                          prev.includes(e.id)
                            ? prev.filter((id) => id !== e.id)
                            : [...prev, e.id]
                        );
                      }}
                      className={`w-full px-3 py-2 rounded-lg text-right text-xs transition-colors block cursor-pointer font-cairo ${
                        isSelected
                          ? "text-brand-accent bg-brand-accent/15 font-bold"
                          : "text-white/70 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>{e.full_name} ({e.role === "senioragent" ? "سينيور" : "موظف"})</span>
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-brand-accent shadow-[0_0_8px_#8b5cf6]" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Date range picker (From) */}
          <div className="space-y-1.5 w-full sm:w-[160px]">
            <label className="block text-[11px] font-bold text-brand-dim/75 pr-1">من تاريخ:</label>
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                onClick={(e) => e.currentTarget.showPicker()}
                className="w-full h-10 px-3 bg-[#060811]/90 border border-brand-border/50 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-brand-accent text-center font-inter cursor-pointer"
              />
            </div>
          </div>

          {/* Date range picker (To) */}
          <div className="space-y-1.5 w-full sm:w-[160px]">
            <label className="block text-[11px] font-bold text-brand-dim/75 pr-1">إلى تاريخ:</label>
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                onClick={(e) => e.currentTarget.showPicker()}
                className="w-full h-10 px-3 bg-[#060811]/90 border border-brand-border/50 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-brand-accent text-center font-inter cursor-pointer"
              />
            </div>
          </div>

          {/* "My Data Only" Toggle for senioragent */}
          {currentUserRole === "senioragent" && (
            <div className="flex items-center gap-2.5 h-10 select-none pb-1">
              <input
                type="checkbox"
                id="myDataOnlyCheckbox"
                checked={myDataOnly}
                onChange={(e) => setMyDataOnly(e.target.checked)}
                className="w-4 h-4 rounded bg-[#060811] border-brand-border/60 text-brand-accent focus:ring-brand-accent/20 cursor-pointer accent-brand-accent"
              />
              <label htmlFor="myDataOnlyCheckbox" className="text-xs font-bold text-white/90 cursor-pointer">
                بياناتي فقط
              </label>
            </div>
          )}

          {/* Reset Filters button */}
          {(selectedEmployeeIds.length > 0 || startDate || endDate || myDataOnly) && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="h-10 px-4 text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/5 border border-red-500/10 rounded-xl transition-all cursor-pointer mr-auto"
            >
              إعادة تعيين الفلاتر
            </button>
          )}

        </div>
      </div>

      {/* Expandable Data Table */}
      <div className="backdrop-blur-xl bg-brand-card/45 border border-brand-border/40 rounded-3xl shadow-xl overflow-hidden relative z-10">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="border-b border-brand-border/30 text-[11px] text-brand-dim/70 font-bold">
                <th className="py-4.5 pr-6 text-right">التاريخ</th>
                <th className="py-4.5 text-right">الموظف</th>
                <th className="py-4.5 text-left font-inter">الكاش المستلم</th>
                <th className="py-4.5 text-left font-inter">إجمالي المصروفات</th>
                <th className="py-4.5 text-left font-inter">الكاش المتبقي (عجز/زيادة)</th>
                <th className="py-4.5 pl-6 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/15 text-xs text-white/90">
              {filteredReports.length > 0 ? (
                filteredReports.map((report) => {
                  const id = report.id || report.report_date;
                  const isExpanded = !!expandedRows[id];
                  
                  // Financial Calculations
                  const totalMarketingSpend = report.marketing_systems?.reduce((sum, item) => sum + item.spend, 0) || 0;
                  const totalExpenses = totalMarketingSpend + report.personal_expenses + report.colleague_transfers;
                  const totalWallets = report.wallets_balances?.reduce((sum, w) => sum + w.balance, 0) || 0;
                  
                  const netCash = report.total_received_cash - (report.personal_expenses + report.colleague_transfers);
                  const diffCash = netCash - totalWallets;

                  return (
                    <React.Fragment key={id}>
                      {/* Main Row */}
                      <tr
                        onClick={() => toggleRowExpanded(id)}
                        className={`hover:bg-white/[0.015] transition-colors cursor-pointer ${isExpanded ? "bg-[#0b0e1b]/40 font-bold" : ""}`}
                      >
                        <td className="py-4 pr-6 font-bold font-inter text-right">{report.report_date}</td>
                        <td className="py-4 text-right">
                          <span className="font-bold text-white">
                            {report.agent_profile?.full_name || "موظف غير معروف"}
                          </span>
                        </td>
                        <td className="py-4 text-left font-inter">
                          {report.total_received_cash.toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م
                        </td>
                        <td className="py-4 text-left font-inter">
                          {totalExpenses.toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.m
                        </td>
                        <td className={`py-4 text-left font-inter font-bold ${diffCash >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {diffCash >= 0 ? "+" : ""}
                          {diffCash.toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م
                        </td>
                        <td className="py-4 pl-6 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRowExpanded(id);
                            }}
                            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white flex items-center justify-center transition-colors cursor-pointer mx-auto"
                            title={isExpanded ? "إخفاء التفاصيل" : "عرض التفاصيل"}
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Details Row */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={6} className="p-0 bg-[#090b16]/75">
                            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8 text-right border-t border-b border-brand-border/20 animate-slide-down">
                              
                              {/* Col 1: حركة المصاريف والتسوية */}
                              <div className="space-y-4.5">
                                <h4 className="text-xs font-black text-brand-accent border-b border-brand-border/20 pb-2 flex items-center gap-2">
                                  <span>حركة المصاريف والتسوية</span>
                                </h4>
                                <div className="space-y-2.5 text-xs">
                                  <div className="flex items-center justify-between text-brand-dim/80">
                                    <span>إجمالي الكاش المستلم:</span>
                                    <span className="font-bold text-white font-inter">
                                      {report.total_received_cash.toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-brand-dim/80">
                                    <span>مصاريف شخصية:</span>
                                    <span className="font-bold text-white font-inter">
                                      {report.personal_expenses.toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-brand-dim/80">
                                    <span>تحويلات الزملاء:</span>
                                    <span className="font-bold text-white font-inter">
                                      {report.colleague_transfers.toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between border-t border-brand-border/20 pt-2 text-brand-dim/80">
                                    <span>إجمالي مصاريف الماركتنج:</span>
                                    <span className="font-bold text-emerald-400 font-inter">
                                      {totalMarketingSpend.toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between border-t border-brand-border/20 pt-2 text-brand-dim/80">
                                    <span>صافي الكاش المتبقي للتسوية:</span>
                                    <span className="font-bold text-brand-accent font-inter">
                                      {netCash.toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Col 2: أرصدة المحافظ في هذا اليوم */}
                              <div className="space-y-4.5">
                                <h4 className="text-xs font-black text-brand-accent border-b border-brand-border/20 pb-2 flex items-center gap-2">
                                  <span>أرصدة المحافظ في هذا اليوم</span>
                                </h4>
                                <div className="space-y-2.5 max-h-[160px] overflow-y-auto custom-scrollbar pr-1">
                                  {report.wallets_balances && report.wallets_balances.length > 0 ? (
                                    report.wallets_balances.map((wb) => (
                                      <div key={wb.wallet_id} className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-1.5">
                                          <button
                                            type="button"
                                            onClick={() => copyToClipboard(wb.phone_number)}
                                            className="text-white/30 hover:text-white transition-colors cursor-pointer"
                                            title="نسخ رقم الهاتف"
                                          >
                                            {copiedText === wb.phone_number ? (
                                              <CheckCircle size={12} className="text-emerald-400 animate-pulse" />
                                            ) : (
                                              <Copy size={12} />
                                            )}
                                          </button>
                                          <span className="font-inter text-brand-dim/70 font-medium dir-ltr select-all">{wb.phone_number}</span>
                                        </div>
                                        <span className="font-bold text-white font-inter">
                                          {wb.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م
                                        </span>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-center py-4 text-brand-dim/40 text-[10px]">
                                      لا توجد تفاصيل محافظ مسجلة
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Col 3: تفاصيل الأنظمة وتكلفة العميل */}
                              <div className="space-y-4.5">
                                <h4 className="text-xs font-black text-brand-accent border-b border-brand-border/20 pb-2 flex items-center gap-2">
                                  <span>تفاصيل الأنظمة وتكلفة العميل (CPL)</span>
                                </h4>
                                <div className="space-y-2.5 text-xs">
                                  {report.marketing_systems && report.marketing_systems.length > 0 ? (
                                    report.marketing_systems.map((item) => (
                                      <div key={item.systemName} className="flex flex-col space-y-1 border-b border-brand-border/10 pb-2 last:border-b-0">
                                        <div className="flex items-center justify-between">
                                          <span className="font-bold text-white/90">{item.systemName}:</span>
                                          <span className="font-bold font-inter text-brand-accent">CPL: {item.cpl.toFixed(2)} ج.م</span>
                                        </div>
                                        <div className="flex items-center justify-between text-[10px] text-brand-dim/60">
                                          <span>مبلغ مصروف: {item.spend.toLocaleString("en-US")} ج.م</span>
                                          <span>عدد الليدات: {item.leads} ليد</span>
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-center py-4 text-brand-dim/40 text-[10px]">
                                      لا توجد تفاصيل أنظمة ماركتنج مسجلة
                                    </div>
                                  )}
                                </div>
                              </div>

                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-brand-dim/50 font-bold select-none">
                    لا توجد تقارير إغلاق مسجلة مطابقة للبحث حالياً.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
