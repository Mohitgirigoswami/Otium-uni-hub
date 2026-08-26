/**
 * Standard Dynamic Amount-Locked UPI Deep Link and QR Generator
 */
export function generateUpiUrl(
  upiId: string,
  amountRupees: number | string,
  payeeName: string = "OtiumApp",
  transactionNote: string = "Otium University Payment"
): string {
  const cleanUpi = upiId.trim() || "otium.escrow@okhdfcbank";
  const num = typeof amountRupees === "number" ? amountRupees : parseFloat(amountRupees) || 0;
  const cleanAmount = num.toFixed(2);
  const cleanPayee = payeeName.replace(/[^a-zA-Z0-9 ]/g, "").trim() || "OtiumApp";
  const cleanNote = transactionNote.replace(/[^a-zA-Z0-9 ]/g, "").trim();

  return `upi://pay?pa=${encodeURIComponent(cleanUpi)}&pn=${encodeURIComponent(cleanPayee)}&am=${encodeURIComponent(cleanAmount)}&cu=INR&tn=${encodeURIComponent(cleanNote)}`;
}

export function getUpiQrImageUrl(upiUrl: string, size: number = 200): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(upiUrl)}`;
}
