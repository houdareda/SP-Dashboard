"use server";

import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export interface EmployeeData {
  email: string;
  password?: string;
  fullName: string;
  role: string;
  sys1Url?: string;
  sys2Url?: string;
  sys3Url?: string;
  sys4Url?: string;
  sheetUrls?: Record<string, string>;
}

/**
 * Gets the current logged-in user on the server side
 */
async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Server Action: Add Employee
 */
export async function addEmployee(data: EmployeeData) {
  try {
    const adminUser = await getCurrentUser();
    if (!adminUser) {
      return { success: false, error: "غير مصرح بالعملية. الرجاء تسجيل الدخول أولاً." };
    }

    // 1. Create the Auth User in Supabase
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password || "12345678", // fallback default password
      email_confirm: true,
    });

    if (authError || !authData.user) {
      return {
        success: false,
        error: authError?.message || "حدث خطأ أثناء إنشاء حساب المستخدم في النظام.",
      };
    }

    const newUserId = authData.user.id;

    // Prepare sheet URLs
    const finalSheetUrls = data.sheetUrls || {};
    const s1 = finalSheetUrls['11111111-1111-1111-1111-111111111111'] || data.sys1Url || null;
    const s2 = finalSheetUrls['22222222-2222-2222-2222-222222222222'] || data.sys2Url || null;
    const s3 = finalSheetUrls['33333333-3333-3333-3333-333333333333'] || data.sys3Url || null;
    const s4 = data.sys4Url || null;

    // 2. Insert user profile into public.profiles
    const { error: insertError } = await supabaseAdmin.from("profiles").insert({
      id: newUserId,
      email: data.email,
      full_name: data.fullName,
      role: data.role,
      sheet_urls: finalSheetUrls,
      sys1_url: s1,
      sys2_url: s2,
      sys3_url: s3,
      sys4_url: s4,
      created_by: adminUser.id,
      is_active: true,
    });

    if (insertError) {
      // Rollback Auth User creation to avoid orphaned Auth records
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return {
        success: false,
        error: `فشل تسجيل بيانات الموظف: ${insertError.message}`,
      };
    }

    return { success: true, userId: newUserId };
  } catch (err: any) {
    console.error("Add employee error:", err);
    return { success: false, error: err.message || "حدث خطأ غير متوقع." };
  }
}

/**
 * Server Action: Update Employee details
 */
export async function updateEmployee(
  id: string,
  data: Partial<EmployeeData> & { password?: string }
) {
  try {
    const adminUser = await getCurrentUser();
    if (!adminUser) {
      return { success: false, error: "غير مصرح بالعملية. الرجاء تسجيل الدخول أولاً." };
    }

    // Fetch the current profile to validate role constraints
    const { data: currentProfile, error: fetchError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", id)
      .single();

    if (fetchError || !currentProfile) {
      return { success: false, error: "لم يتم العثور على حساب الموظف المطلوب تعديله." };
    }

    let updatedRole = currentProfile.role;

    if (data.role && data.role !== currentProfile.role) {
      // Role constraints: Cannot edit role if they are admin or accountant
      if (currentProfile.role === "admin" || currentProfile.role === "accountant") {
        return {
          success: false,
          error: "لا يمكن تعديل صلاحيات حساب مدير النظام أو المحاسب.",
        };
      }

      // Can only switch between agent and senioragent
      const allowedRoles = ["agent", "senioragent"];
      if (!allowedRoles.includes(currentProfile.role) || !allowedRoles.includes(data.role)) {
        return {
          success: false,
          error: "يُسمح فقط بالتبديل بين رتبة موظف (agent) وموظف متميز (senioragent).",
        };
      }
      updatedRole = data.role;
    }

    // 1. Update profiles table
    const updateData: any = {};
    if (data.fullName !== undefined) updateData.full_name = data.fullName;
    if (data.role !== undefined) updateData.role = updatedRole;
    if (data.sheetUrls !== undefined) {
      updateData.sheet_urls = data.sheetUrls;
      if (data.sheetUrls['11111111-1111-1111-1111-111111111111'] !== undefined) {
        updateData.sys1_url = data.sheetUrls['11111111-1111-1111-1111-111111111111'] || null;
      }
      if (data.sheetUrls['22222222-2222-2222-2222-222222222222'] !== undefined) {
        updateData.sys2_url = data.sheetUrls['22222222-2222-2222-2222-222222222222'] || null;
      }
      if (data.sheetUrls['33333333-3333-3333-3333-333333333333'] !== undefined) {
        updateData.sys3_url = data.sheetUrls['33333333-3333-3333-3333-333333333333'] || null;
      }
    }
    if (data.sys1Url !== undefined) updateData.sys1_url = data.sys1Url || null;
    if (data.sys2Url !== undefined) updateData.sys2_url = data.sys2Url || null;
    if (data.sys3Url !== undefined) updateData.sys3_url = data.sys3Url || null;
    if (data.sys4Url !== undefined) updateData.sys4_url = data.sys4Url || null;

    if (Object.keys(updateData).length > 0) {
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update(updateData)
        .eq("id", id);

      if (profileError) {
        return {
          success: false,
          error: `فشل تحديث بيانات الملف الشخصي: ${profileError.message}`,
        };
      }
    }

    // 2. Update Auth password if provided
    if (data.password && data.password.trim() !== "") {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, {
        password: data.password,
      });

      if (authError) {
        return {
          success: false,
          error: `تم تحديث البيانات الشخصية ولكن فشل تغيير كلمة المرور: ${authError.message}`,
        };
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error("Update employee error:", err);
    return { success: false, error: err.message || "حدث خطأ غير متوقع." };
  }
}

/**
 * Server Action: Enable/Disable Employee Account (Toggle Status)
 */
export async function toggleEmployeeStatus(id: string, isActive: boolean) {
  try {
    const adminUser = await getCurrentUser();
    if (!adminUser) {
      return { success: false, error: "غير مصرح بالعملية. الرجاء تسجيل الدخول أولاً." };
    }

    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ is_active: isActive })
      .eq("id", id);

    if (updateError) {
      return {
        success: false,
        error: `فشل تعديل حالة الحساب: ${updateError.message}`,
      };
    }

    return { success: true };
  } catch (err: any) {
    console.error("Toggle employee status error:", err);
    return { success: false, error: err.message || "حدث خطأ غير متوقع." };
  }
}
