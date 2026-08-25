"use client";

import React, { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { useUser, AVAILABLE_PERSONAS } from "@/components/providers/UserContext";
import {
  getGigs,
  createGig,
  claimGig,
  dropGig,
  completeGig,
} from "@/actions/gigs.actions";
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
} from "lucide-react";
import { TaskCategoryType } from "@/lib/types";

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
  const { user, activePersonaId, refreshUser, isOnCooldown, cooldownHoursRemaining } = useUser();
  const [gigs, setGigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedGigForDetails, setSelectedGigForDetails] = useState<any | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budgetRupees, setBudgetRupees] = useState("");
  const [category, setCategory] = useState<TaskCategoryType>("CODING");
  const [deadline, setDeadline] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchGigsList = async () => {
    setLoading(true);
    const res = await getGigs({
      category: categoryFilter,
      status: statusFilter,
      search: searchQuery,
    });
    if (res.success && res.data) {
      setGigs(res.data);
    } else {
      toast.error(res.error || "Failed to load gigs.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchGigsList();
  }, [categoryFilter, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchGigsList();
  };

  const handleCreateGig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please ensure you have an active student profile.");
      return;
    }
    if (!title.trim() || !description.trim() || !budgetRupees) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    const res = await createGig({
      posterId: user.id,
      title,
      description,
      budgetRupees: Number(budgetRupees),
      category,
      deadline: deadline || undefined,
      fileUrl: fileUrl || undefined,
    });

    setIsSubmitting(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Assignment Gig posted to campus hub!");
      setIsCreateModalOpen(false);
      setTitle("");
      setDescription("");
      setBudgetRupees("");
      setDeadline("");
      setFileUrl("");
      fetchGigsList();
      refreshUser();
    }
  };

  const handleClaim = async (gigId: string) => {
    if (!user) return;
    setActionLoadingId(gigId);

    const res = await claimGig(gigId, user.id);
    setActionLoadingId(null);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Gig successfully claimed! Check active tasks.");
      fetchGigsList();
      refreshUser();
      if (selectedGigForDetails) setSelectedGigForDetails(null);
    }
  };

  const handleDrop = async (gigId: string) => {
    if (!user) return;
    const confirmDrop = window.confirm(
      "⚠️ ANTI-HOARDING WARNING: Dropping this task will apply a STRICT 24-hour cooldown penalty to your account, preventing you from claiming any new gigs. Are you sure?"
    );
    if (!confirmDrop) return;

    setActionLoadingId(gigId);
    const res = await dropGig(gigId, user.id);
    setActionLoadingId(null);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.warning("Task dropped. 24-hour claiming cooldown applied.");
      fetchGigsList();
      refreshUser();
      if (selectedGigForDetails) setSelectedGigForDetails(null);
    }
  };

  const handleComplete = async (gigId: string) => {
    if (!user) return;
    setActionLoadingId(gigId);
    const res = await completeGig(gigId, user.id);
    setActionLoadingId(null);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("🎉 Task marked as completed!");
      fetchGigsList();
      refreshUser();
      if (selectedGigForDetails) setSelectedGigForDetails(null);
    }
  };

  // Filter assigned tasks for current user to compute concurrency count
  const myAssignedCount = gigs.filter(
    (g) => g.assignedToId === user?.id && g.status === "ASSIGNED"
  ).length;

  return (
    <div className="space-y-8">
      {/* Top Banner & Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-900/80 via-slate-900/90 to-electric-950/90 p-8 sm:p-10 border border-brand-500/30 text-white shadow-2xl backdrop-blur-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 w-60 h-60 bg-accent-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 border border-brand-400/30 text-brand-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>P2P Academic Freelance Economy</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Assignments & Projects Hub
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Earn peer bounties by solving coding challenges, designing presentations, and writing reports. Protected by automated anti-hoarding guardrails.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="brand"
              size="lg"
              leftIcon={<Plus className="w-5 h-5" />}
              onClick={() => setIsCreateModalOpen(true)}
              className="shadow-lg shadow-brand-500/25"
            >
              Post a Task Gig
            </Button>
          </div>
        </div>

        {/* Anti-Hoarding Live Guardrail Bar */}
        <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
            <div className="w-9 h-9 rounded-xl bg-brand-500/20 flex items-center justify-center text-brand-400">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">
                Concurrency Guardrail
              </p>
              <p className="text-sm font-semibold text-white">
                {myAssignedCount} / 2 Active Tasks Claimed
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isOnCooldown
                  ? "bg-rose-500/20 text-rose-400"
                  : "bg-emerald-500/20 text-emerald-400"
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">
                Anti-Hoarding Penalty
              </p>
              <p
                className={`text-sm font-semibold ${
                  isOnCooldown ? "text-rose-400" : "text-emerald-400"
                }`}
              >
                {isOnCooldown ? `Cooldown: ${cooldownHoursRemaining}h left` : "Account Clear (0 Penalties)"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
            <div className="w-9 h-9 rounded-xl bg-electric-500/20 flex items-center justify-center text-electric-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">
                Open Bounties
              </p>
              <p className="text-sm font-semibold text-white">
                {gigs.filter((g) => g.status === "OPEN").length} Available on Campus
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <GlassCard className="p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategoryFilter(cat.value)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  categoryFilter === cat.value
                    ? "bg-brand-600 text-white shadow-md shadow-brand-600/30"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
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
              <option value="OPEN">Open Gigs Only</option>
              <option value="ASSIGNED">In Progress</option>
              <option value="COMPLETED">Completed</option>
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
            const isPoster = gig.posterId === user?.id;
            const isAssignee = gig.assignedToId === user?.id;
            const canClaim = gig.status === "OPEN" && !isPoster && !isOnCooldown && myAssignedCount < 2;

            return (
              <GlassCard
                key={gig.id}
                interactive
                onClick={() => setSelectedGigForDetails(gig)}
                className="flex flex-col justify-between h-full group border-slate-200/80 dark:border-slate-800/80 hover:border-brand-500/50"
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
                          ? "success"
                          : gig.status === "ASSIGNED"
                          ? "warning"
                          : gig.status === "COMPLETED"
                          ? "brand"
                          : "danger"
                      }
                      size="sm"
                    >
                      {gig.status}
                    </Badge>
                  </div>

                  {/* Title & Budget */}
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white line-clamp-2 group-hover:text-brand-500 transition-colors">
                      {gig.title}
                    </h3>
                    <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                      {gig.description}
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-4">
                  {/* Budget & Deadline Row */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">
                        Bounty (INR)
                      </p>
                      <p className="text-lg font-extrabold text-brand-600 dark:text-brand-400">
                        {formatPaiseToRupees(gig.budget)}
                      </p>
                    </div>

                    {gig.deadline && (
                      <div className="text-right">
                        <p className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-end gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Deadline</span>
                        </p>
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {formatDate(gig.deadline)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Poster details */}
                  <div className="flex items-center justify-between pt-1">
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

                    {/* Action Quick Button */}
                    <div onClick={(e) => e.stopPropagation()}>
                      {gig.status === "OPEN" && (
                        <Button
                          variant="brand"
                          size="sm"
                          disabled={!canClaim}
                          isLoading={actionLoadingId === gig.id}
                          onClick={() => handleClaim(gig.id)}
                          title={
                            isPoster
                              ? "You posted this task"
                              : isOnCooldown
                              ? "You are on a 24h drop cooldown"
                              : myAssignedCount >= 2
                              ? "Maximum 2 active gigs concurrency reached"
                              : "Claim this task"
                          }
                        >
                          Claim Gig
                        </Button>
                      )}

                      {gig.status === "ASSIGNED" && isAssignee && (
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="danger"
                            size="sm"
                            isLoading={actionLoadingId === gig.id}
                            onClick={() => handleDrop(gig.id)}
                            title="Drop gig (applies 24h cooldown)"
                          >
                            Drop
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            isLoading={actionLoadingId === gig.id}
                            onClick={() => handleComplete(gig.id)}
                          >
                            Done
                          </Button>
                        </div>
                      )}

                      {gig.status === "COMPLETED" && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Paid</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Post a Task Gig Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Post a Task or Assignment Bounty"
        description="Fill out the requirements. Your bounty is held in peer escrow upon completion."
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
                Bounty Amount (₹ INR) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold">
                  ₹
                </span>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="2500"
                  value={budgetRupees}
                  onChange={(e) => setBudgetRupees(e.target.value)}
                  className="w-full pl-8 pr-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Attached Brief / PDF Link
              </label>
              <input
                type="url"
                placeholder="https://drive.google.com/... or Supabase URL"
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <SubmitButton isSubmitting={isSubmitting} loadingText="Publishing Bounty...">
              Post Gig Now
            </SubmitButton>
          </div>
        </form>
      </Modal>

      {/* Gig Details Drawer Modal */}
      {selectedGigForDetails && (
        <Modal
          isOpen={!!selectedGigForDetails}
          onClose={() => setSelectedGigForDetails(null)}
          title={selectedGigForDetails.title}
          maxWidth="lg"
        >
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="brand">{selectedGigForDetails.category}</Badge>
              <Badge
                variant={
                  selectedGigForDetails.status === "OPEN"
                    ? "success"
                    : selectedGigForDetails.status === "ASSIGNED"
                    ? "warning"
                    : "purple"
                }
              >
                Status: {selectedGigForDetails.status}
              </Badge>
              <span className="text-xl font-extrabold text-brand-600 dark:text-brand-400">
                {formatPaiseToRupees(selectedGigForDetails.budget)}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Specification & Requirements
              </h4>
              <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                {selectedGigForDetails.description}
              </p>
              {selectedGigForDetails.fileUrl && (
                <div className="pt-2">
                  <a
                    href={selectedGigForDetails.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline"
                  >
                    <FileText className="w-4 h-4" />
                    <span>View Attached Brief Document</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800">
                <p className="text-slate-400 uppercase font-bold text-[10px]">Posted By</p>
                <p className="font-semibold text-slate-800 dark:text-white mt-0.5">
                  {selectedGigForDetails.poster?.name}
                </p>
                <p className="text-slate-500">{selectedGigForDetails.poster?.department}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800">
                <p className="text-slate-400 uppercase font-bold text-[10px]">Assigned Freelancer</p>
                <p className="font-semibold text-slate-800 dark:text-white mt-0.5">
                  {selectedGigForDetails.assignedTo?.name || "Not yet claimed"}
                </p>
                <p className="text-slate-500">
                  {selectedGigForDetails.assignedTo?.department || "Open for bids"}
                </p>
              </div>
            </div>

            {/* Anti-Hoarding Notice */}
            <div className="p-3.5 rounded-xl bg-brand-500/10 border border-brand-500/20 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-brand-700 dark:text-brand-300">
                  Anti-Hoarding Policy:
                </span>{" "}
                Each student may actively hold up to 2 tasks concurrently. Dropping an accepted task results in an immediate 24-hour claiming cooldown to guarantee student reliability.
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setSelectedGigForDetails(null)}>
                Close
              </Button>
              {selectedGigForDetails.status === "OPEN" &&
                selectedGigForDetails.posterId !== user?.id && (
                  <Button
                    variant="brand"
                    disabled={isOnCooldown || myAssignedCount >= 2}
                    isLoading={actionLoadingId === selectedGigForDetails.id}
                    onClick={() => handleClaim(selectedGigForDetails.id)}
                  >
                    Claim Task ({formatPaiseToRupees(selectedGigForDetails.budget)})
                  </Button>
                )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
