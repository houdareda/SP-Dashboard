import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import DashboardShell from "@/components/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch logged in user profile details with supabaseAdmin as a fallback to avoid RLS block
  let profile = null;
  const { data: userProfile, error: profileError } = await supabase
    .from("profiles")
    .select("full_name, role, sys1_url, sys2_url, sys3_url, sys4_url")
    .eq("id", user.id)
    .single();

  if (profileError || !userProfile) {
    console.warn("User client failed to fetch profile, trying admin client fallback:", profileError?.message);
    const { data: adminProfile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, role, sys1_url, sys2_url, sys3_url, sys4_url")
      .eq("id", user.id)
      .single();
    if (adminProfile) {
      profile = adminProfile;
    }
  } else {
    profile = userProfile;
  }

  return (
    <DashboardShell
      userId={user.id}
      userEmail={user.email || undefined}
      fullName={profile?.full_name || undefined}
      role={profile?.role || undefined}
      sys1Url={profile?.sys1_url || undefined}
      sys2Url={profile?.sys2_url || undefined}
      sys3Url={profile?.sys3_url || undefined}
      sys4Url={profile?.sys4_url || undefined}
    >
      {children}
    </DashboardShell>
  );
}

