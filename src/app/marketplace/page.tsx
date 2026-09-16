"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Search,
  CheckCircle2,
  Trash2,
  Phone,
  MessageSquare,
  Tag,
  Filter,
} from "lucide-react";
import { MarketplaceCategoryType, ItemConditionType } from "@/lib/types";
import { ImageUploadDropzone } from "@/components/ui/ImageUploadDropzone";
import { ClientServiceGuard } from "@/components/ClientServiceGuard";

const CATEGORIES: { label: string; value: string }[] = [
  { label: "All Items", value: "ALL" },
  { label: "Books & Notes", value: "BOOKS_NOTES" },
  { label: "Electronics & Gadgets", value: "ELECTRONICS" },
  { label: "Cycles & Transport", value: "CYCLES_TRANSPORT" },
  { label: "Hostel Furniture", value: "FURNITURE" },
  { label: "Hostel Essentials", value: "HOSTEL_ESSENTIALS" },
  { label: "Apparel & Merch", value: "CLOTHING" },
  { label: "Other", value: "OTHER" },
];

const CONDITIONS = [
  { label: "Brand New", value: "BRAND_NEW" },
  { label: "Like New (Mint)", value: "LIKE_NEW" },
  { label: "Good Condition", value: "GOOD" },
  { label: "Fair / Used", value: "FAIR" },
];

