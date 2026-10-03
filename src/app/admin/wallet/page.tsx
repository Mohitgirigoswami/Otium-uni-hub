"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useUser } from "@/components/providers/UserContext";
import {
  adminGetWalletOverviewAction,
  adminApproveTopupAction,
  adminRejectTopupAction,
  WalletAdminOverviewDTO,
  WalletTopupRequestDTO,
} from "@/features/wallet";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { toast } from "sonner";
import { cn, formatDate } from "@/lib/utils";
import {
  Wallet,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  Send,
  Smartphone,
  User,
  ExternalLink,
  Sparkles,
  ArrowUpRight,
  HelpCircle,
  Filter,
  CheckCircle,
} from "lucide-react";

export default function AdminWalletPage() {
  const { user } = useUser();
  const [data, setData] = useState<WalletAdminOverviewDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);
  const [showTelegramGuide, setShowTelegramGuide] = useState(false);

  // Rejection modal
  const [rejectingRequest, setRejectingRequest] = useState<WalletTopupRequestDTO | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>(
    "Payment could not be verified in bank records (unmatched UTR)."
  );
  const [submittingReject, setSubmittingReject] = useState(false);

  // Approval modal state & custom remark
  const [approvingRequest, setApprovingRequest] = useState<WalletTopupRequestDTO | null>(null);
  const [approvalRemark, setApprovalRemark] = useState<string>("Verified on Bank Statement");

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const res = await adminGetWalletOverviewAction();
      if (res.success && res.data) {
        setData(res.data);
      } else {
        toast.error(res.error || "Failed to load wallet dashboard data.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleCopyUtr = (utr: string) => {
    navigator.clipboard.writeText(utr);
    setCopiedUtr(utr);
    toast.success("UTR reference copied to clipboard");
    setTimeout(() => {
      setCopiedUtr((prev) => (prev === utr ? null : prev));
    }, 2500);
  };

  const handleOpenApproveModal = (request: WalletTopupRequestDTO) => {
    setApprovingRequest(request);
    setApprovalRemark("Verified on Bank Statement");
  };

  const handleConfirmApprove = async () => {
    if (!approvingRequest || actionLoadingId) return;
    setActionLoadingId(approvingRequest.id);

    try {
      const res = await adminApproveTopupAction({
        requestId: approvingRequest.id,
        remark: approvalRemark,
      });

      if (res.success) {
        toast.success(
          `Approved ₹${approvingRequest.amountRupees.toFixed(2)} for ${
            approvingRequest.user?.name || "Student"
          }! Balance credited instantly.`
        );
        setApprovingRequest(null);
        await fetchOverview();
      } else {
        toast.error(res.error || "Failed to approve top-up.");
      }
    } catch (err: any) {
      toast.error(err.message || "Approval transaction failed.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenRejectModal = (request: WalletTopupRequestDTO) => {
    setRejectingRequest(request);
    setRejectionReason("Payment could not be verified in bank records (unmatched UTR).");
  };

  const handleConfirmReject = async () => {
    if (!rejectingRequest || submittingReject) return;
    setSubmittingReject(true);

    try {
      const res = await adminRejectTopupAction({
        requestId: rejectingRequest.id,
        reason: rejectionReason,
      });

      if (res.success) {
        toast.success(`Top-up request #${rejectingRequest.utr} rejected.`);
        setRejectingRequest(null);
        await fetchOverview();
      } else {
        toast.error(res.error || "Failed to reject top-up.");
      }
    } catch (err: any) {
      toast.error(err.message || "Rejection failed.");
    } finally {
      setSubmittingReject(false);
    }
  };

  // Filter and search logic
  const filteredRequests = useMemo(() => {
    if (!data?.requests) return [];
    return data.requests.filter((r) => {
      const matchesStatus =
        statusFilter === "ALL" || r.status === statusFilter;
      const cleanSearch = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !cleanSearch ||
        r.utr.toLowerCase().includes(cleanSearch) ||
        r.user?.name?.toLowerCase().includes(cleanSearch) ||
        r.user?.email?.toLowerCase().includes(cleanSearch) ||
        r.user?.phone?.toLowerCase().includes(cleanSearch);

      return matchesStatus && matchesSearch;
    });
  }, [data?.requests, statusFilter, searchQuery]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-heading">
              Wallet Recharges & Top-Up Approvals
            </h1>
            <Badge variant="outline" className="text-xs">
              Phase 3 Live
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Reconcile 12-digit UPI UTR references with bank statements and credit student balances with 1-tap verification.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Telegram Status Pill */}
          <button
            onClick={() => setShowTelegramGuide(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-card/60 hover:bg-card text-xs transition-colors"
          >
            <Send className="w-3.5 h-3.5 text-primary" />
            <span className="font-medium text-foreground">Telegram Bot:</span>
            {data?.telegramConfigured ? (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Active
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Setup Guide
              </span>
            )}
          </button>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchOverview}
            disabled={loading}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Campus Float */}
        <Card className="p-4 sm:p-5 border-border bg-card shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider">
              Total Wallet Float
            </span>
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <p className="text-2xl sm:text-3xl font-extrabold text-foreground font-heading">
              ₹{data?.totalFloatRupees?.toFixed(2) || "0.00"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {data?.totalFloatPaise?.toLocaleString("en-IN") || 0} Paise across{" "}
              <strong className="text-foreground">{data?.totalStudents || 0}</strong> students
            </p>
          </div>
        </Card>

        {/* Pending Approvals */}
        <Card
          className={cn(
            "p-4 sm:p-5 border-border bg-card shadow-sm space-y-2 transition-all",
            data?.pendingCount && data.pendingCount > 0
              ? "border-amber-500/50 bg-amber-500/5 dark:bg-amber-500/10"
              : ""
          )}
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Pending Approvals
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl sm:text-3xl font-extrabold text-foreground font-heading">
                {data?.pendingCount || 0}
              </p>
              <span className="text-xs font-semibold text-muted-foreground">
                (₹{data?.pendingRupees?.toFixed(2) || "0.00"})
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {data?.pendingCount && data.pendingCount > 0
                ? "Awaiting bank statement reconciliation"
                : "No pending requests in queue"}
            </p>
          </div>
        </Card>

        {/* Approved Today */}
        <Card className="p-4 sm:p-5 border-border bg-card shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Approved Today
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="flex items-baseline gap-2">
              <p className="text-2xl sm:text-3xl font-extrabold text-foreground font-heading">
                ₹{data?.approvedTodayRupees?.toFixed(2) || "0.00"}
              </p>
              <span className="text-xs font-semibold text-muted-foreground">
                ({data?.approvedTodayCount || 0} top-ups)
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Successfully credited since midnight
            </p>
          </div>
        </Card>

        {/* Rejected Today */}
        <Card className="p-4 sm:p-5 border-border bg-card shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium uppercase tracking-wider text-destructive">
              Rejected Today
            </span>
            <div className="w-8 h-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <p className="text-2xl sm:text-3xl font-extrabold text-foreground font-heading">
              {data?.rejectedTodayCount || 0}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Unmatched UTRs / fraudulent submissions
            </p>
          </div>
        </Card>
      </div>

      {/* Filter Toolbar & Search */}
      <Card className="p-4 border-border bg-card space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-secondary rounded-lg overflow-x-auto scrollbar-none">
            {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map((status) => {
              const isActive = statusFilter === status;
              const count =
                status === "ALL"
                  ? data?.requests?.length || 0
                  : status === "PENDING"
                  ? data?.pendingCount || 0
                  : status === "APPROVED"
                  ? data?.requests?.filter((r) => r.status === "APPROVED").length || 0
                  : data?.requests?.filter((r) => r.status === "REJECTED").length || 0;

              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5",
                    isActive
                      ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span>
                    {status === "ALL"
                      ? "All Top-Ups"
                      : status === "PENDING"
                      ? "Pending"
                      : status === "APPROVED"
                      ? "Approved"
                      : "Rejected"}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.2 rounded-full",
                      isActive
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-background/80 text-muted-foreground"
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by student, email, or 12-digit UTR..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs h-9 bg-background"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Requests Table / Card List */}
      <Card className="border-border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-border border-t-foreground rounded-full animate-spin mx-auto" />
            <p className="text-xs text-muted-foreground font-medium">Loading wallet requests...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-secondary mx-auto flex items-center justify-center text-muted-foreground">
              <Wallet className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-foreground">No top-up requests found</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {searchQuery
                ? `No recharges match your search query "${searchQuery}".`
                : statusFilter !== "ALL"
                ? `There are currently no ${statusFilter.toLowerCase()} top-up requests.`
                : "Students haven't submitted any wallet recharge requests yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/60 text-muted-foreground font-medium border-b border-border">
                <tr>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">12-Digit UTR</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Submitted At</th>
                  <th className="py-3 px-4">Verification</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRequests.map((req) => {
                  const isPending = req.status === "PENDING";
                  const isApproved = req.status === "APPROVED";
                  const isRejected = req.status === "REJECTED";
                  const isCopied = copiedUtr === req.utr;
                  const isProcessing = actionLoadingId === req.id;

                  return (
                    <tr
                      key={req.id}
                      className={cn(
                        "hover:bg-secondary/30 transition-colors",
                        isPending && "bg-amber-500/5 dark:bg-amber-500/10"
                      )}
                    >
                      {/* Student Info */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-foreground">
                            {req.user?.name || "Student"}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate max-w-[160px]">
                            {req.user?.email || "No email"}
                          </p>
                          {req.user?.phone && (
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Smartphone className="w-3 h-3" />
                              {req.user.phone}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-sm font-extrabold text-foreground font-heading">
                          ₹{req.amountRupees.toFixed(2)}
                        </span>
                        <p className="text-[10px] text-muted-foreground">
                          {req.amountPaise} Paise
                        </p>
                      </td>

                      {/* 12-Digit UTR with 1-Click Copy */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <code className="px-2 py-1 rounded bg-secondary font-mono font-bold text-foreground text-xs tracking-wider">
                            {req.utr}
                          </code>
                          <button
                            onClick={() => handleCopyUtr(req.utr)}
                            title="Copy UTR to verify in bank app"
                            className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        {isCopied && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                            Copied!
                          </span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isPending && (
                          <Badge
                            variant="outline"
                            className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1 text-[11px]"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Pending Verification
                          </Badge>
                        )}
                        {isApproved && (
                          <Badge
                            variant="outline"
                            className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1 text-[11px]"
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            Approved
                          </Badge>
                        )}
                        {isRejected && (
                          <Badge
                            variant="outline"
                            className="bg-destructive/10 text-destructive border-destructive/30 gap-1 text-[11px]"
                          >
                            <XCircle className="w-3 h-3 text-destructive" />
                            Rejected
                          </Badge>
                        )}
                      </td>

                      {/* Submitted At */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-muted-foreground">
                        <p>{formatDate(req.createdAt)}</p>
                        <p className="text-[10px]">
                          {new Date(req.createdAt).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </td>

                      {/* Verification Info */}
                      <td className="py-3.5 px-4 max-w-[200px]">
                        {isApproved && (
                          <div className="space-y-0.5 text-muted-foreground text-[11px]">
                            <p className="text-foreground font-medium truncate">
                              By: {req.verifiedBy || "Admin"}
                            </p>
                            {req.verifiedAt && (
                              <p className="text-[10px]">
                                {formatDate(req.verifiedAt)}
                              </p>
                            )}
                          </div>
                        )}
                        {isRejected && (
                          <div className="space-y-0.5">
                            <p className="text-[11px] text-destructive line-clamp-2" title={req.rejectionReason || ""}>
                              {req.rejectionReason || "Unmatched UTR"}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              By: {req.verifiedBy || "Admin"}
                            </p>
                          </div>
                        )}
                        {isPending && (
                          <span className="text-[11px] text-muted-foreground italic">
                            Unverified
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="default"
                              disabled={isProcessing}
                              onClick={() => handleOpenApproveModal(req)}
                              className="h-7 text-xs px-2.5 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              {isProcessing ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <Check className="w-3 h-3" />
                              )}
                              Approve
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isProcessing}
                              onClick={() => handleOpenRejectModal(req)}
                              className="h-7 text-xs px-2 text-destructive hover:bg-destructive/10 border-destructive/30"
                            >
                              <XCircle className="w-3 h-3 mr-1" />
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground font-medium">
                            Processed
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Approval Modal with Custom Admin Remark */}
      <Modal
        isOpen={Boolean(approvingRequest)}
        onClose={() => setApprovingRequest(null)}
        title="Approve Wallet Top-Up Recharge"
        description="Verify this 12-digit UTR against your bank records and credit student balance atomically."
        maxWidth="md"
      >
        {approvingRequest && (
          <div className="space-y-4 pt-2">
            {/* Student & Payment Summary */}
            <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Student:</span>
                <span className="font-semibold text-foreground">
                  {approvingRequest.user?.name || "Student"} ({approvingRequest.user?.email})
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Recharge Amount:</span>
                <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-heading">
                  ₹{approvingRequest.amountRupees.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">12-Digit UTR:</span>
                <div className="flex items-center gap-1">
                  <code className="font-mono font-bold text-foreground bg-background px-1.5 py-0.5 rounded border border-border">
                    {approvingRequest.utr}
                  </code>
                  <button
                    type="button"
                    onClick={() => handleCopyUtr(approvingRequest.utr)}
                    className="p-1 text-muted-foreground hover:text-foreground"
                    title="Copy UTR"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Optional Remark / Bank Reference Note */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Admin Remark / Bank Reference (Optional):</span>
                <span className="text-[10px] text-muted-foreground font-normal">Saved to audit ledger</span>
              </label>
              <div className="grid grid-cols-1 gap-1 text-xs">
                {[
                  "Verified on Bank Statement (UTR matched)",
                  "Verified via SMS / UPI notification",
                  "Student verified in-person at campus desk",
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setApprovalRemark(preset)}
                    className={cn(
                      "text-left p-1.5 rounded-md border text-[11px] transition-colors",
                      approvalRemark === preset
                        ? "border-primary bg-primary/10 text-foreground font-medium"
                        : "border-border hover:bg-secondary text-muted-foreground"
                    )}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <Input
                type="text"
                placeholder="Or type custom remark (e.g. 'SBI statement ref #491')..."
                value={approvalRemark}
                onChange={(e) => setApprovalRemark(e.target.value)}
                className="text-xs h-8 mt-1"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setApprovingRequest(null)}
                disabled={Boolean(actionLoadingId)}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleConfirmApprove}
                disabled={Boolean(actionLoadingId)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              >
                {actionLoadingId ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                Confirm & Credit ₹{approvingRequest.amountRupees.toFixed(2)}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Rejection Modal */}
      <Modal
        isOpen={Boolean(rejectingRequest)}
        onClose={() => setRejectingRequest(null)}
        title="Reject Wallet Top-Up Request"
        description="Flag this transaction as unverified or fraudulent. Zero refund or credits will be issued."
        maxWidth="md"
      >
        {rejectingRequest && (
          <div className="space-y-4 pt-2">
            {/* Target Summary */}
            <div className="p-3 rounded-lg bg-secondary/60 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Student:</span>
                <span className="font-semibold text-foreground">
                  {rejectingRequest.user?.name || "Student"} ({rejectingRequest.user?.email})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Claimed Amount:</span>
                <span className="font-bold text-foreground">
                  ₹{rejectingRequest.amountRupees.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">12-Digit UTR:</span>
                <code className="font-mono font-bold text-foreground">
                  {rejectingRequest.utr}
                </code>
              </div>
            </div>

            {/* Quick Reason Presets */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Rejection Reason:
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                {[
                  "Payment could not be verified in bank records (unmatched UTR).",
                  "Duplicate UTR already claimed in another transaction.",
                  "Payment amount received does not match the requested recharge amount.",
                  "Transaction failed or was reversed by student's bank.",
                ].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setRejectionReason(reason)}
                    className={cn(
                      "text-left p-2 rounded-md border text-xs transition-colors",
                      rejectionReason === reason
                        ? "border-primary bg-primary/10 text-foreground font-medium"
                        : "border-border hover:bg-secondary text-muted-foreground"
                    )}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Reason Input */}
            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground">
                Or type a custom note for the student:
              </label>
              <Input
                type="text"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter rejection explanation..."
                className="text-xs h-9"
              />
            </div>

            {/* Warning Callout */}
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-destructive/10 text-destructive text-[11px]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>
                The student will see this rejection notice and reason in their wallet history.
                No wallet balance or refund will be created.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRejectingRequest(null)}
                disabled={submittingReject}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleConfirmReject}
                disabled={submittingReject || !rejectionReason.trim()}
                className="gap-1.5"
              >
                {submittingReject && <RefreshCw className="w-3 h-3 animate-spin" />}
                Confirm Rejection (No Refund)
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Telegram Bot Setup Modal */}
      <Modal
        isOpen={showTelegramGuide}
        onClose={() => setShowTelegramGuide(false)}
        title="⚡ Telegram Admin Bot 1-Tap Approvals"
        description="Instant push notifications & inline buttons right on your mobile phone without opening the web dashboard."
        maxWidth="lg"
      >
        <div className="space-y-4 pt-2 text-xs text-foreground">
          <div className="p-3.5 rounded-lg bg-primary/10 border border-primary/20 space-y-2">
            <div className="flex items-center gap-2 font-bold text-foreground text-sm">
              <Send className="w-4 h-4 text-primary" />
              <span>How Instant 1-Tap Approvals Work</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Whenever a student tops up their Otium Campus Wallet via UPI QR and inputs their 12-digit UTR, our webhook triggers an immediate push notification to your private Telegram channel or chat.
            </p>
            <div className="p-2.5 rounded bg-background border border-border font-mono text-[11px] text-muted-foreground">
              ⚡ <strong>New Wallet Top-Up Request!</strong><br />
              💰 Amount: ₹50.00 (5000 Paise)<br />
              🔢 12-Digit UTR: <code>429812938192</code><br />
              👤 Student: Rahul Sharma (rahul@college.edu)<br />
              [ ✅ Approve ₹50.00 ] &nbsp; [ ❌ Reject ]
            </div>
            <p className="text-muted-foreground text-[11px]">
              Tapping <strong>[✅ Approve]</strong> executes the atomic double-entry ledger credit and updates the student’s live balance in milliseconds.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-foreground">How to configure the Telegram Bot:</h4>
            <ol className="list-decimal pl-4 space-y-1.5 text-muted-foreground">
              <li>
                Open Telegram and message <strong>@BotFather</strong> to create a new bot (e.g. <code>@OtiumCampusAdminBot</code>) and copy the HTTP API Token.
              </li>
              <li>
                Start a chat with your new bot and get your Chat ID using <strong>@userinfobot</strong>.
              </li>
              <li>
                Add the following two environment variables to your deployment or <code>.env.local</code>:
                <div className="mt-1.5 p-2 rounded bg-secondary font-mono text-[11px] select-all">
                  TELEGRAM_BOT_TOKEN="your-bot-token"<br />
                  TELEGRAM_ADMIN_CHAT_ID="your-telegram-chat-id"
                </div>
              </li>
              <li>
                Set your bot webhook URL to your domain:
                <div className="mt-1.5 p-2 rounded bg-secondary font-mono text-[11px] select-all">
                  https://api.telegram.org/bot&lt;TOKEN&gt;/setWebhook?url=https://&lt;YOUR-DOMAIN&gt;/api/telegram/webhook
                </div>
              </li>
            </ol>
          </div>

          <div className="flex justify-end pt-2 border-t border-border">
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowTelegramGuide(false)}
            >
              Close Guide
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
