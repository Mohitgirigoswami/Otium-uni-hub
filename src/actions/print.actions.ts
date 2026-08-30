"use server";

import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { ActionResponse, PrintTypeEnum } from "@/lib/types";
import { getDynamicPrintRates, calculatePrintCostPaise, PrintRatesData } from "@/lib/services/print.service";
import { sendEmail } from "@/lib/mail";

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
  phoneNumber?: string;
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
      select: { id: true, isBanned: true, collegeId: true, phone: true },
    });

    if (!user) {
      return { success: false, error: "User profile not found." };
    }

    if (user.isBanned) {
      return { success: false, error: "Your account is currently restricted from submitting print jobs." };
    }

    const activeCollegeId = data.collegeId || user.collegeId || null;

    // Server-Side Independent Cost Calculation with ₹10 Minimum Floor
    const rates = await getDynamicPrintRates();
    const baseCostPaise = calculatePrintCostPaise(validPageCount, data.printType, rates);
    const rawCostPaise = baseCostPaise * validCopies;
    const MINIMUM_ORDER_PAISE = 1000; // ₹10 minimum floor to deter spam/pranks
    const totalCostPaise = Math.max(MINIMUM_ORDER_PAISE, rawCostPaise);

    // Format deliveryLocation to embed copies, UTR, Drive File ID, and optional Contact Phone
    const cleanPhoneDigits = data.phoneNumber ? data.phoneNumber.replace(/\D/g, "").slice(-10) : "";
    const contactInfo = cleanPhoneDigits ? ` | Phone: ${cleanPhoneDigits}` : "";

    const enrichedLocation = data.deliveryLocation.includes("UTR:")
      ? `${data.deliveryLocation.trim()}${!data.deliveryLocation.includes("Phone:") && cleanPhoneDigits ? contactInfo : ""}`
      : `${data.deliveryLocation.trim()}${data.copies && data.copies > 1 ? ` | Copies: ${data.copies}` : ""}${data.utr ? ` | UTR: ${data.utr}` : ""}${data.driveFileId ? ` | DriveID: ${data.driveFileId}` : ""}${contactInfo}`;

    // Atomic transaction for database integrity
    const order = await prisma.$transaction(async (tx) => {
      // Update phone number on user record if provided and valid 10 digits
      if (cleanPhoneDigits && cleanPhoneDigits.length === 10) {
        await tx.user.update({
          where: { id: data.userId },
          data: { phone: cleanPhoneDigits },
        });
      }

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
            : new Date(Date.now() + 24 * 60 * 60 * 1000),
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

    // Task 2: Trigger Post-Pay Email Invoicing upon order creation
    if (order.user?.email) {
      const totalRupees = (order.totalCost / 100).toFixed(2);
      const invoiceSubject = `Otium Print Receipt - Order #${order.id.slice(-6).toUpperCase()}`;
      const invoiceHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="color: #0d9488; margin: 0; font-size: 20px; font-weight: 800;">OTIUM UNI HUB</h2>
            <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">Campus Cloud Print Station • Next-Day Delivery</p>
          </div>

          <div style="background-color: #f8fafc; padding: 18px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
            <h3 style="margin: 0 0 12px 0; color: #1e293b; font-size: 15px; font-weight: 700;">Print Order Receipt</h3>
            <p style="margin: 6px 0; color: #475569; font-size: 13px;"><strong>Order ID:</strong> #${order.id}</p>
            <p style="margin: 6px 0; color: #475569; font-size: 13px;"><strong>Document:</strong> ${order.fileName}</p>
            <p style="margin: 6px 0; color: #475569; font-size: 13px;"><strong>Pages:</strong> ${order.pageCount} pages (${order.printType})</p>
            <p style="margin: 6px 0; color: #475569; font-size: 13px;"><strong>Delivery Location:</strong> ${order.deliveryLocation}</p>
            <div style="margin-top: 14px; padding-top: 10px; border-top: 1px dashed #cbd5e1;">
              <span style="font-size: 14px; font-weight: bold; color: #334155;">Total Amount Due: </span>
              <span style="color: #0d9488; font-size: 18px; font-weight: 900;">₹${totalRupees}</span>
            </div>
          </div>

          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0; color: #92400e; font-size: 13px; font-weight: 600; line-height: 1.5;">
              📌 This is a post-pay delivery. Please have ₹${totalRupees} ready to pay upon receiving your print.
            </p>
          </div>

          <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 20px 0 0 0;">
            Otium Uni Hub • University Student Super App. Keep this receipt for reference upon delivery.
          </p>
        </div>
      `;

      sendEmail({
        to: order.user.email,
        subject: invoiceSubject,
        html: invoiceHtml,
        text: `Otium Print Receipt - Order #${order.id}\nDocument: ${order.fileName}\nPages: ${order.pageCount} (${order.printType})\nDelivery Location: ${order.deliveryLocation}\nTotal Amount Due: ₹${totalRupees}\n\nThis is a post-pay delivery. Please have ₹${totalRupees} ready to pay upon receiving your print.`,
      }).catch((err) => {
        console.error("[Print Invoice Email Error]:", err);
      });
    }

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
