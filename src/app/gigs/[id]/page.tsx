"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { SubmitButton } from "@/components/ui/SubmitButton";
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
  ShieldAlert,
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  FileText,
  User,
  EyeOff,
  Copy,
  ExternalLink,
  MessageSquare,
  Sparkles,
  DollarSign,
  AlertOctagon,
  ArrowRight,
  Send,
  Lock,
  XCircle,
} from "lucide-react";

export default function GigEscrowDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const gigId = params?.id as string;
  const { user, isOnCooldown } = useUser();

  const [gig, setGig] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Modals & Action States
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [claimAnonymously, setClaimAnonymously] = useState(false);
  const [advanceUtrInput, setAdvanceUtrInput] = useState("");
  const [finalUtrInput, setFinalUtrInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // Platform Master UPI ID
  const [platformUpiId, setPlatformUpiId] = useState("otium.escrow@okhdfcbank");

  useEffect(() => {
    getPlatformSettingsAction().then((res) => {
      if (res.success && res.data?.upiId) {
        setPlatformUpiId(res.data.upiId);
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
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-400">Loading Escrow Protected Gig...</p>
      </div>
    );
  }

  if (!gig) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
        <GlassCard className="max-w-md w-full p-8 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Gig Not Found</h2>
          <p className="text-xs text-slate-400">This task may have been removed or deleted.</p>
          <Link href="/gigs">
            <Button variant="brand" className="w-full">
              Back to Gigs Hub
            </Button>
          </Link>
        </GlassCard>
      </div>
    );
  }

  // Escrow Math
  const priceInRupees = gig.budget / 100;
  const escrowMath = calculateEscrow(priceInRupees);

  const isBuyer = user?.id === gig.posterId;
  const isWriter = user?.id === gig.assignedToId;

  // Freelancer Info: If isAnonymousWriter, hide real identity from Buyer / Public
  const shouldMaskWriter = gig.isAnonymousWriter && !isWriter && user?.role !== "SUPER_ADMIN";
  const writerDisplayName = shouldMaskWriter
    ? `@${gig.assignedTo?.incognitoProfile?.handle || "AnonymousWriter"}`
    : gig.assignedTo?.name || "Unassigned";

  const writerAvatar = shouldMaskWriter
    ? gig.assignedTo?.incognitoProfile?.avatarUrl ||
      `https://api.dicebear.com/9.x/bottts/svg?seed=${gig.assignedTo?.incognitoProfile?.handle || "Anon"}`
    : gig.assignedTo?.image ||
      `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80`;

  // Status Step Index for visual tracker
  const STATUS_STEPS = [
    { key: "OPEN", label: "Open Bounty" },
    { key: "CLAIMED", label: "Writer Claimed" },
    { key: "PENDING_ADVANCE", label: "Advance UTR" },
    { key: "ADVANCE_VERIFIED", label: "Advance Escrowed" },
    { key: "WORK_WITH_ADMIN", label: "File With Admin" },
    { key: "PENDING_FINAL", label: "Final UTR" },
    { key: "FINAL_VERIFIED", label: "Final Verified" },
    { key: "COMPLETED", label: "Payout Completed" },
  ];

  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.key === gig.status);

  // Dynamic Escrow Amount-Locked UPI QR URLs
  const advanceUpiUrl = generateUpiUrl(
    platformUpiId,
    escrowMath.advanceRequired,
    "OtiumEscrow",
    `Advance Escrow Gig ${gig.id.slice(-6)}`
  );
  const finalUpiUrl = generateUpiUrl(
    platformUpiId,
    escrowMath.advanceRequired,
    "OtiumEscrow",
    `Final Escrow Gig ${gig.id.slice(-6)}`
  );

  const advanceQrUrl = getUpiQrImageUrl(advanceUpiUrl, 200);
  const finalQrUrl = getUpiQrImageUrl(finalUpiUrl, 200);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const handleCancelGig = async () => {
    if (!user) return;
    const confirm = window.confirm(
      "Are you sure you want to cancel and close this gig bounty?"
    );
    if (!confirm) return;

    startTransition(async () => {
      const res = await cancelGig(gig.id, user.id);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Gig has been cancelled.");
        loadGig();
      }
    });
  };

  // Handlers
  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please login to claim this assignment.");
      return;
    }

    startTransition(async () => {
      const res = await claimGig(gig.id, user.id, claimAnonymously);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(
          claimAnonymously
            ? "Claimed anonymously! Buyer will only see your Incognito Alias."
            : "Gig claimed successfully! Waiting for Buyer's 50% Advance."
        );
        setIsClaimModalOpen(false);
        loadGig();
      }
    });
  };

  const handleAdvanceUtrSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const cleanUtr = advanceUtrInput.trim();
    if (!cleanUtr || cleanUtr.length !== 12 || !/^\d{12}$/.test(cleanUtr)) {
      toast.error("Please enter a valid 12-digit numeric UPI transaction UTR.");
      return;
    }

    startTransition(async () => {
      const res = await submitAdvanceUtr({
        gigId: gig.id,
        buyerId: user.id,
        advanceUtr: cleanUtr,
      });

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Advance UTR submitted! Admin is verifying receipt.");
        setAdvanceUtrInput("");
        loadGig();
      }
    });
  };

  const handleWriterHandover = async () => {
    if (!user) return;
    const confirm = window.confirm(
      "Confirm that you have physically handed over or delivered the completed assignment to the Admin Print/Operations station?"
    );
    if (!confirm) return;

    startTransition(async () => {
      const res = await writerHandoverAction({
        gigId: gig.id,
        writerId: user.id,
      });

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Handover confirmed! Status is now WORK_WITH_ADMIN.");
        loadGig();
      }
    });
  };

  const handleFinalUtrSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const cleanUtr = finalUtrInput.trim();
    if (!cleanUtr || cleanUtr.length !== 12 || !/^\d{12}$/.test(cleanUtr)) {
      toast.error("Please enter a valid 12-digit numeric UPI transaction UTR.");
      return;
    }

    startTransition(async () => {
      const res = await submitFinalUtr({
        gigId: gig.id,
        buyerId: user.id,
        finalUtr: cleanUtr,
      });

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Final payment UTR submitted! Admin will verify and disburse payout.");
        setFinalUtrInput("");
        loadGig();
      }
    });
  };

  const handleDropTask = async () => {
    if (!user) return;
    const confirm = window.confirm(
      "⚠️ ANTI-HOARDING WARNING: Dropping this task will apply an immediate 24-hour claiming cooldown to your account. Are you sure?"
    );
    if (!confirm) return;

    startTransition(async () => {
      const res = await dropGig(gig.id, user.id);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.warning("Task dropped. 24-hour claiming penalty applied.");
        loadGig();
      }
    });
  };

  const handleStartChat = async (otherUserId: string) => {
    if (!user) return;
    setChatLoading(true);
    const res = await getOrCreateConversation({
      participantOneId: user.id,
      participantTwoId: otherUserId,
      isAnonymousChat: false,
    });
    setChatLoading(false);

    if (res.success && res.data) {
      router.push(`/messages?id=${res.data.id}`);
    } else {
      toast.error(res.error || "Failed to start chat.");
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between">
        <Link
          href="/gigs"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-brand-500 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Assignment Hub</span>
        </Link>

        <div className="flex items-center gap-2">
          {/* Option to Cancel / Toggle Off Gig if Poster or Super Admin */}
          {(gig.posterId === user?.id || user?.role === "SUPER_ADMIN") &&
            gig.status !== "COMPLETED" &&
            gig.status !== "CANCELLED" && (
              <Button
                variant="danger"
                size="sm"
                onClick={handleCancelGig}
                disabled={isPending}
                leftIcon={<XCircle className="w-3.5 h-3.5" />}
              >
                {gig.status === "OPEN" ? "Cancel Bounty" : "Cancel & Close Gig"}
              </Button>
            )}

          {user?.role === "SUPER_ADMIN" && (
            <Link href="/admin/gigs">
              <Button variant="outline" size="sm" leftIcon={<ShieldCheck className="w-3.5 h-3.5 text-amber-500" />}>
                Admin Escrow Console
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Escrow Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900/95 via-brand-950/90 to-electric-950/95 p-6 sm:p-10 border border-brand-500/30 text-white shadow-2xl backdrop-blur-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 border border-brand-400/30 text-brand-300 text-xs font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Managed Proxy Escrow Protected</span>
            </div>

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
              size="md"
            >
              {gig.status.replace(/_/g, " ")}
            </Badge>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            {gig.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
            <span className="font-semibold px-2.5 py-1 rounded-lg bg-white/10">
              {gig.category}
            </span>
            {gig.deadline && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Deadline: {formatDate(gig.deadline)}</span>
              </span>
            )}
            {gig.college && (
              <span className="text-slate-400">Campus: {gig.college.name}</span>
            )}
          </div>
        </div>

        {/* Live Escrow Progress Tracker */}
        <div className="mt-8 pt-6 border-t border-white/10">
          <p className="text-[11px] uppercase font-bold text-slate-400 tracking-wider mb-3">
            Escrow Verification Lifecycle
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {STATUS_STEPS.map((step, idx) => {
              const isPast = currentStepIndex > idx;
              const isCurrent = gig.status === step.key;
              return (
                <div
                  key={step.key}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    isCurrent
                      ? "bg-brand-500/25 border-brand-400 text-white font-bold ring-1 ring-brand-400"
                      : isPast
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                      : "bg-white/5 border-white/10 text-slate-500 opacity-60"
                  }`}
                >
                  <p className="text-[10px] font-mono">{idx + 1}.</p>
                  <p className="text-[10px] font-semibold truncate">{step.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Grid: Escrow Dashboard & Workflow Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols): Task Specification & Dynamic Workflow Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Phase 1: Buyer Pays 50% Advance (CLAIMED or PENDING_ADVANCE) */}
          {(gig.status === "CLAIMED" || gig.status === "PENDING_ADVANCE") && (
            <GlassCard className="p-6 border-amber-500/30 bg-amber-500/5 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Phase 1: 50% Advance Escrow Payment
                    </h3>
                    <p className="text-xs text-slate-500">Deposit ₹{escrowMath.advanceRequired} to initiate writer work</p>
                  </div>
                </div>
                <Badge variant={gig.status === "PENDING_ADVANCE" ? "warning" : "brand"} size="sm">
                  {gig.status === "PENDING_ADVANCE" ? "Verification In Progress" : "Action Required"}
                </Badge>
              </div>

              {/* Writer UI Guard */}
              {isWriter && (
                <div className="p-4 rounded-xl bg-amber-500/15 border border-amber-500/30 text-xs text-amber-300 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Writer Guardrail:</span> Waiting for Admin to verify advance. Do not start working yet.
                  </div>
                </div>
              )}

              {/* Buyer Interactive Payment Section */}
              {isBuyer && gig.status === "CLAIMED" && (
                <form onSubmit={handleAdvanceUtrSubmit} className="space-y-4 pt-2">
                  <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl bg-white/40 dark:bg-slate-900/60 border border-amber-500/20">
                    <div className="p-2.5 bg-white rounded-2xl shadow-md border border-slate-200 shrink-0 text-center">
                      <img src={advanceQrUrl} alt="Advance Escrow QR" className="w-36 h-36 rounded-lg mx-auto" />
                      <span className="block text-[10px] font-bold text-slate-700 mt-1 font-mono">₹{escrowMath.advanceRequired}</span>
                    </div>

                    <div className="space-y-3 flex-1 w-full text-xs">
                      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-slate-400">Scan QR or Pay UPI ID:</p>
                          <p className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">{platformUpiId}</p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(platformUpiId, "Escrow UPI ID")}
                          className="text-xs h-7"
                          leftIcon={<Copy className="w-3 h-3" />}
                        >
                          Copy
                        </Button>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                          12-Digit Advance Payment UTR *
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={12}
                          placeholder="e.g. 423819283741"
                          value={advanceUtrInput}
                          onChange={(e) => setAdvanceUtrInput(e.target.value.replace(/\D/g, ""))}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-400 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <p className="text-[10px] text-slate-500 mt-1">
                          Enter exactly 12 numeric digits from your UPI transaction receipt.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <SubmitButton
                      disabled={advanceUtrInput.length !== 12 || isPending}
                      isSubmitting={isPending}
                      loadingText="Submitting Advance UTR..."
                      size="md"
                    >
                      Submit 50% Advance UTR (₹{escrowMath.advanceRequired})
                    </SubmitButton>
                  </div>
                </form>
              )}

              {gig.status === "PENDING_ADVANCE" && (
                <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 font-semibold">Submitted Advance UTR: </span>
                    <span className="font-mono font-bold text-amber-500">{gig.advanceUtr}</span>
                  </div>
                  <span className="text-slate-400 italic">Admin verifying bank receipt...</span>
                </div>
              )}
            </GlassCard>
          )}

          {/* Phase 2: Work Phase (ADVANCE_VERIFIED) */}
          {gig.status === "ADVANCE_VERIFIED" && (
            <GlassCard className="p-6 border-emerald-500/30 bg-emerald-500/5 space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div className="space-y-2 flex-1">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Phase 2: Advance Secured! (Work Phase)
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {isWriter
                      ? "🎉 Advance secured! Start writing. When you have completed the assignment, physically deliver it to the Admin Station and click below."
                      : "The 50% advance has been verified and locked in escrow. The writer is actively preparing your assignment."}
                  </p>
                </div>
              </div>

              {isWriter && (
                <div className="pt-2 flex justify-end">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleWriterHandover}
                    disabled={isPending}
                    leftIcon={<CheckCircle2 className="w-4 h-4" />}
                  >
                    Physical File Handed to Admin
                  </Button>
                </div>
              )}
            </GlassCard>
          )}

          {/* Phase 3 & 4: Final Settlement Phase (WORK_WITH_ADMIN or PENDING_FINAL) */}
          {(gig.status === "WORK_WITH_ADMIN" || gig.status === "PENDING_FINAL") && (
            <GlassCard className="p-6 border-teal-500/30 bg-teal-500/5 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Phase 3: Final 50% Settlement
                    </h3>
                    <p className="text-xs text-slate-500">Assignment is held with Admin. Pay final ₹{escrowMath.advanceRequired} to release.</p>
                  </div>
                </div>
                <Badge variant={gig.status === "PENDING_FINAL" ? "warning" : "brand"} size="sm">
                  {gig.status === "PENDING_FINAL" ? "Verification In Progress" : "Final Payment Required"}
                </Badge>
              </div>

              {/* Buyer Interactive Final Payment Form */}
              {isBuyer && gig.status === "WORK_WITH_ADMIN" && (
                <form onSubmit={handleFinalUtrSubmit} className="space-y-4 pt-2">
                  <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl bg-white/40 dark:bg-slate-900/60 border border-teal-500/20">
                    <div className="p-2.5 bg-white rounded-2xl shadow-md border border-slate-200 shrink-0 text-center">
                      <img src={finalQrUrl} alt="Final Escrow QR" className="w-36 h-36 rounded-lg mx-auto" />
                      <span className="block text-[10px] font-bold text-slate-700 mt-1 font-mono">₹{escrowMath.advanceRequired}</span>
                    </div>

                    <div className="space-y-3 flex-1 w-full text-xs">
                      <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-slate-400">Scan QR or Pay UPI ID:</p>
                          <p className="font-mono font-bold text-teal-600 dark:text-teal-400 text-sm">{platformUpiId}</p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(platformUpiId, "Escrow UPI ID")}
                          className="text-xs h-7"
                          leftIcon={<Copy className="w-3 h-3" />}
                        >
                          Copy
                        </Button>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                          12-Digit Final Payment UTR *
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={12}
                          placeholder="e.g. 423899182374"
                          value={finalUtrInput}
                          onChange={(e) => setFinalUtrInput(e.target.value.replace(/\D/g, ""))}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-teal-400 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                        <p className="text-[10px] text-slate-500 mt-1">
                          Enter exactly 12 numeric digits from your UPI transaction receipt.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <SubmitButton
                      disabled={finalUtrInput.length !== 12 || isPending}
                      isSubmitting={isPending}
                      loadingText="Submitting Final UTR..."
                      size="md"
                    >
                      Submit Final UTR (₹{escrowMath.advanceRequired})
                    </SubmitButton>
                  </div>
                </form>
              )}

              {gig.status === "PENDING_FINAL" && (
                <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 font-semibold">Submitted Final UTR: </span>
                    <span className="font-mono font-bold text-teal-400">{gig.finalUtr}</span>
                  </div>
                  <span className="text-slate-400 italic">Admin verifying final payment...</span>
                </div>
              )}
            </GlassCard>
          )}

          {/* Phase 5: Completed Payout */}
          {gig.status === "COMPLETED" && (
            <GlassCard className="p-6 border-emerald-500/40 bg-emerald-500/10 space-y-2">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Escrow Payout Complete 🎉
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Writer payout of <span className="font-bold text-emerald-400">₹{escrowMath.writerPayout.toFixed(0)}</span> settled with Payout UTR <span className="font-mono font-bold text-slate-200">{gig.payoutUtr || "DISBURSED"}</span>.
              </p>
            </GlassCard>
          )}

          {/* Task Specification & Download */}
          <GlassCard className="p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Requirements & Deliverables
            </h3>
            <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
              {gig.description}
            </p>

            {gig.fileUrl && (
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                <a
                  href={gig.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-brand-600 dark:text-brand-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  <span>Download / View Specification PDF (Supabase Documents)</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </GlassCard>

          {/* Action Bar for Public/Freelancer */}
          {gig.status === "OPEN" && !isBuyer && (
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="brand"
                size="lg"
                disabled={isOnCooldown}
                onClick={() => setIsClaimModalOpen(true)}
                className="shadow-xl shadow-brand-500/25"
                leftIcon={<Briefcase className="w-5 h-5" />}
              >
                Claim This Assignment
              </Button>
            </div>
          )}

          {isWriter && gig.status !== "COMPLETED" && (
            <div className="pt-2 flex justify-end">
              <Button
                variant="danger"
                size="sm"
                onClick={handleDropTask}
                disabled={isPending}
                leftIcon={<AlertTriangle className="w-4 h-4" />}
              >
                Drop Assignment (24h Cooldown)
              </Button>
            </div>
          )}
        </div>

        {/* Right Column (1 Col): Financial Escrow Breakdown & Participant Cards */}
        <div className="space-y-6">
          {/* Progressive Tiered Escrow Math Card */}
          <GlassCard className="p-6 space-y-4 border-brand-500/30">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-brand-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Escrow Financial Breakdown
                </h3>
              </div>
              <Badge variant="brand" size="sm">Tiered %</Badge>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Total Bounty:</span>
                <span className="font-black text-slate-900 dark:text-white text-base">
                  ₹{priceInRupees}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-400">
                <span>50% Advance Required:</span>
                <span className="font-bold text-amber-500">
                  ₹{escrowMath.advanceRequired}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-400">
                <span>Final 50% Settlement:</span>
                <span className="font-bold text-slate-300">
                  ₹{escrowMath.advanceRequired}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-slate-500">Platform Commission:</span>
                <span className="font-bold text-slate-400">
                  ₹{escrowMath.commission.toFixed(0)}
                </span>
              </div>

              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                <span>Writer Net Payout:</span>
                <span className="text-base font-black">
                  ₹{escrowMath.writerPayout.toFixed(0)}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-[10px] text-slate-400 space-y-1">
                <p className="font-semibold text-slate-300">Ghosted Guarantee:</p>
                <p>
                  If the buyer ghosts, writer receives 60% guarantee (₹{escrowMath.ghostedGuarantee.toFixed(0)}) from the advance.
                </p>
              </div>
            </div>
          </GlassCard>

          {/* Participant Cards */}
          <GlassCard className="p-6 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Contract Parties
            </h3>

            {/* Buyer Info */}
            <div className="p-3.5 rounded-2xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-400">Assignment Buyer</span>
                {isBuyer && <Badge variant="brand" size="sm">You</Badge>}
              </div>
              <div className="flex items-center gap-3">
                <img
                  src={gig.poster?.image || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80"}
                  alt={gig.poster?.name}
                  className="w-8 h-8 rounded-full object-cover ring-1 ring-brand-500"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {gig.poster?.name}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {gig.poster?.department}
                  </p>
                </div>
              </div>
            </div>

            {/* Writer Info */}
            <div className="p-3.5 rounded-2xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  Assigned Freelancer
                </span>
                {isWriter && <Badge variant="success" size="sm">You</Badge>}
                {gig.isAnonymousWriter && (
                  <Badge variant="purple" size="sm" className="gap-1">
                    <EyeOff className="w-2.5 h-2.5" />
                    <span>Incognito</span>
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3">
                <img
                  src={writerAvatar}
                  alt={writerDisplayName}
                  className="w-8 h-8 rounded-full object-cover ring-1 ring-purple-500 bg-slate-900"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {writerDisplayName}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {shouldMaskWriter ? "Identity Protected by Otium" : gig.assignedTo?.department || "Claimed"}
                  </p>
                </div>
              </div>
            </div>

            {/* Direct Message Option */}
            {user && (isBuyer || isWriter) && gig.assignedToId && (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                disabled={chatLoading}
                onClick={() => handleStartChat(isBuyer ? gig.assignedToId : gig.posterId)}
                leftIcon={<MessageSquare className="w-3.5 h-3.5 text-brand-500" />}
              >
                {chatLoading ? "Opening Chat..." : `Message ${isBuyer ? "Writer" : "Buyer"}`}
              </Button>
            )}
          </GlassCard>
        </div>
      </div>

      {/* MODAL: Claim Gig with Anonymous Writer Toggle */}
      <Modal
        isOpen={isClaimModalOpen}
        onClose={() => setIsClaimModalOpen(false)}
        title="Claim Assignment Bounty"
        description="Select whether you want to write under your real identity or an anonymous incognito alias."
        maxWidth="md"
      >
        <form onSubmit={handleClaimSubmit} className="space-y-4 pt-2">
          <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <EyeOff className="w-4 h-4 text-purple-500" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Claim Anonymously (Incognito Writer)
                </span>
              </div>
              <input
                type="checkbox"
                checked={claimAnonymously}
                onChange={(e) => setClaimAnonymously(e.target.checked)}
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              {claimAnonymously
                ? "🔒 Active: The buyer will ONLY see your Incognito Alias and Bot avatar. Your name, email, and department remain completely hidden."
                : "Standard: The buyer will see your registered student profile name and department."}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-brand-500/10 border border-brand-500/20 text-xs text-slate-600 dark:text-slate-300 space-y-1">
            <p className="font-bold text-brand-400">Escrow Guarantee:</p>
            <p>
              Once claimed, you will wait for the 50% advance (₹{escrowMath.advanceRequired}) to be verified before starting.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setIsClaimModalOpen(false)}>
              Cancel
            </Button>
            <SubmitButton isSubmitting={isPending} loadingText="Claiming...">
              Confirm & Claim
            </SubmitButton>
          </div>
        </form>
      </Modal>
    </div>
  );
}
