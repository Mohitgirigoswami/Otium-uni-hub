"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { useUser } from "@/components/providers/UserContext";
import {
  getGigs,
  createGig,
  claimGig,
} from "@/actions/gigs.actions";
import { calculateEscrow } from "@/lib/escrow-math";
import { formatPaiseToRupees, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import {
  Briefcase,
  Plus,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertOctagon,
  User,
  FileText,
  DollarSign,
  Filter,
  Sparkles,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { TaskCategoryType } from "@/lib/types";
import { PdfUploadDropzone } from "@/components/ui/PdfUploadDropzone";
import { ClientServiceGuard } from "@/components/ClientServiceGuard";

const CATEGORIES: { label: string; value: string }[] = [
  { label: "All Categories", value: "ALL" },
  { label: "Coding & Dev", value: "CODING" },
  { label: "Assignments & Reports", value: "ASSIGNMENT" },
  { label: "UI/UX & Design", value: "DESIGN" },
  { label: "Projects & Lab Work", value: "PROJECT" },
  { label: "Research & Summaries", value: "RESEARCH" },
  { label: "Tutoring & Doubts", value: "TUTORING" },
];

export default function GigsPage() {
  const { user } = useUser();
  const [gigs, setGigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budgetRupees, setBudgetRupees] = useState("");
  const [category, setCategory] = useState<TaskCategoryType>("ASSIGNMENT");
  const [deadline, setDeadline] = useState("");
  const [fileUrl, setFileUrl] = useState<string | undefined>(undefined);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  const fetchGigsList = async () => {
    setLoading(true);
    const res = await getGigs({
      status: statusFilter,
      category: categoryFilter,
      search: searchQuery,
      collegeId: user?.collegeId,
    });
    if (res.success && res.data) {
      setGigs(res.data);
    } else {
      toast.error(res.error || "Failed to load task gigs.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchGigsList();
  }, [statusFilter, categoryFilter, user?.collegeId]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchGigsList();
  };

  const handleCreateGig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please login to post an assignment gig.");
      return;
    }

    const budget = parseFloat(budgetRupees);
    if (isNaN(budget) || budget <= 0) {
      toast.error("Please enter a valid bounty amount.");
      return;
    }

    startTransition(async () => {
      const res = await createGig({
        posterId: user.id,
        title,
        description,
        budgetRupees: budget,
        category,
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
        fileUrl,
        collegeId: user.collegeId,
      });

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Bounty task posted with Escrow protection!");
        setIsCreateModalOpen(false);
        setTitle("");
        setDescription("");
        setBudgetRupees("");
        setDeadline("");
        setFileUrl(undefined);
        fetchGigsList();
      }
    });
  };

  return (
    <ClientServiceGuard campusId={user?.collegeId} serviceKey="MARKETPLACE">
      <div className="space-y-8 max-w-7xl mx-auto pb-12">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900/95 via-brand-950/90 to-electric-950/95 p-8 sm:p-10 border border-brand-500/30 text-white shadow-2xl backdrop-blur-2xl">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 -mb-16 w-60 h-60 bg-electric-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 border border-brand-400/30 text-brand-300 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Anti-Ghosting Managed Escrow System</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Peer Assignment & Task Bounties
              </h1>
              <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                Connect with verified student peers for coding assignments, research papers, design tasks, and lab reports with guaranteed 50% milestone escrow.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <Button
                variant="brand"
                size="lg"
                onClick={() => setIsCreateModalOpen(true)}
                className="shadow-xl shadow-brand-500/25"
                leftIcon={<Plus className="w-5 h-5" />}
              >
                Post a Bounty
              </Button>
            </div>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <GlassCard className="p-4 space-y-4">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0 scrollbar-none">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setCategoryFilter(cat.value)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    categoryFilter === cat.value
                      ? "bg-brand-500 text-white shadow-md shadow-brand-500/20"
                      : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Status Tab & Search */}
            <div className="flex items-center gap-2.5 w-full lg:w-auto justify-end">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="OPEN">Open Bounties</option>
                <option value="CLAIMED">Claimed (Pending Advance)</option>
                <option value="ADVANCE_VERIFIED">Advance Verified (Writing)</option>
                <option value="WORK_WITH_ADMIN">Work With Admin</option>
                <option value="COMPLETED">Completed Payouts</option>
              </select>

              <form onSubmit={handleSearch} className="relative flex-1 sm:w-60">
                <input
                  type="text"
                  placeholder="Search gigs & tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <Filter className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </form>
            </div>
          </div>
        </GlassCard>

        {/* Gigs Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-64 rounded-2xl bg-slate-200/50 dark:bg-slate-800/50 animate-pulse"
              />
            ))}
          </div>
        ) : gigs.length === 0 ? (
          <GlassCard className="text-center py-16">
            <Briefcase className="w-12 h-12 mx-auto text-slate-400 mb-3 opacity-60" />
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">
              No matching task gigs found
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Try adjusting your category filters or post a new bounty for your assignment!
            </p>
            <Button
              variant="brand"
              size="sm"
              className="mt-4"
              onClick={() => setIsCreateModalOpen(true)}
            >
              Create Task Gig
            </Button>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {gigs.map((gig) => {
              const price = gig.budget / 100;
              const escrow = calculateEscrow(price);

              const isPoster = gig.posterId === user?.id;

              return (
                <Link key={gig.id} href={`/gigs/${gig.id}`} className="block group">
                  <GlassCard
                    interactive
                    className="flex flex-col justify-between h-full border-slate-200/80 dark:border-slate-800/80 group-hover:border-brand-500/60"
                  >
                    <div className="space-y-4">
                      {/* Card Header: Category & Status */}
                      <div className="flex items-center justify-between gap-2">
                        <Badge
                          variant={
                            gig.category === "CODING"
                              ? "brand"
                              : gig.category === "DESIGN"
                              ? "purple"
                              : gig.category === "ASSIGNMENT"
                              ? "info"
                              : "neutral"
                          }
                          size="sm"
                        >
                          {gig.category}
                        </Badge>

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
                      </div>

                      {/* Title & Description */}
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white line-clamp-2 group-hover:text-brand-500 transition-colors">
                          {gig.title}
                        </h3>
                        <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                          {gig.description}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
                      {/* Earner-First Positive Take-Home Pricing (Loss Aversion Eliminator) */}
                      <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
                        <div>
                          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
                            {isPoster ? "Your Total Budget" : "Estimated Earning"}
                          </span>
                          <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                            ₹{isPoster ? price : escrow.writerPayout.toFixed(0)}
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block">
                            Escrow Protected
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>50% Upfront</span>
                          </span>
                        </div>
                      </div>

                      {/* Poster and Status Footer */}
                      <div className="flex items-center justify-between text-xs pt-1">
                        <div className="flex items-center gap-2">
                          <img
                            src={
                              gig.poster?.image ||
                              `https://api.dicebear.com/9.x/bottts/svg?seed=${gig.poster?.name || "User"}`
                            }
                            alt="Poster"
                            className="w-6 h-6 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                          />
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-400 truncate max-w-[120px]">
                            {gig.poster?.name || "Student"}
                          </span>
                        </div>

                        <span className="text-xs font-bold text-brand-600 dark:text-brand-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                          <span>View Bounty</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </GlassCard>
                </Link>
              );
            })}
          </div>
        )}

      {/* Post a Task Gig Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Post a Task or Assignment Bounty"
        description="Fill out the requirements. Your bounty is held in Managed Proxy Escrow to ensure safe peer fulfillment."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateGig} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Task Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Implement Raft Consensus in Go for CSE 402"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TaskCategoryType)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="CODING">Coding & Software</option>
                <option value="ASSIGNMENT">Assignment & Lab</option>
                <option value="DESIGN">UI/UX & Graphics</option>
                <option value="PROJECT">Semester Project</option>
                <option value="RESEARCH">Research & Papers</option>
                <option value="TUTORING">1-on-1 Tutoring</option>
                <option value="OTHER">Other Task</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Total Task Cost (₹ INR) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold">
                  ₹
                </span>
                <input
                  type="number"
                  min="50"
                  required
                  placeholder="1800"
                  value={budgetRupees}
                  onChange={(e) => setBudgetRupees(e.target.value)}
                  className="w-full pl-8 pr-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Total inclusive price paid in two 50% milestone releases.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Task Description & Acceptance Criteria *
            </label>
            <textarea
              required
              rows={4}
              placeholder="Detail the deliverables, tech stack, constraints, and format expected..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Submission Deadline
            </label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Direct Supabase Signed PDF Dropzone */}
          <PdfUploadDropzone
            onPdfUploaded={(url) => setFileUrl(url)}
            onUploadingChange={(up) => setIsUploadingMedia(up)}
            existingPdfUrl={fileUrl}
            label="Attach Assignment Brief / Spec PDF (Direct to Supabase)"
          />

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={isUploadingMedia || isPending}
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <SubmitButton
              disabled={isUploadingMedia || isPending}
              isSubmitting={isPending || isUploadingMedia}
              loadingText={isUploadingMedia ? "Uploading document to Supabase..." : "Publishing Bounty..."}
            >
              Post Bounty (₹{budgetRupees || "0"})
            </SubmitButton>
          </div>
        </form>
      </Modal>
    </div>
    </ClientServiceGuard>
  );
}
