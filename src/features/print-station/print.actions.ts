"use server";

import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { ActionResponse } from "@/lib/types";
import { getDynamicPrintRates, calculatePrintCostPaise } from "./print.service";
import { PrintRatesData, CreatePrintOrderParams, ReportPrintIssueParams } from "./print.types";
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
export async function createPrintOrder(data: CreatePrintOrderParams): Promise<ActionResponse<any>> {
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

    // Server-Side Independent Cost Calculation with ₹5 Minimum Floor
    const rates = await getDynamicPrintRates();
    const baseCostPaise = calculatePrintCostPaise(validPageCount, data.printType, rates);
    const rawCostPaise = baseCostPaise * validCopies;
    const MINIMUM_ORDER_PAISE = 500; // ₹5 minimum floor to deter spam/pranks
    const totalCostPaise = Math.max(MINIMUM_ORDER_PAISE, rawCostPaise);

    // Format deliveryLocation to embed copies, UTR, Drive File ID, and optional Contact Phone
    const cleanPhoneDigits = data.phoneNumber ? data.phoneNumber.replace(/\D/g, "").slice(-10) : "";
    const contactInfo = cleanPhoneDigits ? ` | Phone: ${cleanPhoneDigits}` : "";

    const enrichedLocation = data.deliveryLocation.includes("UTR:")
      ? `${data.deliveryLocation.trim()}${!data.deliveryLocation.includes("Phone:") && cleanPhoneDigits ? contactInfo : ""}`
      : `${data.deliveryLocation.trim()}${data.copies && data.copies > 1 ? ` | Copies: ${data.copies}` : ""}${data.utr ? ` | UTR: ${data.utr}` : ""}${data.driveFileId ? ` | DriveID: ${data.driveFileId}` : ""}${contactInfo}`;

    const activeCollegeId = data.collegeId || user.collegeId || null;

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
          collegeId: activeCollegeId,
          fileName: data.fileName.trim(),
          fileUrl: data.fileUrl?.trim() || null,
          pageCount: validPageCount,
          printType: data.printType as any,
          deliveryLocation: enrichedLocation,
          deliverySlot: data.deliverySlot?.trim() || null,
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

    // Trigger Email Receipt upon order creation
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
            ${order.deliverySlot ? `<p style="margin: 6px 0; color: #475569; font-size: 13px;"><strong>Delivery Slot:</strong> ${order.deliverySlot}</p>` : ""}
            <div style="margin-top: 14px; padding-top: 10px; border-top: 1px dashed #cbd5e1;">
              <span style="font-size: 14px; font-weight: bold; color: #334155;">Total Paid: </span>
              <span style="color: #0d9488; font-size: 18px; font-weight: 900;">₹${totalRupees}</span>
            </div>
          </div>

          <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0; color: #065f46; font-size: 13px; font-weight: 600; line-height: 1.5;">
              ✅ Payment received via advance UPI. Your print order is queued for campus processing and delivery.
            </p>
          </div>

          <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 20px 0 0 0;">
            Otium Uni Hub • University Student Super App. Keep this receipt for reference.
          </p>
        </div>
      `;

      sendEmail({
        to: order.user.email,
        subject: invoiceSubject,
        html: invoiceHtml,
        text: `Otium Print Receipt - Order #${order.id}\nDocument: ${order.fileName}\nPages: ${order.pageCount} (${order.printType})\nDelivery Location: ${order.deliveryLocation}\nTotal Paid: ₹${totalRupees}\n\nPayment received via advance UPI. Your order is queued for campus processing and delivery.`,
      }).catch((err) => {
        console.error("[Print Invoice Email Error]:", err);
      });
    }

    // Trigger one-way in-app dispatch message into student chat inbox
    const paidRupees = (order.totalCost / 100).toFixed(2);
    sendPrintStationMessage(
      order.userId,
      `🖨️ Order #${order.id.slice(-6).toUpperCase()} received: ${order.fileName} (${order.pageCount} pgs, ${order.printType}, ₹${paidRupees}). Scheduled delivery: ${order.deliverySlot || "Next Available Slot"} at ${order.deliveryLocation}.`
    ).catch((err) => console.error("[Print Order In-App Msg Error]:", err));

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

/**
 * One-way in-app dispatch message from "Express Print Station" system bot to student chat inbox
 */
export async function sendPrintStationMessage(
  userId: string,
  content: string
): Promise<ActionResponse<any>> {
  try {
    if (!userId || !content) return { success: false, error: "Invalid parameters." };

    // 1. Get or create system Print Desk user
    const systemUser = await prisma.user.upsert({
      where: { email: "printing@otiumhub.in" },
      update: {},
      create: {
        name: "Express Print Station",
        email: "printing@otiumhub.in",
        role: "PRINT_MANAGER",
        image: "https://api.dicebear.com/9.x/bottts/svg?seed=print-desk",
      },
    });

    if (systemUser.id === userId) return { success: true };

    // 2. Get or create direct conversation between Print Desk and Student
    let conversation = await prisma.conversation.findFirst({
      where: {
        isAnonymousChat: false,
        OR: [
          { participantOneId: systemUser.id, participantTwoId: userId },
          { participantOneId: userId, participantTwoId: systemUser.id },
        ],
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          participantOneId: systemUser.id,
          participantTwoId: userId,
          isAnonymousChat: false,
        },
      });
    }

    // 3. Insert one-way automated dispatch message
    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: systemUser.id,
        content: content.trim(),
      },
    });

    // Update conversation timestamp for sorting
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    return { success: true, data: message };
  } catch (error: any) {
    console.error("[sendPrintStationMessage Error]:", error);
    return { success: false, error: error?.message };
  }
}

/**
 * Report problem or issue on an existing print order
 */
export async function reportPrintOrderIssue(data: ReportPrintIssueParams): Promise<ActionResponse<any>> {
  try {
    if (!data.orderId || !data.userId || !data.reason?.trim()) {
      return { success: false, error: "Order ID and issue reason are required." };
    }

    const order = await prisma.printOrder.findUnique({
      where: { id: data.orderId },
      include: { user: true },
    });

    if (!order) {
      return { success: false, error: "Print order not found." };
    }

    if (order.userId !== data.userId) {
      return { success: false, error: "You can only report issues on your own print orders." };
    }

    const categoryText = data.category || "General Issue";
    const cleanReason = data.reason.trim();
    const updatedLocation = `${order.deliveryLocation} | ISSUE [${categoryText}]: ${cleanReason}`;

    const updated = await prisma.printOrder.update({
      where: { id: data.orderId },
      data: {
        status: "ISSUE_REPORTED",
        deliveryLocation: updatedLocation,
      },
    });

    // Send one-way in-app dispatch to the student's conversation inbox
    await sendPrintStationMessage(
      data.userId,
      `⚠️ Issue Reported for Order #${order.id.slice(-6).toUpperCase()} (${categoryText}):\n"${cleanReason}"\n\nOur campus print manager has been alerted and is reviewing this order.`
    );

    return {
      success: true,
      data: updated,
    };
  } catch (error: any) {
    console.error("Error in reportPrintOrderIssue:", error);
    return {
      success: false,
      error: error?.message || "Failed to report issue on print order.",
    };
  }
}
