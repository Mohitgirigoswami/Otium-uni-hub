"use server";

import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { ActionResponse } from "@/lib/types";

/**
 * 1. Find or create a direct conversation between two students (Standard or Anonymous)
 */
export async function getOrCreateConversation(data: {
  participantOneId: string;
  participantTwoId: string;
  isAnonymousChat?: boolean;
}): Promise<ActionResponse<any>> {
  try {
    const rateCheck = await checkRateLimit(data.participantOneId);
    if (!rateCheck.success) {
      return { error: rateCheck.error };
    }

    const { participantOneId, participantTwoId, isAnonymousChat = false } = data;

    if (participantOneId === participantTwoId) {
      return { error: "Cannot create conversation with yourself." };
    }

    // Check if conversation already exists between these 2 users with matching anonymity mode
    let conversation = await prisma.conversation.findFirst({
      where: {
        isAnonymousChat,
        OR: [
          {
            participantOneId,
            participantTwoId,
          },
          {
            participantOneId: participantTwoId,
            participantTwoId: participantOneId,
          },
        ],
      },
      include: {
        participantOne: {
          include: { incognitoProfile: true },
        },
        participantTwo: {
          include: { incognitoProfile: true },
        },
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          participantOneId,
          participantTwoId,
          isAnonymousChat,
        },
        include: {
          participantOne: {
            include: { incognitoProfile: true },
          },
          participantTwo: {
            include: { incognitoProfile: true },
          },
        },
      });
    }

    return {
      success: true,
      data: conversation,
    };
  } catch (error: any) {
    console.error("Error in getOrCreateConversation:", error);
    return {
      error: error?.message || "Failed to initialize conversation.",
    };
  }
}

/**
 * 2. Fetch all active conversations for a user
 */
export async function getUserConversations(
  userId: string
): Promise<ActionResponse<any[]>> {
  try {
    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [{ participantOneId: userId }, { participantTwoId: userId }],
      },
      include: {
        participantOne: {
          include: { incognitoProfile: true },
        },
        participantTwo: {
          include: { incognitoProfile: true },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return {
      success: true,
      data: conversations,
    };
  } catch (error: any) {
    console.error("Error in getUserConversations:", error);
    return {
      error: error?.message || "Failed to fetch conversations.",
      data: [],
    };
  }
}

/**
 * 3. Fetch conversation metadata and message history
 */
export async function getConversationDetails(
  conversationId: string,
  userId: string
): Promise<ActionResponse<any>> {
  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participantOne: {
          include: { incognitoProfile: true },
        },
        participantTwo: {
          include: { incognitoProfile: true },
        },
      },
    });

    if (!conversation) {
      return { error: "Conversation not found." };
    }

    if (
      conversation.participantOneId !== userId &&
      conversation.participantTwoId !== userId
    ) {
      return { error: "Unauthorized: You are not a participant in this conversation." };
    }

    return {
      success: true,
      data: conversation,
    };
  } catch (error: any) {
    console.error("Error in getConversationDetails:", error);
    return {
      error: error?.message || "Failed to load conversation.",
    };
  }
}

/**
 * 4. Fetch all messages in a conversation
 */
export async function getConversationMessages(
  conversationId: string,
  userId: string
): Promise<ActionResponse<any[]>> {
  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { participantOneId: true, participantTwoId: true },
    });

    if (
      !conversation ||
      (conversation.participantOneId !== userId &&
        conversation.participantTwoId !== userId)
    ) {
      return { error: "Unauthorized access to messages." };
    }

    const messages = await prisma.message.findMany({
      where: { conversationId },
      include: {
        sender: {
          include: { incognitoProfile: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return {
      success: true,
      data: messages,
    };
  } catch (error: any) {
    console.error("Error in getConversationMessages:", error);
    return {
      error: error?.message || "Failed to fetch message history.",
      data: [],
    };
  }
}

/**
 * 5. Send a new direct message
 */
export async function sendMessage(data: {
  conversationId: string;
  senderId: string;
  content: string;
}): Promise<ActionResponse<any>> {
  try {
    const rateCheck = await checkRateLimit(data.senderId);
    if (!rateCheck.success) {
      return { error: rateCheck.error };
    }

    if (!data.content?.trim()) {
      return { error: "Message content cannot be empty." };
    }

    // Verify participant
    const conversation = await prisma.conversation.findUnique({
      where: { id: data.conversationId },
    });

    if (
      !conversation ||
      (conversation.participantOneId !== data.senderId &&
        conversation.participantTwoId !== data.senderId)
    ) {
      return { error: "Unauthorized: You are not a member of this chat." };
    }

    const message = await prisma.message.create({
      data: {
        conversationId: data.conversationId,
        senderId: data.senderId,
        content: data.content.trim(),
      },
      include: {
        sender: {
          include: { incognitoProfile: true },
        },
      },
    });

    // Touch conversation updatedAt
    await prisma.conversation.update({
      where: { id: data.conversationId },
      data: { updatedAt: new Date() },
    });

    return {
      success: true,
      data: message,
    };
  } catch (error: any) {
    console.error("Error in sendMessage:", error);
    return {
      error: error?.message || "Failed to send message.",
    };
  }
}
