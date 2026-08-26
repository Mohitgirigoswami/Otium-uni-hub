"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@/components/providers/UserContext";
import {
  getPlatformSettingsAction,
  updatePlatformUpiIdAction,
} from "@/actions/platform.actions";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
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
      toast.error("Please enter a valid UPI VPA ID (e.g. yourname@okhdfcbank).");
      return;
    }

    setSaving(true);
    const res = await updatePlatformUpiIdAction({
      upiId: upiId.trim(),
      adminUserId: user.id,
    });
    setSaving(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(`Platform UPI VPA updated to "${upiId.trim()}"!`);
      fetchSettings();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("UPI ID copied to clipboard!");
  };

  const dynamicUpiUrl = generateUpiUrl(
    upiId || "otium.escrow@okhdfcbank",
    parseFloat(testAmount) || 500,
    "OtiumApp",
    "Admin Settings Test"
  );
  const dynamicQrImg = getUpiQrImageUrl(dynamicUpiUrl, 220);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Settings className="w-7 h-7 text-amber-500" />
            <span>Platform Configuration & UPI Escrow Engine</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
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
          <GlassCard className="p-6 sm:p-8 border-amber-500/30 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Primary Escrow UPI VPA Destination
                  </h2>
                  <p className="text-xs text-slate-500">
                    All student advance payments and print fees route to this VPA.
                  </p>
                </div>
              </div>
              <Badge variant="brand" size="sm">Global Config</Badge>
            </div>

            <form onSubmit={handleSaveUpi} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Platform Master UPI ID (VPA) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="e.g. otium.escrow@okhdfcbank or merchant@paytm"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-amber-400 font-mono font-bold text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  {upiId && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(upiId)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-amber-500 transition-colors"
                      title="Copy UPI ID"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  ⚠️ <strong>Dynamic Amount Lock:</strong> When students scan QR codes generated by Otium, their banking apps (GPay, PhonePe, Paytm) will automatically lock in this UPI ID and the exact order amount with INR currency code.
                </p>
              </div>

              {lastUpdated && (
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Last Updated:</span>
                  <span className="font-mono text-slate-300">
                    {new Date(lastUpdated).toLocaleString()}
                  </span>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  disabled={saving || loading}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-bold"
                  leftIcon={<CheckCircle2 className="w-4 h-4" />}
                >
                  {saving ? "Saving Config..." : "Save Master UPI ID"}
                </Button>
              </div>
            </form>
          </GlassCard>

          {/* Verification Protocol Notes */}
          <GlassCard className="p-6 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Admin Settlement Safeguards</span>
            </h3>
            <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-2 list-disc list-inside">
              <li>Students enter a 12-digit numeric bank UTR after making payments.</li>
              <li>Super Admins verify transaction amounts in bank statements against the UTR before releasing prints or dispatching writer payouts.</li>
              <li>Writers are protected from working until the 50% advance is verified.</li>
            </ul>
          </GlassCard>
        </div>

        {/* Right Col: Live Dynamic Amount-Locked QR Preview */}
        <div className="space-y-6">
          <GlassCard className="p-6 space-y-4 text-center border-amber-500/20">
            <div className="flex items-center justify-center gap-2">
              <QrCode className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Live Amount-Locked QR Preview
              </h3>
            </div>
            <p className="text-[11px] text-slate-400">
              Test dynamic encoding with varying rupee amounts.
            </p>

            <div className="p-4 bg-white rounded-3xl shadow-xl border border-slate-200 inline-block mx-auto">
              <img
                src={dynamicQrImg}
                alt="Live UPI QR"
                className="w-48 h-48 mx-auto rounded-xl"
              />
              <div className="mt-2 text-center">
                <span className="text-xs font-mono font-bold text-slate-800">
                  ₹{parseFloat(testAmount || "0").toFixed(2)}
                </span>
                <span className="block text-[9px] font-mono text-slate-400 truncate max-w-[190px]">
                  {upiId || "otium.escrow@okhdfcbank"}
                </span>
              </div>
            </div>

            <div className="text-left space-y-1.5 pt-2">
              <label className="block text-[10px] uppercase font-bold text-slate-400">
                Preview Order Amount (₹ INR)
              </label>
              <input
                type="number"
                min="1"
                step="50"
                value={testAmount}
                onChange={(e) => setTestAmount(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-[10px] font-mono text-slate-400 break-all text-left">
              <span className="font-bold text-slate-300">UPI Deep Link:</span>
              <p className="mt-0.5">{dynamicUpiUrl}</p>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
