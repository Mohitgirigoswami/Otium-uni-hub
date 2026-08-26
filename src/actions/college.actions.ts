"use server";

import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { ActionResponse } from "@/lib/types";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function verifySuperAdmin(adminUserId: string): Promise<boolean> {
  if (!adminUserId) return false;
  const session = await getServerSession(authOptions);
  if (session?.user?.role === "SUPER_ADMIN") return true;

  const user = await prisma.user.findUnique({
    where: { id: adminUserId },
    select: { role: true },
  });
  return user?.role === "SUPER_ADMIN";
}

/**
 * 1. Fetch all colleges
 */
export async function getColleges(): Promise<ActionResponse<any[]>> {
  try {
    const colleges = await prisma.college.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: {
            users: true,
            marketplaceItems: true,
            postedTasks: true,
            incognitoPosts: true,
          },
        },
      },
    });

    return {
      success: true,
      data: colleges,
    };
  } catch (error: any) {
    console.error("Error in getColleges:", error);
    return {
      error: error?.message || "Failed to fetch colleges.",
      data: [],
    };
  }
}

/**
 * 2. Set user's college during Onboarding
 */
export async function setUserCollege(data: {
  userId: string;
  collegeId: string;
}): Promise<ActionResponse<any>> {
  try {
    const rateCheck = await checkRateLimit(data.userId);
    if (!rateCheck.success) return { error: rateCheck.error };

    if (!data.collegeId) {
      return { error: "Please select a valid college." };
    }

    const college = await prisma.college.findUnique({
      where: { id: data.collegeId },
    });

    if (!college) {
      return { error: "Selected college does not exist." };
    }

    const updatedUser = await prisma.user.update({
      where: { id: data.userId },
      data: {
        collegeId: data.collegeId,
      },
      include: {
        college: true,
        incognitoProfile: true,
      },
    });

    return {
      success: true,
      data: updatedUser,
    };
  } catch (error: any) {
    console.error("Error in setUserCollege:", error);
    return {
      error: error?.message || "Failed to assign college.",
    };
  }
}

/**
 * 3. Create a new College (SUPER_ADMIN only)
 */
export async function createCollege(data: {
  name: string;
  city: string;
  adminUserId: string;
}): Promise<ActionResponse<any>> {
  try {
    const rateCheck = await checkRateLimit(data.adminUserId);
    if (!rateCheck.success) return { error: rateCheck.error };

    const isSuper = await verifySuperAdmin(data.adminUserId);
    if (!isSuper) {
      return { error: "Unauthorized: Only SUPER_ADMIN can manage colleges." };
    }

    if (!data.name?.trim() || !data.city?.trim()) {
      return { error: "College name and city are required." };
    }

    const existing = await prisma.college.findUnique({
      where: { name: data.name.trim() },
    });

    if (existing) {
      return { error: `College "${data.name.trim()}" is already registered.` };
    }

    const college = await prisma.college.create({
      data: {
        name: data.name.trim(),
        city: data.city.trim(),
      },
    });

    return {
      success: true,
      data: college,
    };
  } catch (error: any) {
    console.error("Error in createCollege:", error);
    return {
      error: error?.message || "Failed to create college.",
    };
  }
}

/**
 * 4. Update College (SUPER_ADMIN only)
 */
export async function updateCollege(data: {
  id: string;
  name: string;
  city: string;
  adminUserId: string;
}): Promise<ActionResponse<any>> {
  try {
    const rateCheck = await checkRateLimit(data.adminUserId);
    if (!rateCheck.success) return { error: rateCheck.error };

    const isSuper = await verifySuperAdmin(data.adminUserId);
    if (!isSuper) {
      return { error: "Unauthorized: Only SUPER_ADMIN can edit colleges." };
    }

    const college = await prisma.college.update({
      where: { id: data.id },
      data: {
        name: data.name.trim(),
        city: data.city.trim(),
      },
    });

    return {
      success: true,
      data: college,
    };
  } catch (error: any) {
    console.error("Error in updateCollege:", error);
    return {
      error: error?.message || "Failed to update college.",
    };
  }
}

/**
 * 5. Delete College (SUPER_ADMIN only)
 */
export async function deleteCollege(data: {
  id: string;
  adminUserId: string;
}): Promise<ActionResponse<any>> {
  try {
    const rateCheck = await checkRateLimit(data.adminUserId);
    if (!rateCheck.success) return { error: rateCheck.error };

    const isSuper = await verifySuperAdmin(data.adminUserId);
    if (!isSuper) {
      return { error: "Unauthorized: Only SUPER_ADMIN can delete colleges." };
    }

    await prisma.college.delete({
      where: { id: data.id },
    });

    return {
      success: true,
    };
  } catch (error: any) {
    console.error("Error in deleteCollege:", error);
    return {
      error: error?.message || "Failed to delete college.",
    };
  }
}
