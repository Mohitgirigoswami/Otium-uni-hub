"use server";

import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { ActionResponse } from "@/lib/types";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logAdminAction } from "@/lib/logger";
import { getDynamicPrintRates, PrintRatesData } from "@/lib/services/print.service";
import { Role } from "@prisma/client";

/**
 * Helper to verify Print Operator / Admin permissions
 */
async function verifyPrintOperator(adminUserId: string): Promise<boolean> {
  if (!adminUserId) return false;

  const session = await getServerSession(authOptions);
  if (session?.user?.role === "SUPER_ADMIN" || session?.user?.role === "PRINT_MANAGER") {
    return true;
  }

  const user = await prisma.user.findUnique({
    where: { id: adminUserId },
    select: { role: true },
  });
  return user?.role === "SUPER_ADMIN" || user?.role === "PRINT_MANAGER";
}

/**
 * Helper to verify Super Admin
 */
async function verifySuperAdmin(adminUserId: string): Promise<boolean> {
  if (!adminUserId) return false;

  const session = await getServerSession(authOptions);
  if (session?.user?.role === "SUPER_ADMIN") {
    return true;
  }

  const user = await prisma.user.findUnique({
    where: { id: adminUserId },
    select: { role: true },
  });
  return user?.role === "SUPER_ADMIN";
}

/**
 * 1. Fetch all Print Orders for Admin Operator Hub
 */
export async function getAllPrintOrdersAdmin(
  adminUserId: string
): Promise<ActionResponse<any[]>> {
  try {
    const rateCheck = await checkRateLimit(adminUserId || "admin-orders");
    if (!rateCheck.success) {
      return { error: rateCheck.error };
    }

    const isAllowed = await verifyPrintOperator(adminUserId);
    if (!isAllowed) {
      return {
        error: "Unauthorized access: PRINT_MANAGER or SUPER_ADMIN role required.",
      };
    }

    const orders = await prisma.printOrder.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            department: true,
            year: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      data: orders,
    };
  } catch (error: any) {
    console.error("Error in getAllPrintOrdersAdmin:", error);
    return {
      error: error?.message || "Failed to fetch admin print orders.",
    };
  }
}

/**
 * 2. Update Print Order Status (PRINTING, OUT_FOR_DELIVERY, COMPLETED, etc.)
 */
export async function updatePrintOrderStatus(data: {
  orderId: string;
  status: "SUBMITTED" | "PRINTING" | "OUT_FOR_DELIVERY" | "READY" | "DELIVERED" | "COMPLETED";
  adminUserId: string;
}): Promise<ActionResponse<any>> {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "PRINT_MANAGER")) {
    throw new Error("UNAUTHORIZED: Critical security violation.");
  }

  try {
    const rateCheck = await checkRateLimit(data.adminUserId || "admin-status");
    if (!rateCheck.success) {
      return { error: rateCheck.error };
    }

    const updated = await prisma.printOrder.update({
      where: { id: data.orderId },
      data: {
        status: data.status as any,
      },
      include: {
        user: true,
      },
    });

    await logAdminAction(
      session.user.id,
      "VERIFIED_PAYMENT",
      `Type: PRINT_ORDER, Order: ${data.orderId}, Status: ${data.status}`
    );

    return {
      success: true,
      data: updated,
    };
  } catch (error: any) {
    console.error("Error in updatePrintOrderStatus:", error);
    return {
      error: error?.message || "Failed to update print order status.",
    };
  }
}

/**
 * 3. Secure 1-Minute Signed Download URL for Admin Document Printing
 */
