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
      error: error?.message || "Failed to load print rates.",
    };
  }
}

/**
 * Fetch all print orders for a user
 */
export async function getPrintOrders(userId: string): Promise<ActionResponse<any[]>> {
  try {
    const orders = await prisma.printOrder.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      data: orders,
    };
  } catch (error: any) {
    console.error("Error in getPrintOrders:", error);
    return {
      error: error?.message || "Failed to fetch print orders.",
      data: [],
    };
  }
}

/**
 * Submit a cloud print order using dynamic per-page pricing
 */
export async function createPrintOrder(data: {
  userId: string;
  fileName: string;
  fileUrl?: string;
  pageCount: number;
  printType: PrintTypeEnum;
  deliveryLocation: string;
  expectedDelivery: string;
}): Promise<ActionResponse<any>> {
  try {
    const rateCheck = await checkRateLimit(data.userId);
    if (!rateCheck.success) {
      return { error: rateCheck.error };
    }

    if (!data.fileName?.trim()) return { error: "File name is required." };
    if (!data.pageCount || data.pageCount < 1) {
      return { error: "Valid page count is required." };
    }
    if (!data.deliveryLocation?.trim()) {
      return { error: "Delivery hostel/room/library location is required." };
    }

    // Fetch dynamic rates from PrintSetting
    const rates = await getDynamicPrintRates();
    const totalCostPaise = calculatePrintCostPaise(data.pageCount, data.printType, rates);

    const order = await prisma.printOrder.create({
      data: {
        userId: data.userId,
        fileName: data.fileName.trim(),
        fileUrl: data.fileUrl || null,
        pageCount: Number(data.pageCount),
        printType: data.printType as any,
        deliveryLocation: data.deliveryLocation.trim(),
        expectedDelivery: data.expectedDelivery
          ? new Date(data.expectedDelivery)
          : new Date(Date.now() + 2 * 60 * 60 * 1000),
        totalCost: totalCostPaise,
        status: "SUBMITTED",
      },
    });

    return {
      success: true,
      data: order,
    };
  } catch (error: any) {
    console.error("Error in createPrintOrder:", error);
    return {
      error: error?.message || "Failed to submit print order.",
    };
  }
}
