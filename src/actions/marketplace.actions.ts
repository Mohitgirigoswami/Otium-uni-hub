"use server";

import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { ActionResponse, ItemConditionType, MarketplaceCategoryType } from "@/lib/types";
import { rupeesToPaise } from "@/lib/utils";

/**
 * Fetch marketplace listings
 */
export async function getMarketplaceItems(filters?: {
  category?: string;
  condition?: string;
  status?: string;
  search?: string;
}): Promise<ActionResponse<any[]>> {
  try {
    const where: any = {};

    if (filters?.status && filters.status !== "ALL") {
      where.status = filters.status;
    }

    if (filters?.category && filters.category !== "ALL") {
      where.category = filters.category;
    }

    if (filters?.condition && filters.condition !== "ALL") {
      where.condition = filters.condition;
    }

    if (filters?.search && filters.search.trim() !== "") {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const items = await prisma.marketplaceItem.findMany({
      where,
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            image: true,
            department: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      data: items,
    };
  } catch (error: any) {
    console.error("Error in getMarketplaceItems:", error);
    return {
      error: error?.message || "Failed to fetch marketplace items.",
      data: [],
    };
  }
}

/**
 * List a new item for sale (Converts INR to Paise)
 */
export async function createMarketplaceItem(data: {
  sellerId: string;
  title: string;
  description: string;
  priceRupees: number;
  category: MarketplaceCategoryType;
  condition: ItemConditionType;
  images: string[];
  sellerPhone?: string;
}): Promise<ActionResponse<any>> {
  try {
    const rateCheck = await checkRateLimit(data.sellerId);
    if (!rateCheck.success) {
      return { error: rateCheck.error };
    }

    if (!data.title?.trim()) return { error: "Item title is required." };
    if (!data.description?.trim()) return { error: "Description is required." };
    if (data.priceRupees === undefined || data.priceRupees < 0) {
      return { error: "Valid price in Rupees is required." };
    }

    const cleanPhoneDigits = data.sellerPhone ? data.sellerPhone.replace(/\D/g, "").slice(-10) : "";

    const pricePaise = rupeesToPaise(data.priceRupees);
    const imagesList = data.images && data.images.length > 0 ? data.images : [
      "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=500&auto=format&fit=crop&q=80"
    ];

    const item = await prisma.$transaction(async (tx) => {
      if (cleanPhoneDigits && cleanPhoneDigits.length === 10) {
        await tx.user.update({
          where: { id: data.sellerId },
          data: { phone: cleanPhoneDigits },
        });
      }

      return tx.marketplaceItem.create({
        data: {
          sellerId: data.sellerId,
          title: data.title.trim(),
          description: data.description.trim(),
          price: pricePaise, // Strictly store in Paise
          category: data.category as any,
          condition: data.condition as any,
          images: imagesList,
          status: "AVAILABLE",
        },
        include: {
          seller: true,
        },
      });
    });

    return {
      success: true,
      data: item,
    };
  } catch (error: any) {
    console.error("Error in createMarketplaceItem:", error);
    return {
      error: error?.message || "Failed to create marketplace listing.",
    };
  }
}

/**
 * Mark item as SOLD
 */
export async function markItemSold(
  itemId: string,
  sellerId: string
): Promise<ActionResponse<any>> {
  try {
    const rateCheck = await checkRateLimit(sellerId);
    if (!rateCheck.success) {
      return { error: rateCheck.error };
    }

    const item = await prisma.marketplaceItem.findUnique({
      where: { id: itemId },
    });

    if (!item || item.sellerId !== sellerId) {
      return { error: "Listing not found or unauthorized." };
    }

    const updated = await prisma.marketplaceItem.update({
      where: { id: itemId },
      data: {
        status: "SOLD",
      },
    });

    return {
      success: true,
      data: updated,
    };
  } catch (error: any) {
    console.error("Error in markItemSold:", error);
    return {
      error: error?.message || "Failed to update item status.",
    };
  }
}

import { deleteCloudinaryAsset } from "@/actions/upload.actions";

/**
 * Delete a marketplace listing and its stored images
 */
export async function deleteMarketplaceItem(
  itemId: string,
  sellerId: string
): Promise<ActionResponse<any>> {
  try {
    const rateCheck = await checkRateLimit(sellerId);
    if (!rateCheck.success) {
      return { error: rateCheck.error };
    }

    const item = await prisma.marketplaceItem.findFirst({
      where: { id: itemId, sellerId },
      select: { id: true, images: true },
    });

    if (item && item.images && item.images.length > 0) {
      for (const imgUrl of item.images) {
        if (imgUrl.includes("cloudinary.com")) {
          deleteCloudinaryAsset(imgUrl).catch(() => {});
        }
      }
    }

    await prisma.marketplaceItem.deleteMany({
      where: {
        id: itemId,
        sellerId,
      },
    });

    return {
      success: true,
    };
  } catch (error: any) {
    console.error("Error in deleteMarketplaceItem:", error);
    return {
      error: error?.message || "Failed to delete marketplace item.",
    };
  }
}
