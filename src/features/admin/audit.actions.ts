"use server";

import { prisma } from "@/lib/prisma";
import { ActionResponse } from "@/lib/types";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Fetch all Admin Audit Logs (SUPER_ADMIN only)
 */
export async function getAdminAuditLogs(
  adminUserId?: string
): Promise<ActionResponse<any[]>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
      throw new Error("UNAUTHORIZED: Critical security violation.");
    }

    const logs = await prisma.auditLog.findMany({
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return {
      success: true,
      data: logs,
    };
  } catch (error: any) {
    console.error("Error in getAdminAuditLogs:", error);
    return {
      error: error?.message || "Failed to fetch audit logs.",
      data: [],
    };
  }
}
