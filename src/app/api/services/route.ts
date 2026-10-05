import { NextRequest, NextResponse } from "next/server";
import { getCampusServices } from "@/actions/admin.actions";
import { verifyAuth } from "@/utils/auth";
import { prisma } from "@/lib/prisma";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

/** In-memory cache: campusId → { data, expiresAt } — 60 second TTL */
const serviceCache = new Map<string, { data: any[]; expiresAt: number }>();

/**
 * Mobile & Web REST API: GET /api/services?campusId=...
 * Returns list of campus services and their maintenance/enabled status.
 * Cached in-memory for 60 seconds per campus to avoid N-upsert DB hammering.
 * Cache is bypassed when ?bust=1 is passed (for admin force-refresh).
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    const { searchParams } = new URL(req.url);

    let campusId = searchParams.get("campusId");
    if (!campusId || campusId === "default" || campusId === "null" || campusId === "undefined") {
      campusId = auth.user?.collegeId || null;
    }

    if (!campusId || campusId === "default") {
      const defaultCollege = await prisma.college.findFirst({ select: { id: true } });
      campusId = defaultCollege?.id || "default";
    }

    const bustCache = searchParams.get("bust") === "1";
    const cacheKey = campusId;
    const now = Date.now();

    // Serve from cache if fresh and not busted
    if (!bustCache) {
      const cached = serviceCache.get(cacheKey);
      if (cached && cached.expiresAt > now) {
        return NextResponse.json({ success: true, data: cached.data });
      }
    }

    const res = await getCampusServices(campusId);

    // Populate cache on success
    if (res.success && Array.isArray(res.data)) {
      serviceCache.set(cacheKey, {
        data: res.data,
        expiresAt: now + 60_000, // 60 second TTL
      });
    }

    return NextResponse.json(res);
  } catch (error: any) {
    console.error("[GET /api/services Error]:", error);
    return NextResponse.json(
      {
        success: true,
        data: [],
      },
      { status: 200 }
    );
  }
}

