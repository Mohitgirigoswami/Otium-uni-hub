"use server";

import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { ActionResponse } from "@/lib/types";

/**
 * Fetch existing incognito profile for user
 */
export async function getIncognitoProfile(userId: string): Promise<ActionResponse<any>> {
  try {
    const profile = await prisma.incognitoProfile.findUnique({
      where: { userId },
    });

    return {
      success: true,
      data: profile,
    };
  } catch (error: any) {
    console.error("Error in getIncognitoProfile:", error);
    return {
      error: error?.message || "Failed to load incognito profile.",
    };
  }
}

/**
 * Create or update anonymous handle with auto-generated DiceBear Bottts avatar
 */
export async function setupIncognitoProfile(
  userId: string,
  handle: string
): Promise<ActionResponse<any>> {
  try {
    const rateCheck = await checkRateLimit(userId);
    if (!rateCheck.success) {
      return { error: rateCheck.error };
    }

    const cleanHandle = handle.trim().replace(/[^a-zA-Z0-9_]/g, "");
    if (!cleanHandle || cleanHandle.length < 3) {
      return { error: "Handle must be at least 3 alphanumeric characters." };
    }

    // Auto-generate avatar with Dicebear bottts
    const avatarUrl = `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(cleanHandle)}`;

    // Check if handle is already taken by another user
    const existing = await prisma.incognitoProfile.findUnique({
      where: { handle: cleanHandle },
    });

    if (existing && existing.userId !== userId) {
      return { error: `The alias "${cleanHandle}" is already claimed. Pick another pseudonym!` };
    }

    const profile = await prisma.incognitoProfile.upsert({
      where: { userId },
      create: {
        userId,
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
    console.error("Error in setupIncognitoProfile:", error);
    return {
      error: error?.message || "Failed to initialize incognito profile.",
    };
  }
}

/**
 * Fetch posts from the Incognito Wall (Supports CAMPUS vs GLOBAL feeds)
 */
export async function getIncognitoPosts(params?: {
  feedType?: string;
  scope?: "CAMPUS" | "GLOBAL";
  collegeId?: string | null;
}): Promise<ActionResponse<any[]>> {
  try {
    const where: any = {};
    const feedType = typeof params === "string" ? params : params?.feedType;
    const scope = typeof params === "object" ? params?.scope : "CAMPUS";
    const collegeId = typeof params === "object" ? params?.collegeId : null;

    if (feedType && feedType !== "ALL") {
      where.feedType = feedType;
    }

    // Campus vs Global Scoping
    if (scope === "CAMPUS" && collegeId) {
      where.collegeId = collegeId;
    }

    const posts = await prisma.incognitoPost.findMany({
      where,
      include: {
        profile: {
          select: {
            id: true,
            handle: true,
            avatarUrl: true,
          },
        },
        college: {
          select: {
            id: true,
            name: true,
            city: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      data: posts,
    };
  } catch (error: any) {
    console.error("Error in getIncognitoPosts:", error);
    return {
      error: error?.message || "Failed to fetch incognito feed.",
      data: [],
    };
  }
}

/**
 * Publish anonymous whisper/post on the Incognito Wall tagged with user's college
 */
export async function createIncognitoPost(data: {
  userId: string;
  content: string;
  mediaUrl?: string;
  feedType?: string;
  collegeId?: string | null;
}): Promise<ActionResponse<any>> {
  try {
    const rateCheck = await checkRateLimit(data.userId);
    if (!rateCheck.success) {
      return { error: rateCheck.error };
    }

    if (!data.content?.trim()) {
      return { error: "Post content cannot be empty." };
    }

    // Look up user to get their collegeId if not provided
    const userRecord = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { collegeId: true },
    });

    const activeCollegeId = data.collegeId || userRecord?.collegeId || null;

    // Force incognito profile existence
    let profile = await prisma.incognitoProfile.findUnique({
      where: { userId: data.userId },
    });

    if (!profile) {
      const defaultHandle = `Anon_${Math.floor(1000 + Math.random() * 9000)}`;
      const avatarUrl = `https://api.dicebear.com/9.x/bottts/svg?seed=${defaultHandle}`;
      profile = await prisma.incognitoProfile.create({
        data: {
          userId: data.userId,
          handle: defaultHandle,
          avatarUrl,
        },
      });
    }

    const post = await prisma.incognitoPost.create({
      data: {
        content: data.content.trim(),
        mediaUrl: data.mediaUrl || null,
        feedType: data.feedType || "GENERAL",
        profileId: profile.id,
        collegeId: activeCollegeId,
      },
      include: {
        profile: true,
        college: true,
      },
    });

    return {
      success: true,
      data: post,
    };
  } catch (error: any) {
    console.error("Error in createIncognitoPost:", error);
    return {
      error: error?.message || "Failed to post anonymously.",
    };
  }
}

/**
 * Upvote/Like an anonymous post
 */
export async function likeIncognitoPost(
  postId: string,
  userId: string
): Promise<ActionResponse<any>> {
  try {
    const rateCheck = await checkRateLimit(userId);
    if (!rateCheck.success) {
      return { error: rateCheck.error };
    }

    const updated = await prisma.incognitoPost.update({
      where: { id: postId },
      data: {
        likesCount: {
          increment: 1,
        },
      },
    });

    return {
      success: true,
      data: updated,
    };
  } catch (error: any) {
    console.error("Error in likeIncognitoPost:", error);
    return {
      error: error?.message || "Failed to like post.",
    };
  }
}
