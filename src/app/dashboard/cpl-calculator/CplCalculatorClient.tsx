"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Coins,
  Calculator,
  History,
  Copy,
  CheckCircle,
  Edit,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  FolderSync,
} from "lucide-react";
import {
  CplReportData,
  MarketingSystemData,
  WalletBalanceData,
  submitDailyCplReport,
  updateDailyCplReport,
} from "@/app/actions/cpl";


interface CplCalculatorClientProps {
  initialWallets: {
    id: string;
    phone_number: string;
    start_of_month_balance?: number;
  }[];
  initialReports: CplReportData[];
  agentName: string;
}

export default function CplCalculatorClient({
  initialWallets,
  initialReports,
  agentName,
}: CplCalculatorClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"new" | "edit" | "history">("new");
  const [isPending, startTransition] = useTransition();

  // Custom select state
  const [isEditSelectOpen, setIsEditSelectOpen] = useState(false);
  const editSelectRef = useRef<HTMLDivElement>(null);

  // Confirmation Modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Click outside to close custom dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (editSelectRef.current && !editSelectRef.current.contains(event.target as Node)) {
        setIsEditSelectOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Helper for Egypt local date (YYYY-MM-DD)
  const getEgyptDate = () => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Cairo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date()).split("-");
    return `${parts[0]}-${parts[1]}-${parts[2]}`;
  };

  // Find last saved report for prefill
  const lastReport = initialReports && initialReports.length > 0 ? initialReports[0] : null;

  // --- NEW ENTRY STATE ---
  const [newReportDate, setNewReportDate] = useState(getEgyptDate());
  const [newReceivedCash, setNewReceivedCash] = useState<string>("");
  const [newPersonalExpenses, setNewPersonalExpenses] = useState<string>("");
  const [newColleagueTransfers, setNewColleagueTransfers] = useState<string>("");
  const [newMarketingSystems, setNewMarketingSystems] = useState<MarketingSystemData[]>([
    { systemName: "Marketing Sys 1", spend: 0, leads: 0, cpl: 0 },
    { systemName: "Marketing Sys 2", spend: 0, leads: 0, cpl: 0 },
    { systemName: "Marketing Sys 3", spend: 0, leads: 0, cpl: 0 },
  ]);
  const [newWalletsBalances, setNewWalletsBalances] = useState<Record<string, string>>(() => {
    const balancesMap: Record<string, string> = {};
    initialWallets.forEach((w) => {
      const matched = lastReport?.wallets_balances?.find((wb) => wb.wallet_id === w.id);
      balancesMap[w.id] = matched ? String(matched.balance) : "";
    });
    return balancesMap;
  });

  // --- EDIT STATE ---
  const [editSelectedId, setEditSelectedId] = useState<string>("");
  const [editReportDate, setEditReportDate] = useState("");
  const [editReceivedCash, setEditReceivedCash] = useState<string>("");
  const [editPersonalExpenses, setEditPersonalExpenses] = useState<string>("");
  const [editColleagueTransfers, setEditColleagueTransfers] = useState<string>("");
  const [editMarketingSystems, setEditMarketingSystems] = useState<MarketingSystemData[]>([
    { systemName: "Marketing Sys 1", spend: 0, leads: 0, cpl: 0 },
    { systemName: "Marketing Sys 2", spend: 0, leads: 0, cpl: 0 },
    { systemName: "Marketing Sys 3", spend: 0, leads: 0, cpl: 0 },
  ]);
  const [editWalletsBalances, setEditWalletsBalances] = useState<Record<string, string>>({});

  // --- HISTORY STATE ---
  const [historyFilterDate, setHistoryFilterDate] = useState("");
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  // --- CALCULATION FORMULAS (NEW ENTRY) ---
  const valOrZero = (val: string) => parseFloat(val) || 0;

  const newNetActualCash = valOrZero(newReceivedCash) - (valOrZero(newPersonalExpenses) + valOrZero(newColleagueTransfers));

  const newWalletsTotalCash = Object.keys(newWalletsBalances).reduce((sum, walletId) => {
    return sum + valOrZero(newWalletsBalances[walletId]);
  }, 0);

  // Marketing 2 spend is calculated dynamically as the balancing figure:
  // Received Cash - (Personal + Transfers + Marketing 1 Spend + Marketing 3 Spend)
  const newMarketing2Spend = Math.max(
    0,
    valOrZero(newReceivedCash) - (valOrZero(newPersonalExpenses) + valOrZero(newColleagueTransfers) + newMarketingSystems[0].spend + newMarketingSystems[2].spend)
  );

  const newMarketing2Leads = newMarketingSystems[1].leads;
  const newMarketing2Cpl = newMarketing2Leads > 0 ? Math.round((newMarketing2Spend / newMarketing2Leads) * 100) / 100 : 0;

  const newMarketingTotalSpend = newMarketingSystems[0].spend + newMarketing2Spend + newMarketingSystems[2].spend;
  const newMarketingTotalLeads = newMarketingSystems.reduce((sum, item) => sum + item.leads, 0);

  const newTotalExpenses = newMarketingTotalSpend + valOrZero(newPersonalExpenses) + valOrZero(newColleagueTransfers);
  const newFinalCashDifference = newNetActualCash - newWalletsTotalCash;

  // --- CALCULATION FORMULAS (EDIT ENTRY) ---
  const editNetActualCash = valOrZero(editReceivedCash) - (valOrZero(editPersonalExpenses) + valOrZero(editColleagueTransfers));

  const editWalletsTotalCash = Object.keys(editWalletsBalances).reduce((sum, walletId) => {
    return sum + valOrZero(editWalletsBalances[walletId]);
  }, 0);

  const editMarketing2Spend = Math.max(
    0,
    valOrZero(editReceivedCash) - (valOrZero(editPersonalExpenses) + valOrZero(editColleagueTransfers) + editMarketingSystems[0].spend + editMarketingSystems[2].spend)
  );

  const editMarketing2Leads = editMarketingSystems[1].leads;
  const editMarketing2Cpl = editMarketing2Leads > 0 ? Math.round((editMarketing2Spend / editMarketing2Leads) * 100) / 100 : 0;

  const editMarketingTotalSpend = editMarketingSystems[0].spend + editMarketing2Spend + editMarketingSystems[2].spend;
  const editMarketingTotalLeads = editMarketingSystems.reduce((sum, item) => sum + item.leads, 0);

  const editTotalExpenses = editMarketingTotalSpend + valOrZero(editPersonalExpenses) + valOrZero(editColleagueTransfers);
  const editFinalCashDifference = editNetActualCash - editWalletsTotalCash;

  // --- MARKETING SYSTEM STATE MUTATION (NEW) ---
  const handleMarketingChange = (index: number, field: "spend" | "leads", val: string) => {
    const numVal = parseFloat(val) || 0;
    setNewMarketingSystems((prev) => {
      const updated = [...prev];
      const current = { ...updated[index] };
      if (field === "spend") {
        current.spend = numVal;
      } else {
        current.leads = numVal;
      }
      current.cpl = current.leads > 0 ? Math.round((current.spend / current.leads) * 100) / 100 : 0;
      updated[index] = current;
      return updated;
    });
  };

  // --- MARKETING SYSTEM STATE MUTATION (EDIT) ---
  const handleEditMarketingChange = (index: number, field: "spend" | "leads", val: string) => {
    const numVal = parseFloat(val) || 0;
    setEditMarketingSystems((prev) => {
      const updated = [...prev];
      const current = { ...updated[index] };
      if (field === "spend") {
        current.spend = numVal;
      } else {
        current.leads = numVal;
      }
      current.cpl = current.leads > 0 ? Math.round((current.spend / current.leads) * 100) / 100 : 0;
      updated[index] = current;
      return updated;
    });
  };

  // --- WALLET BALANCE MUTATION ---
  const handleWalletBalanceChange = (walletId: string, val: string) => {
    setNewWalletsBalances((prev) => ({
      ...prev,
      [walletId]: val,
    }));
  };

  const handleEditWalletBalanceChange = (walletId: string, val: string) => {
    setEditWalletsBalances((prev) => ({
      ...prev,
      [walletId]: val,
    }));
  };

  // --- LOAD REPORT TO EDIT ---
  const selectReportToEdit = (reportId: string) => {
    const report = initialReports.find((r) => r.id === reportId);
    if (!report) return;

    setEditSelectedId(report.id || "");
    setEditReportDate(report.report_date);
    setEditReceivedCash(String(report.total_received_cash));
    setEditPersonalExpenses(String(report.personal_expenses));
    setEditColleagueTransfers(String(report.colleague_transfers));

    // Fill marketing systems
    const systems = report.marketing_systems || [];
    setEditMarketingSystems([
      {
        systemName: "Marketing Sys 1",
        spend: systems[0]?.spend || 0,
        leads: systems[0]?.leads || 0,
        cpl: systems[0]?.cpl || 0,
      },
      {
        systemName: "Marketing Sys 2",
        spend: systems[1]?.spend || 0,
        leads: systems[1]?.leads || 0,
        cpl: systems[1]?.cpl || 0,
      },
      {
        systemName: "Marketing Sys 3",
        spend: systems[2]?.spend || 0,
        leads: systems[2]?.leads || 0,
        cpl: systems[2]?.cpl || 0,
      },
    ]);

    // Fill wallets balances
    const wBalances: Record<string, string> = {};
    initialWallets.forEach((w) => {
      const match = report.wallets_balances?.find((wb) => wb.wallet_id === w.id);
      wBalances[w.id] = match ? String(match.balance) : "";
    });
    setEditWalletsBalances(wBalances);
  };

  // Switch to edit tab from action
  const triggerEditReport = (reportId: string) => {
    selectReportToEdit(reportId);
    setActiveTab("edit");
  };

  // --- FORM SUBMIT (NEW) ---
  const handleNewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newReportDate) {
      showToast("يرجى تحديد تاريخ التقرير.", "error");
      return;
    }

    // Prepare wallet payloads
    const walletsPayload: WalletBalanceData[] = [];
    try {
      initialWallets.forEach((w) => {
        const balanceVal = newWalletsBalances[w.id];
        if (balanceVal === undefined || balanceVal.trim() === "") {
          throw new Error(`يرجى تحديد رصيد المحفظة رقم ${w.phone_number}`);
        }
        const num = parseFloat(balanceVal);
        if (isNaN(num) || num < 0) {
          throw new Error(`رصيد المحفظة رقم ${w.phone_number} غير صحيح.`);
        }
        walletsPayload.push({
          wallet_id: w.id,
          phone_number: w.phone_number,
          balance: num,
        });
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "خطأ في المحافظ";
      showToast(msg, "error");
      return;
    }

    try {
      startTransition(async () => {
        const updatedMarketingSystems = [
          { ...newMarketingSystems[0] },
          { ...newMarketingSystems[1], spend: newMarketing2Spend, cpl: newMarketing2Cpl },
          { ...newMarketingSystems[2] },
        ];
        const payload = {
          report_date: newReportDate,
          total_received_cash: valOrZero(newReceivedCash),
          personal_expenses: valOrZero(newPersonalExpenses),
          colleague_transfers: valOrZero(newColleagueTransfers),
          marketing_systems: updatedMarketingSystems,
          wallets_balances: walletsPayload,
        };

        const res = await submitDailyCplReport(payload);
        if (res.success) {
          showToast("تم حفظ تقرير CPL وإغلاق اليوم المالي بنجاح.", "success");
          router.refresh();
          setActiveTab("history");
        } else {
          showToast(res.error || "حدث خطأ أثناء حفظ التقرير.", "error");
        }
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "حدث خطأ غير متوقع.";
      showToast(msg, "error");
    }
  };

  // --- FORM SUBMIT (EDIT) ---
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!editSelectedId) {
      showToast("يرجى تحديد تقرير لتعديله أولاً.", "error");
      return;
    }

    // Validate wallets first so we show errors before confirmation modal
    try {
      initialWallets.forEach((w) => {
        const balanceVal = editWalletsBalances[w.id];
        if (balanceVal === undefined || balanceVal.trim() === "") {
          throw new Error(`يرجى تحديد رصيد المحفظة رقم ${w.phone_number}`);
        }
        const num = parseFloat(balanceVal);
        if (isNaN(num) || num < 0) {
          throw new Error(`رصيد المحفظة رقم ${w.phone_number} غير صحيح.`);
        }
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "خطأ في المحافظ";
      showToast(msg, "error");
      return;
    }

    setShowConfirmModal(true);
  };

  const executeEditSubmit = async () => {
    setShowConfirmModal(false);

    const walletsPayload: WalletBalanceData[] = [];
    try {
      initialWallets.forEach((w) => {
        const balanceVal = editWalletsBalances[w.id];
        const num = parseFloat(balanceVal || "0");
        walletsPayload.push({
          wallet_id: w.id,
          phone_number: w.phone_number,
          balance: num,
        });
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "خطأ في المحافظ";
      showToast(msg, "error");
      return;
    }

    try {
      startTransition(async () => {
        const updatedMarketingSystems = [
          { ...editMarketingSystems[0] },
          { ...editMarketingSystems[1], spend: editMarketing2Spend, cpl: editMarketing2Cpl },
          { ...editMarketingSystems[2] },
        ];
        const payload = {
          report_date: editReportDate,
          total_received_cash: valOrZero(editReceivedCash),
          personal_expenses: valOrZero(editPersonalExpenses),
          colleague_transfers: valOrZero(editColleagueTransfers),
          marketing_systems: updatedMarketingSystems,
          wallets_balances: walletsPayload,
        };

        const res = await updateDailyCplReport(editSelectedId, payload);
        if (res.success) {
          showToast("تم تحديث تقرير CPL وإغلاق اليوم المالي بنجاح.", "success");
          router.refresh();
          setActiveTab("history");
        } else {
          showToast(res.error || "حدث خطأ أثناء تعديل التقرير.", "error");
        }
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "حدث خطأ غير متوقع.";
      showToast(msg, "error");
    }
  };

  // --- EXPANDABLE ROW HANDLER ---
  const toggleRowExpanded = (rowId: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [rowId]: !prev[rowId],
    }));
  };

  // Copy wallet phone number
  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast("تم نسخ رقم المحفظة إلى الحافظة بنجاح.", "success");
  };

  // Filter history reports
  const filteredReports = initialReports.filter((r) => {
    if (!historyFilterDate) return true;
    return r.report_date === historyFilterDate;
  });

  return (
    <div className="space-y-6 font-cairo select-none text-right pb-10" dir="rtl">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl backdrop-blur-xl border ${
            toast.type === "success"
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
              : "bg-red-500/15 border-red-500/30 text-red-400"
          } transition-all duration-300 animate-slide-in`}
        >
          <span>{toast.message}</span>
        </div>
      )}

      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-accent/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-accent/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-white flex items-center gap-3">
            <Coins className="text-brand-accent animate-pulse" size={26} />
            <span>حسابات الـ CPL وإغلاق الكاش اليومي</span>
          </h1>
          <p className="text-sm text-brand-dim leading-relaxed">
            مرحباً {agentName || "رامي رزق"}، أداة الإغلاق المالي اليومي وحساب الـ CPL المباشر ينسق شيت الإكسيل المتكامل.
          </p>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex justify-center mt-6">
        <div className="bg-[#0b0e1b]/80 border border-brand-border/40 p-1.5 rounded-2xl flex items-center gap-2 max-w-lg w-full">
          <button
            type="button"
            onClick={() => setActiveTab("new")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              activeTab === "new"
                ? "bg-brand-accent text-white shadow-[0_0_20px_rgba(139,92,246,0.3)]"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            <Calculator size={16} />
            <span>إدخال جديد</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("edit");
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              activeTab === "edit"
                ? "bg-brand-accent text-white shadow-[0_0_20px_rgba(139,92,246,0.3)]"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            <Edit size={16} />
            <span>تعديل تقرير</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              activeTab === "history"
                ? "bg-brand-accent text-white shadow-[0_0_20px_rgba(139,92,246,0.3)]"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            <History size={16} />
            <span>سجل التقارير اليومية</span>
          </button>
        </div>
      </div>

      {/* --- TAB 1: NEW ENTRY --- */}
      {activeTab === "new" && (
        <form onSubmit={handleNewSubmit} className="space-y-6 animate-fade-in" autoComplete="off">

          {/* Core Layout Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* RIGHT SIDE: Financial Info & CPL Calculator (Span 2) */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Card 1: المالية العامة وحركة الكاش */}
              <div className="backdrop-blur-xl bg-brand-card/40 border border-brand-border/40 rounded-3xl p-6 md:p-7 space-y-6 shadow-xl relative">
                
                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-4 border-b border-brand-border/25 pb-4.5">
                  <h2 className="text-base md:text-lg font-extrabold text-white flex items-center gap-2">
                    <span className="text-brand-accent">1.</span> المالية العامة وحركة الكاش
                  </h2>
                  <div className="relative w-full sm:max-w-[160px]">
                    <input
                      type="date"
                      value={newReportDate}
                      onChange={(e) => setNewReportDate(e.target.value)}
                      onClick={(e) => e.currentTarget.showPicker()}
                      className="w-full h-10 px-3 bg-[#060811]/90 border border-brand-border/50 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-brand-accent/80 focus:ring-1 focus:ring-brand-accent/20 text-center font-inter cursor-pointer"
                    />
                  </div>
                </div>

                {/* Inputs Fields */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="space-y-2 text-right">
                    <label className="block text-xs font-bold text-white/90">إجمالي الكاش المستلم</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={newReceivedCash}
                        onChange={(e) => setNewReceivedCash(e.target.value)}
                        dir="ltr"
                        className="w-full h-11 px-4.5 bg-[#060811]/90 border border-brand-border/50 rounded-xl text-xs text-white placeholder-brand-dim/35 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent/20 text-center font-inter dir-ltr"
                      />
                      <span className="absolute right-4.5 top-1/2 -translate-y-1/2 text-[10px] text-brand-dim/50 font-bold">ج.م</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-right">
                    <label className="block text-xs font-bold text-white/90">مصاريف شخصية</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={newPersonalExpenses}
                        onChange={(e) => setNewPersonalExpenses(e.target.value)}
                        dir="ltr"
                        className="w-full h-11 px-4.5 bg-[#060811]/90 border border-brand-border/50 rounded-xl text-xs text-white placeholder-brand-dim/35 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent/20 text-center font-inter dir-ltr"
                      />
                      <span className="absolute right-4.5 top-1/2 -translate-y-1/2 text-[10px] text-brand-dim/50 font-bold">ج.م</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-right">
                    <label className="block text-xs font-bold text-white/90">تحويلات الزملاء</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={newColleagueTransfers}
                        onChange={(e) => setNewColleagueTransfers(e.target.value)}
                        dir="ltr"
                        className="w-full h-11 px-4.5 bg-[#060811]/90 border border-brand-border/50 rounded-xl text-xs text-white placeholder-brand-dim/35 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent/20 text-center font-inter dir-ltr"
                      />
                      <span className="absolute right-4.5 top-1/2 -translate-y-1/2 text-[10px] text-brand-dim/50 font-bold">ج.م</span>
                    </div>
                  </div>
                </div>



              </div>

              {/* Card 2: حاسبة تكلفة العميل (CPL Calculator) */}
              <div className="backdrop-blur-xl bg-brand-card/40 border border-brand-border/40 rounded-3xl p-6 md:p-7 space-y-6 shadow-xl relative">
                
                {/* Header */}
                <div className="border-b border-brand-border/25 pb-4.5">
                  <h2 className="text-base md:text-lg font-extrabold text-white flex items-center gap-2">
                    <span className="text-brand-accent">2.</span> حاسبة تكلفة العميل (CPL Calculator)
                  </h2>
                </div>

                {/* Table Layout */}
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="border-b border-brand-border/30 text-xs text-brand-dim/70 font-bold">
                        <th className="pb-3 text-right">النظام الإعلاني</th>
                        <th className="pb-3 text-center">المبلغ المصروف (ج.م)</th>
                        <th className="pb-3 text-center">عدد الليدات</th>
                        <th className="pb-3 text-center">التكلفة الفعلية (CPL)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/15 text-xs text-white">
                      {newMarketingSystems.map((item, idx) => {
                        const isMarketing2 = idx === 1;
                        const spendVal = isMarketing2 ? newMarketing2Spend : item.spend;
                        const cplVal = isMarketing2 ? newMarketing2Cpl : item.cpl;

                        return (
                          <tr key={item.systemName} className="hover:bg-white/[0.01]">
                            <td className="py-4 font-bold text-white/95">{item.systemName}</td>
                            <td className="py-4 text-center">
                              <input
                                type="number"
                                step="0.01"
                                value={spendVal || ""}
                                onChange={(e) => !isMarketing2 && handleMarketingChange(idx, "spend", e.target.value)}
                                placeholder="0"
                                readOnly={isMarketing2}
                                dir="ltr"
                                className={`mx-auto text-center w-28 sm:w-36 h-9 px-3 border rounded-lg font-inter dir-ltr ${
                                  isMarketing2
                                    ? "bg-[#0b0e1a]/50 border-brand-border/20 text-brand-dim/70 cursor-not-allowed select-none"
                                    : "bg-[#060811]/90 border-brand-border/40 text-white focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent/10"
                                }`}
                              />
                            </td>
                            <td className="py-4 text-center">
                              <input
                                type="number"
                                value={item.leads || ""}
                                onChange={(e) => handleMarketingChange(idx, "leads", e.target.value)}
                                placeholder="0"
                                dir="ltr"
                                className="mx-auto text-center w-20 sm:w-28 h-9 px-3 bg-[#060811]/90 border border-brand-border/40 rounded-lg text-white focus:outline-none focus:border-brand-accent font-inter dir-ltr"
                              />
                            </td>
                            <td className="py-4 text-center font-bold font-inter text-brand-accent">
                              {item.leads > 0 ? (
                                <span>{cplVal.toFixed(2)} ج.م</span>
                              ) : (
                                <span className="text-brand-dim/30 text-[10px] font-normal">أدخل ليدز أولاً</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-brand-border/30 text-xs font-extrabold text-white bg-[#0b0e1a]/30">
                        <td className="py-4 pr-3 font-extrabold text-brand-dim/80">إجمالي عدد الليدز والشرائح:</td>
                        <td className="py-4 text-center font-inter text-emerald-400">
                          {newMarketingTotalSpend.toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م
                        </td>
                        <td className="py-4 text-center font-inter text-emerald-400">
                          {newMarketingTotalLeads} ليد
                        </td>
                        <td className="py-4 text-center text-brand-dim/30 font-normal">-</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

              </div>

            </div>

            {/* LEFT SIDE: Active Wallets Balances (Span 1) */}
            <div className="lg:col-span-1">
              
              <div className="backdrop-blur-xl bg-brand-card/40 border border-brand-border/40 rounded-3xl p-6 md:p-7 space-y-6 shadow-xl relative min-h-[500px] flex flex-col justify-between">
                
                <div>
                  {/* Header */}
                  <div className="border-b border-brand-border/25 pb-4.5 mb-5">
                    <h2 className="text-base md:text-lg font-extrabold text-white flex items-center gap-2">
                      <span className="text-brand-accent">3.</span> محافظ الكاش النشطة
                    </h2>
                    <p className="text-[10px] text-brand-dim/60 leading-relaxed mt-2">
                      أرصدة محافظك المسجلة في النظام. أدخل الرصيد الفعلي المتوفر في كل محفظة اليوم لإتمام عملية الإغلاق المالي.
                    </p>
                  </div>

                  {/* Scrollable Wallets List */}
                  {initialWallets.length > 0 ? (
                    <div className="space-y-3.5 max-h-[360px] overflow-y-auto pr-1.5 custom-scrollbar">
                      {initialWallets.map((wallet) => (
                        <div
                          key={wallet.id}
                          className="px-4.5 py-2.5 rounded-xl bg-[#090b16]/90 border border-brand-border/30 hover:border-brand-accent/25 transition-all flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              onClick={() => handleCopyText(wallet.phone_number)}
                              className="text-white/30 hover:text-white transition-colors cursor-pointer"
                              title="نسخ رقم الهاتف"
                            >
                              <Copy size={12} />
                            </button>
                            <span className="text-xs font-bold text-white font-inter dir-ltr select-all">
                              {wallet.phone_number}
                            </span>
                          </div>
                          <div className="relative w-28">
                            <input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              required
                              value={newWalletsBalances[wallet.id] ?? ""}
                              onChange={(e) => handleWalletBalanceChange(wallet.id, e.target.value)}
                              dir="ltr"
                              className="w-full h-8.5 px-2 bg-[#030408]/90 border border-brand-border/40 rounded-lg text-xs text-white placeholder-brand-dim/20 focus:outline-none focus:border-brand-accent text-center font-inter dir-ltr"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-bold text-brand-dim/50 pointer-events-none">ج.م</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Empty Wallets State */
                    <div className="text-center py-10 border border-dashed border-brand-border/30 rounded-2xl p-4 bg-[#090b16]/30">
                      <FolderSync className="text-brand-dim/20 mx-auto mb-2" size={24} />
                      <p className="text-xs text-brand-dim/60">لا توجد محافظ نشطة مضافة لهذا الحساب.</p>
                    </div>
                  )}
                </div>

                {/* Total Cash in Wallets Displays */}
                <div className="border-t border-brand-border/25 pt-4 mt-6">
                  <div className="flex items-center justify-between bg-[#0b0e1a]/60 border border-brand-border/30 rounded-2xl p-4">
                    <span className="text-xs font-bold text-brand-dim/80">إجمالي كاش المحافظ:</span>
                    <span className="text-sm font-extrabold font-inter text-emerald-400">
                      {newWalletsTotalCash.toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م
                    </span>
                  </div>
                </div>

              </div>

            </div>

          </div>

          {/* BOTTOM SECTION: Final Summary Card */}
          <div className="backdrop-blur-xl bg-brand-card/40 border border-brand-border/40 rounded-3xl p-6 md:p-7 space-y-6 shadow-xl relative">
            
            <div className="border-b border-brand-border/25 pb-4 mb-5">
              <h2 className="text-base md:text-lg font-extrabold text-white flex items-center gap-2">
                <span className="text-brand-accent">4.</span> التلخيص المالي النهائي
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-[#0b0e1a]/50 border border-brand-border/35 rounded-2xl p-4 flex flex-col justify-center space-y-1">
                <span className="text-[10px] font-bold text-brand-dim/60">إجمالي المصروفات (ماركتنج + شخصي + تحويلات)</span>
                <span className="text-base font-extrabold text-white font-inter mt-1.5">
                  {newTotalExpenses.toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م
                </span>
              </div>

              <div className="bg-[#0b0e1a]/50 border border-brand-border/35 rounded-2xl p-4 flex flex-col justify-center space-y-1">
                <span className="text-[10px] font-bold text-brand-dim/60">إجمالي أرصدة المحافظ النشطة</span>
                <span className="text-base font-extrabold text-white font-inter mt-1.5">
                  {newWalletsTotalCash.toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م
                </span>
              </div>

              <div className="bg-[#0b0e1a]/50 border border-brand-border/35 rounded-2xl p-4 flex flex-col justify-center space-y-1">
                <span className="text-[10px] font-bold text-brand-dim/60">الكاش النهائي المتبقي عجز / زيادة</span>
                <span className={`text-base font-extrabold font-inter mt-1.5 ${newFinalCashDifference >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {newFinalCashDifference.toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م
                </span>
              </div>
            </div>

          </div>

          {/* Submit Button */}
          <div className="flex justify-center mt-6">
            <button
              type="submit"
              disabled={isPending}
              className="w-full max-w-md h-12.5 rounded-xl bg-brand-accent hover:bg-brand-accent/90 text-white font-bold text-sm shadow-[0_0_25px_rgba(139,92,246,0.3)] transition-all duration-300 flex items-center justify-center gap-2.5 active:scale-[0.98] cursor-pointer disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <RefreshCw size={17} className="animate-spin" />
                  <span>جاري تسجيل وإغلاق التقرير...</span>
                </>
              ) : (
                <>
                  <CheckCircle size={17} />
                  <span>حفظ وإغلاق التقرير اليومي</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* --- TAB 2: EDIT REPORT --- */}
      {activeTab === "edit" && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Top Selection Box */}
          <div className="backdrop-blur-xl bg-brand-card/40 border border-brand-border/40 rounded-3xl p-6 shadow-xl relative text-right flex justify-start z-30">
            <div className="space-y-1.5 w-full max-w-sm relative" ref={editSelectRef}>
              <label className="block text-sm font-bold text-white mb-2">اختر تاريخ التقرير المراد تعديله:</label>
              <button
                type="button"
                dir="rtl"
                onClick={() => setIsEditSelectOpen(!isEditSelectOpen)}
                className="w-full h-11 px-4.5 rounded-xl bg-[#060811]/90 border border-brand-border/50 text-white focus:outline-none focus:border-brand-accent transition-all cursor-pointer flex items-center justify-between select-none font-inter text-xs"
              >
                <span>
                  {editSelectedId
                    ? initialReports.find((r) => r.id === editSelectedId)?.report_date || "-- اختر تاريخ التقرير --"
                    : "-- اختر تاريخ التقرير --"}
                </span>
                <ChevronDown
                  size={16}
                  className={`text-white/40 transition-transform duration-200 ${isEditSelectOpen ? "rotate-180 text-brand-accent" : ""}`}
                />
              </button>

              {isEditSelectOpen && (
                <div className="absolute right-0 left-0 mt-2 bg-[#0c0e18] border border-brand-border/80 rounded-xl shadow-2xl p-1.5 z-[9999] animate-scale-in text-right max-h-56 overflow-y-auto custom-scrollbar">
                  <button
                    type="button"
                    onClick={() => {
                      setEditSelectedId("");
                      setIsEditSelectOpen(false);
                    }}
                    className={`w-full px-3 py-2 rounded-lg text-right text-xs transition-colors block cursor-pointer font-cairo ${
                      editSelectedId === ""
                        ? "text-brand-accent bg-brand-accent/15 font-bold"
                        : "text-white/70 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    -- اختر تاريخ التقرير --
                  </button>
                  {initialReports.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        setEditSelectedId(r.id || "");
                        selectReportToEdit(r.id || "");
                        setIsEditSelectOpen(false);
                      }}
                      className={`w-full px-3 py-2 rounded-lg text-right text-xs transition-colors block cursor-pointer font-inter ${
                        editSelectedId === r.id
                          ? "text-brand-accent bg-brand-accent/15 font-bold"
                          : "text-white/70 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      {r.report_date}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {editSelectedId ? (
            <form onSubmit={handleEditSubmit} className="space-y-6 animate-fade-in" autoComplete="off">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* RIGHT SIDE */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Card 1: المالية العامة وحركة الكاش */}
                  <div className="backdrop-blur-xl bg-brand-card/40 border border-brand-border/40 rounded-3xl p-6 md:p-7 space-y-6 shadow-xl relative">
                    
                    <div className="flex items-center justify-between flex-wrap gap-4 border-b border-brand-border/25 pb-4.5">
                      <h2 className="text-base md:text-lg font-extrabold text-white flex items-center gap-2">
                        <span className="text-brand-accent">1.</span> المالية العامة وحركة الكاش (تعديل)
                      </h2>
                      <div className="h-10 px-4 flex items-center justify-center bg-[#0b0e1a]/60 border border-brand-border/45 text-xs text-brand-dim font-bold rounded-xl font-inter select-none">
                        {editReportDate}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div className="space-y-2 text-right">
                        <label className="block text-xs font-bold text-white/90">إجمالي الكاش المستلم</label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={editReceivedCash}
                            onChange={(e) => setEditReceivedCash(e.target.value)}
                            dir="ltr"
                            className="w-full h-11 px-4.5 bg-[#060811]/90 border border-brand-border/50 rounded-xl text-xs text-white focus:outline-none focus:border-brand-accent text-center font-inter dir-ltr"
                          />
                          <span className="absolute right-4.5 top-1/2 -translate-y-1/2 text-[10px] text-brand-dim/50 font-bold">ج.م</span>
                        </div>
                      </div>

                      <div className="space-y-2 text-right">
                        <label className="block text-xs font-bold text-white/90">مصاريف شخصية</label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={editPersonalExpenses}
                            onChange={(e) => setEditPersonalExpenses(e.target.value)}
                            dir="ltr"
                            className="w-full h-11 px-4.5 bg-[#060811]/90 border border-brand-border/50 rounded-xl text-xs text-white focus:outline-none focus:border-brand-accent text-center font-inter dir-ltr"
                          />
                          <span className="absolute right-4.5 top-1/2 -translate-y-1/2 text-[10px] text-brand-dim/50 font-bold">ج.م</span>
                        </div>
                      </div>

                      <div className="space-y-2 text-right">
                        <label className="block text-xs font-bold text-white/90">تحويلات الزملاء</label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={editColleagueTransfers}
                            onChange={(e) => setEditColleagueTransfers(e.target.value)}
                            dir="ltr"
                            className="w-full h-11 px-4.5 bg-[#060811]/90 border border-brand-border/50 rounded-xl text-xs text-white focus:outline-none focus:border-brand-accent text-center font-inter dir-ltr"
                          />
                          <span className="absolute right-4.5 top-1/2 -translate-y-1/2 text-[10px] text-brand-dim/50 font-bold">ج.م</span>
                        </div>
                      </div>
                    </div>



                  </div>

                  {/* Card 2: حاسبة تكلفة العميل (CPL Calculator) */}
                  <div className="backdrop-blur-xl bg-brand-card/40 border border-brand-border/40 rounded-3xl p-6 md:p-7 space-y-6 shadow-xl relative">
                    
                    <div className="border-b border-brand-border/25 pb-4.5">
                      <h2 className="text-base md:text-lg font-extrabold text-white flex items-center gap-2">
                        <span className="text-brand-accent">2.</span> حاسبة تكلفة العميل (CPL Calculator)
                      </h2>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-right border-collapse">
                        <thead>
                          <tr className="border-b border-brand-border/30 text-xs text-brand-dim/70 font-bold">
                            <th className="pb-3 text-right">النظام الإعلاني</th>
                            <th className="pb-3 text-center">المبلغ المصروف (ج.م)</th>
                            <th className="pb-3 text-center">عدد الليدات</th>
                            <th className="pb-3 text-center">التكلفة الفعلية (CPL)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-border/15 text-xs text-white">
                          {editMarketingSystems.map((item, idx) => {
                            const isMarketing2 = idx === 1;
                            const spendVal = isMarketing2 ? editMarketing2Spend : item.spend;
                            const cplVal = isMarketing2 ? editMarketing2Cpl : item.cpl;

                            return (
                              <tr key={item.systemName} className="hover:bg-white/[0.01]">
                                <td className="py-4 font-bold text-white/95">{item.systemName}</td>
                                <td className="py-4 text-center">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={spendVal || ""}
                                    onChange={(e) => !isMarketing2 && handleEditMarketingChange(idx, "spend", e.target.value)}
                                    placeholder="0"
                                    readOnly={isMarketing2}
                                    dir="ltr"
                                    className={`mx-auto text-center w-28 sm:w-36 h-9 px-3 border rounded-lg font-inter dir-ltr ${
                                      isMarketing2
                                        ? "bg-[#0b0e1a]/50 border-brand-border/20 text-brand-dim/70 cursor-not-allowed select-none"
                                        : "bg-[#060811]/90 border-brand-border/40 text-white focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent/10"
                                    }`}
                                  />
                                </td>
                                <td className="py-4 text-center">
                                  <input
                                    type="number"
                                    value={item.leads || ""}
                                    onChange={(e) => handleEditMarketingChange(idx, "leads", e.target.value)}
                                    placeholder="0"
                                    dir="ltr"
                                    className="mx-auto text-center w-20 sm:w-28 h-9 px-3 bg-[#060811]/90 border border-brand-border/40 rounded-lg text-white focus:outline-none focus:border-brand-accent font-inter dir-ltr"
                                  />
                                </td>
                                <td className="py-4 text-center font-bold font-inter text-brand-accent">
                                  {item.leads > 0 ? (
                                    <span>{cplVal.toFixed(2)} ج.م</span>
                                  ) : (
                                    <span className="text-brand-dim/30 text-[10px] font-normal">أدخل ليدز أولاً</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-brand-border/30 text-xs font-extrabold text-white bg-[#0b0e1a]/30">
                            <td className="py-4 pr-3 font-extrabold text-brand-dim/80">إجمالي عدد الليدز والشرائح:</td>
                            <td className="py-4 text-center font-inter text-emerald-400">
                              {editMarketingTotalSpend.toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م
                            </td>
                            <td className="py-4 text-center font-inter text-emerald-400">
                              {editMarketingTotalLeads} ليد
                            </td>
                            <td className="py-4 text-center text-brand-dim/30 font-normal">-</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                  </div>

                </div>

                {/* LEFT SIDE */}
                <div className="lg:col-span-1">
                  
                  <div className="backdrop-blur-xl bg-brand-card/40 border border-brand-border/40 rounded-3xl p-6 md:p-7 space-y-6 shadow-xl relative min-h-[500px] flex flex-col justify-between">
                    
                    <div>
                      <div className="border-b border-brand-border/25 pb-4.5 mb-5">
                        <h2 className="text-base md:text-lg font-extrabold text-white flex items-center gap-2">
                          <span className="text-brand-accent">3.</span> محافظ الكاش النشطة
                        </h2>
                      </div>

                      {initialWallets.length > 0 ? (
                        <div className="space-y-3.5 max-h-[360px] overflow-y-auto pr-1.5 custom-scrollbar">
                          {initialWallets.map((wallet) => (
                            <div
                              key={wallet.id}
                              className="px-4.5 py-2.5 rounded-xl bg-[#090b16]/90 border border-brand-border/30 hover:border-brand-accent/25 transition-all flex items-center justify-between gap-3"
                            >
                              <div className="flex items-center gap-2.5">
                                <button
                                  type="button"
                                  onClick={() => handleCopyText(wallet.phone_number)}
                                  className="text-white/30 hover:text-white transition-colors cursor-pointer"
                                  title="نسخ رقم الهاتف"
                                >
                                  <Copy size={12} />
                                </button>
                                <span className="text-xs font-bold text-white font-inter dir-ltr select-all">
                                  {wallet.phone_number}
                                </span>
                              </div>
                              <div className="relative w-28">
                                <input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  required
                                  value={editWalletsBalances[wallet.id] ?? ""}
                                  onChange={(e) => handleEditWalletBalanceChange(wallet.id, e.target.value)}
                                  dir="ltr"
                                  className="w-full h-8.5 px-2 bg-[#030408]/90 border border-brand-border/40 rounded-lg text-xs text-white placeholder-brand-dim/20 focus:outline-none focus:border-brand-accent text-center font-inter dir-ltr"
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-bold text-brand-dim/50 pointer-events-none">ج.م</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-10 border border-dashed border-brand-border/30 rounded-2xl p-4 bg-[#090b16]/30">
                          <FolderSync className="text-brand-dim/20 mx-auto mb-2" size={24} />
                          <p className="text-xs text-brand-dim/60">لا توجد محافظ نشطة مضافة لهذا الحساب.</p>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-brand-border/25 pt-4 mt-6">
                      <div className="flex items-center justify-between bg-[#0b0e1a]/60 border border-brand-border/30 rounded-2xl p-4">
                        <span className="text-xs font-bold text-brand-dim/80">إجمالي كاش المحافظ:</span>
                        <span className="text-sm font-extrabold font-inter text-emerald-400">
                          {editWalletsTotalCash.toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م
                        </span>
                      </div>
                    </div>

                  </div>

                </div>

              </div>

              {/* Summary */}
              <div className="backdrop-blur-xl bg-brand-card/40 border border-brand-border/40 rounded-3xl p-6 md:p-7 space-y-6 shadow-xl relative">
                
                <div className="border-b border-brand-border/25 pb-4 mb-5">
                  <h2 className="text-base md:text-lg font-extrabold text-white flex items-center gap-2">
                    <span className="text-brand-accent">4.</span> التلخيص المالي النهائي
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="bg-[#0b0e1a]/50 border border-brand-border/35 rounded-2xl p-4 flex flex-col justify-center space-y-1">
                    <span className="text-[10px] font-bold text-brand-dim/60">إجمالي المصروفات (تعديل)</span>
                    <span className="text-base font-extrabold text-white font-inter mt-1.5">
                      {editTotalExpenses.toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م
                    </span>
                  </div>

                  <div className="bg-[#0b0e1a]/50 border border-brand-border/35 rounded-2xl p-4 flex flex-col justify-center space-y-1">
                    <span className="text-[10px] font-bold text-brand-dim/60">إجمالي أرصدة المحافظ (تعديل)</span>
                    <span className="text-base font-extrabold text-white font-inter mt-1.5">
                      {editWalletsTotalCash.toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م
                    </span>
                  </div>

                  <div className="bg-[#0b0e1a]/50 border border-brand-border/35 rounded-2xl p-4 flex flex-col justify-center space-y-1">
                    <span className="text-[10px] font-bold text-brand-dim/60">الكاش النهائي المتبقي عجز / زيادة</span>
                    <span className={`text-base font-extrabold font-inter mt-1.5 ${editFinalCashDifference >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {editFinalCashDifference.toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م
                    </span>
                  </div>
                </div>

              </div>

              {/* Submit */}
              <div className="flex justify-center mt-6">
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full max-w-md h-12.5 rounded-xl bg-brand-accent hover:bg-brand-accent/90 text-white font-bold text-sm shadow-[0_0_25px_rgba(139,92,246,0.3)] transition-all duration-300 flex items-center justify-center gap-2.5 active:scale-[0.98] cursor-pointer"
                >
                  {isPending ? (
                    <>
                      <RefreshCw size={17} className="animate-spin" />
                      <span>جاري تحديث التقرير...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle size={17} />
                      <span>حفظ تعديلات التقرير المالي</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="backdrop-blur-xl bg-brand-card/30 border border-brand-border/40 rounded-3xl py-14 text-center">
              <p className="text-sm text-brand-dim/50 font-bold">يرجى اختيار تاريخ تقرير من القائمة المنسدلة للتعديل عليه.</p>
            </div>
          )}

        </div>
      )}

      {/* --- TAB 3: HISTORY LOGS --- */}
      {activeTab === "history" && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Filters Bar */}
          <div className="backdrop-blur-xl bg-brand-card/40 border border-brand-border/40 p-4.5 rounded-2xl shadow-xl flex items-center justify-between gap-4 flex-wrap relative z-25 text-right">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-brand-dim/75">تصفية التاريخ:</span>
              <input
                type="date"
                value={historyFilterDate}
                onChange={(e) => setHistoryFilterDate(e.target.value)}
                onClick={(e) => e.currentTarget.showPicker()}
                className="h-10 px-3 bg-[#060811]/90 border border-brand-border/50 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-brand-accent text-center font-inter cursor-pointer"
              />
              {historyFilterDate && (
                <button
                  type="button"
                  onClick={() => setHistoryFilterDate("")}
                  className="text-[10px] text-red-400 hover:underline font-bold cursor-pointer"
                >
                  إعادة تعيين
                </button>
              )}
            </div>
          </div>

          {/* History Tables */}
          <div className="backdrop-blur-xl bg-brand-card/45 border border-brand-border/40 rounded-3xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b border-brand-border/30 text-xs font-bold text-brand-dim/75 bg-[#090b15]/65">
                    <th className="py-4 pr-6 text-right">التاريخ</th>
                    <th className="py-4 text-left">إجمالي الكاش المستلم</th>
                    <th className="py-4 text-left">أرصدة المحافظ</th>
                    <th className="py-4 text-left">Marketing Sys 1</th>
                    <th className="py-4 text-left">الكاش المتبقي</th>
                    <th className="py-4 text-left">إجمالي الليدات</th>
                    <th className="py-4 pl-6 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-brand-border/15 text-white/90">
                  {filteredReports.length > 0 ? (
                    filteredReports.map((report) => {
                      const id = report.id || "";
                      const isExpanded = !!expandedRows[id];
                      const totalWallets = report.wallets_balances?.reduce((sum, w) => sum + w.balance, 0) || 0;
                      
                      // Calculate remaining cash
                      const netCash = report.total_received_cash - (report.personal_expenses + report.colleague_transfers);
                      const diffCash = netCash - totalWallets;
                      
                      const totalLeads = report.marketing_systems?.reduce((sum, item) => sum + item.leads, 0) || 0;
                      const m1Spend = report.marketing_systems?.[0]?.spend || 0;

                      return (
                        <React.Fragment key={id}>
                          {/* Main Row */}
                          <tr className={`hover:bg-white/[0.015] transition-colors cursor-pointer ${isExpanded ? "bg-[#0b0e1b]/40 font-bold" : ""}`}>
                            <td className="py-4 pr-6 font-bold font-inter text-right">{report.report_date}</td>
                            <td className="py-4 text-left font-inter">
                              {report.total_received_cash.toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م
                            </td>
                            <td className="py-4 text-left font-inter">
                              {totalWallets.toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م
                            </td>
                            <td className="py-4 text-left font-inter text-brand-dim/80">
                              {m1Spend.toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م
                            </td>
                            <td className={`py-4 text-left font-inter ${diffCash >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                              {diffCash.toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م
                            </td>
                            <td className="py-4 text-left font-inter text-brand-accent">
                              {totalLeads} ليد
                            </td>
                            <td className="py-4 pl-6 text-center">
                              <div className="flex items-center justify-center gap-3">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    triggerEditReport(id);
                                  }}
                                  className="h-8 px-3 rounded-lg border border-brand-accent/20 bg-brand-accent/10 hover:bg-brand-accent/20 text-brand-accent hover:text-white transition-all font-bold flex items-center gap-1 cursor-pointer"
                                >
                                  <Edit size={12} />
                                  <span>تعديل</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleRowExpanded(id)}
                                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                                  title={isExpanded ? "إخفاء التفاصيل" : "عرض التفاصيل"}
                                >
                                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Expanded Details Row */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={7} className="p-0 bg-[#090b16]/75">
                                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8 text-right border-t border-b border-brand-border/20 animate-slide-down">
                                  
                                  {/* Col 1: حركة المصاريف والتحويلات */}
                                  <div className="space-y-3.5">
                                    <h4 className="text-xs font-black text-brand-accent border-b border-brand-border/20 pb-2 flex items-center gap-2">
                                      <span>حركة المصاريف والتحويلات</span>
                                    </h4>
                                    <div className="space-y-2 text-xs">
                                      <div className="flex items-center justify-between text-brand-dim/80">
                                        <span>مصاريف شخصية:</span>
                                        <span className="font-bold text-white font-inter">
                                          {(report.personal_expenses || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between text-brand-dim/80">
                                        <span>تحويلات الزملاء:</span>
                                        <span className="font-bold text-white font-inter">
                                          {(report.colleague_transfers || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between text-brand-dim/80">
                                        <span>مصاريف حملة إعلانية (إجمالي):</span>
                                        <span className="font-bold text-emerald-400 font-inter">
                                          {(report.marketing_systems?.reduce((sum, item) => sum + item.spend, 0) || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Col 2: أرصدة المحافظ في هذا اليوم */}
                                  <div className="space-y-3.5">
                                    <h4 className="text-xs font-black text-brand-accent border-b border-brand-border/20 pb-2 flex items-center gap-2">
                                      <span>أرصدة المحافظ في هذا اليوم</span>
                                    </h4>
                                    <div className="space-y-2.5 max-h-[140px] overflow-y-auto custom-scrollbar pr-1">
                                      {report.wallets_balances?.map((wb) => (
                                        <div key={wb.wallet_id} className="flex items-center justify-between text-xs">
                                          <span className="font-inter text-brand-dim/70 font-medium dir-ltr">{wb.phone_number}</span>
                                          <span className="font-bold text-white font-inter">
                                            {wb.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Col 3: تفاصيل الأنظمة وتكلفة العميل */}
                                  <div className="space-y-3.5">
                                    <h4 className="text-xs font-black text-brand-accent border-b border-brand-border/20 pb-2 flex items-center gap-2">
                                      <span>تفاصيل الأنظمة وتكلفة العميل (CPL)</span>
                                    </h4>
                                    <div className="space-y-2 text-xs">
                                      {report.marketing_systems?.map((item) => (
                                        <div key={item.systemName} className="flex flex-col space-y-1 border-b border-brand-border/10 pb-1.5 last:border-b-0">
                                          <div className="flex items-center justify-between">
                                            <span className="font-bold text-white/90">{item.systemName}:</span>
                                            <span className="font-bold font-inter text-brand-accent">CPL: {item.cpl.toFixed(2)} ج.م</span>
                                          </div>
                                          <div className="flex items-center justify-between text-[10px] text-brand-dim/60">
                                            <span>مبلغ مصروف: {item.spend.toLocaleString("en-US")} ج.م</span>
                                            <span>عدد الليدات: {item.leads} ليد</span>
                                          </div>
                                        </div>
                                      ))}
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
                      <td colSpan={7} className="py-14 text-center text-brand-dim/50 font-bold select-none">
                        لا توجد تقارير CPL وإغلاق مسجلة مطابقة للبحث.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="bg-[#0b0e1b] border border-brand-border/60 rounded-3xl p-6 md:p-7 max-w-md w-full mx-4 shadow-2xl space-y-6 text-center animate-scale-in">
            <div className="w-12 h-12 bg-brand-accent/15 border border-brand-accent/30 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle size={24} className="text-brand-accent animate-pulse" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-base font-extrabold text-white">تأكيد حفظ البيانات</h3>
              <p className="text-xs text-brand-dim leading-relaxed">
                هل أنت متأكد أنك قمت بإدخال جميع البيانات بشكل صحيح لتاريخ{" "}
                <span className="font-bold text-white font-inter">{editReportDate}</span>؟
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={executeEditSubmit}
                className="flex-1 h-10 rounded-xl bg-brand-accent hover:bg-brand-accent/90 text-white text-xs font-bold shadow-[0_0_15px_rgba(139,92,246,0.25)] transition-all cursor-pointer active:scale-95 flex items-center justify-center"
              >
                تأكيد الحفظ
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 h-10 rounded-xl bg-white/5 border border-brand-border/40 text-brand-dim hover:text-white hover:bg-white/10 text-xs font-bold transition-all cursor-pointer active:scale-95"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
