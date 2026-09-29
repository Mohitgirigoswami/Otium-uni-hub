import { EscrowCalculation } from "./gigs.types";

/**
 * Escrow calculation utility for Managed Proxy Escrow.
 * Accepts raw budget/price in Rupees (or converted from Paise).
 * Supports optional buyer discount percentage (e.g. 5 for 5% launch promo).
 */
export function calculateEscrow(price: number, buyerDiscountPct: number = 0): EscrowCalculation {
  const discountAmount = buyerDiscountPct > 0 ? (price * buyerDiscountPct) / 100 : 0;
  const finalBuyerTotal = Math.max(0, price - discountAmount);

  // Platform commission is calculated on the undiscounted base price
  const commission =
    price <= 1000
      ? price * 0.10
      : 1000 * 0.10 + (price - 1000) * 0.05;

  const writerPayout = Math.max(0, price - commission);
  const ghostedGuarantee = writerPayout * 0.60;
  const advanceRequired = finalBuyerTotal * 0.50;
  const finalSettlement = finalBuyerTotal * 0.50;

  return {
    rawPrice: price,
    discountPct: buyerDiscountPct,
    discountAmount,
    finalBuyerTotal,
    commission,
    writerPayout,
    ghostedGuarantee,
    advanceRequired,
    finalSettlement,
  };
}
