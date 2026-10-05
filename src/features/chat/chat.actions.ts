"use server";

import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { ActionResponse } from "@/lib/types";
import {
  GetOrCreateConversationParams,
  SendMessageParams,
  GetConversationMessagesOptions,
} from "./chat.types";

/**
 * Generate deterministic cryptographic blind ID for anonymous chats.
 * Ensures that raw User.id is NEVER stored or exposed in anonymous conversation/message records.
 */
export async function getBlindParticipantId(userId: string): Promise<string> {
  const secret =
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "otium_blind_participant_secret_salt";
  return crypto
    .createHash("sha256")
    .update(`otium_anon:${userId}:${secret}`)
    .digest("hex");
}

/**
 * 1. Find or create a direct conversation between two students (Standard or Anonymous)
 * MUST strictly isolate Public DMs and Anonymous DMs with Cryptographic Blind IDs
 */
export async function getOrCreateConversation(
  data: GetOrCreateConversationParams
): Promise<ActionResponse<any>> {
  try {
    const rateCheck = await checkRateLimit(data.participantOneId);
    if (!rateCheck.success) {
      return { error: rateCheck.error };
    }

    const { participantOneId, isAnonymousChat = false } = data;
    let targetUserId = data.participantTwoId;

    // If anonymous chat, check if participantTwoId is an IncognitoProfile.id
    if (isAnonymousChat && targetUserId) {
      const maybeProfile = await prisma.incognitoProfile.findUnique({
        where: { id: targetUserId },
        select: { userId: true },
      });
      if (maybeProfile?.userId) {
        targetUserId = maybeProfile.userId;
      }
    }

    if (participantOneId === targetUserId) {
      return { error: "Cannot create conversation with yourself." };
    }

    // 1. ANONYMOUS CHAT: Cryptographic Blind IDs & Database Isolation
    if (isAnonymousChat) {
      const blindIdOne = await getBlindParticipantId(participantOneId);
      const blindIdTwo = await getBlindParticipantId(targetUserId);

      // Ensure both users have IncognitoProfiles created (sequential to avoid pool exhaustion)
      const profileOne = await prisma.incognitoProfile.upsert({
        where: { userId: participantOneId },
        create: {
          userId: participantOneId,
          handle: `Anon_${Math.floor(1000 + Math.random() * 9000)}`,
          avatarUrl: `https://api.dicebear.com/9.x/bottts/svg?seed=${blindIdOne.slice(0, 10)}`,
        },
        update: {},
      });
      const profileTwo = await prisma.incognitoProfile.upsert({
        where: { userId: targetUserId },
        create: {
          userId: targetUserId,
          handle: `Anon_${Math.floor(1000 + Math.random() * 9000)}`,
          avatarUrl: `https://api.dicebear.com/9.x/bottts/svg?seed=${blindIdTwo.slice(0, 10)}`,
        },
        update: {},
      });

      // Check existing anonymous conversation by blind IDs
      let conversation = await prisma.conversation.findFirst({
        where: {
          isAnonymousChat: true,
          OR: [
            {
              anonParticipantOneId: blindIdOne,
              anonParticipantTwoId: blindIdTwo,
            },
            {
              anonParticipantOneId: blindIdTwo,
              anonParticipantTwoId: blindIdOne,
            },
          ],
        },
        select: {
          id: true,
          anonParticipantOneId: true,
          anonParticipantTwoId: true,
          incognitoProfileOne: {
            select: { handle: true, avatarUrl: true },
          },
          incognitoProfileTwo: {
            select: { handle: true, avatarUrl: true },
          },
          isAnonymousChat: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            isAnonymousChat: true,
            anonParticipantOneId: blindIdOne,
            anonParticipantTwoId: blindIdTwo,
            incognitoProfileOneId: profileOne.id,
            incognitoProfileTwoId: profileTwo.id,
          },
          select: {
            id: true,
            anonParticipantOneId: true,
            anonParticipantTwoId: true,
            incognitoProfileOne: {
              select: { handle: true, avatarUrl: true },
            },
            incognitoProfileTwo: {
              select: { handle: true, avatarUrl: true },
            },
            isAnonymousChat: true,
            createdAt: true,
            updatedAt: true,
          },
        });
      }

      return {
        success: true,
        data: {
          ...conversation,
          myBlindId: blindIdOne,
        },
      };
    }

    // 2. PUBLIC DIRECT CHAT: Standard Participant IDs
    let conversation = await prisma.conversation.findFirst({
      where: {
        isAnonymousChat: false,
        OR: [
          {
            participantOneId,
            participantTwoId: targetUserId,
          },
          {
            participantOneId: targetUserId,
            participantTwoId: participantOneId,
          },
        ],
      },
      include: {
        participantOne: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            department: true,
            year: true,
          },
        },
        participantTwo: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            department: true,
            year: true,
          },
        },
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          participantOneId,
          participantTwoId: targetUserId,
          isAnonymousChat: false,
        },
        include: {
          participantOne: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              department: true,
              year: true,
            },
          },
          participantTwo: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              department: true,
              year: true,
            },
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
    const msg = error?.message || "";
    const cleanError =
      msg.includes("connection pool") || msg.includes("timed out") || msg.includes("prisma")
        ? "Campus server is temporarily busy. Please try again in a few moments."
        : "Failed to initialize conversation.";
    return {
      error: cleanError,
    };
  }
}

