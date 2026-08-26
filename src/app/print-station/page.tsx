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
} from "lucide-react";
import { PrintTypeEnum } from "@/lib/types";
import { PdfUploadDropzone } from "@/components/ui/PdfUploadDropzone";
import { PrintRatesData, calculatePrintCostPaise } from "@/lib/services/print.service";

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
  const [pageCount, setPageCount] = useState<string>("1");
  const [printType, setPrintType] = useState<PrintTypeEnum>("BW_DOUBLE");
  const [deliveryLocation, setDeliveryLocation] = useState(DELIVERY_LOCATIONS[0]);
  const [utrNumber, setUtrNumber] = useState("");
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchOrders = async () => {
    if (!user) return;
    setLoading(true);
    const res = await getPrintOrders(user.id);
    if (res.success && res.data) {
      setOrders(res.data);
    }
    setLoading(false);
  };

  const fetchRates = async () => {
    const res = await getPrintRatesAction();
    if (res.success && res.data) {
      setRates(res.data);
    }
  };

  const [platformUpiId, setPlatformUpiId] = useState("otium.escrow@okhdfcbank");

  const fetchPlatformUpi = async () => {
    const res = await getPlatformSettingsAction();
    if (res.success && res.data?.upiId) {
      setPlatformUpiId(res.data.upiId);
    }
  };

  useEffect(() => {
    fetchRates();
    fetchPlatformUpi();
  }, []);

  useEffect(() => {
    fetchOrders();
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
  const pages = Math.max(1, parseInt(pageCount, 10) || 1);
  const totalCostPaise = calculatePrintCostPaise(pages, printType, rates);
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
    if (!user) {
      toast.error("Please login to place print orders.");
      return;
    }
    if (!fileName.trim() || !fileUrl.trim()) {
      toast.error("Please upload a PDF document before submitting.");
      return;
    }

    const cleanUtr = utrNumber.trim();
    if (!cleanUtr || cleanUtr.length !== 12 || !/^\d{12}$/.test(cleanUtr)) {
      toast.error("Please enter a valid 12-digit numeric UPI transaction UTR number.");
      return;
    }

    setIsSubmitting(true);
    const enrichedLocation = `${deliveryLocation} | UTR: ${cleanUtr}`;

    const res = await createPrintOrder({
      userId: user.id,
      fileName,
      fileUrl: fileUrl.trim(),
      pageCount: pages,
      printType,
      deliveryLocation: enrichedLocation,
      expectedDelivery: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    });
    setIsSubmitting(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Print order queued! Admin verifying UTR & dispatching to hostel.");
      setFileName("");
      setFileUrl("");
      setPageCount("1");
      setUtrNumber("");
      fetchOrders();
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-950/90 via-slate-900/90 to-brand-950/90 p-8 sm:p-10 border border-teal-500/30 text-white shadow-2xl backdrop-blur-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 -mb-16 w-60 h-60 bg-electric-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-300 text-xs font-semibold">
              <Printer className="w-3.5 h-3.5" />
              <span>Campus Hostel Cloud Print Network • Supabase Documents</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Hostel Print Station & Express Delivery
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Upload PDF assignments. Exact page counts are auto-calculated using pdf-lib. Dispatched straight to your hostel block within 2 hours.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Print Order Form */}
        <div className="lg:col-span-2">
          <GlassCard className="p-6 sm:p-8 space-y-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-brand-500" />
              <span>Configure Print Job</span>
            </h2>

            <form onSubmit={handleCreateOrder} className="space-y-6">
              {/* Step 1: Direct Supabase Signed PDF Dropzone with pdf-lib page detection */}
              <PdfUploadDropzone
                onPdfUploaded={(url, name) => {
                  setFileUrl(url);
                  setFileName(name);
                }}
                onPageCountDetected={(count) => {
                  setPageCount(String(count));
                }}
                onUploadingChange={(up) => setIsUploadingMedia(up)}
                existingPdfUrl={fileUrl}
                label="Step 1: Upload Document PDF (Auto-Calculates Exact Page Count)"
                required
              />

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
                            ? "bg-brand-500/15 border-brand-500 shadow-md ring-1 ring-brand-500"
                            : "bg-slate-100/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 hover:bg-slate-200/50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {type.name}
                          </span>
                          <span className="text-xs font-black text-brand-600 dark:text-brand-400">
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

              {/* Step 3: Page Count & Delivery Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Step 3: Document Pages (Auto-Calculated) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={pageCount}
                    onChange={(e) => setPageCount(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Auto-calculated from uploaded PDF bytes via pdf-lib.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Step 4: Delivery Destination *
                  </label>
                  <select
                    value={deliveryLocation}
                    onChange={(e) => setDeliveryLocation(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {DELIVERY_LOCATIONS.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Step 5: PROMINENT PAYMENT & QR CODE SECTION */}
              <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-amber-500" />
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Step 5: UPI Payment & UTR Verification
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
                        <p className="text-[10px] text-slate-400">Scan & Pay to UPI ID:</p>
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
                        Must be exactly 12 numeric digits from your GPay, PhonePe, or Paytm receipt.
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
                  <p className="text-2xl font-black text-brand-600 dark:text-brand-400">
                    {formatPaiseToRupees(totalCostPaise)}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {pages} pages × ₹{(totalCostPaise / pages / 100).toFixed(2)} / page
                  </p>
                </div>

                <SubmitButton
                  disabled={isUploadingMedia || isSubmitting || !fileUrl || utrNumber.length !== 12}
                  isSubmitting={isSubmitting || isUploadingMedia}
                  loadingText={isUploadingMedia ? "Uploading document to Supabase..." : "Submitting Order..."}
                  size="lg"
                  leftIcon={<Printer className="w-4 h-4" />}
                >
                  Send Print Order (₹{totalCostRupees})
                </SubmitButton>
              </div>
            </form>
          </GlassCard>
        </div>

        {/* Right Col: Active Print Orders Tracker */}
        <div>
          <GlassCard className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand-500" />
                <span>Your Print Queue</span>
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchOrders}
                className="text-xs h-7 px-2"
                leftIcon={<RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />}
              >
                Sync
              </Button>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-24 rounded-xl bg-slate-200/50 dark:bg-slate-800 animate-pulse" />
                ))}
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                No active print orders. Submit above to queue your documents!
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((ord) => (
                  <div
                    key={ord.id}
                    className="p-3.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate" title={ord.fileName}>
                        {ord.fileName}
                      </p>
                      <Badge
                        variant={
                          ord.status === "COMPLETED" || ord.status === "DELIVERED"
                            ? "success"
                            : ord.status === "PRINTING"
                            ? "brand"
                            : ord.status === "OUT_FOR_DELIVERY"
                            ? "info"
                            : "warning"
                        }
                        size="sm"
                      >
                        {ord.status.replace(/_/g, " ")}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span>{ord.pageCount} Pages • {ord.printType.replace(/_/g, " ")}</span>
                      <span className="font-bold text-brand-600 dark:text-brand-400">
                        {formatPaiseToRupees(ord.totalCost)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                      <div className="flex items-center gap-1 truncate max-w-[170px]">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{ord.deliveryLocation}</span>
                      </div>

                      {ord.fileUrl && (
                        <a
                          href={ord.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-brand-500 font-bold hover:underline"
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
  );
}
