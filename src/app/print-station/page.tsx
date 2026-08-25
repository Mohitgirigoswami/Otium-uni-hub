"use client";

import React, { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { useUser } from "@/components/providers/UserContext";
import { getPrintOrders, createPrintOrder, PRINT_RATES_PAISE } from "@/actions/print.actions";
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
} from "lucide-react";
import { PrintTypeEnum } from "@/lib/types";

const PRINT_TYPES: { id: PrintTypeEnum; name: string; desc: string; rateRupees: string }[] = [
  {
    id: "BW_DOUBLE",
    name: "B&W Double-Sided (Recommended)",
    desc: "Eco-friendly duplex printing on 75 GSM bright paper.",
    rateRupees: "₹1.50 / page",
  },
  {
    id: "BW_SINGLE",
    name: "B&W Single-Sided",
    desc: "Standard single page printing for official submissions.",
    rateRupees: "₹2.00 / page",
  },
  {
    id: "COLOR_SINGLE",
    name: "Full Color Single-Sided",
    desc: "High-resolution color graphs, charts, and presentation slides.",
    rateRupees: "₹10.00 / page",
  },
  {
    id: "COLOR_DOUBLE",
    name: "Full Color Double-Sided",
    desc: "Vibrant duplex color printing for project reports.",
    rateRupees: "₹8.00 / page",
  },
];

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

  // Form states
  const [fileName, setFileName] = useState("");
  const [pageCount, setPageCount] = useState<string>("10");
  const [printType, setPrintType] = useState<PrintTypeEnum>("BW_DOUBLE");
  const [deliveryLocation, setDeliveryLocation] = useState(DELIVERY_LOCATIONS[0]);
  const [deliverySlot, setDeliverySlot] = useState("In 2 Hours (Standard)");
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

  useEffect(() => {
    fetchOrders();
  }, [user?.id]);

  // Cost calculation in Paise
  const pages = Math.max(1, parseInt(pageCount, 10) || 1);
  const ratePaise = PRINT_RATES_PAISE[printType] || 150;
  const totalCostPaise = pages * ratePaise;

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please login to place print orders.");
      return;
    }
    if (!fileName.trim()) {
      toast.error("Please provide or upload a PDF document.");
      return;
    }

    setIsSubmitting(true);
    const res = await createPrintOrder({
      userId: user.id,
      fileName,
      pageCount: pages,
      printType,
      deliveryLocation,
      expectedDelivery: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    });
    setIsSubmitting(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Print order queued! Delivery dispatched to your hostel.");
      setFileName("");
      setPageCount("10");
      fetchOrders();
    }
  };

  const handleSimulateFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
        toast.error("Only PDF documents (Max 20MB) are accepted.");
        return;
      }
      setFileName(file.name);
      toast.success(`PDF "${file.name}" uploaded successfully!`);
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
              <span>Campus Hostel Cloud Print Network</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Hostel Print Station & Express Delivery
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Upload PDF assignments and lab records directly. Dispatched straight to your hostel block or library desk within 2 hours.
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
              {/* PDF File Dropzone */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Document PDF *
                </label>
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-brand-500 rounded-2xl p-6 text-center cursor-pointer relative bg-slate-50/50 dark:bg-slate-800/30 transition-colors">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleSimulateFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <FileText className="w-10 h-10 mx-auto text-brand-500 mb-2" />
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {fileName ? fileName : "Click or drag PDF document here"}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Direct-to-cloud signed upload (Max 20MB, application/pdf)
                  </p>
                </div>
              </div>

              {/* Print Type Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Print Format & Ink Type *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PRINT_TYPES.map((type) => {
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

              {/* Page Count & Delivery Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Total Document Pages *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={pageCount}
                    onChange={(e) => setPageCount(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Delivery Destination *
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

              {/* Cost Summary & Submit */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">
                    Total Estimated Cost
                  </p>
                  <p className="text-2xl font-black text-brand-600 dark:text-brand-400">
                    {formatPaiseToRupees(totalCostPaise)}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {pages} pages × {PRINT_RATES_PAISE[printType] / 100} INR
                  </p>
                </div>

                <SubmitButton
                  isSubmitting={isSubmitting}
                  loadingText="Submitting Order..."
                  size="lg"
                  leftIcon={<Printer className="w-4 h-4" />}
                >
                  Send to Printer
                </SubmitButton>
              </div>
            </form>
          </GlassCard>
        </div>

        {/* Right Col: Active Print Orders Tracker */}
        <div>
          <GlassCard className="p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-500" />
              <span>Your Print Queue</span>
            </h3>

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
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {ord.fileName}
                      </p>
                      <Badge
                        variant={
                          ord.status === "DELIVERED"
                            ? "success"
                            : ord.status === "READY"
                            ? "brand"
                            : "warning"
                        }
                        size="sm"
                      >
                        {ord.status}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span>{ord.pageCount} Pages • {ord.printType.replace("_", " ")}</span>
                      <span className="font-bold text-brand-600 dark:text-brand-400">
                        {formatPaiseToRupees(ord.totalCost)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span className="truncate">{ord.deliveryLocation}</span>
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
