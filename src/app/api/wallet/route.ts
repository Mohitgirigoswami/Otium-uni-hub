import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/utils/auth";
import { getWalletDetails } from "@/features/wallet/wallet.service";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

/**
 * Mobile REST API: GET /api/wallet
 * Fetches live balance, pending topups, and transaction history
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { success: false, error: auth.error || "Authentication required." },
        { status: 401 }
      );
    }

    const res = await getWalletDetails(auth.user.id);
    if (!res.success) {
      return NextResponse.json({ success: false, error: res.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: res.data });
  } catch (error: any) {
    console.error("[GET /api/wallet Error]:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error." },
      { status: 500 }
    );
  }
}
