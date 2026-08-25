"use server";

import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { ActionResponse } from "@/lib/types";

/**
 * Get or automatically initialize a primary user session for the app
 */
export async function getOrCreateCurrentUser(
  targetUserId?: string
): Promise<ActionResponse<any>> {
  try {
    const rateCheck = await checkRateLimit(targetUserId || "user-auth");
    if (!rateCheck.success) {
      return { error: rateCheck.error };
    }

    if (targetUserId) {
      let user = await prisma.user.findUnique({
        where: { id: targetUserId },
        include: {
          incognitoProfile: true,
          assignedTasks: {
            where: { status: "ASSIGNED" },
          },
        },
      });

      if (user) {
        return { success: true, data: user };
      }

      // If requested user is the admin operator, seed it
      if (targetUserId === "usr_admin_operator") {
        user = await prisma.user.create({
          data: {
            id: "usr_admin_operator",
            name: "Campus Print Operator",
            email: "admin.print@uni.edu",
            role: "ADMIN" as any,
            department: "Campus Printing & Operations",
            year: 0,
            image:
              "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
            phone: "+91 99999 00000",
            incognitoProfile: {
              create: {
                handle: "AdminConsole",
                avatarUrl:
                  "https://api.dicebear.com/9.x/bottts/svg?seed=AdminConsole",
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
        return { success: true, data: user };
      }
    }

    // Default primary student
    let user = await prisma.user.findFirst({
      where: { role: "STUDENT" },
      include: {
        incognitoProfile: true,
        assignedTasks: {
          where: { status: "ASSIGNED" },
        },
      },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: "usr_aarav_sharma",
          name: "Aarav Sharma",
          email: "aarav.sharma@uni.edu",
          department: "Computer Science & Engineering",
          year: 3,
          role: "STUDENT" as any,
          image:
            "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
          phone: "+91 98765 43210",
          incognitoProfile: {
            create: {
              handle: "CyberHawk_99",
              avatarUrl:
                "https://api.dicebear.com/9.x/bottts/svg?seed=CyberHawk_99",
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
 * Fetch user by ID
 */
export async function getUserById(userId: string): Promise<ActionResponse<any>> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        incognitoProfile: true,
        assignedTasks: {
          where: { status: "ASSIGNED" },
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
 * Switch persona / user
 */
export async function switchUserPersona(personaId: string): Promise<ActionResponse<any>> {
  return getOrCreateCurrentUser(personaId);
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
          include: { incognitoProfile: true },
        }),
        prisma.subject.findMany({ where: { userId } }),
        prisma.taskGig.count({
          where: { assignedToId: userId, status: "ASSIGNED" },
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
