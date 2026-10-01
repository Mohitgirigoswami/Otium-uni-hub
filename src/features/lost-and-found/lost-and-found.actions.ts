"use server";

import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { ActionResponse } from "@/lib/types";
import { LostItemFilters, CreateLostItemParams } from "./lost-and-found.types";

/**
 * Fetch lost and found items
 */
export async function getLostItems(filters?: LostItemFilters): Promise<ActionResponse<any[]>> {
  try {
    const where: any = {};

    if (filters?.status && filters.status !== "ALL") {
      where.status = filters.status;
    }

    if (filters?.category && filters.category !== "ALL") {
      where.category = filters.category;
    }

    if (filters?.collegeId) {
      where.collegeId = filters.collegeId;
    }

    if (filters?.search && filters.search.trim() !== "") {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
        { locationFound: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const items = await prisma.lostAndFoundItem.findMany({
      where,
      include: {
        finder: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            phone: true,
            department: true,
          },
        },
      },
      orderBy: { dateFound: "desc" },
    });

    return {
      success: true,
      data: items,
    };
  } catch (error: any) {
    console.error("Error in getLostItems:", error);
    return {
      error: error?.message || "Failed to fetch lost & found items.",
      data: [],
    };
  }
}

/**
 * Report a newly found item
 */
export async function createLostItem(data: CreateLostItemParams): Promise<ActionResponse<any>> {
  try {
    const rateCheck = await checkRateLimit(data.finderId);
    if (!rateCheck.success) {
      return { error: rateCheck.error };
    }

    if (!data.title?.trim()) return { error: "Item title is required." };
    if (!data.description?.trim()) return { error: "Description is required." };
    if (!data.locationFound?.trim()) return { error: "Location found is required." };
    if (!data.imageUrl?.trim()) return { error: "Item photograph is required." };

    const finder = await prisma.user.findUnique({
      where: { id: data.finderId },
      select: { collegeId: true },
    });
    const activeCollegeId = data.collegeId || finder?.collegeId || null;

    const item = await prisma.lostAndFoundItem.create({
      data: {
        finderId: data.finderId,
        collegeId: activeCollegeId,
        title: data.title.trim(),
        description: data.description.trim(),
        locationFound: data.locationFound.trim(),
        dateFound: data.dateFound ? new Date(data.dateFound) : new Date(),
        imageUrl: data.imageUrl,
        category: data.category || "OTHER",
        status: "UNCLAIMED",
      },
      include: {
        finder: true,
        college: true,
      },
    });

    return {
      success: true,
      data: item,
    };
  } catch (error: any) {
    console.error("Error in createLostItem:", error);
    return {
      error: error?.message || "Failed to report lost item.",
    };
  }
}

/**
 * Mark a lost item as claimed / resolved
 */
export async function markLostItemClaimed(
  itemId: string,
  userId: string,
  claimNotes?: string
): Promise<ActionResponse<any>> {
  try {
    const rateCheck = await checkRateLimit(userId);
    if (!rateCheck.success) {
      return { error: rateCheck.error };
    }

    const item = await prisma.lostAndFoundItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      return { error: "Lost item not found." };
    }

    const updated = await prisma.lostAndFoundItem.update({
      where: { id: itemId },
      data: {
        status: "CLAIMED",
        claimedById: userId,
        claimNotes: claimNotes || "Claimed via Otium Uni Hub",
      },
    });

    return {
      success: true,
      data: updated,
    };
  } catch (error: any) {
    console.error("Error in markLostItemClaimed:", error);
    return {
      error: error?.message || "Failed to mark item as claimed.",
    };
  }
}
