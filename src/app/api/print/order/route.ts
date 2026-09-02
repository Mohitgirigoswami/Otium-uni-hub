import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPrintOrder, getPrintOrders } from "@/actions/print.actions";
import { verifyAuth } from "@/utils/auth";

/**
 * Mobile & Web REST API: POST /api/print/order
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Verify JWT Authentication
    const auth = await verifyAuth(req);
    const body = await req.json();

    let userId = auth.authenticated && auth.user ? auth.user.id : body.userId;

    // If neither JWT nor userId is present, reject
    if (!userId) {
      return NextResponse.json(
        { success: false, error: auth.error || "Authentication required to place print orders. Please log in." },
        { status: 401 }
      );
    }

    const {
      fileName,
      fileUrl,
      driveFileId,
      pageCount,
      copies = 1,
      printType = "BW_DOUBLE",
      deliveryLocation,
      deliverySlot,
      phoneNumber,
      utr,
      collegeId = auth.user?.collegeId,
    } = body;

    if (!fileName || typeof fileName !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing document file name." },
        { status: 400 }
      );
    }

    if (!deliveryLocation || typeof deliveryLocation !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing delivery destination location." },
        { status: 400 }
      );
    }

    if (!deliverySlot || typeof deliverySlot !== "string") {
      return NextResponse.json(
        { success: false, error: "Please select a delivery window." },
        { status: 400 }
      );
    }

    const cleanUtr = utr ? String(utr).trim().replace(/\D/g, "") : "";
    if (cleanUtr.length !== 12) {
      return NextResponse.json(
        { success: false, error: "Valid 12-digit numeric UPI UTR is required." },
        { status: 400 }
      );
    }

    const res = await createPrintOrder({
      userId,
      fileName,
      fileUrl: fileUrl || "https://supabase.co/storage/v1/object/public/print-documents/demo.pdf",
      driveFileId,
      pageCount: Number(pageCount) || 1,
      copies: Number(copies) || 1,
      printType,
      deliveryLocation,
      deliverySlot,
      phoneNumber: phoneNumber ? String(phoneNumber).replace(/\D/g, "").slice(-10) : undefined,
      utr: cleanUtr,
      collegeId: collegeId || undefined,
    });

    if (!res.success) {
      return NextResponse.json(
        { success: false, error: res.error || "Failed to create print order." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: true, data: res.data, message: "Print order created successfully." },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[POST /api/print/order Error]:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error." },
      { status: 500 }
    );
  }
}

/**
 * Mobile REST API Bridge: GET /api/print/order?userId=...
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Missing userId query parameter." },
        { status: 400 }
      );
    }

    const res = await getPrintOrders(userId);
    return NextResponse.json(res);
  } catch (error: any) {
    console.error("[GET /api/print/order Error]:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error." },
      { status: 500 }
    );
  }
}
