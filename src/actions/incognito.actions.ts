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
  userId?: string;
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
            userId: true,
          },
        },
        college: {
          select: {
            id: true,
            name: true,
            city: true,
          },
        },
        likes: {
          select: {
            userId: true,
          },
        },
        _count: {
          select: {
            comments: true,
            likes: true,
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
 * Fetch single post with full comments for Dedicated Thread View (/wall/[postId])
 */
export async function getIncognitoPostById(
  postId: string,
  userId?: string
): Promise<ActionResponse<any>> {
  try {
    const post = await prisma.incognitoPost.findUnique({
      where: { id: postId },
      include: {
        profile: {
          select: {
            id: true,
            handle: true,
            avatarUrl: true,
            userId: true,
          },
        },
        college: {
          select: {
            id: true,
            name: true,
            city: true,
          },
        },
        likes: {
          select: {
            userId: true,
          },
        },
        comments: {
          include: {
            profile: {
              select: {
                id: true,
                handle: true,
                avatarUrl: true,
                userId: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        _count: {
          select: {
            comments: true,
            likes: true,
          },
        },
      },
    });

    if (!post) {
      return { error: "Post not found." };
    }

    return {
      success: true,
      data: post,
    };
  } catch (error: any) {
    console.error("Error in getIncognitoPostById:", error);
    return {
      error: error?.message || "Failed to load post detail.",
    };
  }
}

/**
 * Publish anonymous whisper/post on the Incognito Wall (Supports 1-4 images)
 */
export async function createIncognitoPost(data: {
  userId: string;
  content: string;
  mediaUrl?: string;
  mediaUrls?: string[];
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

    // Normalize mediaUrls (2-4 images support)
    const mediaUrlsList = Array.isArray(data.mediaUrls)
      ? data.mediaUrls.filter(Boolean)
      : data.mediaUrl
      ? [data.mediaUrl]
      : [];

    const primaryMediaUrl = mediaUrlsList.length > 0 ? mediaUrlsList[0] : (data.mediaUrl || null);

    const post = await prisma.incognitoPost.create({
      data: {
        content: data.content.trim(),
        mediaUrl: primaryMediaUrl,
        mediaUrls: mediaUrlsList,
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
 * TASK 3: Database Security & Like Anti-Spam (Idempotent toggle backed by composite unique constraint)
 */
export async function toggleLikeIncognitoPost(
  postId: string,
  userId: string
): Promise<ActionResponse<{ liked: boolean; likesCount: number }>> {
  try {
    const rateCheck = await checkRateLimit(userId);
    if (!rateCheck.success) {
      return { error: rateCheck.error };
    }

    // Check if like record already exists for this (userId, postId)
    const existingLike = await prisma.postLike.findUnique({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    });

    if (existingLike) {
      // Unlike: remove record and decrement
      const [, updatedPost] = await prisma.$transaction([
        prisma.postLike.delete({
          where: {
            userId_postId: {
              userId,
              postId,
            },
          },
        }),
        prisma.incognitoPost.update({
          where: { id: postId },
          data: {
            likesCount: {
              decrement: 1,
            },
          },
        }),
      ]);

      const finalCount = Math.max(0, updatedPost.likesCount);
      return {
        success: true,
        data: {
          liked: false,
          likesCount: finalCount,
        },
      };
    } else {
      // Like: create record and increment
      const [, updatedPost] = await prisma.$transaction([
        prisma.postLike.create({
          data: {
            userId,
            postId,
          },
        }),
        prisma.incognitoPost.update({
          where: { id: postId },
          data: {
            likesCount: {
              increment: 1,
            },
          },
        }),
      ]);

      return {
        success: true,
        data: {
          liked: true,
          likesCount: updatedPost.likesCount,
        },
      };
    }
  } catch (error: any) {
    console.error("Error in toggleLikeIncognitoPost:", error);
    return {
      error: error?.message || "Failed to update like status.",
    };
  }
}

// Legacy alias to maintain backwards compatibility
export const likeIncognitoPost = toggleLikeIncognitoPost;

/**
 * TASK 2.4: Comments System - Post a reply to an incognito whisper
 */
export async function createIncognitoComment(data: {
  userId: string;
  postId: string;
  content: string;
}): Promise<ActionResponse<any>> {
  try {
    const rateCheck = await checkRateLimit(data.userId);
    if (!rateCheck.success) {
      return { error: rateCheck.error };
    }

    if (!data.content?.trim()) {
      return { error: "Comment cannot be empty." };
    }

    // Ensure incognito profile exists
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

    const comment = await prisma.incognitoComment.create({
      data: {
        postId: data.postId,
        profileId: profile.id,
        content: data.content.trim(),
      },
      include: {
        profile: {
          select: {
            id: true,
            handle: true,
            avatarUrl: true,
            userId: true,
          },
        },
      },
    });

    return {
      success: true,
      data: comment,
    };
  } catch (error: any) {
    console.error("Error in createIncognitoComment:", error);
    return {
      error: error?.message || "Failed to post comment.",
    };
  }
}

/**
 * Fetch comments for a specific post
 */
export async function getIncognitoComments(
  postId: string
): Promise<ActionResponse<any[]>> {
  try {
    const comments = await prisma.incognitoComment.findMany({
      where: { postId },
      include: {
        profile: {
          select: {
            id: true,
            handle: true,
            avatarUrl: true,
            userId: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return {
      success: true,
      data: comments,
    };
  } catch (error: any) {
    console.error("Error in getIncognitoComments:", error);
    return {
      error: error?.message || "Failed to load comments.",
      data: [],
    };
  }
}
