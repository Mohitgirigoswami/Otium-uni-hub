import { prisma } from "@/lib/prisma";
import { ActionResponse } from "@/lib/types";
import {
  WalletDetails,
  WalletTransactionDTO,
  WalletTopupRequestDTO,
  SubmitTopupParams,
  WalletAdminOverviewDTO,
} from "./wallet.types";
import { sendTopupTelegramAlert, isTelegramConfigured } from "@/lib/telegram";

/**
 * Otium Campus Wallet - Core Ledger Service
 * Strictly enforces integer Paise currency (1 INR = 100 Paise)
 * and atomic double-entry persistence.
 */

/**
 * Fetch full wallet state including live balance, audit history, and pending top-ups
 */
export async function getWalletDetails(userId: string): Promise<ActionResponse<WalletDetails>> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, walletBalancePaise: true },
    });

    if (!user) {
      return { success: false, error: "User account not found." };
    }

    const [transactions, pendingTopups] = await Promise.all([
      prisma.walletTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.walletTopupRequest.findMany({
        where: { userId, status: "PENDING" },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const formattedTxs: WalletTransactionDTO[] = transactions.map((t) => ({
      id: t.id,
      type: t.type,
      amountPaise: t.amountPaise,
      amountRupees: t.amountPaise / 100,
      balanceAfterPaise: t.balanceAfterPaise,
      balanceAfterRupees: t.balanceAfterPaise / 100,
      utr: t.utr,
      referenceId: t.referenceId,
      description: t.description,
      createdAt: t.createdAt.toISOString(),
    }));

    const formattedTopups: WalletTopupRequestDTO[] = pendingTopups.map((r) => ({
      id: r.id,
      userId: r.userId,
      amountPaise: r.amountPaise,
      amountRupees: r.amountPaise / 100,
      utr: r.utr,
      status: r.status as any,
      rejectionReason: r.rejectionReason,
      verifiedBy: r.verifiedBy,
      createdAt: r.createdAt.toISOString(),
      verifiedAt: r.verifiedAt ? r.verifiedAt.toISOString() : null,
    }));

    return {
      success: true,
      data: {
        balancePaise: user.walletBalancePaise,
        balanceRupees: user.walletBalancePaise / 100,
        transactions: formattedTxs,
        pendingTopups: formattedTopups,
      },
    };
  } catch (error: any) {
    console.error("[getWalletDetails Error]:", error);
    return { success: false, error: error.message || "Failed to load wallet details." };
  }
}

/**
 * Submit a wallet top-up recharge request with 12-digit UTR verification
 */
export async function submitWalletTopupRequest(
  params: SubmitTopupParams
): Promise<ActionResponse<WalletTopupRequestDTO>> {
  try {
    const { userId, amountPaise, utr } = params;

    if (!userId) {
      return { success: false, error: "Authentication required to recharge wallet." };
    }

    if (!amountPaise || amountPaise < 2000) {
      return { success: false, error: "Minimum wallet top-up amount is ₹20.00." };
    }

    const MAX_TOPUP_PAISE = 500000; // ₹5,000.00 maximum per single transaction to prevent integer overflow
    if (amountPaise > MAX_TOPUP_PAISE) {
      return { success: false, error: "Maximum single top-up amount is ₹5,000.00." };
    }

    const cleanUtr = String(utr || "").trim().replace(/\D/g, "");
    if (cleanUtr.length !== 12) {
      return { success: false, error: "Please enter a valid 12-digit numeric UPI UTR number." };
    }

    // Check if this UTR has already been submitted in topup requests
    const existingTopup = await prisma.walletTopupRequest.findUnique({
      where: { utr: cleanUtr },
    });

    if (existingTopup) {
      return {
        success: false,
        error: "This UTR reference has already been submitted. Duplicate recharges are rejected.",
      };
    }

    // Also check if UTR already exists in processed ledger transactions
    const existingLedger = await prisma.walletTransaction.findFirst({
      where: { utr: cleanUtr },
    });

    if (existingLedger) {
      return {
        success: false,
        error: "This UTR has already been processed and credited to a wallet.",
      };
    }

    const created = await prisma.walletTopupRequest.create({
      data: {
        userId,
        amountPaise,
        utr: cleanUtr,
        status: "PENDING",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            college: { select: { name: true } },
          },
        },
      },
    });

    // Dispatch instant 1-tap approval notification to Campus Admin Telegram Bot asynchronously
    sendTopupTelegramAlert({
      id: created.id,
      userId: created.userId,
      userName: created.user?.name || "Student",
      userEmail: created.user?.email || "",
      userPhone: created.user?.phone,
      amountPaise: created.amountPaise,
      utr: created.utr,
      campusName: (created.user as any)?.college?.name,
      createdAt: created.createdAt,
    }).catch((err) => {
      console.warn("[Telegram Bot Alert Warning]:", err);
    });

    return {
      success: true,
      data: {
        id: created.id,
        userId: created.userId,
        amountPaise: created.amountPaise,
        amountRupees: created.amountPaise / 100,
        utr: created.utr,
        status: "PENDING",
        rejectionReason: null,
        verifiedBy: null,
        createdAt: created.createdAt.toISOString(),
        verifiedAt: null,
        user: created.user,
      },
    };
  } catch (error: any) {
    console.error("[submitWalletTopupRequest Error]:", error);
    if (error.code === "P2002") {
      return { success: false, error: "This UTR number has already been registered." };
    }
    return { success: false, error: error.message || "Failed to submit top-up request." };
  }
}

