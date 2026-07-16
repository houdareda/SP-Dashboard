"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  FileEdit,
  Calendar,
  User,
  Check,
  X,
  ChevronDown,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Megaphone,
  Coins,
  Wallet,
} from "lucide-react";
import {
  EditExpenseRequestData,
  AdminAgentOption,
  reviewEditRequest,
  getSingleEditRequest,
} from "@/app/actions/adminOperations";

interface EditRequestsClientProps {
  initialRequests: EditExpenseRequestData[];
  initialAgents: AdminAgentOption[];
}

export default function EditRequestsClient({
  initialRequests,
  initialAgents,
}: EditRequestsClientProps) {
  const router = useRouter();
  const [requests, setRequests] = useState<EditExpenseRequestData[]>(initialRequests);
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
  const agentDropdownRef = React.useRef<HTMLDivElement>(null);
  const sortDropdownRef = React.useRef<HTMLDivElement>(null);
  const [isAgentDropdownOpen, setIsAgentDropdownOpen] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

  // Modal States
  const [rejectTarget, setRejectTarget] = useState<EditExpenseRequestData | null>(null);

  // Submitting loading state
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  // Collapsible cards state
  const [expandedRequests, setExpandedRequests] = useState<Record<string, boolean>>({});

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

  // Synchronize server-side props changes with local state
  useEffect(() => {
    setRequests(initialRequests);
  }, [initialRequests]);

  // 1. Supabase Real-time Subscription Channel
  useEffect(() => {
    const channel = supabase
      .channel("edit_expense_requests_realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "edit_expense_requests",
        },
        async (payload) => {
          console.log("Supabase Realtime event received for edits:", payload);
          
          if (payload.eventType === "INSERT") {
            const res = await getSingleEditRequest(payload.new.id);
            if (res.success && res.request) {
              setRequests((prev) => {
                // Prevent duplicate inserts
                if (prev.some((r) => r.id === res.request!.id)) return prev;
                return [res.request!, ...prev];
              });
              showToast(`تم تقديم طلب تعديل مصاريف جديد من ${res.request.agent?.full_name || "موظف"}.`, "success");
            }
          } else if (payload.eventType === "UPDATE") {
            if (payload.new.status !== "pending") {
              // If status is no longer pending (approved/rejected), remove it from the list
              setRequests((prev) => prev.filter((r) => r.id !== payload.new.id));
            } else {
              // Otherwise, update details in place
              const res = await getSingleEditRequest(payload.new.id);
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

  // 2. Action Handlers
  const handleDirectApproval = (req: EditExpenseRequestData) => {
    setSubmittingId(req.id);
    startTransition(async () => {
      const res = await reviewEditRequest(
        req.id,
        req.expense_id,
        "approved",
        req.requested_changes
      );

      if (res.success) {
        showToast("تمت الموافقة على طلب التعديل وتحديث التقرير الأصلي بنجاح.", "success");
        // Optimistically remove from active local state
        setRequests((prev) => prev.filter((r) => r.id !== req.id));
        router.refresh();
      } else {
        showToast(res.error || "فشل اعتماد طلب التعديل.", "error");
      }
      setSubmittingId(null);
    });
  };

  const handleConfirmRejection = () => {
    if (!rejectTarget) return;

    startTransition(async () => {
      const res = await reviewEditRequest(
        rejectTarget.id,
        rejectTarget.expense_id,
        "rejected"
      );

      if (res.success) {
        showToast("تم رفض طلب التعديل بنجاح.", "success");
        setRejectTarget(null);
        // Optimistically remove from active local state
        setRequests((prev) => prev.filter((r) => r.id !== rejectTarget.id));
        router.refresh();
      } else {
        showToast(res.error || "فشل رفض طلب التعديل.", "error");
      }
    });
  };

  // 3. Filtering & Sorting Logic
  const filteredRequests = React.useMemo(() => {
    return requests
      .filter((req) => {
        // Filter by agent name (Multi-select)
        if (selectedAgentIds.length > 0 && !selectedAgentIds.includes(req.agent_id)) {
          return false;
        }

        // Filter by date bounds
        const reqDateStr = req.expense?.expense_date || ""; // YYYY-MM-DD
        if (startDate && reqDateStr < startDate) {
          return false;
        }
        if (endDate && reqDateStr > endDate) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Apply sort order based on request creation timestamp
        if (sortOrder === "newest") {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        } else {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
      });
  }, [requests, selectedAgentIds, startDate, endDate, sortOrder]);

  // Helper: check if custody transfers list has any change
  const getCustodyTransfersChanges = (req: EditExpenseRequestData) => {
    const original = req.original_transfers || [];
    const proposed = req.requested_changes.transfers || [];
    const changes: { type: "add" | "delete" | "modify"; name: string; oldAmount?: number; newAmount?: number }[] = [];

    // Map names for original colleagues
    const originalColleagues: Record<string, { name: string; amount: number }> = {};
    original.forEach((t) => {
      originalColleagues[t.to_agent_id] = {
        name: t.to_agent?.full_name || "زميل",
        amount: t.amount,
      };
    });

    // Map names for proposed colleagues (we will fetch from original list or fallback since we don't have all names,
    // wait, we can get names if agents option lists them!)
    const agentNamesLookup: Record<string, string> = {};
    agents.forEach((a) => {
      agentNamesLookup[a.id] = a.full_name;
    });

    // Trace proposed changes
    proposed.forEach((p) => {
      const orig = originalColleagues[p.to_agent_id];
      const colleagueName = orig ? orig.name : (agentNamesLookup[p.to_agent_id] || "زميل");

      if (!orig) {
        changes.push({
          type: "add",
          name: colleagueName,
          newAmount: p.amount,
        });
      } else {
        if (orig.amount !== p.amount) {
          changes.push({
            type: "modify",
            name: colleagueName,
            oldAmount: orig.amount,
            newAmount: p.amount,
          });
        }
        // Delete handled colleague from checklist
        delete originalColleagues[p.to_agent_id];
      }
    });

    // Rest of original colleagues are deleted
    Object.keys(originalColleagues).forEach((id) => {
      const orig = originalColleagues[id];
      changes.push({
        type: "delete",
        name: orig.name,
        oldAmount: orig.amount,
      });
    });

    return changes;
  };

  return (
    <div className="space-y-8 font-cairo select-none relative text-right w-full" dir="rtl">
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
        <div className="w-12 h-12 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent shrink-0 mt-1">
          <FileEdit size={24} />
        </div>
        <div className="space-y-1.5 text-right">
          <h1 className="text-2xl font-bold text-white">طلبات تعديل المصاريف</h1>
          <p className="text-sm text-brand-dim leading-relaxed">
            مراجعة واعتماد أو رفض طلبات تعديل المصاريف اليومية والتحويلات المقدمة من الموظفين.
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
                className={`w-full h-[46px] px-4 rounded-xl bg-[#070912] border transition-all cursor-pointer flex items-center justify-between select-none ${
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
            <label className="block text-[13px] font-medium text-brand-dim">تاريخ التقرير</label>
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
                className={`w-full h-[46px] px-4 rounded-xl bg-[#070912] border transition-all cursor-pointer flex items-center justify-between select-none ${
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
      <div className="flex items-center justify-between select-none">
        <span className="text-xs text-brand-dim font-semibold">
          عدد الطلبات المعروضة: <span className="text-brand-accent font-bold text-sm font-inter">{filteredRequests.length}</span>
        </span>
      </div>

      {/* Request Cards Area */}
      {filteredRequests.length > 0 ? (
        <div className="space-y-6">
          {filteredRequests.map((req) => {
            const changesList = getCustodyTransfersChanges(req);
            const isExpanded = !!expandedRequests[req.id];
            
            return (
              <div
                key={req.id}
                className="backdrop-blur-xl bg-brand-card/95 border border-brand-border/55 p-6 md:p-8 rounded-[24px] shadow-xl relative hover:border-brand-border transition-all w-full max-w-4xl mr-0 ml-auto"
              >
                {/* Card Header Section */}
                <div
                  onClick={() => toggleExpand(req.id)}
                  className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 select-none cursor-pointer hover:opacity-90 transition-all ${
                    isExpanded ? "border-b border-brand-border/20 pb-4" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent shrink-0 select-none">
                      <User size={18} />
                    </div>
                    <div className="text-right space-y-0.5">
                      <h4 className="text-base font-bold text-white capitalize">{req.agent?.full_name || "موظف"}</h4>
                      <span className="inline-block text-[10px] bg-brand-accent/10 text-brand-accent font-bold px-2 py-0.5 rounded border border-brand-accent/15">
                        تعديل المصاريف والتحويلات اليومية
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-amber-400 bg-amber-400/10 border border-amber-400/25 rounded-full select-none">
                      <Clock size={12} />
                      <span>قيد الانتظار</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs text-brand-dim font-semibold bg-white/5 px-3.5 py-1.5 rounded-xl border border-white/5">
                      <Calendar size={13} className="text-brand-accent" />
                      <span>تاريخ التقرير: <span className="font-inter font-bold text-white/90">{req.expense?.expense_date}</span></span>
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-brand-dim/60 hover:text-white transition-colors">
                      <ChevronDown
                        size={16}
                        className={`transition-transform duration-300 ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Collapsible Content */}
                <div
                  className={`transition-all duration-350 ease-in-out overflow-hidden ${
                    isExpanded
                      ? "max-h-[2000px] opacity-100 mt-6 space-y-6"
                      : "max-h-0 opacity-0 pointer-events-none"
                  }`}
                >

                {/* Grid Comparison Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                  
                  {/* Column 1 (Right): Current Base Report Details */}
                  <div className="bg-[#070814]/30 border border-brand-border/40 p-5 rounded-2xl space-y-4">
                    <h5 className="text-[13px] font-bold text-brand-dim border-b border-brand-border/20 pb-2 select-none">
                      | البيانات الحالية (التقرير الأصلي)
                    </h5>
                    <div className="space-y-3.5 text-xs md:text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-brand-dim select-none">المصاريف الشخصية</span>
                        <span className="font-semibold text-white font-inter">{(req.expense?.personal_expense || 0).toLocaleString("en-US")} ج.م</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-brand-dim select-none">مصاريف ماركتنج 1</span>
                        <span className="font-semibold text-white font-inter">{(req.expense?.marketing_1 || 0).toLocaleString("en-US")} ج.م</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-brand-dim select-none">مصاريف ماركتنج 2</span>
                        <span className="font-semibold text-white font-inter">{(req.expense?.marketing_2 || 0).toLocaleString("en-US")} ج.م</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-brand-dim select-none">مصاريف ماركتنج 3</span>
                        <span className="font-semibold text-white font-inter">{(req.expense?.marketing_3 || 0).toLocaleString("en-US")} ج.م</span>
                      </div>
                      <div className="flex justify-between items-center border-t border-brand-border/20 pt-2.5 font-bold">
                        <span className="text-white select-none">إجمالي مصروفات المحفظة</span>
                        <span className="text-brand-accent text-sm font-inter">{(req.expense?.total_amount || 0).toLocaleString("en-US")} ج.م</span>
                      </div>
                      <div className="flex justify-between items-center border-t border-brand-border/10 pt-2 font-semibold">
                        <span className="text-brand-dim select-none">توتال الكاش</span>
                        <span className="text-white font-inter">{(req.expense?.total_cash || 0).toLocaleString("en-US")} ج.م</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-brand-dim select-none">الكاش بعد خصم الشخصي والتحويلات</span>
                        <span className="text-white font-inter">{(req.expense?.cash_after_expenses || 0).toLocaleString("en-US")} ج.م</span>
                      </div>
                    </div>
                  </div>

                  {/* Column 2 (Left): Proposed Modifications Details */}
                  <div className="bg-[#070814]/30 border border-brand-border/40 p-5 rounded-2xl space-y-4">
                    <h5 className="text-[13px] font-bold text-brand-dim border-b border-brand-border/20 pb-2 select-none">
                      | البيانات المقترحة (طلب التعديل)
                    </h5>
                    <div className="space-y-3.5 text-xs md:text-sm">
                      
                      {/* Personal Expense Check */}
                      <div className="flex justify-between items-center">
                        <span className="text-brand-dim select-none">المصاريف الشخصية</span>
                        {req.requested_changes.personal_expense === req.expense?.personal_expense ? (
                          <span className="text-brand-dim/50 text-[11px] font-medium select-none">لا يوجد تغيير</span>
                                                ) : (
                          <span className="font-bold font-inter flex items-center gap-1.5">
                            <span className="text-brand-accent">{(req.requested_changes.personal_expense || 0).toLocaleString("en-US")} ج.م</span>
                            <span className="text-brand-dim/50 text-xs">←</span>
                            <span className="text-red-400 line-through text-xs font-normal">{(req.expense?.personal_expense || 0).toLocaleString("en-US")} ج.م</span>
                          </span>
                        )}
                      </div>

                      {/* Marketing 1 Check */}
                      <div className="flex justify-between items-center">
                        <span className="text-brand-dim select-none">مصاريف ماركتنج 1</span>
                        {req.requested_changes.marketing_1 === req.expense?.marketing_1 ? (
                          <span className="text-brand-dim/50 text-[11px] font-medium select-none">لا يوجد تغيير</span>
                        ) : (
                          <span className="font-bold font-inter flex items-center gap-1.5">
                            <span className="text-brand-accent">{(req.requested_changes.marketing_1 || 0).toLocaleString("en-US")} ج.م</span>
                            <span className="text-brand-dim/50 text-xs">←</span>
                            <span className="text-red-400 line-through text-xs font-normal">{(req.expense?.marketing_1 || 0).toLocaleString("en-US")} ج.م</span>
                          </span>
                        )}
                      </div>

                      {/* Marketing 2 Check */}
                      <div className="flex justify-between items-center">
                        <span className="text-brand-dim select-none">مصاريف ماركتنج 2</span>
                        {req.requested_changes.marketing_2 === req.expense?.marketing_2 ? (
                          <span className="text-brand-dim/50 text-[11px] font-medium select-none">لا يوجد تغيير</span>
                        ) : (
                          <span className="font-bold font-inter flex items-center gap-1.5">
                            <span className="text-brand-accent">{(req.requested_changes.marketing_2 || 0).toLocaleString("en-US")} ج.م</span>
                            <span className="text-brand-dim/50 text-xs">←</span>
                            <span className="text-red-400 line-through text-xs font-normal">{(req.expense?.marketing_2 || 0).toLocaleString("en-US")} ج.م</span>
                          </span>
                        )}
                      </div>

                      {/* Marketing 3 Check */}
                      <div className="flex justify-between items-center">
                        <span className="text-brand-dim select-none">مصاريف ماركتنج 3</span>
                        {req.requested_changes.marketing_3 === req.expense?.marketing_3 ? (
                          <span className="text-brand-dim/50 text-[11px] font-medium select-none">لا يوجد تغيير</span>
                        ) : (
                          <span className="font-bold font-inter flex items-center gap-1.5">
                            <span className="text-brand-accent">{(req.requested_changes.marketing_3 || 0).toLocaleString("en-US")} ج.م</span>
                            <span className="text-brand-dim/50 text-xs">←</span>
                            <span className="text-red-400 line-through text-xs font-normal">{(req.expense?.marketing_3 || 0).toLocaleString("en-US")} ج.م</span>
                          </span>
                        )}
                      </div>

                      {/* Total Amount Check */}
                      <div className="flex justify-between items-center border-t border-brand-border/20 pt-2.5 font-bold">
                        <span className="text-white select-none">إجمالي مصروفات المحفظة</span>
                        {req.requested_changes.total_amount === req.expense?.total_amount ? (
                          <span className="text-brand-accent text-sm font-inter">{(req.expense?.total_amount || 0).toLocaleString("en-US")} ج.م</span>
                        ) : (
                          <span className="font-bold text-sm font-inter flex items-center gap-1.5">
                            <span className="text-brand-accent">{(req.requested_changes.total_amount || 0).toLocaleString("en-US")} ج.م</span>
                            <span className="text-brand-dim/50 text-xs">←</span>
                            <span className="text-red-400 line-through text-xs font-normal">{(req.expense?.total_amount || 0).toLocaleString("en-US")} ج.م</span>
                          </span>
                        )}
                      </div>

                      {/* Total Cash Check */}
                      <div className="flex justify-between items-center border-t border-brand-border/10 pt-2">
                        <span className="text-brand-dim select-none">توتال الكاش المقترح</span>
                        {req.requested_changes.total_cash === req.expense?.total_cash || req.requested_changes.total_cash === undefined ? (
                          <span className="text-brand-dim/50 text-[11px] font-medium select-none">لا يوجد تغيير</span>
                        ) : (
                          <span className="font-bold font-inter flex items-center gap-1.5">
                            <span className="text-brand-accent">{(req.requested_changes.total_cash || 0).toLocaleString("en-US")} ج.م</span>
                            <span className="text-brand-dim/50 text-xs">←</span>
                            <span className="text-red-400 line-through text-xs font-normal">{(req.expense?.total_cash || 0).toLocaleString("en-US")} ج.م</span>
                          </span>
                        )}
                      </div>

                      {/* Cash After Expenses Check */}
                      <div className="flex justify-between items-center">
                        <span className="text-brand-dim select-none">الكاش بعد خصم الشخصي والتحويلات</span>
                        {req.requested_changes.cash_after_expenses === req.expense?.cash_after_expenses || req.requested_changes.cash_after_expenses === undefined ? (
                          <span className="text-brand-dim/50 text-[11px] font-medium select-none">لا يوجد تغيير</span>
                        ) : (
                          <span className="font-bold font-inter flex items-center gap-1.5">
                            <span className="text-brand-accent">{(req.requested_changes.cash_after_expenses || 0).toLocaleString("en-US")} ج.م</span>
                            <span className="text-brand-dim/50 text-xs">←</span>
                            <span className="text-red-400 line-through text-xs font-normal">{(req.expense?.cash_after_expenses || 0).toLocaleString("en-US")} ج.م</span>
                          </span>
                        )}
                      </div>

                    </div>
                  </div>

                </div>

                {/* Wallets Snapshot Comparison Block */}
                <div className="bg-[#070814]/30 border border-brand-border/40 p-5 rounded-2xl space-y-3">
                  <h5 className="text-[13px] font-bold text-brand-dim border-b border-brand-border/20 pb-2 select-none">
                    | مقارنة أرصدة كاش المحافظ والكامبين
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(() => {
                      const originalWallets = req.expense?.wallets_balances || [];
                      const proposedWallets = req.requested_changes.wallets_balances || [];

                      const origMap: Record<string, any> = {};
                      originalWallets.forEach((w: any) => { origMap[w.wallet_id] = w; });

                      const propMap: Record<string, any> = {};
                      proposedWallets.forEach((w: any) => { propMap[w.wallet_id] = w; });

                      const allWalletIds = Array.from(new Set([
                        ...originalWallets.map((w: any) => w.wallet_id),
                        ...proposedWallets.map((w: any) => w.wallet_id)
                      ]));

                      if (allWalletIds.length === 0) {
                        return <div className="col-span-2 text-center text-xs text-brand-dim/50 select-none py-2">لا توجد بيانات مسجلة للمحافظ لهذا اليوم.</div>;
                      }

                      return allWalletIds.map((wId) => {
                        const origW = origMap[wId];
                        const propW = propMap[wId];
                        const label = wId === "campaign" ? "كامبين 📢" : (origW?.phone_number || propW?.phone_number || "محفظة");

                        const origBal = origW ? Number(origW.balance) : 0;
                        const propBal = propW ? Number(propW.balance) : 0;
                        const isChanged = origBal !== propBal;

                        return (
                          <div key={wId} className="flex justify-between items-center bg-[#070814]/50 border border-brand-border/40 px-4 py-3 rounded-xl gap-2 text-xs">
                            <span className="font-bold text-white font-mono select-all text-right">{label}</span>
                            {isChanged ? (
                              <span className="font-bold font-inter flex items-center gap-1.5">
                                <span className="text-brand-accent">{propBal.toLocaleString("en-US")} ج.م</span>
                                <span className="text-brand-dim/50 text-xs">←</span>
                                <span className="text-red-400 line-through text-xs font-normal">{origBal.toLocaleString("en-US")} ج.م</span>
                              </span>
                            ) : (
                              <span className="text-white/60 font-inter">{origBal.toLocaleString("en-US")} ج.م</span>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Custody Transfers Comparison Block */}
                <div className="bg-[#070814]/30 border border-brand-border/40 p-5 rounded-2xl space-y-3">
                  <h5 className="text-[13px] font-bold text-brand-dim border-b border-brand-border/20 pb-2 select-none">
                    | تعديلات تحويلات العهدة للزملاء
                  </h5>
                  {changesList.length > 0 ? (
                    <div className="space-y-2.5">
                      {changesList.map((ch, idx) => (
                        <div
                          key={idx}
                          className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#070814] border border-brand-border/60 px-4.5 py-3 rounded-xl gap-2 font-semibold"
                        >
                          <span className="text-xs text-white">
                            {ch.type === "add" && `• إضافة تحويل جديد لـ ${ch.name}`}
                            {ch.type === "delete" && `• إلغاء تحويل العهدة الخاص بـ ${ch.name}`}
                            {ch.type === "modify" && `• تعديل مبلغ تحويل ${ch.name}`}
                          </span>
                          <span className="text-xs font-inter font-bold">
                            {ch.type === "add" && (
                              <span className="text-emerald-400">+{(ch.newAmount || 0).toLocaleString("en-US")} ج.م</span>
                            )}
                            {ch.type === "delete" && (
                              <span className="text-red-400">-{(ch.oldAmount || 0).toLocaleString("en-US")} ج.م</span>
                            )}
                            {ch.type === "modify" && (
                              <span className="font-bold flex items-center gap-1.5">
                                <span className="text-amber-400">{(ch.newAmount || 0).toLocaleString("en-US")} ج.م</span>
                                <span className="text-brand-dim/50 text-xs">←</span>
                                <span className="text-red-400 line-through text-xs font-normal">{(ch.oldAmount || 0).toLocaleString("en-US")} ج.م</span>
                              </span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-xs text-brand-dim/50 select-none">
                      لا توجد تعديلات في تحويلات العهدة الخاصة بهذا التقرير.
                    </div>
                  )}
                </div>

                {/* Decision Action Buttons */}
                <div className="flex items-center gap-3 justify-end border-t border-brand-border/20 pt-5">
                  <button
                    type="button"
                    onClick={() => setRejectTarget(req)}
                    disabled={isPending}
                    className="flex items-center gap-1.5 px-6 py-3 bg-[#070814]/40 hover:bg-red-500/5 border border-red-500/20 text-red-400 hover:text-white rounded-xl transition-all cursor-pointer text-xs font-bold active:scale-[0.98]"
                  >
                    <X size={14} />
                    <span>رفض الطلب</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDirectApproval(req)}
                    disabled={isPending || !!submittingId}
                    className="flex items-center gap-1.5 px-6 py-3 bg-brand-accent hover:bg-brand-accent/90 text-white font-bold rounded-xl transition-all cursor-pointer text-xs hover:shadow-[0_0_15px_rgba(139,92,246,0.25)] active:scale-[0.98] disabled:opacity-50"
                  >
                    {submittingId === req.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Check size={14} />
                    )}
                    <span>موافقة واعتماد التعديل</span>
                  </button>
                </div>

              </div>
            </div>
            );
          })}
        </div>
      ) : (
        <div className="border border-dashed border-brand-border/20 rounded-[24px] bg-[#070814]/10 py-20 text-center select-none">
          <div className="flex flex-col items-center justify-center space-y-4 max-w-sm mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.01] border border-brand-border/30 text-brand-dim/40 flex items-center justify-center shadow-inner">
              <Clock size={28} />
            </div>
            <div className="space-y-1.5">
              <h4 className="text-base font-bold text-white">لا توجد طلبات تعديل</h4>
              <p className="text-xs text-brand-dim/70 leading-relaxed">
                لا تتوفر حالياً طلبات تعديل مصاريف معلقة للمراجعة والاعتماد.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* (Confirmation approval modal removed to enable direct approval) */}

      {/* Confirmation rejection modal dialog */}
      {rejectTarget && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#05060f]/80 backdrop-blur-sm p-4 select-none animate-fade-in text-right">
          <div className="w-full max-w-md bg-brand-card border border-brand-border rounded-[24px] shadow-2xl p-6 md:p-8 space-y-6 relative animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-brand-border/20 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <AlertTriangle size={20} className="text-red-400" />
                <span>تأكيد رفض طلب التعديل</span>
              </h3>
              <button
                type="button"
                onClick={() => !isPending && setRejectTarget(null)}
                disabled={isPending}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4 text-xs md:text-sm">
              <p className="text-brand-dim leading-relaxed">
                هل أنت متأكد من رغبتك في رفض طلب تعديل المصاريف المقدم من الموظف{" "}
                <span className="text-white font-bold">
                  {rejectTarget.agent?.full_name || "الموظف"}
                </span>{" "}
                بتاريخ{" "}
                <span className="text-white font-bold font-inter">
                  {rejectTarget.expense?.expense_date}
                </span>؟
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
                onClick={() => !isPending && setRejectTarget(null)}
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
