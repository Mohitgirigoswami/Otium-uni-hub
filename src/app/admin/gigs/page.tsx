"use client";

import React, { useEffect, useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { useUser } from "@/components/providers/UserContext";
import {
  getAdminGigsEscrow,
  adminVerifyAdvanceUtr,
  adminRejectAdvanceUtr,
  adminConfirmFileReceived,
  adminVerifyFinalUtr,
  adminMarkPayoutSent,
  adminMarkBuyerGhosted,
} from "@/actions/gigs.actions";
import { calculateEscrow } from "@/lib/escrow-math";
import { formatPaiseToRupees, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import {
  Briefcase,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileCheck,
  Send,
  EyeOff,
  User,
  DollarSign,
  AlertOctagon,
  ArrowRight,
  Search,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

export default function AdminGigsEscrowPage() {
  const { user } = useUser();
  const [gigs, setGigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isPending, startTransition] = useTransition();

  // Payout Modal State
  const [selectedGigForPayout, setSelectedGigForPayout] = useState<any | null>(null);
  const [payoutUtrInput, setPayoutUtrInput] = useState("");

  const loadEscrowGigs = async () => {
    if (!user?.id) return;
    setLoading(true);
    const res = await getAdminGigsEscrow(user.id);
    if (res.success && res.data) {
      setGigs(res.data);
    } else {
      toast.error(res.error || "Failed to load admin escrow gigs.");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadEscrowGigs();
  }, [user?.id]);

  const handleVerifyAdvance = async (gigId: string) => {
    if (!user?.id) return;
    startTransition(async () => {
      const res = await adminVerifyAdvanceUtr(gigId, user.id);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Advance UTR verified! Writer can begin working.");
        loadEscrowGigs();
      }
    });
  };

  const handleRejectAdvance = async (gigId: string) => {
    if (!user?.id) return;
    const confirm = window.confirm("Reject this Advance UTR and revert gig back to CLAIMED?");
    if (!confirm) return;

    startTransition(async () => {
      const res = await adminRejectAdvanceUtr(gigId, user.id);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.warning("Advance UTR rejected. Buyer prompted to re-submit.");
        loadEscrowGigs();
      }
    });
  };

  const handleConfirmFile = async (gigId: string) => {
    if (!user?.id) return;
    startTransition(async () => {
      const res = await adminConfirmFileReceived(gigId, user.id);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Physical assignment file confirmed with Admin Station!");
        loadEscrowGigs();
      }
    });
  };

  const handleVerifyFinal = async (gigId: string) => {
    if (!user?.id) return;
    startTransition(async () => {
      const res = await adminVerifyFinalUtr(gigId, user.id);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Final UTR verified! Ready to disburse payout to writer.");
        loadEscrowGigs();
      }
    });
  };

  const handlePayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !selectedGigForPayout) return;

    startTransition(async () => {
      const res = await adminMarkPayoutSent({
        gigId: selectedGigForPayout.id,
        adminUserId: user.id,
        payoutUtr: payoutUtrInput,
      });

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Payout sent and recorded! Escrow completed.");
        setSelectedGigForPayout(null);
        setPayoutUtrInput("");
        loadEscrowGigs();
      }
    });
  };

  const handleMarkBuyerGhosted = async (gigId: string, guaranteeAmount: number) => {
    if (!user?.id) return;
    const confirm = window.confirm(
      `Flag buyer as GHOSTED? You will need to pay the writer the ₹${guaranteeAmount.toFixed(0)} Ghosted Guarantee from the 50% advance.`
    );
    if (!confirm) return;

    startTransition(async () => {
      const res = await adminMarkBuyerGhosted(gigId, user.id);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.error("Buyer marked as ghosted. Reminder: Disburse guarantee to writer.");
        loadEscrowGigs();
      }
    });
  };

  // Filtered Gigs
  const filteredGigs = gigs.filter((gig) => {
    const matchesStatus = statusFilter === "ALL" || gig.status === statusFilter;
    const matchesSearch =
      gig.title.toLowerCase().includes(search.toLowerCase()) ||
      gig.poster?.name?.toLowerCase().includes(search.toLowerCase()) ||
      (gig.advanceUtr && gig.advanceUtr.toLowerCase().includes(search.toLowerCase())) ||
      (gig.finalUtr && gig.finalUtr.toLowerCase().includes(search.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  // Aggregated Financials
  let totalEscrowVolume = 0;
  let totalPlatformCommission = 0;
  let activeEscrowsCount = 0;

  gigs.forEach((g) => {
    const price = g.budget / 100;
    const math = calculateEscrow(price);
    if (g.status !== "OPEN" && g.status !== "CANCELLED") {
      totalEscrowVolume += price;
      totalPlatformCommission += math.commission;
      if (g.status !== "COMPLETED" && g.status !== "BUYER_GHOSTED") {
        activeEscrowsCount++;
      }
    }
  });

  return (
    <div className="space-y-8">
      {/* Header & Financial Strip */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-extrabold text-foreground tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            <span>Managed Proxy Escrow Console</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Admin Middleman for Peer Assignment Verification, UTR Banking, and Payout Settlements.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadEscrowGigs}
          isLoading={loading}
          className="text-xs"
        >
          Refresh Ledger
        </Button>
      </div>

      {/* KPI Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border-primary/30">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">Total Escrow Volume</span>
          <p className="text-2xl font-black text-primary mt-1">₹{totalEscrowVolume.toLocaleString()}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Gross managed transaction value</p>
        </Card>

        <Card className="p-4 border-emerald-500/30">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">Platform Commission</span>
          <p className="text-2xl font-black text-emerald-500 mt-1">₹{totalPlatformCommission.toFixed(0)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Progressive tiered fee collected</p>
        </Card>

        <Card className="p-4 border-amber-500/30">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">Active Escrow Contracts</span>
          <p className="text-2xl font-black text-amber-500 mt-1">{activeEscrowsCount} In Flight</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Pending advance, handover, or final payout</p>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-muted/50 border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="ALL">All Statuses ({gigs.length})</option>
            <option value="PENDING_ADVANCE">Pending Advance UTR</option>
            <option value="ADVANCE_VERIFIED">Advance Verified (Writing)</option>
            <option value="WORK_WITH_ADMIN">Work With Admin</option>
            <option value="PENDING_FINAL">Pending Final UTR</option>
            <option value="FINAL_VERIFIED">Final Verified (Ready Payout)</option>
            <option value="COMPLETED">Completed</option>
            <option value="BUYER_GHOSTED">Buyer Ghosted</option>
          </select>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by title, student, or UTR..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>
      </Card>

      {/* Escrow Gigs Table / Cards */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 rounded-xl bg-muted/60 animate-pulse" />
          ))}
        </div>
      ) : filteredGigs.length === 0 ? (
        <Card className="text-center py-12 space-y-2">
          <Briefcase className="w-10 h-10 mx-auto text-muted-foreground" />
          <p className="text-sm font-bold text-muted-foreground">No gigs matching your criteria</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredGigs.map((gig) => {
            const price = gig.budget / 100;
            const math = calculateEscrow(price);

            const writerDisplay = gig.isAnonymousWriter
              ? `@${gig.assignedTo?.incognitoProfile?.handle || "AnonWriter"}`
              : gig.assignedTo?.name || "Unassigned";

            const canMarkGhosted =
              gig.status === "ADVANCE_VERIFIED" ||
              gig.status === "WORK_WITH_ADMIN" ||
              gig.status === "PENDING_FINAL";

            return (
              <Card key={gig.id} className="p-5 space-y-4">
                {/* Top Row: Title, Status, Link */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border">
                  <div className="flex items-center gap-2.5">
                    <Link
                      href={`/gigs/${gig.id}`}
                      className="text-base font-heading font-bold text-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                    >
                      <span>{gig.title}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                    </Link>
                    <Badge variant="brand" size="sm">
                      {gig.category}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        gig.status === "OPEN"
                          ? "info"
                          : gig.status === "ADVANCE_VERIFIED"
                          ? "success"
                          : gig.status === "COMPLETED"
                          ? "brand"
                          : gig.status === "BUYER_GHOSTED"
                          ? "danger"
                          : "warning"
                      }
                      size="sm"
                    >
                      {gig.status.replace(/_/g, " ")}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{formatDate(gig.createdAt)}</span>
                  </div>
                </div>

                {/* Middle Grid: Financials & Parties */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3 rounded-xl bg-muted/40 border border-border text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Total Price</span>
                    <p className="font-extrabold text-foreground text-sm">₹{price}</p>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">50% Advance</span>
                    <p className="font-bold text-amber-500">₹{math.advanceRequired}</p>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Writer Payout</span>
                    <p className="font-bold text-emerald-500">₹{math.writerPayout.toFixed(0)}</p>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Commission</span>
                    <p className="font-bold text-primary">₹{math.commission.toFixed(0)}</p>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Ghosted Guarantee</span>
                    <p className="font-bold text-rose-500">₹{math.ghostedGuarantee.toFixed(0)}</p>
                  </div>
                </div>

                {/* Parties & UTR Tracking Bar */}
                <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-6">
                    <div>
                      <span className="text-muted-foreground font-semibold">Buyer: </span>
                      <span className="font-bold text-foreground">{gig.poster?.name}</span>
                      <span className="text-[10px] text-muted-foreground ml-1">({gig.poster?.department})</span>
                    </div>

                    <div>
                      <span className="text-muted-foreground font-semibold">Writer: </span>
                      <span className="font-bold text-primary">{writerDisplay}</span>
                      {gig.isAnonymousWriter && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold ml-1">
                          Incognito
                        </span>
                      )}
                    </div>
                  </div>

                  {/* UTR References */}
                  <div className="flex items-center gap-4 font-mono text-[11px]">
                    {gig.advanceUtr && (
                      <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                        Adv UTR: {gig.advanceUtr}
                      </span>
                    )}
                    {gig.finalUtr && (
                      <span className="px-2 py-0.5 rounded bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30">
                        Final UTR: {gig.finalUtr}
                      </span>
                    )}
                    {gig.payoutUtr && (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        Payout UTR: {gig.payoutUtr}
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Row: Contextual Admin Action Buttons */}
                <div className="pt-3 border-t border-border flex flex-wrap items-center justify-end gap-2.5">
                  {/* Action 1: PENDING_ADVANCE -> Verify Advance / Reject UTR */}
                  {gig.status === "PENDING_ADVANCE" && (
                    <>
                      <Button
                        variant="danger"
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleRejectAdvance(gig.id)}
                        leftIcon={<XCircle className="w-3.5 h-3.5" />}
                      >
                        Reject UTR
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleVerifyAdvance(gig.id)}
                        leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                      >
                        Verify Advance (₹{math.advanceRequired})
                      </Button>
                    </>
                  )}

                  {/* Action 2: WORK_WITH_ADMIN -> Confirm File Received */}
                  {gig.status === "WORK_WITH_ADMIN" && (
                    <Button
                      variant="brand"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleConfirmFile(gig.id)}
                      leftIcon={<FileCheck className="w-3.5 h-3.5" />}
                    >
                      Confirm File Received
                    </Button>
                  )}

                  {/* Action 3: PENDING_FINAL -> Verify Final UTR */}
                  {gig.status === "PENDING_FINAL" && (
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleVerifyFinal(gig.id)}
                      leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                    >
                      Verify Final UTR (₹{math.advanceRequired})
                    </Button>
                  )}

                  {/* Action 4: FINAL_VERIFIED -> Mark Payout Sent */}
                  {gig.status === "FINAL_VERIFIED" && (
                    <Button
                      variant="brand"
                      size="sm"
                      disabled={isPending}
                      onClick={() => setSelectedGigForPayout(gig)}
                      leftIcon={<Send className="w-3.5 h-3.5" />}
                    >
                      Mark Payout Sent (₹{math.writerPayout.toFixed(0)})
                    </Button>
                  )}

                  {/* Action 5: Buyer Ghosted Flag */}
                  {canMarkGhosted && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleMarkBuyerGhosted(gig.id, math.ghostedGuarantee)}
                      className="text-rose-500 border-rose-500/30 hover:bg-rose-500/10 text-xs"
                      leftIcon={<AlertOctagon className="w-3.5 h-3.5" />}
                    >
                      Buyer Ghosted
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Mark Payout Sent Modal */}
      {selectedGigForPayout && (
        <Modal
          isOpen={!!selectedGigForPayout}
          onClose={() => setSelectedGigForPayout(null)}
          title="Disburse Writer Payout"
          description={`Record settlement of ₹${calculateEscrow(selectedGigForPayout.budget / 100).writerPayout.toFixed(0)} to writer.`}
          maxWidth="md"
        >
          <form onSubmit={handlePayoutSubmit} className="space-y-4 pt-2">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-1">
              <p className="text-xs text-muted-foreground">Writer Payout Net Amount</p>
              <p className="text-2xl font-black text-emerald-500">
                ₹{calculateEscrow(selectedGigForPayout.budget / 100).writerPayout.toFixed(0)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Platform Commission Retained: ₹{calculateEscrow(selectedGigForPayout.budget / 100).commission.toFixed(0)}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Bank / UPI Payout UTR Reference *
              </label>
              <Input
                type="text"
                required
                placeholder="e.g. 423812984920"
                value={payoutUtrInput}
                onChange={(e) => setPayoutUtrInput(e.target.value)}
                className="font-mono text-sm"
              />
            </div>

            <div className="pt-3 border-t border-border flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setSelectedGigForPayout(null)}>
                Cancel
              </Button>
              <SubmitButton isSubmitting={isPending} loadingText="Recording...">
                Confirm Payout Disbursed
              </SubmitButton>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