/**
 * Admin: Approve a pending top-up request and atomically credit the student's wallet.
 * Enforces atomic Compare-And-Swap (CAS) to prevent double-crediting under concurrent requests.
 */
export async function adminApproveTopup(params: {
  requestId: string;
  adminId: string;
  remark?: string;
}): Promise<ActionResponse<{ newBalancePaise: number; newBalanceRupees: number }>> {
  try {
    const { requestId, adminId, remark } = params;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch request with pessimistic check
      const request = await tx.walletTopupRequest.findUnique({
        where: { id: requestId },
      });

      if (!request) {
        throw new Error("Top-up request not found.");
      }

      // 2. Atomic Compare-And-Swap (CAS): Only succeeds if status is still strictly "PENDING"
      const updateResult = await tx.walletTopupRequest.updateMany({
        where: { id: requestId, status: "PENDING" },
        data: {
          status: "APPROVED",
          verifiedBy: adminId,
          verifiedAt: new Date(),
        },
      });

      if (updateResult.count === 0) {
        throw new Error("This top-up request has already been processed or is no longer pending.");
      }

      // 3. Atomically increment student's wallet balance
      const updatedUser = await tx.user.update({
        where: { id: request.userId },
        data: {
          walletBalancePaise: { increment: request.amountPaise },
        },
        select: { walletBalancePaise: true },
      });

      const cleanRemark = remark?.trim() ? ` [Remark: ${remark.trim()}]` : "";

      // 4. Record immutable TOPUP ledger entry with UTR and custom admin remark
      await tx.walletTransaction.create({
        data: {
          userId: request.userId,
          type: "TOPUP",
          amountPaise: request.amountPaise,
          balanceAfterPaise: updatedUser.walletBalancePaise,
          utr: request.utr,
          referenceId: request.id,
          description: `Wallet Recharge via UPI (UTR: ${request.utr})${cleanRemark}`,
        },
      });

      return updatedUser.walletBalancePaise;
    });

    return {
      success: true,
      data: {
        newBalancePaise: result,
        newBalanceRupees: result / 100,
      },
    };
  } catch (error: any) {
    console.error("[adminApproveTopup Error]:", error);
    return { success: false, error: error.message || "Failed to approve top-up request." };
  }
}

/**
 * Admin: Reject a fraudulent or unmatched top-up request.
 * Enforces atomic Compare-And-Swap (CAS) to prevent race conditions.
 */
