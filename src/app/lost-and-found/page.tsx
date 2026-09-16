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
  getLostItems,
  createLostItem,
  markLostItemClaimed,
} from "@/actions/lost-and-found.actions";
import { getOrCreateConversation } from "@/actions/chat.actions";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import {
  Search,
  Plus,
  MapPin,
  Calendar,
  MessageSquare,
  CheckCircle2,
  Tag,
  HelpCircle,
} from "lucide-react";
import { ImageUploadDropzone } from "@/components/ui/ImageUploadDropzone";
import { ClientServiceGuard } from "@/components/ClientServiceGuard";

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
  const router = useRouter();
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
  const [chatLoadingId, setChatLoadingId] = useState<string | null>(null);

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
      toast.error("Please sign in to report a found item.");
      return;
    }
    if (!title.trim() || !locationFound.trim() || !imageUrl.trim()) {
      toast.error("Please provide title, location found, and an item photograph.");
      return;
    }

    setIsSubmitting(true);
    const res = await createLostItem({
      finderId: user.id,
      title: title.trim(),
      description: description.trim(),
      locationFound: locationFound.trim(),
      dateFound: dateFound ? new Date(dateFound).toISOString() : new Date().toISOString(),
      imageUrl: imageUrl.trim(),
      category,
    });
    setIsSubmitting(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Found item logged. Campus peers can now verify ownership.");
      setIsReportModalOpen(false);
      setTitle("");
      setDescription("");
      setLocationFound("");
      setDateFound("");
      setImageUrl("");
      fetchItemsList();
    }
  };

  const handleContactFinder = async (finderId: string) => {
    if (!user) {
      toast.error("Please sign in to contact the finder.");
      return;
    }

    if (user.id === finderId) {
      toast.error("You reported this item.");
      return;
    }

    setChatLoadingId(finderId);
    const convRes = await getOrCreateConversation({
      participantOneId: user.id,
      participantTwoId: finderId,
    });
    setChatLoadingId(null);

    if (convRes.success && convRes.data) {
      router.push(`/messages?id=${convRes.data.id}`);
    } else {
      toast.error("Failed to connect with finder.");
    }
  };

  const handleMarkClaimed = async (id: string) => {
    if (!user) return;
    const res = await markLostItemClaimed(id, user.id);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Item marked as returned to owner.");
      fetchItemsList();
    }
  };

  return (
    <ClientServiceGuard campusId={user?.collegeId} serviceKey="LOST_AND_FOUND">
      <div className="space-y-8 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary text-foreground text-xs font-semibold border border-border">
              <Search className="w-3.5 h-3.5 text-primary" />
              <span>Campus Recovery Directory</span>
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Lost & Found Directory
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Catalog of misplaced cards, calculators, headphones, and keys found across campus grounds.
            </p>
          </div>

          <Button
            onClick={() => setIsReportModalOpen(true)}
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Report Found Item
          </Button>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <Input
              type="text"
              placeholder="Search by item name or location..."
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
              <option value="UNCLAIMED">Unclaimed</option>
              <option value="CLAIMED">Returned</option>
            </select>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-72 rounded-xl bg-secondary/60 animate-pulse border border-border" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <Card className="p-12 text-center space-y-3">
            <HelpCircle className="w-12 h-12 text-muted-foreground mx-auto" />
            <h3 className="font-bold text-foreground text-base">No reported items match criteria</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              If you found something on campus, report it so the owner can reclaim it.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {items.map((item) => {
              const isFinder = user?.id === item.finderId;
              const isClaimed = item.status === "CLAIMED";

              return (
                <Card
                  key={item.id}
                  interactive
                  className="flex flex-col justify-between overflow-hidden"
                >
                  <div>
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
                          variant={isClaimed ? "secondary" : "default"}
                          size="sm"
                        >
                          {isClaimed ? "Returned" : "Unclaimed"}
                        </Badge>
                      </div>
                    </div>

                    <div className="p-4 space-y-2">
                      <h3 className="font-heading font-bold text-sm text-foreground truncate">
                        {item.title}
                      </h3>

                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5 truncate">
                          <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                          <span className="truncate">{item.locationFound}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                          <span>{formatDate(item.dateFound)}</span>
                        </div>
                      </div>

                      {item.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed pt-1">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="p-4 pt-0 border-t border-border/40 mt-3 flex items-center justify-between gap-2">
                    {isFinder ? (
                      !isClaimed && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => handleMarkClaimed(item.id)}
                        >
                          Mark as Returned
                        </Button>
                      )
                    ) : (
                      <Button
                        size="sm"
                        className="w-full"
                        disabled={isClaimed}
                        isLoading={chatLoadingId === item.finderId}
                        onClick={() => handleContactFinder(item.finderId)}
                        leftIcon={<MessageSquare className="w-3.5 h-3.5" />}
                      >
                        {isClaimed ? "Returned to Owner" : "Claim / Contact Finder"}
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Report Modal */}
        <Modal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          title="Report a Found Item"
          description="Log item details so the student owner can identify and verify ownership."
        >
          <form onSubmit={handleCreateReport} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Item Name *</label>
              <Input
                placeholder="e.g. Casio fx-991EX Scientific Calculator"
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
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-input bg-card text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="ELECTRONICS">Electronics & Audio</option>
                  <option value="ID_CARD">ID Cards & Keys</option>
                  <option value="WALLET">Wallets & Bags</option>
                  <option value="BOOK">Books & Notes</option>
                  <option value="OTHER">Other Belongings</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Date Found *</label>
                <Input
                  type="date"
                  value={dateFound}
                  onChange={(e) => setDateFound(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Location Found *</label>
              <Input
                placeholder="e.g. Library 2nd Floor Reading Room or Canteen Table 4"
                value={locationFound}
                onChange={(e) => setLocationFound(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Details / Identifiers</label>
              <Textarea
                placeholder="State identifiable traits (color, cover sticker, or desk location)..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <ImageUploadDropzone
              label="Photograph of Found Item *"
              onImageUploaded={(url) => setImageUrl(url)}
              existingImageUrl={imageUrl}
              folder="otium_lost_found"
              required
            />

            <Button
              type="submit"
              size="lg"
              className="w-full"
              isLoading={isSubmitting}
            >
              Publish to Lost & Found Board
            </Button>
          </form>
        </Modal>
      </div>
    </ClientServiceGuard>
  );
}