/**
 * 2. Fetch all active conversations for a user with TRUE DATABASE-LEVEL ANONYMOUS ISOLATION
 */
export async function getUserConversations(
  userId: string
): Promise<ActionResponse<any[]>> {
  try {
    const blindId = await getBlindParticipantId(userId);

    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { participantOneId: userId },
          { participantTwoId: userId },
          { anonParticipantOneId: blindId },
          { anonParticipantTwoId: blindId },
        ],
      },
      select: {
        id: true,
        participantOneId: true,
        participantTwoId: true,
        anonParticipantOneId: true,
        anonParticipantTwoId: true,
        isAnonymousChat: true,
        updatedAt: true,
        createdAt: true,
        // Public participant details
        participantOne: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
            department: true,
          },
        },
        participantTwo: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
            department: true,
          },
        },
        // Anonymous Incognito Profiles
        incognitoProfileOne: {
          select: { handle: true, avatarUrl: true },
        },
        incognitoProfileTwo: {
          select: { handle: true, avatarUrl: true },
        },
        messages: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            senderId: true,
            anonSenderId: true,
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Format threads and scrub real user details from anonymous chats
    const formatted = conversations.map((conv) => {
      if (conv.isAnonymousChat) {
        const isParticipantOne = conv.anonParticipantOneId === blindId;
        const otherProfile = isParticipantOne
          ? conv.incognitoProfileTwo
          : conv.incognitoProfileOne;

        return {
          id: conv.id,
          isAnonymousChat: true,
          myBlindId: blindId,
          otherParticipant: {
            incognitoProfile: otherProfile,
          },
          messages: conv.messages.map((m) => ({
            ...m,
            senderId: undefined, // Scrubbed
            isMine: m.anonSenderId === blindId,
          })),
          updatedAt: conv.updatedAt,
          createdAt: conv.createdAt,
        };
      }

      // Public conversation
      const isP1 = conv.participantOneId === userId;
      const otherUser = isP1 ? conv.participantTwo : conv.participantOne;

      return {
        id: conv.id,
        isAnonymousChat: false,
        participantOneId: conv.participantOneId,
        participantTwoId: conv.participantTwoId,
        otherParticipant: otherUser,
        messages: conv.messages.map((m) => ({
          ...m,
          isMine: m.senderId === userId,
        })),
        updatedAt: conv.updatedAt,
        createdAt: conv.createdAt,
      };
    });

    return {
      success: true,
      data: formatted,
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
 * 3. Fetch conversation metadata
 */
export async function getConversationDetails(
  conversationId: string,
  userId: string
): Promise<ActionResponse<any>> {
  try {
    const blindId = await getBlindParticipantId(userId);

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        participantOneId: true,
        participantTwoId: true,
        anonParticipantOneId: true,
        anonParticipantTwoId: true,
        isAnonymousChat: true,
        participantOne: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
            department: true,
          },
        },
        participantTwo: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
            department: true,
          },
        },
        incognitoProfileOne: {
          select: { handle: true, avatarUrl: true },
        },
        incognitoProfileTwo: {
          select: { handle: true, avatarUrl: true },
        },
      },
    });

    if (!conversation) {
      return { error: "Conversation not found." };
    }

    if (conversation.isAnonymousChat) {
      if (
        conversation.anonParticipantOneId !== blindId &&
        conversation.anonParticipantTwoId !== blindId
      ) {
        return { error: "Unauthorized access to anonymous conversation." };
      }

      const isP1 = conversation.anonParticipantOneId === blindId;
      const otherProfile = isP1
        ? conversation.incognitoProfileTwo
        : conversation.incognitoProfileOne;

      return {
        success: true,
        data: {
          id: conversation.id,
          isAnonymousChat: true,
          myBlindId: blindId,
          otherParticipant: {
            incognitoProfile: otherProfile,
          },
        },
      };
    }

    if (
      conversation.participantOneId !== userId &&
      conversation.participantTwoId !== userId
    ) {
      return { error: "Unauthorized access to conversation." };
    }

    const isP1 = conversation.participantOneId === userId;
    const otherUser = isP1 ? conversation.participantTwo : conversation.participantOne;

    return {
      success: true,
      data: {
        id: conversation.id,
        isAnonymousChat: false,
        participantOneId: conversation.participantOneId,
        participantTwoId: conversation.participantTwoId,
        otherParticipant: otherUser,
      },
    };
  } catch (error: any) {
    console.error("Error in getConversationDetails:", error);
    return {
      error: error?.message || "Failed to load conversation.",
    };
  }
}

