"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { useUser } from "@/components/providers/UserContext";
import {
  getGigById,
  claimGig,
  dropGig,
  cancelGig,
  submitAdvanceUtr,
  writerHandoverAction,
  submitFinalUtr,
} from "@/actions/gigs.actions";
import { getOrCreateConversation } from "@/actions/chat.actions";
import { getPlatformSettingsAction } from "@/actions/platform.actions";
import { generateUpiUrl, getUpiQrImageUrl } from "@/lib/upi";
import { calculateEscrow } from "@/lib/escrow-math";
import { formatPaiseToRupees, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import {
  Briefcase,
  ShieldCheck,
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  User,
  EyeOff,
  MessageSquare,
  Lock,
  XCircle,
  Copy,
  Check,
  Clipboard,
  ExternalLink,
} from "lucide-react";
import { ClientServiceGuard } from "@/components/ClientServiceGuard";

export default function GigEscrowDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const gigId = params?.id as string;
  const { user } = useUser();

  const [gig, setGig] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Action states
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [advanceUtrInput, setAdvanceUtrInput] = useState("");
  const [finalUtrInput, setFinalUtrInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Platform Master UPI ID
  const [platformUpiId, setPlatformUpiId] = useState("otium.escrow@okhdfcbank");
  const [buyerDiscountPct, setBuyerDiscountPct] = useState(5);

  useEffect(() => {
    getPlatformSettingsAction().then((res) => {
      if (res.success && res.data) {
        if (res.data.upiId) setPlatformUpiId(res.data.upiId);
        if (res.data.buyerDiscountPct !== undefined) {
          setBuyerDiscountPct(res.data.buyerDiscountPct);
        }
      }
    });
  }, []);

  const loadGig = async () => {
    if (!gigId) return;
    setLoading(true);
    const res = await getGigById(gigId);
    if (res.success && res.data) {
      setGig(res.data);
    } else {
      toast.error(res.error || "Failed to load gig details.");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadGig();
  }, [gigId]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin" />
        <p className="text-xs text-muted-foreground font-medium">Loading Task Workspace...</p>
      </div>
    );
  }

  if (!gig) {
    return (
      <Card className="max-w-md mx-auto my-12 p-8 text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
        <h2 className="font-heading text-lg font-bold text-foreground">Task Not Found</h2>
        <p className="text-xs text-muted-foreground">
          This task bounty may have been archived or removed by its creator.
        </p>
        <Link href="/gigs">
          <Button variant="outline" size="sm">
            Back to Task Board
          </Button>
        </Link>
      </Card>
    );
  }

  const isCreator = user?.id === gig.creatorId;
  const isAssigned = user?.id === gig.assignedToId;
  const isAvailableToClaim = gig.status === "OPEN" && !isCreator;

  const budgetPaise = gig.budget ?? gig.budgetPaise ?? 0;
  const priceRupees = budgetPaise / 100;
  const escrowCalc = calculateEscrow(priceRupees, buyerDiscountPct);

  // Advance Payment UPI Link
  const advanceUpiUrl = generateUpiUrl(
    platformUpiId,
    escrowCalc.advanceRequired,
    "OtiumEscrow",
    `Advance_Gig_${gig.id.slice(0, 8)}`
  );
  const advanceQr = getUpiQrImageUrl(advanceUpiUrl, 180);

  // Final Settlement UPI Link
  const finalUpiUrl = generateUpiUrl(
    platformUpiId,
    escrowCalc.finalSettlement,
    "OtiumEscrow",
    `Final_Gig_${gig.id.slice(0, 8)}`
  );
  const finalQr = getUpiQrImageUrl(finalUpiUrl, 180);

  const copyUpi = () => {
    navigator.clipboard.writeText(platformUpiId);
    setCopiedUpi(true);
    toast.success("UPI ID copied to clipboard.");
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handlePasteAdvanceUtr = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const digits = text.replace(/\D/g, "");
      if (digits.length >= 12) {
        setAdvanceUtrInput(digits.slice(0, 12));
        toast.success("12-digit UTR pasted from clipboard!");
      } else if (digits.length > 0) {
        setAdvanceUtrInput(digits);
        toast.success("Pasted numbers from clipboard!");
      } else {
        toast.error("No numbers found in clipboard.");
      }
    } catch {
      toast.error("Could not read clipboard. Please paste manually.");
    }
  };

  const handlePasteFinalUtr = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const digits = text.replace(/\D/g, "");
      if (digits.length >= 12) {
        setFinalUtrInput(digits.slice(0, 12));
        toast.success("12-digit UTR pasted from clipboard!");
      } else if (digits.length > 0) {
        setFinalUtrInput(digits);
        toast.success("Pasted numbers from clipboard!");
      } else {
        toast.error("No numbers found in clipboard.");
      }
    } catch {
      toast.error("Could not read clipboard. Please paste manually.");
    }
  };

  const handleClaim = async () => {
    if (!user) {
      toast.error("Please sign in to claim this task.");
      return;
    }

    startTransition(async () => {
      const res = await claimGig(gig.id, user.id, false);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Task claimed! Follow specifications to deliver on time.");
        setIsClaimModalOpen(false);
        loadGig();
      }
    });
  };

  const handleDrop = async () => {
    if (!confirm("Are you sure you want to drop this task? It will return to the open pool.")) {
      return;
    }

    startTransition(async () => {
      const res = await dropGig(gig.id, user.id);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Task dropped.");
        loadGig();
      }
    });
  };

  const handleCancel = async () => {
    if (!confirm("Cancel this task posting?")) return;

    startTransition(async () => {
      const res = await cancelGig(gig.id, user.id);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Task cancelled.");
        router.push("/gigs");
      }
    });
  };

  const handleAdvanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!advanceUtrInput.trim() || advanceUtrInput.trim().length < 6) {
      toast.error("Please enter a valid 12-digit UPI UTR number.");
      return;
    }

    startTransition(async () => {
      const res = await submitAdvanceUtr({
        gigId: gig.id,
        buyerId: user.id,
        advanceUtr: advanceUtrInput.trim(),
      });
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Advance escrow deposit registered. Verification in progress.");
        setAdvanceUtrInput("");
        loadGig();
      }
    });
  };

  const handleHandover = async () => {
    startTransition(async () => {
      const res = await writerHandoverAction({
        gigId: gig.id,
        writerId: user.id,
      });
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Deliverable submitted for client review.");
        loadGig();
      }
    });
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!finalUtrInput.trim() || finalUtrInput.trim().length < 6) {
      toast.error("Please enter a valid 12-digit UPI UTR number.");
      return;
    }

    startTransition(async () => {
      const res = await submitFinalUtr({
        gigId: gig.id,
        buyerId: user.id,
        finalUtr: finalUtrInput.trim(),
      });
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Final escrow release confirmed. Task completed.");
        setFinalUtrInput("");
        loadGig();
      }
    });
  };

  const handleOpenDirectChat = async () => {
    if (!user) return;
    const targetUserId = isCreator ? gig.assignedToId : gig.creatorId;
    if (!targetUserId) {
      toast.error("No counterparty is currently assigned to this task.");
      return;
    }

    setChatLoading(true);
    const convRes = await getOrCreateConversation({
      participantOneId: user.id,
      participantTwoId: targetUserId,
    });
    setChatLoading(false);

    if (convRes.success && convRes.data) {
      router.push(`/messages?id=${convRes.data.id}`);
    } else {
      toast.error("Failed to initiate direct message channel.");
    }
  };

  return (
    <ClientServiceGuard campusId={user?.collegeId} serviceKey="GIG_HUB">
      <div className="space-y-8 pb-12 max-w-5xl mx-auto">
        {/* Navigation Breadcrumb */}
        <div>
          <Link
            href="/gigs"
            className="inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Task Board</span>
          </Link>
        </div>

        {/* Task Header Card */}
        <Card className="p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    gig.status === "OPEN"
                      ? "default"
                      : gig.status === "COMPLETED"
                      ? "success"
                      : "secondary"
                  }
                  size="md"
                >
                  {gig.status}
                </Badge>
                <Badge variant="outline" size="md">
                  {gig.category}
                </Badge>
              </div>

              <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">
                {gig.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span>Posted by {gig.creator?.name || "Student"}</span>
                <span>Created {formatDate(gig.createdAt)}</span>
                {gig.deadline && <span>Deadline: {formatDate(gig.deadline)}</span>}
              </div>
            </div>

            <div className="text-left sm:text-right space-y-1">
              <div className="font-heading text-3xl font-extrabold text-foreground">
                {formatPaiseToRupees(gig.budget ?? gig.budgetPaise)}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Escrow Protected Total Bounty
              </p>
            </div>
          </div>

          {/* Task Description */}
          <div className="space-y-2 pt-4 border-t border-border">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Task Specifications & Deliverable Requirements
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {gig.description}
            </p>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-border">
            {isAvailableToClaim && (
              <Button onClick={() => setIsClaimModalOpen(true)} size="md">
                Claim This Task
              </Button>
            )}

            {(isCreator || isAssigned) && (
              <Button
                variant="outline"
                size="md"
                onClick={handleOpenDirectChat}
                isLoading={chatLoading}
                leftIcon={<MessageSquare className="w-4 h-4" />}
              >
                Chat with Counterparty
              </Button>
            )}

            {isAssigned && gig.status === "ASSIGNED" && (
              <>
                <Button
                  size="md"
                  onClick={handleHandover}
                  disabled={isPending}
                  leftIcon={<CheckCircle2 className="w-4 h-4" />}
                >
                  Submit Deliverable
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  onClick={handleDrop}
                  disabled={isPending}
                >
                  Drop Task
                </Button>
              </>
            )}

            {isCreator && gig.status === "OPEN" && (
              <Button
                variant="destructive"
                size="md"
                onClick={handleCancel}
                disabled={isPending}
              >
                Cancel Task
              </Button>
            )}
          </div>
        </Card>

        {/* Escrow Financial Ledger Breakdown */}
        <Card className="p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-border">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <div>
              <h2 className="font-heading text-lg font-bold text-foreground">
                Managed Proxy Escrow Breakdown
              </h2>
              <p className="text-xs text-muted-foreground">
                Funds are split into milestone disbursements with 0% risk of unfulfilled deliverables.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3.5 rounded-lg border border-border bg-secondary/30 space-y-1">
              <span className="text-[11px] text-muted-foreground">Agreed Bounty</span>
              <div className="font-bold text-sm text-foreground">
                ₹{escrowCalc.rawPrice.toFixed(2)}
              </div>
            </div>

            <div className="p-3.5 rounded-lg border border-border bg-secondary/30 space-y-1">
              <span className="text-[11px] text-muted-foreground">50% Advance Lock</span>
              <div className="font-bold text-sm text-foreground">
                ₹{escrowCalc.advanceRequired.toFixed(2)}
              </div>
            </div>

            <div className="p-3.5 rounded-lg border border-border bg-secondary/30 space-y-1">
              <span className="text-[11px] text-muted-foreground">Platform Fee</span>
              <div className="font-bold text-sm text-foreground">
                ₹{escrowCalc.commission.toFixed(2)}
              </div>
            </div>

            <div className="p-3.5 rounded-lg border border-border bg-secondary/30 space-y-1">
              <span className="text-[11px] text-muted-foreground">Freelancer Payout</span>
              <div className="font-bold text-sm text-emerald-500">
                ₹{escrowCalc.writerPayout.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Workflow Steps */}
          {isCreator && gig.status === "ASSIGNED" && !gig.advancePaid && (
            <div className="p-5 rounded-xl border border-border bg-card space-y-4">
              <h3 className="font-heading font-bold text-sm text-foreground">
                Step 1: Deposit 50% Advance Escrow (₹{escrowCalc.advanceRequired.toFixed(2)})
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Scan the UPI QR code below to lock the 50% advance into platform escrow.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <div className="p-2 bg-white rounded-lg border border-border shadow-xs">
                  <img src={advanceQr} alt="UPI QR" className="w-32 h-32 object-contain" />
                </div>

                <form onSubmit={handleAdvanceSubmit} className="flex-1 space-y-3 w-full">
                  <div className="text-xs space-y-1">
                    <span className="text-muted-foreground">UPI ID:</span>
                    <div className="flex items-center gap-2 font-mono text-xs text-foreground bg-secondary px-2.5 py-1.5 rounded-md">
                      <span>{platformUpiId}</span>
                      <button
                        type="button"
                        onClick={copyUpi}
                        className="text-primary hover:underline ml-auto"
                      >
                        {copiedUpi ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>

                  <a
                    href={advanceUpiUrl}
                    className="inline-flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary font-semibold text-xs transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Pay ₹{escrowCalc.advanceRequired.toFixed(2)} with UPI App
                  </a>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-foreground">
                        12-Digit Transaction UTR:
                      </span>
                      <button
                        type="button"
                        onClick={handlePasteAdvanceUtr}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 bg-primary/10 px-2 py-0.5 rounded-md transition-colors"
                      >
                        <Clipboard className="w-3 h-3" />
                        <span>Paste UTR</span>
                      </button>
                    </div>
                    <Input
                      placeholder="Enter 12-digit transaction UTR..."
                      value={advanceUtrInput}
                      onChange={(e) => setAdvanceUtrInput(e.target.value.replace(/\D/g, ""))}
                      maxLength={12}
                      required
                    />
                  </div>

                  <Button type="submit" size="sm" className="w-full" isLoading={isPending}>
                    Confirm Advance Payment
                  </Button>
                </form>
              </div>
            </div>
          )}

          {isCreator && gig.handoverDone && !gig.finalPaid && (
            <div className="p-5 rounded-xl border border-border bg-card space-y-4">
              <h3 className="font-heading font-bold text-sm text-foreground">
                Step 2: Deliverable Reviewed. Release Final Settlement (₹{escrowCalc.finalSettlement.toFixed(2)})
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                The assigned student has handed over the deliverable. Confirm final release to complete the order.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <div className="p-2 bg-white rounded-lg border border-border shadow-xs">
                  <img src={finalQr} alt="UPI QR" className="w-32 h-32 object-contain" />
                </div>

                <form onSubmit={handleFinalSubmit} className="flex-1 space-y-3 w-full">
                  <a
                    href={finalUpiUrl}
                    className="inline-flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary font-semibold text-xs transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Pay ₹{escrowCalc.finalSettlement.toFixed(2)} with UPI App
                  </a>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-foreground">
                        12-Digit Transaction UTR:
                      </span>
                      <button
                        type="button"
                        onClick={handlePasteFinalUtr}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 bg-primary/10 px-2 py-0.5 rounded-md transition-colors"
                      >
                        <Clipboard className="w-3 h-3" />
                        <span>Paste UTR</span>
                      </button>
                    </div>
                    <Input
                      placeholder="Enter 12-digit transaction UTR..."
                      value={finalUtrInput}
                      onChange={(e) => setFinalUtrInput(e.target.value.replace(/\D/g, ""))}
                      maxLength={12}
                      required
                    />
                  </div>

                  <Button type="submit" size="sm" className="w-full" isLoading={isPending}>
                    Release Final Escrow to Freelancer
                  </Button>
                </form>
              </div>
            </div>
          )}
        </Card>

        {/* Claim Task Modal */}
        <Modal
          isOpen={isClaimModalOpen}
          onClose={() => setIsClaimModalOpen(false)}
          title="Claim Task Assignment"
          description="By claiming, you commit to completing this deliverable according to specifications."
        >
          <div className="space-y-4 text-xs text-muted-foreground leading-relaxed">
            <p>
              Expected payout upon approval: <strong className="text-foreground">₹{escrowCalc.writerPayout.toFixed(2)}</strong>.
            </p>
            <p>
              You will be able to message the client directly to coordinate files, questions, and drafts.
            </p>
            <Button
              onClick={handleClaim}
              size="lg"
              className="w-full"
              isLoading={isPending}
            >
              Confirm Task Commitment
            </Button>
          </div>
        </Modal>
      </div>
    </ClientServiceGuard>
  );
}
