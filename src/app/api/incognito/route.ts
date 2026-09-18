import { NextRequest, NextResponse } from "next/server";
import { getIncognitoPosts, createIncognitoPost, toggleLikeIncognitoPost } from "@/actions/incognito.actions";
import { verifyAuth } from "@/utils/auth";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const feedType = searchParams.get("feedType") || undefined;
    const scope = (searchParams.get("scope") as "CAMPUS" | "GLOBAL") || "GLOBAL";
    const collegeId = searchParams.get("collegeId") || undefined;

    const res = await getIncognitoPosts({ feedType, scope, collegeId });
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
    const body = await req.json();

    const userId = auth.authenticated && auth.user ? auth.user.id : body.userId;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required." },
        { status: 401 }
      );
    }

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

    // 2. Otherwise create new anonymous whisper
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

