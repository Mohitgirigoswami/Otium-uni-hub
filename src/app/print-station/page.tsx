"use client";

import React, { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { useUser } from "@/components/providers/UserContext";
import { getPrintOrders, createPrintOrder, getPrintRatesAction } from "@/actions/print.actions";
import { getPlatformSettingsAction } from "@/actions/platform.actions";
import { generateUpiUrl, getUpiQrImageUrl } from "@/lib/upi";
import { formatPaiseToRupees, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import {
  Printer,
  FileText,
  UploadCloud,
  Clock,
  MapPin,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  QrCode,
  Copy,
  ExternalLink,
  ShieldCheck,
  HardDrive,
  Check,
  Layers,
} from "lucide-react";
import { PrintTypeEnum } from "@/lib/types";
import { DocumentUpload } from "@/components/ui/DocumentUpload";
import { PrintRatesData, calculatePrintCostPaise } from "@/lib/services/print.service";
import { ClientServiceGuard } from "@/components/ClientServiceGuard";

const DELIVERY_LOCATIONS = [
  "Hostel Block 1 (Freshers Boys)",
  "Hostel Block 2 (Seniors Boys)",
  "Hostel Block 3 (PG & Research)",
  "Hostel Block 4 (Girls Complex A)",
  "Hostel Block 5 (Girls Complex B)",
  "Central University Library Desk",
  "Cafeteria Hub Pickup Counter",
];

export default function PrintStationPage() {
  const { user } = useUser();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rates, setRates] = useState<PrintRatesData>({
    singleSidedPaise: 250,
    doubleSidedPaise: 200,
    colorSinglePaise: 1000,
    colorDoublePaise: 800,
    singleSidedRupees: 2.5,
    doubleSidedRupees: 2.0,
  });

  // Form states
  const [fileName, setFileName] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [driveFileId, setDriveFileId] = useState("");
  const [detectedPages, setDetectedPages] = useState<number>(0);
  const [copies, setCopies] = useState<number>(1);
  const [printType, setPrintType] = useState<PrintTypeEnum>("BW_DOUBLE");
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [utrNumber, setUtrNumber] = useState("");
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const [platformUpiId, setPlatformUpiId] = useState("otium.escrow@okhdfcbank");

  const fetchPlatformUpi = async () => {
    const res = await getPlatformSettingsAction();
    if (res?.success && res.data?.upiId) {
      setPlatformUpiId(res.data.upiId);
    }
  };

  useEffect(() => {
    fetchRates();
    fetchPlatformUpi();
  }, []);

  useEffect(() => {
    if (user?.id) {
      fetchOrders();
    }
  }, [user?.id]);

  const printTypeOptions = [
    {
      id: "BW_DOUBLE" as PrintTypeEnum,
      name: "B&W Double-Sided (Recommended)",
      desc: "Eco-friendly duplex printing on 75 GSM bright paper.",
      rateRupees: `₹${rates.doubleSidedRupees.toFixed(2)} / page`,
    },
    {
      id: "BW_SINGLE" as PrintTypeEnum,
      name: "B&W Single-Sided",
      desc: "Standard single page printing for official submissions.",
      rateRupees: `₹${rates.singleSidedRupees.toFixed(2)} / page`,
    },
    {
      id: "COLOR_SINGLE" as PrintTypeEnum,
      name: "Full Color Single-Sided",
      desc: "High-resolution color graphs, charts, and presentation slides.",
      rateRupees: "₹10.00 / page",
    },
    {
      id: "COLOR_DOUBLE" as PrintTypeEnum,
      name: "Full Color Double-Sided",
      desc: "Vibrant duplex color printing for project reports.",
      rateRupees: "₹8.00 / page",
    },
  ];

  // Dynamic Cost calculation in Paise & Amount-Locked UPI URL
  const pages = Math.max(1, detectedPages || 1);
  const totalCostPaise = calculatePrintCostPaise(pages, printType, rates) * copies;
  const totalCostRupees = (totalCostPaise / 100).toFixed(2);

  const dynamicUpiDeepLink = generateUpiUrl(
    platformUpiId,
    totalCostRupees,
    "OtiumPrint",
    `Print Order ${fileName || "Doc"}`
  );
  const upiQrUrl = getUpiQrImageUrl(dynamicUpiDeepLink, 200);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      toast.error("Please login to place print orders.");
      return;
    }
    if (!fileUrl.trim() && !driveFileId.trim()) {
      toast.error("Please upload a PDF document before submitting.");
      return;
    }

    if (!detectedPages || detectedPages < 1) {
      toast.error("Document page count could not be calculated. Please re-upload a valid PDF.");
      return;
    }

    if (!deliveryLocation.trim() || deliveryLocation.trim().length < 3) {
      toast.error("Please enter your delivery location anywhere in campus.");
      return;
    }

    const cleanUtr = utrNumber.trim();
    if (!cleanUtr || cleanUtr.length !== 12 || !/^\d{12}$/.test(cleanUtr)) {
      toast.error("Please enter a valid 12-digit numeric UPI transaction UTR number.");
      return;
    }

    setIsSubmitting(true);
    const enrichedLocation = `${deliveryLocation.trim()} | Copies: ${copies} | UTR: ${cleanUtr}`;

    const res = await createPrintOrder({
      userId: user.id,
      fileName: fileName || "Campus_Document.pdf",
      fileUrl: fileUrl.trim(),
      driveFileId: driveFileId.trim() || undefined,
      pageCount: detectedPages,
      copies,
      printType,
      deliveryLocation: enrichedLocation,
      utr: cleanUtr,
      collegeId: user.collegeId,
      expectedDelivery: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
    setIsSubmitting(false);

    if (!res?.success || res?.error) {
      toast.error(res?.error || "Failed to submit print order. Please try again.");
    } else {
      toast.success("Print order queued! Admin verifying UTR & dispatching next-day anywhere in campus.");
      setFileName("");
      setFileUrl("");
      setDriveFileId("");
      setDetectedPages(0);
      setCopies(1);
      setUtrNumber("");
      fetchOrders();
    }
  };

  return (
    <ClientServiceGuard campusId={user?.collegeId} serviceKey="PRINT_STATION">
      <div className="space-y-8">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-950/90 via-slate-900/90 to-brand-950/90 p-8 sm:p-10 border border-teal-500/30 text-white shadow-2xl backdrop-blur-2xl">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 -mb-16 w-60 h-60 bg-electric-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-300 text-xs font-semibold">
                <Printer className="w-3.5 h-3.5" />
                <span>Campus Cloud Print Station</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Campus Print Station & Next-Day Delivery
              </h1>
              <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                Direct secure document upload. Page counts are auto-calculated to ensure exact transparent pricing. Next-day delivery anywhere in campus.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left 2 Cols: Print Order Form */}
          <div className="lg:col-span-2">
            <GlassCard className="p-6 sm:p-8 space-y-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-teal-500" />
                <span>Configure Print Job</span>
              </h2>

              <form onSubmit={handleCreateOrder} className="space-y-6">
                {/* Step 1: Direct Cloud Document Upload with pdf-lib Page Auto-Detection */}
                <DocumentUpload
                  onUploadComplete={(url, id, name) => {
                    setFileUrl(url);
                    if (id) setDriveFileId(id);
                    if (name) setFileName(name);
                  }}
                  onPageCountDetected={(count) => {
                    setDetectedPages(count);
                    toast.info(`Auto-detected ${count} pages in document.`);
                  }}
                  onUploadingChange={(up) => setIsUploadingMedia(up)}
                  campusId={user?.collegeId || "global"}
                  userId={user?.id || "student"}
                  existingFileUrl={fileUrl}
                  existingFileName={fileName}
                  label="Step 1: Upload Document PDF (Auto-Calculates Exact Page Count)"
                />

                {/* Detected Page Count Status Card (Prevents User Manipulation) */}
                <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {detectedPages > 0
                          ? `Document Length: ${detectedPages} Page${detectedPages !== 1 ? "s" : ""}`
                          : "No document uploaded yet"}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {detectedPages > 0
                          ? "Verified & calculated automatically with transparent rates"
                          : "Upload a PDF above to extract page count"}
                      </p>
                    </div>
                  </div>

                  {detectedPages > 0 ? (
                    <Badge variant="brand" size="sm">
                      {detectedPages} Page{detectedPages !== 1 ? "s" : ""}
                    </Badge>
                  ) : (
                    <Badge variant="neutral" size="sm">
                      Pending PDF
                    </Badge>
                  )}
                </div>

                {/* Step 2: Print Type Selection */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Step 2: Print Format & Paper Type *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {printTypeOptions.map((type) => {
                      const isSelected = printType === type.id;
                      return (
                        <div
                          key={type.id}
                          onClick={() => setPrintType(type.id)}
                          className={`p-4 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? "bg-teal-500/15 border-teal-500 shadow-md ring-1 ring-teal-500"
                              : "bg-slate-100/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 hover:bg-slate-200/50"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {type.name}
                            </span>
                            <span className="text-xs font-black text-teal-600 dark:text-teal-400">
                              {type.rateRupees}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                            {type.desc}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Step 3: Copies & Delivery Location */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Step 3: Number of Copies *
                    </label>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 5, 10].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setCopies(num)}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                            copies === num
                              ? "bg-teal-600 text-white shadow-md shadow-teal-600/30"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                          }`}
                        >
                          {num}x
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center justify-between">
                      <span>Step 4: Delivery Destination *</span>
                      <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold lowercase">anywhere in campus</span>
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Library Desk 12 / Academic Block C / Hostel Block B"
                        value={deliveryLocation}
                        onChange={(e) => setDeliveryLocation(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium"
                      />
                    </div>
                    {/* In-Campus Location Presets */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="text-[10px] text-slate-400 font-semibold">Presets:</span>
                      {[
                        "Hostel Block 1, Room ",
                        "Hostel Block 4, Room ",
                        "Library Ground Desk",
                        "Cafeteria Pickup",
                        "Department Lab ",
                      ].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setDeliveryLocation(preset)}
                          className="px-2 py-0.5 rounded-lg bg-slate-200/70 dark:bg-slate-800 text-[10px] font-medium text-slate-600 dark:text-slate-300 hover:bg-teal-500/20 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                        >
                          {preset.trim()}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Step 5: PROMINENT PAYMENT & QR CODE SECTION */}
                <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <QrCode className="w-5 h-5 text-amber-500" />
                      <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                        Step 5: Dynamic UPI QR & UTR Verification
                      </h3>
                    </div>
                    <Badge variant="warning" size="sm">Strict 12-Digit UTR</Badge>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
                    {/* Dynamic QR Code Image */}
                    <div className="p-3 bg-white rounded-2xl shadow-lg border border-slate-200 shrink-0 text-center">
                      <img
                        src={upiQrUrl}
                        alt="UPI Payment QR Code"
                        className="w-36 h-36 mx-auto rounded-lg"
                      />
                      <span className="block text-[10px] font-bold text-slate-700 mt-1.5 font-mono">
                        ₹{totalCostRupees}
                      </span>
                    </div>

                    <div className="space-y-3 flex-1 w-full text-xs">
                      <div className="p-2.5 rounded-xl bg-white/50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-slate-400">Scan & Pay to Platform UPI ID:</p>
                          <p className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">
                            {platformUpiId}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(platformUpiId, "UPI ID")}
                          className="text-xs h-7"
                          leftIcon={<Copy className="w-3 h-3" />}
                        >
                          Copy
                        </Button>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                          Enter 12-Digit UPI Transaction / UTR Number *
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={12}
                          placeholder="e.g. 423819823412"
                          value={utrNumber}
                          onChange={(e) => setUtrNumber(e.target.value.replace(/\D/g, ""))}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-400 text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <p className="text-[10px] text-slate-500 mt-1">
                          Enter the 12 numeric digits from your GPay, PhonePe, or Paytm receipt.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cost Summary & Submit */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">
                      Total Order Payable
                    </p>
                    <p className="text-2xl font-black text-teal-600 dark:text-teal-400">
                      {formatPaiseToRupees(totalCostPaise)}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {detectedPages > 0 ? detectedPages : 1} pages × {copies} {copies === 1 ? "copy" : "copies"} @ ₹{(totalCostPaise / (pages * copies) / 100).toFixed(2)} / page
                    </p>
                  </div>

                  <SubmitButton
                    disabled={isUploadingMedia || isSubmitting || (!fileUrl && !driveFileId) || utrNumber.length !== 12 || detectedPages < 1}
                    isSubmitting={isSubmitting || isUploadingMedia}
                    loadingText={isUploadingMedia ? "Streaming document to Google Drive..." : "Submitting Print Order..."}
                    size="lg"
                    className="bg-teal-600 hover:bg-teal-500 font-bold"
                    leftIcon={<Printer className="w-4 h-4" />}
                  >
                    Place Print Order (₹{totalCostRupees})
                  </SubmitButton>
                </div>
              </form>
            </GlassCard>
          </div>

          {/* Right 1 Col: Live Queue & My Orders */}
          <div className="lg:col-span-1 space-y-6">
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-teal-500" />
                  <span>My Print Orders</span>
                </h3>
                <button
                  onClick={fetchOrders}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
                  title="Refresh Queue"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                </button>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 rounded-xl bg-slate-200/60 dark:bg-slate-800 animate-pulse" />
                  ))}
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <Printer className="w-8 h-8 mx-auto text-slate-400 opacity-60" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    No active print jobs
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Upload your first document on the left to submit a cloud print order.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[180px]">
                            {order.fileName && !order.fileName.startsWith("cmt")
                              ? order.fileName
                              : `Print Job #${order.id.slice(-4).toUpperCase()}`}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {formatDate(order.createdAt)}
                          </p>
                        </div>

                        <Badge
                          variant={
                            order.status === "COMPLETED" || order.status === "DELIVERED"
                              ? "success"
                              : order.status === "PRINTING" || order.status === "OUT_FOR_DELIVERY"
                              ? "brand"
                              : order.status === "REJECTED"
                              ? "danger"
                              : "warning"
                          }
                          size="sm"
                        >
                          {order.status.replace(/_/g, " ")}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <span className="font-semibold">
                          {order.pageCount} pgs {order.copies > 1 ? `• ${order.copies}x` : ""} • {order.printType.replace(/_/g, " ")}
                        </span>
                        <span className="font-extrabold text-teal-600 dark:text-teal-400">
                          {formatPaiseToRupees(order.totalCost)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="truncate max-w-[180px] flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5 shrink-0" />
                          <span>{order.deliveryLocation}</span>
                        </span>

                        {order.fileUrl && (
                          <a
                            href={order.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-0.5 font-bold"
                          >
                            <FileText className="w-3 h-3" />
                            <span>PDF</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </div>
        </div>
      </div>
    </ClientServiceGuard>
  );
}
