"use client";

import React, { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { useUser } from "@/components/providers/UserContext";
import {
  getMarketplaceItems,
  createMarketplaceItem,
  markItemSold,
  deleteMarketplaceItem,
} from "@/actions/marketplace.actions";
import { getOrCreateConversation } from "@/actions/chat.actions";
import { useRouter } from "next/navigation";
import { formatPaiseToRupees, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import {
  ShoppingBag,
  Plus,
  Tag,
  Search,
  CheckCircle2,
  Trash2,
  Phone,
  Mail,
  Filter,
  Sparkles,
  ExternalLink,
  MessageSquare,
  DollarSign,
} from "lucide-react";
import { MarketplaceCategoryType, ItemConditionType } from "@/lib/types";
import { ImageUploadDropzone } from "@/components/ui/ImageUploadDropzone";

const CATEGORIES: { label: string; value: string }[] = [
  { label: "All Items", value: "ALL" },
  { label: "📚 Books & Notes", value: "BOOKS_NOTES" },
  { label: "💻 Electronics & Gadgets", value: "ELECTRONICS" },
  { label: "🚲 Cycles & Mobility", value: "CYCLES_TRANSPORT" },
  { label: "🪑 Hostel Furniture", value: "FURNITURE" },
  { label: "🎒 Hostel Essentials", value: "HOSTEL_ESSENTIALS" },
  { label: "👕 Apparel & Merch", value: "CLOTHING" },
  { label: "Other", value: "OTHER" },
];

const CONDITIONS = [
  { label: "Brand New (Unopened)", value: "BRAND_NEW" },
  { label: "Like New (Mint)", value: "LIKE_NEW" },
  { label: "Good Condition", value: "GOOD" },
  { label: "Fair / Used", value: "FAIR" },
];

export default function MarketplacePage() {
  const { user } = useUser();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [selectedItemForDetails, setSelectedItemForDetails] = useState<any | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceRupees, setPriceRupees] = useState("");
  const [category, setCategory] = useState<MarketplaceCategoryType>("BOOKS_NOTES");
  const [condition, setCondition] = useState<ItemConditionType>("LIKE_NEW");
  const [imageUrl, setImageUrl] = useState("");
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchItemsList = async () => {
    setLoading(true);
    const res = await getMarketplaceItems({
      category: categoryFilter,
      status: statusFilter,
      search: searchQuery,
    });
    if (res.success && res.data) {
      setItems(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchItemsList();
  }, [categoryFilter, statusFilter]);

  const router = useRouter();
  const [chatLoading, setChatLoading] = useState(false);

  const handleDirectMessageSeller = async (sellerId: string) => {
    if (!user) {
      toast.error("Please login to message the seller.");
      return;
    }
    if (user.id === sellerId) {
      toast.info("This is your own listing!");
      return;
    }

    setChatLoading(true);
    const res = await getOrCreateConversation({
      participantOneId: user.id,
      participantTwoId: sellerId,
      isAnonymousChat: false,
    });
    setChatLoading(false);

    if (res.success && res.data) {
      toast.success("Opening chat with seller...");
      router.push(`/messages?id=${res.data.id}`);
    } else {
      toast.error(res.error || "Failed to start chat.");
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchItemsList();
  };

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please login to list an item.");
      return;
    }
    if (!title.trim() || !description.trim() || !priceRupees) {
      toast.error("Please fill in the title, description, and price.");
      return;
    }

    setIsSubmitting(true);
    const res = await createMarketplaceItem({
      sellerId: user.id,
      title,
      description,
      priceRupees: Number(priceRupees),
      category,
      condition,
      images: imageUrl.trim() ? [imageUrl.trim()] : [],
    });
    setIsSubmitting(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Listing published on Student Marketplace!");
      setIsSellModalOpen(false);
      setTitle("");
      setDescription("");
      setPriceRupees("");
      setImageUrl("");
      fetchItemsList();
    }
  };

  const handleMarkSold = async (itemId: string) => {
    if (!user) return;
    setActionLoadingId(itemId);
    const res = await markItemSold(itemId, user.id);
    setActionLoadingId(null);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Item marked as SOLD!");
      fetchItemsList();
      if (selectedItemForDetails) setSelectedItemForDetails(null);
    }
  };

  const handleDeleteListing = async (itemId: string) => {
    if (!user) return;
    if (!window.confirm("Are you sure you want to delete this listing?")) return;

    setActionLoadingId(itemId);
    const res = await deleteMarketplaceItem(itemId, user.id);
    setActionLoadingId(null);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Listing removed.");
      fetchItemsList();
      if (selectedItemForDetails) setSelectedItemForDetails(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-950/90 via-slate-900/90 to-brand-950/90 p-8 sm:p-10 border border-amber-500/30 text-white shadow-2xl backdrop-blur-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 -mb-16 w-60 h-60 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-semibold">
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Campus Peer-to-Peer Marketplace</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Student Trade & Gear Exchange
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Buy and sell engineering textbooks, gear bicycles, hostel mini-fridges, and electronics with fellow students on campus at unbeatable rates.
            </p>
          </div>

          <Button
            variant="brand"
            size="lg"
            leftIcon={<Plus className="w-5 h-5" />}
            onClick={() => setIsSellModalOpen(true)}
            className="shadow-lg shadow-amber-500/25 bg-gradient-to-r from-amber-600 to-brand-500"
          >
            Sell an Item
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
                    ? "bg-amber-600 text-white shadow-md shadow-amber-600/30"
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
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="ALL">All Listings</option>
              <option value="AVAILABLE">Available Only</option>
              <option value="SOLD">Sold Archive</option>
            </select>

            <form onSubmit={handleSearch} className="relative flex-1 sm:w-60">
              <input
                type="text"
                placeholder="Search items, books..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <Filter className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </form>
          </div>
        </div>
      </GlassCard>

      {/* Items Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-80 rounded-2xl bg-slate-200/50 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <GlassCard className="text-center py-16">
          <ShoppingBag className="w-12 h-12 mx-auto text-slate-400 mb-3 opacity-60" />
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">
            No marketplace items found
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Got an old textbook or bicycle? Post your listing and cash in!
          </p>
          <Button
            variant="brand"
            size="sm"
            className="mt-4 bg-amber-600 hover:bg-amber-500"
            onClick={() => setIsSellModalOpen(true)}
          >
            Sell Your Item
          </Button>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => {
            const isSeller = item.sellerId === user?.id;
            const isAvailable = item.status === "AVAILABLE";
            const img = item.images?.[0] || "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=500&auto=format&fit=crop&q=80";

            return (
              <GlassCard
                key={item.id}
                interactive
                onClick={() => setSelectedItemForDetails(item)}
                className="flex flex-col justify-between overflow-hidden p-0 border-slate-200/80 dark:border-slate-800/80 hover:border-amber-500/50 group"
              >
                {/* Photo Header */}
                <div className="relative h-48 w-full overflow-hidden bg-slate-200 dark:bg-slate-800">
                  <img
                    src={img}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

                  <div className="absolute top-3 left-3">
                    <Badge variant={isAvailable ? "success" : "danger"} size="sm">
                      {item.status}
                    </Badge>
                  </div>

                  <div className="absolute top-3 right-3">
                    <Badge variant="brand" size="sm">
                      {item.condition?.replace("_", " ")}
                    </Badge>
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 flex items-baseline justify-between text-white">
                    {/* Convert Price integer (Paise) back to Rupee (price / 100) */}
                    <span className="text-xl font-black drop-shadow-md text-amber-300">
                      {formatPaiseToRupees(item.price)}
                    </span>
                    <span className="text-[11px] text-slate-300 font-medium">
                      {item.category?.replace("_", " ")}
                    </span>
                  </div>
                </div>

                {/* Content Body */}
                <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-amber-500 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  {/* Seller & Action */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <img
                          src={
                            item.seller?.image ||
                            `https://api.dicebear.com/9.x/bottts/svg?seed=${item.seller?.name || "Seller"}`
                          }
                          alt="Seller"
                          className="w-5 h-5 rounded-full object-cover"
                        />
                        <span className="text-slate-600 dark:text-slate-400 font-medium truncate max-w-[120px]">
                          {item.seller?.name}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {formatDate(item.createdAt)}
                      </span>
                    </div>

                    <div onClick={(e) => e.stopPropagation()}>
                      {isSeller ? (
                        <div className="flex items-center gap-2">
                          {isAvailable && (
                            <Button
                              variant="brand"
                              size="sm"
                              isLoading={actionLoadingId === item.id}
                              onClick={() => handleMarkSold(item.id)}
                              className="w-full bg-amber-600 hover:bg-amber-500 text-xs"
                            >
                              Mark Sold
                            </Button>
                          )}
                          <button
                            onClick={() => handleDeleteListing(item.id)}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Delete listing"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <Button
                          variant="brand"
                          size="sm"
                          onClick={() => setSelectedItemForDetails(item)}
                          className="w-full bg-amber-600 hover:bg-amber-500 text-xs"
                        >
                          View & Buy ({formatPaiseToRupees(item.price)})
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Sell an Item Modal */}
      <Modal
        isOpen={isSellModalOpen}
        onClose={() => setIsSellModalOpen(false)}
        title="List an Item for Campus Sale"
        description="Sell to students in your hostels or campus community directly."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateListing} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Item Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Hero Sprint 21-Speed Mountain Bike with Lock"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as MarketplaceCategoryType)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="BOOKS_NOTES">Books & Notes</option>
                <option value="ELECTRONICS">Electronics</option>
                <option value="CYCLES_TRANSPORT">Cycles & Mobility</option>
                <option value="FURNITURE">Hostel Furniture</option>
                <option value="HOSTEL_ESSENTIALS">Hostel Essentials</option>
                <option value="CLOTHING">Apparel & Merch</option>
                <option value="OTHER">Other Item</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Condition *
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as ItemConditionType)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {CONDITIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Price (₹ INR) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold">
                  ₹
                </span>
                <input
                  type="number"
                  min="0"
                  required
                  placeholder="850"
                  value={priceRupees}
                  onChange={(e) => setPriceRupees(e.target.value)}
                  className="w-full pl-8 pr-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Direct-to-Cloud Image Dropzone */}
          <ImageUploadDropzone
            onImageUploaded={(url) => setImageUrl(url)}
            onUploadingChange={(up) => setIsUploadingMedia(up)}
            existingImageUrl={imageUrl}
            label="Upload Item Photograph (Direct to Cloudinary)"
            folder="otium_marketplace"
          />

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Description & Specifications *
            </label>
            <textarea
              required
              rows={4}
              placeholder="Describe condition, accessories included, reason for selling, and pickup hostel location..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={isUploadingMedia || isSubmitting}
              onClick={() => setIsSellModalOpen(false)}
            >
              Cancel
            </Button>
            <SubmitButton
              disabled={isUploadingMedia || isSubmitting}
              isSubmitting={isSubmitting || isUploadingMedia}
              loadingText={isUploadingMedia ? "Uploading to Cloudinary..." : "Publishing Listing..."}
              className="bg-amber-600 hover:bg-amber-500"
            >
              Publish Listing
            </SubmitButton>
          </div>
        </form>
      </Modal>

      {/* Item Details Modal */}
      {selectedItemForDetails && (
        <Modal
          isOpen={!!selectedItemForDetails}
          onClose={() => setSelectedItemForDetails(null)}
          title={selectedItemForDetails.title}
          maxWidth="lg"
        >
          <div className="space-y-6">
            {/* Image Preview */}
            <div className="relative h-64 w-full rounded-2xl overflow-hidden bg-slate-900">
              <img
                src={
                  selectedItemForDetails.images?.[0] ||
                  "https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=600&auto=format&fit=crop&q=80"
                }
                alt={selectedItemForDetails.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl text-amber-300 font-extrabold text-lg">
                {formatPaiseToRupees(selectedItemForDetails.price)}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="brand">{selectedItemForDetails.category?.replace("_", " ")}</Badge>
              <Badge variant="neutral">Condition: {selectedItemForDetails.condition?.replace("_", " ")}</Badge>
              <Badge variant={selectedItemForDetails.status === "AVAILABLE" ? "success" : "danger"}>
                {selectedItemForDetails.status}
              </Badge>
            </div>

            <div className="p-4 rounded-2xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Item Description
              </h4>
              <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                {selectedItemForDetails.description}
              </p>
            </div>

            {/* Seller Contact Info */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 space-y-2">
              <p className="text-slate-400 uppercase font-bold text-[10px]">Seller Information</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-slate-900 dark:text-white">
                    {selectedItemForDetails.seller?.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {selectedItemForDetails.seller?.department}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    disabled={chatLoading}
                    onClick={() => handleDirectMessageSeller(selectedItemForDetails.sellerId)}
                    className="bg-brand-600 hover:bg-brand-500 text-xs"
                    leftIcon={<MessageSquare className="w-3.5 h-3.5" />}
                  >
                    {chatLoading ? "Connecting..." : `Message ${selectedItemForDetails.seller?.name?.split(" ")[0] || "Seller"}`}
                  </Button>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setSelectedItemForDetails(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
