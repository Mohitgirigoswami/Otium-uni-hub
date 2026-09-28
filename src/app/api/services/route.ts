import { NextRequest, NextResponse } from "next/server";
import { getCampusServices } from "@/actions/admin.actions";
import { verifyAuth } from "@/utils/auth";
import { prisma } from "@/lib/prisma";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

/**
 * Mobile & Web REST API: GET /api/services?campusId=...
 * Returns list of campus services and their maintenance/enabled status
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

    const res = await getCampusServices(campusId);
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
