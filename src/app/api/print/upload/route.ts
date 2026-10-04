import { NextRequest, NextResponse } from "next/server";
import { uploadPrintFile } from "@/actions/print-upload.actions";
import { verifyAuth } from "@/utils/auth";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function POST(req: NextRequest) {
  try {
    // 1. Verify Authentication first
    const auth = await verifyAuth(req);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { success: false, error: auth.error || "Authentication required." },
        { status: 401 }
      );
    }

    // 2. Parse Multipart FormData
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No PDF file was provided." },
        { status: 400 }
      );
    }

    const campusId = (formData.get("campusId") as string) || auth.user.collegeId || "global";

    // 3. Upload file directly without modifying read-only FormData
    const res = await uploadPrintFile({
      file,
      campusId,
      userId: auth.user.id,
    });

    if (!res.success) {
      const errStr = typeof res.error === "string" ? res.error : (res.error as any)?.message || "Upload failed.";
      return NextResponse.json(
        { success: false, error: errStr },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: res.data,
      message: "Document uploaded successfully.",
    });
  } catch (error: any) {
    console.error("[POST /api/print/upload Error]:", error);
    const msg = error?.message || "";
    const cleanError =
      msg.includes("connection pool") || msg.includes("timed out") || msg.includes("prisma")
        ? "Database connection is temporarily busy. Please retry in a few moments."
        : typeof error === "string"
        ? error
        : error?.message || "Internal server error during upload.";
    return NextResponse.json(
      { success: false, error: cleanError },
      { status: 500 }
    );
  }
}
