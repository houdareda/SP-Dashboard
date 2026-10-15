"use server";

import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { revalidatePath } from "next/cache";

export interface MarketingSystem {
  id: string;
  name: string;
  order_index: number;
  is_active: boolean;
  created_at: string;
}

/**
 * Gets the current logged-in user and verifies admin role
 */
async function checkAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { authorized: false, error: "يجب تسجيل الدخول أولاً." };
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return { authorized: false, error: "هذه العملية متاحة لمدير النظام فقط." };
  }

  return { authorized: true, user };
}

/**
 * Action: Get all marketing systems (active or all)
 */
export async function getMarketingSystems(activeOnly = true): Promise<MarketingSystem[]> {
  try {
    let query = supabaseAdmin
      .from("marketing_systems")
      .select("*")
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: true });

    if (activeOnly) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching marketing systems:", error);
      return [];
    }

    return (data || []) as MarketingSystem[];
  } catch (err) {
    console.error("getMarketingSystems exception:", err);
    return [];
  }
}

/**
 * Action: Create a new marketing system (Admin only)
 * Cannot delete systems later, only add or rename.
 */
export async function createMarketingSystem(input: {
  name: string;
  orderIndex?: number;
}) {
  try {
    const authCheck = await checkAdminUser();
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error };
    }

    const trimmedName = input.name?.trim();
    if (!trimmedName) {
      return { success: false, error: "يرجى إدخال اسم السيستم." };
    }

    // Determine order index if not provided
    let orderIndex = input.orderIndex;
    if (orderIndex === undefined || isNaN(orderIndex)) {
      const { data: maxSys } = await supabaseAdmin
        .from("marketing_systems")
        .select("order_index")
        .order("order_index", { ascending: false })
        .limit(1);

      orderIndex = (maxSys && maxSys[0]?.order_index ? Number(maxSys[0].order_index) : 0) + 1;
    }

    const { data: inserted, error } = await supabaseAdmin
      .from("marketing_systems")
      .insert({
        name: trimmedName,
        order_index: orderIndex,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating marketing system:", error);
      return { success: false, error: `فشل إنشاء السيستم: ${error.message}` };
    }

    // Revalidate paths where marketing systems are used
    revalidatePath("/dashboard/operations");
    revalidatePath("/dashboard/agents");
    revalidatePath("/dashboard/management/history");
    revalidatePath("/dashboard/management/edit-requests");
    revalidatePath("/dashboard/logs");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/admin/marketing-systems");

    return { success: true, system: inserted as MarketingSystem };
  } catch (err: any) {
    console.error("createMarketingSystem exception:", err);
    return { success: false, error: err.message || "حدث خطأ غير متوقع." };
  }
}

/**
 * Action: Update an existing marketing system (Admin only)
 * Rule: Systems cannot be deleted, but name and order can be edited.
 */
export async function updateMarketingSystem(input: {
  id: string;
  name?: string;
  orderIndex?: number;
  isActive?: boolean;
}) {
  try {
    const authCheck = await checkAdminUser();
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error };
    }

    if (!input.id) {
      return { success: false, error: "معرف السيستم مطلوب." };
    }

    const updatePayload: Record<string, any> = {};

    if (input.name !== undefined) {
      const trimmed = input.name.trim();
      if (!trimmed) {
        return { success: false, error: "اسم السيستم لا يمكن أن يكون فارغاً." };
      }
      updatePayload.name = trimmed;
    }

    if (input.orderIndex !== undefined && !isNaN(input.orderIndex)) {
      updatePayload.order_index = input.orderIndex;
    }

    if (input.isActive !== undefined) {
      updatePayload.is_active = input.isActive;
    }

    if (Object.keys(updatePayload).length === 0) {
      return { success: false, error: "لا توجد تعديلات لتحديثها." };
    }

    const { data: updated, error } = await supabaseAdmin
      .from("marketing_systems")
      .update(updatePayload)
      .eq("id", input.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating marketing system:", error);
      return { success: false, error: `فشل تعديل السيستم: ${error.message}` };
    }

    revalidatePath("/dashboard/operations");
    revalidatePath("/dashboard/agents");
    revalidatePath("/dashboard/management/history");
    revalidatePath("/dashboard/management/edit-requests");
    revalidatePath("/dashboard/logs");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/admin/marketing-systems");

    return { success: true, system: updated as MarketingSystem };
  } catch (err: any) {
    console.error("updateMarketingSystem exception:", err);
    return { success: false, error: err.message || "حدث خطأ غير متوقع." };
  }
}
