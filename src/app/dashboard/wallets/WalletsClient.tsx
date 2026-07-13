"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addWallet, toggleWalletStatus, WalletData } from "@/app/actions/wallet";
import { supabase } from "@/lib/supabase";
import { MONTHLY_WALLET_LIMIT } from "@/lib/constants";
import {
  Wallet,
  Phone,
  Coins,
  Search,
  Calendar,
  Loader2,
  TrendingUp,
  FolderSync,
  Smartphone,
  Pencil,
  ChevronDown,
  AlertCircle,
  BarChart3,
} from "lucide-react";

interface WalletsClientProps {
  initialWallets: WalletData[];
}

export default function WalletsClient({ initialWallets }: WalletsClientProps) {
  const router = useRouter();
  const [wallets, setWallets] = useState<WalletData[]>(initialWallets);
  const [isPending, startTransition] = useTransition();

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "highest_balance">("newest");
  const [isArchivedOpen, setIsArchivedOpen] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const sortDropdownRef = React.useRef<HTMLDivElement>(null);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Form input states
  const [phone, setPhone] = useState("");
  const [balance, setBalance] = useState("");

  // Sync state with initialWallets on page refreshes
  React.useEffect(() => {
    setWallets(initialWallets);
  }, [initialWallets]);

  // Subscribe to real-time updates for wallets and fund requests
  React.useEffect(() => {
    const channel = supabase
      .channel("wallets_realtime_channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "fund_requests",
        },
        (payload) => {
          console.log("Realtime event on fund_requests:", payload);
          if (
            (payload.eventType === "UPDATE" || payload.eventType === "INSERT") &&
            payload.new &&
            payload.new.status === "approved"
          ) {
            const amount = Number(payload.new.amount_approved) || 0;
            showToast(
              `تم اعتماد شحن رصيد بمبلغ ${amount.toLocaleString("en-US")} ج.م وتحديث المحفظة!`,
              "success"
            );
          }
          router.refresh();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "wallets",
        },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  // Close dropdown on click outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        sortDropdownRef.current &&
        !sortDropdownRef.current.contains(event.target as Node)
      ) {
        setIsSortDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const getSortLabel = (sortVal: typeof sortBy) => {
    switch (sortVal) {
      case "newest":
        return "الأحدث";
      case "oldest":
        return "الأقدم";
      case "highest_balance":
        return "الأعلى رصيداً";
      default:
        return "الأحدث";
    }
  };

  // Show a toast message helper
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Handle adding new wallet
  const handleAddWallet = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phone || phone.trim() === "") {
      showToast("يرجى إدخال رقم الهاتف للمحفظة.", "error");
      return;
    }

    // Egyptian phone validation check (starts with 010, 011, 012, 015 and has exactly 11 digits)
    const phoneRegex = /^01[0125][0-9]{8}$/;
    if (!phoneRegex.test(phone.trim())) {
      showToast("يرجى إدخال رقم هاتف مصري صحيح (11 رقم)", "error");
      return;
    }

    const initialBalanceVal = parseFloat(balance);
    if (isNaN(initialBalanceVal) || initialBalanceVal < 0) {
      showToast("يرجى إدخال رصيد صحيح (يجب أن يكون صفر أو أكبر).", "error");
      return;
    }

    startTransition(async () => {
      const res = await addWallet(phone.trim(), initialBalanceVal);

      if (res.success && res.wallet) {
        showToast("تم إضافة المحفظة بنجاح.", "success");
        setPhone("");
        setBalance("");
        // Optimistically add to list
        setWallets((prev) => [res.wallet!, ...prev]);
        router.refresh();
      } else {
        showToast(res.error || "فشل إضافة المحفظة.", "error");
      }
    });
  };

  // Handle toggle wallet status
  const handleToggleStatus = async (walletId: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;

    // Optimistically update status in state
    setWallets((prev) =>
      prev.map((w) => (w.id === walletId ? { ...w, is_active: nextStatus } : w))
    );

    const res = await toggleWalletStatus(walletId, nextStatus);

    if (res.success) {
      showToast(
        nextStatus ? "تم تفعيل المحفظة بنجاح." : "تم إيقاف المحفظة بنجاح.",
        "success"
      );
      router.refresh();
    } else {
      // Revert state if it failed
      setWallets((prev) =>
        prev.map((w) => (w.id === walletId ? { ...w, is_active: currentStatus } : w))
      );
      showToast(res.error || "فشل تعديل حالة المحفظة.", "error");
    }
  };

  // Format Arabic Date using standard Western Arabic numerals (e.g. 17 يونيو 2026)
  const formatDateArabic = (dateString: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(date);
    } catch (e) {
      return dateString;
    }
  };

  // Programmatic filtering and sorting of wallets
  const processedWallets = React.useMemo(() => {
    let result = [...wallets];

    // 1. Filter by search query (phone number)
    if (searchQuery.trim() !== "") {
      result = result.filter((w) =>
        w.phone_number.includes(searchQuery.trim())
      );
    }

    // 2. Sort by selected criteria
    result.sort((a, b) => {
      if (sortBy === "newest") {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      } else if (sortBy === "oldest") {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateA - dateB;
      } else if (sortBy === "highest_balance") {
        return b.start_of_month_balance - a.start_of_month_balance;
      }
      return 0;
    });

    return result;
  }, [wallets, searchQuery, sortBy]);

  // Separate active and inactive (archived) wallets
  const activeWallets = React.useMemo(() => {
    return processedWallets.filter((w) => w.is_active);
  }, [processedWallets]);

  const inactiveWallets = React.useMemo(() => {
    return processedWallets.filter((w) => !w.is_active);
  }, [processedWallets]);

  // Shared Card Renderer Helper
  const renderWalletCard = (wallet: WalletData) => {
    const currentMonthTotal = wallet.currentMonthTotal ?? wallet.start_of_month_balance;
    const remainingLimit = wallet.remainingLimit ?? Math.max(0, MONTHLY_WALLET_LIMIT - currentMonthTotal);
    const isExceeded = currentMonthTotal >= MONTHLY_WALLET_LIMIT;
    const usagePercent = Math.min(100, (currentMonthTotal / MONTHLY_WALLET_LIMIT) * 100);

    return (
      <div
        key={wallet.id}
        className={`backdrop-blur-xl bg-brand-card/65 border border-brand-border/40 p-6 rounded-2xl shadow-lg hover:border-brand-accent/35 transition-all duration-300 relative ${
          !wallet.is_active ? "opacity-75" : ""
        } ${isExceeded ? "border-red-500/30 hover:border-red-500/40" : ""}`}
      >
        {/* Card Header (Phone details & Switch) */}
        <div className="flex items-start justify-between gap-4">
          {/* Left: Phone icon & details */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-accent/10 border border-brand-accent/15 text-brand-accent flex items-center justify-center shrink-0">
              <Smartphone size={18} />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-1 text-xs font-semibold text-brand-dim">
                <span>رقم المحفظة</span>
                <Pencil size={10} className="text-white/20" />
                {/* Exceeded Badge */}
                {isExceeded && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/15 border border-red-500/30 text-red-400 rounded-full text-[9px] font-bold mr-1">
                    <AlertCircle size={9} className="shrink-0" />
                    تخطت الحد الشهري
                  </span>
                )}
              </div>
              <span className="text-[17px] font-bold text-white tracking-wide block font-inter dir-ltr text-right">
                {wallet.phone_number}
              </span>
            </div>
          </div>

          {/* Right: Switch Toggle */}
          <div className="flex items-center gap-2 select-none">
            <span
              className={`text-xs font-semibold transition-colors duration-200 ${
                wallet.is_active ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {wallet.is_active ? "نشطة" : "موقوفة"}
            </span>
            <button
              type="button"
              onClick={() => handleToggleStatus(wallet.id, wallet.is_active)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                wallet.is_active ? "bg-brand-accent" : "bg-white/10"
              }`}
              aria-label="تبديل حالة المحفظة"
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  wallet.is_active ? "-translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Card Body: start_of_month_balance */}
        <div className="bg-[#070814]/70 border border-brand-border/25 rounded-xl p-4 flex items-center justify-between mt-5">
          <span className="text-xs font-semibold text-brand-dim">رصيد أول الشهر</span>
          <span className="text-base font-bold text-white font-inter">
            {wallet.start_of_month_balance.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            <span className="text-[10px] text-brand-dim font-cairo font-normal">ج.م</span>
          </span>
        </div>

        {/* Current Month Total Row */}
        <div className="bg-[#070814]/50 border border-brand-border/15 rounded-xl p-3.5 flex items-center justify-between mt-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-dim">
            <BarChart3 size={13} className="text-brand-accent/60 shrink-0" />
            <span>إجمالي هذا الشهر</span>
          </div>
          <span className={`text-sm font-bold font-inter ${
            isExceeded ? "text-red-400" : "text-white"
          }`}>
            {currentMonthTotal.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            <span className="text-[10px] text-brand-dim font-cairo font-normal">ج.م</span>
          </span>
        </div>

        {/* Progress Bar */}
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-brand-dim/70">
            <span>نسبة الامتلاء (من 200,000 ج.م)</span>
            <span className={`font-bold font-inter ${
              usagePercent >= 100 ? "text-red-400" : usagePercent >= 80 ? "text-amber-400" : "text-emerald-400"
            }`}>
              {usagePercent.toFixed(1)}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                usagePercent >= 100
                  ? "bg-red-500"
                  : usagePercent >= 80
                  ? "bg-amber-400"
                  : "bg-emerald-500"
              }`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
        </div>

        {/* Card Footer: current balance & created_at date */}
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-brand-border/25">
          {/* Current Balance Badge */}
          <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
            isExceeded
              ? "bg-red-500/10 border border-red-500/20 text-red-400"
              : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
          }`}>
            <TrendingUp size={12} className="shrink-0" />
            <span>الرصيد الحالي:</span>
            <span className="font-inter">
              {currentMonthTotal.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              ج.م
            </span>
          </div>

          {/* Creation Date */}
          <div className="flex items-center gap-1.5 text-xs text-brand-dim/80">
            <Calendar size={13} className="text-white/20 shrink-0" />
            <span>{formatDateArabic(wallet.created_at)}</span>
          </div>
        </div>

        {/* Admin context: show agent owner name if exists */}
        {wallet.agent_profile?.full_name && (
          <div className="mt-3 text-[10px] text-brand-dim/40 text-left border-t border-brand-border/10 pt-1.5 flex justify-between items-center">
            <span>المالك:</span>
            <span className="font-semibold text-white/40">{wallet.agent_profile.full_name}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8 font-cairo select-none relative text-right" dir="rtl">
      {/* Toast Notification */}
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

      {/* Page Header */}
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Wallet className="text-brand-accent" size={24} />
          <span>إدارة المحافظ الإلكترونية</span>
        </h1>
        <p className="text-sm text-brand-dim leading-relaxed">
          أضف وتابع أرقام محافظ الكاش الخاصة بك لمتابعة إيراداتك ومصروفاتك الشهرية.
        </p>
      </div>

      {/* Advanced Filter Bar */}
      <div className="backdrop-blur-xl bg-brand-card/40 border border-brand-border/40 p-4 rounded-2xl shadow-lg relative z-20">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative w-full sm:max-w-xs">
            <input
              type="text"
              placeholder="ابحث برقم المحفظة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#070814]/80 border border-brand-border/80 rounded-xl pl-4 pr-11 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-glow transition-all duration-300"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30">
              <Search size={15} />
            </span>
          </div>

          {/* Sort Dropdown */}
          <div className="relative" ref={sortDropdownRef}>
            <button
              type="button"
              dir="rtl"
              onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
              className={`flex items-center justify-between gap-3 px-4 py-2.5 bg-[#070814]/80 border rounded-xl text-sm text-brand-dim hover:text-white hover:border-brand-accent/50 transition-all cursor-pointer select-none relative z-20 min-w-[140px] ${
                isSortDropdownOpen ? "border-brand-accent text-white ring-1 ring-brand-glow/20" : "border-brand-border/80"
              }`}
            >
              <span>{getSortLabel(sortBy)}</span>
              <ChevronDown
                size={14}
                className={`text-white/40 transition-transform duration-200 ${
                  isSortDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isSortDropdownOpen && (
              <div className="absolute left-0 mt-2 w-40 bg-[#0c0e18]/95 backdrop-blur-xl border border-brand-border/80 rounded-xl shadow-2xl p-1 z-30 animate-scale-in text-right">
                <div className="space-y-0.5">
                  {[
                    { value: "newest", label: "الأحدث" },
                    { value: "oldest", label: "الأقدم" },
                    { value: "highest_balance", label: "الأعلى رصيداً" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setSortBy(opt.value as any);
                        setIsSortDropdownOpen(false);
                      }}
                      className={`w-full text-right px-3 py-2 text-xs rounded-lg transition-colors cursor-pointer block font-cairo ${
                        sortBy === opt.value
                          ? "text-brand-accent bg-brand-accent/15 font-bold"
                          : "text-white/80 hover:bg-white/5"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Right Side: Add New Wallet Form (1 column on lg, order-1 in RTL is right side) */}
        <div className="lg:col-span-1">
          <div className="backdrop-blur-xl bg-brand-card border border-brand-border rounded-[24px] p-6 md:p-8 space-y-6 md:space-y-7 shadow-2xl relative">
            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Wallet className="text-brand-accent" size={20} />
                <span>إضافة محفظة جديدة</span>
              </h2>
              <p className="text-xs md:text-sm text-brand-dim leading-relaxed">
                أدخل رقم الهاتف المرتبط بالمحفظة الإلكترونية لإضافتها إلى قائمتك.
              </p>
            </div>

            <form onSubmit={handleAddWallet} className="space-y-6" autoComplete="off">
              {/* Phone Input */}
              <div className="space-y-2">
                <label htmlFor="walletPhone" className="block text-sm font-bold text-white/90 mb-1">
                  رقم الهاتف للمحفظة
                </label>
                <div className="relative">
                  <input
                    id="walletPhone"
                    type="text"
                    required
                    disabled={isPending}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="01xxxxxxxxx"
                    autoComplete="off"
                    className="w-full bg-[#070814] border border-brand-border rounded-xl pl-4 pr-11 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-glow transition-all duration-300 disabled:opacity-50 text-left dir-ltr font-inter"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30">
                    <Phone size={16} />
                  </span>
                </div>
              </div>

              {/* Balance Input */}
              <div className="space-y-2">
                <label htmlFor="walletBalance" className="block text-sm font-bold text-white/90 mb-1">
                  الرصيد الحالي للمحفظة (ج.م)
                </label>
                <div className="relative">
                  <input
                    id="walletBalance"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    disabled={isPending}
                    value={balance}
                    onChange={(e) => setBalance(e.target.value)}
                    placeholder="0.00"
                    autoComplete="off"
                    className="w-full bg-[#070814] border border-brand-border rounded-xl pl-4 pr-11 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-glow transition-all duration-300 disabled:opacity-50 text-left dir-ltr font-inter"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30">
                    <Coins size={16} />
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isPending}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-brand-accent hover:bg-brand-accent/95 disabled:bg-brand-accent/50 text-white font-semibold rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(139,92,246,0.25)] hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] active:scale-[0.98] disabled:scale-100 disabled:cursor-not-allowed cursor-pointer mt-2"
              >
                {isPending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>جاري الإضافة...</span>
                  </>
                ) : (
                  <>
                    <Wallet size={16} />
                    <span>إضافة محفظة</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Left Side: Wallets List & Accordion Section (2 columns on lg, order-2 in RTL is left side) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* List Title & Active Count */}
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white">قائمة المحافظ الحالية</h2>
            <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-xs font-semibold bg-brand-accent/10 text-brand-accent border border-brand-accent/20 rounded-full">
              {activeWallets.length} نشطة
            </span>
          </div>

          {/* Cards Grid (Active Wallets) */}
          {activeWallets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activeWallets.map((wallet) => renderWalletCard(wallet))}
            </div>
          ) : (
            /* Empty State for Active Wallets */
            <div className="backdrop-blur-xl bg-brand-card/50 border border-brand-border rounded-[24px] py-12 text-center select-none">
              <div className="flex flex-col items-center justify-center space-y-4 max-w-sm mx-auto">
                <div className="w-12 h-12 rounded-xl bg-white/[0.02] border border-brand-border/40 text-brand-dim/50 flex items-center justify-center shadow-inner">
                  <Wallet size={24} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">لا توجد محافظ نشطة</h4>
                  <p className="text-xs text-brand-dim leading-relaxed">
                    لم نجد أي محافظ كاش نشطة مضافة مطابقة لبحثك في النظام.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Inactive (Archived) Wallets Accordion/Collapsible */}
          <div className="border border-brand-border/40 rounded-[20px] bg-brand-card/25 overflow-hidden transition-all duration-300 mt-8">
            <button
              type="button"
              onClick={() => setIsArchivedOpen(!isArchivedOpen)}
              className="w-full flex items-center justify-between p-5 text-right font-bold text-white hover:bg-white/[0.01] transition-colors focus:outline-none cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <FolderSync className="text-brand-accent" size={18} />
                <span>المحافظ غير النشطة (المؤرشفة)</span>
                <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 rounded-full">
                  {inactiveWallets.length}
                </span>
              </div>
              <ChevronDown className={`text-white/40 transition-transform duration-300 ${isArchivedOpen ? "rotate-180" : ""}`} size={16} />
            </button>

            {isArchivedOpen && (
              <div className="p-5 border-t border-brand-border/30 bg-[#070814]/30 space-y-4 animate-slide-down">
                {inactiveWallets.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {inactiveWallets.map((wallet) => renderWalletCard(wallet))}
                  </div>
                ) : (
                  <p className="text-sm text-brand-dim/50 text-center py-4">
                    لا توجد محافظ غير نشطة حالياً.
                  </p>
                )}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}

