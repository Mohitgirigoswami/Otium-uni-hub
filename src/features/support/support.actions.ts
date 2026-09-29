"use server";

import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { ActionResponse } from "@/lib/types";
import { getServerSession } from "next-auth";
import { authOptions } from "@/features/auth";
import { logAdminAction } from "@/lib/logger";
import {
  CreateSupportTicketParams,
  ResolveSupportTicketParams,
  BanUserParams,
  UnbanUserParams,
} from "./support.types";

/**
 * 1. Create a Support / Complaint Ticket (Student or User)
 */
export async function createSupportTicket(
  data: CreateSupportTicketParams
): Promise<ActionResponse<any>> {
  try {
    const rateCheck = await checkRateLimit(data.userId || "support-ticket");
    if (!rateCheck.success) return { error: rateCheck.error };

    if (!data.subject.trim() || !data.message.trim()) {
      return { error: "Please provide both a subject and a message." };
    }

    const ticket = await prisma.ticket.create({
      data: {
        userId: data.userId,
        subject: data.subject.trim(),
        message: data.message.trim(),
        type: data.type || "FEEDBACK",
        status: "OPEN",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            college: { select: { name: true } },
          },
        },
      },
    });

    return {
      success: true,
      data: ticket,
    };
  } catch (error: any) {
    console.error("Error in createSupportTicket:", error);
    return { error: error?.message || "Failed to create support ticket." };
  }
}

/**
 * 2. Fetch User's Own Tickets
 */
export async function getUserSupportTickets(
  userId: string
): Promise<ActionResponse<any[]>> {
  try {
    const tickets = await prisma.ticket.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      data: tickets,
    };
  } catch (error: any) {
    console.error("Error in getUserSupportTickets:", error);
    return { error: error?.message || "Failed to fetch tickets.", data: [] };
  }
}

/**
 * 3. Fetch All Tickets for Admin Console (SUPER_ADMIN or CAMPUS_MODERATOR)
 */
export async function getAllSupportTicketsAdmin(
  adminUserId: string
): Promise<ActionResponse<any[]>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "CAMPUS_MODERATOR")) {
      throw new Error("UNAUTHORIZED: Critical security violation.");
    }

    const tickets = await prisma.ticket.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
            isBanned: true,
            banReason: true,
            college: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      data: tickets,
    };
  } catch (error: any) {
    console.error("Error in getAllSupportTicketsAdmin:", error);
    return { error: error?.message || "Failed to fetch admin tickets.", data: [] };
  }
}

/**
 * 4. Resolve Support Ticket (Admin)
 */
export async function resolveSupportTicketAdmin(
  data: ResolveSupportTicketParams
): Promise<ActionResponse<any>> {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "CAMPUS_MODERATOR")) {
    throw new Error("UNAUTHORIZED: Critical security violation.");
  }

  try {
    const updated = await prisma.ticket.update({
      where: { id: data.ticketId },
      data: { status: "RESOLVED" },
    });

    await logAdminAction(
      session.user.id,
      "RESOLVED_TICKET",
      `Resolved Ticket ID: ${data.ticketId}`
    );

    return {
      success: true,
      data: updated,
    };
  } catch (error: any) {
    console.error("Error in resolveSupportTicketAdmin:", error);
    return { error: error?.message || "Failed to resolve ticket." };
  }
}

/**
 * 5. THE GLOBAL BAN HAMMER: Ban User (SUPER_ADMIN only)
 */
export async function banUserAdmin(
  data: BanUserParams
): Promise<ActionResponse<any>> {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    throw new Error("UNAUTHORIZED: Critical security violation.");
  }

  try {
    const target = await prisma.user.findUnique({
      where: { id: data.targetUserId },
      select: { role: true },
    });

    if (target?.role === "SUPER_ADMIN") {
      return { error: "Protected account: Cannot ban a Super Admin." };
    }

    const bannedUser = await prisma.user.update({
      where: { id: data.targetUserId },
      data: {
        isBanned: true,
        banReason: data.reason.trim() || "Violation of Otium Campus Guidelines.",
      },
    });

    // Audit Logger
    await logAdminAction(
      session.user.id,
      "BANNED_USER",
      `Banned User: ${data.targetUserId} | Reason: ${data.reason.trim()}`
    );

    return {
      success: true,
      data: bannedUser,
    };
  } catch (error: any) {
    console.error("Error in banUserAdmin:", error);
    return { error: error?.message || "Failed to ban user." };
  }
}

/**
 * 6. Unban User (SUPER_ADMIN only)
 */
export async function unbanUserAdmin(
  data: UnbanUserParams
): Promise<ActionResponse<any>> {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    throw new Error("UNAUTHORIZED: Critical security violation.");
  }

  try {
    const unbannedUser = await prisma.user.update({
      where: { id: data.targetUserId },
      data: {
        isBanned: false,
        banReason: null,
      },
    });

    // Audit Logger
    await logAdminAction(
      session.user.id,
      "UNBANNED_USER",
      `Unbanned User: ${data.targetUserId}`
    );

    return {
      success: true,
      data: unbannedUser,
    };
  } catch (error: any) {
    console.error("Error in unbanUserAdmin:", error);
    return { error: error?.message || "Failed to unban user." };
  }
}
