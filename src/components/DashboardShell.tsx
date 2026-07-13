"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { Menu, X, Bell } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface DashboardShellProps {
  children: React.ReactNode;
  userId: string;
  userEmail?: string;
  fullName?: string;
  role?: string;
  sys1Url?: string;
  sys2Url?: string;
  sys3Url?: string;
  sys4Url?: string;
}

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  try {
    if (!sharedAudioCtx) {
      sharedAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return sharedAudioCtx;
  } catch (e) {
    return null;
  }
}

// Setup user interaction listeners to unlock audio play permissions in background tabs
if (typeof window !== "undefined") {
  const resumeAudio = () => {
    try {
      const ctx = getAudioContext();
      if (ctx && ctx.state === "suspended") {
        ctx.resume();
      }
    } catch (e) {
      // Safe catch
    }
  };
  window.addEventListener("click", resumeAudio, { passive: true });
  window.addEventListener("keydown", resumeAudio, { passive: true });
}

// Synthesize a clean, gentle double-tone ping for notifications using browser Web Audio API
// Schedules both notes on the high-precision audio timeline to bypass background JS timer throttling
function playNotificationSound() {
  try {
    const audioCtx = getAudioContext();
    if (!audioCtx) return;

    // Force resume if browser suspended the context due to background state
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;

    // Note 1: D5 (587.33 Hz)
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now);
    
    // Smooth volume envelopes to prevent clicks
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.12, now + 0.01); // Quick fade-in
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.12); // Fade-out
    
    osc1.start(now);
    osc1.stop(now + 0.12);
    
    // Note 2: A5 (880.00 Hz) scheduled precisely 80ms later on the audio timeline
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880.00, now + 0.08);
    
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.setValueAtTime(0, now + 0.08);
    gain2.gain.linearRampToValueAtTime(0.12, now + 0.09); // Quick fade-in
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.3); // Fade-out
    
    osc2.start(now + 0.08);
    osc2.stop(now + 0.3);
  } catch (err) {
    console.warn("Web Audio API background play failed:", err);
  }
}

export default function DashboardShell({
  children,
  userId,
  userEmail,
  fullName,
  role,
  sys1Url,
  sys2Url,
  sys3Url,
  sys4Url,
}: DashboardShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeNotificationToast, setActiveNotificationToast] = useState<any | null>(null);

  // Fetch initial notifications and subscribe to real-time updates
  useEffect(() => {
    if (!userId) return;

    async function fetchNotifications() {
      try {
        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(10);

        if (!error && data) {
          setNotifications(data);
          setUnreadCount(data.filter((n) => !n.is_read).length);
        }
      } catch (err) {
        console.error("Error fetching initial notifications:", err);
      }
    }

    fetchNotifications();

    const channel = supabase
      .channel(`user_notifications_${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log("Realtime notification event:", payload);
          if (payload.eventType === "INSERT") {
            setNotifications((prev) => [payload.new, ...prev.slice(0, 9)]);
            setUnreadCount((c) => c + 1);
            setActiveNotificationToast(payload.new);

            // Play notification tone
            playNotificationSound();

            // Auto-hide toast after 4.5 seconds
            const timer = setTimeout(() => {
              setActiveNotificationToast((curr: any) => (curr?.id === payload.new.id ? null : curr));
            }, 4500);

            return () => clearTimeout(timer);
          } else if (payload.eventType === "UPDATE") {
            setNotifications((prev) => {
              const updated = prev.map((n) => (n.id === payload.new.id ? payload.new : n));
              setUnreadCount(updated.filter((n) => !n.is_read).length);
              return updated;
            });
          } else if (payload.eventType === "DELETE") {
            setNotifications((prev) => {
              const updated = prev.filter((n) => n.id !== payload.old.id);
              setUnreadCount(updated.filter((n) => !n.is_read).length);
              return updated;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Handle real-time account deactivation
  useEffect(() => {
    if (!userId) return;

    const profileChannel = supabase
      .channel(`user_status_${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${userId}`,
        },
        async (payload) => {
          console.log("Realtime profile status update:", payload);
          if (payload.new && payload.new.is_active === false) {
            try {
              await supabase.auth.signOut();
              window.location.href = "/login?error=deactivated";
            } catch (err) {
              console.error("Sign out on deactivation failed:", err);
              window.location.href = "/login?error=deactivated";
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
    };
  }, [userId]);

  const handleMarkAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);

      if (!error) {
        setNotifications((prev) => {
          const updated = prev.map((n) => (n.id === id ? { ...n, is_read: true } : n));
          setUnreadCount(updated.filter((n) => !n.is_read).length);
          return updated;
        });
      }
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_read", false);

      if (!error) {
        setNotifications((prev) => {
          const updated = prev.map((n) => ({ ...n, is_read: true }));
          setUnreadCount(0);
          return updated;
        });
      }
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
    }
  };

  const handleClearAll = async () => {
    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("user_id", userId);

      if (!error) {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (err) {
      console.error("Error clearing all notifications:", err);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg flex text-white relative font-cairo overflow-x-hidden" dir="rtl">
      {/* Background glow behind sidebar */}
      <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-brand-accent/8 rounded-full blur-[120px] pointer-events-none z-10" />

      {/* Mobile Top Header Bar */}
      <header className="lg:hidden fixed top-0 right-0 left-0 h-16 bg-[#05060f]/90 backdrop-blur-md border-b border-brand-border/40 flex items-center justify-between px-6 z-40 select-none">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="w-10 h-10 rounded-xl bg-brand-accent hover:bg-brand-accent/90 text-white flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.35)] transition-all duration-300 active:scale-[0.95] focus:outline-none cursor-pointer"
          aria-label="تحديد القائمة"
        >
          {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        
        <div className="text-lg font-extrabold tracking-tight font-inter dir-ltr flex items-center gap-1">
          <span className="text-white">Shift</span>
          <span className="text-brand-accent">Point</span>
        </div>
      </header>

      {/* Backdrop overlay for mobile when sidebar is open */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-[#05060f]/80 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content Area (padding-top: 16 on mobile for the fixed header) */}
      <main className="flex-1 mr-0 lg:mr-72 pt-24 pb-8 px-4 sm:px-6 md:p-10 lg:pt-10 overflow-y-auto min-h-screen relative z-20">
        {children}
      </main>

      {/* Sidebar Component (fixed on the right) */}
      <Sidebar
        userEmail={userEmail}
        fullName={fullName}
        role={role}
        onCloseMobile={() => setIsSidebarOpen(false)}
        isOpenMobile={isSidebarOpen}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkAsRead={handleMarkAsRead}
        onMarkAllAsRead={handleMarkAllAsRead}
        onClearAll={handleClearAll}
        sys1Url={sys1Url}
        sys2Url={sys2Url}
        sys3Url={sys3Url}
        sys4Url={sys4Url}
      />

      {/* Global Floating Toast Alert (bottom-left popup) */}
      {activeNotificationToast && (
        <div className="fixed bottom-6 left-6 z-[9999] max-w-sm w-full bg-[#0a0d16]/95 backdrop-blur-2xl border border-brand-accent/30 rounded-2xl shadow-2xl p-4 flex items-start gap-3.5 select-none animate-slide-in-left text-right">
          <div className="w-10 h-10 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent shrink-0 mt-0.5 animate-pulse">
            <Bell size={18} />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white leading-none">{activeNotificationToast.title}</h4>
              <button
                onClick={() => setActiveNotificationToast(null)}
                className="text-white/30 hover:text-white transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
            <p className="text-[11px] text-brand-dim leading-relaxed mt-1">{activeNotificationToast.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}
