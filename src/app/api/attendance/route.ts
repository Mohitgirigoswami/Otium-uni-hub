import { NextRequest, NextResponse } from "next/server";
import { getSubjects, createSubject, logAttendanceSession } from "@/actions/attendance.actions";
import { verifyAuth } from "@/utils/auth";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    const { searchParams } = new URL(req.url);
    const userId = auth.authenticated && auth.user ? auth.user.id : searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID is required to fetch attendance." },
        { status: 400 }
      );
    }

    const res = await getSubjects(userId);
    return NextResponse.json(res);
  } catch (error: any) {
    console.error("[GET /api/attendance Error]:", error);
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

    // If logging a session (mark present / absent)
    if (body.action === "LOG_SESSION" && body.subjectId) {
      const status: "PRESENT" | "ABSENT" = body.isPresent !== false ? "PRESENT" : "ABSENT";
      const res = await logAttendanceSession(body.subjectId, userId, status);
      return NextResponse.json(res);
    }

    // Otherwise creating a new subject
    const { name, code, totalClasses = 0, attendedClasses = 0 } = body;
    const res = await createSubject({
      userId,
      name,
      code,
      totalClasses: Number(totalClasses),
      attendedClasses: Number(attendedClasses),
    });

    if (res.error) {
      return NextResponse.json({ success: false, error: res.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: res.data }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/attendance Error]:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error." },
      { status: 500 }
    );
  }
}
