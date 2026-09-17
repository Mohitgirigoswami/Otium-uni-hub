"use server";

import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { ActionResponse } from "@/lib/types";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Fetch default Super Admin user for automated testing / dev session fallback
 */
export async function getDevSuperAdminUser(): Promise<ActionResponse<any>> {
  try {
    const user = await prisma.user.findFirst({
      where: { email: "mohtigiri3021@gmail.com" },
      include: {
        incognitoProfile: true,
        college: true,
      },
    });

    if (!user) {
      const fallback = await prisma.user.findFirst({
        include: { incognitoProfile: true, college: true },
      });
      return { success: true, data: fallback };
    }

    return { success: true, data: user };
  } catch (err: any) {
    return { error: err.message };
  }
}

/**
 * Fetch user by ID with attached relations
 */
export async function getUserById(userId: string): Promise<ActionResponse<any>> {
  try {
    if (!userId) {
      return { error: "User ID is required." };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        incognitoProfile: true,
        college: true,
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
      return { error: "User not found." };
    }

    return {
      success: true,
      data: user,
    };
  } catch (error: any) {
    console.error("Error in getUserById:", error);
    return {
      error: error?.message || "Failed to fetch user.",
    };
  }
}

/**
 * Update User Real Profile Information (Name, Bio, Phone, Department, Year)
 */
export async function updateUserProfile(data: {
  userId: string;
  name?: string;
  bio?: string;
  phone?: string;
  department?: string;
  year?: number;
  collegeId?: string;
}): Promise<ActionResponse<any>> {
  try {
    const rateCheck = await checkRateLimit(data.userId);
    if (!rateCheck.success) {
      return { error: rateCheck.error };
    }

    const session = await getServerSession(authOptions);
    // If authenticated via NextAuth, enforce that user is modifying their own record
    if (session?.user?.id && session.user.id !== data.userId) {
      return { error: "Unauthorized: You cannot edit another student's profile." };
    }

    const updatedUser = await prisma.user.update({
      where: { id: data.userId },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.bio !== undefined && { bio: data.bio.trim() }),
        ...(data.phone !== undefined && { phone: data.phone.trim() }),
        ...(data.department !== undefined && { department: data.department.trim() }),
        ...(data.year !== undefined && { year: Number(data.year) }),
        ...(data.collegeId !== undefined && { collegeId: data.collegeId }),
      },
      include: {
        incognitoProfile: true,
        college: true,
      },
    });

    return {
      success: true,
      data: updatedUser,
    };
  } catch (error: any) {
    console.error("Error in updateUserProfile:", error);
    return {
      error: error?.message || "Failed to update profile.",
    };
  }
}

/**
 * Update or regenerate Incognito Handle & Avatar Seed
 */
export async function updateIncognitoProfile(data: {
  userId: string;
  handle: string;
}): Promise<ActionResponse<any>> {
  try {
    const rateCheck = await checkRateLimit(data.userId);
    if (!rateCheck.success) {
      return { error: rateCheck.error };
    }

    const session = await getServerSession(authOptions);
    if (session?.user?.id && session.user.id !== data.userId) {
      return { error: "Unauthorized: You cannot edit another student's incognito profile." };
    }

    const cleanHandle = data.handle.trim().replace(/[^a-zA-Z0-9_]/g, "");
    if (!cleanHandle || cleanHandle.length < 3) {
      return { error: "Anonymous handle must be at least 3 alphanumeric characters." };
    }

    // Check handle collision
    const existing = await prisma.incognitoProfile.findUnique({
      where: { handle: cleanHandle },
    });

    if (existing && existing.userId !== data.userId) {
      return { error: `The handle "@${cleanHandle}" is already taken. Pick another alias.` };
    }

    const avatarUrl = `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(cleanHandle)}`;

    const profile = await prisma.incognitoProfile.upsert({
      where: { userId: data.userId },
      create: {
        userId: data.userId,
        handle: cleanHandle,
        avatarUrl,
      },
      update: {
        handle: cleanHandle,
        avatarUrl,
      },
    });

    return {
      success: true,
      data: profile,
    };
  } catch (error: any) {
    console.error("Error in updateIncognitoProfile:", error);
    return {
      error: error?.message || "Failed to update incognito profile.",
    };
  }
}

/**
 * Fetch aggregated statistics for student profile dashboard
 */
export async function getDashboardStats(
  userId: string
): Promise<ActionResponse<any>> {
  return getUserDashboardStats(userId);
}

export async function getUserDashboardStats(
  userId: string
): Promise<ActionResponse<any>> {
  try {
    const [user, subjects, activeGigs, postedGigs, printOrders, marketplaceItems] =
      await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          include: { incognitoProfile: true, college: true },
        }),
        prisma.subject.findMany({ where: { userId } }),
        prisma.taskGig.count({
          where: {
            assignedToId: userId,
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
        }),
        prisma.taskGig.count({
          where: { posterId: userId },
        }),
        prisma.printOrder.count({
          where: { userId },
        }),
        prisma.marketplaceItem.count({
          where: { sellerId: userId, status: "AVAILABLE" },
        }),
      ]);

    if (!user) {
      return { error: "User not found." };
    }

    // Compute average attendance
    let totalClasses = 0;
    let attendedClasses = 0;
    subjects.forEach((s) => {
      totalClasses += s.totalClasses;
      attendedClasses += s.attendedClasses;
    });

    const attendancePct =
      totalClasses > 0 ? (attendedClasses / totalClasses) * 100 : 100;

    return {
      success: true,
      data: {
        user,
        stats: {
          attendancePercentage: Number(attendancePct.toFixed(1)),
          activeAssignedGigs: activeGigs,
          totalPostedGigs: postedGigs,
          activePrintOrders: printOrders,
          activeListings: marketplaceItems,
          isBlockedByCooldown: user.freelancerCooldown
            ? new Date(user.freelancerCooldown) > new Date()
            : false,
          cooldownExpiresAt: user.freelancerCooldown,
        },
      },
    };
  } catch (error: any) {
    console.error("Error in getUserDashboardStats:", error);
    return {
      error: error?.message || "Failed to load dashboard stats.",
    };
  }
}
