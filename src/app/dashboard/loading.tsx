import React from "react";

export default function DashboardLoading() {
  return (
    <div className="fixed inset-0 bg-[#05060f]/90 backdrop-blur-md z-[9999] flex flex-col items-center justify-center font-cairo select-none transition-all duration-300">
      <div className="flex flex-col items-center gap-6 text-center">
        {/* Futuristic Premium Glowing Loader */}
        <div className="relative w-24 h-24 flex items-center justify-center">
          {/* Inner ring */}
          <div className="absolute inset-0 rounded-full border-2 border-brand-accent/10 border-t-brand-accent border-r-brand-accent/50 animate-spin" style={{ animationDuration: "1s" }} />
          
          {/* Outer ring - rotating reverse */}
          <div className="absolute -inset-3 rounded-full border border-white/5 border-b-brand-glow border-l-brand-glow/30 animate-spin" style={{ animationDuration: "2s", animationDirection: "reverse" }} />
          
          {/* Logo center mark */}
          <div className="w-12 h-12 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center shadow-[0_0_30px_rgba(139,92,246,0.25)] animate-pulse">
            <span className="text-white text-xs font-bold font-inter select-none">SP</span>
          </div>
        </div>

        {/* Text descriptions */}
        <div className="space-y-2 mt-2">
          <h2 className="text-lg font-bold text-white tracking-wide flex items-center justify-center gap-2">
            <span>جاري تحميل لوحة التحكم</span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-accent"></span>
            </span>
          </h2>
          <p className="text-xs text-brand-dim animate-pulse select-none">
            يتم الآن استرجاع ومزامنة أحدث البيانات من قاعدة البيانات...
          </p>
        </div>
      </div>
    </div>
  );
}
