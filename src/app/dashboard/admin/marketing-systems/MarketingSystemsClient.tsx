"use client";

import React, { useState, useTransition } from "react";
import {
  Layers,
  Plus,
  Edit2,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Hash,
  Calendar,
  Sparkles,
  X,
  Loader2,
  ArrowUpDown,
} from "lucide-react";
import {
  MarketingSystem,
  createMarketingSystem,
  updateMarketingSystem,
} from "@/app/actions/marketingSystems";
import { useRouter } from "next/navigation";

interface MarketingSystemsClientProps {
  initialSystems: MarketingSystem[];
}

export default function MarketingSystemsClient({
  initialSystems,
}: MarketingSystemsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [systems, setSystems] = useState<MarketingSystem[]>(initialSystems);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedSystem, setSelectedSystem] = useState<MarketingSystem | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formOrder, setFormOrder] = useState("");

  // Toast notification
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: "success" | "error";
  }>({
    show: false,
    message: "",
    type: "success",
  });

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 4000);
  };

  const handleOpenAdd = () => {
    setFormName("");
    const nextOrder = systems.length > 0
      ? Math.max(...systems.map((s) => s.order_index || 0)) + 1
      : 1;
    setFormOrder(String(nextOrder));
    setIsAddOpen(true);
  };

  const handleOpenEdit = (sys: MarketingSystem) => {
    setSelectedSystem(sys);
    setFormName(sys.name);
    setFormOrder(String(sys.order_index));
    setIsEditOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast("يرجى إدخال اسم السيستم.", "error");
      return;
    }

    startTransition(async () => {
      const order = parseInt(formOrder, 10);
      const res = await createMarketingSystem({
        name: formName.trim(),
        orderIndex: isNaN(order) ? undefined : order,
      });

      if (res.success && res.system) {
        setSystems((prev) => [...prev, res.system!].sort((a, b) => a.order_index - b.order_index));
        setIsAddOpen(false);
        showToast("تمت إضافة سيستم التسويق الجديد بنجاح!", "success");
        router.refresh();
      } else {
        showToast(res.error || "حدث خطأ أثناء إضافة السيستم.", "error");
      }
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSystem) return;
    if (!formName.trim()) {
      showToast("يرجى إدخال اسم السيستم.", "error");
      return;
    }

    startTransition(async () => {
      const order = parseInt(formOrder, 10);
      const res = await updateMarketingSystem({
        id: selectedSystem.id,
        name: formName.trim(),
        orderIndex: isNaN(order) ? undefined : order,
      });

      if (res.success && res.system) {
        setSystems((prev) =>
          prev
            .map((s) => (s.id === res.system!.id ? res.system! : s))
            .sort((a, b) => a.order_index - b.order_index)
        );
        setIsEditOpen(false);
        showToast("تم تعديل بيانات السيستم بنجاح!", "success");
        router.refresh();
      } else {
        showToast(res.error || "حدث خطأ أثناء تعديل السيستم.", "error");
      }
    });
  };

  return (
    <div className="space-y-8 font-cairo">
      {/* Toast Alert */}
      {toast.show && (
        <div
          className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl backdrop-blur-xl border transition-all animate-bounce ${
            toast.type === "success"
              ? "bg-emerald-950/90 border-emerald-500/30 text-emerald-300"
              : "bg-red-950/90 border-red-500/30 text-red-300"
          }`}
        >
          {toast.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#0c0e18]/80 to-[#121424]/80 p-6 rounded-2xl border border-brand-border/40 backdrop-blur-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-accent/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="space-y-1.5 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent shadow-[0_0_15px_rgba(139,92,246,0.15)]">
              <Layers size={22} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-white tracking-wide">
                إدارة أنظمة التسويق والمصاريف
              </h1>
              <p className="text-xs text-brand-dim mt-0.5">
                إضافة وتعديل أنظمة ومسميات مصاريف التسويق وشيتات العمل التي تظهر تلقائياً في كامل النظام
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-brand-accent to-brand-accent-dark hover:from-brand-accent-dark hover:to-brand-accent text-white text-xs md:text-sm font-bold rounded-xl shadow-lg shadow-brand-accent/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Plus size={18} />
            <span>إضافة سيستم تسويق جديد</span>
          </button>
        </div>
      </div>

      {/* Security & Integrity Note */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3.5 text-amber-300">
        <ShieldAlert size={20} className="shrink-0 mt-0.5 text-amber-400" />
        <div className="text-xs md:text-sm leading-relaxed">
          <span className="font-bold block mb-0.5 text-amber-200">
            ملاحظة أمان وتكامل البيانات:
          </span>
          لا يمكن حذف أي سيستم تسويق بعد إنشائه لحماية السجلات المالية والتقارير التاريخية السابقة من التلف. ومع ذلك، يمكنك في أي وقت تعديل اسم السيستم أو ترتيب ظهوره وسينعكس التعديل فوراً في جميع أنحاء النظام.
        </div>
      </div>

      {/* Systems Grid / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {systems.map((sys, idx) => (
          <div
            key={sys.id}
            className="group bg-[#0c0e18]/60 hover:bg-[#0c0e18]/90 border border-brand-border/40 hover:border-brand-accent/30 rounded-2xl p-5 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(139,92,246,0.1)] relative overflow-hidden flex flex-col justify-between"
          >
            <div className="space-y-4">
              {/* Card Header: Order & Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold font-inter bg-brand-accent/10 border border-brand-accent/20 text-brand-accent">
                    <Hash size={12} />
                    <span>الترتيب: {sys.order_index}</span>
                  </span>
                  <span className="text-[10px] text-brand-dim/70 font-inter">
                    #{(idx + 1).toString().padStart(2, "0")}
                  </span>
                </div>

                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  نشط
                </span>
              </div>

              {/* Card Body: System Name */}
              <div className="pt-1">
                <h3 className="text-base md:text-lg font-black text-white group-hover:text-brand-accent transition-colors">
                  {sys.name}
                </h3>
                <p className="text-[11px] text-brand-dim/80 mt-1 flex items-center gap-1.5">
                  <Calendar size={12} />
                  <span>تاريخ الإنشاء: {new Date(sys.created_at).toLocaleDateString("ar-EG")}</span>
                </p>
              </div>
            </div>

            {/* Card Footer: Action */}
            <div className="pt-5 mt-4 border-t border-brand-border/20 flex items-center justify-between">
              <span className="text-[11px] text-brand-dim/60 font-mono">
                ID: {sys.id.slice(0, 8)}...
              </span>

              <button
                type="button"
                onClick={() => handleOpenEdit(sys)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-brand-accent/20 text-white/80 hover:text-white border border-brand-border/40 hover:border-brand-accent/40 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer"
              >
                <Edit2 size={13} className="text-brand-accent" />
                <span>تعديل الاسم</span>
              </button>
            </div>
          </div>
        ))}

        {systems.length === 0 && (
          <div className="col-span-full p-12 text-center bg-[#0c0e18]/40 border border-dashed border-brand-border/40 rounded-2xl text-brand-dim space-y-3">
            <Layers size={40} className="mx-auto text-brand-dim/40" />
            <p className="text-sm">لا توجد أنظمة تسويق حالياً.</p>
            <button
              onClick={handleOpenAdd}
              className="text-xs text-brand-accent hover:underline font-bold"
            >
              اضغط هنا لإضافة السيستم الأول
            </button>
          </div>
        )}
      </div>

      {/* MODAL 1: ADD NEW SYSTEM */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
          <div className="bg-[#0e101f] border border-brand-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between p-5 border-b border-brand-border/40 bg-white/[0.02]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent">
                  <Plus size={16} />
                </div>
                <h3 className="font-bold text-white text-base">إضافة سيستم تسويق جديد</h3>
              </div>
              <button
                onClick={() => setIsAddOpen(false)}
                className="text-brand-dim hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-brand-dim">
                  اسم السيستم <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: مصاريف ماركتنج 4، إعلانات تيك توك، إلخ"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-[#070814]/80 border border-brand-border/80 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-glow transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-brand-dim">
                  ترتيب الظهور في القوائم
                </label>
                <input
                  type="number"
                  min="1"
                  value={formOrder}
                  onChange={(e) => setFormOrder(e.target.value)}
                  className="w-full bg-[#070814]/80 border border-brand-border/80 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-glow transition-all font-inter text-left dir-ltr"
                />
                <span className="text-[11px] text-brand-dim/70 block">
                  الرقم الذي يحدد ترتيب عرض الخانة في صفحة العمليات والشيتات.
                </span>
              </div>

              <div className="pt-3 border-t border-brand-border/30 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  disabled={isPending}
                  className="px-4 py-2.5 text-xs text-brand-dim hover:text-white transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-brand-accent to-brand-accent-dark hover:from-brand-accent-dark hover:to-brand-accent text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-accent/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isPending && <Loader2 size={14} className="animate-spin" />}
                  <span>حفظ وإضافة السيستم</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT SYSTEM */}
      {isEditOpen && selectedSystem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
          <div className="bg-[#0e101f] border border-brand-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between p-5 border-b border-brand-border/40 bg-white/[0.02]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent">
                  <Edit2 size={16} />
                </div>
                <h3 className="font-bold text-white text-base">تعديل سيستم التسويق</h3>
              </div>
              <button
                onClick={() => setIsEditOpen(false)}
                className="text-brand-dim hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-brand-dim">
                  اسم السيستم <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-[#070814]/80 border border-brand-border/80 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-glow transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-brand-dim">
                  ترتيب الظهور
                </label>
                <input
                  type="number"
                  min="1"
                  value={formOrder}
                  onChange={(e) => setFormOrder(e.target.value)}
                  className="w-full bg-[#070814]/80 border border-brand-border/80 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-glow transition-all font-inter text-left dir-ltr"
                />
              </div>

              <div className="pt-3 border-t border-brand-border/30 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  disabled={isPending}
                  className="px-4 py-2.5 text-xs text-brand-dim hover:text-white transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-brand-accent to-brand-accent-dark hover:from-brand-accent-dark hover:to-brand-accent text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-accent/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isPending && <Loader2 size={14} className="animate-spin" />}
                  <span>حفظ التعديلات</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
