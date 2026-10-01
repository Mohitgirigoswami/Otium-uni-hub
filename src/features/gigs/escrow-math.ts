import { EscrowCalculation } from "./gigs.types";

/**
 * Escrow calculation utility for Managed Proxy Escrow.
 * STRICT INTEGER PAISE RULE:
 * 1 INR = 100 Paise. All calculations are executed in integer Paise (Math.round).
 * GUARANTEED IDENTITY: writerPayoutPaise + commissionPaise === totalBudgetPaise.
 */
export function calculateEscrow(priceRupees: number, buyerDiscountPct: number = 0): EscrowCalculation {
  const totalBudgetPaise = Math.round(priceRupees * 100);

  // 1. Buyer Promo Discount in Paise
  const discountPaise =
    buyerDiscountPct > 0 ? Math.round((totalBudgetPaise * buyerDiscountPct) / 100) : 0;
  const finalBuyerTotalPaise = Math.max(0, totalBudgetPaise - discountPaise);

  // 2. Platform Commission in Paise (10% up to ₹1,000 / 100,000 paise; 5% above)
  const THRESHOLD_PAISE = 100000; // ₹1,000 in Paise
  let commissionPaise: number;
  if (totalBudgetPaise <= THRESHOLD_PAISE) {
    commissionPaise = Math.round(totalBudgetPaise * 0.10);
  } else {
    commissionPaise = Math.round(THRESHOLD_PAISE * 0.10 + (totalBudgetPaise - THRESHOLD_PAISE) * 0.05);
  }

  // 3. Writer Payout in Paise (Guaranteed Identity: writerPayoutPaise + commissionPaise === totalBudgetPaise)
  const writerPayoutPaise = Math.max(0, totalBudgetPaise - commissionPaise);

  // 4. Ghosted Guarantee in Paise (60% of writer payout)
  const ghostedGuaranteePaise = Math.round(writerPayoutPaise * 0.60);

  // 5. 50/50 Advance and Final Settlement in Paise
  const advanceRequiredPaise = Math.floor(finalBuyerTotalPaise / 2);
  const finalSettlementPaise = finalBuyerTotalPaise - advanceRequiredPaise;

  return {
    rawPrice: totalBudgetPaise / 100,
    discountPct: buyerDiscountPct,
    discountAmount: discountPaise / 100,
    finalBuyerTotal: finalBuyerTotalPaise / 100,
    commission: commissionPaise / 100,
    writerPayout: writerPayoutPaise / 100,
    ghostedGuarantee: ghostedGuaranteePaise / 100,
    advanceRequired: advanceRequiredPaise / 100,
    finalSettlement: finalSettlementPaise / 100,
  };
}

/**
 * Direct Integer-Paise Escrow Helper
 */
export function calculateEscrowPaise(budgetPaise: number, buyerDiscountPct: number = 0) {
  const discountPaise =
    buyerDiscountPct > 0 ? Math.round((budgetPaise * buyerDiscountPct) / 100) : 0;
  const finalBuyerTotalPaise = Math.max(0, budgetPaise - discountPaise);

  const THRESHOLD_PAISE = 100000;
  let commissionPaise: number;
  if (budgetPaise <= THRESHOLD_PAISE) {
    commissionPaise = Math.round(budgetPaise * 0.10);
  } else {
    commissionPaise = Math.round(THRESHOLD_PAISE * 0.10 + (budgetPaise - THRESHOLD_PAISE) * 0.05);
  }

  const writerPayoutPaise = Math.max(0, budgetPaise - commissionPaise);
  const ghostedGuaranteePaise = Math.round(writerPayoutPaise * 0.60);
  const advanceRequiredPaise = Math.floor(finalBuyerTotalPaise / 2);
  const finalSettlementPaise = finalBuyerTotalPaise - advanceRequiredPaise;

  return {
    rawPricePaise: budgetPaise,
    discountPct: buyerDiscountPct,
    discountAmountPaise: discountPaise,
    finalBuyerTotalPaise,
    commissionPaise,
    writerPayoutPaise,
    ghostedGuaranteePaise,
    advanceRequiredPaise,
    finalSettlementPaise,
  };
}
