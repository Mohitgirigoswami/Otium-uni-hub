import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/utils/auth";
import { getMarketplaceItems, createMarketplaceItem, markItemSold, deleteMarketplaceItem } from "@/actions/marketplace.actions";

/**
 * Mobile & Web REST API: /api/marketplace
 * GET: List marketplace items with category, condition, search filter
 * POST: Create a new marketplace item
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || undefined;
    const condition = searchParams.get("condition") || undefined;
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;

    const result = await getMarketplaceItems({ category, condition, status, search });
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Failed to load marketplace items." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data || [],
    });
  } catch (error: any) {
    console.error("[GET /api/marketplace Error]:", error);
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

    // Handle actions: MARK_SOLD, DELETE
    if (body.action === "MARK_SOLD") {
      const { itemId } = body;
      if (!itemId) {
        return NextResponse.json({ success: false, error: "itemId is required." }, { status: 400 });
      }
      const markResult = await markItemSold(itemId, userId);
      if (!markResult.success) {
        return NextResponse.json({ success: false, error: markResult.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, data: markResult.data });
    }

    if (body.action === "DELETE") {
      const { itemId } = body;
      if (!itemId) {
        return NextResponse.json({ success: false, error: "itemId is required." }, { status: 400 });
      }
      const delResult = await deleteMarketplaceItem(itemId, userId);
      if (!delResult.success) {
        return NextResponse.json({ success: false, error: delResult.error }, { status: 400 });
      }
      return NextResponse.json({ success: true });
    }

    const { title, description, priceRupees, category, condition, images, sellerPhone, collegeId } = body;

    if (!title || !description || !priceRupees || !category || !condition) {
      return NextResponse.json(
        { success: false, error: "Title, description, price, category, and condition are required." },
        { status: 400 }
      );
    }

    const createResult = await createMarketplaceItem({
      sellerId: userId,
      title: title.trim(),
      description: description.trim(),
      priceRupees: Number(priceRupees),
      category,
      condition,
      images: Array.isArray(images) ? images : [],
      sellerPhone: sellerPhone ? String(sellerPhone).trim() : undefined,
    });

    if (!createResult.success) {
      return NextResponse.json(
        { success: false, error: createResult.error || "Failed to create listing." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: createResult.data,
    });
  } catch (error: any) {
    console.error("[POST /api/marketplace Error]:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error." },
      { status: 500 }
    );
  }
}

