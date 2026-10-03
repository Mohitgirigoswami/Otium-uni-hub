import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/utils/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { submitWalletTopupRequest } from "@/features/wallet/wallet.service";
import { prisma } from "@/lib/prisma";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

/**
 * Mobile REST API: POST /api/wallet/topup
 * Submits a top-up request with UTR
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { success: false, error: auth.error || "Authentication required." },
        { status: 401 }
      );
    }

    const rateCheck = await checkRateLimit(auth.user.id);
    if (!rateCheck.success) {
      return NextResponse.json({ success: false, error: rateCheck.error }, { status: 429 });
    }

    const body = await req.json();
    const { amountPaise, utr } = body;

    const res = await submitWalletTopupRequest({
      userId: auth.user.id,
      amountPaise: Number(amountPaise),
      utr: String(utr || ""),
    });

    if (!res.success) {
      return NextResponse.json({ success: false, error: res.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: res.data }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/wallet/topup Error]:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error." },
      { status: 500 }
    );
  }
}

/**
 * Mobile REST API: GET /api/wallet/topup
 * Returns active pending top-up requests for the user
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

    const requests = await prisma.walletTopupRequest.findMany({
      where: { userId: auth.user.id, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: requests.map((r) => ({
        id: r.id,
        amountPaise: r.amountPaise,
        amountRupees: r.amountPaise / 100,
        utr: r.utr,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (error: any) {
    console.error("[GET /api/wallet/topup Error]:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error." },
      { status: 500 }
    );
  }
}
