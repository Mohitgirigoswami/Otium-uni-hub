"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@/components/providers/UserContext";
import {
  getAllPrintOrdersAdmin,
  updatePrintOrderStatus,
  getAdminDownloadUrl,
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
} from "lucide-react";

export default function AdminPrintQueuePage() {
  const { user } = useUser();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [downloadLoadingId, setDownloadLoadingId] = useState<string | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  const fetchOrders = async () => {
    if (!user) return;
    setLoading(true);
    const res = await getAllPrintOrdersAdmin(user.id);
    if (res.success && res.data) {
      setOrders(res.data);
    } else {
      toast.error(res.error || "Failed to load print orders.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, [user]);

  const handleUpdateStatus = async (orderId: string, newStatus: any) => {
    if (!user) return;
    setStatusUpdatingId(orderId);
    const res = await updatePrintOrderStatus({
      orderId,
      status: newStatus,
      adminUserId: user.id,
    });
    setStatusUpdatingId(null);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(`Order status updated to "${newStatus.replace("_", " ")}"`);
      fetchOrders();
    }
  };

  const handleAdminDownload = async (order: any) => {
    if (!user) return;
    if (!order.fileUrl && !order.fileName) {
      toast.error("No document file attached to this print order.");
      return;
    }

    setDownloadLoadingId(order.id);
    const res = await getAdminDownloadUrl({
      filePathOrUrl: order.fileUrl || order.fileName,
      adminUserId: user.id,
    });
    setDownloadLoadingId(null);

    if (res.success && res.data?.signedUrl) {
      toast.success("Generated 60-second secure print token! Opening document...");
      window.open(res.data.signedUrl, "_blank");
    } else {
      toast.error(res.error || "Failed to generate document print URL.");
    }
  };

  // Filtered orders
  const filteredOrders = orders.filter((ord) => {
    const matchesStatus =
      statusFilter === "ALL" || ord.status === statusFilter;
    const matchesSearch =
      searchQuery === "" ||
      ord.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ord.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ord.deliveryLocation.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
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
            <span>Print Fulfillment Operator Hub</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Dispatch, fulfill, and monitor hostel print jobs. Secure 60-second signed document print access.
          </p>
        </div>

        <Button
          onClick={fetchOrders}
          variant="outline"
          size="sm"
          leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />}
        >
          Refresh Queue
        </Button>
      </div>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <GlassCard className="p-4 border-amber-500/20">
          <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            Pending Queue
          </p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {submittedCount}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Awaiting print pickup</p>
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
          <p className="text-[10px] text-slate-400 mt-0.5">Dispatched to hostels</p>
        </GlassCard>

        <GlassCard className="p-4 border-emerald-500/20">
          <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            Completed Orders
          </p>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {completedCount}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Delivered to students</p>
        </GlassCard>
      </div>

      {/* Filter and Search Bar */}
      <GlassCard className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {["ALL", "SUBMITTED", "PRINTING", "OUT_FOR_DELIVERY", "COMPLETED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === st
                  ? "bg-amber-600 text-white shadow-md"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {st.replace("_", " ")}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search document or student..."
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
                <th className="py-3 px-4">Student Details</th>
                <th className="py-3 px-4">Document & Specs</th>
                <th className="py-3 px-4">Delivery Location</th>
                <th className="py-3 px-4">Cost</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Operator Actions</th>
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
                filteredOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-100/40 dark:hover:bg-slate-800/30 transition-colors">
                    {/* Student */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={
                            ord.user?.image ||
                            "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&auto=format&fit=crop&q=80"
                          }
                          alt={ord.user?.name || "Student"}
                          className="w-8 h-8 rounded-full object-cover bg-slate-800"
                        />
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">
                            {ord.user?.name || "Anonymous Student"}
                          </p>
                          <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-2.5 h-2.5" />
                            <span>{ord.user?.phone || "+91 98765 00000"}</span>
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Document */}
                    <td className="py-3.5 px-4">
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px]" title={ord.fileName}>
                          {ord.fileName}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                          <span className="font-semibold text-amber-600 dark:text-amber-400">
                            {ord.pageCount} Pages
                          </span>
                          <span>•</span>
                          <span>{ord.printType.replace("_", " ")}</span>
                        </div>
                      </div>
                    </td>

                    {/* Location */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-start gap-1.5 text-slate-700 dark:text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">{ord.deliveryLocation}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Ordered: {formatDate(ord.createdAt)}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Cost */}
                    <td className="py-3.5 px-4 font-black text-brand-600 dark:text-brand-400">
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
                            : "success"
                        }
                        size="sm"
                      >
                        {ord.status.replace("_", " ")}
                      </Badge>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right space-x-2">
                      {/* Secure 1-Min Download Button */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAdminDownload(ord)}
                        disabled={downloadLoadingId === ord.id}
                        className="text-xs"
                        leftIcon={<Download className="w-3.5 h-3.5 text-amber-500" />}
                      >
                        {downloadLoadingId === ord.id ? "Signing..." : "Print PDF (60s)"}
                      </Button>

                      {/* Status Flow Buttons */}
                      {ord.status === "SUBMITTED" && (
                        <Button
                          size="sm"
                          onClick={() => handleUpdateStatus(ord.id, "PRINTING")}
                          disabled={statusUpdatingId === ord.id}
                          className="bg-blue-600 hover:bg-blue-500 text-xs"
                          leftIcon={<Printer className="w-3.5 h-3.5" />}
                        >
                          Print
                        </Button>
                      )}

                      {ord.status === "PRINTING" && (
                        <Button
                          size="sm"
                          onClick={() => handleUpdateStatus(ord.id, "OUT_FOR_DELIVERY")}
                          disabled={statusUpdatingId === ord.id}
                          className="bg-purple-600 hover:bg-purple-500 text-xs"
                          leftIcon={<Truck className="w-3.5 h-3.5" />}
                        >
                          Dispatch
                        </Button>
                      )}

                      {ord.status === "OUT_FOR_DELIVERY" && (
                        <Button
                          size="sm"
                          onClick={() => handleUpdateStatus(ord.id, "COMPLETED")}
                          disabled={statusUpdatingId === ord.id}
                          className="bg-emerald-600 hover:bg-emerald-500 text-xs"
                          leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                        >
                          Delivered
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
