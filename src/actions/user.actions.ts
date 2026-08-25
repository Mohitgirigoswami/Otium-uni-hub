"use server";

import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { ActionResponse } from "@/lib/types";

/**
 * Get or automatically initialize a primary user session for the app
 */
export async function getOrCreateCurrentUser(): Promise<ActionResponse<any>> {
  try {
    const rateCheck = await checkRateLimit("user-auth");
    if (!rateCheck.success) {
      return { error: rateCheck.error };
    }

    // Try finding existing default user
    let user = await prisma.user.findFirst({
      include: {
        incognitoProfile: true,
        assignedTasks: {
          where: { status: "ASSIGNED" },
        },
      },
    });

    if (!user) {
      // Seed default active student
      user = await prisma.user.create({
        data: {
          name: "Aarav Sharma",
          email: "aarav.sharma@uni.edu",
          department: "Computer Science & Engineering",
          year: 3,
          image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
          phone: "+91 98765 43210",
          incognitoProfile: {
            create: {
              handle: "CyberHawk_99",
              avatarUrl: "https://api.dicebear.com/9.x/bottts/svg?seed=CyberHawk_99",
            },
          },
        },
        include: {
          incognitoProfile: true,
          assignedTasks: {
            where: { status: "ASSIGNED" },
          },
        },
      });
    }

    return {
      success: true,
      data: user,
    };
  } catch (error: any) {
    console.error("Error in getOrCreateCurrentUser:", error);
    return {
      error: error?.message || "Failed to retrieve user profile.",
    };
  }
}

/**
 * Switch or update user profile
 */
export async function updateUserProfile(
  userId: string,
  formData: { name?: string; department?: string; year?: number; phone?: string }
): Promise<ActionResponse<any>> {
  try {
    const rateCheck = await checkRateLimit(userId);
    if (!rateCheck.success) {
      return { error: rateCheck.error };
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        name: formData.name,
        department: formData.department,
        year: formData.year ? Number(formData.year) : undefined,
        phone: formData.phone,
      },
    });

    return {
      success: true,
      data: updated,
    };
  } catch (error: any) {
    console.error("Error in updateUserProfile:", error);
    return {
      error: error?.message || "Failed to update profile.",
    };
  }
}

/**
 * Fetch full dashboard stats for the current user
 */
export async function getDashboardStats(userId: string): Promise<ActionResponse<any>> {
  try {
    const [
      activeTasksCount,
      openGigsCount,
      subjects,
      unclaimedLostCount,
      activeRidesCount,
      marketplaceItemsCount,
      user,
    ] = await Promise.all([
      prisma.taskGig.count({
        where: { assignedToId: userId, status: "ASSIGNED" },
      }),
      prisma.taskGig.count({
        where: { status: "OPEN" },
      }),
      prisma.subject.findMany({
        where: { userId },
      }),
      prisma.lostAndFoundItem.count({
        where: { status: "UNCLAIMED" },
      }),
      prisma.rideShare.count({
        where: { status: "OPEN" },
      }),
      prisma.marketplaceItem.count({
        where: { status: "AVAILABLE" },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        include: { incognitoProfile: true },
      }),
    ]);

    // Calculate overall attendance
    let totalClasses = 0;
    let totalAttended = 0;
    let criticalSubjects = 0;

    subjects.forEach((subj) => {
      totalClasses += subj.totalClasses;
      totalAttended += subj.attendedClasses;
      const pct = subj.totalClasses > 0 ? (subj.attendedClasses / subj.totalClasses) * 100 : 100;
      if (pct < 75) criticalSubjects++;
    });

    const overallAttendance =
      totalClasses > 0 ? Number(((totalAttended / totalClasses) * 100).toFixed(1)) : 100;

    return {
      success: true,
      data: {
        user,
        activeTasksCount,
        openGigsCount,
        overallAttendance,
        criticalSubjects,
        totalSubjects: subjects.length,
        unclaimedLostCount,
        activeRidesCount,
        marketplaceItemsCount,
      },
    };
  } catch (error: any) {
    console.error("Error in getDashboardStats:", error);
    return {
      error: error?.message || "Failed to load dashboard statistics.",
    };
  }
}