export default function MarketplacePage() {
  const { user } = useUser();
  const router = useRouter();
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
  const [sellerPhone, setSellerPhone] = useState(user?.phone || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [chatLoadingId, setChatLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.phone && !sellerPhone) {
      setSellerPhone(user.phone);
    }
  }, [user?.phone]);

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchItemsList();
  };

  const handlePostItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in to list an item for sale.");
      return;
    }

    const price = Number(priceRupees);
    if (!price || price <= 0) {
      toast.error("Please enter a valid price in Rupees.");
      return;
    }

    setIsSubmitting(true);
    const res = await createMarketplaceItem({
      sellerId: user.id,
      title: title.trim(),
      description: description.trim(),
      priceRupees: price,
      category,
      condition,
      images: imageUrl.trim() ? [imageUrl.trim()] : [],
      sellerPhone: sellerPhone.trim() || undefined,
    });
    setIsSubmitting(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Listing published to campus board.");
      setIsSellModalOpen(false);
      setTitle("");
      setDescription("");
      setPriceRupees("");
      setImageUrl("");
      fetchItemsList();
    }
  };

  const handleMessageSeller = async (sellerId: string) => {
    if (!user) {
      toast.error("Please sign in to message the seller.");
      return;
    }

    if (user.id === sellerId) {
      toast.error("You are the seller of this listing.");
      return;
    }

    setChatLoadingId(sellerId);
    const convRes = await getOrCreateConversation({
      participantOneId: user.id,
      participantTwoId: sellerId,
    });
    setChatLoadingId(null);

    if (convRes.success && convRes.data) {
      router.push(`/messages?id=${convRes.data.id}`);
    } else {
      toast.error("Failed to connect with seller.");
    }
  };

  const handleMarkSold = async (id: string) => {
    if (!user) return;
    const res = await markItemSold(id, user.id);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Item marked as sold.");
      fetchItemsList();
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    if (!confirm("Delete this marketplace listing?")) return;

    const res = await deleteMarketplaceItem(id, user.id);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Listing removed.");
      fetchItemsList();
    }
  };

  return (
    <ClientServiceGuard campusId={user?.collegeId} serviceKey="MARKETPLACE">
      <div className="space-y-8 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary text-foreground text-xs font-semibold border border-border">
              <ShoppingBag className="w-3.5 h-3.5 text-primary" />
              <span>Campus Peer Classifieds</span>
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Student Marketplace
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Buy and sell textbooks, electronics, cycles, and hostel room supplies directly with campus peers.
            </p>
          </div>

          <Button
            onClick={() => setIsSellModalOpen(true)}
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
          >
            List an Item
          </Button>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <Input
              type="text"
              placeholder="Search by title, author, or keyword..."
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
              <option value="ALL">All Items</option>
              <option value="AVAILABLE">Available</option>
              <option value="SOLD">Sold</option>
            </select>
          </div>
        </div>

        {/* Items Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="h-72 rounded-xl bg-secondary/60 animate-pulse border border-border" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <Card className="p-12 text-center space-y-3">
            <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto" />
            <h3 className="font-bold text-foreground text-base">No items found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Be the first to list an item for sale in this category.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {items.map((item) => {
              const isOwner = user?.id === item.sellerId;
              const isSold = item.status === "SOLD";

              return (
                <Card
                  key={item.id}
                  interactive
                  className="flex flex-col justify-between overflow-hidden"
                >
                  <div>
                    {/* Item Image / Fallback */}
                    <div className="relative aspect-video w-full bg-secondary/50 overflow-hidden border-b border-border">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <Tag className="w-8 h-8 opacity-40" />
                        </div>
                      )}

                      <div className="absolute top-2 left-2">
                        <Badge
                          variant={isSold ? "secondary" : "default"}
                          size="sm"
                        >
                          {isSold ? "Sold" : "Available"}
                        </Badge>
                      </div>

                      <div className="absolute top-2 right-2">
                        <Badge variant="outline" size="sm" className="bg-card/80 backdrop-blur-sm">
                          {item.condition.replace(/_/g, " ")}
                        </Badge>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-2">
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="font-heading font-bold text-sm text-foreground truncate">
                          {item.title}
                        </h3>
                        <span className="font-heading font-extrabold text-sm text-foreground flex-shrink-0">
                          {formatPaiseToRupees(item.price ?? item.pricePaise)}
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>

                      <div className="text-[11px] text-muted-foreground pt-1">
                        Seller: {item.seller?.name || "Student"} | {formatDate(item.createdAt)}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="p-4 pt-0 border-t border-border/40 mt-3 flex items-center justify-between gap-2">
                    {isOwner ? (
                      <div className="flex items-center gap-2 w-full">
                        {!isSold && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleMarkSold(item.id)}
                          >
                            Mark Sold
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        className="w-full"
                        disabled={isSold}
                        isLoading={chatLoadingId === item.sellerId}
                        onClick={() => handleMessageSeller(item.sellerId)}
                        leftIcon={<MessageSquare className="w-3.5 h-3.5" />}
                      >
                        {isSold ? "Item Sold" : "Message Seller"}
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* List Item Modal */}
        <Modal
          isOpen={isSellModalOpen}
          onClose={() => setIsSellModalOpen(false)}
          title="List Item for Sale"
          description="Direct peer-to-peer campus classifieds. Zero commission."
        >
          <form onSubmit={handlePostItem} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Item Title *</label>
              <Input
                placeholder="e.g. Engineering Mathematics Volume 2 (B.S. Grewal)"
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
                  onChange={(e) => setCategory(e.target.value as MarketplaceCategoryType)}
                  className="w-full h-9 px-3 rounded-lg border border-input bg-card text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="BOOKS_NOTES">Books & Notes</option>
                  <option value="ELECTRONICS">Electronics & Gadgets</option>
                  <option value="CYCLES_TRANSPORT">Cycles & Transport</option>
                  <option value="FURNITURE">Hostel Furniture</option>
                  <option value="HOSTEL_ESSENTIALS">Hostel Essentials</option>
                  <option value="CLOTHING">Apparel & Merch</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Condition *</label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as ItemConditionType)}
                  className="w-full h-9 px-3 rounded-lg border border-input bg-card text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {CONDITIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Price (₹ INR) *</label>
                <Input
                  type="number"
                  min="10"
                  placeholder="e.g. 450"
                  value={priceRupees}
                  onChange={(e) => setPriceRupees(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Contact Phone (Optional)</label>
                <Input
                  type="tel"
                  placeholder="10-digit number"
                  value={sellerPhone}
                  onChange={(e) => setSellerPhone(e.target.value)}
                  maxLength={10}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Description *</label>
              <Textarea
                placeholder="Mention edition, usage history, included accessories, or pickup location..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                required
              />
            </div>

            {/* Photo dropzone */}
            <ImageUploadDropzone
              label="Item Photograph (Optional)"
              onImageUploaded={(url) => setImageUrl(url)}
              existingImageUrl={imageUrl}
              folder="otium_marketplace"
            />

            <Button
              type="submit"
              size="lg"
              className="w-full"
              isLoading={isSubmitting}
            >
              Publish Listing
            </Button>
          </form>
        </Modal>
      </div>
    </ClientServiceGuard>
  );
}
