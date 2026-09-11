import { NextRequest, NextResponse } from "next/server";
import { getSubjects, createSubject, logAttendanceSession, deleteSubject, syncOfflineAttendance } from "@/actions/attendance.actions";
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

    // If synchronizing offline subjects / bulk reconciliation
    if (body.action === "SYNC_OFFLINE") {
      const res = await syncOfflineAttendance(userId, body.subjects || []);
      if (res.error) {
        return NextResponse.json({ success: false, error: res.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, data: res.data });
    }

    // If logging a session (mark present / absent, supports multi-period labs)
    if (body.action === "LOG_SESSION" && body.subjectId) {
      const status: "PRESENT" | "ABSENT" = body.isPresent !== false ? "PRESENT" : "ABSENT";
      const count = Number(body.count) || 1;
      const res = await logAttendanceSession(body.subjectId, userId, status, count);
      return NextResponse.json(res);
    }

    // If updating a subject's details or periodWeight
    if (body.action === "UPDATE_SUBJECT" && body.subjectId) {
      const { name, code, totalClasses, attendedClasses, periodWeight } = body;
      const { updateSubjectCounts } = await import("@/actions/attendance.actions");
      const res = await updateSubjectCounts(body.subjectId, userId, {
        name: name || "",
        code,
        totalClasses: Number(totalClasses) || 0,
        attendedClasses: Number(attendedClasses) || 0,
        periodWeight: periodWeight ? Number(periodWeight) : undefined,
      });
      return NextResponse.json(res);
    }

    // Otherwise creating a new subject
    const { name, code, totalClasses = 0, attendedClasses = 0, periodWeight = 1 } = body;
    const res = await createSubject({
      userId,
      name,
      code,
      totalClasses: Number(totalClasses),
      attendedClasses: Number(attendedClasses),
      periodWeight: Number(periodWeight) || 1,
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

export async function DELETE(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get("subjectId") || searchParams.get("id");

    const userId = auth.authenticated && auth.user ? auth.user.id : searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }
    if (!subjectId) {
      return NextResponse.json({ success: false, error: "Subject ID is required." }, { status: 400 });
    }

    const res = await deleteSubject(subjectId, userId);
    return NextResponse.json(res);
  } catch (error: any) {
    console.error("[DELETE /api/attendance Error]:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error." },
      { status: 500 }
    );
  }
}
