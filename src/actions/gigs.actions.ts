"use server";

import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { ActionResponse, TaskCategoryType } from "@/lib/types";
import { rupeesToPaise } from "@/lib/utils";
import { calculateEscrow } from "@/lib/escrow-math";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logAdminAction } from "@/lib/logger";

async function verifyAdminRole(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return (
    user?.role === "SUPER_ADMIN" ||
    user?.role === "CAMPUS_MODERATOR" ||
    user?.role === "PRINT_MANAGER"
  );
}

/**
 * Fetch all gigs with optional filtering
 */
export async function getGigs(filters?: {
  category?: string;
  status?: string;
  search?: string;
  collegeId?: string;
}): Promise<ActionResponse<any[]>> {
  try {
    const where: any = {};

    if (filters?.category && filters.category !== "ALL") {
      where.category = filters.category;
    }

    if (filters?.status && filters.status !== "ALL") {
      where.status = filters.status;
    }

    if (filters?.collegeId) {
      where.collegeId = filters.collegeId;
    }

    if (filters?.search && filters.search.trim() !== "") {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const gigs = await prisma.taskGig.findMany({
      where,
      include: {
        poster: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            department: true,
            year: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            department: true,
            incognitoProfile: true,
          },
        },
        college: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      data: gigs,
    };
  } catch (error: any) {
    console.error("Error in getGigs:", error);
    return {
      error: error?.message || "Failed to fetch gigs.",
      data: [],
    };
  }
}

/**
 * Fetch single gig by ID
 */
export async function getGigById(gigId: string): Promise<ActionResponse<any>> {
  try {
    if (!gigId) return { error: "Gig ID is required." };

    const gig = await prisma.taskGig.findUnique({
      where: { id: gigId },
      include: {
        poster: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            department: true,
            year: true,
            phone: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            department: true,
            year: true,
            phone: true,
            incognitoProfile: true,
          },
        },
        college: true,
      },
    });

    if (!gig) return { error: "Task gig not found." };

    return {
      success: true,
      data: gig,
    };
  } catch (error: any) {
    console.error("Error in getGigById:", error);
    return {
      error: error?.message || "Failed to retrieve gig details.",
    };
  }
}

/**
 * Post a new Assignment / Project Gig
 */
export async function createGig(data: {
  posterId: string;
  title: string;
  description: string;
  budgetRupees: number;
  category: TaskCategoryType;
  deadline?: string;
  fileUrl?: string;
  collegeId?: string;
}): Promise<ActionResponse<any>> {
  try {
    const rateCheck = await checkRateLimit(data.posterId);
    if (!rateCheck.success) {
      return { error: rateCheck.error };
    }

    if (!data.title?.trim()) return { error: "Gig title is required." };
    if (!data.description?.trim()) return { error: "Description is required." };
    if (!data.budgetRupees || data.budgetRupees <= 0) {
      return { error: "Valid budget in INR is required." };
    }

    // Auto-discover poster's college if not explicitly passed
    let assignedCollegeId = data.collegeId;
    if (!assignedCollegeId) {
      const poster = await prisma.user.findUnique({
        where: { id: data.posterId },
        select: { collegeId: true },
      });
      assignedCollegeId = poster?.collegeId || undefined;
    }

    const budgetPaise = rupeesToPaise(data.budgetRupees);

    const newGig = await prisma.taskGig.create({
      data: {
        title: data.title.trim(),
        description: data.description.trim(),
        budget: budgetPaise,
        category: data.category as any,
        deadline: data.deadline ? new Date(data.deadline) : null,
        fileUrl: data.fileUrl || null,
        posterId: data.posterId,
        collegeId: assignedCollegeId || null,
        status: "OPEN",
      },
      include: {
        poster: true,
      },
    });

    return {
      success: true,
      data: newGig,
    };
  } catch (error: any) {
    console.error("Error in createGig:", error);
    return {
      error: error?.message || "Failed to create task gig.",
    };
  }
}

/**
 * Claim an open gig (with optional Anonymous Claiming and Anti-Hoarding guardrails)
 */
