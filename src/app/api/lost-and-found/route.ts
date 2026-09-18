import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/utils/auth";
import { getLostItems, createLostItem, markLostItemClaimed } from "@/actions/lost-and-found.actions";

/**
 * Mobile & Web REST API: /api/lost-and-found
 * GET: List lost/found items with category and search filter
 * POST: Report a found item or claim an item
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || undefined;
    const search = searchParams.get("search") || undefined;
    const status = searchParams.get("status") || undefined;

    const result = await getLostItems({ category, search, status });
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Failed to load lost & found items." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data || [],
    });
  } catch (error: any) {
    console.error("[GET /api/lost-and-found Error]:", error);
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
        { success: false, error: auth.error || "Authentication required." },
        { status: 401 }
      );
    }

    // Action: Mark Claimed
    if (body.action === "CLAIM") {
      const { itemId, claimNotes } = body;
      if (!itemId) {
        return NextResponse.json(
          { success: false, error: "Item ID is required." },
          { status: 400 }
        );
      }

      const claimResult = await markLostItemClaimed(itemId, userId, claimNotes);

      if (!claimResult.success) {
        return NextResponse.json(
          { success: false, error: claimResult.error || "Failed to mark item claimed." },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        data: claimResult.data,
      });
    }

    // Action: Create Found Item Report
    const { title, description, locationFound, dateFound, imageUrl, category } = body;

    if (!title || !locationFound || !imageUrl) {
      return NextResponse.json(
        { success: false, error: "Title, location found, and photo are required." },
        { status: 400 }
      );
    }

    const createResult = await createLostItem({
      finderId: userId,
      title: title.trim(),
      description: description?.trim() || "",
      locationFound: locationFound.trim(),
      dateFound: dateFound || new Date().toISOString(),
      imageUrl: imageUrl.trim(),
      category: category || "OTHER",
    });

    if (!createResult.success) {
      return NextResponse.json(
        { success: false, error: createResult.error || "Failed to report item." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: createResult.data,
    });
  } catch (error: any) {
    console.error("[POST /api/lost-and-found Error]:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error." },
      { status: 500 }
    );
  }
}
