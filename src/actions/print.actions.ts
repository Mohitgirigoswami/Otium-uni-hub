"use server";

import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { ActionResponse, PrintTypeEnum } from "@/lib/types";
import { getDynamicPrintRates, calculatePrintCostPaise, PrintRatesData } from "@/lib/services/print.service";

/**
 * Fetch dynamic print pricing rates
 */
export async function getPrintRatesAction(): Promise<ActionResponse<PrintRatesData>> {
  try {
    const rates = await getDynamicPrintRates();
    return {
      success: true,
      data: rates,
    };
  } catch (error: any) {
    console.error("Error in getPrintRatesAction:", error);
    return {
      success: false,
      error: error?.message || "Failed to load print rates.",
    };
  }
}

/**
 * Fetch all print orders for a student user
 */
export async function getPrintOrders(userId: string): Promise<ActionResponse<any[]>> {
  try {
    if (!userId) {
      return { success: false, error: "User ID is required." };
    }

    const orders = await prisma.printOrder.findMany({
      where: { userId },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      data: orders,
    };
  } catch (error: any) {
    console.error("Error in getPrintOrders:", error);
    return {
      success: false,
      error: error?.message || "Failed to fetch print orders.",
      data: [],
    };
  }
}

/**
 * Submit a cloud print order using dynamic per-page pricing & Google Drive direct storage
 */
export async function createPrintOrder(data: {
  userId: string;
  fileName: string;
  fileUrl?: string;
  driveFileId?: string;
  pageCount: number;
  copies?: number;
  printType: PrintTypeEnum;
  deliveryLocation: string;
  utr?: string;
  expectedDelivery?: string;
  collegeId?: string | null;
}): Promise<ActionResponse<any>> {
  try {
    if (!data.userId) {
      return { success: false, error: "Authentication required to submit print orders." };
    }

    const rateCheck = await checkRateLimit(data.userId);
    if (!rateCheck.success) {
      return { success: false, error: rateCheck.error };
    }

    if (!data.fileName?.trim()) {
      return { success: false, error: "Document file name is required." };
    }

    if (!data.fileUrl?.trim() && !data.driveFileId?.trim()) {
      return { success: false, error: "Document file URL or Google Drive file ID is required." };
    }

    const validPageCount = Number(data.pageCount);
    if (isNaN(validPageCount) || validPageCount < 1) {
      return { success: false, error: "Valid auto-calculated page count (>= 1) is required." };
    }

    const validCopies = Math.max(1, Number(data.copies) || 1);

    if (!data.deliveryLocation?.trim()) {
      return { success: false, error: "Delivery location anywhere on campus is required." };
    }

    // Verify user existence and get campus
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { id: true, isBanned: true, collegeId: true },
    });

    if (!user) {
      return { success: false, error: "User profile not found." };
    }

    if (user.isBanned) {
      return { success: false, error: "Your account is currently restricted from submitting print jobs." };
    }

    const activeCollegeId = data.collegeId || user.collegeId || null;

    // Server-Side Independent Cost Calculation
    const rates = await getDynamicPrintRates();
    const baseCostPaise = calculatePrintCostPaise(validPageCount, data.printType, rates);
    const totalCostPaise = baseCostPaise * validCopies;

    // Format deliveryLocation to embed copies, UTR, and Drive File ID
    const enrichedLocation = data.deliveryLocation.includes("UTR:")
      ? data.deliveryLocation.trim()
      : `${data.deliveryLocation.trim()}${data.copies && data.copies > 1 ? ` | Copies: ${data.copies}` : ""}${data.utr ? ` | UTR: ${data.utr}` : ""}${data.driveFileId ? ` | DriveID: ${data.driveFileId}` : ""}`;

    // Atomic transaction for database integrity
    const order = await prisma.$transaction(async (tx) => {
      return tx.printOrder.create({
        data: {
          userId: data.userId,
          fileName: data.fileName.trim(),
          fileUrl: data.fileUrl?.trim() || null,
          pageCount: validPageCount,
          printType: data.printType as any,
          deliveryLocation: enrichedLocation,
          expectedDelivery: data.expectedDelivery
            ? new Date(data.expectedDelivery)
            : new Date(Date.now() + 2 * 60 * 60 * 1000),
          totalCost: totalCostPaise,
          status: "SUBMITTED",
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, phone: true },
          },
        },
      });
    });

    return {
      success: true,
      data: order,
    };
  } catch (error: any) {
    console.error("Error in createPrintOrder:", error);
    return {
      success: false,
      error: error?.message || "Failed to submit print order. Please try again.",
    };
  }
}