export async function claimGig(
  gigId: string,
  freelancerId: string,
  isAnonymousWriter: boolean = false
): Promise<ActionResponse<any>> {
  try {
    const rateCheck = await checkRateLimit(freelancerId);
    if (!rateCheck.success) {
      return { error: rateCheck.error };
    }

    // 1. Fetch user to verify cancellation cooldown penalty & active concurrency
    const user = await prisma.user.findUnique({
      where: { id: freelancerId },
      include: {
        incognitoProfile: true,
        assignedTasks: {
          where: {
            status: {
              in: [
                "CLAIMED",
                "PENDING_ADVANCE",
                "ADVANCE_VERIFIED",
                "WORK_WITH_ADMIN",
                "PENDING_FINAL",
                "FINAL_VERIFIED",
              ],
            },
          },
        },
      },
    });

    if (!user) {
      return { error: "User account not found." };
    }

    const now = new Date();
    if (user.freelancerCooldown && user.freelancerCooldown > now) {
      const remainingHours = Math.ceil(
        (user.freelancerCooldown.getTime() - now.getTime()) / (1000 * 60 * 60)
      );
      return {
        error: `Anti-Hoarding Penalty Active: You dropped a previous task. You are on cooldown for another ${remainingHours} hour(s) and cannot claim new gigs.`,
      };
    }

    // 2. Concurrency limit: max 2 active gigs
    if (user.assignedTasks.length >= 2) {
      return {
        error: "Anti-Hoarding Limit: You already have 2 active assigned gigs. Finish them before claiming more work.",
      };
    }

    // 3. Ensure incognito profile exists if claiming anonymously
    if (isAnonymousWriter && !user.incognitoProfile) {
      const cleanName = (user.name || "Writer").replace(/[^a-zA-Z0-9]/g, "");
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const autoHandle = `Writer_${cleanName}_${randomSuffix}`;
      const autoAvatar = `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(autoHandle)}`;

      await prisma.incognitoProfile.create({
        data: {
          userId: user.id,
          handle: autoHandle,
          avatarUrl: autoAvatar,
        },
      });
    }

    // 4. Fetch gig and verify state
    const gig = await prisma.taskGig.findUnique({
      where: { id: gigId },
    });

    if (!gig) return { error: "Gig not found." };

    if (gig.posterId === freelancerId) {
      return { error: "You cannot claim your own gig." };
    }

    if (gig.status !== "OPEN") {
      return { error: `This gig is no longer open (status: ${gig.status}).` };
    }

    // 5. Update gig to CLAIMED
    const updatedGig = await prisma.taskGig.update({
      where: { id: gigId },
      data: {
        status: "CLAIMED",
        assignedToId: freelancerId,
        isAnonymousWriter,
      },
      include: {
        poster: true,
        assignedTo: {
          include: { incognitoProfile: true },
        },
      },
    });

    return {
      success: true,
      data: updatedGig,
    };
  } catch (error: any) {
    console.error("Error in claimGig:", error);
    return {
      error: error?.message || "Failed to claim task gig.",
    };
  }
}

/**
 * Buyer submits Advance UTR (50%) -> Status: PENDING_ADVANCE
 */
export async function submitAdvanceUtr(data: {
  gigId: string;
  buyerId: string;
  advanceUtr: string;
}): Promise<ActionResponse<any>> {
  try {
    const rateCheck = await checkRateLimit(data.buyerId);
    if (!rateCheck.success) return { error: rateCheck.error };

    const cleanUtr = data.advanceUtr.trim();
    if (!cleanUtr || cleanUtr.length < 6) {
      return { error: "Please enter a valid 12-digit or transaction UTR number." };
    }

    const gig = await prisma.taskGig.findUnique({
      where: { id: data.gigId },
    });

    if (!gig) return { error: "Gig not found." };
    if (gig.posterId !== data.buyerId) {
      return { error: "Unauthorized: Only the gig poster/buyer can submit advance UTR." };
    }
    if (gig.status !== "CLAIMED" && gig.status !== "PENDING_ADVANCE") {
      return { error: `Cannot submit advance UTR at current status: ${gig.status}` };
    }

    const updated = await prisma.taskGig.update({
      where: { id: data.gigId },
      data: {
        advanceUtr: cleanUtr,
        status: "PENDING_ADVANCE",
      },
    });

    return {
      success: true,
      data: updated,
    };
  } catch (error: any) {
    console.error("Error in submitAdvanceUtr:", error);
    return {
      error: error?.message || "Failed to submit advance UTR.",
    };
  }
}

/**
 * Writer marks Physical File Handed to Admin -> Status: WORK_WITH_ADMIN
 */
export async function writerHandoverAction(data: {
  gigId: string;
  writerId: string;
}): Promise<ActionResponse<any>> {
  try {
    const rateCheck = await checkRateLimit(data.writerId);
    if (!rateCheck.success) return { error: rateCheck.error };

    const gig = await prisma.taskGig.findUnique({
      where: { id: data.gigId },
    });

    if (!gig) return { error: "Gig not found." };
    if (gig.assignedToId !== data.writerId) {
      return { error: "Unauthorized: Only the assigned writer can submit handover status." };
    }
    if (gig.status !== "ADVANCE_VERIFIED") {
      return { error: "Handover can only be submitted once the advance is verified." };
    }

    const updated = await prisma.taskGig.update({
      where: { id: data.gigId },
      data: {
        status: "WORK_WITH_ADMIN",
      },
    });

    return {
      success: true,
      data: updated,
    };
  } catch (error: any) {
    console.error("Error in writerHandoverAction:", error);
    return {
      error: error?.message || "Failed to submit handover status.",
    };
  }
}

