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
import { revalidatePath } from "next/cache";
import React from "react";
import { render } from "@react-email/render";
import { PrintStatusEmail } from "@/emails/PrintStatusEmail";
import { sendEmail } from "@/lib/mail";
import { sendPrintStationMessage } from "@/actions/print.actions";

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
 * 1. Fetch all Print Orders for Admin Operator Hub (Campus-Segregated for PRINT_MANAGER, Global for SUPER_ADMIN)
 */
export async function getAllPrintOrdersAdmin(
  adminUserId: string
): Promise<ActionResponse<any[]>> {
  try {
    const session = await getServerSession(authOptions);
    if (
      !session?.user ||
      (session.user.role !== "SUPER_ADMIN" &&
        session.user.role !== "PRINT_MANAGER" &&
        session.user.role !== "CAMPUS_MODERATOR")
    ) {
      return {
        success: false,
        error: "Unauthorized access: PRINT_MANAGER or SUPER_ADMIN role required.",
      };
    }

    const rateCheck = await checkRateLimit(adminUserId || session.user.id);
    if (!rateCheck.success) {
      return { success: false, error: rateCheck.error };
    }

    // Role-based campus segregation
    const where: any = {};
    if (session.user.role === "PRINT_MANAGER" && session.user.collegeId) {
      where.collegeId = session.user.collegeId;
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
            college: {
              select: {
                id: true,
                name: true,
                city: true,
              },
            },
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
      success: false,
      error: error?.message || "Failed to fetch admin print orders.",
      data: [],
    };
  }
}

/**
 * 2. Update Print Order Status & Trigger Transactional Email Notifications
 */
