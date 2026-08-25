"use server";

import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { ActionResponse, TaskCategoryType } from "@/lib/types";
import { rupeesToPaise } from "@/lib/utils";

/**
 * Fetch all gigs with optional filtering
 */
export async function getGigs(filters?: {
  category?: string;
  status?: string;
  search?: string;
}): Promise<ActionResponse<any[]>> {
  try {
    const where: any = {};

    if (filters?.category && filters.category !== "ALL") {
      where.category = filters.category;
    }

    if (filters?.status && filters.status !== "ALL") {
      where.status = filters.status;
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
          },
        },
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
 * Claim an open gig with STRICT Anti-Hoarding and Cooldown guardrails
 */
export async function claimGig(
  gigId: string,
  freelancerId: string
): Promise<ActionResponse<any>> {
  try {
    const rateCheck = await checkRateLimit(freelancerId);
    if (!rateCheck.success) {
      return { error: rateCheck.error };
    }

    // 1. Fetch user to verify cancellation cooldown penalty
    const user = await prisma.user.findUnique({
      where: { id: freelancerId },
      include: {
        assignedTasks: {
          where: { status: "ASSIGNED" },
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

    // 2. Anti-Hoarding Concurrency Limit: freelancer cannot have >= 2 active tasks
    if (user.assignedTasks.length >= 2) {
      return {
        error: "Anti-Hoarding Limit Reached: You already have 2 active assigned gigs. Complete or submit them before taking on more work.",
      };
    }

    // 3. Fetch gig and verify it is still OPEN and not posted by the same user
    const gig = await prisma.taskGig.findUnique({
      where: { id: gigId },
    });

    if (!gig) {
      return { error: "Gig not found." };
    }

    if (gig.posterId === freelancerId) {
      return { error: "You cannot claim a gig that you posted yourself." };
    }

    if (gig.status !== "OPEN") {
      return { error: `This gig is no longer open (current status: ${gig.status}).` };
    }

    // 4. Assign gig to freelancer
    const updatedGig = await prisma.taskGig.update({
      where: { id: gigId },
      data: {
        status: "ASSIGNED",
        assignedToId: freelancerId,
      },
      include: {
        poster: true,
        assignedTo: true,
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

    if (gig.status !== "ASSIGNED") {
      return { error: "Only assigned gigs can be dropped." };
    }

    // Calculate 24-hour cooldown from now
    const penaltyCooldown = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Run in transaction: unassign gig & apply cooldown to user
    const [updatedGig, updatedUser] = await prisma.$transaction([
      prisma.taskGig.update({
        where: { id: gigId },
        data: {
          status: "OPEN",
          assignedToId: null,
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
        message: "Gig has been released back to the pool. A 24-hour claiming cooldown has been applied to your account.",
      },
    };
  } catch (error: any) {
    console.error("Error in dropGig:", error);
    return {
      error: error?.message || "Failed to drop task gig.",
    };
  }
}

/**
 * Complete an assigned gig
 */
export async function completeGig(
  gigId: string,
  userId: string
): Promise<ActionResponse<any>> {
  try {
    const rateCheck = await checkRateLimit(userId);
    if (!rateCheck.success) {
      return { error: rateCheck.error };
    }

    const gig = await prisma.taskGig.findUnique({
      where: { id: gigId },
    });

    if (!gig) {
      return { error: "Gig not found." };
    }

    // Either poster or assigned freelancer can mark as completed
    if (gig.posterId !== userId && gig.assignedToId !== userId) {
      return { error: "Unauthorized: You are neither the poster nor the assignee." };
    }

    const updated = await prisma.taskGig.update({
      where: { id: gigId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    return {
      success: true,
      data: updated,
    };
  } catch (error: any) {
    console.error("Error in completeGig:", error);
    return {
      error: error?.message || "Failed to mark gig as completed.",
    };
  }
}
