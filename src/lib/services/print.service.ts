import { prisma } from "@/lib/prisma";
import { PrintTypeEnum } from "@/lib/types";

export interface PrintRatesData {
  singleSidedPaise: number; // e.g. 250 for ₹2.50
  doubleSidedPaise: number; // e.g. 200 for ₹2.00
  colorSinglePaise: number; // e.g. 1000 for ₹10.00
  colorDoublePaise: number; // e.g. 800 for ₹8.00
  singleSidedRupees: number; // 2.50
  doubleSidedRupees: number; // 2.00
}

/**
 * Fetch dynamic print rates from database PrintSetting or seed defaults
 */
export async function getDynamicPrintRates(): Promise<PrintRatesData> {
  try {
    let setting = await prisma.printSetting.findUnique({
      where: { id: "default" },
    });

    if (!setting) {
      setting = await prisma.printSetting.create({
        data: {
          id: "default",
          singleSidedRate: 250, // ₹2.50
          doubleSidedRate: 200, // ₹2.00
        },
      });
    }

    return {
      singleSidedPaise: setting.singleSidedRate,
      doubleSidedPaise: setting.doubleSidedRate,
      colorSinglePaise: 1000,
      colorDoublePaise: 800,
      singleSidedRupees: setting.singleSidedRate / 100,
      doubleSidedRupees: setting.doubleSidedRate / 100,
    };
  } catch (error) {
    console.error("Error fetching dynamic print rates:", error);
    // Fallback defaults: 250 paise (₹2.50) & 200 paise (₹2.00)
    return {
      singleSidedPaise: 250,
      doubleSidedPaise: 200,
      colorSinglePaise: 1000,
      colorDoublePaise: 800,
      singleSidedRupees: 2.5,
      doubleSidedRupees: 2.0,
    };
  }
}

/**
 * Calculate total print order cost based on page count, print type, and dynamic rates
 * Prevents 1-page double-sided discount exploit: 1-page documents are physically single-sided
 */
export function calculatePrintCostPaise(
  pageCount: number,
  printType: PrintTypeEnum,
  rates: PrintRatesData
): number {
  const pages = Math.max(1, pageCount);

  // Single-page document: physically printed on 1 side only
  if (pages === 1) {
    if (printType === "COLOR_SINGLE" || printType === "COLOR_DOUBLE") {
      return rates.colorSinglePaise;
    }
    return rates.singleSidedPaise;
  }

  switch (printType) {
    case "BW_SINGLE":
      return pages * rates.singleSidedPaise;
    case "BW_DOUBLE":
      return pages * rates.doubleSidedPaise;
    case "COLOR_SINGLE":
      return pages * rates.colorSinglePaise;
    case "COLOR_DOUBLE":
      return pages * rates.colorDoublePaise;
    default:
      return pages * rates.doubleSidedPaise;
  }
}
