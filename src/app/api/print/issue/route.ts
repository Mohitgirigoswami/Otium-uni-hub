import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/utils/auth";
import { reportPrintOrderIssue } from "@/actions/print.actions";

/**
 * Mobile & Web REST API: POST /api/print/issue
 * Report problem or quality issue on an active/completed print order
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    const body = await req.json();

    const userId = auth.authenticated && auth.user ? auth.user.id : body.userId;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: auth.error || "Authentication required to report issues." },
        { status: 401 }
      );
    }

    const { orderId, reason, category } = body;

    if (!orderId || typeof orderId !== "string") {
      return NextResponse.json(
        { success: false, error: "Order ID is required." },
        { status: 400 }
      );
    }

    if (!reason || typeof reason !== "string" || !reason.trim()) {
      return NextResponse.json(
        { success: false, error: "Please describe the problem with this order." },
        { status: 400 }
      );
    }

    const result = await reportPrintOrderIssue({
      orderId,
      userId,
      reason: reason.trim(),
      category: category?.trim(),
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Failed to submit issue report." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: "Issue report submitted to print manager.",
    });
  } catch (error: any) {
    console.error("[POST /api/print/issue Error]:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error." },
      { status: 500 }
    );
  }
}
