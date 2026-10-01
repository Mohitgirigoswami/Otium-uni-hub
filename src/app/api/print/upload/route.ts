import { NextRequest, NextResponse } from "next/server";
import { uploadPrintDocument } from "@/actions/print-upload.actions";
import { verifyAuth } from "@/utils/auth";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No PDF file was provided." },
        { status: 400 }
      );
    }

    const auth = await verifyAuth(req);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { success: false, error: auth.error || "Authentication required." },
        { status: 401 }
      );
    }
    formData.set("userId", auth.user.id);

    const res = await uploadPrintDocument(formData);

    if (!res.success) {
      return NextResponse.json(
        { success: false, error: res.error || "Upload failed." },
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
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error." },
      { status: 500 }
    );
  }
}
