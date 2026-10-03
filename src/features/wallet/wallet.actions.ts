"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { ActionResponse } from "@/lib/types";
import { revalidatePath } from "next/cache";
import {
  getWalletDetails,
  submitWalletTopupRequest,
  adminApproveTopup,
  adminRejectTopup,
  adminGetPendingTopups,
  adminGetWalletOverview,
} from "./wallet.service";
import {
  WalletDetails,
  WalletTopupRequestDTO,
  WalletAdminOverviewDTO,
} from "./wallet.types";

/**
 * Fetch current student's wallet balance, pending top-up requests, and audit ledger history
 */
export async function getWalletDetailsAction(): Promise<ActionResponse<WalletDetails>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: "Please sign in to access your campus wallet." };
    }

    return await getWalletDetails(session.user.id);
  } catch (error: any) {
    console.error("[getWalletDetailsAction Error]:", error);
    return { success: false, error: error.message || "Failed to load wallet details." };
  }
}

/**
 * Submit a wallet top-up recharge request with 12-digit UPI UTR
 */
export async function submitTopupRequestAction(params: {
  amountPaise: number;
  utr: string;
}): Promise<ActionResponse<WalletTopupRequestDTO>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: "Please sign in to submit a top-up request." };
    }

    const rateCheck = await checkRateLimit(session.user.id);
    if (!rateCheck.success) {
      return { success: false, error: rateCheck.error };
    }

    const res = await submitWalletTopupRequest({
      userId: session.user.id,
      amountPaise: params.amountPaise,
      utr: params.utr,
    });

    if (res.success) {
      revalidatePath("/dashboard");
      revalidatePath("/profile");
      revalidatePath("/print-station");
    }

    return res;
  } catch (error: any) {
    console.error("[submitTopupRequestAction Error]:", error);
    return { success: false, error: error.message || "Failed to submit top-up request." };
  }
}

/**
 * Admin: Approve a pending wallet top-up and atomically credit student balance
 */
export async function adminApproveTopupAction(params: {
  requestId: string;
  remark?: string;
}): Promise<ActionResponse<{ newBalancePaise: number; newBalanceRupees: number }>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: "Authentication required to approve top-ups." };
    }

    const userRole = (session?.user as any)?.role;
    if (userRole !== "SUPER_ADMIN" && userRole !== "PRINT_MANAGER") {
      return { success: false, error: "Unauthorized: Admin privileges required to verify top-ups." };
    }

    const res = await adminApproveTopup({
      requestId: params.requestId,
      adminId: session.user.id,
      remark: params.remark,
    });

    if (res.success) {
      revalidatePath("/admin/wallet");
      revalidatePath("/admin/print");
    }

    return res;
  } catch (error: any) {
    console.error("[adminApproveTopupAction Error]:", error);
    return { success: false, error: error.message || "Failed to approve top-up." };
  }
}

/**
 * Admin: Reject a top-up request
 */
export async function adminRejectTopupAction(params: {
  requestId: string;
  reason: string;
}): Promise<ActionResponse<void>> {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    if (userRole !== "SUPER_ADMIN" && userRole !== "PRINT_MANAGER") {
      return { success: false, error: "Unauthorized: Admin privileges required." };
    }

    const res = await adminRejectTopup({
      requestId: params.requestId,
      reason: params.reason,
      adminId: session!.user.id,
    });

    if (res.success) {
      revalidatePath("/admin/wallet");
    }

    return res;
  } catch (error: any) {
    console.error("[adminRejectTopupAction Error]:", error);
    return { success: false, error: error.message || "Failed to reject top-up." };
  }
}

/**
 * Admin: Fetch pending top-ups for management table
 */
export async function adminGetPendingTopupsAction(): Promise<ActionResponse<WalletTopupRequestDTO[]>> {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    if (userRole !== "SUPER_ADMIN" && userRole !== "PRINT_MANAGER") {
      return { success: false, error: "Unauthorized: Admin privileges required." };
    }

    const collegeId = (session?.user as any)?.collegeId || undefined;
    return await adminGetPendingTopups(userRole === "SUPER_ADMIN" ? undefined : collegeId);
  } catch (error: any) {
    console.error("[adminGetPendingTopupsAction Error]:", error);
    return { success: false, error: error.message || "Failed to load pending top-ups." };
  }
}

/**
 * Admin: Fetch full wallet KPI overview, today's approval numbers, and top-up queue
 */
export async function adminGetWalletOverviewAction(): Promise<ActionResponse<WalletAdminOverviewDTO>> {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    if (userRole !== "SUPER_ADMIN" && userRole !== "PRINT_MANAGER") {
      return { success: false, error: "Unauthorized: Admin privileges required." };
    }

    const collegeId = (session?.user as any)?.collegeId || undefined;
    return await adminGetWalletOverview(userRole === "SUPER_ADMIN" ? undefined : collegeId);
  } catch (error: any) {
    console.error("[adminGetWalletOverviewAction Error]:", error);
    return { success: false, error: error.message || "Failed to load wallet overview." };
  }
}
