import { NextResponse } from "next/server";
import { getPlatformSettingsAction } from "@/actions/platform.actions";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function GET() {
  try {
    const res = await getPlatformSettingsAction();
    return NextResponse.json(res);
  } catch (error: any) {
    console.error("[GET /api/settings Error]:", error);
    return NextResponse.json(
      {
        success: true,
        data: {
          upiId: "otium.escrow@okhdfcbank",
          buyerDiscountPct: 5,
        },
      },
      { status: 200 }
    );
  }
}