export async function adminRejectTopup(params: {
  requestId: string;
  reason: string;
  adminId: string;
}): Promise<ActionResponse<void>> {
  try {
    const { requestId, reason, adminId } = params;

    // Atomic Compare-And-Swap: strictly update ONLY if status is still PENDING
    const updated = await prisma.walletTopupRequest.updateMany({
      where: { id: requestId, status: "PENDING" },
      data: {
        status: "REJECTED",
        rejectionReason: reason?.trim() || "Payment could not be verified in bank records.",
        verifiedBy: adminId,
        verifiedAt: new Date(),
      },
    });

    if (updated.count === 0) {
      return { success: false, error: "Top-up request has already been processed or is no longer pending." };
    }

    return { success: true };
  } catch (error: any) {
    console.error("[adminRejectTopup Error]:", error);
    return { success: false, error: error.message || "Failed to reject top-up request." };
  }
}

/**
 * Admin: Fetch all pending top-up requests across the campus
 */
export async function adminGetPendingTopups(collegeId?: string): Promise<ActionResponse<WalletTopupRequestDTO[]>> {
  try {
    const whereClause: any = { status: "PENDING" };
    if (collegeId) {
      whereClause.user = { collegeId };
    }

    const requests = await prisma.walletTopupRequest.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
    });

    const formatted: WalletTopupRequestDTO[] = requests.map((r) => ({
      id: r.id,
      userId: r.userId,
      amountPaise: r.amountPaise,
      amountRupees: r.amountPaise / 100,
      utr: r.utr,
      status: r.status as any,
      rejectionReason: r.rejectionReason,
      verifiedBy: r.verifiedBy,
      createdAt: r.createdAt.toISOString(),
      verifiedAt: r.verifiedAt ? r.verifiedAt.toISOString() : null,
      user: r.user,
    }));

    return { success: true, data: formatted };
  } catch (error: any) {
    console.error("[adminGetPendingTopups Error]:", error);
    return { success: false, error: error.message || "Failed to load pending top-ups." };
  }
}

/**
 * Admin: Fetch full campus wallet overview including float, pending requests, today's approvals,
 * and top-up queue history.
 */
export async function adminGetWalletOverview(
  collegeId?: string
): Promise<ActionResponse<WalletAdminOverviewDTO>> {
  try {
    const userWhere: any = {};
    const topupWhere: any = {};
    if (collegeId) {
      userWhere.collegeId = collegeId;
      topupWhere.user = { collegeId };
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalUsersAgg,
      pendingRequests,
      approvedTodayAgg,
      rejectedTodayCount,
      allRecentRequests,
    ] = await Promise.all([
      // Total campus wallet float across registered students
      prisma.user.aggregate({
        where: userWhere,
        _sum: { walletBalancePaise: true },
        _count: { id: true },
      }),
      // Pending requests count and sum
      prisma.walletTopupRequest.aggregate({
        where: { ...topupWhere, status: "PENDING" },
        _sum: { amountPaise: true },
        _count: { id: true },
      }),
      // Approved today
      prisma.walletTopupRequest.aggregate({
        where: {
          ...topupWhere,
          status: "APPROVED",
          verifiedAt: { gte: todayStart },
        },
        _sum: { amountPaise: true },
        _count: { id: true },
      }),
      // Rejected today
      prisma.walletTopupRequest.count({
        where: {
          ...topupWhere,
          status: "REJECTED",
          verifiedAt: { gte: todayStart },
        },
      }),
      // Recent requests (up to 100)
      prisma.walletTopupRequest.findMany({
        where: topupWhere,
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          user: {
            select: { id: true, name: true, email: true, phone: true },
          },
        },
      }),
    ]);

    const totalFloatPaise = totalUsersAgg._sum.walletBalancePaise || 0;
    const totalStudents = totalUsersAgg._count.id || 0;
    const pendingCount = pendingRequests._count.id || 0;
    const pendingPaise = pendingRequests._sum.amountPaise || 0;
    const approvedTodayCount = approvedTodayAgg._count.id || 0;
    const approvedTodayPaise = approvedTodayAgg._sum.amountPaise || 0;

    const formattedRequests: WalletTopupRequestDTO[] = allRecentRequests.map((r) => ({
      id: r.id,
      userId: r.userId,
      amountPaise: r.amountPaise,
      amountRupees: r.amountPaise / 100,
      utr: r.utr,
      status: r.status as any,
      rejectionReason: r.rejectionReason,
      verifiedBy: r.verifiedBy,
      createdAt: r.createdAt.toISOString(),
      verifiedAt: r.verifiedAt ? r.verifiedAt.toISOString() : null,
      user: r.user,
    }));

    return {
      success: true,
      data: {
        totalFloatPaise,
        totalFloatRupees: totalFloatPaise / 100,
        totalStudents,
        pendingCount,
        pendingPaise,
        pendingRupees: pendingPaise / 100,
        approvedTodayCount,
        approvedTodayPaise,
        approvedTodayRupees: approvedTodayPaise / 100,
        rejectedTodayCount,
        telegramConfigured: isTelegramConfigured(),
        requests: formattedRequests,
      },
    };
  } catch (error: any) {
    console.error("[adminGetWalletOverview Error]:", error);
    return { success: false, error: error.message || "Failed to load wallet overview." };
  }
}

