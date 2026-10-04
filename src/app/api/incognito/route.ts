import { NextRequest, NextResponse } from "next/server";
import {
  getIncognitoPosts,
  createIncognitoPost,
  toggleLikeIncognitoPost,
  createIncognitoComment,
  getIncognitoComments,
  deleteIncognitoPost,
} from "@/actions/incognito.actions";
import { verifyAuth } from "@/utils/auth";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const postId = searchParams.get("postId");
    const isComments = searchParams.get("comments") === "true" || searchParams.get("action") === "COMMENTS";

    // 1. Fetch comments for a specific post
    if (postId && isComments) {
      const res = await getIncognitoComments(postId);
      return NextResponse.json(res);
    }

    // 2. Otherwise fetch posts feed
    const feedType = searchParams.get("feedType") || undefined;
    const scope = (searchParams.get("scope") as "CAMPUS" | "GLOBAL") || "GLOBAL";
    const collegeId = searchParams.get("collegeId") || undefined;

    const auth = await verifyAuth(req);
    const userId = auth.authenticated && auth.user ? auth.user.id : undefined;

    const res = await getIncognitoPosts({ feedType, scope, collegeId, userId });
    return NextResponse.json(res);
  } catch (error: any) {
    console.error("[GET /api/incognito Error]:", error);
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

    const userId = auth.user.id;
    const body = await req.json();

    // 1. Handle Like / Vote action
    if (body.action === "LIKE" || body.action === "VOTE") {
      const postId = body.postId;
      if (!postId) {
        return NextResponse.json(
          { success: false, error: "Post ID is required to like." },
          { status: 400 }
        );
      }

      const res = await toggleLikeIncognitoPost(postId, userId);
      return NextResponse.json(res);
    }

    // 2. Handle Comment creation action
    if (body.action === "COMMENT") {
      const { postId, content } = body;
      if (!postId || !content?.trim()) {
        return NextResponse.json(
          { success: false, error: "Post ID and comment content are required." },
          { status: 400 }
        );
      }

      const res = await createIncognitoComment({
        userId,
        postId,
        content: content.trim(),
      });
      return NextResponse.json(res);
    }

    // 3. Otherwise create new anonymous whisper
    const { content, feedType, mediaUrl, mediaUrls, collegeId } = body;

    const res = await createIncognitoPost({
      userId,
      content,
      feedType,
      mediaUrl,
      mediaUrls,
      collegeId: collegeId || auth.user?.collegeId,
    });

    if (!res.success) {
      return NextResponse.json(
        { success: false, error: res.error || "Failed to create post." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: res.data,
      message: "Whisper published successfully.",
    });
  } catch (error: any) {
    console.error("[POST /api/incognito Error]:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { success: false, error: auth.error || "Authentication required to delete whisper." },
        { status: 401 }
      );
    }

    const userId = auth.user.id;
    const { searchParams } = new URL(req.url);
    let postId = searchParams.get("postId");

    if (!postId) {
      try {
        const body = await req.json();
        postId = body.postId;
      } catch {}
    }

    if (!postId) {
      return NextResponse.json(
        { success: false, error: "Post ID is required." },
        { status: 400 }
      );
    }

    const res = await deleteIncognitoPost(postId, userId);
    return NextResponse.json(res);
  } catch (error: any) {
    console.error("[DELETE /api/incognito Error]:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error." },
      { status: 500 }
    );
  }
}

