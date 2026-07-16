"use client";

import React, { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Coins,
  Calendar,
  Lock,
  Eye,
  EyeOff,
  Send,
  Loader2,
  Wallet,
  ClipboardList,
  FileEdit,
  ChevronDown,
  Info,
  Plus,
  Trash2,
  User,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Copy,
  FolderSync,
  Megaphone,
} from "lucide-react";
import {
  WalletWithBalance,
  ColleagueData,
  submitFundRequest,
  submitDailyExpenses,
  getExpenseReportForDate,
  submitEditExpenseRequest,
} from "@/app/actions/operations";

interface OperationsClientProps {
  initialWallets: WalletWithBalance[];
  colleagues: ColleagueData[];
  userFullName: string;
  currentCustody: number;
}

type TabType = "fund-request" | "daily-expenses" | "edit-expenses";

interface TransferField {
  toAgentId: string;
  amount: string;
}

export default function OperationsClient({
  initialWallets,
  colleagues,
  userFullName,
  currentCustody,
}: OperationsClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("fund-request");
  const [isPending, startTransition] = useTransition();

  // Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Timezone limits
  const getLocalDateString = (offsetDays = 0) => {
    const date = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Riyadh", // UTC+3
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(date); // Output: YYYY-MM-DD
  };

  const todayStr = getLocalDateString(0);
  const yesterdayStr = getLocalDateString(-1);
  const tenDaysAgoStr = getLocalDateString(-10);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // ----------------------------------------------------
  // TAB 1: FUND REQUEST STATES & LOGIC
  // ----------------------------------------------------
  const [selectedWallet, setSelectedWallet] = useState<WalletWithBalance | null>(null);
  const [requestDate, setRequestDate] = useState("");
  const [amount, setAmount] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRequestDate(todayStr);
  }, [todayStr]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleFundRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedWallet) {
      showToast("يرجى اختيار المحفظة المستهدفة.", "error");
      return;
    }
    if (!requestDate) {
      showToast("يرجى تحديد تاريخ الطلب.", "error");
      return;
    }
    if (requestDate !== todayStr && requestDate !== yesterdayStr) {
      showToast("يُسمح فقط باختيار تاريخ اليوم أو الأمس.", "error");
      return;
    }
    const amountVal = parseFloat(amount);
    if (isNaN(amountVal) || amountVal <= 0) {
      showToast("يرجى إدخال مبلغ صحيح أكبر من الصفر.", "error");
      return;
    }

    // Client-side 200k monthly limit check
    if (selectedWallet) {
      const remainingLimit = selectedWallet.remainingLimit;
      if (amountVal > remainingLimit) {
        showToast(
          `عفواً، لا يمكنك طلب هذا المبلغ. الحد الأقصى المتبقي لهذه المحفظة هذا الشهر هو ${remainingLimit.toLocaleString("en-US")} ج.م`,
          "error"
        );
        return;
      }
    }
    if (!password || password.trim() === "") {
      showToast("يرجى إدخال كلمة المرور للتأكيد.", "error");
      return;
    }

    startTransition(async () => {
      const res = await submitFundRequest(
        {
          walletId: selectedWallet.id,
          requestDate,
          amountRequested: amountVal,
        },
        password
      );

      if (res.success) {
        showToast("تم إرسال طلب شحن الرصيد بنجاح وهو قيد الانتظار حالياً.", "success");
        setAmount("");
        setPassword("");
        setSelectedWallet(null);
        router.refresh();
      } else {
        showToast(res.error || "فشل إرسال طلب الشحن.", "error");
      }
    });
  };

  // ----------------------------------------------------
  // TAB 2: DAILY EXPENSES & TRANSFERS STATES & LOGIC
  // ----------------------------------------------------
  const [expenseDate, setExpenseDate] = useState("");
  const [marketing1, setMarketing1] = useState("");
  const [marketing3, setMarketing3] = useState("");
  const [personalExpense, setPersonalExpense] = useState("");
  const [transfers, setTransfers] = useState<TransferField[]>([]);
  const [closingPassword, setClosingPassword] = useState("");
  const [showClosingPassword, setShowClosingPassword] = useState(false);

  const [walletsBalances, setWalletsBalances] = useState<Record<string, string>>(() => {
    const balancesMap: Record<string, string> = {};
    initialWallets.forEach((w) => {
      balancesMap[w.id] = "";
    });
    return balancesMap;
  });

  const [campaignBalance, setCampaignBalance] = useState("");

  const walletsTotalCashWithoutCampaign = React.useMemo(() => {
    return Object.keys(walletsBalances).reduce((sum, walletId) => {
      return sum + (parseFloat(walletsBalances[walletId]) || 0);
    }, 0);
  }, [walletsBalances]);

  const walletsTotalCash = React.useMemo(() => {
    const camp = parseFloat(campaignBalance) || 0;
    return walletsTotalCashWithoutCampaign + camp;
  }, [walletsTotalCashWithoutCampaign, campaignBalance]);

  const [totalCash, setTotalCash] = useState("");

  useEffect(() => {
    if (currentCustody !== undefined) {
      setTotalCash(String(currentCustody));
    }
  }, [currentCustody]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("sp_wallets_balances");
      if (saved) {
        const parsed = JSON.parse(saved);
        setWalletsBalances((prev) => {
          const updated = { ...prev };
          Object.keys(parsed).forEach((key) => {
            if (updated[key] !== undefined) {
              updated[key] = parsed[key];
            }
          });
          return updated;
        });
      }
    } catch (err) {
      console.error("Error loading wallets balances from localStorage:", err);
    }
  }, []);

  const calculatedMarketing2 = React.useMemo(() => {
    const tCash = parseFloat(totalCash) || 0;
    const wTotal = walletsTotalCash;
    const m1 = parseFloat(marketing1) || 0;
    const m3 = parseFloat(marketing3) || 0;
    const pers = parseFloat(personalExpense) || 0;
    const transSum = transfers.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    
    // Formula: totalCash - (expenses & transfers) - walletsTotalCash
    const totalExpensesAndTransfers = pers + m1 + m3 + transSum;
    return tCash - totalExpensesAndTransfers - wTotal;
  }, [totalCash, walletsTotalCash, marketing1, marketing3, personalExpense, transfers]);

  const handleWalletBalanceChange = (walletId: string, val: string) => {
    setWalletsBalances((prev) => {
      const next = {
        ...prev,
        [walletId]: val,
      };
      try {
        localStorage.setItem("sp_wallets_balances", JSON.stringify(next));
      } catch (err) {
        console.error("Error saving wallets balances to localStorage:", err);
      }
      return next;
    });
  };

  useEffect(() => {
    setExpenseDate(todayStr);
  }, [todayStr]);

  const addTransferRow = () => {
    setTransfers([...transfers, { toAgentId: "", amount: "" }]);
  };

  const removeTransferRow = (index: number) => {
    setTransfers(transfers.filter((_, i) => i !== index));
  };

  const updateTransferRow = (index: number, key: keyof TransferField, value: string) => {
    setTransfers(
      transfers.map((t, i) => (i === index ? { ...t, [key]: value } : t))
    );
  };

  const pers = parseFloat(personalExpense) || 0;
  const transSum = transfers.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

  const totalAmount = React.useMemo(() => {
    const m1 = parseFloat(marketing1) || 0;
    const m2 = calculatedMarketing2;
    const m3 = parseFloat(marketing3) || 0;
    return m1 + m2 + m3 + pers + transSum;
  }, [marketing1, calculatedMarketing2, marketing3, pers, transSum]);

  const enteredTotalCash = parseFloat(totalCash) || 0;
  const cashAfterExpenses = totalCash !== "" ? (enteredTotalCash - pers - transSum) : 0;

  const m1 = parseFloat(marketing1) || 0;
  const m3 = parseFloat(marketing3) || 0;
  const totalMarketing = m1 + calculatedMarketing2 + m3;

  const handleExpensesSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!expenseDate) {
      showToast("يرجى تحديد تاريخ التقرير.", "error");
      return;
    }
    if (expenseDate !== todayStr && expenseDate !== yesterdayStr) {
      showToast("يُسمح فقط باختيار تاريخ اليوم أو الأمس للتقرير.", "error");
      return;
    }

    // Validate wallets balances
    try {
      initialWallets.forEach((w) => {
        const balanceVal = walletsBalances[w.id];
        if (balanceVal === undefined || balanceVal.trim() === "") {
          throw new Error(`يرجى تحديد رصيد المحفظة رقم ${w.phone_number}`);
        }
        const num = parseFloat(balanceVal);
        if (isNaN(num) || num < 0) {
          throw new Error(`رصيد المحفظة رقم ${w.phone_number} غير صحيح.`);
        }
      });
      
      const campNum = parseFloat(campaignBalance);
      if (campaignBalance !== "" && (isNaN(campNum) || campNum < 0)) {
        throw new Error("يرجى إدخال مبلغ صحيح لرصيد الكامبين.");
      }
    } catch (err: any) {
      showToast(err.message, "error");
      return;
    }

    if (totalAmount < 0) {
      showToast("إجمالي مصروفات المحفظة لا يمكن أن يكون سالباً.", "error");
      return;
    }
    if (calculatedMarketing2 < 0) {
      showToast("قيمة مصاريف ماركتنج 2 سالبة. يرجى التأكد من أن مجموع المصاريف والتحويلات الأخرى لا يتجاوز الكاش المصروف.", "error");
      return;
    }

    if (!closingPassword || closingPassword.trim() === "") {
      showToast("يرجى إدخال كلمة المرور لتأكيد إغلاق اليوم المالي.", "error");
      return;
    }

    const m1 = parseFloat(marketing1) || 0;
    const m2 = calculatedMarketing2;
    const m3 = parseFloat(marketing3) || 0;
    const pers = parseFloat(personalExpense) || 0;

    const formattedTransfers = transfers
      .filter((t) => t.toAgentId && t.amount)
      .map((t) => ({
        toAgentId: t.toAgentId,
        amount: parseFloat(t.amount) || 0,
      }));

    const walletsPayload = [
      ...initialWallets.map((w) => ({
        wallet_id: w.id,
        phone_number: w.phone_number,
        balance: parseFloat(walletsBalances[w.id]) || 0,
      })),
      {
        wallet_id: "campaign",
        phone_number: "كامبين",
        balance: parseFloat(campaignBalance) || 0,
      }
    ];

    startTransition(async () => {
      const res = await submitDailyExpenses(
        {
          expenseDate,
          totalAmount: totalAmount,
          marketing1: m1,
          marketing2: m2,
          marketing3: m3,
          personalExpense: pers,
          transfers: formattedTransfers,
          totalCash: parseFloat(totalCash) || 0,
          cashAfterExpenses: cashAfterExpenses,
          walletsBalances: walletsPayload,
        },
        closingPassword
      );

      if (res.success) {
        showToast("تم إغلاق اليوم المالي بنجاح وحفظ كافة المصروفات والتحويلات.", "success");
        setMarketing1("");
        setMarketing3("");
        setPersonalExpense("");
        setTransfers([]);
        setClosingPassword("");
        
        setCampaignBalance("");

        router.refresh();
      } else {
        showToast(res.error || "فشل إغلاق اليوم المالي.", "error");
      }
    });
  };

  // ----------------------------------------------------
  // TAB 3: EDIT EXPENSES STATES & LOGIC
  // ----------------------------------------------------
  const [editSearchDate, setEditSearchDate] = useState("");
  const [isFetchingReport, setIsFetchingReport] = useState(false);
  const [originalReport, setOriginalReport] = useState<{
    id: string;
    totalAmount: number;
    marketing1: number;
    marketing2: number;
    marketing3: number;
    personalExpense: number;
    expenseDate: string;
  } | null>(null);

  // Edit fields states
  const [editTotalAmount, setEditTotalAmount] = useState("");
  const [editMarketing1, setEditMarketing1] = useState("");
  const [editMarketing2, setEditMarketing2] = useState("");
  const [editMarketing3, setEditMarketing3] = useState("");
  const [editPersonalExpense, setEditPersonalExpense] = useState("");
  const [editTransfers, setEditTransfers] = useState<TransferField[]>([]);

  // Trigger search on search date picker change
  const handleEditDateChange = async (dateVal: string) => {
    setEditSearchDate(dateVal);
    if (!dateVal) {
      setOriginalReport(null);
      return;
    }

    setIsFetchingReport(true);
    try {
      const res = await getExpenseReportForDate(dateVal);
      if (res.success && res.found && res.report) {
        setOriginalReport(res.report);
        setEditTotalAmount(String(res.report.totalAmount));
        setEditMarketing1(String(res.report.marketing1));
        setEditMarketing2(String(res.report.marketing2));
        setEditMarketing3(String(res.report.marketing3));
        setEditPersonalExpense(String(res.report.personalExpense));
        setEditTransfers(
          (res.transfers || []).map((t) => ({
            toAgentId: t.toAgentId,
            amount: String(t.amount),
          }))
        );
      } else {
        setOriginalReport(null);
        showToast(res.error || "لا يوجد تقرير مالي مسجل لهذا التاريخ", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("حدث خطأ أثناء جلب تفاصيل التقرير.", "error");
      setOriginalReport(null);
    } finally {
      setIsFetchingReport(false);
    }
  };

  // Dynamic Row Actions for Edit Form
  const addEditTransferRow = () => {
    setEditTransfers([...editTransfers, { toAgentId: "", amount: "" }]);
  };

  const removeEditTransferRow = (index: number) => {
    setEditTransfers(editTransfers.filter((_, i) => i !== index));
  };

  const updateEditTransferRow = (index: number, key: keyof TransferField, value: string) => {
    setEditTransfers(
      editTransfers.map((t, i) => (i === index ? { ...t, [key]: value } : t))
    );
  };

  // Edit Form Math Verification
  const editCalculatedSum = React.useMemo(() => {
    const m1 = parseFloat(editMarketing1) || 0;
    const m2 = parseFloat(editMarketing2) || 0;
    const m3 = parseFloat(editMarketing3) || 0;
    const pers = parseFloat(editPersonalExpense) || 0;
    const transSum = editTransfers.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    return m1 + m2 + m3 + pers + transSum;
  }, [editMarketing1, editMarketing2, editMarketing3, editPersonalExpense, editTransfers]);

  const editEnteredTotal = parseFloat(editTotalAmount) || 0;
  const isEditMathMatching = Math.abs(editCalculatedSum - editEnteredTotal) < 0.01;
  const showEditMathWarning = editTotalAmount !== "" && !isEditMathMatching;
  const showEditMathSuccess = editTotalAmount !== "" && isEditMathMatching;

  const handleEditRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!originalReport) return;
    if (!isEditMathMatching) {
      showToast("مجموع الفلوس مش مساوي بعضه، ساويه الأول ودوس تاني.", "error");
      return;
    }

    const m1 = parseFloat(editMarketing1) || 0;
    const m2 = parseFloat(editMarketing2) || 0;
    const m3 = parseFloat(editMarketing3) || 0;
    const pers = parseFloat(editPersonalExpense) || 0;

    const formattedTransfers = editTransfers
      .filter((t) => t.toAgentId && t.amount)
      .map((t) => ({
        to_agent_id: t.toAgentId,
        amount: parseFloat(t.amount) || 0,
      }));

    startTransition(async () => {
      const res = await submitEditExpenseRequest(
        originalReport.id,
        {
          totalAmount: editEnteredTotal,
          marketing1: m1,
          marketing2: m2,
          marketing3: m3,
          personalExpense: pers,
          transfers: formattedTransfers,
        },
        "" // No password confirm needed
      );

      if (res.success) {
        showToast("تم إرسال طلب التعديل بنجاح إلى الإدارة وهو قيد المراجعة حالياً.", "success");
        // Reset tab
        setOriginalReport(null);
        setEditSearchDate("");
        router.refresh();
      } else {
        showToast(res.error || "فشل إرسال طلب التعديل.", "error");
      }
    });
  };

  return (
    <div className="space-y-8 font-cairo select-none relative text-right" dir="rtl">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-xl border ${
            toast.type === "success"
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
              : "bg-red-500/15 border-red-500/30 text-red-400"
          } transition-all duration-300 animate-slide-in font-semibold`}
        >
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header section */}
      <div className="flex items-start gap-4">
        {/* Decorative Clipboard Icon */}
        <div className="w-12 h-12 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent shrink-0 mt-1">
          <ClipboardList size={24} />
        </div>

        {/* Title and description */}
        <div className="space-y-1.5 text-right">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span>العمليات اليومية</span>
          </h1>
          <p className="text-sm text-brand-dim leading-relaxed">
            سجل طلبات الشحن، ومصاريفك الشخصية ومصاريف التسويق، بالإضافة إلى عمليات تحويل الأموال لزملائك.
          </p>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-brand-border/20 pb-4">
        {/* Tab 1: Fund Request */}
        <button
          onClick={() => setActiveTab("fund-request")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all cursor-pointer ${
            activeTab === "fund-request"
              ? "bg-brand-accent hover:bg-brand-accent/90 text-white shadow-[0_0_20px_rgba(139,92,246,0.3)]"
              : "bg-[#0c0e18]/40 border border-brand-border/40 text-brand-dim hover:text-white hover:bg-white/5"
          }`}
        >
          <Send size={15} className="rotate-180" />
          <span>طلب أموال</span>
        </button>

        {/* Tab 2: Daily Expenses and Transfers */}
        <button
          onClick={() => setActiveTab("daily-expenses")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all cursor-pointer ${
            activeTab === "daily-expenses"
              ? "bg-brand-accent hover:bg-brand-accent/90 text-white shadow-[0_0_20px_rgba(139,92,246,0.3)]"
              : "bg-[#0c0e18]/40 border border-brand-border/40 text-brand-dim hover:text-white hover:bg-white/5"
          }`}
        >
          <ClipboardList size={15} />
          <span>المصاريف والتحويلات اليومية</span>
        </button>

        {/* Tab 3: Edit Expenses */}
        <button
          onClick={() => setActiveTab("edit-expenses")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all cursor-pointer ${
            activeTab === "edit-expenses"
              ? "bg-brand-accent hover:bg-brand-accent/90 text-white shadow-[0_0_20px_rgba(139,92,246,0.3)]"
              : "bg-[#0c0e18]/40 border border-brand-border/40 text-brand-dim hover:text-white hover:bg-white/5"
          }`}
        >
          <FileEdit size={15} />
          <span>تعديل المصاريف</span>
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === "fund-request" && (
        <div className="max-w-4xl mx-auto">
          {/* Main Form Glassmorphic Card Container */}
          <div className="backdrop-blur-xl bg-brand-card/95 border border-brand-border/55 p-6 md:p-8 rounded-[24px] shadow-2xl relative">
            <div className="space-y-1.5 mb-8 text-center md:text-right">
              <h2 className="text-xl font-bold text-white flex items-center justify-center md:justify-start gap-2">
                <span>طلب شحن رصيد أموال</span>
              </h2>
              <p className="text-xs md:text-sm text-brand-dim leading-relaxed">
                أرسل طلباً جديداً لشحن رصيد إلى إحدى محافظك الإلكترونية النشطة. يتطلب تأكيد العملية إدخال كلمة مرور حسابك الشخصي.
              </p>
            </div>

            <form onSubmit={handleFundRequestSubmit} className="space-y-6" autoComplete="off">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                
                {/* 1. Request Date Field (تاريخ الطلب - Right) */}
                <div className="space-y-2">
                  <label htmlFor="requestDate" className="block text-[13px] font-medium text-brand-dim">
                    تاريخ الطلب
                  </label>
                  <div className="relative">
                    <input
                      id="requestDate"
                      type="date"
                      required
                      disabled={isPending}
                      min={yesterdayStr}
                      max={todayStr}
                      value={requestDate}
                      onChange={(e) => setRequestDate(e.target.value)}
                      onClick={(e) => e.currentTarget.showPicker()}
                      className="w-full bg-[#070814]/80 border border-brand-border/80 rounded-xl pl-4 pr-11 py-3.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-glow transition-all duration-300 disabled:opacity-50 text-left dir-ltr font-inter cursor-pointer"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none">
                      <Calendar size={16} />
                    </span>
                  </div>
                </div>

                {/* 2. Target Wallet Dropdown Field (المحفظة المستهدفة - Left) */}
                <div className="space-y-2">
                  <label className="block text-[13px] font-medium text-brand-dim">
                    المحفظة المستهدفة
                  </label>
                  
                  {/* Custom Dropdown */}
                  <div className="relative" ref={dropdownRef}>
                    <button
                      type="button"
                      onClick={() => !isPending && setIsDropdownOpen(!isDropdownOpen)}
                      disabled={isPending}
                      className={`w-full flex items-center justify-between px-4 py-3.5 bg-[#070814]/80 border rounded-xl text-sm text-right transition-all cursor-pointer select-none relative focus:outline-none focus:ring-1 focus:ring-brand-glow ${
                        isDropdownOpen ? "border-brand-accent text-white" : "border-brand-border/80 text-brand-dim"
                      } disabled:opacity-50`}
                    >
                      <div className="flex items-center gap-3">
                        <Wallet size={16} className="text-white/30" />
                        {selectedWallet ? (
                          <span className="font-semibold text-white font-inter">
                            {selectedWallet.phone_number}
                            <span className="text-[11px] text-brand-dim font-cairo font-normal mr-2">
                              (الرصيد: {selectedWallet.calculatedBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م • متبقي: {selectedWallet.remainingLimit.toLocaleString("en-US")} ج.م)
                            </span>
                          </span>
                        ) : (
                          <span>اختر محفظة...</span>
                        )}
                      </div>
                      <ChevronDown
                        size={14}
                        className={`text-white/40 transition-transform duration-200 ${
                          isDropdownOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {isDropdownOpen && (
                      <div className="absolute right-0 left-0 mt-2 bg-[#0c0e18]/95 backdrop-blur-xl border border-brand-border rounded-xl shadow-2xl p-1 z-30 animate-scale-in text-right max-h-56 overflow-y-auto custom-scrollbar">
                        {initialWallets.length > 0 ? (
                          <div className="space-y-0.5">
                            {initialWallets.map((wallet) => (
                              <button
                                key={wallet.id}
                                type="button"
                                onClick={() => {
                                  setSelectedWallet(wallet);
                                  setIsDropdownOpen(false);
                                }}
                                className={`w-full text-right px-4 py-3 text-xs rounded-lg transition-colors cursor-pointer block ${
                                  selectedWallet?.id === wallet.id
                                    ? "bg-brand-accent text-white font-semibold"
                                    : "text-white/80 hover:bg-white/5 hover:text-white"
                                }`}
                              >
                                <div className="flex justify-between items-center font-inter">
                                  <span className="font-bold text-sm tracking-wide">{wallet.phone_number}</span>
                                  <div className="text-right space-y-0.5">
                                    <div className="text-xs text-brand-dim/80">
                                      الرصيد: {wallet.calculatedBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م
                                    </div>
                                    <div className={`text-[10px] font-bold ${
                                      wallet.remainingLimit < 10000 ? "text-amber-400" : "text-emerald-400"
                                    }`}>
                                      متبقي: {wallet.remainingLimit.toLocaleString("en-US")} ج.م
                                    </div>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="py-6 text-center text-xs text-brand-dim/50">
                            لا توجد محافظ نشطة متاحة حالياً. (قد تكون جميع المحافظ بلغت الحد الشهري)
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Requested Amount Field (المبلغ المطلوب (ج.م) - Right) */}
                <div className="space-y-2">
                  <label htmlFor="amount" className="block text-[13px] font-medium text-brand-dim">
                    المبلغ المطلوب (ج.م)
                  </label>
                  <div className="relative">
                    <input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={selectedWallet ? selectedWallet.remainingLimit : undefined}
                      required
                      disabled={isPending}
                      value={amount}
                      onChange={(e) => {
                        e.target.setCustomValidity("");
                        setAmount(e.target.value);
                      }}
                      onInvalid={(e) => {
                        const target = e.target as HTMLInputElement;
                        if (target.validity.rangeOverflow && selectedWallet) {
                          target.setCustomValidity(`يجب أن يكون المبلغ أقل من أو يساوي ${selectedWallet.remainingLimit.toLocaleString("en-US")} ج.م`);
                        } else if (target.validity.valueMissing) {
                          target.setCustomValidity("يرجى إدخال المبلغ");
                        } else if (target.validity.rangeUnderflow) {
                          target.setCustomValidity("يجب أن يكون المبلغ أكبر من الصفر");
                        } else {
                          target.setCustomValidity("");
                        }
                      }}
                      placeholder="0.00"
                      className="w-full bg-[#070814]/80 border border-brand-border/80 rounded-xl pl-4 pr-11 py-3.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-glow transition-all duration-300 disabled:opacity-50 text-left dir-ltr font-inter"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 font-bold text-sm font-inter pointer-events-none select-none">
                      $
                    </span>
                  </div>
                  {selectedWallet && (
                    <p className="text-[10px] text-brand-dim/60 select-none">
                      * الحد الأقصى المتبقي: <span className="font-inter font-bold text-emerald-400">{selectedWallet.remainingLimit.toLocaleString("en-US")} ج.م</span>
                    </p>
                  )}
                </div>

                {/* 4. Password Confirmation Field (تأكيد بكلمة المرور - Left) */}
                <div className="space-y-2">
                  <label htmlFor="passwordConfirm" className="block text-[13px] font-medium text-brand-dim">
                    تأكيد بكلمة المرور
                  </label>
                  <div className="relative">
                    <input
                      id="passwordConfirm"
                      type={showPassword ? "text" : "password"}
                      required
                      disabled={isPending}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="أدخل كلمة مرور حسابك الشخصي"
                      autoComplete="new-password"
                      className="w-full bg-[#070814]/80 border border-brand-border/80 rounded-xl pl-11 pr-11 py-3.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-glow transition-all duration-300 disabled:opacity-50 text-right font-cairo"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none">
                      <Lock size={16} />
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isPending}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors cursor-pointer focus:outline-none p-1 rounded"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isPending}
                className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-brand-accent hover:bg-brand-accent/95 disabled:bg-brand-accent/50 text-white font-bold rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:shadow-[0_0_25px_rgba(139,92,246,0.45)] active:scale-[0.98] disabled:scale-100 disabled:cursor-not-allowed cursor-pointer mt-8"
              >
                {isPending ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>جاري الإرسال...</span>
                  </>
                ) : (
                  <>
                    <Send size={16} className="rotate-180" />
                    <span>إرسال طلب الشحن</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === "daily-expenses" && (
        <div className="max-w-6xl mx-auto animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* Right Side: Daily Close Form (Span 2) */}
            <div className="lg:col-span-2">
              <div className="backdrop-blur-xl bg-brand-card/95 border border-brand-border/55 p-6 md:p-8 rounded-[24px] shadow-2xl relative">
                <div className="space-y-1.5 mb-8 text-center md:text-right">
                  <h2 className="text-xl font-bold text-white flex items-center justify-center md:justify-start gap-2">
                    <span>إغلاق المصاريف والتحويلات اليومية</span>
                  </h2>
                  <p className="text-xs md:text-sm text-brand-dim leading-relaxed">
                    سجل تقريرك المالي اليومي. أدخل المصروفات الشخصية ومصاريف التسويق، بالإضافة إلى عمليات تحويل العهدة لزملائك. يتطلب تأكيد العملية إدخال كلمة المرور.
                  </p>
                </div>

                <form onSubmit={handleExpensesSubmit} className="space-y-6" autoComplete="off">
                  
                  {/* Form Fields Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                
                    {/* 1. Report Date (تاريخ التقرير) */}
                    <div className="space-y-2">
                      <label htmlFor="expenseDate" className="block text-[13px] font-medium text-brand-dim">
                        تاريخ التقرير
                      </label>
                      <div className="relative">
                        <input
                          id="expenseDate"
                          type="date"
                          required
                          disabled={isPending}
                          min={yesterdayStr}
                          max={todayStr}
                          value={expenseDate}
                          onChange={(e) => setExpenseDate(e.target.value)}
                          onClick={(e) => e.currentTarget.showPicker()}
                          className="w-full bg-[#070814]/80 border border-brand-border/80 rounded-xl pl-4 pr-11 py-3.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-glow transition-all duration-300 disabled:opacity-50 text-left dir-ltr font-inter cursor-pointer"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none">
                          <Calendar size={16} />
                        </span>
                      </div>
                      <span className="text-[10px] text-brand-dim/60 block mt-1 select-none">
                        * يمكنك إغلاق اليوم (النهاردة أو إمبارح) بحد أقصى مرتين فقط
                      </span>
                    </div>

                    {/* 2. Total Cash (توتال الكاش) */}
                    <div className="space-y-2">
                      <label htmlFor="totalCash" className="block text-[13px] font-medium text-brand-dim font-cairo font-semibold">
                        توتال الكاش (ج.م)
                      </label>
                      <div className="relative">
                        <input
                          id="totalCash"
                          type="number"
                          step="0.01"
                          required
                          disabled={isPending}
                          value={totalCash}
                          onChange={(e) => setTotalCash(e.target.value)}
                          placeholder="0.00"
                          className="w-full bg-[#070814]/80 border border-brand-border/80 rounded-xl pl-4 pr-11 py-3.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-glow transition-all duration-300 disabled:opacity-50 text-left dir-ltr font-inter"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none">
                          <Wallet size={16} />
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1 text-[10px] text-brand-dim/50 select-none flex-wrap gap-2">
                        <span>
                          * إجمالي العهدة الحالية: <span className="font-inter font-bold text-brand-accent">{currentCustody.toLocaleString("en-US")} ج.م</span>
                        </span>
                        {walletsTotalCash > 0 && (
                          <button
                            type="button"
                            onClick={() => setTotalCash(String(walletsTotalCash))}
                            className="text-emerald-400 hover:text-emerald-300 transition-colors font-semibold flex items-center gap-1 cursor-pointer animate-fade-in"
                          >
                            <span>تعبئة من المحافظ ({walletsTotalCash.toLocaleString("en-US")} ج.م)</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 3. Total Expenses & Transfers (إجمالي مصروفات المحفظة) */}
                    <div className="space-y-2">
                      <label htmlFor="totalAmount" className="block text-[13px] font-medium text-brand-dim font-semibold">
                        إجمالي مصروفات المحفظة (ج.م)
                      </label>
                      <div className="relative">
                        <input
                          id="totalAmount"
                          type="text"
                          readOnly
                          disabled={isPending}
                          value={totalCash !== "" ? totalAmount.toFixed(2) : "0.00"}
                          placeholder="0.00"
                          className="w-full bg-[#070814]/40 border border-brand-border/40 rounded-xl pl-4 pr-11 py-3.5 text-sm text-white/60 focus:outline-none transition-all duration-300 text-left dir-ltr font-inter select-none cursor-not-allowed"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-accent pointer-events-none">
                          <ClipboardList size={16} />
                        </span>
                      </div>
                      <span className="text-[10px] text-brand-dim/60 block mt-1 select-none">
                        * يتم احتسابه تلقائياً: مجموع المصاريف والتحويلات للزملاء.
                      </span>
                    </div>

                    {/* 4. Total Cash after Expenses (توتال الكاش بعد خصم التحويلات والمصاريف الشخصية) */}
                    <div className="space-y-2">
                      <label htmlFor="cashAfterExpenses" className="block text-[13px] font-medium text-brand-dim font-cairo font-semibold">
                        توتال الكاش بعد خصم التحويلات والمصاريف الشخصية (ج.م)
                      </label>
                      <div className="relative">
                        <input
                          id="cashAfterExpenses"
                          type="text"
                          readOnly
                          disabled={isPending}
                          value={totalCash !== "" ? cashAfterExpenses.toFixed(2) : "0.00"}
                          placeholder="0.00"
                          className="w-full bg-[#070814]/40 border border-brand-border/40 rounded-xl pl-4 pr-11 py-3.5 text-sm text-white/60 focus:outline-none transition-all duration-300 text-left dir-ltr font-inter select-none cursor-not-allowed"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none">
                          <Coins size={16} />
                        </span>
                      </div>
                    </div>

                    {/* 5. Personal Expenses (المصاريف الشخصية (ج.م)) */}
                    <div className="space-y-2">
                      <label htmlFor="personalExpense" className="block text-[13px] font-medium text-brand-dim">
                        المصاريف الشخصية (ج.م)
                      </label>
                      <div className="relative">
                        <input
                          id="personalExpense"
                          type="number"
                          step="0.01"
                          min="0"
                          disabled={isPending}
                          value={personalExpense}
                          onChange={(e) => setPersonalExpense(e.target.value)}
                          placeholder="0.00"
                          className="w-full bg-[#070814]/80 border border-brand-border/80 rounded-xl pl-4 pr-11 py-3.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-glow transition-all duration-300 disabled:opacity-50 text-left dir-ltr font-inter"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none">
                          <DollarSign size={16} />
                        </span>
                      </div>
                    </div>

                    {/* 6. Marketing 1 (مصاريف ماركتنج 1 (ج.م)) */}
                    <div className="space-y-2">
                      <label htmlFor="marketing1" className="block text-[13px] font-medium text-brand-dim">
                        مصاريف ماركتنج 1 (ج.م)
                      </label>
                      <div className="relative">
                        <input
                          id="marketing1"
                          type="number"
                          step="0.01"
                          min="0"
                          disabled={isPending}
                          value={marketing1}
                          onChange={(e) => setMarketing1(e.target.value)}
                          placeholder="0.00"
                          className="w-full bg-[#070814]/80 border border-brand-border/80 rounded-xl pl-4 pr-11 py-3.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-glow transition-all duration-300 disabled:opacity-50 text-left dir-ltr font-inter"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none">
                          <Coins size={16} />
                        </span>
                      </div>
                    </div>

                    {/* 7. Marketing 2 (مصاريف ماركتنج 2 (ج.م)) */}
                    <div className="space-y-2">
                      <label htmlFor="marketing2" className="block text-[13px] font-medium text-brand-dim font-semibold text-brand-accent">
                        مصاريف ماركتنج 2 (ج.م) *(تلقائي)
                      </label>
                      <div className="relative">
                        <input
                          id="marketing2"
                          type="text"
                          readOnly
                          disabled={isPending}
                          value={totalCash !== "" ? calculatedMarketing2.toFixed(2) : "0.00"}
                          placeholder="0.00"
                          className="w-full bg-[#070814]/40 border border-brand-border/40 rounded-xl pl-4 pr-11 py-3.5 text-sm text-white/60 focus:outline-none transition-all duration-300 text-left dir-ltr font-inter select-none cursor-not-allowed"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none">
                          <Coins size={16} />
                        </span>
                      </div>
                      <span className="text-[10px] text-brand-dim/50 block mt-1 select-none">
                        * يتم احتسابه تلقائياً: (توتال الكاش) - (إجمالي المحافظ والكامبين) - (باقي المصاريف والتحويلات).
                      </span>
                    </div>

                    {/* 8. Marketing 3 (مصاريف ماركتنج 3 (ج.م)) */}
                    <div className="space-y-2">
                      <label htmlFor="marketing3" className="block text-[13px] font-medium text-brand-dim">
                        مصاريف ماركتنج 3 (ج.م)
                      </label>
                      <div className="relative">
                        <input
                          id="marketing3"
                          type="number"
                          step="0.01"
                          min="0"
                          disabled={isPending}
                          value={marketing3}
                          onChange={(e) => setMarketing3(e.target.value)}
                          placeholder="0.00"
                          className="w-full bg-[#070814]/80 border border-brand-border/80 rounded-xl pl-4 pr-11 py-3.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-glow transition-all duration-300 disabled:opacity-50 text-left dir-ltr font-inter"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none">
                          <Coins size={16} />
                        </span>
                      </div>
                    </div>

                  </div>



              {/* Dynamic Custody Transfers Section */}
              <div className="border-t border-brand-border/20 pt-6 mt-8 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Coins size={16} className="text-brand-accent" />
                    <span>تحويلات العهدة للزملاء</span>
                  </h3>
                  <button
                    type="button"
                    onClick={addTransferRow}
                    disabled={isPending}
                    className="flex items-center gap-1.5 px-4.5 py-2 bg-brand-accent/15 border border-brand-accent/20 text-brand-accent hover:bg-brand-accent/25 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    <Plus size={14} />
                    <span>إضافة تحويل لزميل</span>
                  </button>
                </div>

                {transfers.length > 0 ? (
                  <div className="space-y-3.5">
                    {transfers.map((field, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 bg-[#070814]/30 border border-brand-border/40 p-3 rounded-2xl animate-slide-down flex-wrap sm:flex-nowrap"
                      >
                        {/* Colleague Select Dropdown */}
                        <div className="flex-1 min-w-[200px] space-y-1">
                          <div className="relative">
                            <select
                              required
                              disabled={isPending}
                              value={field.toAgentId}
                              onChange={(e) => updateTransferRow(idx, "toAgentId", e.target.value)}
                              className="w-full bg-[#070814] border border-brand-border rounded-xl px-4 py-3.5 text-xs text-white focus:outline-none focus:border-brand-accent transition-all cursor-pointer appearance-none pr-10"
                            >
                              <option value="">اختر الموظف...</option>
                              {colleagues.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.full_name} ({c.role === "senioragent" ? "Senior Agent" : "موظف"})
                                </option>
                              ))}
                            </select>
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none">
                              <User size={14} />
                            </span>
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none">
                              <ChevronDown size={14} />
                            </span>
                          </div>
                        </div>

                        {/* Amount Input */}
                        <div className="w-full sm:w-44 space-y-1">
                          <div className="relative">
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              required
                              disabled={isPending}
                              placeholder="مبلغ التحويل"
                              value={field.amount}
                              onChange={(e) => updateTransferRow(idx, "amount", e.target.value)}
                              className="w-full bg-[#070814] border border-brand-border rounded-xl pl-4 pr-9 py-3.5 text-xs text-white focus:outline-none focus:border-brand-accent transition-all text-left dir-ltr font-inter"
                            />
                            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none font-bold text-xs select-none">
                              $
                            </span>
                          </div>
                        </div>

                        {/* Delete Row Button */}
                        <button
                          type="button"
                          onClick={() => removeTransferRow(idx)}
                          disabled={isPending}
                          className="w-10 h-10 flex items-center justify-center bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/25 hover:text-white rounded-xl transition-all cursor-pointer active:scale-95 disabled:opacity-50 shrink-0"
                          title="حذف البند"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* Closing password confirmation section */}
              <div className="border-t border-brand-border/20 pt-6 mt-8 space-y-4">
                <label htmlFor="closingPassword" className="block text-[13px] font-medium text-brand-dim">
                  تأكيد بكلمة المرور لإغلاق اليوم وإخلاء المسؤولية
                </label>
                <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
                  {/* Password Field */}
                  <div className="flex-1 relative">
                    <input
                      id="closingPassword"
                      type={showClosingPassword ? "text" : "password"}
                      required
                      disabled={isPending}
                      value={closingPassword}
                      onChange={(e) => setClosingPassword(e.target.value)}
                      placeholder="أدخل كلمة مرور حسابك الشخصي"
                      autoComplete="new-password"
                      className="w-full bg-[#070814]/80 border border-brand-border/80 rounded-xl pl-11 pr-11 py-3.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-glow transition-all duration-300 disabled:opacity-50 text-right font-cairo"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none">
                      <Lock size={16} />
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowClosingPassword(!showClosingPassword)}
                      disabled={isPending}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors cursor-pointer focus:outline-none p-1 rounded"
                    >
                      {showClosingPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  {/* Submit Closing Button */}
                  <button
                    type="submit"
                    disabled={isPending}
                    className="md:w-60 flex items-center justify-center gap-2 px-5 py-3.5 bg-brand-accent hover:bg-[#7c4df2] disabled:bg-brand-accent/50 text-white font-bold rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:shadow-[0_0_25px_rgba(139,92,246,0.45)] active:scale-[0.98] disabled:scale-100 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isPending ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        <span>جاري إغلاق اليوم...</span>
                      </>
                    ) : (
                      <>
                        <Send size={16} className="rotate-180" />
                        <span>إغلاق اليوم المالي</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>

        {/* Left Side: Active Wallets Card (Span 1) */}
        <div className="lg:col-span-1">
          <div className="backdrop-blur-xl bg-brand-card/95 border border-brand-border/55 p-6 md:p-8 rounded-[24px] shadow-2xl relative min-h-[500px] flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="border-b border-brand-border/25 pb-4 mb-5 text-right">
                <h2 className="text-base md:text-lg font-extrabold text-white flex items-center justify-start gap-2">
                  <span className="text-brand-accent">3.</span> محافظ الكاش النشطة
                </h2>
                <p className="text-[10px] text-brand-dim/60 leading-relaxed mt-2 font-cairo">
                  أرصدة محافظك المسجلة في النظام. أدخل الرصيد الفعلي المتوفر في كل محفظة اليوم لإتمام عملية الإغلاق المالي.
                </p>
              </div>

              {/* Scrollable Wallets List */}
              {initialWallets.length > 0 ? (
                <div className="space-y-3.5 max-h-[360px] overflow-y-auto pr-1.5 custom-scrollbar">
                  {initialWallets.map((wallet) => (
                    <div
                      key={wallet.id}
                      className="px-4.5 py-2.5 rounded-xl bg-[#090b16]/90 border border-brand-border/30 hover:border-brand-accent/25 transition-all flex items-center justify-between gap-3 text-right"
                    >
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(wallet.phone_number);
                            showToast("تم نسخ رقم المحفظة إلى الحافظة بنجاح.", "success");
                          }}
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
                          disabled={isPending}
                          value={walletsBalances[wallet.id] ?? ""}
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

              {/* Campaign Input Field */}
              <div className="mt-4 pt-4 border-t border-brand-border/20 text-right animate-fade-in">
                <div className="px-4.5 py-3 rounded-xl bg-brand-accent/5 border border-brand-accent/40 hover:border-brand-accent/60 transition-all flex items-center justify-between gap-3 shadow-[0_0_12px_rgba(139,92,246,0.1)]">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-brand-accent/15 border border-brand-accent/20 flex items-center justify-center text-brand-accent">
                      <Megaphone size={14} className="animate-pulse" />
                    </span>
                    <span className="text-sm font-extrabold text-white font-cairo">
                      كامبين
                    </span>
                  </div>
                  <div className="relative w-28 text-left">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      disabled={isPending}
                      value={campaignBalance}
                      onChange={(e) => setCampaignBalance(e.target.value)}
                      dir="ltr"
                      className="w-full h-9 px-2 bg-[#030408]/90 border border-brand-accent/30 rounded-lg text-xs text-white placeholder-brand-dim/20 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent/35 text-center font-inter dir-ltr font-bold"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-bold text-brand-accent pointer-events-none">ج.م</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Total Cash in Wallets Display */}
            <div className="border-t border-brand-border/25 pt-4 mt-6">
              <div className="bg-[#0b0e1a]/60 border border-brand-border/30 rounded-2xl p-4 space-y-3.5 text-right">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-brand-dim/80 font-cairo">إجمالي كاش المحافظ:</span>
                  <span className="text-sm font-extrabold font-inter text-emerald-400">
                    {walletsTotalCash.toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م
                  </span>
                </div>
                <div className="border-t border-brand-border/10 my-0.5"></div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-brand-dim/60 font-cairo">إجمالي كاش المحافظ بدون الكامبين:</span>
                  <span className="text-xs font-bold font-inter text-white/80">
                    {walletsTotalCashWithoutCampaign.toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )}

      {activeTab === "edit-expenses" && (
        <div className="max-w-4xl mx-auto">
          {/* Edit Request Card Container */}
          <div className="backdrop-blur-xl bg-brand-card/95 border border-brand-border/55 p-6 md:p-8 rounded-[24px] shadow-2xl relative">
            <div className="space-y-1.5 mb-8 text-center md:text-right">
              <h2 className="text-xl font-bold text-white flex items-center justify-center md:justify-start gap-2">
                <span>طلب تعديل المصاريف والتحويلات اليومية</span>
              </h2>
              <p className="text-xs md:text-sm text-brand-dim leading-relaxed">
                اختر التاريخ المسجل مسبقاً لعرض التقرير الحالي وطلب إجراء التعديلات عليه. سيتم إرسال طلبك للإدارة ولن يتم التحديث المباشر للمصاريف إلا بعد المراجعة والموافقة.
              </p>
            </div>

            {/* Date Search Input */}
            <div className="max-w-md mx-auto md:mx-0 space-y-2 mb-8">
              <label htmlFor="editSearchDate" className="block text-sm font-bold text-white/90">
                تاريخ التقرير المطلوب تعديله
              </label>
              <div className="relative">
                <input
                  id="editSearchDate"
                  type="date"
                  required
                  disabled={isPending || isFetchingReport}
                  min={tenDaysAgoStr}
                  max={todayStr}
                  value={editSearchDate}
                  onChange={(e) => handleEditDateChange(e.target.value)}
                  onClick={(e) => e.currentTarget.showPicker()}
                  className="w-full bg-[#070814]/80 border border-brand-border/80 rounded-xl pl-4 pr-11 py-3 text-sm text-white focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-glow transition-all duration-300 disabled:opacity-50 text-left dir-ltr font-inter cursor-pointer"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none">
                  {isFetchingReport ? (
                    <Loader2 size={16} className="animate-spin text-brand-accent" />
                  ) : (
                    <Calendar size={16} />
                  )}
                </span>
              </div>
            </div>

            {/* Loading/Fetch State */}
            {isFetchingReport && (
              <div className="py-12 flex flex-col items-center justify-center space-y-4">
                <Loader2 size={36} className="animate-spin text-brand-accent" />
                <p className="text-sm text-brand-dim">جاري البحث وتحميل بيانات التقرير...</p>
              </div>
            )}

            {/* Form Display */}
            {!isFetchingReport && originalReport ? (
              <form onSubmit={handleEditRequestSubmit} className="space-y-6 animate-scale-in" autoComplete="off">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  
                  {/* 1. Read-Only Original Date (تاريخ التقرير) */}
                  <div className="space-y-2">
                    <label className="block text-[13px] font-medium text-brand-dim opacity-70">
                      تاريخ التقرير
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        readOnly
                        value={originalReport.expenseDate}
                        className="w-full bg-[#070814]/40 border border-brand-border/50 rounded-xl pl-4 pr-11 py-3.5 text-sm text-white/60 font-inter dir-ltr text-left select-none outline-none cursor-not-allowed"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none">
                        <Calendar size={16} />
                      </span>
                    </div>
                  </div>

                  {/* 2. New Total Amount (إجمالي المصروفات والتحويلات الجديدة (التوتال)) */}
                  <div className="space-y-2">
                    <label htmlFor="editTotalAmount" className="block text-[13px] font-medium text-brand-dim">
                      إجمالي المصروفات والتحويلات الجديدة (التوتال)
                    </label>
                    <div className="relative">
                      <input
                        id="editTotalAmount"
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        disabled={isPending}
                        value={editTotalAmount}
                        onChange={(e) => setEditTotalAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-[#070814]/80 border border-brand-border/80 rounded-xl pl-4 pr-11 py-3.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-glow transition-all duration-300 disabled:opacity-50 text-left dir-ltr font-inter"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-accent pointer-events-none">
                        <ClipboardList size={16} />
                      </span>
                    </div>
                    <span className="text-[10px] text-brand-dim/60 block mt-1">
                      * أدخل مجموع المصاريف والتحويلات المقترحة يدوياً للمطابقة.
                    </span>
                  </div>

                  {/* 3. New Personal Expenses (المصاريف الشخصية الجديدة (ج.م)) */}
                  <div className="space-y-2">
                    <label htmlFor="editPersonalExpense" className="block text-[13px] font-medium text-brand-dim">
                      المصاريف الشخصية الجديدة (ج.م)
                    </label>
                    <div className="relative">
                      <input
                        id="editPersonalExpense"
                        type="number"
                        step="0.01"
                        min="0"
                        disabled={isPending}
                        value={editPersonalExpense}
                        onChange={(e) => setEditPersonalExpense(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-[#070814]/80 border border-brand-border/80 rounded-xl pl-4 pr-11 py-3.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-glow transition-all duration-300 disabled:opacity-50 text-left dir-ltr font-inter"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none">
                        <DollarSign size={16} />
                      </span>
                    </div>
                  </div>

                  {/* 4. New Marketing 1 (مصاريف ماركتنج 1 الجديدة (ج.م)) */}
                  <div className="space-y-2">
                    <label htmlFor="editMarketing1" className="block text-[13px] font-medium text-brand-dim">
                      مصاريف ماركتنج 1 الجديدة (ج.م)
                    </label>
                    <div className="relative">
                      <input
                        id="editMarketing1"
                        type="number"
                        step="0.01"
                        min="0"
                        disabled={isPending}
                        value={editMarketing1}
                        onChange={(e) => setEditMarketing1(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-[#070814]/80 border border-brand-border/80 rounded-xl pl-4 pr-11 py-3.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-glow transition-all duration-300 disabled:opacity-50 text-left dir-ltr font-inter"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none">
                        <Coins size={16} />
                      </span>
                    </div>
                  </div>

                  {/* 5. New Marketing 2 (مصاريف ماركتنج 2 الجديدة (ج.م)) */}
                  <div className="space-y-2">
                    <label htmlFor="editMarketing2" className="block text-[13px] font-medium text-brand-dim">
                      مصاريف ماركتنج 2 الجديدة (ج.م)
                    </label>
                    <div className="relative">
                      <input
                        id="editMarketing2"
                        type="number"
                        step="0.01"
                        min="0"
                        disabled={isPending}
                        value={editMarketing2}
                        onChange={(e) => setEditMarketing2(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-[#070814]/80 border border-brand-border/80 rounded-xl pl-4 pr-11 py-3.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-glow transition-all duration-300 disabled:opacity-50 text-left dir-ltr font-inter"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none">
                        <Coins size={16} />
                      </span>
                    </div>
                  </div>

                  {/* 6. New Marketing 3 (مصاريف ماركتنج 3 الجديدة (ج.م)) */}
                  <div className="space-y-2">
                    <label htmlFor="editMarketing3" className="block text-[13px] font-medium text-brand-dim">
                      مصاريف ماركتنج 3 الجديدة (ج.م)
                    </label>
                    <div className="relative">
                      <input
                        id="editMarketing3"
                        type="number"
                        step="0.01"
                        min="0"
                        disabled={isPending}
                        value={editMarketing3}
                        onChange={(e) => setEditMarketing3(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-[#070814]/80 border border-brand-border/80 rounded-xl pl-4 pr-11 py-3.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-glow transition-all duration-300 disabled:opacity-50 text-left dir-ltr font-inter"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none">
                        <Coins size={16} />
                      </span>
                    </div>
                  </div>

                </div>

                {/* Math Warning Banner */}
                {showEditMathWarning && (
                  <div className="bg-amber-500/10 border border-amber-500/25 text-amber-400 p-4 rounded-xl text-xs font-semibold flex items-center gap-3 animate-slide-in select-none">
                    <AlertTriangle size={16} className="shrink-0" />
                    <span>
                      تنبيه المجموع غير متطابق: إجمالي المصروفات المقترح هو ({editEnteredTotal.toFixed(2)} ج.م)، بينما مجموع البنود والتحويلات المقترح الفعلي هو ({editCalculatedSum.toFixed(2)} ج.م).
                    </span>
                  </div>
                )}
                {showEditMathSuccess && (
                  <div className="bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 p-4 rounded-xl text-xs font-semibold flex items-center gap-3 animate-slide-in select-none">
                    <CheckCircle2 size={16} className="shrink-0" />
                    <span>الأرقام المقترحة متطابقة بشكل صحيح (المجموع: {editCalculatedSum.toFixed(2)} ج.م).</span>
                  </div>
                )}

                {/* Dynamic Custody Transfers Section */}
                <div className="border-t border-brand-border/20 pt-6 mt-8 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Coins size={16} className="text-brand-accent" />
                      <span>تحويلات العهدة المقترحة الجديدة</span>
                    </h3>
                    <button
                      type="button"
                      onClick={addEditTransferRow}
                      disabled={isPending}
                      className="flex items-center gap-1.5 px-4.5 py-2 bg-brand-accent/15 border border-brand-accent/20 text-brand-accent hover:bg-brand-accent/25 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      <Plus size={14} />
                      <span>إضافة تحويل لزميل</span>
                    </button>
                  </div>

                  {editTransfers.length > 0 ? (
                    <div className="space-y-3.5">
                      {editTransfers.map((field, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 bg-[#070814]/30 border border-brand-border/40 p-3 rounded-2xl animate-slide-down flex-wrap sm:flex-nowrap"
                        >
                          {/* Colleague Selection */}
                          <div className="flex-1 min-w-[200px] space-y-1">
                            <div className="relative">
                              <select
                                required
                                disabled={isPending}
                                value={field.toAgentId}
                                onChange={(e) => updateEditTransferRow(idx, "toAgentId", e.target.value)}
                                className="w-full bg-[#070814] border border-brand-border rounded-xl px-4 py-3.5 text-xs text-white focus:outline-none focus:border-brand-accent transition-all cursor-pointer appearance-none pr-10"
                              >
                                <option value="">اختر الموظف...</option>
                                {colleagues.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.full_name} ({c.role === "senioragent" ? "Senior Agent" : "موظف"})
                                  </option>
                                ))}
                              </select>
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none">
                                <User size={14} />
                              </span>
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none">
                                <ChevronDown size={14} />
                              </span>
                            </div>
                          </div>

                          {/* Transfer Amount */}
                          <div className="w-full sm:w-44 space-y-1">
                            <div className="relative">
                              <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                required
                                disabled={isPending}
                                placeholder="مبلغ التحويل"
                                value={field.amount}
                                onChange={(e) => updateEditTransferRow(idx, "amount", e.target.value)}
                                className="w-full bg-[#070814] border border-brand-border rounded-xl pl-4 pr-9 py-3.5 text-xs text-white focus:outline-none focus:border-brand-accent transition-all text-left dir-ltr font-inter"
                              />
                              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none font-bold text-xs select-none">
                                $
                              </span>
                            </div>
                          </div>

                          {/* Delete Row */}
                          <button
                            type="button"
                            onClick={() => removeEditTransferRow(idx)}
                            disabled={isPending}
                            className="w-10 h-10 flex items-center justify-center bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/25 hover:text-white rounded-xl transition-all cursor-pointer active:scale-95 disabled:opacity-50 shrink-0"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                {/* Submit button */}
                <div className="border-t border-brand-border/20 pt-6 mt-8">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-brand-accent hover:bg-brand-accent/95 disabled:bg-brand-accent/50 text-white font-bold rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:shadow-[0_0_25px_rgba(139,92,246,0.45)] active:scale-[0.98] disabled:scale-100 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isPending ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        <span>جاري تقديم الطلب...</span>
                      </>
                    ) : (
                      <>
                        <Send size={16} className="rotate-180" />
                        <span>تقديم طلب التعديل للإدارة</span>
                      </>
                    )}
                  </button>
                </div>

              </form>
            ) : (
              /* Empty state placeholder when no date is selected or fetching failed */
              !isFetchingReport && (
                <div className="border border-dashed border-brand-border/40 rounded-[24px] bg-brand-card/20 py-20 text-center select-none animate-fade-in mt-6">
                  <div className="flex flex-col items-center justify-center space-y-5 max-w-sm mx-auto">
                    <div className="w-14 h-14 rounded-2xl bg-white/[0.01] border border-brand-border/30 text-brand-dim/40 flex items-center justify-center shadow-inner">
                      <Calendar size={28} />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-base font-bold text-white">يرجى اختيار تاريخ للبدء</h4>
                      <p className="text-xs text-brand-dim/70 leading-relaxed">
                        يرجى تحديد تاريخ اليوم المالي المطلوب طلب تعديله لعرض تقريره الأصلي وإضافة التعديلات المقترحة (متاح حتى آخر 10 أيام مضت).
                      </p>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
