import { NextResponse } from "next/server";
import { getDynamicPrintRates } from "@/features/print-station/print.service";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

/**
 * GET /api/print/rates
 * Returns live dynamic print pricing per page (B&W and Color, single and double sided)
 */
export async function GET() {
  try {
    const rates = await getDynamicPrintRates();
    return NextResponse.json({
      success: true,
      data: rates,
    });
  } catch (error: any) {
    console.error("[GET /api/print/rates Error]:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to load print rates." },
      { status: 500 }
    );
  }
}
