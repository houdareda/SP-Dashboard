"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  LayoutDashboard,
  Users,
  Wallet,
  Coins,
  FileEdit,
  History,
  Shield,
  LogOut,
  X,
  User,
  ClipboardList,
  Bell,
  Trash2,
  ExternalLink,
  Calculator,
  Palette,
  Sun,
  Moon,
  Check,
} from "lucide-react";

interface NotificationItem {
  id: string;
  is_read: boolean;
  title: string;
  created_at: string;
  message?: string;
}

interface SidebarProps {
  userEmail?: string;
  fullName?: string;
  role?: string;
  onCloseMobile?: () => void;
  isOpenMobile?: boolean;
  notifications?: NotificationItem[];
  unreadCount?: number;
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onClearAll?: () => void;
  sys1Url?: string;
  sys2Url?: string;
  sys3Url?: string;
  sys4Url?: string;
}

export default function Sidebar({
  userEmail,
  fullName,
  role,
  onCloseMobile,
  isOpenMobile,
  notifications = [],
  unreadCount = 0,
  onMarkAsRead = () => {},
  onClearAll = () => {},
  sys1Url,
  sys2Url,
  sys3Url,
  sys4Url,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);
  const notificationsDropdownRef = React.useRef<HTMLDivElement>(null);

  // Theme states
  const [themeMode, setThemeMode] = React.useState<"dark" | "light">("dark");
  const [themeColor, setThemeColor] = React.useState<"purple" | "blue" | "green" | "orange">("purple");
  const [bgShade, setBgShade] = React.useState<"1" | "2" | "3" | "4">("1");
  const [isThemeOpen, setIsThemeOpen] = React.useState(false);
  const themeDropdownRef = React.useRef<HTMLDivElement>(null);

  // Load theme from localStorage on mount
  React.useEffect(() => {
    const savedMode = localStorage.getItem("theme-mode") as "dark" | "light" || "dark";
    const savedColor = localStorage.getItem("theme-color") as "purple" | "blue" | "green" | "orange" || "purple";
    const savedShade = localStorage.getItem("theme-bg-shade") as "1" | "2" | "3" | "4" || "1";

    setThemeMode(savedMode);
    setThemeColor(savedColor);
    setBgShade(savedShade);
  }, []);

  const handleModeChange = (mode: "dark" | "light") => {
    setThemeMode(mode);
    localStorage.setItem("theme-mode", mode);
    document.documentElement.setAttribute("data-mode", mode);
    if (mode === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleColorChange = (color: "purple" | "blue" | "green" | "orange") => {
    setThemeColor(color);
    localStorage.setItem("theme-color", color);
    document.documentElement.setAttribute("data-theme-color", color);
  };

  const handleShadeChange = (shade: "1" | "2" | "3" | "4") => {
    setBgShade(shade);
    localStorage.setItem("theme-bg-shade", shade);
    document.documentElement.setAttribute("data-bg-shade", shade);
  };

  // Click outside for notifications and theme dropdowns
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        notificationsDropdownRef.current &&
        !notificationsDropdownRef.current.contains(event.target as Node)
      ) {
        setIsNotificationsOpen(false);
      }
      if (
        themeDropdownRef.current &&
        !themeDropdownRef.current.contains(event.target as Node)
      ) {
        setIsThemeOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const menuItems = [
    {
      name: "الرئيسية",
      path: "/dashboard",
      icon: LayoutDashboard,
      allowedRoles: ["admin", "agent", "senioragent"],
    },
    {
      name: "الموظفين (Agents)",
      path: "/dashboard/agents",
      icon: Users,
      allowedRoles: ["admin"],
    },
    {
      name: "إدارة المحافظ",
      path: "/dashboard/wallets",
      icon: Wallet,
      allowedRoles: ["agent", "senioragent"],
    },
    {
      name: "العمليات اليومية",
      path: "/dashboard/operations",
      icon: ClipboardList,
      allowedRoles: ["agent", "senioragent"],
    },
    {
      name: "طلبات الأموال",
      path: "/dashboard/admin/fund-requests",
      icon: Coins,
      allowedRoles: ["admin", "accountant"],
    },
    {
      name: "طلبات تعديل المصاريف",
      path: "/dashboard/management/edit-requests",
      icon: FileEdit,
      allowedRoles: ["admin", "senioragent"],
    },
    {
      name: "سجل العمليات العام",
      path: "/dashboard/management/history",
      icon: History,
      allowedRoles: ["admin", "senioragent", "accountant"],
    },
    {
      name: "أرصدة العهد والمحافظ",
      path: "/dashboard/management/agents-custody",
      icon: Wallet,
      allowedRoles: ["admin", "senioragent"],
    },
    {
      name: "سجل العمليات",
      path: "/dashboard/logs",
      icon: History,
      allowedRoles: ["agent", "senioragent"],
    },
  ];

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Error signing out:", err);
    }
  };

  return (
    <aside className={`w-72 bg-[#0c0e18]/95 border-l border-brand-border/40 backdrop-blur-xl min-h-screen flex flex-col fixed right-0 top-0 bottom-0 z-45 select-none font-cairo transition-transform duration-300 transform lg:translate-x-0 ${
      isOpenMobile ? "translate-x-0" : "translate-x-full"
    }`}>
      {/* Sidebar Header (Logo & Notification Bell) */}
      <div className="h-20 flex items-center justify-between px-8 border-b border-brand-border/40 relative">
        <Link href="/dashboard" className="text-2xl font-extrabold tracking-tight font-inter dir-ltr flex items-center gap-1 shrink-0">
          <span className="text-white">Shift</span>
          <span className="text-brand-accent">Point</span>
        </Link>
        
        <div className="flex items-center gap-2">
          {/* Theme Customizer */}
          <div ref={themeDropdownRef}>
            <button
              type="button"
              onClick={() => {
                setIsThemeOpen(!isThemeOpen);
                setIsNotificationsOpen(false);
              }}
              className="w-10 h-10 rounded-xl bg-white/5 border border-brand-border/40 flex items-center justify-center text-white/70 hover:bg-white/10 hover:text-white transition-all cursor-pointer relative"
              aria-label="تخصيص المظهر"
              title="تخصيص المظهر"
            >
              <Palette size={18} />
            </button>

            {isThemeOpen && (
              <div className="absolute left-4 right-4 top-[74px] bg-[#0c0e1b]/98 backdrop-blur-2xl border border-brand-border/60 rounded-2xl shadow-[0_20px_45px_rgba(0,0,0,0.6)] p-5 z-50 text-right animate-scale-in">
                <div className="flex items-center justify-between border-b border-brand-border/30 pb-3 mb-4 select-none">
                  <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                    <Palette size={14} className="text-brand-accent" />
                    <span>تخصيص مظهر الموقع</span>
                  </span>
                </div>

                {/* Mode Selection */}
                <div className="space-y-2 mb-4">
                  <span className="block text-[11px] font-bold text-brand-dim uppercase tracking-wider">الوضع (الداكن / المضيء)</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleModeChange("dark")}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        themeMode === "dark"
                          ? "bg-brand-accent/25 border-brand-accent text-white"
                          : "bg-white/5 border-brand-border/40 text-brand-dim hover:bg-white/10"
                      }`}
                    >
                      <Moon size={13} />
                      <span>داكن</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleModeChange("light")}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        themeMode === "light"
                          ? "bg-brand-accent/20 border-brand-accent text-brand-text"
                          : "bg-white/5 border-brand-border/40 text-brand-dim hover:bg-white/10"
                      }`}
                    >
                      <Sun size={13} />
                      <span>مضيء</span>
                    </button>
                  </div>
                </div>

                {/* Accent Color Selection */}
                <div className="space-y-2 mb-4">
                  <span className="block text-[11px] font-bold text-brand-dim uppercase tracking-wider">لون السمة الرئيسي (Theme)</span>
                  <div className="flex items-center gap-3 justify-center bg-white/5 p-2.5 rounded-xl border border-brand-border/20">
                    <button
                      type="button"
                      onClick={() => handleColorChange("purple")}
                      className="w-8 h-8 rounded-full theme-dot-purple flex items-center justify-center text-white transition-transform hover:scale-110 active:scale-95 cursor-pointer relative shadow-lg"
                      title="موف"
                    >
                      {themeColor === "purple" && <Check size={14} className="stroke-[3]" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleColorChange("blue")}
                      className="w-8 h-8 rounded-full theme-dot-blue flex items-center justify-center text-white transition-transform hover:scale-110 active:scale-95 cursor-pointer relative shadow-lg"
                      title="أزرق"
                    >
                      {themeColor === "blue" && <Check size={14} className="stroke-[3]" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleColorChange("green")}
                      className="w-8 h-8 rounded-full theme-dot-green flex items-center justify-center text-white transition-transform hover:scale-110 active:scale-95 cursor-pointer relative shadow-lg"
                      title="أخضر"
                    >
                      {themeColor === "green" && <Check size={14} className="stroke-[3]" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleColorChange("orange")}
                      className="w-8 h-8 rounded-full theme-dot-orange flex items-center justify-center text-white transition-transform hover:scale-110 active:scale-95 cursor-pointer relative shadow-lg"
                      title="برتقالي"
                    >
                      {themeColor === "orange" && <Check size={14} className="stroke-[3]" />}
                    </button>
                  </div>
                </div>

                {/* Background Shade Selection */}
                <div className="space-y-2">
                  <span className="block text-[11px] font-bold text-brand-dim uppercase tracking-wider">درجة لون الخلفية</span>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => handleShadeChange("1")}
                      className={`py-2 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                        bgShade === "1"
                          ? "bg-brand-accent/25 border-brand-accent text-white"
                          : "bg-white/5 border-brand-border/40 text-brand-dim hover:bg-white/10"
                      }`}
                    >
                      {themeMode === "dark" ? "كحلي مريح" : "أبيض ناصع"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShadeChange("2")}
                      className={`py-2 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                        bgShade === "2"
                          ? "bg-brand-accent/25 border-brand-accent text-white"
                          : "bg-white/5 border-brand-border/40 text-brand-dim hover:bg-white/10"
                      }`}
                    >
                      {themeMode === "dark" ? "داكن كلي" : "لافندر ناعم"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShadeChange("3")}
                      className={`py-2 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                        bgShade === "3"
                          ? "bg-brand-accent/25 border-brand-accent text-white"
                          : "bg-white/5 border-brand-border/40 text-brand-dim hover:bg-white/10"
                      }`}
                    >
                      {themeMode === "dark" ? "فحمي هادئ" : "أزرق ثلجي"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShadeChange("4")}
                      className={`py-2 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                        bgShade === "4"
                          ? "bg-brand-accent/25 border-brand-accent text-white"
                          : "bg-white/5 border-brand-border/40 text-brand-dim hover:bg-white/10"
                      }`}
                    >
                      {themeMode === "dark" ? "رمادي صلب" : "رمال دافئة"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notification Bell and Dropdown */}
          <div ref={notificationsDropdownRef}>
            <button
              type="button"
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="w-10 h-10 rounded-xl bg-white/5 border border-brand-border/40 flex items-center justify-center text-white/70 hover:bg-white/10 hover:text-white transition-all cursor-pointer relative"
              aria-label="التنبيهات"
            >
              <Bell size={18} className={unreadCount > 0 ? "animate-swing" : ""} />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -left-1.5 min-w-5 h-5 px-1 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white border border-[#0c0e18] shadow-lg">
                  {unreadCount}
                </span>
              )}
            </button>

            {isNotificationsOpen && (
              <div className="absolute left-4 right-4 top-[74px] bg-[#0c0e1b]/98 backdrop-blur-2xl border border-brand-border/60 rounded-2xl shadow-[0_20px_45px_rgba(0,0,0,0.6)] p-4 z-50 text-right animate-scale-in">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-brand-border/30 pb-3 mb-3 select-none">
                  <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                    <span>التنبيهات</span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-brand-accent/25 text-brand-accent rounded-md border border-brand-accent/20">
                        {unreadCount} جديد
                      </span>
                    )}
                  </span>
                  {notifications.length > 0 && (
                    <button
                      onClick={() => {
                        onClearAll();
                      }}
                      className="text-[10px] font-bold text-red-400 hover:text-red-300 transition-colors flex items-center gap-1.5 cursor-pointer bg-red-500/5 px-2.5 py-1.5 rounded-lg border border-red-500/10 hover:bg-red-500/10 active:scale-[0.98]"
                      title="مسح جميع التنبيهات"
                    >
                      <Trash2 size={12} className="shrink-0" />
                      <span>مسح الكل</span>
                    </button>
                  )}
                </div>

                {/* Body */}
                <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar font-cairo pr-0.5 animate-fade-in">
                  {notifications.length === 0 ? (
                    <div className="text-center py-10 text-xs text-brand-dim/40 select-none flex flex-col items-center justify-center gap-2">
                      <Bell size={24} className="text-brand-dim/20" />
                      <span>لا توجد تنبيهات جديدة حالياً.</span>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => {
                          if (!notif.is_read) onMarkAsRead(notif.id);
                        }}
                        className={`p-3 rounded-xl border text-right transition-all duration-200 cursor-pointer select-none group relative overflow-hidden ${
                          notif.is_read
                            ? "bg-[#0b0d19]/40 border-brand-border/15 opacity-60 hover:opacity-100 hover:bg-[#0b0d19]/70"
                            : "bg-brand-accent/[0.06] border-brand-accent/20 hover:bg-brand-accent/[0.1] hover:border-brand-accent/30 shadow-[0_2px_10px_rgba(139,92,246,0.04)]"
                        }`}
                      >
                        {/* Glow indicator for unread notifications */}
                        {!notif.is_read && (
                          <div className="absolute right-0 top-0 bottom-0 w-1 bg-brand-accent animate-pulse" />
                        )}

                        <div className="flex items-center justify-between mb-1 gap-2">
                          <span className={`text-[11px] font-bold truncate max-w-[190px] ${
                            notif.is_read ? "text-white/70" : "text-white"
                          }`}>
                            {notif.title}
                          </span>
                          <span className="text-[9px] text-white/30 font-inter shrink-0 leading-none">
                            {new Date(notif.created_at).toLocaleTimeString("ar-EG-u-nu-latn", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className={`text-[10px] leading-relaxed break-words text-right ${
                          notif.is_read ? "text-brand-dim/50 font-normal" : "text-brand-dim font-medium"
                        }`}>
                          {notif.message}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Close Button on Mobile */}
          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="lg:hidden w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500/20 transition-all focus:outline-none cursor-pointer z-50 shrink-0"
              aria-label="إغلاق القائمة"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => {
          // Check allowedRoles RBAC constraint
          if (item.allowedRoles && (!role || !item.allowedRoles.includes(role))) {
            return null;
          }

          const isActive = pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={() => {
                if (onCloseMobile) onCloseMobile();
              }}
              className={`flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-300 text-base font-medium ${
                isActive
                  ? "bg-gradient-to-r from-brand-accent/20 to-brand-accent-dark/5 border border-brand-accent/20 text-white shadow-[0_0_15px_rgba(139,92,246,0.1)] font-semibold"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon size={18} className={isActive ? "text-brand-accent" : "text-white/40"} />
              <span>{item.name}</span>
            </Link>
          );
        })}

        {/* Work Sheets Section for Agents */}
        {(role === "agent" || role === "senioragent") && (sys1Url || sys2Url || sys3Url || sys4Url) && (
          <>
            <div className="my-5 border-t border-brand-border/20 mx-2" />
            <span className="block text-[11px] font-bold text-brand-accent/90 px-4 mb-2 uppercase tracking-wider font-cairo">شيتات العمل</span>
            <div className="space-y-1">
              {sys1Url && (
                <a
                  href={sys1Url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-300 text-xs md:text-sm text-white/60 hover:text-white hover:bg-white/5 font-medium cursor-pointer"
                >
                  <span>شيت Marketing Sys 1</span>
                  <ExternalLink size={14} className="text-white/40 group-hover:text-white" />
                </a>
              )}
              {sys2Url && (
                <a
                  href={sys2Url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-300 text-xs md:text-sm text-white/60 hover:text-white hover:bg-white/5 font-medium cursor-pointer"
                >
                  <span>شيت Marketing Sys 2</span>
                  <ExternalLink size={14} className="text-white/40 group-hover:text-white" />
                </a>
              )}
              {sys3Url && (
                <a
                  href={sys3Url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-300 text-xs md:text-sm text-white/60 hover:text-white hover:bg-white/5 font-medium cursor-pointer"
                >
                  <span>شيت Marketing Sys 3</span>
                  <ExternalLink size={14} className="text-white/40 group-hover:text-white" />
                </a>
              )}
              {sys4Url && (
                <a
                  href={sys4Url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-300 text-xs md:text-sm text-white/60 hover:text-white hover:bg-white/5 font-medium cursor-pointer"
                >
                  <span>شيت Marketing Sys 4</span>
                  <ExternalLink size={14} className="text-white/40 group-hover:text-white" />
                </a>
              )}
            </div>
          </>
        )}
      </nav>

      {/* Sidebar Footer (User Card & Logout) */}
      <div className="p-4 border-t border-brand-border/40 space-y-4">
        {/* User Card */}
        <div className="bg-[#0e121b]/60 border border-brand-border/40 rounded-2xl p-4 flex items-center justify-between gap-3">
          {/* Dynamic Role-Based Icon (Left) */}
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${
            role === "admin"
              ? "bg-red-500/10 text-red-400 border-red-500/15"
              : role === "accountant"
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/15"
              : role === "senioragent"
              ? "bg-amber-500/10 text-amber-400 border-amber-500/15"
              : "bg-blue-500/10 text-blue-400 border-blue-500/15"
          }`}>
            {role === "admin" ? (
              <Shield size={18} />
            ) : role === "accountant" ? (
              <Wallet size={18} />
            ) : role === "senioragent" ? (
              <Users size={18} />
            ) : (
              <User size={18} />
            )}
          </div>

          {/* User Details (Right) */}
          <div className="text-right flex-1 min-w-0">
            <h4 className="text-sm font-bold text-white truncate leading-snug">{fullName || "مستخدم"}</h4>
            {userEmail && (
              <p className="text-[10px] text-white/40 truncate mt-0.5 dir-ltr text-right">
                {userEmail}
              </p>
            )}
            <div className="mt-2 flex">
              {role === "admin" && (
                <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-[9px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 rounded-full">
                  مدير النظام
                </span>
              )}
              {role === "accountant" && (
                <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                  محاسب
                </span>
              )}
              {role === "senioragent" && (
                <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full">
                  Senior Agent
                </span>
              )}
              {role === "agent" && (
                <span className="inline-flex items-center justify-center px-2.5 py-0.5 text-[9px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full">
                  موظف
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-white/60 hover:text-red-400 hover:bg-red-500/5 transition-all duration-300"
        >
          <LogOut size={18} className="text-white/40 group-hover:text-red-400" />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
}
