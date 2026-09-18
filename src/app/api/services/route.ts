import { NextRequest, NextResponse } from "next/server";
import { getCampusServices } from "@/actions/admin.actions";
import { verifyAuth } from "@/utils/auth";

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

    const campusId =
      searchParams.get("campusId") ||
      auth.user?.collegeId ||
      "default";

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
