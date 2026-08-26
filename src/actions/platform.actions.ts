"use server";

import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { ActionResponse } from "@/lib/types";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logAdminAction } from "@/lib/logger";

/**
 * 1. Fetch Global Platform Settings (Public / Client readable)
 */
export async function getPlatformSettingsAction(): Promise<
  ActionResponse<{ upiId: string; updatedAt: Date }>
> {
  try {
    const setting = await prisma.platformSetting.findUnique({
      where: { id: "global_config" },
    });

    if (!setting) {
      const created = await prisma.platformSetting.create({
        data: {
          id: "global_config",
          upiId: "otium.escrow@okhdfcbank",
        },
      });
      return {
        success: true,
        data: {
          upiId: created.upiId,
          updatedAt: created.updatedAt,
        },
      };
    }

    return {
      success: true,
      data: {
        upiId: setting.upiId,
        updatedAt: setting.updatedAt,
      },
    };
  } catch (error: any) {
    console.error("Error in getPlatformSettingsAction:", error);
    return {
      success: true,
      data: {
        upiId: "otium.escrow@okhdfcbank",
        updatedAt: new Date(),
      },
    };
  }
}

/**
 * 2. Update Platform UPI ID (SUPER_ADMIN only)
 */
export async function updatePlatformUpiIdAction(data: {
  upiId: string;
  adminUserId: string;
}): Promise<ActionResponse<{ upiId: string }>> {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    throw new Error("UNAUTHORIZED: Critical security violation.");
  }

  try {
    const rateCheck = await checkRateLimit(session.user.id || data.adminUserId || "platform-settings");
    if (!rateCheck.success) return { error: rateCheck.error };

    const cleanUpi = data.upiId.trim();
    if (!cleanUpi || !cleanUpi.includes("@") || cleanUpi.length < 5) {
      return { error: "Please enter a valid UPI VPA ID (e.g., yourname@okhdfcbank or merchant@paytm)." };
    }

    const updated = await prisma.platformSetting.upsert({
      where: { id: "global_config" },
      create: {
        id: "global_config",
        upiId: cleanUpi,
      },
      update: {
        upiId: cleanUpi,
      },
    });

    // Audit Logger
    await logAdminAction(
      session.user.id,
      "UPDATED_UPI",
      `New UPI: ${cleanUpi}`
    );

    return {
      success: true,
      data: {
        upiId: updated.upiId,
      },
    };
  } catch (error: any) {
    console.error("Error in updatePlatformUpiIdAction:", error);
    return { error: error?.message || "Failed to update platform UPI setting." };
  }
}
