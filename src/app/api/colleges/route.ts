import { NextRequest, NextResponse } from "next/server";
import { getColleges, setUserCollege } from "@/actions/college.actions";
import { verifyAuth } from "@/utils/auth";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function GET() {
  try {
    const res = await getColleges();
    return NextResponse.json(res);
  } catch (error: any) {
    console.error("[GET /api/colleges Error]:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch colleges." },
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

    const { collegeId } = body;
    if (!collegeId) {
      return NextResponse.json(
        { success: false, error: "College ID is required." },
        { status: 400 }
      );
    }

    const res = await setUserCollege({ userId, collegeId });
    if (res.error) {
      return NextResponse.json({ success: false, error: res.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: res.data });
  } catch (error: any) {
    console.error("[POST /api/colleges Error]:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to assign college." },
      { status: 500 }
    );
  }
}
