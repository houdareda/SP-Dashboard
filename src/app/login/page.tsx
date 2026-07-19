"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isRedirecting, setIsRedirecting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if user already has an active session
    const checkSession = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const errorParam = params.get("error");

        if (errorParam === "profile_not_found" || errorParam === "deactivated") {
          // Clear session immediately to break infinite redirect loop
          await supabase.auth.signOut();
          setIsRedirecting(false);
          if (errorParam === "profile_not_found") {
            setErrorMsg("عذراً، لم يتم العثور على ملف تعريف لحسابك. يرجى مراجعة المسؤول.");
          } else if (errorParam === "deactivated") {
            setErrorMsg("تم إيقاف حسابك من قبل الإدارة. يرجى مراجعة المسؤول.");
          }
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setIsRedirecting(true);
          router.push("/dashboard");
        }
      } catch (err) {
        console.error("Session check error:", err);
      }
    };
    checkSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const params = new URLSearchParams(window.location.search);
      const errorParam = params.get("error");
      
      // Only auto-redirect if there's no auth error parameter present
      if (session && errorParam !== "profile_not_found" && errorParam !== "deactivated") {
        setIsRedirecting(true);
        router.push("/dashboard");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      // If successful, show the redirect overlay and navigate
      setIsRedirecting(true);
      router.push("/dashboard");
    } catch (err: any) {
      console.error("Login error:", err);
      // Friendly Arabic message for common credentials issues
      if (err.status === 400 || err.message?.toLowerCase().includes("invalid login credentials")) {
        setErrorMsg("البريد الإلكتروني أو كلمة المرور غير صحيحة");
      } else {
        setErrorMsg(err.message || "حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.");
      }
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-brand-bg px-4 relative overflow-hidden select-none">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-accent/10 rounded-full blur-[120px] pointer-events-none" />
      
      {isRedirecting && (
        <div className="fixed inset-0 bg-[#05060f]/95 backdrop-blur-md z-[100] flex flex-col items-center justify-center font-cairo">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center shadow-[0_0_30px_rgba(139,92,246,0.15)] animate-pulse">
              <Loader2 size={32} className="text-brand-accent animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-wide">تم تسجيل الدخول بنجاح!</h2>
            <p className="text-sm text-brand-dim mt-1">جاري تهيئة لوحة التحكم وتحميل البيانات...</p>
          </div>
        </div>
      )}

      <div className="w-full max-w-[440px] backdrop-blur-xl bg-brand-card border border-brand-border rounded-[24px] p-8 md:p-10 shadow-2xl relative z-10">
        
        {/* Logo */}
        <div className="text-center mb-2">
          <h1 className="text-3xl font-extrabold tracking-tight font-inter dir-ltr inline-flex items-center gap-1.5 select-none">
            <span className="text-brand-accent font-bold">Point</span>
            <span className="text-white font-bold">Shift</span>
          </h1>
        </div>

        {/* Subtitle */}
        <p className="text-center text-sm text-brand-dim mb-8 font-cairo select-none leading-relaxed">
          أدخل بيانات الاعتماد الخاصة بك للوصول إلى لوحة التحكم
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 font-cairo" autoComplete="off">
          
          {/* Email Field */}
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-brand-dim text-right select-none">
              البريد الإلكتروني
            </label>
            <div className="relative">
              <input
                id="email"
                type="email"
                required
                disabled={isLoading}
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
                placeholder="name@company.com"
                autoComplete="off"
                className="w-full bg-[#070814] border border-brand-border rounded-xl pl-4 pr-11 py-3 text-white placeholder-white/20 text-left dir-ltr focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-glow transition-all duration-300 disabled:opacity-50"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none">
                <Mail size={18} />
              </span>
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-brand-dim text-right select-none">
              كلمة المرور
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                disabled={isLoading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onInvalid={(e) => {
                  const target = e.target as HTMLInputElement;
                  if (target.validity.valueMissing) {
                    target.setCustomValidity("يرجى إدخال كلمة المرور.");
                  }
                }}
                onInput={(e) => (e.target as HTMLInputElement).setCustomValidity("")}
                placeholder="أدخل كلمة المرور الخاصة بك"
                autoComplete="new-password"
                className="w-full bg-[#070814] border border-brand-border rounded-xl pl-11 pr-11 py-3 text-white placeholder-white/20 text-right focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-glow transition-all duration-300 disabled:opacity-50"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none">
                <Lock size={18} />
              </span>
              <button
                type="button"
                tabIndex={-1}
                disabled={isLoading}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors focus:outline-none"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="text-brand-error text-xs sm:text-sm text-right bg-brand-error/10 border border-brand-error/20 px-3.5 py-2.5 rounded-lg transition-all">
              {errorMsg}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-brand-accent to-brand-accent-dark hover:from-brand-accent hover:to-brand-accent/90 text-white font-semibold rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>جاري تسجيل الدخول...</span>
              </>
            ) : (
              <span>تسجيل الدخول إلى لوحة التحكم</span>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
