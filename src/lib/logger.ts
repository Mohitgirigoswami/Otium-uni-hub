import { prisma } from "@/lib/prisma";

/**
 * Helper function to record admin audit logs for critical actions
 */
export async function logAdminAction(
  adminId: string,
  action: string,
  details?: string
) {
  try {
    await prisma.auditLog.create({
      data: {
        adminId,
        action,
        details,
      },
    });
  } catch (error) {
    console.error("Failed to write admin audit log:", error);
  }
}