/**
 * Buyer submits Final UTR (remaining 50%) -> Status: PENDING_FINAL
 */
export async function submitFinalUtr(data: {
  gigId: string;
  buyerId: string;
  finalUtr: string;
}): Promise<ActionResponse<any>> {
  try {
    const rateCheck = await checkRateLimit(data.buyerId);
    if (!rateCheck.success) return { error: rateCheck.error };

    const cleanUtr = data.finalUtr.trim();
    if (!cleanUtr || cleanUtr.length < 6) {
      return { error: "Please enter a valid final payment UTR number." };
    }

    const gig = await prisma.taskGig.findUnique({
      where: { id: data.gigId },
    });

    if (!gig) return { error: "Gig not found." };
    if (gig.posterId !== data.buyerId) {
      return { error: "Unauthorized: Only the gig buyer can submit final payment UTR." };
    }
    if (gig.status !== "WORK_WITH_ADMIN" && gig.status !== "PENDING_FINAL") {
      return { error: `Cannot submit final UTR at current status: ${gig.status}` };
    }

    const updated = await prisma.taskGig.update({
      where: { id: data.gigId },
      data: {
        finalUtr: cleanUtr,
        status: "PENDING_FINAL",
      },
    });

    return {
      success: true,
      data: updated,
    };
  } catch (error: any) {
    console.error("Error in submitFinalUtr:", error);
    return {
      error: error?.message || "Failed to submit final UTR.",
    };
  }
}

/**
 * Drop an assigned gig - APPLIES STRICT 24-HOUR CANCELLATION PENALTY
 */
export async function dropGig(
  gigId: string,
  freelancerId: string
): Promise<ActionResponse<any>> {
  try {
    const rateCheck = await checkRateLimit(freelancerId);
    if (!rateCheck.success) {
      return { error: rateCheck.error };
    }

    const gig = await prisma.taskGig.findUnique({
      where: { id: gigId },
    });

    if (!gig) {
      return { error: "Gig not found." };
    }

    if (gig.assignedToId !== freelancerId) {
      return { error: "You are not the assigned freelancer for this gig." };
    }

    if (gig.status === "COMPLETED" || gig.status === "FINAL_VERIFIED") {
      return { error: "Completed gigs cannot be dropped." };
    }

    // 24-hour cooldown penalty
    const penaltyCooldown = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const [updatedGig, updatedUser] = await prisma.$transaction([
      prisma.taskGig.update({
        where: { id: gigId },
        data: {
          status: "OPEN",
          assignedToId: null,
          advanceUtr: null,
          finalUtr: null,
          payoutUtr: null,
          isAnonymousWriter: false,
        },
      }),
      prisma.user.update({
        where: { id: freelancerId },
        data: {
          freelancerCooldown: penaltyCooldown,
        },
      }),
    ]);

    return {
      success: true,
      data: {
        gig: updatedGig,
        cooldownUntil: updatedUser.freelancerCooldown,
        message: "Gig released back to the campus pool. A 24-hour claiming cooldown penalty is active.",
      },
    };
  } catch (error: any) {
    console.error("Error in dropGig:", error);
    return {
      error: error?.message || "Failed to drop task gig.",
    };
  }
}

// ==========================================
// ADMIN PROXY ESCROW ACTIONS
// ==========================================

/**
 * Admin verifies Advance UTR -> Status: ADVANCE_VERIFIED
 */
export async function adminVerifyAdvanceUtr(
  gigId: string,
  adminUserId: string
): Promise<ActionResponse<any>> {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    throw new Error("UNAUTHORIZED: Critical security violation.");
  }

  try {
    const updated = await prisma.taskGig.update({
      where: { id: gigId },
      data: {
        status: "ADVANCE_VERIFIED",
      },
    });

    await logAdminAction(
      session.user.id,
      "VERIFIED_PAYMENT",
      `Type: ESCROW_ADVANCE, Gig: ${gigId}, UTR: ${updated.advanceUtr || "N/A"}`
    );

    return {
      success: true,
      data: updated,
    };
  } catch (error: any) {
    console.error("Error in adminVerifyAdvanceUtr:", error);
    return { error: error?.message || "Failed to verify advance UTR." };
  }
}

/**
 * Admin rejects Advance UTR -> Status reverts to CLAIMED
 */