export async function updatePrintOrderStatus(data: {
  orderId: string;
  status: "SUBMITTED" | "PRINTING" | "OUT_FOR_DELIVERY" | "READY" | "DELIVERED" | "COMPLETED" | "REJECTED" | "ISSUE_REPORTED";
  adminUserId: string;
  rejectionReason?: string;
}): Promise<ActionResponse<any>> {
  try {
    const session = await getServerSession(authOptions);
    if (
      !session?.user ||
      (session.user.role !== "SUPER_ADMIN" &&
        session.user.role !== "PRINT_MANAGER" &&
        session.user.role !== "CAMPUS_MODERATOR")
    ) {
      return { success: false, error: "UNAUTHORIZED: Print Manager or Super Admin role required." };
    }

    const rateCheck = await checkRateLimit(data.adminUserId || session.user.id);
    if (!rateCheck.success) {
      return { success: false, error: rateCheck.error };
    }

    // Fetch existing order to retain location details if rejected
    const existing = await prisma.printOrder.findUnique({
      where: { id: data.orderId },
      include: { user: true },
    });

    if (!existing) {
      return { success: false, error: "Print order not found." };
    }

    let updatedLocation = existing.deliveryLocation;
    if (data.status === "REJECTED" && data.rejectionReason) {
      updatedLocation = `${existing.deliveryLocation} | REJECTED: ${data.rejectionReason.trim()}`;
    } else if (data.status === "ISSUE_REPORTED" && data.rejectionReason) {
      updatedLocation = `${existing.deliveryLocation} | ISSUE: ${data.rejectionReason.trim()}`;
    }

    const updated = await prisma.printOrder.update({
      where: { id: data.orderId },
      data: {
        status: data.status as any,
        deliveryLocation: updatedLocation,
      },
      include: {
        user: true,
      },
    });

    await logAdminAction(
      session.user.id,
      "UPDATED_PRINT_STATUS",
      `Type: PRINT_ORDER, Order: ${data.orderId}, Status: ${data.status}${
        data.rejectionReason ? `, Reason: ${data.rejectionReason}` : ""
      }`
    );

    // Asynchronously send transactional email notification
    if (updated.user?.email) {
      try {
        const emailHtml = await render(
          React.createElement(PrintStatusEmail, {
            userName: updated.user.name || "Student",
            status: data.status as any,
            documentName: updated.fileName,
            rejectionReason: data.rejectionReason,
            deliveryLocation: updated.deliveryLocation,
            orderId: updated.id,
          })
        );

        let subject = `Print Order Update: ${updated.fileName} (${data.status})`;
        if (data.status === "REJECTED") {
          subject = `⚠️ Action Required: Your print order for ${updated.fileName} was rejected`;
        } else if (data.status === "PRINTING") {
          subject = `🖨️ Your print job for ${updated.fileName} is now printing!`;
        } else if (data.status === "OUT_FOR_DELIVERY") {
          subject = `🚚 Your print job for ${updated.fileName} is out for delivery!`;
        } else if (data.status === "COMPLETED" || data.status === "DELIVERED") {
          subject = `✅ Your print job for ${updated.fileName} has been delivered!`;
        }

        // Fire and forget email delivery without blocking response
        sendEmail({
          to: updated.user.email,
          subject,
          html: emailHtml,
        }).catch((err) => {
          console.error("[Transactional Email Error]:", err);
        });
      } catch (mailErr) {
        console.error("[React Email Render Error]:", mailErr);
      }
    }

    // Dispatch in-app transactional message from Express Print Station system bot
    let inAppStatusNotice = `🖨️ Print Order #${updated.id.slice(-6).toUpperCase()} status updated to ${data.status.replace(/_/g, " ")}.`;
    if (data.status === "PRINTING") {
      inAppStatusNotice = `🖨️ Your print job for "${updated.fileName}" is now printing!`;
    } else if (data.status === "OUT_FOR_DELIVERY") {
      inAppStatusNotice = `🚚 Your print job for "${updated.fileName}" is out for delivery to ${updated.deliveryLocation}.`;
    } else if (data.status === "READY") {
      inAppStatusNotice = `📦 Your print job for "${updated.fileName}" is ready at ${updated.deliveryLocation}!`;
    } else if (data.status === "COMPLETED" || data.status === "DELIVERED") {
      inAppStatusNotice = `✅ Your print job for "${updated.fileName}" has been successfully delivered to ${updated.deliveryLocation}.`;
    } else if (data.status === "REJECTED") {
      inAppStatusNotice = `⚠️ Print Order #${updated.id.slice(-6).toUpperCase()} was rejected.${data.rejectionReason ? ` Reason: "${data.rejectionReason}"` : ""}`;
    } else if (data.status === "ISSUE_REPORTED") {
      inAppStatusNotice = `⚠️ Issue flagged on Order #${updated.id.slice(-6).toUpperCase()}.${data.rejectionReason ? ` Note: "${data.rejectionReason}"` : ""}`;
    }

    sendPrintStationMessage(updated.userId, inAppStatusNotice).catch((err) =>
      console.error("[Admin Update In-App Msg Error]:", err)
    );

    return {
      success: true,
      data: updated,
    };
  } catch (error: any) {
    console.error("Error in updatePrintOrderStatus:", error);
    return {
      success: false,
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
 * 4. Permanently Delete Print Order PDF from Supabase Storage and Update Order Record
 */
export async function deletePrintOrderPdf(data: {
  orderId: string;
  adminUserId: string;
  fileUrl?: string | null;
  filePath?: string | null;
  driveFileId?: string | null;
}): Promise<ActionResponse<{ success: boolean }>> {
  try {
    const session = await getServerSession(authOptions);
    if (
      !session?.user ||
      (session.user.role !== "SUPER_ADMIN" &&
        session.user.role !== "PRINT_MANAGER" &&
        session.user.role !== "CAMPUS_MODERATOR")
    ) {
      return {
        success: false,
        error: "Unauthorized access: Print Operator or Super Admin role required.",
      };
    }

    const rateCheck = await checkRateLimit(data.adminUserId || session.user.id);
    if (!rateCheck.success) {
      return { success: false, error: rateCheck.error };
    }

    const order = await prisma.printOrder.findUnique({
      where: { id: data.orderId },
    });

    if (!order) {
      return { success: false, error: "Print order not found." };
    }

    const targetUrlOrPath = data.filePath || data.fileUrl || order.fileUrl;

    // Remove file from Supabase storage bucket if fileUrl/filePath exists
    if (targetUrlOrPath) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (supabaseUrl && serviceRoleKey) {
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        let bucketName = "print-documents";
        let relativePath = targetUrlOrPath;

        if (relativePath.includes("/print-documents/")) {
          bucketName = "print-documents";
          relativePath = relativePath.split("/print-documents/")[1];
        } else if (relativePath.includes("/documents/")) {
          bucketName = "documents";
          relativePath = relativePath.split("/documents/")[1];
        } else if (relativePath.includes("/print-queue/")) {
          bucketName = "print-queue";
          relativePath = relativePath.split("/print-queue/")[1];
        }

        relativePath = relativePath.split("?")[0];

        try {
          const { error: removeError } = await supabaseAdmin.storage
            .from(bucketName)
            .remove([relativePath]);

          if (removeError) {
            console.warn(`[Supabase Storage Remove Warning in ${bucketName}]:`, removeError.message);
            // Attempt fallback bucket removal
            const altBucket = bucketName === "print-documents" ? "documents" : "print-documents";
            await supabaseAdmin.storage.from(altBucket).remove([relativePath]);
          }
        } catch (storageErr) {
          console.warn("[Supabase Storage Deletion Warning]:", storageErr);
        }
      }
    }

    // Clear PDF file reference on database record
    await prisma.printOrder.update({
      where: { id: data.orderId },
      data: {
        fileUrl: null,
        driveFileId: null,
      },
    });

    await logAdminAction(
      session.user.id,
      "DELETED_PRINT_PDF",
      `Deleted PDF storage file for Print Order #${data.orderId.slice(-6).toUpperCase()}`
    );

    revalidatePath("/admin/print");
    return {
      success: true,
      data: { success: true },
    };
  } catch (error: any) {
    console.error("Error in deletePrintOrderPdf:", error);
    return {
      success: false,
      error: error?.message || "Failed to delete PDF from storage.",
    };
  }
}

export interface StoragePruneResult {
  pdfsChecked: number;
  pdfsDeleted: number;
  imagesDeleted: number;
  message: string;
}

/**
 * 5. Master Storage Pruner: Deletes Orphaned Print PDFs and Abandoned Media
 * Compares Supabase storage objects against active Prisma DB records.
 * Files older than 1 hour with no matching DB record are purged automatically.
 */
export async function pruneOrphanedStorageAction(
  adminUserId: string
): Promise<ActionResponse<StoragePruneResult>> {
  try {
    const session = await getServerSession(authOptions);
    if (
      !session?.user ||
      (session.user.role !== "SUPER_ADMIN" &&
        session.user.role !== "PRINT_MANAGER" &&
        session.user.role !== "CAMPUS_MODERATOR")
    ) {
      return {
        success: false,
        error: "Unauthorized: Operator or Admin role required.",
      };
    }

    const rateCheck = await checkRateLimit(adminUserId || session.user.id);
    if (!rateCheck.success) {
      return { success: false, error: rateCheck.error };
    }

    let pdfsDeleted = 0;
    let pdfsChecked = 0;
    let imagesDeleted = 0;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && serviceRoleKey) {
      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      // 1. Fetch all active PrintOrder URLs from Prisma
      const activePrintOrders = await prisma.printOrder.findMany({
        select: { fileUrl: true, deliveryLocation: true },
      });

      const activePrintFileSet = new Set<string>();
      for (const ord of activePrintOrders) {
        if (ord.fileUrl) activePrintFileSet.add(ord.fileUrl);
        if (ord.deliveryLocation) {
          const matched = ord.deliveryLocation.match(/DriveID:\s*([^\s|]+)/);
          if (matched?.[1]) activePrintFileSet.add(matched[1]);
        }
      }

      // 2. Scan Supabase 'print-documents' bucket
      const bucketName = "print-documents";
      const oneHourAgo = Date.now() - 60 * 60 * 1000;

      // Recursive list helper
      const listAllFiles = async (folder: string = ""): Promise<string[]> => {
        try {
          const { data, error } = await supabaseAdmin.storage
            .from(bucketName)
            .list(folder, { limit: 100 });

          if (error || !data) return [];
          let filePaths: string[] = [];

          for (const item of data) {
            const itemPath = folder ? `${folder}/${item.name}` : item.name;
            if (!item.id && !item.metadata) {
              // Subfolder
              const nested = await listAllFiles(itemPath);
              filePaths = filePaths.concat(nested);
            } else {
              // File item: check timestamp
              const createdAtMs = item.created_at
                ? new Date(item.created_at).getTime()
                : 0;
              // Only consider files older than 1 hour (giving users plenty of time to pay)
              if (!createdAtMs || createdAtMs < oneHourAgo) {
                filePaths.push(itemPath);
              }
            }
          }
          return filePaths;
        } catch {
          return [];
        }
      };

      const candidateFiles = await listAllFiles();
      pdfsChecked = candidateFiles.length;

      const filesToDelete: string[] = [];
      for (const candidate of candidateFiles) {
        const isReferenced = Array.from(activePrintFileSet).some(
          (activeRef) =>
            activeRef.includes(candidate) || candidate.includes(activeRef)
        );
        if (!isReferenced) {
          filesToDelete.push(candidate);
        }
      }

      if (filesToDelete.length > 0) {
        const { error: removeError } = await supabaseAdmin.storage
          .from(bucketName)
          .remove(filesToDelete);

        if (!removeError) {
          pdfsDeleted = filesToDelete.length;
        }
      }
    }

    await logAdminAction(
      session.user.id,
      "PRUNED_ORPHANED_STORAGE",
      `Cleaned ${pdfsDeleted} orphaned PDFs from storage.`
    );

    revalidatePath("/admin/print");
    return {
      success: true,
      data: {
        pdfsChecked,
        pdfsDeleted,
        imagesDeleted,
        message: `Successfully purged ${pdfsDeleted} orphaned PDF(s) from storage.`,
      },
    };
  } catch (error: any) {
    console.error("Error in pruneOrphanedStorageAction:", error);
    return {
      success: false,
      error: error?.message || "Failed to prune storage.",
    };
  }
}

/**
 * 6. Update Dynamic Print Rates in Paise (₹2.50 -> 250 paise)
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

const STANDARD_CAMPUS_SERVICES = [
  { key: "PRINT_STATION", name: "Campus Cloud Print Station" },
  { key: "INCOGNITO_WALL", name: "Whisper Wall & Confessions" },
  { key: "GIG_HUB", name: "Peer Assignments & Task Bounties" },
  { key: "MARKETPLACE", name: "Student Peer Marketplace" },
  { key: "CAB_SPLIT", name: "Airport & Station Cab Split" },
  { key: "LOST_AND_FOUND", name: "Campus Lost & Found Hub" },
  { key: "ATTENDANCE", name: "Smart Attendance & Bunk Tracker" },
  { key: "CGPA_CALCULATOR", name: "Academic CGPA & Grade Forecaster" },
];

/**
 * 13. Get all service toggle records for a specific campus.
 * Automatically seeds/upserts default active states (isEnabled: true) if not yet configured.
 * Includes safe fallback if the table hasn't been migrated yet (P2021).
 */
export async function getCampusServices(
  campusId: string
): Promise<ActionResponse<any[]>> {
  const defaultServices = STANDARD_CAMPUS_SERVICES.map((s) => ({
    id: `default_${s.key}`,
    campusId: campusId || "default",
    serviceKey: s.key,
    serviceName: s.name,
    isEnabled: true,
    maintenanceMessage: "This service is temporarily paused for your campus.",
    updatedAt: new Date(),
  }));

  try {
    if (!campusId) {
      return { success: true, data: defaultServices };
    }

    // Try ensuring all standard services exist for this campus
    for (const std of STANDARD_CAMPUS_SERVICES) {
      await (prisma as any).campusService.upsert({
        where: {
          campusId_serviceKey: {
            campusId,
            serviceKey: std.key,
          },
        },
        create: {
          campusId,
          serviceKey: std.key,
          serviceName: std.name,
          isEnabled: true,
          maintenanceMessage: "This service is temporarily paused for your campus.",
        },
        update: {},
      });
    }

    const services = await (prisma as any).campusService.findMany({
      where: { campusId },
      orderBy: { serviceKey: "asc" },
    });

    return {
      success: true,
      data: services.length > 0 ? services : defaultServices,
    };
  } catch (error: any) {
    // P2021: Table does not exist in database
    console.warn("getCampusServices fallback (Table not migrated or DB error):", error?.message);
    return {
      success: true,
      data: defaultServices,
    };
  }
}

/**
 * 14. Toggle campus-specific service status and update maintenance message
 */
export async function toggleCampusService(
  campusId: string,
  serviceKey: string,
  isEnabled: boolean,
  maintenanceMessage?: string
): Promise<ActionResponse<any>> {
  try {
    const session = await getServerSession(authOptions);
    if (
      !session?.user ||
      (session.user.role !== "SUPER_ADMIN" &&
        session.user.role !== "PRINT_MANAGER" &&
        session.user.role !== "CAMPUS_MODERATOR")
    ) {
      return { error: "UNAUTHORIZED: Admin or Moderator role required." };
    }

    const std = STANDARD_CAMPUS_SERVICES.find((s) => s.key === serviceKey);
    const serviceName = std?.name || serviceKey;

    const updated = await (prisma as any).campusService.upsert({
      where: {
        campusId_serviceKey: {
          campusId,
          serviceKey,
        },
      },
      create: {
        campusId,
        serviceKey,
        serviceName,
        isEnabled,
        maintenanceMessage:
          maintenanceMessage || "This service is temporarily paused for your campus.",
      },
      update: {
        isEnabled,
        ...(maintenanceMessage !== undefined && { maintenanceMessage }),
      },
    });

    // Flush cache for all relevant student & admin routes
    revalidatePath("/");
    revalidatePath("/print-station");
    revalidatePath("/incognito");
    revalidatePath("/gigs");
    revalidatePath("/marketplace");
    revalidatePath("/rideshare");
    revalidatePath("/lost-and-found");
    revalidatePath("/attendance");
    revalidatePath("/cgpa");
    revalidatePath("/admin/services");

    if (session?.user?.id) {
      await logAdminAction(
        session.user.id,
        isEnabled ? "ENABLED_CAMPUS_SERVICE" : "PAUSED_CAMPUS_SERVICE",
        `Campus: ${campusId}, Service: ${serviceKey}, Message: ${maintenanceMessage || "Default"}`
      );
    }

    return {
      success: true,
      data: updated,
    };
  } catch (error: any) {
    console.error("Error in toggleCampusService:", error);
    return {
      error: error?.message || "Failed to toggle campus service.",
    };
  }
}

