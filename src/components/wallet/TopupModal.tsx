"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Wallet,
  QrCode,
  Copy,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  History,
  ShieldCheck,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { generateUpiUrl, getUpiQrImageUrl } from "@/lib/upi";
import {
  getWalletDetailsAction,
  submitTopupRequestAction,
} from "@/features/wallet/wallet.actions";
import { WalletDetails } from "@/features/wallet/wallet.types";

interface TopupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const PRESET_AMOUNTS = [50, 100, 200, 500];

export function TopupModal({ isOpen, onClose, onSuccess }: TopupModalProps) {
  const [activeTab, setActiveTab] = useState<"topup" | "history">("topup");
  const [selectedAmount, setSelectedAmount] = useState<number>(100);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [utrNumber, setUtrNumber] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [walletData, setWalletData] = useState<WalletDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const platformUpiId = "8307798816@upi";

  const fetchWallet = async () => {
    setLoadingDetails(true);
    try {
      const res = await getWalletDetailsAction();
      if (res.success && res.data) {
        setWalletData(res.data);
      }
    } catch (err) {
      console.error("Error loading wallet details:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchWallet();
      setUtrNumber("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentRechargeAmount = customAmount ? Number(customAmount) : selectedAmount;
  const isAmountValid = currentRechargeAmount >= 20;

  const upiUrl = generateUpiUrl(
    platformUpiId,
    currentRechargeAmount || 100,
    "OtiumCampusWallet",
    `TopUp_₹${currentRechargeAmount}`
  );
  const qrImageUrl = getUpiQrImageUrl(upiUrl, 200);

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(platformUpiId);
    setCopiedUpi(true);
    toast.success("Platform UPI ID copied to clipboard!");
    setTimeout(() => setCopiedUpi(false), 2500);
  };

  const handleSubmitTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAmountValid) {
      toast.error("Minimum recharge amount is ₹20.00.");
      return;
    }

    const cleanUtr = utrNumber.trim().replace(/\D/g, "");
    if (cleanUtr.length !== 12) {
      toast.error("Please enter the exact 12-digit numeric UPI UTR / Ref number.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitTopupRequestAction({
        amountPaise: Math.round(currentRechargeAmount * 100),
        utr: cleanUtr,
      });

      if (!res.success) {
        throw new Error(res.error || "Failed to submit recharge request.");
      }

      toast.success(
        "Top-up submitted! Your recharge request has been recorded with UTR verification."
      );
      setUtrNumber("");
      fetchWallet();
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit recharge request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in-0">
      <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Otium Campus E-Wallet</h2>
              <p className="text-[11px] text-muted-foreground">
                Current Balance:{" "}
                <span className="font-bold text-foreground">
                  ₹{walletData ? walletData.balanceRupees.toFixed(2) : "0.00"}
                </span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="flex border-b border-border bg-secondary/30">
          <button
            onClick={() => setActiveTab("topup")}
            className={`flex-1 py-2.5 text-xs font-semibold text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === "topup"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            Recharge Balance
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 py-2.5 text-xs font-semibold text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === "history"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Audit Ledger ({walletData?.transactions.length || 0})
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === "topup" ? (
            <form onSubmit={handleSubmitTopup} className="space-y-6">
              {/* Active Pending Request Notification */}
              {walletData?.pendingTopups && walletData.pendingTopups.length > 0 && (
                <div className="p-3.5 rounded-xl border border-warning/30 bg-warning/10 text-foreground text-xs space-y-1">
                  <div className="flex items-center gap-2 font-bold text-warning">
                    <Clock className="w-4 h-4" />
                    Pending Top-Up Under Review
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    You have {walletData.pendingTopups.length} pending recharge(s) totaling{" "}
                    <span className="font-semibold text-foreground">
                      ₹
                      {walletData.pendingTopups
                        .reduce((sum, r) => sum + r.amountRupees, 0)
                        .toFixed(2)}
                    </span>
                    . UTR: {walletData.pendingTopups[0].utr}. The campus manager will verify
                    shortly.
                  </p>
                </div>
              )}

              {/* 1. Select Preset Amount */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-foreground">
                  1. Select Recharge Amount
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {PRESET_AMOUNTS.map((amt) => {
                    const isSelected = !customAmount && selectedAmount === amt;
                    return (
                      <button
                        type="button"
                        key={amt}
                        onClick={() => {
                          setSelectedAmount(amt);
                          setCustomAmount("");
                        }}
                        className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-secondary/40 text-foreground border-border hover:border-primary/50"
                        }`}
                      >
                        ₹{amt}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Amount Input */}
                <div className="pt-1">
                  <input
                    type="number"
                    min="20"
                    placeholder="Or enter custom amount (Min ₹20)..."
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* 2. QR Code & UPI ID */}
              <div className="p-4 rounded-xl border border-border bg-secondary/20 flex flex-col sm:flex-row items-center gap-4">
                <div className="w-36 h-36 bg-white p-2 rounded-lg border border-border flex items-center justify-center flex-shrink-0">
                  <img
                    src={qrImageUrl}
                    alt="UPI Recharge QR"
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="space-y-2 text-center sm:text-left flex-1">
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 text-primary text-[11px] font-bold">
                    <Sparkles className="w-3 h-3" />
                    Amount-Locked QR: ₹{currentRechargeAmount || 100}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Scan using Google Pay, PhonePe, Paytm, or BHIM.
                  </p>
                  <div className="flex items-center gap-1.5 justify-center sm:justify-start">
                    <span className="text-xs font-mono font-bold text-foreground">
                      {platformUpiId}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyUpi}
                      className="p-1 rounded text-muted-foreground hover:text-foreground"
                    >
                      {copiedUpi ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. 12-Digit UTR Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-foreground block">
                  2. Enter 12-Digit UTR Number
                </label>
                <input
                  type="text"
                  maxLength={12}
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value.replace(/\D/g, ""))}
                  placeholder="e.g. 428190827361"
                  className="w-full px-3.5 py-2.5 text-xs font-mono tracking-widest rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  Found in your payment app receipt under &quot;UPI Ref No.&quot; or &quot;UTR&quot;.
                </p>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting || utrNumber.length !== 12 || !isAmountValid}
                className="w-full py-2.5 text-xs font-bold"
              >
                {isSubmitting
                  ? "Submitting UTR Verification..."
                  : `Submit ₹${currentRechargeAmount || 100} Top-Up Request`}
              </Button>
            </form>
          ) : (
            /* History & Audit Ledger Tab */
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <span className="text-xs font-bold text-foreground">
                  Persistent Financial Ledger
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Strict Integer Paise Accounting
                </span>
              </div>

              {walletData?.transactions.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No transactions yet. Recharge your wallet to start using 1-click campus payments!
                </div>
              ) : (
                <div className="space-y-2">
                  {walletData?.transactions.map((tx) => {
                    const isCredit = tx.amountPaise > 0;
                    return (
                      <div
                        key={tx.id}
                        className="p-3 rounded-xl border border-border bg-secondary/15 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              isCredit
                                ? "bg-success/10 text-success border border-success/20"
                                : "bg-destructive/10 text-destructive border border-destructive/20"
                            }`}
                          >
                            {isCredit ? (
                              <ArrowDownLeft className="w-3.5 h-3.5" />
                            ) : (
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate">
                              {tx.description}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(tx.createdAt).toLocaleDateString()} at{" "}
                              {new Date(tx.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                              {tx.utr && ` • UTR: ${tx.utr}`}
                            </p>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <span
                            className={`font-bold block ${
                              isCredit ? "text-success" : "text-foreground"
                            }`}
                          >
                            {isCredit ? "+" : "-"}₹
                            {Math.abs(tx.amountRupees).toFixed(2)}
                          </span>
                          <span className="text-[10px] text-muted-foreground block">
                            Bal: ₹{tx.balanceAfterRupees.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