export async function adminRejectAdvanceUtr(
  gigId: string,
  adminUserId: string
): Promise<ActionResponse<any>> {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    throw new Error("UNAUTHORIZED: Critical security violation.");
  }

  try {
    const updated = await prisma.taskGig.update({
      where: { id: gigId },
      data: {
        status: "CLAIMED",
        advanceUtr: null,
      },
    });

    await logAdminAction(
      session.user.id,
      "REJECTED_ADVANCE_UTR",
      `Gig ID: ${gigId}`
    );

    return {
      success: true,
      data: updated,
    };
  } catch (error: any) {
    console.error("Error in adminRejectAdvanceUtr:", error);
    return { error: error?.message || "Failed to reject advance UTR." };
  }
}

/**
 * Admin confirms physical file is received from writer
 */
export async function adminConfirmFileReceived(
  gigId: string,
  adminUserId: string
): Promise<ActionResponse<any>> {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    throw new Error("UNAUTHORIZED: Critical security violation.");
  }

  try {
    const updated = await prisma.taskGig.update({
      where: { id: gigId },
      data: {
        status: "WORK_WITH_ADMIN",
      },
    });

    await logAdminAction(
      session.user.id,
      "CONFIRMED_ESCROW_FILE",
      `Gig ID: ${gigId}`
    );

    return {
      success: true,
      data: updated,
    };
  } catch (error: any) {
    console.error("Error in adminConfirmFileReceived:", error);
    return { error: error?.message || "Failed to update file status." };
  }
}

/**
 * Admin verifies Final UTR -> Status: FINAL_VERIFIED
 */
export async function adminVerifyFinalUtr(
  gigId: string,
  adminUserId: string
): Promise<ActionResponse<any>> {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    throw new Error("UNAUTHORIZED: Critical security violation.");
  }

  try {
    const updated = await prisma.taskGig.update({
      where: { id: gigId },
      data: {
        status: "FINAL_VERIFIED",
      },
    });

    await logAdminAction(
      session.user.id,
      "VERIFIED_PAYMENT",
      `Type: ESCROW_FINAL, Gig: ${gigId}, UTR: ${updated.finalUtr || "N/A"}`
    );

    return {
      success: true,
      data: updated,
    };
  } catch (error: any) {
    console.error("Error in adminVerifyFinalUtr:", error);
    return { error: error?.message || "Failed to verify final UTR." };
  }
}

/**
 * Admin marks Payout Sent with Payout UTR -> Status: COMPLETED
 */
export async function adminMarkPayoutSent(data: {
  gigId: string;
  adminUserId: string;
  payoutUtr: string;
}): Promise<ActionResponse<any>> {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    throw new Error("UNAUTHORIZED: Critical security violation.");
  }

  try {
    const cleanUtr = data.payoutUtr.trim();
    if (!cleanUtr || cleanUtr.length < 6) {
      return { error: "Please enter a valid payout transaction UTR." };
    }

    const updated = await prisma.taskGig.update({
      where: { id: data.gigId },
      data: {
        payoutUtr: cleanUtr,
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    await logAdminAction(
      session.user.id,
      "VERIFIED_PAYMENT",
      `Type: ESCROW_PAYOUT, Gig: ${data.gigId}, UTR: ${cleanUtr}`
    );

    return {
      success: true,
      data: updated,
    };
  } catch (error: any) {
    console.error("Error in adminMarkPayoutSent:", error);
    return { error: error?.message || "Failed to record payout." };
  }
}

/**
 * Admin marks Buyer as Ghosted -> Status: BUYER_GHOSTED
 */
export async function adminMarkBuyerGhosted(
  gigId: string,
  adminUserId: string
): Promise<ActionResponse<any>> {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    throw new Error("UNAUTHORIZED: Critical security violation.");
  }

  try {
    const updated = await prisma.taskGig.update({
      where: { id: gigId },
      data: {
        status: "BUYER_GHOSTED",
      },
    });

    await logAdminAction(
      session.user.id,
      "FLAGGED_BUYER_GHOSTED",
      `Gig ID: ${gigId}`
    );

    return {
      success: true,
      data: updated,
    };
  } catch (error: any) {
    console.error("Error in adminMarkBuyerGhosted:", error);
    return { error: error?.message || "Failed to flag buyer as ghosted." };
  }
}

/**
 * Fetch all gigs for Escrow Admin Dashboard
 */
export async function getAdminGigsEscrow(
  adminUserId: string
): Promise<ActionResponse<any[]>> {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    throw new Error("UNAUTHORIZED: Critical security violation.");
  }

  try {
    const gigs = await prisma.taskGig.findMany({
      include: {
        poster: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            phone: true,
            department: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            phone: true,
            department: true,
            incognitoProfile: true,
          },
        },
        college: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    return {
      success: true,
      data: gigs,
    };
  } catch (error: any) {
    console.error("Error in getAdminGigsEscrow:", error);
    return {
      error: error?.message || "Failed to fetch admin escrow gigs.",
      data: [],
    };
  }
}

