"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Input } from "@/components/ui/input";
import { useUser } from "@/components/providers/UserContext";
import { getPrintOrders, createPrintOrder, getPrintRatesAction, reportPrintOrderIssue } from "@/actions/print.actions";
import { getPlatformSettingsAction } from "@/actions/platform.actions";
import { updateUserProfile } from "@/actions/user.actions";
import { generateUpiUrl, getUpiQrImageUrl } from "@/lib/upi";
import { formatPaiseToRupees, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";
import {
  Printer,
  FileText,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  MessageSquare,
  QrCode,
  Copy,
  ExternalLink,
  ShieldCheck,
  Check,
  Layers,
  Phone,
  RefreshCw,
  Save,
  Zap,
  Wallet,
  Clipboard,
} from "lucide-react";
import { PrintTypeEnum } from "@/lib/types";
import { DocumentUpload } from "@/components/ui/DocumentUpload";
import { PrintRatesData, calculatePrintCostPaise } from "@/lib/services/print.service";
import { ClientServiceGuard } from "@/components/ClientServiceGuard";
import { PrintOrderTracker } from "@/components/print/PrintOrderTracker";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { getWalletDetailsAction } from "@/features/wallet";
import { TopupModal } from "@/components/wallet/TopupModal";

const DELIVERY_LOCATIONS = [
  "Hostel Block 1 (Freshers Boys)",
  "Hostel Block 2 (Seniors Boys)",
  "Hostel Block 3 (PG & Research)",
  "Hostel Block 4 (Girls Complex A)",
  "Hostel Block 5 (Girls Complex B)",
  "Central Library Desk",
  "Main Academic Block C",
  "Cafeteria Hub",
];

const DELIVERY_WINDOWS = [
  { id: "morning", label: "Morning Drop", time: "8:30 AM - 9:00 AM" },
  { id: "lunch", label: "Lunch Drop", time: "12:50 PM - 1:30 PM" },
];

export default function PrintStationPage() {
  const { user, refreshUser } = useUser();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rates, setRates] = useState<PrintRatesData>({
    singleSidedPaise: 250,
    doubleSidedPaise: 200,
    colorSinglePaise: 1000,
    colorDoublePaise: 800,
    singleSidedRupees: 2.5,
    doubleSidedRupees: 2.0,
    colorSingleRupees: 10.0,
    colorDoubleRupees: 8.0,
  });

  // Form states
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);
  const [fileName, setFileName] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [driveFileId, setDriveFileId] = useState("");
  const [detectedPages, setDetectedPages] = useState<number>(0);
  const [copies, setCopies] = useState<number>(1);
  const [printType, setPrintType] = useState<PrintTypeEnum>("BW_DOUBLE");
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [deliverySlot, setDeliverySlot] = useState("");
  const [phoneNumber, setPhoneNumber] = useState(user?.phone || "");
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneSaved, setPhoneSaved] = useState(!!user?.phone);
  const [utrNumber, setUtrNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [platformUpiId, setPlatformUpiId] = useState("8307798816@upi");

  // Wallet states
  const [paymentMethod, setPaymentMethod] = useState<"WALLET" | "UPI">("WALLET");
  const [walletBalancePaise, setWalletBalancePaise] = useState<number | null>(null);
  const [isTopupModalOpen, setIsTopupModalOpen] = useState(false);

  const fetchWallet = async () => {
    if (!user?.id) return;
    try {
      const res = await getWalletDetailsAction();
      if (res.success && res.data) {
        setWalletBalancePaise(res.data.balancePaise);
      }
    } catch (err) {
      console.error("Failed to load wallet details:", err);
    }
  };

  useEffect(() => {
    fetchWallet();
    const handleWalletUpdated = () => fetchWallet();
    window.addEventListener("otium:wallet_updated", handleWalletUpdated);
    return () => window.removeEventListener("otium:wallet_updated", handleWalletUpdated);
  }, [user?.id]);

  // Issue reporting states
  const [reportingOrder, setReportingOrder] = useState<any | null>(null);
  const [issueReason, setIssueReason] = useState("");
  const [issueCategory, setIssueCategory] = useState("Print Quality Issue");
  const [isSubmittingIssue, setIsSubmittingIssue] = useState(false);

  const handleReportIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingOrder || !user || !issueReason.trim() || isSubmittingIssue) return;

    try {
      setIsSubmittingIssue(true);
      const res = await reportPrintOrderIssue({
        orderId: reportingOrder.id,
        userId: user.id,
        reason: issueReason.trim(),
        category: issueCategory,
      });

      if (res.success) {
        toast.success("Issue reported! Our campus print manager has been alerted and in-app message sent.");
        setReportingOrder(null);
        setIssueReason("");
        fetchOrders();
      } else {
        toast.error(res.error || "Failed to submit issue report.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to submit issue report.");
    } finally {
      setIsSubmittingIssue(false);
    }
  };

  useEffect(() => {
    if (user?.phone) {
      if (!phoneNumber) setPhoneNumber(user.phone);
      setPhoneSaved(true);
    }
  }, [user?.phone]);

  const handleSavePhone = async () => {
    if (!user) {
      toast.error("Please sign in to save your phone number.");
      return;
    }
    const cleanPhone = phoneNumber.replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      toast.error("Please enter a valid 10-digit mobile number.");
      return;
    }
    setSavingPhone(true);
    const res = await updateUserProfile({
      userId: user.id,
      phone: cleanPhone,
    });
    setSavingPhone(false);
    if (res.error) {
      toast.error(res.error);
    } else {
      setPhoneSaved(true);
      toast.success("Phone number saved to your student profile!");
      if (refreshUser) refreshUser();
    }
  };

  const fetchOrders = async () => {
    if (!user?.id) return;
    setLoading(true);
    const res = await getPrintOrders(user.id);
    if (res?.success && res.data) {
      setOrders(res.data);
    }
    setLoading(false);
  };

  const fetchRates = async () => {
    const res = await getPrintRatesAction();
    if (res?.success && res.data) {
      setRates(res.data);
    }
  };

  const fetchPlatformUpi = async () => {
    try {
      const res = await getPlatformSettingsAction();
      if (res?.success && res.data?.upiId) {
        setPlatformUpiId(res.data.upiId);
      } else {
        setPlatformUpiId("8307798816@upi");
      }
    } catch {
      setPlatformUpiId("8307798816@upi");
    }
  };

  useEffect(() => {
    fetchRates();
    fetchPlatformUpi();
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [user?.id]);

  // Pricing calculations with strict ₹5 minimum floor rule
  const effectivePages = Math.max(1, detectedPages || 1);
  const totalPagesToPrint = effectivePages * copies;
  const rawCostPaise = calculatePrintCostPaise(effectivePages, printType, rates) * copies;
  const totalCostPaise = Math.max(500, rawCostPaise); // Strict ₹5 floor rule
  const totalCostRupees = totalCostPaise / 100;
  const cashbackPaise = Math.floor(totalCostPaise * 0.02);
  const cashbackRupees = (cashbackPaise / 100).toFixed(2);
  const hasSufficientWalletBalance =
    walletBalancePaise !== null && walletBalancePaise >= totalCostPaise;

  // Amount-locked UPI deep link & QR
  const upiUrl = generateUpiUrl(
    platformUpiId,
    totalCostRupees,
    "OtiumPrintStation",
    `Print_${fileName.slice(0, 12)}`
  );
  const qrImageUrl = getUpiQrImageUrl(upiUrl, 220);

  const copyUpiId = () => {
    navigator.clipboard.writeText(platformUpiId);
    setCopiedUpi(true);
    toast.success("UPI ID copied to clipboard.");
    setTimeout(() => setCopiedUpi(false), 2500);
  };

  const handlePasteUtr = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const digits = text.replace(/\D/g, "");
      if (digits.length >= 12) {
        setUtrNumber(digits.slice(0, 12));
        toast.success("12-digit UTR pasted from clipboard!");
      } else if (digits.length > 0) {
        setUtrNumber(digits);
        toast.success("Pasted numbers from clipboard!");
      } else {
        toast.error("No numbers found in clipboard.");
      }
    } catch {
      toast.error("Could not read clipboard. Please paste manually.");
    }
  };

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Please sign in to place a print order.");
      return;
    }

    if (!fileUrl) {
      toast.error("Please upload a PDF document first.");
      return;
    }

    if (!deliveryLocation || !deliveryLocation.trim()) {
      toast.error("Please enter a campus drop location (e.g. room number, desk, or hostel block).");
      return;
    }

    if (!deliverySlot) {
      toast.error("Please select a delivery window slot.");
      return;
    }

    const cleanPhone = phoneNumber.replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      toast.error("Please provide a valid 10-digit phone number for delivery updates.");
      return;
    }

    // Ensure phone number is updated in the database first
    if (!user.phone || user.phone !== cleanPhone) {
      try {
        await updateUserProfile({ userId: user.id, phone: cleanPhone });
        setPhoneSaved(true);
        if (refreshUser) refreshUser();
      } catch (err) {
        console.warn("Could not sync phone before print order:", err);
      }
    }

    if (paymentMethod === "WALLET") {
      if (walletBalancePaise === null || walletBalancePaise < totalCostPaise) {
        toast.error("Insufficient wallet balance. Please top up your wallet or switch to UPI.");
        setIsTopupModalOpen(true);
        return;
      }
    } else {
      if (!utrNumber || utrNumber.trim().length < 6) {
        toast.error("Please enter the valid 12-digit UPI transaction reference number (UTR).");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await createPrintOrder({
        userId: user.id,
        collegeId: user.collegeId || undefined,
        fileName: fileName || "Untitled_Document.pdf",
        fileUrl,
        driveFileId: driveFileId || "direct_cloud",
        pageCount: detectedPages || 1,
        copies,
        printType,
        deliveryLocation: `${deliveryLocation} (${deliverySlot})`,
        utr: paymentMethod === "WALLET" ? undefined : utrNumber.trim(),
        phoneNumber: cleanPhone,
        paymentMethod,
      });

      if (!res.success) {
        throw new Error(res.error || "Failed to submit print order.");
      }

      if (paymentMethod === "WALLET") {
        window.dispatchEvent(new CustomEvent("otium:wallet_updated"));
        fetchWallet();
        const earnedCashback = (Math.floor(totalCostPaise * 0.02) / 100).toFixed(2);
        toast.success(
          `⚡ Paid ₹${totalCostRupees.toFixed(2)} via Otium Wallet! +₹${earnedCashback} (2%) cashback credited.`
        );
      } else {
        toast.success("Print order queued! The print manager has received your job.");
      }

      // Start 4-second cooldown timer to prevent accidental double-ordering
      setCooldownSeconds(4);
      const timer = setInterval(() => {
        setCooldownSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Reset form
      setFileUrl("");
      setFileName("");
      setDriveFileId("");
      setDetectedPages(0);
      setCopies(1);
      setUtrNumber("");
      fetchOrders();
    } catch (err: any) {
      toast.error(err.message || "Order submission failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ClientServiceGuard campusId={user?.collegeId} serviceKey="PRINT_STATION">
      <div className="space-y-8 pb-12">
        {/* Page Header */}
        <div className="space-y-2 border-b border-border pb-6">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary text-foreground text-xs font-semibold border border-border">
            <Printer className="w-3.5 h-3.5 text-primary" />
            <span>Express Print Dispatch</span>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Express Print Station
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Upload notes or assignments, select duplex configurations, pay via amount-locked UPI, and receive physical delivery at your campus drop point or hostel room.
          </p>
        </div>

        {/* Two-Column Grid: Order Submission + Rate Sheet / Active Orders */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Form Card (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="p-6 sm:p-8 space-y-6">
              <form onSubmit={handleOrderSubmit} className="space-y-6">
                {/* 1. Document Upload Dropzone */}
                <DocumentUpload
                  label="1. Document File (PDF Only)"
                  onUploadComplete={(url, id, name) => {
                    setFileUrl(url);
                    setDriveFileId(id || "supabase_direct");
                    if (name) setFileName(name);
                  }}
                  onPageCountDetected={(count) => setDetectedPages(count)}
                  campusId={user?.collegeId || "global"}
                  userId={user?.id || "student"}
                  existingFileUrl={fileUrl}
                  existingFileName={fileName}
                />

                {/* 2. Print Configuration Grid */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold uppercase tracking-wider text-foreground">
                    2. Print Specification
                  </label>

                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { id: "BW_DOUBLE", label: "B&W Double Sided", rate: rates.doubleSidedRupees },
                      { id: "BW_SINGLE", label: "B&W Single Sided", rate: rates.singleSidedRupees },
                      { id: "COLOR_DOUBLE", label: "Color Double Sided", rate: 8.0 },
                      { id: "COLOR_SINGLE", label: "Color Single Sided", rate: 10.0 },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setPrintType(opt.id as PrintTypeEnum)}
                        className={`p-3 rounded-lg border text-left transition-all fluid-interactive ${
                          printType === opt.id
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border bg-card/60 text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                        }`}
                      >
                        <div className="font-semibold text-xs text-foreground">
                          {opt.label}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          ₹{opt.rate.toFixed(2)} per page
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Document Pages (Server-Verified & Read-Only) & Copies Stepper */}
                  <div className="pt-2 border-t border-border space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <span className="text-xs font-semibold text-foreground block">
                          Document Pages:
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {detectedPages > 0 ? "Server-verified from uploaded PDF" : "Calculated automatically upon PDF upload"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 text-xs font-bold bg-secondary text-foreground rounded-md border border-border">
                          {detectedPages > 0 ? `${detectedPages} page${detectedPages > 1 ? "s" : ""}` : "—"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs font-semibold text-foreground">
                        Number of Copies:
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setCopies(Math.max(1, copies - 1))}
                          disabled={copies <= 1}
                        >
                          -
                        </Button>
                        <span className="w-10 text-center text-xs font-bold text-foreground">
                          {copies}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setCopies(copies + 1)}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Delivery Location & Window */}
                <div className="space-y-4 pt-2 border-t border-border">
                  <label className="block text-xs font-bold uppercase tracking-wider text-foreground">
                    3. Delivery Details
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-foreground">
                          Campus Drop Location:
                        </span>
                        <span className="text-[10px] text-muted-foreground">Open Text Field</span>
                      </div>
                      <Input
                        type="text"
                        placeholder="e.g. Hostel 3 Room 204, Library Desk 12, LT 03"
                        value={deliveryLocation}
                        onChange={(e) => setDeliveryLocation(e.target.value)}
                        required
                      />
                      <div className="flex flex-wrap gap-1 pt-1">
                        {[
                          "Hostel Block 1",
                          "Hostel Block 2",
                          "Hostel Block 3",
                          "Central Library Desk",
                          "Main Academic Block C",
                          "Cafeteria Hub",
                        ].map((loc) => (
                          <button
                            key={loc}
                            type="button"
                            onClick={() => setDeliveryLocation(loc)}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors border border-border"
                          >
                            + {loc}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-xs font-medium text-foreground">
                        Dispatch Window:
                      </span>
                      <select
                        value={deliverySlot}
                        onChange={(e) => setDeliverySlot(e.target.value)}
                        className="w-full h-9 px-3 rounded-lg border border-input bg-card text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">Select delivery window</option>
                        {DELIVERY_WINDOWS.map((slot) => (
                          <option key={slot.id} value={slot.label}>
                            {slot.label} ({slot.time})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground">
                        Contact Phone (for delivery SMS/call):
                      </span>
                      {phoneSaved && (
                        <Badge
                          variant="outline"
                          size="sm"
                          className="text-[10px] border-emerald-500/40 text-emerald-600 dark:text-emerald-400 gap-1 py-0 font-medium"
                        >
                          <Check className="w-2.5 h-2.5 text-emerald-500" />
                          Saved to Account
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        type="tel"
                        placeholder="10-digit mobile number"
                        value={phoneNumber}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPhoneNumber(val);
                          setPhoneSaved(val.replace(/\D/g, "") === user?.phone);
                        }}
                        maxLength={10}
                        className="flex-1 font-mono text-xs"
                      />
                      <Button
                        type="button"
                        variant={phoneSaved ? "secondary" : "default"}
                        size="sm"
                        onClick={handleSavePhone}
                        disabled={savingPhone || phoneNumber.replace(/\D/g, "").length !== 10}
                        isLoading={savingPhone}
                        className="flex-shrink-0"
                      >
                        {phoneSaved ? (
                          <>
                            <Check className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                            Saved
                          </>
                        ) : (
                          <>
                            <Save className="w-3.5 h-3.5 mr-1" />
                            Save Phone
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Save your phone number so the dispatch operator can contact you when your print job arrives.
                    </p>
                  </div>
                </div>

                {/* 4. Payment Method & Checkout */}
                <div className="space-y-4 pt-2 border-t border-border">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider text-foreground">
                      4. Payment Method & Checkout
                    </label>
                    <div className="text-right">
                      <div className="text-sm font-bold text-foreground">
                        Total: ₹{totalCostRupees.toFixed(2)}
                      </div>
                      {rawCostPaise < 500 && (
                        <div className="text-[10px] text-amber-500 font-semibold">
                          Minimum order ₹5.00 applied
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Payment Method Switcher */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Option 1: Otium Campus Wallet */}
                    <div
                      onClick={() => setPaymentMethod("WALLET")}
                      className={`relative p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                        paymentMethod === "WALLET"
                          ? "border-primary bg-primary/5 shadow-xs"
                          : "border-border bg-card/50 hover:border-border/80"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg ${paymentMethod === "WALLET" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                            <Zap className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-bold text-foreground">Otium E-Wallet</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                          +2% Cashback
                        </span>
                      </div>

                      <div className="text-xs text-muted-foreground flex items-center justify-between mt-2 pt-2 border-t border-border/60">
                        <span>Balance:</span>
                        <span className="font-bold text-foreground">
                          {walletBalancePaise !== null ? `₹${(walletBalancePaise / 100).toFixed(2)}` : "Loading..."}
                        </span>
                      </div>

                      {hasSufficientWalletBalance ? (
                        <div className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                          <span>1-Click Pay! You'll earn +₹{cashbackRupees} cashback.</span>
                        </div>
                      ) : (
                        <div className="mt-2 text-[11px] text-amber-600 dark:text-amber-400 flex items-center justify-between">
                          <span>Short by ₹{(((totalCostPaise - (walletBalancePaise || 0))) / 100).toFixed(2)}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsTopupModalOpen(true);
                            }}
                            className="font-bold underline hover:opacity-80"
                          >
                            Top Up
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Option 2: Direct UPI QR */}
                    <div
                      onClick={() => setPaymentMethod("UPI")}
                      className={`relative p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                        paymentMethod === "UPI"
                          ? "border-primary bg-primary/5 shadow-xs"
                          : "border-border bg-card/50 hover:border-border/80"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg ${paymentMethod === "UPI" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                            <QrCode className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-bold text-foreground">Direct UPI App / QR</span>
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border/60">
                        Scan with GPay, PhonePe, Paytm, etc. and enter transaction UTR.
                      </div>
                    </div>
                  </div>

                  {/* If UPI selected, show QR and UTR input */}
                  {paymentMethod === "UPI" && (
                    <div className="space-y-4 pt-2">
                      <div className="p-4 rounded-xl border border-border bg-secondary/30 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                        <div className="flex justify-center">
                          <div className="p-2.5 rounded-lg bg-white border border-border shadow-xs">
                            <img
                              src={qrImageUrl}
                              alt="UPI QR Code"
                              className="w-36 h-36 object-contain"
                            />
                          </div>
                        </div>

                        <div className="space-y-2 text-xs">
                          <p className="font-semibold text-foreground">
                            Scan QR using any UPI app:
                          </p>
                          <p className="text-muted-foreground text-[11px] leading-relaxed">
                            GPay, PhonePe, Paytm, or BHIM. Amount is locked to ₹{totalCostRupees.toFixed(2)}.
                          </p>

                          <div className="pt-1 space-y-1">
                            <span className="text-[11px] font-medium text-muted-foreground">
                              UPI ID:
                            </span>
                            <div className="flex items-center gap-1.5 font-mono text-[11px] text-foreground bg-card px-2 py-1 rounded border border-border">
                              <span className="truncate">{platformUpiId}</span>
                              <button
                                type="button"
                                onClick={copyUpiId}
                                className="text-primary hover:underline ml-auto flex-shrink-0"
                              >
                                {copiedUpi ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>

                            <a
                              href={upiUrl}
                              className="inline-flex items-center justify-center gap-1.5 w-full mt-2 py-2 px-3 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary font-semibold text-xs transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              Pay ₹{totalCostRupees.toFixed(2)} with UPI App
                            </a>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground">
                            12-Digit Transaction UTR Number:
                          </span>
                          <button
                            type="button"
                            onClick={handlePasteUtr}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 bg-primary/10 px-2 py-0.5 rounded-md transition-colors"
                          >
                            <Clipboard className="w-3 h-3" />
                            <span>Paste UTR</span>
                          </button>
                        </div>
                        <Input
                          type="text"
                          placeholder="e.g. 423187654321"
                          value={utrNumber}
                          onChange={(e) => setUtrNumber(e.target.value.replace(/\D/g, ""))}
                          maxLength={12}
                        />
                      </div>

                      {/* 3-Step Integrated Guide */}
                      <div className="p-3 rounded-lg border border-border bg-secondary/20 text-[11px] text-muted-foreground space-y-1">
                        <p><strong className="text-foreground">1.</strong> Tap &quot;Pay with UPI App&quot; or scan the QR code above.</p>
                        <p><strong className="text-foreground">2.</strong> Copy the 12-digit UTR from your UPI payment success screen.</p>
                        <p><strong className="text-foreground">3.</strong> Tap &quot;Paste UTR&quot; above and click &quot;Submit Print Job&quot;.</p>
                      </div>
                    </div>
                  )}

                  {/* If Wallet selected and insufficient balance, show Top Up CTA */}
                  {paymentMethod === "WALLET" && !hasSufficientWalletBalance && (
                    <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 flex items-center justify-between">
                      <div className="text-xs text-amber-600 dark:text-amber-400">
                        <p className="font-semibold">Insufficient Otium Wallet Balance</p>
                        <p className="text-[11px]">
                          Recharge ₹{(((totalCostPaise - (walletBalancePaise || 0))) / 100).toFixed(2)} to unlock 1-click checkout + 2% cashback.
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setIsTopupModalOpen(true)}
                        className="text-xs"
                      >
                        Top Up Now
                      </Button>
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  isLoading={isSubmitting}
                  disabled={
                    !fileUrl ||
                    isSubmitting ||
                    cooldownSeconds > 0 ||
                    (paymentMethod === "WALLET" && !hasSufficientWalletBalance)
                  }
                >
                  {cooldownSeconds > 0
                    ? `✓ Order Placed! Please wait (${cooldownSeconds}s)...`
                    : paymentMethod === "WALLET"
                    ? hasSufficientWalletBalance
                      ? `⚡ Pay ₹${totalCostRupees.toFixed(2)} with Wallet (+₹${cashbackRupees} Cashback)`
                      : `Insufficient Balance (Top Up ₹${(((totalCostPaise - (walletBalancePaise || 0))) / 100).toFixed(2)})`
                    : `Confirm & Submit Print Job (₹${totalCostRupees.toFixed(2)})`}
                </Button>
              </form>
            </Card>
          </div>

          {/* Right Column: Rate Information & Order Tracker (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Rates Reference */}
            <Card className="p-5 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <Printer className="w-4 h-4 text-primary" />
                <h3 className="font-heading font-bold text-sm text-foreground">
                  Official Campus Print Tariff
                </h3>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">B&W Double Sided</span>
                  <span className="font-bold text-foreground">₹{rates.doubleSidedRupees.toFixed(2)} / page</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">B&W Single Sided</span>
                  <span className="font-bold text-foreground">₹{rates.singleSidedRupees.toFixed(2)} / page</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-border/40">
                  <span className="text-muted-foreground">Color Double Sided</span>
                  <span className="font-bold text-foreground">₹8.00 / page</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-muted-foreground">Color Single Sided</span>
                  <span className="font-bold text-foreground">₹10.00 / page</span>
                </div>
              </div>
            </Card>

            {/* Live Order Tracker */}
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <h3 className="font-heading font-bold text-sm text-foreground">
                    Your Print Jobs
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={fetchOrders}
                  className="p-1 rounded text-muted-foreground hover:text-foreground"
                  title="Refresh order status"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                </button>
              </div>

              {loading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-16 rounded-lg bg-secondary/60 animate-pulse" />
                  ))}
                </div>
              ) : orders.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No print orders placed yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {orders.map((ord) => (
                    <div
                      key={ord.id}
                      className="p-3.5 rounded-lg border border-border bg-card/60 space-y-3 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5 min-w-0">
                          <p className="font-semibold text-foreground truncate">
                            {ord.fileName}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {formatDate(ord.createdAt)}
                          </p>
                        </div>
                        <Badge
                          variant={
                            ord.status === "COMPLETED" || ord.status === "DELIVERED"
                              ? "success"
                              : ord.status === "PRINTING" || ord.status === "OUT_FOR_DELIVERY"
                              ? "warning"
                              : ord.status === "ISSUE_REPORTED"
                              ? "warning"
                              : ord.status === "CANCELLED" || ord.status === "REJECTED"
                              ? "destructive"
                              : "default"
                          }
                          size="sm"
                        >
                          {ord.status.replace(/_/g, " ")}
                        </Badge>
                      </div>

                      {/* Animated Mechanical Dispatch Stepper with Observable Issue */}
                      <PrintOrderTracker
                        status={ord.status}
                        issueNote={
                          ord.deliveryLocation?.includes("ISSUE")
                            ? ord.deliveryLocation.split("ISSUE")[1]?.replace(/^[^:]*:\s*/, "")
                            : undefined
                        }
                      />

                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                        <span>
                          {ord.pageCount} pages x {ord.copies} copy
                        </span>
                        <span className="font-bold text-foreground">
                          {formatPaiseToRupees(ord.totalCost ?? ord.totalCostPaise)}
                        </span>
                      </div>

                      <div className="text-[11px] text-muted-foreground truncate">
                        Drop: {ord.deliveryLocation}
                      </div>

                      {/* In-app message updates link & Issue report button */}
                      <div className="flex items-center justify-between pt-1 border-t border-border/30 text-[11px]">
                        <Link
                          href="/messages"
                          className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>Order Chat Updates</span>
                        </Link>

                        {ord.status === "ISSUE_REPORTED" ? (
                          <span className="text-amber-500 font-semibold inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Issue Under Review</span>
                          </span>
                        ) : ord.status !== "CANCELLED" && ord.status !== "REJECTED" ? (
                          <button
                            type="button"
                            onClick={() => {
                              setReportingOrder(ord);
                              setIssueReason("");
                            }}
                            className="inline-flex items-center gap-1 text-muted-foreground hover:text-amber-500 transition-colors"
                          >
                            <AlertTriangle className="w-3 h-3" />
                            <span>Report Problem</span>
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Issue Reporting Modal */}
        <Modal
          isOpen={!!reportingOrder}
          onClose={() => setReportingOrder(null)}
          title="Report Problem on Print Order"
          description={`Order #${reportingOrder?.id?.slice(-6).toUpperCase()} — ${reportingOrder?.fileName}`}
        >
          <form onSubmit={handleReportIssue} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Problem Category</label>
              <select
                value={issueCategory}
                onChange={(e) => setIssueCategory(e.target.value)}
                className="w-full text-xs rounded-md border border-border bg-card p-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="Print Quality Issue">Print Quality Issue (Faded / Streaks / Cut off)</option>
                <option value="Wrong Pages / Missing Pages">Wrong Pages / Missing Pages</option>
                <option value="Order Not Found at Drop Location">Order Not Found at Drop Location</option>
                <option value="Payment / UTR Verification Delay">Payment / UTR Verification Delay</option>
                <option value="Incorrect Document">Incorrect Document Printed</option>
                <option value="Other">Other Problem</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Detailed Description</label>
              <Textarea
                placeholder="Explain what went wrong so our campus print operator can reprint or resolve this..."
                value={issueReason}
                onChange={(e) => setIssueReason(e.target.value)}
                rows={3}
                required
                className="text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setReportingOrder(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                isLoading={isSubmittingIssue}
                disabled={!issueReason.trim() || isSubmittingIssue}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                Submit Problem Report
              </Button>
            </div>
          </form>
        </Modal>

        {/* Embedded E-Wallet Top-up Modal */}
        <TopupModal
          isOpen={isTopupModalOpen}
          onClose={() => setIsTopupModalOpen(false)}
          onSuccess={fetchWallet}
        />
      </div>
    </ClientServiceGuard>
  );
}
