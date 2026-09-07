import { NextRequest, NextResponse } from "next/server";
import {
  getSemesterRecords,
  saveSemesterRecord,
  deleteSemesterRecord,
} from "@/actions/cgpa.actions";
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
        { success: false, error: "User ID is required." },
        { status: 400 }
      );
    }

    const res = await getSemesterRecords(userId);
    return NextResponse.json(res);
  } catch (error: any) {
    console.error("[GET /api/cgpa Error]:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch CGPA records." },
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

    const { semester, courses = [], gpa, totalCredits } = body;
    if (semester === undefined || gpa === undefined || !totalCredits) {
      return NextResponse.json(
        { success: false, error: "Semester number, SGPA, and total credits are required." },
        { status: 400 }
      );
    }

    const res = await saveSemesterRecord({
      userId,
      semester: Number(semester),
      courses: Array.isArray(courses) ? courses : [],
      gpa: Number(gpa),
      totalCredits: Number(totalCredits),
    });

    if (res.error) {
      return NextResponse.json({ success: false, error: res.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: res.data }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/cgpa Error]:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to save semester record." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    const { searchParams } = new URL(req.url);
    const recordId = searchParams.get("recordId");
    const userId = auth.authenticated && auth.user ? auth.user.id : searchParams.get("userId");

    if (!recordId || !userId) {
      return NextResponse.json(
        { success: false, error: "Record ID and User ID are required." },
        { status: 400 }
      );
    }

    const res = await deleteSemesterRecord(recordId, userId);
    if (res.error) {
      return NextResponse.json({ success: false, error: res.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[DELETE /api/cgpa Error]:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to delete semester record." },
      { status: 500 }
    );
  }
}
