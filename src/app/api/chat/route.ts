import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/utils/auth";
import { getUserConversations, getOrCreateConversation } from "@/actions/chat.actions";

/**
 * Mobile & Web REST API: /api/chat
 * GET: Fetch conversations for the authenticated student
 * POST: Initialize or retrieve a conversation thread
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { success: false, error: auth.error || "Authentication required." },
        { status: 401 }
      );
    }

    const result = await getUserConversations(auth.user.id);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Failed to fetch conversations." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data || [],
    });
  } catch (error: any) {
    console.error("[GET /api/chat Error]:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { success: false, error: auth.error || "Authentication required." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { participantTwoId, isAnonymousChat = false } = body;

    if (!participantTwoId) {
      return NextResponse.json(
        { success: false, error: "Recipient participant ID is required." },
        { status: 400 }
      );
    }

    const result = await getOrCreateConversation({
      participantOneId: auth.user.id,
      participantTwoId,
      isAnonymousChat: !!isAnonymousChat,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Failed to create conversation." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error: any) {
    console.error("[POST /api/chat Error]:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error." },
      { status: 500 }
    );
  }
}
