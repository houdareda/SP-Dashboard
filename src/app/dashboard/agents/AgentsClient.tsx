"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addEmployee,
  updateEmployee,
  toggleEmployeeStatus,
} from "@/app/actions/employee";
import {
  Users,
  UserPlus,
  Pencil,
  UserX,
  UserCheck,
  Link2,
  Mail,
  Lock,
  User,
  Shield,
  Eye,
  EyeOff,
  Loader2,
  X,
  AlertTriangle,
  Wallet,
  Filter,
  RotateCcw,
  ArrowUpDown,
  Check,
  ChevronDown,
} from "lucide-react";

interface Profile {
  id: string;
  email?: string;
  full_name: string;
  role: string;
  sys1_url?: string | null;
  sys2_url?: string | null;
  sys3_url?: string | null;
  sys4_url?: string | null;
  created_by?: string | null;
  is_active: boolean;
  created_at?: string;
  created_by_profile?: {
    full_name: string;
  } | null;
}

interface AgentsClientProps {
  initialProfiles: Profile[];
}

export default function AgentsClient({ initialProfiles }: AgentsClientProps) {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [isPending, startTransition] = useTransition();

  // Search filter state
  const [searchQuery, setSearchQuery] = useState("");

  // Refs for click outside detection
  const roleDropdownRef = React.useRef<HTMLDivElement>(null);
  const creatorDropdownRef = React.useRef<HTMLDivElement>(null);
  const formRoleDropdownRef = React.useRef<HTMLDivElement>(null);

  const [isFormRoleDropdownOpen, setIsFormRoleDropdownOpen] = useState(false);

  // Advanced Filter state
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedCreator, setSelectedCreator] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [isCreatorDropdownOpen, setIsCreatorDropdownOpen] = useState(false);

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);

  // Status toggle modal state
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState<Profile | null>(null);

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Form inputs state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("agent");
  const [sys1Url, setSys1Url] = useState("");
  const [sys2Url, setSys2Url] = useState("");
  const [sys3Url, setSys3Url] = useState("");
  const [sys4Url, setSys4Url] = useState("");

  // Reset sheet links if the role is changed to anything other than 'agent' or 'senioragent'
  React.useEffect(() => {
    if (role !== "agent" && role !== "senioragent") {
      setSys1Url("");
      setSys2Url("");
      setSys3Url("");
      setSys4Url("");
    }
  }, [role]);

  // Sync profiles state with initialProfiles props (so that router.refresh updates list)
  React.useEffect(() => {
    setProfiles(initialProfiles);
  }, [initialProfiles]);

  // Close dropdowns on clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        roleDropdownRef.current &&
        !roleDropdownRef.current.contains(event.target as Node)
      ) {
        setIsRoleDropdownOpen(false);
      }
      if (
        creatorDropdownRef.current &&
        !creatorDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCreatorDropdownOpen(false);
      }
      if (
        formRoleDropdownRef.current &&
        !formRoleDropdownRef.current.contains(event.target as Node)
      ) {
        setIsFormRoleDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Translate English database/auth errors to Arabic
  const translateError = (msg: string): string => {
    if (!msg) return "حدث خطأ غير متوقع.";
    const lower = msg.toLowerCase();
    
    if (lower.includes("already been registered") || lower.includes("email already exists")) {
      return "البريد الإلكتروني هذا مسجل بالفعل في النظام.";
    }
    if (lower.includes("at least 6 characters") || lower.includes("should be at least 6 characters")) {
      return "يجب أن تكون كلمة المرور مكونة من 6 خانات على الأقل.";
    }
    if (lower.includes("invalid login credentials") || lower.includes("invalid credentials")) {
      return "بيانات الدخول غير صحيحة. يرجى التحقق وإعادة المحاولة.";
    }
    if (lower.includes("weak password")) {
      return "كلمة المرور ضعيفة للغاية. يرجى اختيار كلمة مرور أقوى.";
    }
    if (lower.includes("user not found") || lower.includes("not found")) {
      return "لم يتم العثور على حساب الموظف.";
    }
    if (lower.includes("network") || lower.includes("failed to fetch")) {
      return "خطأ في الاتصال بالشبكة. يرجى التحقق من اتصالك بالإنترنت.";
    }
    if (lower.includes("violates not-null constraint") || lower.includes("constraint")) {
      return "يرجى تعبئة كافة الحقول المطلوبة بشكل صحيح.";
    }
    
    return msg;
  };

  // Show a toast message helper
  const showToast = (message: string, type: "success" | "error") => {
    const displayMessage = type === "error" ? translateError(message) : message;
    setToast({ message: displayMessage, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Open modal for adding
  const handleOpenAdd = () => {
    setFormMode("add");
    setSelectedProfile(null);
    setEmail("");
    setPassword("");
    setFullName("");
    setRole("agent");
    setSys1Url("");
    setSys2Url("");
    setSys3Url("");
    setSys4Url("");
    setIsFormRoleDropdownOpen(false);
    setIsFormOpen(true);
  };

  // Open modal for editing
  const handleOpenEdit = (profile: Profile) => {
    setFormMode("edit");
    setSelectedProfile(profile);
    setEmail(profile.email || ""); 
    setPassword("");
    setFullName(profile.full_name);
    setRole(profile.role);
    setSys1Url(profile.sys1_url || "");
    setSys2Url(profile.sys2_url || "");
    setSys3Url(profile.sys3_url || "");
    setSys4Url(profile.sys4_url || "");
    setIsFormRoleDropdownOpen(false);
    setIsFormOpen(true);
  };

  // Open status toggle confirm modal
  const handleOpenStatusToggle = (profile: Profile) => {
    setStatusTarget(profile);
    setIsStatusOpen(true);
  };

  // Handle Add/Edit Submit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      if (formMode === "add") {
        if (!email || !fullName || !password) {
          showToast("الرجاء ملء جميع الحقول الإجبارية.", "error");
          return;
        }

        const res = await addEmployee({
          email,
          password,
          fullName,
          role,
          sys1Url,
          sys2Url,
          sys3Url,
          sys4Url,
        });

        if (res.success) {
          showToast("تم إنشاء حساب الموظف بنجاح.", "success");
          setIsFormOpen(false);
          router.refresh();
          // Update local state by adding the new profile manually (or let server refresh fetch it)
          const newProfile: Profile = {
            id: res.userId!,
            email: email,
            full_name: fullName,
            role: role,
            sys1_url: sys1Url || null,
            sys2_url: sys2Url || null,
            sys3_url: sys3Url || null,
            sys4_url: sys4Url || null,
            is_active: true,
            created_at: new Date().toISOString(),
          };
          setProfiles((prev) => [newProfile, ...prev]);
        } else {
          showToast(res.error || "فشل إنشاء حساب الموظف.", "error");
        }
      } else {
        // Edit mode
        if (!selectedProfile) return;

        const res = await updateEmployee(selectedProfile.id, {
          fullName,
          role,
          sys1Url,
          sys2Url,
          sys3Url,
          sys4Url,
          password: password.trim() !== "" ? password : undefined,
        });

        if (res.success) {
          showToast("تم تحديث بيانات الموظف بنجاح.", "success");
          setIsFormOpen(false);
          router.refresh();
          // Update local state
          setProfiles((prev) =>
            prev.map((p) =>
              p.id === selectedProfile.id
                ? {
                    ...p,
                    full_name: fullName,
                    role,
                    sys1_url: sys1Url || null,
                    sys2_url: sys2Url || null,
                    sys3_url: sys3Url || null,
                    sys4_url: sys4Url || null,
                  }
                : p
            )
          );
        } else {
          showToast(res.error || "فشل تحديث بيانات الموظف.", "error");
        }
      }
    });
  };

  // Handle Toggle Status Submit
  const handleToggleStatus = async () => {
    if (!statusTarget) return;

    startTransition(async () => {
      const nextStatus = !statusTarget.is_active;
      const res = await toggleEmployeeStatus(statusTarget.id, nextStatus);

      if (res.success) {
        showToast(
          nextStatus ? "تم إعادة تفعيل الحساب بنجاح." : "تم إيقاف حساب الموظف بنجاح.",
          "success"
        );
        setIsStatusOpen(false);
        router.refresh();
        // Update local state
        setProfiles((prev) =>
          prev.map((p) => (p.id === statusTarget.id ? { ...p, is_active: nextStatus } : p))
        );
        setStatusTarget(null);
      } else {
        showToast(res.error || "فشل تغيير حالة الحساب.", "error");
      }
    });
  };

  // Helper for rendering role tags
  const renderRoleBadge = (userRole: string) => {
    switch (userRole) {
      case "admin":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 rounded-full">
            <Shield size={12} />
            <span>مدير</span>
          </span>
        );
      case "accountant":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
            <Wallet size={12} />
            <span>محاسب</span>
          </span>
        );
      case "senioragent":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full">
            <Users size={12} />
            <span>سينيور إيجنت</span>
          </span>
        );
      case "agent":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full">
            <User size={12} />
            <span>إيجنت</span>
          </span>
        );
    }
  };

  const getRoleLabel = (roleVal: string) => {
    switch (roleVal) {
      case "admin":
        return "مدير";
      case "accountant":
        return "محاسب";
      case "senioragent":
        return "سينيور إيجنت";
      case "agent":
      default:
        return "إيجنت";
    }
  };

  // Check if role input dropdown should be disabled
  const isRoleInputDisabled =
    formMode === "edit" &&
    selectedProfile !== null &&
    (selectedProfile.role === "admin" || selectedProfile.role === "accountant");

  // Stats Calculations
  const totalEmployees = profiles.length;
  const adminsCount = profiles.filter((p) => p.role === "admin").length;
  const accountantsCount = profiles.filter((p) => p.role === "accountant").length;
  const seniorAgentsCount = profiles.filter((p) => p.role === "senioragent").length;
  const agentsCount = profiles.filter((p) => p.role === "agent").length;

  // Dynamically extract unique creator names
  const creatorOptions = React.useMemo(() => {
    return Array.from(
      new Set(
        profiles
          .map((p) => p.created_by_profile?.full_name)
          .filter((name): name is string => !!name)
      )
    );
  }, [profiles]);

  // Combined Search, Role, and Creator Filtering + Sorting
  const filteredAndSortedProfiles = React.useMemo(() => {
    let result = [...profiles];

    // Filter by name
    if (searchQuery.trim() !== "") {
      result = result.filter((p) =>
        p.full_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by roles (Multi-select)
    if (selectedRoles.length > 0) {
      result = result.filter((p) => selectedRoles.includes(p.role));
    }

    // Filter by creator admin
    if (selectedCreator !== "") {
      result = result.filter((p) => p.created_by_profile?.full_name === selectedCreator);
    }

    // Sort by created_at date
    result.sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [profiles, searchQuery, selectedRoles, selectedCreator, sortOrder]);

  return (
    <div className="space-y-8 font-cairo select-none relative">
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
      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* Title / Subtitle */}
        <div className="space-y-1.5 text-right">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="text-brand-accent" size={24} />
            <span>إدارة الموظفين</span>
          </h1>
          <p className="text-sm text-brand-dim leading-relaxed">
            استعرض ودرج الموظفين والمسؤولين وقم بإدارة حساباتهم وصلاحياتهم في النظام.
          </p>
        </div>

        {/* Add Button */}
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-5 py-3 bg-brand-accent hover:bg-brand-accent/95 text-white font-semibold rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(139,92,246,0.25)] hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] active:scale-[0.98] cursor-pointer"
        >
          <UserPlus size={18} />
          <span>إضافة موظف جديد</span>
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 md:gap-5">
        {/* Total Card */}
        <div className="backdrop-blur-xl bg-brand-card/60 border border-brand-border/40 p-5 rounded-2xl flex items-center justify-between shadow-lg relative overflow-hidden group hover:border-brand-accent/30 transition-all duration-300 col-span-2 lg:col-span-1">
          <div className="absolute top-0 right-0 w-24 h-24 bg-brand-accent/5 rounded-full blur-2xl pointer-events-none group-hover:bg-brand-accent/10 transition-all duration-300" />
          <div className="space-y-1.5 text-right relative z-10">
            <span className="text-xs font-semibold text-brand-dim">إجمالي الموظفين</span>
            <h3 className="text-3xl font-extrabold text-white tracking-tight">{totalEmployees}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-brand-accent/10 text-brand-accent flex items-center justify-center border border-brand-accent/15 shrink-0 relative z-10">
            <Users size={22} />
          </div>
        </div>

        {/* Agents Card */}
        <div className="backdrop-blur-xl bg-brand-card/60 border border-brand-border/40 p-5 rounded-2xl flex items-center justify-between shadow-lg relative overflow-hidden group hover:border-blue-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-blue-500/10 transition-all duration-300" />
          <div className="space-y-1.5 text-right relative z-10">
            <span className="text-xs font-semibold text-brand-dim">إيجنت</span>
            <h3 className="text-3xl font-extrabold text-blue-400 tracking-tight">{agentsCount}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/15 shrink-0 relative z-10">
            <User size={22} />
          </div>
        </div>

        {/* Senior Agents Card */}
        <div className="backdrop-blur-xl bg-brand-card/60 border border-brand-border/40 p-5 rounded-2xl flex items-center justify-between shadow-lg relative overflow-hidden group hover:border-amber-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/10 transition-all duration-300" />
          <div className="space-y-1.5 text-right relative z-10">
            <span className="text-xs font-semibold text-brand-dim">سينيور إيجنت</span>
            <h3 className="text-3xl font-extrabold text-amber-400 tracking-tight">{seniorAgentsCount}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/15 shrink-0 relative z-10">
            <UserCheck size={22} />
          </div>
        </div>

        {/* Accountants Card */}
        <div className="backdrop-blur-xl bg-brand-card/60 border border-brand-border/40 p-5 rounded-2xl flex items-center justify-between shadow-lg relative overflow-hidden group hover:border-emerald-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/10 transition-all duration-300" />
          <div className="space-y-1.5 text-right relative z-10">
            <span className="text-xs font-semibold text-brand-dim">المحاسبون</span>
            <h3 className="text-3xl font-extrabold text-emerald-400 tracking-tight">{accountantsCount}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/15 shrink-0 relative z-10">
            <Wallet size={22} />
          </div>
        </div>

        {/* Admins Card */}
        <div className="backdrop-blur-xl bg-brand-card/60 border border-brand-border/40 p-5 rounded-2xl flex items-center justify-between shadow-lg relative overflow-hidden group hover:border-red-500/30 transition-all duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-red-500/10 transition-all duration-300" />
          <div className="space-y-1.5 text-right relative z-10">
            <span className="text-xs font-semibold text-brand-dim">مدير</span>
            <h3 className="text-3xl font-extrabold text-red-400 tracking-tight">{adminsCount}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center border border-red-500/15 shrink-0 relative z-10">
            <Shield size={22} />
          </div>
        </div>
      </div>

      {/* Advanced Filter Bar */}
      <div className="backdrop-blur-xl bg-brand-card/40 border border-brand-border/40 p-4 rounded-2xl shadow-lg relative z-20 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Left Controls: Search + Multi-select role + Creator filter */}
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative w-full sm:max-w-xs">
              <input
                type="text"
                placeholder="ابحث عن موظف بالاسم..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#070814]/80 border border-brand-border/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-glow transition-all duration-300"
              />
            </div>

            {/* Custom Multi-select for Roles */}
            <div className="relative w-full sm:w-auto" ref={roleDropdownRef}>
              <button
                type="button"
                dir="rtl"
                onClick={() => {
                  setIsRoleDropdownOpen(!isRoleDropdownOpen);
                  setIsCreatorDropdownOpen(false);
                }}
                className="flex items-center justify-between gap-2 w-full sm:w-auto px-4 py-2.5 bg-[#070814]/80 border border-brand-border/80 rounded-xl text-sm text-brand-dim hover:text-white transition-all cursor-pointer relative z-20 select-none"
              >
                <div className="flex items-center gap-2">
                  <span>
                    {selectedRoles.length === 0
                      ? "كل الأدوار"
                      : selectedRoles.length === 4
                      ? "كل الأدوار (المحددة)"
                      : `الأدوار المختارة (${selectedRoles.length})`}
                  </span>
                  <Filter size={15} />
                </div>
                <ChevronDown size={14} className={`text-white/40 transition-transform duration-200 ${isRoleDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {isRoleDropdownOpen && (
                <div className="absolute right-0 left-0 sm:left-auto mt-2 w-full sm:w-56 bg-[#0c0e18]/95 backdrop-blur-xl border border-brand-border/80 rounded-xl shadow-2xl p-3 z-20 animate-scale-in text-right">
                  <span className="block text-xs font-semibold text-brand-dim mb-2 border-b border-brand-border/20 pb-1.5 font-cairo">تصفية حسب الدور</span>
                  <div className="space-y-1">
                    {/* Select All Option */}
                    <button
                      type="button"
                      dir="rtl"
                      onClick={() => {
                        if (selectedRoles.length === 4 || selectedRoles.length === 0) {
                          setSelectedRoles([]);
                        } else {
                          setSelectedRoles(["agent", "senioragent", "accountant", "admin"]);
                        }
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer text-brand-accent hover:text-brand-accent/80 font-bold font-cairo"
                    >
                      <span className="text-xs text-right font-cairo">تحديد الكل</span>
                      {selectedRoles.length === 0 || selectedRoles.length === 4 ? (
                        <div className="w-4 h-4 rounded border border-brand-accent bg-brand-accent/20 flex items-center justify-center shrink-0">
                          <Check size={12} className="text-brand-accent stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded border border-white/25 bg-white/[0.02] shrink-0" />
                      )}
                    </button>

                    <div className="border-t border-brand-border/10 my-1.5" />

                    {[
                      { value: "agent", label: "إيجنت" },
                      { value: "senioragent", label: "سينيور إيجنت" },
                      { value: "accountant", label: "محاسب" },
                      { value: "admin", label: "مدير" },
                    ].map((r) => {
                      const isChecked = selectedRoles.includes(r.value);
                      return (
                        <button
                          key={r.value}
                          type="button"
                          dir="rtl"
                          onClick={() => {
                            if (isChecked) {
                              setSelectedRoles(selectedRoles.filter((val) => val !== r.value));
                            } else {
                              setSelectedRoles([...selectedRoles, r.value]);
                            }
                          }}
                          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer text-white/80 transition-colors w-full"
                        >
                          <span className="text-xs font-semibold text-right">{r.label}</span>
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

            {/* Custom Creator Dropdown */}
            <div className="relative w-full sm:w-auto" ref={creatorDropdownRef}>
              <button
                type="button"
                dir="rtl"
                onClick={() => {
                  setIsCreatorDropdownOpen(!isCreatorDropdownOpen);
                  setIsRoleDropdownOpen(false);
                }}
                className="flex items-center justify-between gap-2 w-full sm:w-auto px-4 py-2.5 bg-[#070814]/80 border border-brand-border/80 rounded-xl text-sm text-brand-dim hover:text-white transition-all cursor-pointer relative z-20 select-none"
              >
                <span>
                  {selectedCreator === ""
                    ? "تمت الإضافة بواسطة (الكل)"
                    : `المضيف: ${selectedCreator}`}
                </span>
                <ChevronDown size={14} className={`text-white/40 transition-transform duration-200 ${isCreatorDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {isCreatorDropdownOpen && (
                <div className="absolute right-0 left-0 sm:left-auto mt-2 w-full sm:w-56 bg-[#0c0e18]/95 backdrop-blur-xl border border-brand-border/80 rounded-xl shadow-2xl p-2 z-20 animate-scale-in text-right">
                  <span className="block text-xs font-semibold text-brand-dim mb-2 border-b border-brand-border/20 px-2 py-1.5">تمت الإضافة بواسطة</span>
                  <div className="space-y-1">
                    {/* "الكل" Option */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCreator("");
                        setIsCreatorDropdownOpen(false);
                      }}
                      className={`w-full text-right px-3 py-2 text-xs rounded-lg hover:bg-white/5 transition-colors cursor-pointer block font-cairo ${
                        selectedCreator === "" ? "text-brand-accent bg-brand-accent/15 font-bold" : "text-white/80"
                      }`}
                    >
                      الكل (جميع المسؤولين)
                    </button>
                    {/* Dynamic Options */}
                    {creatorOptions.map((creator) => (
                      <button
                        key={creator}
                        type="button"
                        onClick={() => {
                          setSelectedCreator(creator);
                          setIsCreatorDropdownOpen(false);
                        }}
                        className={`w-full text-right px-3 py-2 text-xs rounded-lg hover:bg-white/5 transition-colors cursor-pointer block font-cairo ${
                          selectedCreator === creator ? "text-brand-accent bg-brand-accent/15 font-bold" : "text-white/80"
                        }`}
                      >
                        {creator}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Controls: Sort Order & Reset Filters */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end flex-wrap sm:flex-nowrap">
            {/* Sort Toggle Button */}
            <button
              type="button"
              onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
              className="flex items-center justify-between gap-2 w-full sm:w-auto px-4 py-2.5 bg-[#070814]/80 border border-brand-border/80 rounded-xl text-sm text-brand-dim hover:text-white transition-all cursor-pointer select-none"
              title={sortOrder === "desc" ? "الترتيب حسب الأقدم" : "الترتيب حسب الأحدث"}
            >
              <div className="flex items-center gap-2">
                <ArrowUpDown size={15} />
                <span>
                  {sortOrder === "desc" ? "الأحدث أولاً" : "الأقدم أولاً"}
                </span>
              </div>
            </button>

            {/* Reset Filters Button */}
            {(searchQuery !== "" || selectedRoles.length > 0 || selectedCreator !== "" || sortOrder !== "desc") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedRoles([]);
                  setSelectedCreator("");
                  setSortOrder("desc");
                }}
                className="flex items-center justify-center gap-1.5 w-full sm:w-auto px-4 py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 rounded-xl text-sm font-semibold transition-all cursor-pointer"
              >
                <RotateCcw size={14} />
                <span>مسح الفلاتر</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Employees Table Card */}
      <div className="backdrop-blur-xl bg-brand-card border border-brand-border rounded-[24px] overflow-hidden shadow-2xl relative">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="border-b border-brand-border/40 text-brand-dim text-xs font-semibold whitespace-nowrap">
                <th className="px-6 py-4.5 min-w-[150px]">الاسم الكامل</th>
                <th className="px-6 py-4.5 min-w-[120px]">الدور/الصلاحية</th>
                <th className="px-6 py-4.5 min-w-[180px]">الشيتات</th>
                <th className="px-6 py-4.5 min-w-[120px]">تمت الإضافة بواسطة</th>
                <th className="px-6 py-4.5 min-w-[120px]">تاريخ الإنشاء</th>
                <th className="px-6 py-4.5 text-left min-w-[120px]">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/20 text-sm">
              {filteredAndSortedProfiles.length > 0 ? (
                filteredAndSortedProfiles.map((profile) => {
                  const hasSheets =
                    profile.sys1_url || profile.sys2_url || profile.sys3_url || profile.sys4_url;

                  return (
                    <tr
                      key={profile.id}
                      className={`hover:bg-white/[0.01] transition-all duration-200 ${
                        !profile.is_active ? "opacity-50" : ""
                      }`}
                    >
                      {/* Name */}
                      <td className="px-6 py-4 font-semibold text-white whitespace-nowrap">
                        {profile.full_name}
                      </td>

                      {/* Role */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {renderRoleBadge(profile.role)}
                      </td>

                      {/* Sheets */}
                      <td className="px-6 py-4">
                        {hasSheets ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {profile.sys1_url && (
                              <a
                                href={profile.sys1_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded hover:bg-blue-500/25 transition-all"
                              >
                                <Link2 size={10} />
                                <span>Sys 1</span>
                              </a>
                            )}
                            {profile.sys2_url && (
                              <a
                                href={profile.sys2_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded hover:bg-emerald-500/25 transition-all"
                              >
                                <Link2 size={10} />
                                <span>Sys 2</span>
                              </a>
                            )}
                            {profile.sys3_url && (
                              <a
                                href={profile.sys3_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded hover:bg-purple-500/25 transition-all"
                              >
                                <Link2 size={10} />
                                <span>Sys 3</span>
                              </a>
                            )}
                            {profile.sys4_url && (
                              <a
                                href={profile.sys4_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded hover:bg-cyan-500/25 transition-all"
                              >
                                <Link2 size={10} />
                                <span>Sys 4</span>
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-brand-dim/50">—</span>
                        )}
                      </td>

                      {/* Created By */}
                      <td className="px-6 py-4 text-brand-dim text-sm whitespace-nowrap">
                        {profile.created_by_profile?.full_name || "—"}
                      </td>

                      {/* Creation Date */}
                      <td className="px-6 py-4 text-brand-dim text-xs whitespace-nowrap">
                        {profile.created_at
                          ? new Date(profile.created_at).toLocaleDateString("ar-EG-u-nu-latn", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                              hour: undefined,
                              minute: undefined,
                            })
                          : "21 يونيو 2026"}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-left whitespace-nowrap">
                        {profile.role === "admin" ? (
                          <span className="text-xs text-brand-dim/50 italic px-2">غير قابل للتعديل</span>
                        ) : (
                          <div className="flex items-center justify-end gap-2.5">
                            {/* Edit Button */}
                            <button
                              onClick={() => handleOpenEdit(profile)}
                              className="w-10 h-10 rounded-xl bg-brand-accent/10 border border-brand-accent/20 hover:bg-brand-accent/20 hover:border-brand-accent/30 text-brand-accent flex items-center justify-center transition-all duration-300 cursor-pointer"
                              title="تعديل الموظف"
                            >
                              <Pencil size={16} />
                            </button>

                            {/* Status Button */}
                            <button
                              onClick={() => handleOpenStatusToggle(profile)}
                              className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-300 cursor-pointer ${
                                profile.is_active
                                  ? "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20 hover:border-red-500/30"
                                  : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/30"
                              }`}
                              title={profile.is_active ? "إيقاف الحساب" : "تفعيل الحساب"}
                            >
                              {profile.is_active ? <UserX size={16} /> : <UserCheck size={16} />}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center select-none">
                    <div className="flex flex-col items-center justify-center space-y-4 max-w-sm mx-auto">
                      <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-brand-border/40 text-brand-dim/50 flex items-center justify-center shadow-inner">
                        <Users size={32} />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-base font-bold text-white">لا توجد نتائج مطابقة لبحثك</h4>
                        <p className="text-xs text-brand-dim leading-relaxed">
                          جرب تعديل كلمات البحث، أو تغيير فلاتر الأدوار لإيجاد الموظف المطلوب.
                        </p>
                      </div>
                      {(searchQuery !== "" || selectedRoles.length > 0 || selectedCreator !== "") && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery("");
                            setSelectedRoles([]);
                            setSelectedCreator("");
                          }}
                          className="px-4 py-2 bg-brand-accent hover:bg-brand-accent/90 text-white text-xs font-semibold rounded-lg transition-all cursor-pointer"
                        >
                          مسح جميع الفلاتر
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop overlay */}
          <div
            className="absolute inset-0 bg-[#05060f]/80 backdrop-blur-md"
            onClick={() => !isPending && setIsFormOpen(false)}
          />

          {/* Modal Container */}
          <div className="w-full max-w-[720px] bg-brand-card border border-brand-border rounded-[24px] p-6 md:p-8 shadow-2xl relative z-10 overflow-y-auto max-h-[90vh] custom-scrollbar animate-scale-in">
            {/* Close Button */}
            <button
              onClick={() => setIsFormOpen(false)}
              disabled={isPending}
              className="absolute left-6 top-6 text-white/40 hover:text-white transition-colors focus:outline-none disabled:opacity-50 cursor-pointer"
            >
              <X size={20} />
            </button>

            {/* Modal Header */}
            <div className="space-y-1 text-right mb-6 select-none">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <UserPlus className="text-brand-accent" size={20} />
                <span>{formMode === "add" ? "إضافة موظف جديد" : "تعديل بيانات الموظف"}</span>
              </h3>
              <p className="text-xs text-brand-dim">
                {formMode === "add"
                  ? "قم بإنشاء حساب جديد وتعيين الصلاحيات ودور الموظف في النظام مباشرة."
                  : "قم بتعديل بيانات الموظف وصلاحياته وروابط الشيتات الخاصة به."}
              </p>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleFormSubmit} className="space-y-8" autoComplete="off">
              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6 text-right">
                {/* Full Name */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-white/90 mb-1">الاسم الكامل</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      disabled={isPending}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      onInvalid={(e) => {
                        const target = e.target as HTMLInputElement;
                        if (target.validity.valueMissing) {
                          target.setCustomValidity("يرجى إدخال الاسم الكامل.");
                        }
                      }}
                      onInput={(e) => (e.target as HTMLInputElement).setCustomValidity("")}
                      placeholder="أدخل الاسم"
                      autoComplete="off"
                      className="w-full bg-[#070814] border border-brand-border rounded-xl pl-4 pr-11 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-glow transition-all duration-300 disabled:opacity-50"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30">
                      <User size={16} />
                    </span>
                  </div>
                </div>

                {/* Email (Disabled in Edit Mode) */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-white/90 mb-1">البريد الإلكتروني</label>
                  <div className="relative">
                    <input
                      type="email"
                      required={formMode === "add"}
                      disabled={formMode === "edit" || isPending}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onInvalid={(e) => {
                        const target = e.target as HTMLInputElement;
                        if (target.validity.valueMissing) {
                          target.setCustomValidity("يرجى إدخال البريد الإلكتروني.");
                        } else if (target.validity.typeMismatch) {
                          target.setCustomValidity("يرجى إدخال عنوان بريد إلكتروني صحيح.");
                        }
                      }}
                      onInput={(e) => (e.target as HTMLInputElement).setCustomValidity("")}
                      placeholder={formMode === "add" ? "name@company.com" : ""}
                      autoComplete="off"
                      className="w-full bg-[#070814] border border-brand-border rounded-xl pl-4 pr-11 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-glow transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-900/50 text-left dir-ltr"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30">
                      <Mail size={16} />
                    </span>
                  </div>
                </div>

                {/* Password (Optional in Edit Mode) */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-white/90 mb-1">
                    كلمة المرور {formMode === "edit" && <span className="text-xs text-brand-dim/50">(اختياري)</span>}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required={formMode === "add"}
                      disabled={isPending}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onInvalid={(e) => {
                        const target = e.target as HTMLInputElement;
                        if (target.validity.valueMissing) {
                          target.setCustomValidity("يرجى إدخال كلمة المرور.");
                        }
                      }}
                      onInput={(e) => (e.target as HTMLInputElement).setCustomValidity("")}
                      placeholder={formMode === "edit" ? "اتركها فارغة لعدم التغيير" : "حدد كلمة مرور قوية"}
                      autoComplete="new-password"
                      className="w-full bg-[#070814] border border-brand-border rounded-xl pl-11 pr-11 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-glow transition-all duration-300 disabled:opacity-50"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30">
                      <Lock size={16} />
                    </span>
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors focus:outline-none cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Role dropdown */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-white/90 mb-1">الدور / الصلاحية</label>
                  <div className="relative" ref={formRoleDropdownRef}>
                    <button
                      type="button"
                      disabled={isRoleInputDisabled || isPending}
                      onClick={() => setIsFormRoleDropdownOpen(!isFormRoleDropdownOpen)}
                      className="w-full flex items-center justify-between bg-[#070814] border border-brand-border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-glow transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-right cursor-pointer select-none"
                    >
                      <span>{getRoleLabel(role)}</span>
                      <ChevronDown size={16} className={`text-white/40 transition-transform duration-200 ${isFormRoleDropdownOpen ? "rotate-180" : ""}`} />
                    </button>
                    
                    {isFormRoleDropdownOpen && (
                      <div className="absolute right-0 left-0 mt-2 bg-[#0c0e18]/95 backdrop-blur-xl border border-brand-border/80 rounded-xl shadow-2xl p-2 z-50 animate-scale-in text-right">
                        <div className="space-y-1">
                          <button
                            type="button"
                            onClick={() => {
                              setRole("agent");
                              setIsFormRoleDropdownOpen(false);
                            }}
                            className={`w-full text-right px-3 py-2.5 text-xs rounded-lg hover:bg-white/5 transition-colors cursor-pointer flex items-center justify-between ${
                              role === "agent" ? "bg-brand-accent/20 text-brand-accent font-semibold" : "text-white"
                            }`}
                          >
                            <span>إيجنت</span>
                            {role === "agent" && <Check size={14} className="text-brand-accent" />}
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => {
                              setRole("senioragent");
                              setIsFormRoleDropdownOpen(false);
                            }}
                            className={`w-full text-right px-3 py-2.5 text-xs rounded-lg hover:bg-white/5 transition-colors cursor-pointer flex items-center justify-between ${
                              role === "senioragent" ? "bg-brand-accent/20 text-brand-accent font-semibold" : "text-white"
                            }`}
                          >
                            <span>سينيور إيجنت</span>
                            {role === "senioragent" && <Check size={14} className="text-brand-accent" />}
                          </button>

                          {(formMode === "add" || role === "accountant") && (
                            <button
                              type="button"
                              onClick={() => {
                                setRole("accountant");
                                setIsFormRoleDropdownOpen(false);
                              }}
                              className={`w-full text-right px-3 py-2.5 text-xs rounded-lg hover:bg-white/5 transition-colors cursor-pointer flex items-center justify-between ${
                                role === "accountant" ? "bg-brand-accent/20 text-brand-accent font-semibold" : "text-white"
                              }`}
                            >
                              <span>محاسب</span>
                              {role === "accountant" && <Check size={14} className="text-brand-accent" />}
                            </button>
                          )}

                          {(formMode === "add" || role === "admin") && (
                            <button
                              type="button"
                              onClick={() => {
                                setRole("admin");
                                setIsFormRoleDropdownOpen(false);
                              }}
                              className={`w-full text-right px-3 py-2.5 text-xs rounded-lg hover:bg-white/5 transition-colors cursor-pointer flex items-center justify-between ${
                                role === "admin" ? "bg-brand-accent/20 text-brand-accent font-semibold" : "text-white"
                              }`}
                            >
                              <span>مدير</span>
                              {role === "admin" && <Check size={14} className="text-brand-accent" />}
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {isRoleInputDisabled && (
                      <span className="block text-[10px] text-amber-400 mt-1">
                        * حسابات المدير والمحاسب مقفلة الصلاحية، لا يمكن تغييرها.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Sheet Links Title */}
              {(role === "agent" || role === "senioragent") && (
                <div className="border-t border-brand-border/40 pt-6 mt-2 text-right animate-fade-in">
                  <h4 className="text-sm md:text-base font-bold text-brand-accent mb-5">
                    روابط الشيتات الخاصة بالموظف (Google Sheets)
                  </h4>

                  {/* Link inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                    {/* Sys 1 */}
                    <div className="space-y-2">
                      <label className="block text-xs md:text-sm font-semibold text-white/80">رابط شيت 1 Marketing Sys</label>
                      <input
                        type="url"
                        disabled={isPending}
                        value={sys1Url}
                        onChange={(e) => setSys1Url(e.target.value)}
                        onInvalid={(e) => {
                          const target = e.target as HTMLInputElement;
                          if (target.validity.typeMismatch) {
                            target.setCustomValidity("يرجى إدخال رابط URL صحيح.");
                          }
                        }}
                        onInput={(e) => (e.target as HTMLInputElement).setCustomValidity("")}
                        placeholder="https://docs.google.com/spreadsheets/..."
                        className="w-full bg-[#070814] border border-brand-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-accent transition-all duration-300 disabled:opacity-50 text-left dir-ltr"
                      />
                    </div>

                    {/* Sys 2 */}
                    <div className="space-y-2">
                      <label className="block text-xs md:text-sm font-semibold text-white/80">رابط شيت 2 Marketing Sys</label>
                      <input
                        type="url"
                        disabled={isPending}
                        value={sys2Url}
                        onChange={(e) => setSys2Url(e.target.value)}
                        onInvalid={(e) => {
                          const target = e.target as HTMLInputElement;
                          if (target.validity.typeMismatch) {
                            target.setCustomValidity("يرجى إدخال رابط URL صحيح.");
                          }
                        }}
                        onInput={(e) => (e.target as HTMLInputElement).setCustomValidity("")}
                        placeholder="https://docs.google.com/spreadsheets/..."
                        className="w-full bg-[#070814] border border-brand-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-accent transition-all duration-300 disabled:opacity-50 text-left dir-ltr"
                      />
                    </div>

                    {/* Sys 3 */}
                    <div className="space-y-2">
                      <label className="block text-xs md:text-sm font-semibold text-white/80">رابط شيت 3 Marketing Sys</label>
                      <input
                        type="url"
                        disabled={isPending}
                        value={sys3Url}
                        onChange={(e) => setSys3Url(e.target.value)}
                        onInvalid={(e) => {
                          const target = e.target as HTMLInputElement;
                          if (target.validity.typeMismatch) {
                            target.setCustomValidity("يرجى إدخال رابط URL صحيح.");
                          }
                        }}
                        onInput={(e) => (e.target as HTMLInputElement).setCustomValidity("")}
                        placeholder="https://docs.google.com/spreadsheets/..."
                        className="w-full bg-[#070814] border border-brand-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-accent transition-all duration-300 disabled:opacity-50 text-left dir-ltr"
                      />
                    </div>

                    {/* Sys 4 */}
                    <div className="space-y-2">
                      <label className="block text-xs md:text-sm font-semibold text-white/80">رابط شيت 4 Marketing Sys</label>
                      <input
                        type="url"
                        disabled={isPending}
                        value={sys4Url}
                        onChange={(e) => setSys4Url(e.target.value)}
                        onInvalid={(e) => {
                          const target = e.target as HTMLInputElement;
                          if (target.validity.typeMismatch) {
                            target.setCustomValidity("يرجى إدخال رابط URL صحيح.");
                          }
                        }}
                        onInput={(e) => (e.target as HTMLInputElement).setCustomValidity("")}
                        placeholder="https://docs.google.com/spreadsheets/..."
                        className="w-full bg-[#070814] border border-brand-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-brand-accent transition-all duration-300 disabled:opacity-50 text-left dir-ltr"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isPending}
                className="w-full py-3.5 bg-gradient-to-r from-brand-accent to-brand-accent-dark hover:from-brand-accent hover:to-brand-accent/90 text-white font-semibold rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {isPending ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>جاري حفظ البيانات...</span>
                  </>
                ) : (
                  <>
                    <UserPlus size={18} />
                    <span>
                      {formMode === "add" ? "إنشاء حساب الموظف" : "حفظ التعديلات وتحديث الحساب"}
                    </span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Toggle Status Confirmation Modal */}
      {isStatusOpen && statusTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop overlay */}
          <div
            className="absolute inset-0 bg-[#05060f]/80 backdrop-blur-md"
            onClick={() => !isPending && setIsStatusOpen(false)}
          />

          {/* Modal Container */}
          <div className="w-full max-w-[480px] bg-brand-card border border-brand-border rounded-[24px] p-6 shadow-2xl relative z-10 text-right animate-scale-in">
            {/* Header info */}
            <div className="flex items-start gap-4 mb-5">
              {/* Warning/Alert Icon */}
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  statusTarget.is_active
                    ? "bg-red-500/10 text-red-400 border border-red-500/20"
                    : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                }`}
              >
                <AlertTriangle size={22} />
              </div>

              {/* Title & Desc */}
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">
                  {statusTarget.is_active ? "إيقاف حساب الموظف" : "إعادة تفعيل الحساب"}
                </h3>
                <p className="text-xs text-brand-dim leading-relaxed">
                  هل أنت متأكد من أنك تريد{" "}
                  <span className={statusTarget.is_active ? "text-red-400 font-semibold" : "text-emerald-400 font-semibold"}>
                    {statusTarget.is_active ? "إيقاف" : "إعادة تفعيل"}
                  </span>{" "}
                  حساب الموظف: <span className="text-white font-bold">{statusTarget.full_name}</span>؟
                </p>
              </div>
            </div>

            {/* Warning Message if suspending */}
            {statusTarget.is_active && (
              <div className="mb-6 p-3.5 bg-red-500/5 border border-red-500/10 rounded-xl text-xs text-red-400/90 leading-relaxed">
                * عند إيقاف الحساب، لن يتمكن الموظف من تسجيل الدخول إلى لوحة التحكم أو عرض البيانات حتى يتم تنشيط الحساب مرة أخرى.
              </div>
            )}

            {/* Actions Buttons */}
            <div className="flex items-center gap-3 justify-end font-semibold">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setIsStatusOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-brand-border/60 hover:bg-white/5 text-sm text-brand-dim hover:text-white transition-all disabled:opacity-50 cursor-pointer"
              >
                إلغاء
              </button>

              <button
                type="button"
                disabled={isPending}
                onClick={handleToggleStatus}
                className={`px-5 py-2.5 rounded-xl text-sm text-white flex items-center gap-2 transition-all cursor-pointer ${
                  statusTarget.is_active
                    ? "bg-red-600 hover:bg-red-500 active:scale-[0.98]"
                    : "bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98]"
                } disabled:opacity-50`}
              >
                {isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : statusTarget.is_active ? (
                  <span>نعم، إيقاف الحساب</span>
                ) : (
                  <span>تفعيل الحساب</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
