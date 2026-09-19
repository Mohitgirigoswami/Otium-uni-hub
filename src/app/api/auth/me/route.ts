import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/utils/auth";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);

    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { success: false, error: auth.error || "Unauthorized." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: auth.user.id,
        name: auth.user.name,
        username: auth.user.username || null,
        email: auth.user.email,
        role: auth.user.role,
        phone: auth.user.phone,
        department: auth.user.department,
        year: auth.user.year,
        collegeId: auth.user.collegeId,
        college: auth.user.college,
        image: auth.user.image,
        isBanned: auth.user.isBanned,
        incognitoProfile: auth.user.incognitoProfile || null,
      },
    });
  } catch (error: any) {
    console.error("[GET /api/auth/me Error]:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error." },
      { status: 500 }
    );
  }
}
