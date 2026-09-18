import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/utils/auth";
import { getGigs, createGig, claimGig, dropGig } from "@/actions/gigs.actions";

/**
 * Mobile & Web REST API: /api/gigs
 * GET: List student gigs with category and search filter
 * POST: Create a new gig, or claim/drop existing gig
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || undefined;
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;
    const collegeId = searchParams.get("collegeId") || undefined;

    const result = await getGigs({ category, status, search, collegeId });
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Failed to load gigs." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data || [],
    });
  } catch (error: any) {
    console.error("[GET /api/gigs Error]:", error);
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

    // Action: CLAIM
    if (body.action === "CLAIM") {
      const { gigId, isAnonymousWriter } = body;
      if (!gigId) {
        return NextResponse.json({ success: false, error: "gigId is required." }, { status: 400 });
      }
      const claimResult = await claimGig(gigId, userId, !!isAnonymousWriter);
      if (!claimResult.success) {
        return NextResponse.json({ success: false, error: claimResult.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, data: claimResult.data });
    }

    // Action: DROP
    if (body.action === "DROP") {
      const { gigId } = body;
      if (!gigId) {
        return NextResponse.json({ success: false, error: "gigId is required." }, { status: 400 });
      }
      const dropResult = await dropGig(gigId, userId);
      if (!dropResult.success) {
        return NextResponse.json({ success: false, error: dropResult.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, data: dropResult.data });
    }

    const { title, description, budgetRupees, category, deadline, collegeId } = body;

    if (!title || !description || !budgetRupees) {
      return NextResponse.json(
        { success: false, error: "Title, description, and budget are required." },
        { status: 400 }
      );
    }

    const createResult = await createGig({
      posterId: userId,
      title: title.trim(),
      description: description.trim(),
      budgetRupees: Number(budgetRupees),
      category: category || "ASSIGNMENT",
      deadline: deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      collegeId: collegeId || auth.user?.collegeId,
    });

    if (!createResult.success) {
      return NextResponse.json(
        { success: false, error: createResult.error || "Failed to post gig." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: createResult.data,
    });
  } catch (error: any) {
    console.error("[POST /api/gigs Error]:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error." },
      { status: 500 }
    );
  }
}

