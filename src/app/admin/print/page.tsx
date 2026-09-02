"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@/components/providers/UserContext";
import {
  getAllPrintOrdersAdmin,
  updatePrintOrderStatus,
  getAdminDownloadUrl,
  deletePrintOrderPdf,
  getPrintSettingsAdmin,
  updatePrintRatesAction,
} from "@/actions/admin.actions";
import { formatPaiseToRupees, formatDate } from "@/lib/utils";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import {
  Printer,
  FileText,
  Download,
  Clock,
  MapPin,
  CheckCircle2,
  Truck,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldCheck,
  User,
  Phone,
  Settings,
  IndianRupee,
  Sparkles,
  Copy,
  XCircle,
  AlertCircle,
  Eye,
  X,
  MessageSquare,
  Trash2,
} from "lucide-react";

export default function AdminPrintQueuePage() {
  const { user } = useUser();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [downloadLoadingId, setDownloadLoadingId] = useState<string | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewPdfName, setPreviewPdfName] = useState<string>("");

  // Rejection Modal State
  const [rejectingOrderId, setRejectingOrderId] = useState<string | null>(null);
  const [rejectingOrderName, setRejectingOrderName] = useState<string>("");
  const [rejectionReason, setRejectionReason] = useState<string>("Invalid or unverified UPI transaction UTR.");

  // Dynamic Pricing Settings Form
  const [singleSidedRupees, setSingleSidedRupees] = useState<string>("2.50");
  const [doubleSidedRupees, setDoubleSidedRupees] = useState<string>("2.00");
  const [savingRates, setSavingRates] = useState(false);
  const [loadingRates, setLoadingRates] = useState(true);

  // Delivery Slot Batch Filter
  const [slotFilter, setSlotFilter] = useState<"ALL" | "MORNING" | "LUNCH">("ALL");

  // PDF Deletion State
  const [deletingPdfId, setDeletingPdfId] = useState<string | null>(null);

  const fetchOrders = async () => {
    if (!user?.id) return;
    setLoading(true);
    const res = await getAllPrintOrdersAdmin(user.id);
    if (res?.success && res.data) {
      setOrders(res.data);
    } else {
      toast.error(res?.error || "Failed to load print orders.");
    }
    setLoading(false);
  };

  const fetchRates = async () => {
    if (!user?.id) return;
    setLoadingRates(true);
    const res = await getPrintSettingsAdmin(user.id);
    if (res?.success && res.data) {
      setSingleSidedRupees(res.data.singleSidedRupees.toFixed(2));
      setDoubleSidedRupees(res.data.doubleSidedRupees.toFixed(2));
    }
    setLoadingRates(false);
  };

  useEffect(() => {
    if (user?.id) {
      fetchOrders();
      fetchRates();
    }
  }, [user?.id]);

  const handleUpdateRates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    const single = parseFloat(singleSidedRupees);
    const double = parseFloat(doubleSidedRupees);

    if (isNaN(single) || single <= 0 || isNaN(double) || double <= 0) {
      toast.error("Please enter valid rates in Rupees.");
      return;
    }

    setSavingRates(true);
    const res = await updatePrintRatesAction({
      singleSidedRupees: single,
      doubleSidedRupees: double,
      adminUserId: user.id,
    });
    setSavingRates(false);

    if (!res?.success || res?.error) {
      toast.error(res?.error || "Failed to update print rates.");
    } else {
      toast.success(
        `Print rates updated! Single: ₹${single.toFixed(2)}/pg, Double: ₹${double.toFixed(2)}/pg`
      );
      fetchRates();
    }
  };

  const handleUpdateStatus = async (
    orderId: string,
    newStatus: any,
    reason?: string
  ) => {
    if (!user?.id) return;
    setStatusUpdatingId(orderId);
    const res = await updatePrintOrderStatus({
      orderId,
      status: newStatus,
      adminUserId: user.id,
      rejectionReason: reason,
    });
    setStatusUpdatingId(null);

    if (!res?.success || res?.error) {
      toast.error(res?.error || "Failed to update order status.");
    } else {
      toast.success(`Order status updated to "${newStatus.replace(/_/g, " ")}"`);
      if (newStatus === "REJECTED") {
        setRejectingOrderId(null);
        setRejectionReason("Invalid or unverified UPI transaction UTR.");
      }
      fetchOrders();
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const notifyStudent = (
    phone: string,
    orderId: string,
    name: string,
    totalPaise: number
  ) => {
    const cleanPhone = phone.replace(/\D/g, "").slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10) {
      toast.error("No valid 10-digit mobile number on record for this student.");
      return;
    }
    const totalRupees = (totalPaise / 100).toFixed(2);
    const studentName = name || "Student";
    const shortId = orderId.slice(-6).toUpperCase();
    const message = `Hey ${studentName}! 🚀 Your Otium print order #${shortId} is ready for delivery. Please keep ₹${totalRupees} ready.`;
    const encodedMessage = encodeURIComponent(message);
    const url = `https://wa.me/91${cleanPhone}?text=${encodedMessage}`;
    window.open(url, "_blank");
  };

  const handleDeletePdf = async (
    orderId: string,
    fileUrl?: string | null,
    driveFileId?: string | null
  ) => {
    if (!user?.id) return;
    const confirmed = window.confirm(
      "⚠️ Are you sure? This will permanently delete the PDF from storage."
    );
    if (!confirmed) return;

    setDeletingPdfId(orderId);
    const res = await deletePrintOrderPdf({
      orderId,
      adminUserId: user.id,
      fileUrl,
      driveFileId,
    });
    setDeletingPdfId(null);

    if (res?.success) {
      toast.success("PDF deleted from storage successfully.");
      fetchOrders();
    } else {
      toast.error(res?.error || "Failed to delete PDF from storage.");
    }
  };

  // Filtered orders
  const filteredOrders = orders.filter((ord) => {
    const matchesStatus =
      statusFilter === "ALL" || ord.status === statusFilter;
    const matchesSearch =
      searchQuery === "" ||
      ord.fileName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ord.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ord.deliveryLocation?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ord.utr?.includes(searchQuery);
    const matchesSlot =
      slotFilter === "ALL" ||
      (slotFilter === "MORNING" && ord.deliverySlot?.toLowerCase().includes("morning")) ||
      (slotFilter === "LUNCH" && ord.deliverySlot?.toLowerCase().includes("lunch"));
    return matchesStatus && matchesSearch && matchesSlot;
  });

  // Metrics
  const submittedCount = orders.filter((o) => o.status === "SUBMITTED").length;
  const printingCount = orders.filter((o) => o.status === "PRINTING").length;
  const outForDeliveryCount = orders.filter(
    (o) => o.status === "OUT_FOR_DELIVERY"
  ).length;
  const completedCount = orders.filter(
    (o) => o.status === "DELIVERED" || o.status === "COMPLETED"
  ).length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Printer className="w-7 h-7 text-amber-500" />
            <span>Campus Print Fulfillment & Verification Hub</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Verify UPI payment UTRs, open Google Drive documents, and manage express print dispatch anywhere across campus.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              fetchOrders();
              fetchRates();
            }}
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />}
          >
            Refresh Queue
          </Button>
        </div>
      </div>

      {/* Dynamic Print Pricing Control Panel */}
      <GlassCard className="p-6 border-amber-500/30">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              <Settings className="w-4 h-4" />
              <span>Dynamic Print Pricing Controls</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Campus Print Rates (Stored in Paise)
            </h2>
            <p className="text-xs text-slate-500 max-w-xl">
              Updating these rates immediately applies to all new student orders placed through the Print Station.
            </p>
          </div>

          <form onSubmit={handleUpdateRates} className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Single-Sided Rate (INR)
              </label>
              <div className="relative w-36">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">
                  ₹
                </span>
                <input
                  type="number"
                  step="0.10"
                  min="0.5"
                  required
                  value={singleSidedRupees}
                  onChange={(e) => setSingleSidedRupees(e.target.value)}
                  className="w-full pl-7 pr-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Double-Sided Rate (INR)
              </label>
              <div className="relative w-36">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">
                  ₹
                </span>
                <input
                  type="number"
                  step="0.10"
                  min="0.5"
                  required
                  value={doubleSidedRupees}
                  onChange={(e) => setDoubleSidedRupees(e.target.value)}
                  className="w-full pl-7 pr-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={savingRates || loadingRates}
              size="sm"
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold h-[34px]"
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              {savingRates ? "Updating..." : "Save Rates"}
            </Button>
          </form>
        </div>
      </GlassCard>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <GlassCard className="p-4 border-amber-500/20">
          <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            Pending Queue
          </p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {submittedCount}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Awaiting UTR check & print</p>
        </GlassCard>

        <GlassCard className="p-4 border-blue-500/20">
          <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            Currently Printing
          </p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {printingCount}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">On printer trays</p>
        </GlassCard>

        <GlassCard className="p-4 border-purple-500/20">
          <p className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
            Out for Delivery
          </p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {outForDeliveryCount}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Dispatched to campus</p>
        </GlassCard>

        <GlassCard className="p-4 border-emerald-500/20">
          <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            Delivered / Completed
          </p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {completedCount}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Successfully handed over</p>
        </GlassCard>
      </div>

      {/* Batch Delivery Slot Filter Toggle */}
      <GlassCard className="p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <Clock className="w-4 h-4 text-teal-500" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Batch Print by Slot:</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {([
              { key: "ALL",     label: "All Slots",     emoji: "📋" },
              { key: "MORNING", label: "Morning Drop",   emoji: "🌅", time: "8:30–9:00 AM" },
              { key: "LUNCH",   label: "Lunch Drop",     emoji: "🥪", time: "12:50–1:30 PM" },
            ] as const).map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setSlotFilter(s.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
                  slotFilter === s.key
                    ? "bg-teal-600 border-teal-600 text-white shadow-md shadow-teal-500/25"
                    : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-teal-400 hover:text-teal-400"
                }`}
              >
                <span>{s.emoji}</span>
                <span>{s.label}</span>
                {"time" in s && <span className="opacity-70">({s.time})</span>}
              </button>
            ))}
          </div>
          {slotFilter !== "ALL" && (
            <span className="ml-auto text-[11px] text-slate-400">
              Showing {filteredOrders.length} order{filteredOrders.length !== 1 ? "s" : ""} for this slot
            </span>
          )}
        </div>
      </GlassCard>

      {/* Filter and Search Bar */}
      <GlassCard className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {["ALL", "SUBMITTED", "PRINTING", "OUT_FOR_DELIVERY", "COMPLETED", "REJECTED", "ISSUE_REPORTED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === st
                  ? "bg-amber-600 text-white shadow-md"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {st.replace(/_/g, " ")}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search student, UTR, doc name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </GlassCard>

      {/* Print Orders Table */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/60 uppercase font-bold text-slate-400">
              <tr>
                <th className="py-3.5 px-4">Student</th>
                <th className="py-3.5 px-4">Document & Print File</th>
                <th className="py-3.5 px-4">Delivery & UTR</th>
                <th className="py-3.5 px-4">Cost</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Fulfillment Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
                      <span>Loading print order queue...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No print orders found matching the filter.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => {
                  const extractedUtr =
                    ord.utr ||
                    ord.deliveryLocation?.match(/UTR:\s*([0-9A-Za-z]+)/)?.[1] ||
                    null;

                  const documentViewLink =
                    ord.fileUrl ||
                    (ord.driveFileId
                      ? `https://drive.google.com/file/d/${ord.driveFileId}/view?usp=sharing`
                      : null);

                  return (
                    <tr
                      key={ord.id}
                      className="hover:bg-slate-100/40 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      {/* Student Details */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={
                              ord.user?.image ||
                              `https://api.dicebear.com/9.x/bottts/svg?seed=${ord.user?.id || "Student"}`
                            }
                            alt={ord.user?.name || "Student"}
                            className="w-8 h-8 rounded-full object-cover bg-slate-800 shrink-0"
                          />
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">
                              {ord.user?.name || "Student"}
                            </p>
                            <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Phone className="w-2.5 h-2.5" />
                              <span>{ord.user?.phone || "+91 98765 00000"}</span>
                            </p>
                            {ord.user?.college?.name && (
                              <p className="text-[9px] text-amber-600 dark:text-amber-400 font-semibold truncate max-w-[140px]">
                                {ord.user.college.name}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Document & Print Viewer */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1.5">
                          <p
                            className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px]"
                            title={ord.fileName}
                          >
                            {ord.fileName}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            <span className="font-semibold text-amber-600 dark:text-amber-400">
                              {ord.pageCount} Pgs {ord.copies > 1 ? `(${ord.copies}x)` : ""}
                            </span>
                            <span>•</span>
                            <span>{ord.printType?.replace(/_/g, " ")}</span>
                          </div>

                          {/* Direct Document View & Print Buttons or Deleted State */}
                          {documentViewLink ? (
                            <div className="space-y-1.5 pt-0.5">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setPreviewPdfUrl(documentViewLink);
                                    setPreviewPdfName(ord.fileName);
                                  }}
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>View & Print</span>
                                </button>
                                <span className="text-slate-500">•</span>
                                <a
                                  href={documentViewLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-slate-400 hover:text-slate-200 inline-flex items-center gap-0.5 text-[10px]"
                                  title="Open in new tab"
                                >
                                  <span>Tab</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              </div>

                              {/* Prominent Red Danger Button to Delete PDF */}
                              <div>
                                <button
                                  type="button"
                                  onClick={() => handleDeletePdf(ord.id, ord.fileUrl, ord.driveFileId)}
                                  disabled={deletingPdfId === ord.id}
                                  className="inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-md px-3 py-1.5 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 cursor-pointer"
                                  title="Permanently delete PDF from storage"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>{deletingPdfId === ord.id ? "Deleting..." : "🗑️ Delete PDF"}</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-500 font-semibold italic border border-slate-200 dark:border-slate-700 mt-1">
                              <Trash2 className="w-3 h-3 text-slate-400" />
                              <span>PDF Deleted from Storage</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Location & Payment UTR Verification */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1 text-slate-700 dark:text-slate-300">
                          <div className="flex items-start gap-1">
                            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                            <span className="font-semibold text-[11px]">
                              {ord.deliveryLocation}
                            </span>
                          </div>

                          {/* UTR Verification Badge */}
                          {extractedUtr && (
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-mono text-[10px] font-bold">
                              <span>UTR: {extractedUtr}</span>
                              <button
                                onClick={() => copyToClipboard(extractedUtr, "UTR")}
                                className="hover:text-amber-300 ml-0.5"
                                title="Copy UTR"
                              >
                                <Copy className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          )}

                          <p className="text-[10px] text-slate-400">
                            Ordered: {formatDate(ord.createdAt)}
                          </p>

                          {/* Delivery Slot Badge */}
                          {ord.deliverySlot && (
                            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-bold mt-0.5 ${
                              ord.deliverySlot.toLowerCase().includes("morning")
                                ? "bg-amber-500/10 border-amber-400/40 text-amber-600 dark:text-amber-400"
                                : "bg-teal-500/10 border-teal-400/40 text-teal-600 dark:text-teal-400"
                            }`}>
                              <span>{ord.deliverySlot.toLowerCase().includes("morning") ? "🌅" : "🥪"}</span>
                              <span>{ord.deliverySlot}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Cost */}
                      <td className="py-3.5 px-4 font-black text-brand-600 dark:text-brand-400 text-sm">
                        {formatPaiseToRupees(ord.totalCost)}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={
                            ord.status === "SUBMITTED"
                              ? "warning"
                              : ord.status === "PRINTING"
                              ? "brand"
                              : ord.status === "OUT_FOR_DELIVERY"
                              ? "info"
                              : ord.status === "REJECTED" || ord.status === "ISSUE_REPORTED"
                              ? "danger"
                              : "success"
                          }
                          size="sm"
                        >
                          {ord.status.replace(/_/g, " ")}
                        </Badge>
                      </td>

                      {/* Interactive Fulfillment Actions */}
                      <td className="py-3.5 px-4 text-right">
                        {(() => {
                          const studentPhone = ord.user?.phone || ord.deliveryLocation?.match(/Phone:\s*(\d{10})/)?.[1] || null;
                          return (
                            <div className="flex flex-col items-end gap-2">
                              {/* Primary Lifecycle State Actions */}
                              <div className="inline-flex items-center gap-1.5">
                                {/* 1. Submitted State -> Verify & Print OR Reject */}
                                {ord.status === "SUBMITTED" && (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => handleUpdateStatus(ord.id, "PRINTING")}
                                      disabled={statusUpdatingId === ord.id}
                                      className="bg-blue-600 hover:bg-blue-500 text-xs font-bold"
                                      leftIcon={<Printer className="w-3.5 h-3.5" />}
                                    >
                                      Verify & Print
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="danger"
                                      onClick={() => {
                                        setRejectingOrderId(ord.id);
                                        setRejectingOrderName(ord.fileName);
                                      }}
                                      disabled={statusUpdatingId === ord.id}
                                      className="text-xs font-bold"
                                      leftIcon={<XCircle className="w-3.5 h-3.5" />}
                                    >
                                      Reject
                                    </Button>
                                  </>
                                )}

                                {/* 2. Printing State -> Mark Dispatched OR Reject */}
                                {ord.status === "PRINTING" && (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => handleUpdateStatus(ord.id, "OUT_FOR_DELIVERY")}
                                      disabled={statusUpdatingId === ord.id}
                                      className="bg-purple-600 hover:bg-purple-500 text-xs font-bold"
                                      leftIcon={<Truck className="w-3.5 h-3.5" />}
                                    >
                                      Dispatch
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setRejectingOrderId(ord.id);
                                        setRejectingOrderName(ord.fileName);
                                      }}
                                      disabled={statusUpdatingId === ord.id}
                                      className="text-rose-500 hover:bg-rose-500/10 text-xs font-bold"
                                      leftIcon={<XCircle className="w-3.5 h-3.5" />}
                                    >
                                      Reject
                                    </Button>
                                  </>
                                )}

                                {/* 3. Out for Delivery -> Mark Delivered */}
                                {ord.status === "OUT_FOR_DELIVERY" && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleUpdateStatus(ord.id, "COMPLETED")}
                                    disabled={statusUpdatingId === ord.id}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-xs font-bold"
                                    leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                                  >
                                    Mark Delivered
                                  </Button>
                                )}

                                {/* 4. Completed State */}
                                {(ord.status === "COMPLETED" || ord.status === "DELIVERED") && (
                                  <span className="text-[11px] font-bold text-emerald-500 inline-flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Fulfilled</span>
                                  </span>
                                )}

                                {/* 5. Rejected State */}
                                {ord.status === "REJECTED" && (
                                  <span className="text-[11px] font-bold text-rose-500 inline-flex items-center gap-1">
                                    <XCircle className="w-3.5 h-3.5" />
                                    <span>Rejected</span>
                                  </span>
                                )}

                                {/* 6. Issue Reported State */}
                                {ord.status === "ISSUE_REPORTED" && (
                                  <span className="text-[11px] font-bold text-rose-500 inline-flex items-center gap-1 bg-rose-500/10 px-2 py-0.5 rounded-lg border border-rose-500/30">
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    <span>Issue Reported</span>
                                  </span>
                                )}
                              </div>

                              {/* WhatsApp Deep Link Notification & Issue Flagging */}
                              <div className="inline-flex items-center gap-1.5">
                                {studentPhone ? (
                                  <button
                                    type="button"
                                    onClick={() => notifyStudent(studentPhone, ord.id, ord.user?.name, ord.totalCost)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#25D366] hover:bg-[#20ba5c] text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
                                    title={`Send WhatsApp message to +91 ${studentPhone}`}
                                  >
                                    <MessageSquare className="w-3 h-3" />
                                    <span>Notify via WhatsApp</span>
                                  </button>
                                ) : (
                                  <span
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-400 font-bold text-xs cursor-not-allowed opacity-75"
                                    title="No phone number provided on profile or checkout"
                                  >
                                    <Phone className="w-3 h-3" />
                                    <span>No Phone</span>
                                  </span>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleUpdateStatus(ord.id, "ISSUE_REPORTED", "Issue flagged by campus operator")}
                                  disabled={statusUpdatingId === ord.id || ord.status === "ISSUE_REPORTED"}
                                  className="px-2 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
                                  title="Flag issue with this print order"
                                >
                                  Flag Issue
                                </button>
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Embedded PDF Viewer Modal for Instant Ctrl+P Printing */}
      {previewPdfUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
                  <Printer className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white truncate max-w-md">
                    {previewPdfName || "Document Viewer"}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Instant Print Preview • Use Ctrl+P or the print button below
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    const iframe = document.getElementById("admin-pdf-iframe") as HTMLIFrameElement;
                    if (iframe?.contentWindow) {
                      iframe.contentWindow.print();
                    } else {
                      window.open(previewPdfUrl, "_blank");
                    }
                  }}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs"
                  leftIcon={<Printer className="w-3.5 h-3.5" />}
                >
                  Print Document (Ctrl+P)
                </Button>

                <a
                  href={previewPdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors inline-flex items-center gap-1"
                >
                  <span>Open Tab</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                {/* Delete PDF Button in Modal */}
                {(() => {
                  const activeOrder = orders.find(
                    (o) =>
                      o.fileName === previewPdfName ||
                      o.fileUrl === previewPdfUrl ||
                      (o.driveFileId && previewPdfUrl?.includes(o.driveFileId))
                  );
                  if (!activeOrder) return null;
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        handleDeletePdf(activeOrder.id, activeOrder.fileUrl, activeOrder.driveFileId);
                        setPreviewPdfUrl(null);
                      }}
                      disabled={deletingPdfId === activeOrder.id}
                      className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors inline-flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{deletingPdfId === activeOrder.id ? "Deleting..." : "🗑️ Delete PDF"}</span>
                    </button>
                  );
                })()}

                <button
                  onClick={() => setPreviewPdfUrl(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Close preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Iframe Preview Container */}
            <div className="flex-1 bg-slate-950 p-3 relative flex flex-col min-h-0 overflow-hidden">
              <iframe
                id="admin-pdf-iframe"
                src={previewPdfUrl}
                className="w-full flex-1 rounded-xl border border-slate-800 bg-white"
                title="PDF Preview"
              />

              {/* PDF Viewer Fallback Bar (Visible for mobile or blocked iframes) */}
              <div className="mt-3 p-3 rounded-xl bg-slate-800/90 border border-slate-700/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                <p className="text-xs text-slate-300 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>Preview loading issues on mobile? Open raw PDF directly in a new tab:</span>
                </p>
                <a
                  href={previewPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all inline-flex items-center gap-2 shadow-lg shadow-teal-500/20 shrink-0"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open PDF in New Tab</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Prompt Modal with Transactional Email Notice */}
      {rejectingOrderId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl space-y-4 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Reject Print Order</h3>
                  <p className="text-[11px] text-slate-400 truncate max-w-xs">{rejectingOrderName}</p>
                </div>
              </div>
              <button
                onClick={() => setRejectingOrderId(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs leading-relaxed">
              A branded email notification will be automatically sent to the student detailing this rejection reason and dispute instructions.
            </div>

            {/* Quick Preset Chips */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Quick Reason Presets
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Invalid or unverified UPI transaction UTR.",
                  "Payment not received. Please provide receipt screenshot.",
                  "Corrupt or unreadable PDF document.",
                  "Wrong page count or print options selected.",
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setRejectionReason(preset)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border ${
                      rejectionReason === preset
                        ? "bg-rose-500/20 border-rose-500 text-rose-300"
                        : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Reason Textarea */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Custom Explanation / Reason
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter reason for rejection..."
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setRejectingOrderId(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="danger"
                disabled={statusUpdatingId === rejectingOrderId || !rejectionReason.trim()}
                onClick={() => handleUpdateStatus(rejectingOrderId, "REJECTED", rejectionReason)}
                className="text-xs font-bold"
                leftIcon={<XCircle className="w-4 h-4" />}
              >
                {statusUpdatingId === rejectingOrderId ? "Rejecting..." : "Send Rejection & Update"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