/**
 * 4. Fetch all messages in a conversation with TRUE CRYPTOGRAPHIC BLIND ID ISOLATION
 * In anonymous chats, real User.id, name, email, and photos are NEVER queried or returned.
 */
export async function getConversationMessages(
  conversationId: string,
  userId: string,
  options?: GetConversationMessagesOptions
): Promise<ActionResponse<any[]>> {
  try {
    const blindId = await getBlindParticipantId(userId);

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: {
        participantOneId: true,
        participantTwoId: true,
        anonParticipantOneId: true,
        anonParticipantTwoId: true,
        isAnonymousChat: true,
      },
    });

    if (!conversation) {
      return { error: "Conversation not found." };
    }

    const limit = Math.min(50, Math.max(1, options?.limit || 25));
    const isDeltaSync = !!options?.after;

    // Verify access & query anonymous messages
    if (conversation.isAnonymousChat) {
      if (
        conversation.anonParticipantOneId !== blindId &&
        conversation.anonParticipantTwoId !== blindId
      ) {
        return { error: "Unauthorized access to anonymous thread." };
      }

      const whereClause: any = { conversationId };
      if (isDeltaSync && options?.after) {
        const afterDate = new Date(options.after);
        if (!isNaN(afterDate.getTime())) {
          whereClause.createdAt = { gt: afterDate };
        }
      }

      const queryOpts: any = {
        where: whereClause,
        select: {
          id: true,
          conversationId: true,
          anonSenderId: true,
          content: true,
          createdAt: true,
          incognitoProfile: {
            select: {
              handle: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: isDeltaSync ? "asc" : "desc" },
      };

      if (!isDeltaSync) {
        queryOpts.take = limit;
        if (options?.cursor) {
          queryOpts.cursor = { id: options.cursor };
          queryOpts.skip = 1;
        }
      }

      const anonymousMessages: any[] = await prisma.message.findMany(queryOpts);

      const scrubbed = anonymousMessages.map((m) => ({
        id: m.id,
        conversationId: m.conversationId,
        content: m.content,
        createdAt: m.createdAt,
        isMine: m.anonSenderId === blindId,
        senderBlindId: m.anonSenderId,
        sender: {
          incognitoProfile: m.incognitoProfile,
        },
      }));

      const hasMore = !isDeltaSync && scrubbed.length === limit;
      const lastId = scrubbed.length > 0 ? scrubbed[scrubbed.length - 1].id : null;
      (scrubbed as any).nextCursor = hasMore ? lastId : null;

      return {
        success: true,
        data: scrubbed,
      };
    }

    // Standard Public Chat Verification
    if (
      conversation.participantOneId !== userId &&
      conversation.participantTwoId !== userId
    ) {
      return { error: "Unauthorized access to messages." };
    }

    const whereClause: any = { conversationId };
    if (isDeltaSync && options?.after) {
      const afterDate = new Date(options.after);
      if (!isNaN(afterDate.getTime())) {
        whereClause.createdAt = { gt: afterDate };
      }
    }

    const queryOpts: any = {
      where: whereClause,
      select: {
        id: true,
        conversationId: true,
        senderId: true,
        content: true,
        createdAt: true,
        sender: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
            department: true,
          },
        },
      },
      orderBy: { createdAt: isDeltaSync ? "asc" : "desc" },
    };

    if (!isDeltaSync) {
      queryOpts.take = limit;
      if (options?.cursor) {
        queryOpts.cursor = { id: options.cursor };
        queryOpts.skip = 1;
      }
    }

    const messages: any[] = await prisma.message.findMany(queryOpts);

    const formatted = messages.map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      content: m.content,
      createdAt: m.createdAt,
      senderId: m.senderId,
      isMine: m.senderId === userId,
      sender: m.sender,
    }));

    const hasMore = !isDeltaSync && formatted.length === limit;
    const lastId = formatted.length > 0 ? formatted[formatted.length - 1].id : null;
    (formatted as any).nextCursor = hasMore ? lastId : null;

    return {
      success: true,
      data: formatted,
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
 * Alias for getConversationMessages
 */
export async function getMessages(
  conversationId: string,
  userId: string
): Promise<ActionResponse<any[]>> {
  return getConversationMessages(conversationId, userId);
}

/**
 * 5. Send a new direct message
 */
export async function sendMessage(data: SendMessageParams): Promise<ActionResponse<any>> {
  try {
    const rateCheck = await checkRateLimit(data.senderId);
    if (!rateCheck.success) {
      return { error: rateCheck.error };
    }

    if (!data.content?.trim()) {
      return { error: "Message content cannot be empty." };
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: data.conversationId },
      select: {
        participantOneId: true,
        participantTwoId: true,
        anonParticipantOneId: true,
        anonParticipantTwoId: true,
        isAnonymousChat: true,
      },
    });

    if (!conversation) {
      return { error: "Conversation not found." };
    }

    // 1. ANONYMOUS MESSAGE CREATION: Zero-Knowledge with Blind ID
    if (conversation.isAnonymousChat) {
      const blindSenderId = await getBlindParticipantId(data.senderId);

      if (
        conversation.anonParticipantOneId !== blindSenderId &&
        conversation.anonParticipantTwoId !== blindSenderId
      ) {
        return { error: "Unauthorized: You are not a participant in this anonymous thread." };
      }

      // Fetch sender's incognito profile
      const profile = await prisma.incognitoProfile.findUnique({
        where: { userId: data.senderId },
      });

      const message = await prisma.message.create({
        data: {
          conversationId: data.conversationId,
          content: data.content.trim(),
          senderId: null, // Strictly null in database!
          anonSenderId: blindSenderId, // Cryptographic blind hash
          incognitoProfileId: profile?.id || null,
        },
        select: {
          id: true,
          conversationId: true,
          anonSenderId: true,
          content: true,
          createdAt: true,
          incognitoProfile: {
            select: { handle: true, avatarUrl: true },
          },
        },
      });

      await prisma.conversation.update({
        where: { id: data.conversationId },
        data: { updatedAt: new Date() },
      });

      return {
        success: true,
        data: {
          id: message.id,
          conversationId: message.conversationId,
          content: message.content,
          createdAt: message.createdAt,
          isMine: true,
          senderBlindId: message.anonSenderId,
          sender: {
            incognitoProfile: message.incognitoProfile,
          },
        },
      };
    }

    // 2. PUBLIC MESSAGE CREATION
    if (
      conversation.participantOneId !== data.senderId &&
      conversation.participantTwoId !== data.senderId
    ) {
      return { error: "Unauthorized: You are not a member of this chat." };
    }

    const message = await prisma.message.create({
      data: {
        conversationId: data.conversationId,
        senderId: data.senderId,
        anonSenderId: null,
        content: data.content.trim(),
      },
      select: {
        id: true,
        conversationId: true,
        senderId: true,
        content: true,
        createdAt: true,
        sender: {
          select: {
            id: true,
            name: true,
            image: true,
            department: true,
          },
        },
      },
    });

    await prisma.conversation.update({
      where: { id: data.conversationId },
      data: { updatedAt: new Date() },
    });

    return {
      success: true,
      data: {
        id: message.id,
        conversationId: message.conversationId,
        content: message.content,
        createdAt: message.createdAt,
        senderId: message.senderId,
        isMine: true,
        sender: message.sender,
      },
    };
  } catch (error: any) {
    console.error("Error in sendMessage:", error);
    return {
      error: error?.message || "Failed to send message.",
    };
  }
}
