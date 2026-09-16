"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useUser } from "@/components/providers/UserContext";
import { getGigs, createGig } from "@/actions/gigs.actions";
import { getPlatformSettingsAction } from "@/actions/platform.actions";
import { calculateEscrow } from "@/lib/escrow-math";
import { formatPaiseToRupees, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import {
  Briefcase,
  Plus,
  Clock,
  CheckCircle2,
  AlertOctagon,
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  Building2,
} from "lucide-react";
import { TaskCategoryType } from "@/lib/types";
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
  const [buyerDiscountPct, setBuyerDiscountPct] = useState(5);
  const [isPending, startTransition] = useTransition();

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budgetRupees, setBudgetRupees] = useState("");
  const [category, setCategory] = useState<TaskCategoryType>("ASSIGNMENT");
  const [deadline, setDeadline] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    getPlatformSettingsAction().then((res) => {
      if (res.success && res.data) {
        setBuyerDiscountPct(res.data.buyerDiscountPct ?? 5);
      }
    });
  }, []);

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
      toast.error("Please sign in to post a task.");
      return;
    }

    const price = Number(budgetRupees);
    if (!price || price < 50) {
      toast.error("Minimum task bounty is ₹50.");
      return;
    }

    setIsSubmitting(true);
    const res = await createGig({
      posterId: user.id,
      collegeId: user.collegeId || undefined,
      title: title.trim(),
      description: description.trim(),
      budgetRupees: price,
      category,
      deadline: deadline || undefined,
    });
    setIsSubmitting(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Task posted with escrow protection.");
      setIsCreateModalOpen(false);
      setTitle("");
      setDescription("");
      setBudgetRupees("");
      setDeadline("");
      fetchGigsList();
    }
  };

  return (
    <ClientServiceGuard campusId={user?.collegeId} serviceKey="GIG_HUB">
      <div className="space-y-8 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary text-foreground text-xs font-semibold border border-border">
              <Briefcase className="w-3.5 h-3.5 text-primary" />
              <span>Campus Escrow Marketplace</span>
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Peer Freelance Gigs
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Campus assignments, coding projects, and tutoring with locked proxy escrow safeguards.
            </p>
          </div>

          <Button
            onClick={() => setIsCreateModalOpen(true)}
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Post a Task
          </Button>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <Input
              type="text"
              placeholder="Search by task title or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button type="submit" variant="secondary">
              <Search className="w-4 h-4" />
            </Button>
          </form>

          <div className="flex items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-9 px-3 rounded-lg border border-input bg-card text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-3 rounded-lg border border-input bg-card text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open (Claimable)</option>
              <option value="ASSIGNED">In Progress</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>
        </div>

        {/* Gigs List Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-56 rounded-xl bg-secondary/60 animate-pulse border border-border" />
            ))}
          </div>
        ) : gigs.length === 0 ? (
          <Card className="p-12 text-center space-y-3">
            <Briefcase className="w-12 h-12 text-muted-foreground mx-auto" />
            <h3 className="font-bold text-foreground text-base">No tasks match your search</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Try adjusting your category filter, or post a new bounty for other campus peers to solve.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {gigs.map((gig) => {
              const isOpen = gig.status === "OPEN";
              return (
                <Card
                  key={gig.id}
                  interactive
                  className="p-5 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant={isOpen ? "default" : "secondary"} size="sm">
                        {gig.status}
                      </Badge>
                      <span className="font-heading font-extrabold text-base text-foreground">
                        {formatPaiseToRupees(gig.budget ?? gig.budgetPaise)}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h3 className="font-heading font-bold text-sm text-foreground line-clamp-2">
                        {gig.title}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                        {gig.description}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-border/60">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{gig.category}</span>
                      <span>{gig.deadline ? formatDate(gig.deadline) : "Flexible"}</span>
                    </div>

                    <Link href={`/gigs/${gig.id}`} className="block">
                      <Button variant="outline" size="sm" className="w-full">
                        View Task Details
                      </Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Post Gig Modal */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Post a Campus Task"
          description="Funds will be locked in proxy escrow until deliverables are confirmed."
        >
          <form onSubmit={handleCreateGig} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Task Title *</label>
              <Input
                placeholder="e.g. Build React Login Page or Debug Python Script"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as TaskCategoryType)}
                  className="w-full h-9 px-3 rounded-lg border border-input bg-card text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="CODING">Coding & Dev</option>
                  <option value="ASSIGNMENT">Assignments & Reports</option>
                  <option value="DESIGN">UI/UX & Design</option>
                  <option value="PROJECT">Projects & Lab Work</option>
                  <option value="RESEARCH">Research & Summaries</option>
                  <option value="TUTORING">Tutoring & Doubts</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Budget (₹ INR) *</label>
                <Input
                  type="number"
                  min="50"
                  placeholder="Min 50"
                  value={budgetRupees}
                  onChange={(e) => setBudgetRupees(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Deadline (Optional)</label>
              <Input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Detailed Description *</label>
              <Textarea
                placeholder="Explain the assignment specifications, tech stack, and deliverable format..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                required
              />
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              isLoading={isSubmitting}
            >
              Post Task to Campus Board
            </Button>
          </form>
        </Modal>
      </div>
    </ClientServiceGuard>
  );
}
