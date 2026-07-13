"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet, AlertCircle, RefreshCw } from "lucide-react";
import { verifyMonthlyBalances, WalletData } from "@/app/actions/wallet";

interface WalletVerificationWrapperProps {
  needsVerification: boolean;
  wallets: WalletData[];
  children: React.ReactNode;
}

export default function WalletVerificationWrapper({
  needsVerification,
  wallets,
  children,
}: WalletVerificationWrapperProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(needsVerification);
  const [balances, setBalances] = useState<Record<string, string>>(() => {
    return wallets.reduce((acc, wallet) => {
      acc[wallet.id] = "";
      return acc;
    }, {} as Record<string, string>);
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleInputChange = (walletId: string, val: string) => {
    setBalances((prev) => ({
      ...prev,
      [walletId]: val,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    try {
      // Validate inputs
      const payload = wallets.map((w) => {
        const val = balances[w.id];
        if (val === undefined || val.trim() === "") {
          throw new Error(`يرجى إدخال الرصيد لمحفظة ${w.phone_number}`);
        }
        const num = parseFloat(val);
        if (isNaN(num) || num < 0) {
          throw new Error(`يرجى إدخال رصيد صحيح وغير سالب لمحفظة ${w.phone_number}`);
        }
        return { walletId: w.id, balance: num };
      });

      setIsLoading(true);
      const res = await verifyMonthlyBalances(payload);
      if (res.success) {
        setIsModalOpen(false);
        router.refresh();
      } else {
        setErrorMsg(res.error || "فشل تحديث الأرصدة، يرجى المحاولة مرة أخرى.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "حدث خطأ غير متوقع.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isModalOpen) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-brand-bg/85 backdrop-blur-xl p-4 overflow-y-auto select-none font-cairo animate-fade-in" dir="rtl">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-accent/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-accent/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-lg bg-[#0a0d16]/95 border border-brand-border/60 rounded-3xl p-6 md:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.6)] animate-scale-in text-right">
        {/* Header Indicator */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent mb-4 animate-pulse">
            <Wallet size={32} />
          </div>
          <h2 className="text-xl md:text-2xl font-extrabold text-white">
            تحديث أرصدة المحافظ الإجباري (أول الشهر)
          </h2>
          <p className="text-xs text-brand-dim/80 mt-2 leading-relaxed max-w-sm">
            يرجى إدخال الرصيد الفعلي الحالي لكل محفظة من محافظك لتتمكن من تقديم عمليات وطلبات أموال جديدة هذا الشهر.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2.5 leading-relaxed">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3.5 max-h-72 overflow-y-auto custom-scrollbar pr-0.5">
            {wallets.map((wallet) => (
              <div
                key={wallet.id}
                className="p-4 rounded-2xl bg-[#0d101a]/60 border border-brand-border/40 hover:border-brand-border/70 transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5"
              >
                <div className="text-right">
                  <span className="text-[10px] text-brand-dim/60 block">رقم المحفظة</span>
                  <span className="text-sm font-bold text-white font-inter dir-ltr inline-block mt-0.5">
                    {wallet.phone_number}
                  </span>
                </div>

                <div className="relative sm:max-w-[180px] w-full">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={balances[wallet.id] || ""}
                    onChange={(e) => handleInputChange(wallet.id, e.target.value)}
                    disabled={isLoading}
                    className="w-full h-11 px-4 rounded-xl bg-[#06070d] border border-brand-border/60 text-white placeholder-brand-dim/30 font-inter focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent/30 text-left transition-all disabled:opacity-50"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-brand-dim/50 pointer-events-none select-none">
                    ج.م
                  </span>
                </div>
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 rounded-xl bg-brand-accent hover:bg-brand-accent/90 text-white font-bold text-sm shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all duration-300 flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-4 cursor-pointer"
          >
            {isLoading ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                <span>جاري تحديث الأرصدة...</span>
              </>
            ) : (
              <span>تأكيد الأرصدة وبدء الاستخدام</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
