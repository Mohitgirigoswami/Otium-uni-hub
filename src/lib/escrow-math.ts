/**
 * Escrow calculation utility for Managed Proxy Escrow.
 * Accepts price in Rupees (or converted from Paise).
 */
export function calculateEscrow(price: number) {
  const commission =
    price <= 1000
      ? price * 0.10
      : 1000 * 0.10 + (price - 1000) * 0.05;

  const writerPayout = price - commission;
  const ghostedGuarantee = writerPayout * 0.60;
  const advanceRequired = price * 0.50;

  return {
    commission,
    writerPayout,
    ghostedGuarantee,
    advanceRequired,
  };
}
