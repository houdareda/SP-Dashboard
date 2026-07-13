import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import AgentsClient from "./AgentsClient";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const supabase = await createClient();

  // Ensure user is logged in
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch current user's profile details with supabaseAdmin as a fallback to avoid RLS block
  let currentProfile = null;
  const { data: userProfile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !userProfile) {
    console.warn("Agents Page: User client profile fetch failed, trying admin client fallback:", profileError?.message);
    const { data: adminProfile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (adminProfile) {
      currentProfile = adminProfile;
    }
  } else {
    currentProfile = userProfile;
  }

  // Route protection: only admin allowed
  if (!currentProfile || currentProfile.role !== "admin") {
    redirect("/dashboard?error=unauthorized");
  }

  // Fetch initial employee profiles
  const { data: initialProfiles, error } = await supabaseAdmin
    .from("profiles")
    .select("*, created_by_profile:created_by(full_name)")
    .order("id", { ascending: false }); // ordering by id or created_at if available

  if (error) {
    console.error("Error fetching profiles:", error);
  }

  return <AgentsClient initialProfiles={initialProfiles || []} />;
}
