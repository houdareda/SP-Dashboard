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
  Smartphone,
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
  marketingSystems?: { id: string; name: string; order_index: number }[];
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
  marketingSystems = [],
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

  // Multi-wallet fund request states
  const [isMultiWallet, setIsMultiWallet] = useState(false);
  const [multiWalletRows, setMultiWalletRows] = useState<Array<{ walletId: string; amount: string }>>([{ walletId: "", amount: "" }]);

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

    if (!requestDate) {
      showToast("يرجى تحديد تاريخ الطلب.", "error");
      return;
    }
    if (requestDate !== todayStr && requestDate !== yesterdayStr) {
      showToast("يُسمح فقط باختيار تاريخ اليوم أو الأمس.", "error");
      return;
    }
    if (!password || password.trim() === "") {
      showToast("يرجى إدخال كلمة المرور للتأكيد.", "error");
      return;
    }

    const payload: any = {
      requestDate,
    };

    if (isMultiWallet) {
      if (!multiWalletRows || multiWalletRows.length === 0) {
        showToast("يرجى تحديد محفظة واحدة على الأقل.", "error");
        return;
      }

      const seenWallets = new Set<string>();
      const multiWalletData: any[] = [];
      let totalAmount = 0;

      for (let i = 0; i < multiWalletRows.length; i++) {
        const row = multiWalletRows[i];
        if (!row.walletId) {
          showToast(`يرجى تحديد المحفظة في السطر رقم ${i + 1}.`, "error");
          return;
        }
        if (seenWallets.has(row.walletId)) {
          const dupWallet = initialWallets.find((w) => w.id === row.walletId);
          showToast(`لقد قمت بتكرار المحفظة (${dupWallet?.phone_number || row.walletId}) في الطلب.`, "error");
          return;
        }
        seenWallets.add(row.walletId);

        const amountVal = parseFloat(row.amount);
        if (isNaN(amountVal) || amountVal <= 0) {
          showToast(`يرجى إدخال مبلغ صحيح أكبر من الصفر في السطر رقم ${i + 1}.`, "error");
          return;
        }

        const w = initialWallets.find((wallet) => wallet.id === row.walletId);
        if (w && amountVal > w.remainingLimit) {
          showToast(
            `عفواً، لا يمكنك طلب هذا المبلغ للمحفظة ${w.phone_number}. الحد الأقصى المتبقي لها هو ${w.remainingLimit.toLocaleString("en-US")}`,
            "error"
          );
          return;
        }

        totalAmount += amountVal;
        multiWalletData.push({
          walletId: row.walletId,
          phoneNumber: w?.phone_number || "",
          esimNumber: w?.esim_number || "",
          amount: amountVal,
        });
      }

      payload.walletId = multiWalletData[0].walletId;
      payload.amountRequested = totalAmount;
      payload.isMultiWallet = true;
      payload.multiWalletData = multiWalletData;
    } else {
      if (!selectedWallet) {
        showToast("يرجى اختيار المحفظة المستهدفة.", "error");
        return;
      }
      const amountVal = parseFloat(amount);
      if (isNaN(amountVal) || amountVal <= 0) {
        showToast("يرجى إدخال مبلغ صحيح أكبر من الصفر.", "error");
        return;
      }
      if (selectedWallet && amountVal > selectedWallet.remainingLimit) {
        showToast(
          `عفواً، لا يمكنك طلب هذا المبلغ. الحد الأقصى المتبقي لهذه المحفظة هو ${selectedWallet.remainingLimit.toLocaleString("en-US")}`,
          "error"
        );
        return;
      }

      payload.walletId = selectedWallet.id;
      payload.amountRequested = amountVal;
      payload.isMultiWallet = false;
    }

    startTransition(async () => {
      const res = await submitFundRequest(payload, password);

      if (res.success) {
        showToast("تم إرسال طلب شحن الرصيد بنجاح وهو قيد الانتظار حالياً.", "success");
        setAmount("");
        setPassword("");
        setSelectedWallet(null);
        setIsMultiWallet(false);
        setMultiWalletRows([{ walletId: "", amount: "" }]);
        router.refresh();
      } else {
        showToast(res.error || "فشل إرسال طلب الشحن.", "error");
      }
    });
  };

  // ----------------------------------------------------
  // TAB 2: DAILY EXPENSES & TRANSFERS STATES & LOGIC
  // ----------------------------------------------------
  // ----------------------------------------------------
  // TAB 2: DAILY EXPENSES & TRANSFERS STATES & LOGIC
  // ----------------------------------------------------
  const [expenseDate, setExpenseDate] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [marketingExpenses, setMarketingExpenses] = useState<Record<string, string>>({});
  const [personalExpense, setPersonalExpense] = useState("");
  const [transfers, setTransfers] = useState<TransferField[]>([]);
  const [closingPassword, setClosingPassword] = useState("");
  const [showClosingPassword, setShowClosingPassword] = useState(false);

  const [totalCash, setTotalCash] = useState("");

  useEffect(() => {
    if (currentCustody !== undefined) {
      setTotalCash(String(currentCustody));
    }
  }, [currentCustody]);

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

    if (!closingPassword || closingPassword.trim() === "") {
      showToast("يرجى إدخال كلمة المرور لتأكيد إغلاق اليوم المالي.", "error");
      return;
    }

    const totalMarketing = Object.values(marketingExpenses).reduce(
      (sum, val) => sum + (parseFloat(val) || 0),
      0
    );
    const pers = parseFloat(personalExpense) || 0;
    const totAmt = parseFloat(totalAmount) || 0;
    const transSum = transfers.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

    const expectedSum = pers + totalMarketing + transSum;

    if (Math.abs(totAmt - expectedSum) > 0.01) {
      showToast(
        `عفواً، إجمالي مصروفات المحفظة المدخل (${totAmt.toLocaleString("en-US")}) لا يساوي مجموع البنود والتحويلات (${expectedSum.toLocaleString("en-US")}). يرجى مراجعة وتصحيح المبالغ.`,
        "error"
      );
      return;
    }

    const formattedTransfers = transfers
      .filter((t) => t.toAgentId && t.amount)
      .map((t) => ({
        toAgentId: t.toAgentId,
        amount: parseFloat(t.amount) || 0,
      }));

    const formattedMarketing: Record<string, number> = {};
    marketingSystems.forEach((sys) => {
      formattedMarketing[sys.id] = parseFloat(marketingExpenses[sys.id] || "0") || 0;
    });

    startTransition(async () => {
      const res = await submitDailyExpenses(
        {
          expenseDate,
          totalAmount: totAmt,
          marketingExpenses: formattedMarketing,
          personalExpense: pers,
          transfers: formattedTransfers,
          totalCash: parseFloat(totalCash) || 0,
          cashAfterExpenses: 0,
          walletsBalances: [],
        },
        closingPassword
      );

      if (res.success) {
        showToast("تم إغلاق اليوم المالي بنجاح وحفظ كافة المصروفات والتحويلات.", "success");
        setTotalAmount("");
        setMarketingExpenses({});
        setPersonalExpense("");
        setTransfers([]);
        setClosingPassword("");

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
    marketingExpenses?: Record<string, number>;
    marketing1?: number;
    marketing2?: number;
    marketing3?: number;
    personalExpense: number;
    expenseDate: string;
    totalCash?: number;
    cashAfterExpenses?: number;
    walletsBalances?: any[];
  } | null>(null);

  // Edit fields states
  const [editTotalCash, setEditTotalCash] = useState("");
  const [editTotalAmount, setEditTotalAmount] = useState("");
  const [editMarketingExpenses, setEditMarketingExpenses] = useState<Record<string, string>>({});
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
        setEditTotalCash(String(res.report.totalCash || ""));
        setEditTotalAmount(String(res.report.totalAmount || ""));
        setEditPersonalExpense(String(res.report.personalExpense || ""));

        const mExp = (res.report as any).marketingExpenses || {};
        const initialEditM: Record<string, string> = {};
        marketingSystems.forEach((sys) => {
          const val = mExp[sys.id] ?? (res.report as any)[`marketing_${sys.order_index}`] ?? (res.report as any)[`marketing${sys.order_index}`];
          initialEditM[sys.id] = val !== undefined && val !== null ? String(val) : "";
        });
        setEditMarketingExpenses(initialEditM);

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

  const handleEditRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!originalReport) return;

    const totalEditMarketing = Object.values(editMarketingExpenses).reduce(
      (sum, val) => sum + (parseFloat(val) || 0),
      0
    );
    const editPersonalExpenseVal = parseFloat(editPersonalExpense) || 0;
    const editTotalCashVal = parseFloat(editTotalCash) || 0;
    const editTotalAmountVal = parseFloat(editTotalAmount) || 0;
    const editTransfersSum = editTransfers.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

    const expectedEditSum = editPersonalExpenseVal + totalEditMarketing + editTransfersSum;

    if (Math.abs(editTotalAmountVal - expectedEditSum) > 0.01) {
      showToast(
        `عفواً، إجمالي مصروفات المحفظة المقترح المدخل (${editTotalAmountVal.toLocaleString("en-US")}) لا يساوي مجموع البنود والتحويلات (${expectedEditSum.toLocaleString("en-US")}). يرجى مراجعة وتصحيح المبالغ.`,
        "error"
      );
      return;
    }

    const formattedTransfers = editTransfers
      .filter((t) => t.toAgentId && t.amount)
      .map((t) => ({
        to_agent_id: t.toAgentId,
        amount: parseFloat(t.amount) || 0,
      }));

    const numEditMarketing: Record<string, number> = {};
    marketingSystems.forEach((sys) => {
      numEditMarketing[sys.id] = parseFloat(editMarketingExpenses[sys.id] || "0") || 0;
    });

    startTransition(async () => {
      const res = await submitEditExpenseRequest(
        originalReport.id,
        {
          totalAmount: editTotalAmountVal,
          marketingExpenses: numEditMarketing,
          personalExpense: editPersonalExpenseVal,
          transfers: formattedTransfers,
          totalCash: editTotalCashVal,
          cashAfterExpenses: 0,
          walletsBalances: [],
        },
        "" // No password confirm needed
      );

      if (res.success) {
        showToast("تم إرسال طلب التعديل بنجاح إلى الإدارة وهو قيد المراجعة حالياً.", "success");
        // Reset tab
        setOriginalReport(null);
        setEditSearchDate("");
        setEditMarketingExpenses({});
        router.refresh();
      } else {
        showToast(res.error || "فشل إرسال طلب التعديل.", "error");
      }
    });
  };

  return (
    <div className="space-y-8 font-cairo select-none relative text-right operations-container" dir="rtl">
      <style dangerouslySetInnerHTML={{__html: `
        /* Enlarge input and select text for higher visibility and clarity */
        .operations-container input, 
        .operations-container select {
          font-size: 16px !important;
          font-weight: 700 !important;
          color: #ffffff !important;
        }
        /* Make inputs background slightly darker and borders clearer */
        .operations-container input:not([readonly]):not([disabled]), 
        .operations-container select:not([readonly]):not([disabled]) {
          background-color: #05060f !important;
          border-color: rgba(139, 92, 246, 0.4) !important;
        }
        /* Highlight focus state */
        .operations-container input:focus, 
        .operations-container select:focus {
          border-color: #8b5cf6 !important;
          box-shadow: 0 0 10px rgba(139, 92, 246, 0.2) !important;
        }
        /* Specific styling for placeholder text to make it clear but distinct */
        .operations-container input::placeholder {
          color: rgba(255, 255, 255, 0.35) !important;
        }
        /* Labels to be slightly larger, bold, and brighter */
        .operations-container label {
          font-size: 13.5px !important;
          font-weight: 700 !important;
          color: rgba(255, 255, 255, 0.95) !important;
        }
        /* Read-only or disabled inputs styling */
        .operations-container input[readonly],
        .operations-container input[disabled],
        .operations-container select[disabled] {
          color: rgba(255, 255, 255, 0.65) !important;
          font-weight: 600 !important;
          background-color: rgba(7, 8, 20, 0.4) !important;
          border-color: rgba(255, 255, 255, 0.1) !important;
        }
      `}} />

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
                
                {/* 0. Toggle Multi-Wallet Mode Option */}
                <div className="md:col-span-2 flex items-center justify-between p-4.5 bg-[#090b16]/60 border border-brand-border/30 rounded-2xl select-none">
                  <div className="space-y-0.5 text-right font-cairo">
                    <span className="text-sm font-bold text-white block">طلب شحن رصيد لعدة محافظ معاً</span>
                    <span className="text-xs text-brand-dim/80 block">تفعيل هذا الخيار للطلب على أكثر من رقم في نفس الوقت (للضرورة القصوى)</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={isPending}
                      checked={isMultiWallet}
                      onChange={(e) => {
                        setIsMultiWallet(e.target.checked);
                        if (e.target.checked && multiWalletRows.length === 1 && multiWalletRows[0].walletId === "") {
                          setMultiWalletRows([{ walletId: "", amount: "" }]);
                        }
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-brand-border/50 rounded-full peer peer-focus:ring-0 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-accent transition-colors duration-300"></div>
                  </label>
                </div>

                {isMultiWallet ? (
                  <>
                    {/* Warning Alert */}
                    <div className="md:col-span-2 p-4 bg-amber-500/10 border border-amber-500/25 rounded-2xl flex items-start gap-3 animate-fade-in text-right font-cairo">
                      <AlertTriangle className="text-amber-400 mt-0.5 shrink-0" size={16} />
                      <div>
                        <h4 className="text-sm font-bold text-amber-400">تنبيه هام!</h4>
                        <p className="text-xs text-brand-dim mt-1 leading-relaxed">
                          انتبه: هذا الخيار مخصص للاستخدام في <strong>الضرورة القصوى فقط</strong> لشحن أرقام متعددة دفعة واحدة. يُرجى مراجعة أرصدة وحدود المحافظ بدقة قبل التأكيد.
                        </p>
                      </div>
                    </div>

                    {/* Multi-Wallet Rows Selection */}
                    <div className="md:col-span-2 space-y-4">
                      <div className="flex items-center justify-between border-b border-brand-border/10 pb-2 mb-2">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2 font-cairo">
                          <Smartphone size={16} className="text-brand-accent" />
                          <span>المحافظ المطلوب شحنها (حد أقصى 3 محافظ)</span>
                        </h3>
                        {multiWalletRows.length < 3 && (
                          <button
                            type="button"
                            onClick={() => setMultiWalletRows([...multiWalletRows, { walletId: "", amount: "" }])}
                            className="px-3.5 py-1.5 bg-brand-accent/15 border border-brand-accent/20 text-brand-accent hover:bg-brand-accent/25 hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer font-cairo"
                          >
                            + إضافة محفظة
                          </button>
                        )}
                      </div>

                      <div className="space-y-4">
                        {multiWalletRows.map((row, index) => {
                          const rowWallet = initialWallets.find((w) => w.id === row.walletId);
                          return (
                            <div key={index} className="flex gap-4 items-end bg-[#070814]/40 border border-brand-border/30 p-4 rounded-2xl flex-wrap md:flex-nowrap relative animate-fade-in">
                              {/* Wallet Select */}
                              <div className="flex-1 min-w-[200px] space-y-2 text-right">
                                <label className="block text-xs font-semibold text-brand-dim font-cairo">
                                  المحفظة {index + 1}
                                </label>
                                <select
                                  value={row.walletId}
                                  required
                                  onChange={(e) => {
                                    const newRows = [...multiWalletRows];
                                    newRows[index].walletId = e.target.value;
                                    setMultiWalletRows(newRows);
                                  }}
                                  className="w-full bg-[#070814]/80 border border-brand-border/80 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-brand-accent transition-all cursor-pointer font-semibold"
                                >
                                  <option value="">اختر محفظة...</option>
                                  {initialWallets.map((w) => (
                                    <option key={w.id} value={w.id} disabled={multiWalletRows.some((r, i) => r.walletId === w.id && i !== index)}>
                                      {w.phone_number} {w.esim_number ? `(شريحة: ${w.esim_number})` : ""} - الرصيد: {w.calculatedBalance.toLocaleString()} (متبقي: {w.remainingLimit.toLocaleString()})
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* Amount input */}
                              <div className="w-full md:w-56 space-y-2 text-right">
                                <label className="block text-xs font-semibold text-brand-dim font-cairo">
                                  المبلغ المطلوب
                                </label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    required
                                    max={rowWallet ? rowWallet.remainingLimit : undefined}
                                    value={row.amount}
                                    onChange={(e) => {
                                      const newRows = [...multiWalletRows];
                                      newRows[index].amount = e.target.value;
                                      setMultiWalletRows(newRows);
                                    }}
                                    placeholder="0.00"
                                    className="w-full bg-[#070814]/80 border border-brand-border/80 rounded-xl pl-4 pr-11 py-3.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-accent transition-all text-left dir-ltr font-inter"
                                  />
                                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 font-bold text-sm pointer-events-none select-none">
                                    $
                                  </span>
                                </div>
                              </div>

                              {/* Delete button */}
                              {multiWalletRows.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newRows = multiWalletRows.filter((_, i) => i !== index);
                                    setMultiWalletRows(newRows);
                                  }}
                                  className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Request Date Field (تاريخ الطلب - Right) */}
                    <div className="space-y-2 text-right">
                      <label htmlFor="requestDate" className="block text-[13px] font-medium text-brand-dim font-cairo">
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

                    {/* Password Confirmation Field (تأكيد بكلمة المرور - Left) */}
                    <div className="space-y-2 text-right">
                      <label htmlFor="passwordConfirm" className="block text-[13px] font-medium text-brand-dim font-cairo">
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
                  </>
                ) : (
                  <>
                    {/* 1. Request Date Field (تاريخ الطلب - Right) */}
                    <div className="space-y-2 text-right">
                      <label htmlFor="requestDate" className="block text-[13px] font-medium text-brand-dim font-cairo">
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
                    <div className="space-y-2 text-right">
                      <label className="block text-[13px] font-medium text-brand-dim font-cairo">
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
                                  (الرصيد: {selectedWallet.calculatedBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })} • متبقي: {selectedWallet.remainingLimit.toLocaleString("en-US")})
                                </span>
                              </span>
                            ) : (
                              <span className="font-cairo">اختر محفظة...</span>
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
                                      <div className="flex flex-col items-start gap-0.5 text-right">
                                        <span className="font-extrabold text-sm tracking-wide">{wallet.phone_number}</span>
                                        {wallet.esim_number && (
                                          <span className="text-[10px] text-brand-accent font-semibold">الشريحة: {wallet.esim_number}</span>
                                        )}
                                      </div>
                                      <div className="text-right space-y-0.5">
                                        <div className="text-xs text-brand-dim/80 font-cairo">
                                          الرصيد: {wallet.calculatedBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                        </div>
                                        <div className={`text-[10px] font-bold font-cairo ${
                                          wallet.remainingLimit < 10000 ? "text-amber-400" : "text-emerald-400"
                                        }`}>
                                          متبقي: {wallet.remainingLimit.toLocaleString("en-US")} ...
                                        </div>
                                      </div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <div className="py-6 text-center text-xs text-brand-dim/50 font-cairo">
                                لا توجد محافظ نشطة متاحة حالياً. (قد تكون جميع المحافظ بلغت الحد الشهري)
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 3. Requested Amount Field (المبلغ المطلوب - Right) */}
                    <div className="space-y-2 text-right">
                      <label htmlFor="amount" className="block text-[13px] font-medium text-brand-dim font-cairo">
                        المبلغ المطلوب
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
                              target.setCustomValidity(`يجب أن يكون المبلغ أقل من أو يساوي ${selectedWallet.remainingLimit.toLocaleString("en-US")}`);
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
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 font-bold text-sm font-inter pointer-events-none select-none font-semibold">
                          $
                        </span>
                      </div>
                      {selectedWallet && (
                        <p className="text-[10px] text-brand-dim/60 select-none">
                          * الحد الأقصى المتبقي: <span className="font-inter font-bold text-emerald-400">{selectedWallet.remainingLimit.toLocaleString("en-US")}</span>
                        </p>
                      )}
                    </div>

                    {/* 4. Password Confirmation Field (تأكيد بكلمة المرور - Left) */}
                    <div className="space-y-2 text-right">
                      <label htmlFor="passwordConfirm" className="block text-[13px] font-medium text-brand-dim font-cairo">
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
                  </>
                )}

              </div>

              {/* Submit Button */}
              <div className="pt-4 border-t border-brand-border/20">
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-brand-accent hover:bg-brand-accent/90 text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)] disabled:opacity-50 cursor-pointer text-sm"
                >
                  {isPending ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>جاري إرسال الطلب...</span>
                    </>
                  ) : (
                    <>
                      <Send size={16} className="rotate-180" />
                      <span>إرسال طلب الشحن</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {activeTab === "daily-expenses" && (
        <div className="max-w-4xl mx-auto animate-fade-in">
          {/* Daily Close Form */}
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
                    * يمكنك إغلاق اليوم بحد أقصى مرتين فقط
                  </span>
                </div>

                {/* 2. Total Cash (توتال الكاش - Over View) */}
                <div className="space-y-2">
                  <label htmlFor="totalCash" className="block text-[13px] font-medium text-brand-dim font-cairo font-semibold">
                    توتال الكاش (Over View)
                  </label>
                  <div className="relative">
                    <input
                      id="totalCash"
                      type="number"
                      step="0.01"
                      readOnly
                      disabled={isPending}
                      value={totalCash}
                      placeholder="0.00"
                      className="w-full bg-[#070814]/40 border border-brand-border/40 rounded-xl pl-4 pr-11 py-3.5 text-sm text-white/60 focus:outline-none transition-all duration-300 text-left dir-ltr font-inter select-none cursor-not-allowed"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none">
                      <Wallet size={16} />
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[10px] text-brand-dim/50 select-none flex-wrap gap-2">
                    <span>
                      * إجمالي العهدة الحالية: <span className="font-inter font-bold text-brand-accent">{currentCustody.toLocaleString("en-US")}</span>
                    </span>
                  </div>
                </div>

                {/* 3. Total Expenses (إجمالي مصروفات المحفظة (التوتال)) - يدوي */}
                <div className="space-y-2">
                  <label htmlFor="totalAmount" className="block text-[13px] font-medium text-brand-dim font-cairo font-semibold">
                    إجمالي مصروفات المحفظة (التوتال)
                  </label>
                  <div className="relative">
                    <input
                      id="totalAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      disabled={isPending}
                      value={totalAmount}
                      onChange={(e) => setTotalAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-[#070814]/80 border border-brand-border/80 rounded-xl pl-4 pr-11 py-3.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-glow transition-all duration-300 disabled:opacity-50 text-left dir-ltr font-inter"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-accent pointer-events-none">
                      <ClipboardList size={16} />
                    </span>
                  </div>
                </div>

                {/* 4. Personal Expenses (المصاريف الشخصية (ج.م)) */}
                <div className="space-y-2">
                  <label htmlFor="personalExpense" className="block text-[13px] font-medium text-brand-dim">
                    المصاريف الشخصية
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

                {/* Dynamic Custody Transfers Section */}
                <div className="md:col-span-2 border-t border-brand-border/20 pt-6 mt-2 space-y-4">
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

                {/* Dynamic Marketing Systems */}
                {marketingSystems.map((sys) => (
                  <div key={sys.id} className="space-y-2 md:col-span-2">
                    <label htmlFor={`marketing_${sys.id}`} className="block text-[13px] font-medium text-brand-dim">
                      {sys.name}
                    </label>
                    <div className="relative">
                      <input
                        id={`marketing_${sys.id}`}
                        type="number"
                        step="0.01"
                        min="0"
                        disabled={isPending}
                        value={marketingExpenses[sys.id] || ""}
                        onChange={(e) =>
                          setMarketingExpenses((prev) => ({
                            ...prev,
                            [sys.id]: e.target.value,
                          }))
                        }
                        placeholder="0.00"
                        className="w-full bg-[#070814]/80 border border-brand-border/80 rounded-xl pl-4 pr-11 py-3.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-glow transition-all duration-300 disabled:opacity-50 text-left dir-ltr font-inter"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none">
                        <Coins size={16} />
                      </span>
                    </div>
                  </div>
                ))}

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
      )}

      {activeTab === "edit-expenses" && (
        <div className="max-w-4xl mx-auto animate-fade-in">
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

            {/* Date Search Input - only visible when report is not loaded yet */}
            {!originalReport && (
              <div className="w-full space-y-2 mb-8 text-right">
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
            )}

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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 text-right" dir="rtl">
                  
                  {/* 1. Date Search Input (side-by-side with total cash inside form) */}
                  <div className="space-y-2 text-right">
                    <label htmlFor="editSearchDateForm" className="block text-[13px] font-medium text-brand-dim font-semibold">
                      تاريخ التقرير المطلوب تعديله
                    </label>
                    <div className="relative">
                      <input
                        id="editSearchDateForm"
                        type="date"
                        required
                        disabled={isPending || isFetchingReport}
                        min={tenDaysAgoStr}
                        max={todayStr}
                        value={editSearchDate}
                        onChange={(e) => handleEditDateChange(e.target.value)}
                        onClick={(e) => e.currentTarget.showPicker()}
                        className="w-full bg-[#070814]/80 border border-brand-border/80 rounded-xl pl-4 pr-11 py-3.5 text-sm text-white focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-glow transition-all duration-300 disabled:opacity-50 text-left dir-ltr font-inter cursor-pointer"
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

                  {/* 2. Read-only Total Cash (Over View) */}
                  <div className="space-y-2 text-right">
                    <label htmlFor="editTotalCash" className="block text-[13px] font-medium text-brand-dim font-cairo font-semibold">
                      توتال الكاش المقترح (Over View)
                    </label>
                    <div className="relative">
                      <input
                        id="editTotalCash"
                        type="number"
                        step="0.01"
                        readOnly
                        disabled={isPending}
                        value={editTotalCash}
                        placeholder="0.00"
                        className="w-full bg-[#070814]/40 border border-brand-border/40 rounded-xl pl-4 pr-11 py-3.5 text-sm text-white/60 focus:outline-none transition-all duration-300 text-left dir-ltr font-inter select-none cursor-not-allowed"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none">
                        <Wallet size={16} />
                      </span>
                    </div>
                  </div>

                  {/* 3. Editable editTotalAmount (إجمالي مصروفات المحفظة المقترح - يدوي) */}
                  <div className="space-y-2 text-right">
                    <label htmlFor="editTotalAmount" className="block text-[13px] font-medium text-brand-dim font-cairo font-semibold">
                      إجمالي مصروفات المحفظة المقترح (التوتال)
                    </label>
                    <div className="relative">
                      <input
                        id="editTotalAmount"
                        type="number"
                        step="0.01"
                        min="0"
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
                  </div>

                  {/* 4. Personal Expenses */}
                  <div className="space-y-2 text-right">
                    <label htmlFor="editPersonalExpense" className="block text-[13px] font-medium text-brand-dim">
                      المصاريف الشخصية المقترحة
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

                  {/* Dynamic Marketing Systems */}
                  {marketingSystems.map((sys) => (
                    <div key={sys.id} className="space-y-2 text-right md:col-span-2">
                      <label htmlFor={`edit_marketing_${sys.id}`} className="block text-[13px] font-medium text-brand-dim">
                        {sys.name} المقترحة
                      </label>
                      <div className="relative">
                        <input
                          id={`edit_marketing_${sys.id}`}
                          type="number"
                          step="0.01"
                          min="0"
                          disabled={isPending}
                          value={editMarketingExpenses[sys.id] || ""}
                          onChange={(e) =>
                            setEditMarketingExpenses((prev) => ({
                              ...prev,
                              [sys.id]: e.target.value,
                            }))
                          }
                          placeholder="0.00"
                          className="w-full bg-[#070814]/80 border border-brand-border/80 rounded-xl pl-4 pr-11 py-3.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-glow transition-all duration-300 disabled:opacity-50 text-left dir-ltr font-inter"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none">
                          <Coins size={16} />
                        </span>
                      </div>
                    </div>
                  ))}

                </div>

                {/* Dynamic Custody Transfers Section */}
                <div className="border-t border-brand-border/20 pt-6 mt-8 space-y-4 text-right">
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
