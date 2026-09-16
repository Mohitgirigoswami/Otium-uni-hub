"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@/components/providers/UserContext";
import {
  getPlatformSettingsAction,
  updatePlatformUpiIdAction,
} from "@/actions/platform.actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { generateUpiUrl, getUpiQrImageUrl } from "@/lib/upi";
import { toast } from "sonner";
import {
  Settings,
  QrCode,
  CheckCircle2,
  Copy,
  ExternalLink,
  ShieldCheck,
  CreditCard,
  Sparkles,
  RefreshCw,
} from "lucide-react";

export default function AdminSettingsPage() {
  const { user } = useUser();
  const [upiId, setUpiId] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Live Test Amount preview
  const [testAmount, setTestAmount] = useState("500.00");

  const fetchSettings = async () => {
    setLoading(true);
    const res = await getPlatformSettingsAction();
    if (res.success && res.data) {
      setUpiId(res.data.upiId);
      setLastUpdated(res.data.updatedAt);
    } else {
      toast.error(res.error || "Failed to load platform settings.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveUpi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!upiId.trim() || !upiId.includes("@")) {
      toast.error("Please enter a valid UPI VPA handle (e.g., student@okaxis).");
      return;
    }

    setSaving(true);
    const res = await updatePlatformUpiIdAction({
      upiId: upiId.trim(),
      adminUserId: user.id,
    });
    setSaving(false);

    if (res.success) {
      toast.success("Platform Master UPI ID updated successfully.");
      setLastUpdated(new Date());
    } else {
      toast.error(res.error || "Failed to update UPI settings.");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("UPI ID copied to clipboard.");
  };

  const dynamicUpiUrl = generateUpiUrl(
    upiId || "otium.escrow@okhdfcbank",
    parseFloat(testAmount || "0"),
    "Otium Campus Escrow",
    "TEST_AMOUNT_LOCK_SIMULATION"
  );

  const dynamicQrImg = getUpiQrImageUrl(dynamicUpiUrl, 200);

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 sm:p-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary text-foreground text-xs font-semibold border border-border">
            <Settings className="w-3.5 h-3.5 text-primary" />
            <span>Platform Config</span>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Platform Settings & UPI Engine
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Configure dynamic amount-locked UPI payment destinations for Campus Print Queue and Gig Escrow Hub.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={fetchSettings}
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />}
          >
            Refresh Config
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: UPI VPA Configuration Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-heading text-lg font-bold text-foreground">
                    Primary Escrow UPI Destination
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    All student advance payments and print fees route to this VPA.
                  </p>
                </div>
              </div>
              <Badge variant="outline" size="sm">Global Config</Badge>
            </div>

            <form onSubmit={handleSaveUpi} className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-foreground">
                  Platform Master UPI ID (VPA) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="e.g. otium.escrow@okhdfcbank or merchant@paytm"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-card border border-input font-mono font-bold text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  {upiId && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(upiId)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                      title="Copy UPI ID"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  When students scan QR codes generated by Otium, their banking apps (GPay, PhonePe, Paytm) will automatically lock in this UPI ID and the exact order amount.
                </p>
              </div>

              {lastUpdated && (
                <div className="p-3 rounded-lg bg-secondary border border-border text-[11px] text-muted-foreground flex items-center justify-between font-mono">
                  <span>Last Updated:</span>
                  <span className="text-foreground">
                    {new Date(lastUpdated).toLocaleString()}
                  </span>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  disabled={saving || loading}
                  size="md"
                  leftIcon={<CheckCircle2 className="w-4 h-4" />}
                >
                  {saving ? "Saving Config..." : "Save Master UPI ID"}
                </Button>
              </div>
            </form>
          </Card>

          {/* Verification Protocol Notes */}
          <Card className="p-6 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span>Admin Settlement Safeguards</span>
            </h3>
            <ul className="text-xs text-muted-foreground space-y-2 list-disc list-inside">
              <li>Students enter a 12-digit numeric bank UTR after making payments.</li>
              <li>Super Admins verify transaction amounts in bank statements against the UTR before releasing prints or dispatching writer payouts.</li>
              <li>Writers are protected from working until the 50% advance is verified.</li>
            </ul>
          </Card>
        </div>

        {/* Right Col: Live Dynamic Amount-Locked QR Preview */}
        <div className="space-y-6">
          <Card className="p-6 space-y-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <QrCode className="w-5 h-5 text-primary" />
              <h3 className="font-heading text-sm font-bold text-foreground">
                Live Amount-Locked QR Preview
              </h3>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Test dynamic encoding with varying rupee amounts.
            </p>

            <div className="p-4 bg-white rounded-2xl shadow-md border border-border inline-block mx-auto">
              <img
                src={dynamicQrImg}
                alt="Live UPI QR"
                className="w-44 h-44 mx-auto rounded-lg"
              />
              <div className="mt-2 text-center">
                <span className="text-xs font-mono font-bold text-slate-900 block">
                  ₹{parseFloat(testAmount || "0").toFixed(2)}
                </span>
                <span className="block text-[9px] font-mono text-slate-500 truncate max-w-[170px] mx-auto">
                  {upiId || "otium.escrow@okhdfcbank"}
                </span>
              </div>
            </div>

            <div className="text-left space-y-1.5 pt-2">
              <label className="block text-[10px] uppercase font-bold text-muted-foreground">
                Preview Order Amount (₹ INR)
              </label>
              <input
                type="number"
                min="1"
                step="50"
                value={testAmount}
                onChange={(e) => setTestAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-card border border-input text-xs font-mono font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="p-2.5 rounded-lg bg-secondary text-[10px] font-mono text-muted-foreground break-all text-left border border-border">
              <span className="font-bold text-foreground block mb-0.5">UPI Deep Link:</span>
              <p>{dynamicUpiUrl}</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
