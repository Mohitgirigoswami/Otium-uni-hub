"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@/components/providers/UserContext";
import {
  getAllPrintOrdersAdmin,
  updatePrintOrderStatus,
  deletePrintOrderPdf,
  pruneOrphanedStorageAction,
  getPrintSettingsAdmin,
  updatePrintRatesAction,
} from "@/actions/admin.actions";
import { formatPaiseToRupees, formatDate } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { toast } from "sonner";
import {
  Printer,
  FileText,
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
  Copy,
  XCircle,
  AlertCircle,
  Eye,
  X,
  MessageSquare,
  Trash2,
  Sunrise,
  Utensils,
  ChevronRight,
  Sparkles,
} from "lucide-react";

export default function AdminPrintQueuePage() {
  const { user } = useUser();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewPdfName, setPreviewPdfName] = useState<string>("");

  // Rejection Modal State
  const [rejectingOrderId, setRejectingOrderId] = useState<string | null>(null);
  const [rejectingOrderName, setRejectingOrderName] = useState<string>("");
  const [rejectionReason, setRejectionReason] = useState<string>(
    "Invalid or unverified UPI transaction UTR."
  );

  // Dynamic Pricing Settings Form
  const [singleSidedRupees, setSingleSidedRupees] = useState<string>("2.50");
  const [doubleSidedRupees, setDoubleSidedRupees] = useState<string>("2.00");
  const [savingRates, setSavingRates] = useState(false);
  const [loadingRates, setLoadingRates] = useState(true);

  // Delivery Slot Batch Filter
  const [slotFilter, setSlotFilter] = useState<"ALL" | "MORNING" | "LUNCH">("ALL");

  // PDF Deletion State
  const [deletingPdfId, setDeletingPdfId] = useState<string | null>(null);
  const [isPruning, setIsPruning] = useState(false);

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
        `Print rates updated: Single ₹${single.toFixed(2)}/pg, Double ₹${double.toFixed(2)}/pg`
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
    toast.success(`${label} copied to clipboard`);
  };

  const notifyStudent = (
    phone: string,
    orderId: string,
    name?: string,
    fileName?: string,
    deliverySlot?: string | null
  ) => {
    const cleanPhone = phone.replace(/\D/g, "").slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10) {
      toast.error("No valid 10-digit mobile number on record for this student.");
      return;
    }
    const studentName = name || "Student";
    const shortId = orderId.slice(-6).toUpperCase();
    const docInfo = fileName ? ` for "${fileName}"` : "";
    const slotInfo = deliverySlot ? ` (${deliverySlot})` : "";
    const message = `*Otium Print Station*\n\nHey ${studentName}! Your print order *#${shortId}*${docInfo} is printed and ready${slotInfo}.\n\nOur runner is dispatching it to your campus location right now. See you soon!`;
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
      "Are you sure? This will permanently delete the PDF from storage."
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

  const handlePruneStorage = async () => {
    if (!user?.id) return;
    const confirmed = window.confirm(
      "Prune Orphaned PDFs: This will scan storage and delete uploaded files older than 1 hour that were never submitted as an order. Proceed?"
    );
    if (!confirmed) return;

    setIsPruning(true);
    const res = await pruneOrphanedStorageAction(user.id);
    setIsPruning(false);

    if (res?.success && res.data) {
      toast.success(res.data.message || `Pruned ${res.data.pdfsDeleted} orphaned file(s).`);
      fetchOrders();
    } else {
      toast.error(res?.error || "Failed to prune orphaned storage.");
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
  const outForDeliveryCount = orders.filter((o) => o.status === "OUT_FOR_DELIVERY").length;
  const completedCount = orders.filter(
    (o) => o.status === "DELIVERED" || o.status === "COMPLETED"
  ).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary text-foreground text-xs font-semibold border border-border">
            <Printer className="w-3.5 h-3.5 text-primary" />
            <span>Fulfillment Hub</span>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Campus Print Queue & Dispatch
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Verify UPI payment UTRs, inspect uploaded documents, and track runner dispatches across campus.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={handlePruneStorage}
            variant="outline"
            size="sm"
            disabled={isPruning}
            leftIcon={<Trash2 className={`w-3.5 h-3.5 ${isPruning ? "animate-spin" : ""}`} />}
          >
            {isPruning ? "Pruning..." : "Prune Storage"}
          </Button>

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
      <Card className="p-5 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider">
              <Settings className="w-3.5 h-3.5" />
              <span>Campus Rate Controls</span>
            </div>
            <h2 className="font-heading text-base font-bold text-foreground">
              Dynamic Print Pricing
            </h2>
            <p className="text-xs text-muted-foreground max-w-xl">
              Updating per-page rates immediately applies to all future student print orders.
            </p>
          </div>

          <form onSubmit={handleUpdateRates} className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Single-Sided Rate (INR)
              </label>
              <div className="relative w-36">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold z-10">
                  ₹
                </span>
                <Input
                  type="number"
                  step="0.10"
                  min="0.5"
                  required
                  value={singleSidedRupees}
                  onChange={(e) => setSingleSidedRupees(e.target.value)}
                  className="pl-7 pr-3 h-9 text-xs font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Double-Sided Rate (INR)
              </label>
              <div className="relative w-36">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-bold z-10">
                  ₹
                </span>
                <Input
                  type="number"
                  step="0.10"
                  min="0.5"
                  required
                  value={doubleSidedRupees}
                  onChange={(e) => setDoubleSidedRupees(e.target.value)}
                  className="pl-7 pr-3 h-9 text-xs font-bold"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={savingRates || loadingRates}
              size="sm"
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              {savingRates ? "Updating..." : "Save Rates"}
            </Button>
          </form>
        </div>
      </Card>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Pending Verification
            </span>
            <Clock className="w-4 h-4 text-warning" />
          </div>
          <p className="text-2xl font-black text-foreground font-heading">
            {submittedCount}
          </p>
          <p className="text-[10px] text-muted-foreground">Awaiting payment UTR check</p>
        </Card>

        <Card className="p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              In Print Queue
            </span>
            <Printer className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-black text-foreground font-heading">
            {printingCount}
          </p>
          <p className="text-[10px] text-muted-foreground">Active on printer trays</p>
        </Card>

        <Card className="p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Out for Delivery
            </span>
            <Truck className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-black text-foreground font-heading">
            {outForDeliveryCount}
          </p>
          <p className="text-[10px] text-muted-foreground">Runner dispatches in transit</p>
        </Card>

        <Card className="p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Fulfilled
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-foreground font-heading">
            {completedCount}
          </p>
          <p className="text-[10px] text-muted-foreground">Successfully handed over</p>
        </Card>
      </div>

      {/* Batch Delivery Slot & Filter Toolbar */}
      <Card className="p-4 space-y-4">
        {/* Delivery Slot Filter */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pb-3 border-b border-border">
          <div className="flex items-center gap-2 shrink-0">
            <Clock className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">
              Batch by Slot:
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { key: "ALL", label: "All Slots", icon: Clock },
              { key: "MORNING", label: "Morning Drop (8:30–9:00 AM)", icon: Sunrise },
              { key: "LUNCH", label: "Lunch Drop (12:50–1:30 PM)", icon: Utensils },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSlotFilter(s.key as any)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                    slotFilter === s.key
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{s.label}</span>
                </button>
              );
            })}
          </div>
          {slotFilter !== "ALL" && (
            <span className="ml-auto text-[11px] text-muted-foreground">
              Showing {filteredOrders.length} order{filteredOrders.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Status Filters & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              "ALL",
              "SUBMITTED",
              "PRINTING",
              "OUT_FOR_DELIVERY",
              "COMPLETED",
              "REJECTED",
              "ISSUE_REPORTED",
            ].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all whitespace-nowrap border ${
                  statusFilter === st
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                }`}
              >
                {st.replace(/_/g, " ")}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search student, UTR, document..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>
        </div>
      </Card>

      {/* Print Orders Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-secondary/70 border-b border-border uppercase font-semibold text-muted-foreground text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Document Details</th>
                <th className="py-3 px-4">Drop Location & UTR</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Fulfillment Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                      <span>Loading print queue...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    No print orders match the current filters.
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

                  const studentName = ord.user?.name || "Student";
                  const studentInitials = studentName
                    .split(" ")
                    .map((n: string) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase();

                  const studentPhone =
                    ord.user?.phone ||
                    ord.deliveryLocation?.match(/Phone:\s*(\d{10})/)?.[1] ||
                    null;

                  return (
                    <tr key={ord.id} className="hover:bg-secondary/40 transition-colors">
                      {/* Student Details */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          {ord.user?.image ? (
                            <img
                              src={ord.user.image}
                              alt={studentName}
                              className="w-8 h-8 rounded-full object-cover bg-secondary border border-border shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-secondary border border-border text-foreground font-bold text-xs flex items-center justify-center shrink-0">
                              {studentInitials}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-foreground truncate max-w-[140px]">
                              {studentName}
                            </p>
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono">
                              <Phone className="w-2.5 h-2.5" />
                              <span>{studentPhone || "No phone"}</span>
                            </p>
                            {ord.user?.college?.name && (
                              <p className="text-[9px] text-primary font-medium truncate max-w-[140px]">
                                {ord.user.college.name}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Document Details & Viewer */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1.5">
                          <p
                            className="font-heading font-bold text-foreground truncate max-w-[190px]"
                            title={ord.fileName}
                          >
                            {ord.fileName}
                          </p>
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <span className="font-semibold text-primary">
                              {ord.pageCount} Pgs {ord.copies > 1 ? `(${ord.copies}x)` : ""}
                            </span>
                            <span>•</span>
                            <span>{ord.printType?.replace(/_/g, " ")}</span>
                          </div>

                          {documentViewLink ? (
                            <div className="flex items-center gap-2 pt-0.5">
                              <button
                                onClick={() => {
                                  setPreviewPdfUrl(documentViewLink);
                                  setPreviewPdfName(ord.fileName);
                                }}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Inspect</span>
                              </button>
                              <span className="text-muted-foreground">•</span>
                              <a
                                href={documentViewLink}
                                target="_blank"
                                rel="noreferrer"
                                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5 text-[10px]"
                              >
                                <span>Tab</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                              <span className="text-muted-foreground">•</span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleDeletePdf(ord.id, ord.fileUrl, ord.driveFileId)
                                }
                                disabled={deletingPdfId === ord.id}
                                className="text-destructive hover:underline text-[10px] font-semibold inline-flex items-center gap-0.5 disabled:opacity-50"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                                <span>{deletingPdfId === ord.id ? "Deleting..." : "Delete"}</span>
                              </button>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-[9px] text-muted-foreground font-semibold italic border border-border">
                              <Trash2 className="w-2.5 h-2.5" />
                              <span>Purged from Storage</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Drop Location & UTR Verification */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1 text-foreground">
                          <div className="flex items-start gap-1">
                            <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                            <span className="font-semibold text-[11px]">
                              {ord.deliveryLocation}
                            </span>
                          </div>

                          {extractedUtr && (
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary border border-border text-foreground font-mono text-[10px] font-bold">
                              <span>UTR: {extractedUtr}</span>
                              <button
                                onClick={() => copyToClipboard(extractedUtr, "UTR")}
                                className="hover:text-primary ml-0.5"
                                title="Copy UTR"
                              >
                                <Copy className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          )}

                          <p className="text-[10px] text-muted-foreground">
                            {formatDate(ord.createdAt)}
                          </p>

                          {ord.deliverySlot && (
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary border border-border text-foreground text-[10px] font-semibold">
                              <Clock className="w-2.5 h-2.5 text-primary" />
                              <span>{ord.deliverySlot}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 font-black text-primary text-sm font-heading">
                        {formatPaiseToRupees(ord.totalCost ?? ord.totalCostPaise)}
                      </td>

                      {/* Status */}
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

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex flex-col items-end gap-1.5">
                          <div className="inline-flex items-center gap-1.5">
                            {ord.status === "SUBMITTED" && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleUpdateStatus(ord.id, "PRINTING")}
                                  disabled={statusUpdatingId === ord.id}
                                  leftIcon={<Printer className="w-3 h-3" />}
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
                                  leftIcon={<XCircle className="w-3 h-3" />}
                                >
                                  Reject
                                </Button>
                              </>
                            )}

                            {ord.status === "PRINTING" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="brand"
                                  onClick={() => handleUpdateStatus(ord.id, "OUT_FOR_DELIVERY")}
                                  disabled={statusUpdatingId === ord.id}
                                  leftIcon={<Truck className="w-3 h-3" />}
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
                                  className="text-destructive hover:bg-destructive/10"
                                >
                                  Reject
                                </Button>
                              </>
                            )}

                            {ord.status === "OUT_FOR_DELIVERY" && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleUpdateStatus(ord.id, "COMPLETED")}
                                disabled={statusUpdatingId === ord.id}
                                leftIcon={<CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                              >
                                Mark Delivered
                              </Button>
                            )}

                            {(ord.status === "COMPLETED" || ord.status === "DELIVERED") && (
                              <span className="text-[11px] font-semibold text-emerald-500 inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Fulfilled</span>
                              </span>
                            )}

                            {ord.status === "REJECTED" && (
                              <span className="text-[11px] font-semibold text-destructive inline-flex items-center gap-1">
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Rejected</span>
                              </span>
                            )}

                            {ord.status === "ISSUE_REPORTED" && (
                              <Badge variant="danger" size="sm">
                                Issue Flagged
                              </Badge>
                            )}
                          </div>

                          <div className="inline-flex items-center gap-1.5">
                            {studentPhone ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  notifyStudent(
                                    studentPhone,
                                    ord.id,
                                    ord.user?.name,
                                    ord.fileName,
                                    ord.deliverySlot
                                  )
                                }
                                leftIcon={<MessageSquare className="w-3 h-3" />}
                                className="h-7 text-[10px]"
                              >
                                WhatsApp
                              </Button>
                            ) : (
                              <span className="text-[10px] text-muted-foreground italic">
                                No phone
                              </span>
                            )}

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                handleUpdateStatus(
                                  ord.id,
                                  "ISSUE_REPORTED",
                                  "Issue flagged by campus operator"
                                )
                              }
                              disabled={statusUpdatingId === ord.id || ord.status === "ISSUE_REPORTED"}
                              className="h-7 text-[10px] text-muted-foreground hover:text-destructive"
                            >
                              Flag Issue
                            </Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Document Inspector Modal */}
      {previewPdfUrl && (
        <Modal
          isOpen={!!previewPdfUrl}
          onClose={() => setPreviewPdfUrl(null)}
          title={previewPdfName || "Document Inspector"}
          description="Document preview and print controller."
          maxWidth="2xl"
        >
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between gap-3 pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    const iframe = document.getElementById(
                      "admin-pdf-iframe"
                    ) as HTMLIFrameElement;
                    if (iframe?.contentWindow) {
                      iframe.contentWindow.print();
                    } else {
                      window.open(previewPdfUrl, "_blank");
                    }
                  }}
                  leftIcon={<Printer className="w-3.5 h-3.5" />}
                >
                  Print (Ctrl+P)
                </Button>
                <a
                  href={previewPdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded border border-border"
                >
                  <span>Open in Tab</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {(() => {
                const activeOrder = orders.find(
                  (o) =>
                    o.fileName === previewPdfName ||
                    o.fileUrl === previewPdfUrl ||
                    (o.driveFileId && previewPdfUrl?.includes(o.driveFileId))
                );
                if (!activeOrder) return null;
                return (
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      handleDeletePdf(
                        activeOrder.id,
                        activeOrder.fileUrl,
                        activeOrder.driveFileId
                      );
                      setPreviewPdfUrl(null);
                    }}
                    disabled={deletingPdfId === activeOrder.id}
                    leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                  >
                    {deletingPdfId === activeOrder.id ? "Deleting..." : "Delete File"}
                  </Button>
                );
              })()}
            </div>

            <div className="h-[65vh] w-full bg-secondary/30 rounded-lg overflow-hidden border border-border">
              <iframe
                id="admin-pdf-iframe"
                src={previewPdfUrl}
                className="w-full h-full bg-white"
                title="PDF Preview"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Order Rejection Modal */}
      {rejectingOrderId && (
        <Modal
          isOpen={!!rejectingOrderId}
          onClose={() => setRejectingOrderId(null)}
          title="Reject Print Order"
          description="Send rejection notice to student and update order queue."
          maxWidth="md"
        >
          <div className="space-y-4 pt-2">
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs leading-relaxed">
              The student will receive an automated email notice explaining why the print order was rejected.
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
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
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all border ${
                      rejectionReason === preset
                        ? "bg-destructive text-destructive-foreground border-destructive"
                        : "bg-secondary text-muted-foreground border-border hover:text-foreground"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Explanation for Student
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter rejection explanation..."
                className="w-full px-3 py-2 rounded-lg bg-secondary/50 border border-border text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setRejectingOrderId(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="danger"
                disabled={statusUpdatingId === rejectingOrderId || !rejectionReason.trim()}
                onClick={() =>
                  handleUpdateStatus(rejectingOrderId, "REJECTED", rejectionReason)
                }
                leftIcon={<XCircle className="w-3.5 h-3.5" />}
              >
                {statusUpdatingId === rejectingOrderId
                  ? "Rejecting..."
                  : "Confirm Rejection"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
