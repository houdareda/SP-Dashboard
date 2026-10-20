"use client";

import React, { useState, useEffect, useTransition, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Coins,
  Calendar,
  User,
  Check,
  X,
  ChevronDown,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Wallet,
  Copy,
} from "lucide-react";
import {
  AdminFundRequest,
  AdminAgentOption,
  reviewFundRequest,
  getSingleFundRequest,
} from "@/app/actions/adminOperations";

interface FundRequestsClientProps {
  initialRequests: AdminFundRequest[];
  initialAgents: AdminAgentOption[];
}

export default function FundRequestsClient({
  initialRequests,
  initialAgents,
}: FundRequestsClientProps) {
  const router = useRouter();
  const [requests, setRequests] = useState<AdminFundRequest[]>(initialRequests);
  const [agents] = useState<AdminAgentOption[]>(initialAgents);
  const [isPending, startTransition] = useTransition();

  // Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Filter States
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<string>("newest");

  // Dropdown Refs & States
  const agentDropdownRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const [isAgentDropdownOpen, setIsAgentDropdownOpen] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

  // Accordion card expanded state
  const [expandedRequests, setExpandedRequests] = useState<Record<string, boolean>>({});

  // Modals state
  const [activeModalRequest, setActiveModalRequest] = useState<AdminFundRequest | null>(null);
  const [approvedAmount, setApprovedAmount] = useState<string>("");
  const [multiApprovedAmounts, setMultiApprovedAmounts] = useState<Record<string, string>>({});
  const [activeRejectRequest, setActiveRejectRequest] = useState<AdminFundRequest | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedRequests((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Copied Wallet Phone State
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  const handleCopyWalletNumber = (e: React.MouseEvent, phoneNumber: string, agentName?: string) => {
    e.stopPropagation();
    if (!phoneNumber || phoneNumber === "محفظة غير معروفة") return;

    if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(phoneNumber);
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = phoneNumber;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
      } catch (err) {
        console.error("Copy fallback failed:", err);
      }
      document.body.removeChild(textArea);
    }

    setCopiedPhone(phoneNumber);
    setTimeout(() => {
      setCopiedPhone((prev) => (prev === phoneNumber ? null : prev));
    }, 2500);

    const agentSuffix = agentName ? ` الخاص بالموظف (${agentName})` : "";
    showToast(`تم نسخ رقم المحفظة ${phoneNumber}${agentSuffix} بنجاح 📋`, "success");
  };

  // Sync server-side props with local state
  useEffect(() => {
    setRequests(initialRequests);
  }, [initialRequests]);

  // Click Outside Dropdowns Handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        agentDropdownRef.current &&
        !agentDropdownRef.current.contains(event.target as Node)
      ) {
        setIsAgentDropdownOpen(false);
      }
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

  // 1. Supabase Real-time Subscription Channel
  useEffect(() => {
    const channel = supabase
      .channel("fund_requests_realtime_channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "fund_requests",
        },
        async (payload) => {
          console.log("Supabase Realtime event received for funds:", payload);
          
          if (payload.eventType === "INSERT") {
            const res = await getSingleFundRequest(payload.new.id);
            if (res.success && res.request) {
              setRequests((prev) => {
                if (prev.some((r) => r.id === res.request!.id)) return prev;
                return [res.request!, ...prev];
              });
              showToast(
                `طلب أموال جديد من ${res.request.agent?.full_name || "موظف"} بمبلغ ${res.request.amount_requested.toLocaleString("en-US")} ج.م`,
                "success"
              );
            }
          } else if (payload.eventType === "UPDATE") {
            if (payload.new.status !== "pending") {
              // Hide approved/rejected from active lists
              setRequests((prev) => prev.filter((r) => r.id !== payload.new.id));
            } else {
              const res = await getSingleFundRequest(payload.new.id);
              if (res.success && res.request) {
                setRequests((prev) =>
                  prev.map((r) => (r.id === payload.new.id ? res.request! : r))
                );
              }
            }
            router.refresh();
          } else if (payload.eventType === "DELETE") {
            setRequests((prev) => prev.filter((r) => r.id !== payload.old.id));
            router.refresh();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  // 2. Action Handlers
  const handleOpenApproveModal = (req: AdminFundRequest) => {
    setActiveModalRequest(req);
    if (req.is_multi_wallet) {
      setApprovedAmount(String(req.amount_requested));
      const initialAmounts: Record<string, string> = {};
      if (Array.isArray(req.multi_wallet_data)) {
        req.multi_wallet_data.forEach((item: any) => {
          initialAmounts[item.wallet_id] = String(item.amount_requested || item.amount);
        });
      }
      setMultiApprovedAmounts(initialAmounts);
    } else {
      // Cap the initial approved amount to the wallet's remaining limit
      const remainingLimit = req.wallet_remaining_limit ?? 200000;
      const cappedAmount = Math.min(req.amount_requested, remainingLimit);
      setApprovedAmount(String(cappedAmount > 0 ? cappedAmount : req.amount_requested));
    }
  };

  const handleConfirmApproval = () => {
    if (!activeModalRequest) return;

    if (activeModalRequest.is_multi_wallet) {
      if (!activeModalRequest.multi_wallet_data || !Array.isArray(activeModalRequest.multi_wallet_data)) {
        showToast("بيانات الطلب المتعدد غير صالحة.", "error");
        return;
      }

      const breakdown: Array<{ walletId: string; amountApproved: number }> = [];
      let totalApproved = 0;

      for (const item of activeModalRequest.multi_wallet_data) {
        const valStr = multiApprovedAmounts[item.wallet_id];
        const val = parseFloat(valStr || "0");
        if (isNaN(val) || val < 0) {
          showToast(`يرجى إدخال مبلغ صحيح أكبر من أو يساوي الصفر للمحفظة ${item.phone_number}.`, "error");
          return;
        }
        totalApproved += val;
        breakdown.push({
          walletId: item.wallet_id,
          amountApproved: val,
        });
      }

      if (totalApproved <= 0) {
        showToast("يجب أن يكون إجمالي المبالغ المعتمدة أكبر من الصفر.", "error");
        return;
      }

      startTransition(async () => {
        const res = await reviewFundRequest(activeModalRequest.id, "approved", totalApproved, breakdown);
        if (res.success) {
          showToast("تم اعتماد طلب شحن الرصيد بنجاح.", "success");
          setRequests((prev) => prev.filter((r) => r.id !== activeModalRequest.id));
          setActiveModalRequest(null);
          router.refresh();
        } else {
          showToast(res.error || "فشل اعتماد الطلب.", "error");
        }
      });
    } else {
      const amountVal = parseFloat(approvedAmount);
      if (isNaN(amountVal) || amountVal <= 0) {
        showToast("يرجى إدخال مبلغ صحيح أكبر من الصفر للاعتماد.", "error");
        return;
      }

      startTransition(async () => {
        const res = await reviewFundRequest(activeModalRequest.id, "approved", amountVal);
        if (res.success) {
          showToast("تم اعتماد طلب شحن الرصيد بنجاح.", "success");
          setRequests((prev) => prev.filter((r) => r.id !== activeModalRequest.id));
          setActiveModalRequest(null);
          router.refresh();
        } else {
          showToast(res.error || "فشل اعتماد الطلب.", "error");
        }
      });
    }
  };

  const handleReject = (req: AdminFundRequest) => {
    setActiveRejectRequest(req);
  };

  const handleConfirmRejection = () => {
    if (!activeRejectRequest) return;

    startTransition(async () => {
      const res = await reviewFundRequest(activeRejectRequest.id, "rejected");
      if (res.success) {
        showToast("تم رفض طلب شحن الرصيد بنجاح.", "success");
        setRequests((prev) => prev.filter((r) => r.id !== activeRejectRequest.id));
        setActiveRejectRequest(null);
        router.refresh();
      } else {
        showToast(res.error || "فشل رفض الطلب.", "error");
      }
    });
  };

  // 3. Filtering & Sorting Logic
  const filteredRequests = useMemo(() => {
    return requests
      .filter((req) => {
        // Filter by agent names (multi-select)
        if (selectedAgentIds.length > 0 && !selectedAgentIds.includes(req.agent_id)) {
          return false;
        }

        // Filter by date bounds
        const reqDateStr = req.request_date; // YYYY-MM-DD
        if (startDate && reqDateStr < startDate) {
          return false;
        }
        if (endDate && reqDateStr > endDate) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Enforce grouping: pending first
        if (a.status === "pending" && b.status !== "pending") return -1;
        if (a.status !== "pending" && b.status === "pending") return 1;

        // Then apply sort order
        if (sortOrder === "newest") {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        } else {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
      });
  }, [requests, selectedAgentIds, startDate, endDate, sortOrder]);

  return (
    <div className="space-y-8 font-cairo relative text-right" dir="rtl">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-xl border ${
            toast.type === "success"
              ? "bg-[#0b1716]/95 border-emerald-500/40 text-emerald-300 shadow-[0_10px_30px_rgba(16,185,129,0.2)]"
              : "bg-[#1c0e12]/95 border-red-500/40 text-red-300 shadow-[0_10px_30px_rgba(239,68,68,0.2)]"
          } transition-all duration-300 animate-slide-in font-semibold`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle size={18} className="text-red-400 shrink-0" />
          )}
          <span className="text-sm font-cairo">{toast.message}</span>
        </div>
      )}

      {/* Header section */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent shrink-0 mt-1">
          <Coins size={24} />
        </div>
        <div className="space-y-1.5 text-right">
          <h1 className="text-2xl font-bold text-white">طلبات الأموال</h1>
          <p className="text-sm text-brand-dim leading-relaxed">
            مراجعة واعتماد أو رفض طلبات شحن الأرصدة والعهدة المقدمة من الموظفين.
          </p>
        </div>
      </div>

      {/* Filters Box */}
      <div className="backdrop-blur-xl bg-brand-card/95 border border-brand-border/55 p-6 rounded-[24px] shadow-xl relative z-40">
        <div className="flex flex-wrap items-end gap-6 text-right">
          {/* 1. Agent Filter (Custom Multi-select) */}
          <div className="space-y-2 w-full sm:w-[280px] relative" ref={agentDropdownRef}>
            <label className="block text-[13px] font-medium text-brand-dim">اسم الموظف</label>
            <div className="relative">
              <button
                type="button"
                dir="rtl"
                onClick={() => {
                  setIsAgentDropdownOpen(!isAgentDropdownOpen);
                  setIsSortDropdownOpen(false);
                }}
                className={`w-full h-[46px] px-4 rounded-xl bg-[#070912] border transition-all cursor-pointer flex items-center justify-between ${
                  isAgentDropdownOpen ? "border-brand-accent shadow-[0_0_10px_rgba(139,92,246,0.2)]" : "border-brand-border/80"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-white text-xs font-semibold">
                    {selectedAgentIds.length === 0
                      ? "الكل (جميع الموظفين)"
                      : selectedAgentIds.length === agents.length
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
                      if (selectedAgentIds.length === agents.length || selectedAgentIds.length === 0) {
                        setSelectedAgentIds([]);
                      } else {
                        setSelectedAgentIds(agents.map((a) => a.id));
                      }
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer text-brand-accent hover:text-brand-accent/80 font-bold font-cairo"
                  >
                    <span className="text-xs text-right">تحديد الكل</span>
                    {selectedAgentIds.length === 0 || selectedAgentIds.length === agents.length ? (
                      <div className="w-4 h-4 rounded border border-brand-accent bg-brand-accent/20 flex items-center justify-center shrink-0">
                        <Check size={12} className="text-brand-accent stroke-[3]" />
                      </div>
                    ) : (
                      <div className="w-4 h-4 rounded border border-white/25 bg-white/[0.02] shrink-0" />
                    )}
                  </button>

                  <div className="border-t border-brand-border/10 my-1.5" />

                  <div className="space-y-0.5 max-h-56 overflow-y-auto custom-scrollbar">
                    {agents.map((agent) => {
                      const isChecked = selectedAgentIds.includes(agent.id);
                      return (
                        <button
                          key={agent.id}
                          type="button"
                          dir="rtl"
                          onClick={() => {
                            if (isChecked) {
                              setSelectedAgentIds(selectedAgentIds.filter((id) => id !== agent.id));
                            } else {
                              setSelectedAgentIds([...selectedAgentIds, agent.id]);
                            }
                          }}
                          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer text-white/80 transition-colors w-full"
                        >
                          <span className="text-xs font-semibold text-right">{agent.full_name}</span>
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

          {/* 2. Date Range Picker */}
          <div className="space-y-2 w-full sm:w-[350px]">
            <label className="block text-[13px] font-medium text-brand-dim">تاريخ الطلب</label>
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
              <span className="text-brand-dim text-xs">إلى</span>
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

          {/* 3. Sorting Dropdown (Custom Single-select) */}
          <div className="space-y-2 w-full sm:w-[280px] relative" ref={sortDropdownRef}>
            <label className="block text-[13px] font-medium text-brand-dim">ترتيب حسب</label>
            <div className="relative">
              <button
                type="button"
                dir="rtl"
                onClick={() => {
                  setIsSortDropdownOpen(!isSortDropdownOpen);
                  setIsAgentDropdownOpen(false);
                }}
                className={`w-full h-[46px] px-4 rounded-xl bg-[#070912] border transition-all cursor-pointer flex items-center justify-between ${
                  isSortDropdownOpen ? "border-brand-accent shadow-[0_0_10px_rgba(139,92,246,0.2)]" : "border-brand-border/80"
                }`}
              >
                <span className="text-white text-xs font-semibold">
                  {sortOrder === "newest" ? "تاريخ الطلب: الأحدث أولاً" : "تاريخ الطلب: الأقدم أولاً"}
                </span>
                <ChevronDown size={14} className={`text-white/40 transition-transform duration-200 ${isSortDropdownOpen ? "rotate-180 text-brand-accent" : ""}`} />
              </button>

              {isSortDropdownOpen && (
                <div className="absolute right-0 left-0 mt-2 bg-[#0c0e18]/95 backdrop-blur-xl border border-brand-border/80 rounded-xl shadow-2xl p-1.5 z-30 animate-scale-in text-right">
                  <div className="space-y-1">
                    <button
                      type="button"
                      dir="rtl"
                      onClick={() => {
                        setSortOrder("newest");
                        setIsSortDropdownOpen(false);
                      }}
                      className={`w-full text-right px-3 py-2 text-xs rounded-lg hover:bg-white/5 transition-colors cursor-pointer block font-cairo ${
                        sortOrder === "newest" ? "bg-brand-accent/15 text-brand-accent font-bold" : "text-white/80"
                      }`}
                    >
                      تاريخ الطلب: الأحدث أولاً
                    </button>
                    <button
                      type="button"
                      dir="rtl"
                      onClick={() => {
                        setSortOrder("oldest");
                        setIsSortDropdownOpen(false);
                      }}
                      className={`w-full text-right px-3 py-2 text-xs rounded-lg hover:bg-white/5 transition-colors cursor-pointer block font-cairo ${
                        sortOrder === "oldest" ? "bg-brand-accent/15 text-brand-accent font-bold" : "text-white/80"
                      }`}
                    >
                      تاريخ الطلب: الأقدم أولاً
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Counter */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-brand-dim font-semibold">
          عدد الطلبات المعروضة: <span className="text-brand-accent font-bold text-sm font-inter">{filteredRequests.length}</span>
        </span>
      </div>

      {/* Requests Data Table */}
      <div className="backdrop-blur-xl bg-brand-card/95 border border-brand-border/55 rounded-[24px] overflow-hidden shadow-xl relative z-20">
        <div className="overflow-x-auto">
          {filteredRequests.length > 0 ? (
            <table className="w-full text-right border-collapse text-xs md:text-sm">
              <thead>
                <tr className="border-b border-brand-border/40 text-brand-dim/80 bg-[#070814]/20">
                  <th className="py-4 px-6 font-bold">اسم الموظف</th>
                  <th className="py-4 px-6 font-bold">التاريخ</th>
                  <th className="py-4 px-6 font-bold">محفظة الاستلام</th>
                  <th className="py-4 px-6 font-bold">المبلغ المطلوب</th>
                  <th className="py-4 px-6 font-bold">الحالة</th>
                  <th className="py-4 px-6 font-bold text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/20">
                {filteredRequests.map((req) => (
                  <tr
                    key={req.id}
                    className="hover:bg-white/[0.01] transition-colors"
                  >
                    {/* Employee profile */}
                    <td className="py-4.5 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent shrink-0">
                          <User size={14} />
                        </div>
                        <span className="font-semibold text-white capitalize">
                          {req.agent?.full_name || "موظف"}
                        </span>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="py-4.5 px-6 font-inter text-white/95">
                      {req.request_date}
                    </td>

                    {/* Target Wallet and Smart Balance */}
                    <td className="py-4.5 px-6 space-y-1 text-right">
                      {req.is_multi_wallet ? (
                        <div className="space-y-1.5">
                          <span className="inline-block px-1.5 py-0.5 text-[9.5px] font-extrabold bg-brand-accent/20 text-brand-accent border border-brand-accent/30 rounded-md mb-0.5 animate-pulse font-cairo">
                            طلب متعدد المحافظ
                          </span>
                          <div className="text-xs text-white/95 space-y-1 font-inter font-semibold">
                            {Array.isArray(req.multi_wallet_data) ? (
                              req.multi_wallet_data.map((item: any, idx: number) => {
                                const isCopied = copiedPhone === item.phone_number;
                                return (
                                  <div key={idx} className="flex items-center gap-2 group/copy">
                                    <span
                                      onClick={(e) => handleCopyWalletNumber(e, item.phone_number, req.agent?.full_name)}
                                      className="font-mono cursor-pointer hover:text-brand-accent transition-colors hover:underline underline-offset-4"
                                      title="اضغط لنسخ الرقم"
                                    >
                                      {item.phone_number} {item.esim_number ? `(${item.esim_number})` : ""}
                                    </span>
                                    {item.phone_number && (
                                      <button
                                        type="button"
                                        onClick={(e) => handleCopyWalletNumber(e, item.phone_number, req.agent?.full_name)}
                                        className={`p-1 rounded-md border transition-all cursor-pointer ${
                                          isCopied
                                            ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                                            : "bg-white/5 hover:bg-white/10 border-white/10 text-white/40 hover:text-white group-hover/copy:border-brand-accent/40 group-hover/copy:text-brand-accent"
                                        }`}
                                        title="نسخ الرقم"
                                      >
                                        {isCopied ? <Check size={11} className="stroke-[2.5]" /> : <Copy size={11} />}
                                      </button>
                                    )}
                                  </div>
                                );
                              })
                            ) : (
                              <div
                                onClick={(e) => handleCopyWalletNumber(e, req.wallet?.phone_number || "", req.agent?.full_name)}
                                className="cursor-pointer hover:text-brand-accent transition-colors"
                              >
                                {req.wallet?.phone_number || "محفظة غير معروفة"}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 group/copy">
                            <span
                              onClick={(e) => handleCopyWalletNumber(e, req.wallet?.phone_number || "", req.agent?.full_name)}
                              className="font-bold text-white font-inter tracking-wide cursor-pointer hover:text-brand-accent transition-colors hover:underline underline-offset-4"
                              title="اضغط لنسخ الرقم"
                            >
                              {req.wallet?.phone_number || "محفظة غير معروفة"}
                            </span>
                            {req.wallet?.phone_number && (
                              <button
                                type="button"
                                onClick={(e) => handleCopyWalletNumber(e, req.wallet?.phone_number || "", req.agent?.full_name)}
                                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                  copiedPhone === req.wallet.phone_number
                                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                                    : "bg-white/5 hover:bg-white/10 border-white/10 text-white/40 hover:text-white group-hover/copy:border-brand-accent/40 group-hover/copy:text-brand-accent"
                                }`}
                                title="نسخ الرقم"
                              >
                                {copiedPhone === req.wallet.phone_number ? (
                                  <Check size={12} className="stroke-[2.5]" />
                                ) : (
                                  <Copy size={12} />
                                )}
                              </button>
                            )}
                          </div>
                          <div className="text-[10.5px] text-brand-dim font-cairo">
                            الرصيد: {req.wallet_balance.toLocaleString("en-US", { minimumFractionDigits: 2 })} ج.م
                          </div>
                        </>
                      )}
                    </td>

                    {/* Requested amount */}
                    <td className="py-4.5 px-6 space-y-0.5">
                      <span className="font-bold text-brand-accent font-inter text-base tracking-wide block">
                        {req.amount_requested.toLocaleString("en-US")} ج.م
                      </span>
                      {req.is_multi_wallet && Array.isArray(req.multi_wallet_data) && (
                        <div className="text-[10px] text-brand-dim/80 space-y-0.5">
                          {req.multi_wallet_data.map((item: any, idx: number) => (
                            <div key={idx} className="dir-ltr text-right font-inter">
                              {Number(item.amount_requested || item.amount).toLocaleString("en-US")} ج.م
                            </div>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-4.5 px-6">
                      {req.status === "pending" && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-amber-400 bg-amber-400/10 border border-amber-400/25 rounded-full">
                          <Clock size={12} />
                          <span>قيد الانتظار</span>
                        </span>
                      )}
                      {req.status === "approved" && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/25 rounded-full">
                          <CheckCircle2 size={12} />
                          <span>مقبول</span>
                        </span>
                      )}
                      {req.status === "rejected" && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-red-400 bg-red-400/10 border border-red-400/25 rounded-full">
                          <AlertTriangle size={12} />
                          <span>مرفوض</span>
                        </span>
                      )}
                    </td>

                    {/* Actions block */}
                    <td className="py-4.5 px-6 text-center">
                      {req.status === "pending" ? (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenApproveModal(req)}
                            disabled={isPending}
                            className="flex items-center gap-1 px-4.5 py-2 bg-brand-accent hover:bg-brand-accent/90 text-white font-bold rounded-xl transition-all cursor-pointer text-xs hover:shadow-[0_0_15px_rgba(139,92,246,0.25)] active:scale-95 disabled:opacity-50"
                          >
                            <Check size={13} />
                            <span>موافقة</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReject(req)}
                            disabled={isPending}
                            className="w-8.5 h-8.5 flex items-center justify-center bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/25 hover:text-white rounded-xl transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                            title="رفض الطلب"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="text-[11px] text-brand-dim/80 space-y-1.5 max-w-xs mx-auto text-right">
                          <div>
                            <span className="font-semibold">المراجع: </span>
                            <span className="text-white capitalize">{req.reviewer?.full_name || "إدارة"}</span>
                          </div>
                          {req.status === "approved" && (
                            <div className="text-emerald-400">
                              <span className="font-semibold">المبلغ المعتمد: </span>
                              <span className="font-bold font-inter">
                                {Number(req.amount_approved).toLocaleString("en-US")} ج.م
                              </span>
                            </div>
                          )}
                          <div className="text-[9.5px] text-brand-dim/50 font-inter dir-ltr text-right">
                            {req.approved_at ? new Date(req.approved_at).toLocaleString("ar-EG-u-nu-latn", { timeZone: "Asia/Riyadh" }) : ""}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="border border-dashed border-brand-border/20 rounded-[24px] bg-[#070814]/10 py-20 text-center">
              <div className="flex flex-col items-center justify-center space-y-4 max-w-sm mx-auto">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.01] border border-brand-border/30 text-brand-dim/40 flex items-center justify-center shadow-inner">
                  <Clock size={28} />
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-base font-bold text-white">لا توجد طلبات شحن رصيد</h4>
                  <p className="text-xs text-brand-dim/70 leading-relaxed">
                    لا تتوفر طلبات شحن معلقة أو مأرشفة مطابقة لخيارات البحث المحددة حالياً.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation approval modal dialog */}
      {activeModalRequest && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#05060f]/80 backdrop-blur-sm p-4 animate-fade-in text-right">
          <div className="w-full max-w-md bg-brand-card border border-brand-border rounded-[24px] shadow-2xl p-6 md:p-8 space-y-6 relative animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-brand-border/20 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <CheckCircle2 size={20} className="text-brand-accent" />
                <span>اعتماد مبلغ شحن الرصيد</span>
              </h3>
              <button
                type="button"
                onClick={() => !isPending && setActiveModalRequest(null)}
                disabled={isPending}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4 text-xs md:text-sm">
              <p className="text-brand-dim leading-relaxed">
                المبلغ المطلوب الأصلي هو{" "}
                <span className="text-brand-accent font-bold font-inter text-base">
                  {activeModalRequest.amount_requested.toLocaleString("en-US")}
                </span>{" "}
                ج.م. يمكنك تعديل المبلغ المعتمد أدناه إذا كنت تريد الموافقة الجزئية.
              </p>

              {/* Remaining Limit Info for Single Wallet Requests */}
              {!activeModalRequest.is_multi_wallet && (() => {
                const remainingLimit = activeModalRequest.wallet_remaining_limit ?? 200000;
                const isExceeding = activeModalRequest.amount_requested > remainingLimit;
                return (
                  <div className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs ${
                    isExceeding
                      ? "bg-red-500/10 border-red-500/25 text-red-400"
                      : "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                  }`}>
                    <Wallet size={14} className="mt-0.5 shrink-0 text-brand-accent" />
                    <div className="space-y-1 w-full text-right font-cairo">
                      <div className="flex items-center justify-between pb-1 mb-1 border-b border-white/5">
                        <span className="text-brand-dim text-xs font-semibold">محفظة الاستلام:</span>
                        <div className="flex items-center gap-2 group/modalwallet">
                          <span
                            onClick={(e) => handleCopyWalletNumber(e, activeModalRequest.wallet?.phone_number || "", activeModalRequest.agent?.full_name)}
                            className="font-mono font-bold text-white text-xs cursor-pointer hover:text-brand-accent transition-colors hover:underline"
                            title="اضغط لنسخ الرقم"
                          >
                            {activeModalRequest.wallet?.phone_number || "محفظة غير معروفة"}
                          </span>
                          {activeModalRequest.wallet?.phone_number && (
                            <button
                              type="button"
                              onClick={(e) => handleCopyWalletNumber(e, activeModalRequest.wallet?.phone_number || "", activeModalRequest.agent?.full_name)}
                              className={`p-1 rounded-md border transition-all cursor-pointer ${
                                copiedPhone === activeModalRequest.wallet.phone_number
                                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                                  : "bg-white/5 hover:bg-white/10 border-white/10 text-white/40 hover:text-white"
                              }`}
                              title="نسخ الرقم"
                            >
                              {copiedPhone === activeModalRequest.wallet.phone_number ? (
                                <Check size={11} className="stroke-[2.5]" />
                              ) : (
                                <Copy size={11} />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="font-bold font-cairo">
                        الحد المتبقي للمحفظة هذا الشهر:
                        <span className="font-inter mr-1.5">{remainingLimit.toLocaleString("en-US")} ج.م</span>
                      </p>
                      {isExceeding && (
                        <p className="font-cairo">المبلغ المطلوب يتجاوز الحد المتبقي. تم تعديل المبلغ المعتمد تلقائياً.</p>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Multi-Wallet Breakdown Inputs */}
              {activeModalRequest.is_multi_wallet && Array.isArray(activeModalRequest.multi_wallet_data) && (
                <div className="space-y-3 p-4 bg-[#070814]/40 border border-brand-border/45 rounded-xl">
                  <p className="text-xs font-bold text-white mb-1 font-cairo">المبلغ المعتمد لكل رقم:</p>
                  <div className="space-y-3.5 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                    {activeModalRequest.multi_wallet_data.map((item: any, idx: number) => (
                      <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-[#070814]/60 p-3 rounded-lg border border-brand-border/20">
                        <div className="text-right space-y-0.5 font-cairo">
                          <div className="flex items-center gap-2 group/modalcopy">
                            <span
                              onClick={(e) => handleCopyWalletNumber(e, item.phone_number, activeModalRequest.agent?.full_name)}
                              className="font-mono text-white font-bold text-xs cursor-pointer hover:text-brand-accent transition-colors hover:underline"
                              title="اضغط لنسخ الرقم"
                            >
                              {item.phone_number}
                            </span>
                            {item.phone_number && (
                              <button
                                type="button"
                                onClick={(e) => handleCopyWalletNumber(e, item.phone_number, activeModalRequest.agent?.full_name)}
                                className={`p-1 rounded-md border transition-all cursor-pointer ${
                                  copiedPhone === item.phone_number
                                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                                    : "bg-white/5 hover:bg-white/10 border-white/10 text-white/40 hover:text-white group-hover/modalcopy:border-brand-accent/40 group-hover/modalcopy:text-brand-accent"
                                }`}
                                title="نسخ الرقم"
                              >
                                {copiedPhone === item.phone_number ? (
                                  <Check size={10} className="stroke-[2.5]" />
                                ) : (
                                  <Copy size={10} />
                                )}
                              </button>
                            )}
                          </div>
                          {item.esim_number && (
                            <div className="text-[10px] text-brand-dim">الشريحة: {item.esim_number}</div>
                          )}
                          <div className="text-[10px] text-brand-accent">المطلوب: {Number(item.amount_requested || item.amount).toLocaleString("en-US")} ج.م</div>
                        </div>
                        <div className="relative w-full sm:w-36">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            disabled={isPending}
                            value={multiApprovedAmounts[item.wallet_id] ?? ""}
                            onChange={(e) => {
                              const newAmounts = { ...multiApprovedAmounts };
                              newAmounts[item.wallet_id] = e.target.value;
                              setMultiApprovedAmounts(newAmounts);

                              // Update total amount display
                              let total = 0;
                              activeModalRequest.multi_wallet_data.forEach((w: any) => {
                                const val = parseFloat(w.wallet_id === item.wallet_id ? e.target.value : (newAmounts[w.wallet_id] || "0"));
                                if (!isNaN(val)) total += val;
                              });
                              setApprovedAmount(String(total));
                            }}
                            className="w-full bg-[#05060f] border border-brand-border/80 rounded-lg pl-3 pr-8 py-2 text-xs text-white focus:outline-none focus:border-brand-accent text-left dir-ltr font-inter"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 font-bold text-[10px] font-inter">
                            $
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Approved Amount Display / Input */}
              {activeModalRequest.is_multi_wallet ? (
                <div className="space-y-2 text-right">
                  <label className="block text-[13px] font-medium text-brand-dim font-cairo">
                    إجمالي المبلغ المعتمد (ج.م)
                  </label>
                  <div className="w-full bg-[#070814]/80 border border-brand-border/80 rounded-xl px-4 py-3.5 text-sm text-brand-accent font-bold font-inter text-left dir-ltr">
                    {parseFloat(approvedAmount || "0").toLocaleString("en-US")} ج.م
                  </div>
                  <p className="text-[10px] text-amber-400 font-semibold font-cairo">
                    * يرجى إدخال المبلغ المعتمد لكل محفظة بشكل منفصل. القيمة غير المدخلة سيتم اعتبارها صفر.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-[13px] font-medium text-brand-dim font-cairo">
                    المبلغ المعتمد (ج.م)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={activeModalRequest.wallet_remaining_limit ?? 200000}
                      disabled={isPending}
                      value={approvedAmount}
                      onChange={(e) => setApprovedAmount(e.target.value)}
                      className="w-full bg-[#070814]/80 border border-brand-border/80 rounded-xl pl-4 pr-11 py-3 text-sm text-white focus:outline-none focus:border-brand-accent transition-all text-left dir-ltr font-inter"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 font-bold text-xs">
                      $
                    </span>
                  </div>
                  <p className="text-[10px] text-brand-dim/60 font-cairo">
                    * الحد الأقصى المسموح به: <span className="font-inter font-bold">{(activeModalRequest.wallet_remaining_limit ?? 200000).toLocaleString("en-US")} ج.م</span>
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center gap-3 pt-4 border-t border-brand-border/20">
              <button
                type="button"
                onClick={handleConfirmApproval}
                disabled={isPending}
                className="flex-1 flex items-center justify-center gap-1.5 px-4.5 py-3 bg-brand-accent hover:bg-brand-accent/90 disabled:bg-brand-accent/50 text-white font-bold rounded-xl transition-all cursor-pointer text-xs active:scale-[0.98] disabled:scale-100 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(139,92,246,0.3)]"
              >
                {isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>جاري الاعتماد...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    <span>تأكيد واعتماد</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => !isPending && setActiveModalRequest(null)}
                disabled={isPending}
                className="px-6 py-3 bg-[#070814]/40 hover:bg-white/5 border border-brand-border/40 text-brand-dim hover:text-white rounded-xl transition-colors cursor-pointer text-xs"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation rejection modal dialog */}
      {activeRejectRequest && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#05060f]/80 backdrop-blur-sm p-4 animate-fade-in text-right">
          <div className="w-full max-w-md bg-brand-card border border-brand-border rounded-[24px] shadow-2xl p-6 md:p-8 space-y-6 relative animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-brand-border/20 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <AlertTriangle size={20} className="text-red-400" />
                <span>تأكيد رفض طلب شحن الرصيد</span>
              </h3>
              <button
                type="button"
                onClick={() => !isPending && setActiveRejectRequest(null)}
                disabled={isPending}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4 text-xs md:text-sm">
              <p className="text-brand-dim leading-relaxed">
                هل أنت متأكد من رغبتك في رفض طلب شحن الرصيد المقدم من الموظف{" "}
                <span className="text-white font-bold font-cairo">
                  {activeRejectRequest.agent?.full_name || "الموظف"}
                </span>{" "}
                بمبلغ{" "}
                <span className="text-brand-accent font-bold font-inter text-base">
                  {activeRejectRequest.amount_requested.toLocaleString("en-US")}
                </span>{" "}
                ج.م؟
              </p>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center gap-3 pt-4 border-t border-brand-border/20">
              <button
                type="button"
                onClick={handleConfirmRejection}
                disabled={isPending}
                className="flex-1 flex items-center justify-center gap-1.5 px-4.5 py-3 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/25 hover:text-white font-bold rounded-xl transition-all cursor-pointer text-xs active:scale-[0.98] disabled:scale-100 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(239,68,68,0.15)]"
              >
                {isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>جاري الرفض...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    <span>تأكيد ورفض</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => !isPending && setActiveRejectRequest(null)}
                disabled={isPending}
                className="px-6 py-3 bg-[#070814]/40 hover:bg-white/5 border border-brand-border/40 text-brand-dim hover:text-white rounded-xl transition-colors cursor-pointer text-xs"
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
