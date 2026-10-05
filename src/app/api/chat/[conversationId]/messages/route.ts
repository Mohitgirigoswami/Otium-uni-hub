import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/utils/auth";
import { getConversationMessages, sendMessage } from "@/actions/chat.actions";

/**
 * Mobile & Web REST API: /api/chat/[conversationId]/messages
 * GET: Fetch messages for a conversation
 * POST: Send a message in the conversation
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const auth = await verifyAuth(req);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { success: false, error: auth.error || "Authentication required." },
        { status: 401 }
      );
    }

    const { conversationId } = params;
    if (!conversationId) {
      return NextResponse.json(
        { success: false, error: "Conversation ID is required." },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : undefined;
    const after = searchParams.get("after") || undefined;

    const result = await getConversationMessages(conversationId, auth.user.id, {
      cursor,
      limit,
      after,
    });
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Failed to fetch messages." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data || [],
      nextCursor: (result.data as any)?.nextCursor || null,
    });
  } catch (error: any) {
    console.error("[GET /api/chat/[id]/messages Error]:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error." },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const auth = await verifyAuth(req);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { success: false, error: auth.error || "Authentication required." },
        { status: 401 }
      );
    }

    const { conversationId } = params;
    if (!conversationId) {
      return NextResponse.json(
        { success: false, error: "Conversation ID is required." },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { content } = body;

    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json(
        { success: false, error: "Message content cannot be empty." },
        { status: 400 }
      );
    }

    const result = await sendMessage({
      conversationId,
      senderId: auth.user.id,
      content: content.trim(),
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Failed to send message." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error: any) {
    console.error("[POST /api/chat/[id]/messages Error]:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error." },
      { status: 500 }
    );
  }
}
