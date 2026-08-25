"use server";

import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { ActionResponse } from "@/lib/types";
import { createClient } from "@supabase/supabase-js";

/**
 * Helper to verify Admin role
 */
async function verifyAdminUser(adminUserId: string): Promise<boolean> {
  if (!adminUserId) return false;
  const user = await prisma.user.findUnique({
    where: { id: adminUserId },
    select: { role: true },
  });
  return user?.role === "ADMIN";
}

/**
 * 1. Fetch all Print Orders for Admin Operator Hub
 */
export async function getAllPrintOrdersAdmin(
  adminUserId: string
): Promise<ActionResponse<any[]>> {
  try {
    const rateCheck = await checkRateLimit("admin-print-orders");
    if (!rateCheck.success) {
      return { error: rateCheck.error };
    }

    const isAdmin = await verifyAdminUser(adminUserId);
    if (!isAdmin) {
      return {
        error: "Unauthorized access: Admin permissions required.",
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
  try {
    const rateCheck = await checkRateLimit("admin-status-update");
    if (!rateCheck.success) {
      return { error: rateCheck.error };
    }

    const isAdmin = await verifyAdminUser(data.adminUserId);
    if (!isAdmin) {
      return {
        error: "Unauthorized: Admin permissions required to update print order fulfillment.",
      };
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
    const rateCheck = await checkRateLimit("admin-download-url");
    if (!rateCheck.success) {
      return { error: rateCheck.error };
    }

    const isAdmin = await verifyAdminUser(data.adminUserId);
    if (!isAdmin) {
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

    // Extract bucket relative path if a full URL was provided
    let path = data.filePathOrUrl;
    if (path.includes("/documents/")) {
      path = path.split("/documents/")[1];
    } else if (path.includes("/print-queue/")) {
      path = path.split("/print-queue/")[1];
    }

    // Generate 60-second secure download link
    const { data: signData, error } = await supabaseAdmin.storage
      .from("documents")
      .createSignedUrl(path, 60);

    if (error || !signData) {
      // Fallback: If original URL is accessible, use it
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