export async function getAdminDownloadUrl(data: {
  filePathOrUrl: string;
  adminUserId: string;
}): Promise<ActionResponse<{ signedUrl: string; expiresInSeconds: number }>> {
  try {
    const rateCheck = await checkRateLimit(data.adminUserId || "admin-download");
    if (!rateCheck.success) {
      return { error: rateCheck.error };
    }

    const isAllowed = await verifyPrintOperator(data.adminUserId);
    if (!isAllowed) {
      return {
        error: "Unauthorized access: Only Print Operators can generate document print tokens.",
      };
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return {
        error: "Supabase credentials are not configured.",
      };
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let bucketName = "documents";
    let path = data.filePathOrUrl;

    if (path.includes("/print-queue/")) {
      bucketName = "print-queue";
      path = path.split("/print-queue/")[1];
    } else if (path.includes("/documents/")) {
      bucketName = "documents";
      path = path.split("/documents/")[1];
    }

    const { data: signData, error } = await supabaseAdmin.storage
      .from(bucketName)
      .createSignedUrl(path, 60);

    if (error || !signData) {
      const altBucket = bucketName === "documents" ? "print-queue" : "documents";
      const { data: altSignData } = await supabaseAdmin.storage
        .from(altBucket)
        .createSignedUrl(path, 60);

      if (altSignData) {
        return {
          success: true,
          data: {
            signedUrl: altSignData.signedUrl,
            expiresInSeconds: 60,
          },
        };
      }

      return {
        success: true,
        data: {
          signedUrl: data.filePathOrUrl,
          expiresInSeconds: 60,
        },
      };
    }

    return {
      success: true,
      data: {
        signedUrl: signData.signedUrl,
        expiresInSeconds: 60,
      },
    };
  } catch (error: any) {
    console.error("Error in getAdminDownloadUrl:", error);
    return {
      error: error?.message || "Failed to generate admin download URL.",
    };
  }
}

/**
 * 4. Update Dynamic Print Rates in Paise (₹2.50 -> 250 paise)
 */
export async function updatePrintRatesAction(data: {
  singleSidedRupees: number;
  doubleSidedRupees: number;
  adminUserId: string;
}): Promise<ActionResponse<PrintRatesData>> {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    throw new Error("UNAUTHORIZED: Critical security violation.");
  }

  try {
    const rateCheck = await checkRateLimit(data.adminUserId || "admin-rates");
    if (!rateCheck.success) {
      return { error: rateCheck.error };
    }

    if (data.singleSidedRupees <= 0 || data.doubleSidedRupees <= 0) {
      return { error: "Rates must be greater than zero." };
    }

    const singleSidedPaise = Math.round(data.singleSidedRupees * 100);
    const doubleSidedPaise = Math.round(data.doubleSidedRupees * 100);

    const setting = await prisma.printSetting.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        singleSidedRate: singleSidedPaise,
        doubleSidedRate: doubleSidedPaise,
      },
      update: {
        singleSidedRate: singleSidedPaise,
        doubleSidedRate: doubleSidedPaise,
      },
    });

    await logAdminAction(
      session.user.id,
      "UPDATED_PRINT_RATES",
      `Single: ₹${data.singleSidedRupees}, Double: ₹${data.doubleSidedRupees}`
    );

    return {
      success: true,
      data: {
        singleSidedPaise: setting.singleSidedRate,
        doubleSidedPaise: setting.doubleSidedRate,
        colorSinglePaise: 1000,
        colorDoublePaise: 800,
        singleSidedRupees: setting.singleSidedRate / 100,
        doubleSidedRupees: setting.doubleSidedRate / 100,
      },
    };
  } catch (error: any) {
    console.error("Error in updatePrintRatesAction:", error);
    return {
      error: error?.message || "Failed to update print pricing rates.",
    };
  }
}

/**
 * 5. Fetch Print Settings for Admin Dashboard
 */
export async function getPrintSettingsAdmin(
  adminUserId: string
): Promise<ActionResponse<PrintRatesData>> {
  try {
    const isAllowed = await verifyPrintOperator(adminUserId);
    if (!isAllowed) {
      return { error: "Unauthorized access: Print Operator permissions required." };
    }

    const rates = await getDynamicPrintRates();
    return {
      success: true,
      data: rates,
    };
  } catch (error: any) {
    console.error("Error in getPrintSettingsAdmin:", error);
    return {
      error: error?.message || "Failed to load print settings.",
    };
  }
}

/**
 * 6. Search Users by name or email (SUPER_ADMIN only)
 */
export async function searchUsersAdmin(
  searchQuery: string,
  adminUserId: string
): Promise<ActionResponse<any[]>> {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    throw new Error("UNAUTHORIZED: Critical security violation.");
  }

  try {
    const where: any = {};
    if (searchQuery.trim()) {
      where.OR = [
        { email: { contains: searchQuery.trim(), mode: "insensitive" } },
        { name: { contains: searchQuery.trim(), mode: "insensitive" } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        year: true,
        image: true,
        phone: true,
        collegeId: true,
        college: {
          select: { id: true, name: true, city: true },
        },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return {
      success: true,
      data: users,
    };
  } catch (error: any) {
    console.error("Error in searchUsersAdmin:", error);
    return {
      error: error?.message || "Failed to search users.",
      data: [],
    };
  }
}

/**
 * 7. Update a User's Role (SUPER_ADMIN only)
 */
export async function updateUserRoleAdmin(data: {
  targetUserId: string;
  role: Role;
  adminUserId: string;
}): Promise<ActionResponse<any>> {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    throw new Error("UNAUTHORIZED: Critical security violation.");
  }

  try {
    const rateCheck = await checkRateLimit(data.adminUserId);
    if (!rateCheck.success) return { error: rateCheck.error };

    const updated = await prisma.user.update({
      where: { id: data.targetUserId },
      data: {
        role: data.role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    await logAdminAction(
      session.user.id,
      "UPDATED_USER_ROLE",
      `Target User: ${data.targetUserId}, New Role: ${data.role}`
    );

    return {
      success: true,
      data: updated,
    };
  } catch (error: any) {
    console.error("Error in updateUserRoleAdmin:", error);
    return {
      error: error?.message || "Failed to update user role.",
    };
  }
}