/**
 * Execute 1-click payment for a print order using wallet balance with instant 2% cashback.
 * Runs atomically inside prisma.$transaction.
 */
export async function payPrintOrderWithWallet(params: {
  userId: string;
  orderId: string;
  totalCostPaise: number;
  fileName: string;
}): Promise<ActionResponse<{ balanceAfterPaise: number; cashbackPaise: number }>> {
  try {
    const { userId, orderId, totalCostPaise, fileName } = params;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch user balance with pessimistic check
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, walletBalancePaise: true },
      });

      if (!user) {
        throw new Error("User account not found.");
      }

      if (user.walletBalancePaise < totalCostPaise) {
        throw new Error(
          `Insufficient wallet balance. You have ₹${(user.walletBalancePaise / 100).toFixed(2)}, but this print order costs ₹${(totalCostPaise / 100).toFixed(2)}. Please top up your wallet first.`
        );
      }

      // 2. Compute 2% instant cashback (in integer Paise, floored)
      const cashbackPaise = Math.floor(totalCostPaise * 0.02);

      // 3. Step A: Debit Order Payment
      const balanceAfterPayment = user.walletBalancePaise - totalCostPaise;
      await tx.walletTransaction.create({
        data: {
          userId,
          type: "PRINT_PAYMENT",
          amountPaise: -totalCostPaise,
          balanceAfterPaise: balanceAfterPayment,
          referenceId: orderId,
          description: `Express Print Order #${orderId.slice(-6).toUpperCase()} (${fileName})`,
        },
      });

      // 4. Step B: Credit 2% Instant Cashback
      const balanceAfterCashback = balanceAfterPayment + cashbackPaise;
      if (cashbackPaise > 0) {
        await tx.walletTransaction.create({
          data: {
            userId,
            type: "PRINT_CASHBACK",
            amountPaise: cashbackPaise,
            balanceAfterPaise: balanceAfterCashback,
            referenceId: orderId,
            description: `2% Instant Cashback for Print Order #${orderId.slice(-6).toUpperCase()}`,
          },
        });
      }

      // 5. Update user balance atomically with conditional balance check
      const balanceUpdate = await tx.user.updateMany({
        where: {
          id: userId,
          walletBalancePaise: { gte: totalCostPaise },
        },
        data: {
          walletBalancePaise: {
            decrement: totalCostPaise - cashbackPaise,
          },
        },
      });

      if (balanceUpdate.count === 0) {
        throw new Error("Insufficient wallet balance or concurrent transaction in progress.");
      }

      // 6. Mark order as paid via wallet
      await tx.printOrder.update({
        where: { id: orderId },
        data: {
          paymentMethod: "WALLET",
          utr: "WALLET_PAYMENT",
        },
      });

      return { balanceAfterPaise: balanceAfterCashback, cashbackPaise };
    });

    return {
      success: true,
      data: result,
    };
  } catch (error: any) {
    console.error("[payPrintOrderWithWallet Error]:", error);
    return { success: false, error: error.message || "Failed to process wallet payment." };
  }
}

