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
  getIncognitoPosts,
  createIncognitoPost,
  toggleLikeIncognitoPost,
  getIncognitoProfile,
} from "@/actions/incognito.actions";
import { getOrCreateConversation } from "@/actions/chat.actions";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";
import {
  EyeOff,
  Plus,
  Heart,
  MessageSquare,
  Building2,
  Globe,
  Loader2,
  User,
  ShieldCheck,
  Maximize2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import { MultiImageUpload } from "@/components/ui/MultiImageUpload";
import { PostImageGrid } from "@/components/ui/PostImageGrid";
import { ClientServiceGuard } from "@/components/ClientServiceGuard";

const FEED_TYPES = [
  { label: "All Whispers", value: "ALL" },
  { label: "Confessions", value: "CONFESSION" },
  { label: "Campus Advice", value: "ADVICE" },
  { label: "Memes & Banter", value: "MEME" },
  { label: "Campus News", value: "CAMPUS_NEWS" },
  { label: "General", value: "GENERAL" },
];

export default function IncognitoWallPage() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedScope, setFeedScope] = useState<"CAMPUS" | "GLOBAL">("CAMPUS");
  const [feedTypeFilter, setFeedTypeFilter] = useState("ALL");
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [incognitoProfile, setIncognitoProfile] = useState<any | null>(null);

  // Long post readmore & fullscreen modal states
  const [expandedPostIds, setExpandedPostIds] = useState<Set<string>>(new Set());
  const [activeModalPost, setActiveModalPost] = useState<any | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedPostIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Form states
  const [content, setContent] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [feedType, setFeedType] = useState("CONFESSION");
  const [customHandle, setCustomHandle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [likeInProgressId, setLikeInProgressId] = useState<string | null>(null);
  const [chatLoadingId, setChatLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!userLoading && !user) {
      router.replace("/login");
    }
  }, [user, userLoading, router]);

  const fetchProfileAndFeed = async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      const [profRes, postsRes] = await Promise.all([
        getIncognitoProfile(user.id),
        getIncognitoPosts({
          feedType: feedTypeFilter === "ALL" ? undefined : feedTypeFilter,
          scope: feedScope,
          collegeId: user.collegeId || undefined,
          userId: user.id,
        }),
      ]);

      if (profRes?.success && profRes.data) {
        setIncognitoProfile(profRes.data);
        setCustomHandle(profRes.data.handle);
      }

      if (postsRes?.success && postsRes.data) {
        setPosts(postsRes.data);
      }
    } catch (err) {
      toast.error("Failed to load campus whispers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileAndFeed();
  }, [user?.id, feedScope, feedTypeFilter]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!content.trim()) {
      toast.error("Please enter whisper content.");
      return;
    }

    setIsSubmitting(true);
    const res = await createIncognitoPost({
      userId: user.id,
      collegeId: user.collegeId || undefined,
      content: content.trim(),
      mediaUrls: images,
      feedType,
    });
    setIsSubmitting(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Whisper posted to feed.");
      setIsPostModalOpen(false);
      setContent("");
      setImages([]);
      fetchProfileAndFeed();
    }
  };

  const handleToggleLike = async (postId: string) => {
    if (!user) return;
    if (likeInProgressId) return;

    // Optimistic UI update
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const wasLiked = p.isLikedByMe;
          return {
            ...p,
            isLikedByMe: !wasLiked,
            _count: {
              ...p._count,
              likes: wasLiked ? Math.max(0, p._count.likes - 1) : p._count.likes + 1,
            },
          };
        }
        return p;
      })
    );

    setLikeInProgressId(postId);
    const res = await toggleLikeIncognitoPost(postId, user.id);
    setLikeInProgressId(null);

    if (res.error) {
      toast.error(res.error);
      fetchProfileAndFeed();
    }
  };

  const handleAnonymousChat = async (targetIncognitoProfileId: string) => {
    if (!user) return;
    setChatLoadingId(targetIncognitoProfileId);
    try {
      const res = await getOrCreateConversation({
        participantOneId: user.id,
        participantTwoId: targetIncognitoProfileId,
        isAnonymousChat: true,
      });
      if (res.success && res.data) {
        router.push(`/messages?id=${res.data.id}&initialTab=whisper`);
      } else {
        toast.error(res.error || "Unable to start anonymous conversation.");
      }
    } catch {
      toast.error("Unable to start anonymous conversation.");
    } finally {
      setChatLoadingId(null);
    }
  };

  return (
    <ClientServiceGuard campusId={user?.collegeId} serviceKey="INCOGNITO_WALL">
      <div className="space-y-8 pb-12 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary text-foreground text-xs font-semibold border border-border">
              <EyeOff className="w-3.5 h-3.5 text-primary" />
              <span>Zero-Knowledge Campus Discourse</span>
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Anonymous Whisper Wall
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Pseudonymous campus confessions, advice, questions, and academic discussion.
            </p>
          </div>

          <Button
            onClick={() => setIsPostModalOpen(true)}
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Post Whisper
          </Button>
        </div>

        {/* Feed Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Campus vs Global Segment */}
          <div className="inline-flex p-1 rounded-lg border border-border bg-card">
            <button
              onClick={() => setFeedScope("CAMPUS")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                feedScope === "CAMPUS"
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-primary" />
              <span>Campus Feed</span>
            </button>
            <button
              onClick={() => setFeedScope("GLOBAL")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                feedScope === "GLOBAL"
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-primary" />
              <span>Global University Feed</span>
            </button>
          </div>

          {/* Type Filter */}
          <select
            value={feedTypeFilter}
            onChange={(e) => setFeedTypeFilter(e.target.value)}
            className="h-9 px-3 rounded-lg border border-input bg-card text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {FEED_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Whispers Feed */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 rounded-xl bg-secondary/60 animate-pulse border border-border" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <Card className="p-12 text-center space-y-3">
            <EyeOff className="w-12 h-12 text-muted-foreground mx-auto" />
            <h3 className="font-bold text-foreground text-base">No whispers in this feed</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Share the first confession, advice, or campus question anonymously.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => {
              const isLiked = post.isLikedByMe;

              return (
                <Card key={post.id} className="p-5 sm:p-6 space-y-4">
                  {/* Author Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-secondary border border-border flex items-center justify-center font-mono font-bold text-xs text-primary">
                        {post.authorHandle ? post.authorHandle[0].toUpperCase() : "A"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-foreground">
                            @{post.authorHandle || "Anonymous"}
                          </span>
                          <Badge variant="secondary" size="sm">
                            {post.feedType}
                          </Badge>
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          {formatDate(post.createdAt)}
                        </span>
                      </div>
                    </div>

                    {post.scope === "CAMPUS" && post.college && (
                      <span className="text-[11px] text-muted-foreground hidden sm:inline">
                        {post.college.name}
                      </span>
                    )}
                  </div>

                  {/* Body Content with Long Post Read More Toggle */}
                  {(() => {
                    const isExpanded = expandedPostIds.has(post.id);
                    const isLong = (post.content || "").length > 240;
                    const displayContent =
                      isLong && !isExpanded
                        ? `${post.content.slice(0, 240)}...`
                        : post.content;

                    return (
                      <div className="space-y-1.5">
                        <p className="text-xs sm:text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                          {displayContent}
                          {isLong && (
                            <button
                              type="button"
                              onClick={() => toggleExpand(post.id)}
                              className="text-primary hover:underline font-bold text-xs ml-1.5 inline-flex items-center gap-0.5 cursor-pointer align-baseline"
                            >
                              {isExpanded ? (
                                <>
                                  Show less <ChevronUp className="w-3 h-3 inline" />
                                </>
                              ) : (
                                <>
                                  Read more <ChevronDown className="w-3 h-3 inline" />
                                </>
                              )}
                            </button>
                          )}
                        </p>
                      </div>
                    );
                  })()}

                  {/* Attached Images */}
                  {post.images && post.images.length > 0 && (
                    <PostImageGrid images={post.images} />
                  )}

                  {/* Footer Actions */}
                  <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {/* Like Action */}
                      <button
                        type="button"
                        onClick={() => handleToggleLike(post.id)}
                        disabled={likeInProgressId === post.id}
                        className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                          isLiked
                            ? "text-rose-500"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
                        <span>{post._count?.likes ?? 0}</span>
                      </button>

                      {/* Comment Action */}
                      <Link
                        href={`/incognito/${post.id}`}
                        className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>{post._count?.comments ?? 0}</span>
                      </Link>

                      {/* Fullscreen Expand Action */}
                      <button
                        type="button"
                        onClick={() => setActiveModalPost(post)}
                        className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                        title="Open Fullscreen Post View"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Full View</span>
                      </button>
                    </div>

                    {/* Anonymous 1-on-1 Whisper DM */}
                    {(post.profileId || post.profile?.id) && post.profile?.userId !== user?.id && (
                      <Button
                        variant="outline"
                        size="sm"
                        isLoading={chatLoadingId === (post.profileId || post.profile?.id)}
                        onClick={() => handleAnonymousChat(post.profileId || post.profile?.id)}
                        leftIcon={<EyeOff className="w-3.5 h-3.5 text-primary" />}
                      >
                        Whisper DM
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Post Whisper Modal */}
        <Modal
          isOpen={isPostModalOpen}
          onClose={() => setIsPostModalOpen(false)}
          title="Post Anonymous Whisper"
          description="Your name and college roll number are never linked to this post."
        >
          <form onSubmit={handleCreatePost} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Category *</label>
                <select
                  value={feedType}
                  onChange={(e) => setFeedType(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-input bg-card text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="CONFESSION">Confession</option>
                  <option value="ADVICE">Campus Advice</option>
                  <option value="MEME">Meme / Banter</option>
                  <option value="CAMPUS_NEWS">Campus News</option>
                  <option value="GENERAL">General</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Pseudonym Handle</label>
                <Input
                  placeholder="e.g. Anon_9482"
                  value={customHandle}
                  onChange={(e) => setCustomHandle(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Whisper Content *</label>
              <Textarea
                placeholder="Write your anonymous confession, campus advice, or observation..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                required
              />
            </div>

            {/* Photo / Meme Attachments */}
            <MultiImageUpload
              images={images}
              onChange={(urls) => setImages(urls)}
              maxImages={4}
              label="Attach Images (Up to 4)"
            />

            <Button
              type="submit"
              size="lg"
              className="w-full"
              isLoading={isSubmitting}
            >
              Broadcast Anonymously
            </Button>
          </form>
        </Modal>

        {/* Full-Screen Post Specific Modal View */}
        {activeModalPost && (
          <Modal
            isOpen={!!activeModalPost}
            onClose={() => setActiveModalPost(null)}
            maxWidth="2xl"
            className="p-6 sm:p-8"
          >
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary border border-border flex items-center justify-center font-mono font-bold text-sm text-primary">
                    {activeModalPost.authorHandle
                      ? activeModalPost.authorHandle[0].toUpperCase()
                      : "A"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-foreground">
                        @{activeModalPost.authorHandle || "Anonymous"}
                      </span>
                      <Badge variant="secondary" size="sm">
                        {activeModalPost.feedType}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(activeModalPost.createdAt)}
                    </span>
                  </div>
                </div>

                {activeModalPost.college && (
                  <Badge variant="outline" size="sm" className="hidden sm:inline-flex">
                    {activeModalPost.college.name}
                  </Badge>
                )}
              </div>

              {/* Complete Full Text Content */}
              <div className="max-h-[50vh] overflow-y-auto pr-2">
                <p className="text-sm sm:text-base text-foreground leading-relaxed whitespace-pre-wrap select-text">
                  {activeModalPost.content}
                </p>

                {/* Attached Images in Full View */}
                {activeModalPost.images && activeModalPost.images.length > 0 && (
                  <div className="mt-4">
                    <PostImageGrid images={activeModalPost.images} />
                  </div>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="pt-4 border-t border-border flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => handleToggleLike(activeModalPost.id)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-foreground hover:text-rose-500 transition-colors cursor-pointer"
                  >
                    <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                    <span>{activeModalPost._count?.likes ?? 0} Likes</span>
                  </button>

                  <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <MessageSquare className="w-4 h-4" />
                    <span>{activeModalPost._count?.comments ?? 0} Comments</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link href={`/incognito/${activeModalPost.id}`}>
                    <Button
                      size="sm"
                      rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
                    >
                      Open Discussion Thread
                    </Button>
                  </Link>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveModalPost(null)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </ClientServiceGuard>
  );
}
