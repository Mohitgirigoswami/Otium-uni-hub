"use client";

import React, { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { useUser } from "@/components/providers/UserContext";
import {
  getLostItems,
  createLostItem,
  markLostItemClaimed,
} from "@/actions/lost-and-found.actions";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import {
  Search,
  Plus,
  MapPin,
  Calendar,
  Mail,
  CheckCircle2,
  Sparkles,
  Camera,
  Tag,
  HelpCircle,
  ExternalLink,
} from "lucide-react";

const CATEGORIES = [
  { label: "All Items", value: "ALL" },
  { label: "Electronics & Audio", value: "ELECTRONICS" },
  { label: "ID Cards & Keys", value: "ID_CARD" },
  { label: "Wallets & Bags", value: "WALLET" },
  { label: "Books & Notes", value: "BOOK" },
  { label: "Other Belongings", value: "OTHER" },
];

export default function LostAndFoundPage() {
  const { user } = useUser();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedItemForClaim, setSelectedItemForClaim] = useState<any | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [locationFound, setLocationFound] = useState("");
  const [dateFound, setDateFound] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [category, setCategory] = useState("ELECTRONICS");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchItemsList = async () => {
    setLoading(true);
    const res = await getLostItems({
      status: statusFilter,
      category: categoryFilter,
      search: searchQuery,
    });
    if (res.success && res.data) {
      setItems(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchItemsList();
  }, [statusFilter, categoryFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchItemsList();
  };

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please login to report a found item.");
      return;
    }
    if (!title.trim() || !locationFound.trim() || !imageUrl.trim()) {
      toast.error("Please fill in the title, location, and photo URL.");
      return;
    }

    setIsSubmitting(true);
    const res = await createLostItem({
      finderId: user.id,
      title,
      description,
      locationFound,
      dateFound: dateFound || new Date().toISOString(),
      imageUrl,
      category,
    });
    setIsSubmitting(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Found item broadcasted to campus directory!");
      setIsReportModalOpen(false);
      setTitle("");
      setDescription("");
      setLocationFound("");
      setImageUrl("");
      fetchItemsList();
    }
  };

  const handleTriggerMailTo = (item: any) => {
    const finderEmail = item.finder?.email || "campus-security@uni.edu";
    const subject = encodeURIComponent(`Claim Inquiry for Lost Item: "${item.title}"`);
    const body = encodeURIComponent(
      `Hello ${item.finder?.name || "Fellow Student"},\n\nI saw your report on Otium Lost & Found regarding "${item.title}" found at ${item.locationFound}.\n\nI believe this belongs to me. Here are identifying details to verify ownership:\n[Please provide proof/serial number/description here]\n\nCan we coordinate a time to meet on campus?\n\nThank you,\n${user?.name || "Student"}`
    );
    window.location.href = `mailto:${finderEmail}?subject=${subject}&body=${body}`;
  };

  const handleMarkClaimed = async (itemId: string) => {
    if (!user) return;
    setActionLoadingId(itemId);

    const res = await markLostItemClaimed(itemId, user.id);
    setActionLoadingId(null);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Item marked as returned and claimed!");
      fetchItemsList();
      if (selectedItemForClaim) setSelectedItemForClaim(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-950/90 via-slate-900/90 to-brand-950/90 p-8 sm:p-10 border border-sky-500/30 text-white shadow-2xl backdrop-blur-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-sky-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 -mb-16 w-60 h-60 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-300 text-xs font-semibold">
              <Search className="w-3.5 h-3.5" />
              <span>Campus Belongings Recovery Network</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Lost & Found Directory
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Found a misplaced device or calculator? Upload a quick snap. Misplaced your items? Connect directly with the finder via instant one-click verification.
            </p>
          </div>

          <Button
            variant="brand"
            size="lg"
            leftIcon={<Camera className="w-5 h-5" />}
            onClick={() => setIsReportModalOpen(true)}
            className="shadow-lg shadow-sky-500/25 bg-gradient-to-r from-sky-600 to-brand-500"
          >
            Report Found Item
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <GlassCard className="p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategoryFilter(cat.value)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  categoryFilter === cat.value
                    ? "bg-sky-600 text-white shadow-md shadow-sky-600/30"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2.5 w-full lg:w-auto justify-end">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="ALL">All Items</option>
              <option value="UNCLAIMED">Unclaimed Only</option>
              <option value="CLAIMED">Returned / Claimed</option>
            </select>

            <form onSubmit={handleSearch} className="relative flex-1 sm:w-60">
              <input
                type="text"
                placeholder="Search location, item..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </form>
          </div>
        </div>
      </GlassCard>

      {/* Items Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-80 rounded-2xl bg-slate-200/50 dark:bg-slate-800/50 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <GlassCard className="text-center py-16">
          <Search className="w-12 h-12 mx-auto text-slate-400 mb-3 opacity-60" />
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">
            No items in directory
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Everything on campus seems to be with its rightful owner right now!
          </p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => {
            const isUnclaimed = item.status === "UNCLAIMED";

            return (
              <GlassCard
                key={item.id}
                interactive
                className="flex flex-col justify-between overflow-hidden p-0 border-slate-200/80 dark:border-slate-800/80 group"
              >
                {/* Photo Header with Overlay */}
                <div className="relative h-48 w-full overflow-hidden bg-slate-200 dark:bg-slate-800">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

                  <div className="absolute top-3 left-3">
                    <Badge variant={isUnclaimed ? "warning" : "success"} size="sm">
                      {isUnclaimed ? "UNCLAIMED" : "CLAIMED"}
                    </Badge>
                  </div>

                  <div className="absolute top-3 right-3">
                    <Badge variant="brand" size="sm">
                      {item.category || "ITEM"}
                    </Badge>
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <p className="text-sm font-bold truncate drop-shadow-md">{item.title}</p>
                  </div>
                </div>

                {/* Content Body */}
                <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>

                    <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                        <span className="truncate font-semibold text-slate-700 dark:text-slate-300">
                          {item.locationFound}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Found: {formatDate(item.dateFound)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Finder Info & 'This is mine' Button */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 text-[10px] uppercase font-bold">
                        Finder:
                      </span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {item.finder?.name || "Student"}
                      </span>
                    </div>

                    {isUnclaimed ? (
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="brand"
                          size="sm"
                          leftIcon={<Mail className="w-3.5 h-3.5" />}
                          onClick={() => handleTriggerMailTo(item)}
                          className="w-full text-xs"
                        >
                          This is mine
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          isLoading={actionLoadingId === item.id}
                          onClick={() => handleMarkClaimed(item.id)}
                          className="w-full text-xs"
                        >
                          Mark Found
                        </Button>
                      </div>
                    ) : (
                      <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Returned to Owner</span>
                      </div>
                    )}
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Report Found Item Modal */}
      <Modal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        title="Broadcast Found Campus Item"
        description="Provide details and a clear photograph to help the owner identify their property."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateReport} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Item Name / Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Apple AirPods Pro in Matte Green Case"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="ELECTRONICS">Electronics & Gadgets</option>
                <option value="ID_CARD">Student ID / Keys</option>
                <option value="WALLET">Wallets & Bags</option>
                <option value="BOOK">Books & Notebooks</option>
                <option value="OTHER">Other Belongings</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Exact Location Found *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Library 3rd Floor Table 22"
                value={locationFound}
                onChange={(e) => setLocationFound(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Photograph Image URL *
            </label>
            <input
              type="url"
              required
              placeholder="https://images.unsplash.com/... or Cloudinary URL"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Description & Distinct Marks *
            </label>
            <textarea
              required
              rows={3}
              placeholder="Describe color, stickers, casing condition, or any identifiable characteristics..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsReportModalOpen(false)}
            >
              Cancel
            </Button>
            <SubmitButton isSubmitting={isSubmitting} loadingText="Publishing Item...">
              Broadcast Found Item
            </SubmitButton>
          </div>
        </form>
      </Modal>
    </div>
  );
}