/**
 * Refund a print order paid with wallet.
 * Atomically credits the full order cost back and claws back the 2% cashback.
 */
export async function refundPrintOrder(params: {
  orderId: string;
  reason?: string;
  adminId?: string;
}): Promise<ActionResponse<{ refundedPaise: number; clawbackPaise: number; netRefundPaise: number }>> {
  try {
    const { orderId, reason, adminId } = params;

    const order = await prisma.printOrder.findUnique({
      where: { id: orderId },
      include: { user: { select: { id: true, walletBalancePaise: true, email: true, name: true } } },
    });

    if (!order) {
      return { success: false, error: "Print order not found." };
    }

    if (order.paymentMethod !== "WALLET") {
      return {
        success: false,
        error: "Order was not paid via wallet. Only wallet orders can be refunded via wallet.",
      };
    }

    // Check if already refunded
    const existingRefund = await prisma.walletTransaction.findFirst({
      where: { referenceId: orderId, type: "PRINT_REFUND" },
    });

    if (existingRefund) {
      return { success: false, error: "This print order has already been refunded to wallet." };
    }

    const result = await prisma.$transaction(async (tx) => {
      // Find original payment transaction
      const paymentTx = await tx.walletTransaction.findFirst({
        where: { referenceId: orderId, type: "PRINT_PAYMENT" },
      });
      const refundAmountPaise = paymentTx ? Math.abs(paymentTx.amountPaise) : order.totalCost;

      // Find original cashback transaction (if any)
      const cashbackTx = await tx.walletTransaction.findFirst({
        where: { referenceId: orderId, type: "PRINT_CASHBACK" },
      });
      const clawbackPaise = cashbackTx ? Math.abs(cashbackTx.amountPaise) : 0;

      // Fetch user current balance
      const currentUser = await tx.user.findUnique({
        where: { id: order.userId },
        select: { walletBalancePaise: true },
      });

      const startBalance = currentUser?.walletBalancePaise || 0;

      // 1. Credit Full Order Refund
      const balanceAfterRefund = startBalance + refundAmountPaise;
      await tx.walletTransaction.create({
        data: {
          userId: order.userId,
          type: "PRINT_REFUND",
          amountPaise: refundAmountPaise,
          balanceAfterPaise: balanceAfterRefund,
          referenceId: orderId,
          description: `Refund for Cancelled Print Order #${orderId.slice(-6).toUpperCase()}${reason ? ` (${reason})` : ""}`,
        },
      });

      // 2. Debit Cashback Reversal (if cashback was awarded)
      const balanceAfterClawback = balanceAfterRefund - clawbackPaise;
      if (clawbackPaise > 0) {
        await tx.walletTransaction.create({
          data: {
            userId: order.userId,
            type: "CASHBACK_REVERSAL",
            amountPaise: -clawbackPaise,
            balanceAfterPaise: balanceAfterClawback,
            referenceId: orderId,
            description: `Cashback Reversal for Cancelled Print Order #${orderId.slice(-6).toUpperCase()}`,
          },
        });
      }

      // 3. Atomically update student wallet balance
      await tx.user.update({
        where: { id: order.userId },
        data: {
          walletBalancePaise: balanceAfterClawback,
        },
      });

      // 4. Update order status to REJECTED if not already
      await tx.printOrder.update({
        where: { id: orderId },
        data: {
          status: "REJECTED",
        },
      });

      return {
        refundedPaise: refundAmountPaise,
        clawbackPaise,
        netRefundPaise: refundAmountPaise - clawbackPaise,
      };
    });

    return { success: true, data: result };
  } catch (error: any) {
    console.error("[refundPrintOrder Error]:", error);
    return { success: false, error: error.message || "Failed to refund print order." };
  }
}

