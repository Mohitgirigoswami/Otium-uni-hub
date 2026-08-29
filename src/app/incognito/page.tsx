"use client";

import React, { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { useUser } from "@/components/providers/UserContext";
import {
  getIncognitoPosts,
  createIncognitoPost,
  toggleLikeIncognitoPost,
  setupIncognitoProfile,
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
  Sparkles,
  Shield,
  RefreshCw,
  MessageSquare,
  Building2,
  Globe,
  ChevronRight,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { MultiImageUpload } from "@/components/ui/MultiImageUpload";
import { PostImageGrid } from "@/components/ui/PostImageGrid";
import { ClientServiceGuard } from "@/components/ClientServiceGuard";

const FEED_TYPES = [
  { label: "All Whispers", value: "ALL" },
  { label: "🔥 Confessions", value: "CONFESSION" },
  { label: "💡 Campus Advice", value: "ADVICE" },
  { label: "😂 Memes & Banter", value: "MEME" },
  { label: "📢 Campus News", value: "CAMPUS_NEWS" },
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
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [incognitoProfile, setIncognitoProfile] = useState<any | null>(null);

  // Post form states (2-4 Multi-Images)
  const [content, setContent] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [feedType, setFeedType] = useState("CONFESSION");
  const [customHandle, setCustomHandle] = useState("");
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Anti-spam like tracking state
  const [likeInProgressId, setLikeInProgressId] = useState<string | null>(null);
  const [chatLoadingId, setChatLoadingId] = useState<string | null>(null);
  const [expandedPosts, setExpandedPosts] = useState<Record<string, boolean>>({});

  // TASK 3: Frontend Route Protection (Auth Guards)
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
      } else {
        setPosts([]);
      }
    } catch (err) {
      console.error("Error fetching incognito feed:", err);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchProfileAndFeed();
    }
  }, [user?.id, user?.collegeId, feedScope, feedTypeFilter]);

  const handlePublishPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    if (!content.trim()) {
      toast.error("Please enter a whisper or confession.");
      return;
    }

    setIsSubmitting(true);
    const res = await createIncognitoPost({
      userId: user.id,
      content,
      mediaUrls: images,
      mediaUrl: images.length > 0 ? images[0] : undefined,
      feedType,
      collegeId: user.collegeId,
    });
    setIsSubmitting(false);

    if (!res?.success || res?.error) {
      toast.error(res?.error || "Failed to publish whisper.");
    } else {
      toast.success("Whisper published anonymously onto the wall!");
      setIsPostModalOpen(false);
      setContent("");
      setImages([]);
      fetchProfileAndFeed();
    }
  };

  const handleDirectMessageAnonymous = async (targetUserId: string, postHandle: string) => {
    if (!user?.id) {
      toast.error("Please login to message anonymously.");
      return;
    }
    if (user.id === targetUserId) {
      toast.info("This is your own whisper post!");
      return;
    }

    setChatLoadingId(targetUserId);
    const res = await getOrCreateConversation({
      participantOneId: user.id,
      participantTwoId: targetUserId,
      isAnonymousChat: true,
    });
    setChatLoadingId(null);

    if (res?.success && res.data) {
      toast.success(`Opening zero-knowledge anonymous chat with @${postHandle}...`);
      router.push(`/messages?id=${res.data.id}`);
    } else {
      toast.error(res?.error || "Failed to start anonymous chat.");
    }
  };

  const handleUpdateAlias = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    if (!customHandle.trim()) {
      toast.error("Please enter a pseudonym handle.");
      return;
    }

    setIsSubmitting(true);
    const res = await setupIncognitoProfile(user.id, customHandle);
    setIsSubmitting(false);

    if (!res?.success || res?.error) {
      toast.error(res?.error || "Failed to update pseudonym alias.");
    } else {
      toast.success("Incognito alias & Bottts avatar updated!");
      if (res.data) setIncognitoProfile(res.data);
      setIsProfileModalOpen(false);
      fetchProfileAndFeed();
    }
  };

  // TASK 2: Like Action with Safe Optional Chaining
  const handleToggleLike = async (postId: string) => {
    if (!user?.id) {
      toast.error("Please login to like whispers.");
      return;
    }
    if (likeInProgressId === postId) return;

    setLikeInProgressId(postId);

    // Optimistic UI Update
    const currentPost = posts.find((p) => p.id === postId);
    if (!currentPost) {
      setLikeInProgressId(null);
      return;
    }

    const userHasLiked = currentPost.likes?.some((l: any) => l.userId === user.id);
    const updatedLikes = userHasLiked
      ? currentPost.likes.filter((l: any) => l.userId !== user.id)
      : [...(currentPost.likes || []), { userId: user.id }];
    const updatedCount = userHasLiked
      ? Math.max(0, currentPost.likesCount - 1)
      : currentPost.likesCount + 1;

    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, likes: updatedLikes, likesCount: updatedCount } : p
      )
    );

    const res = await toggleLikeIncognitoPost(postId, user.id);
    setLikeInProgressId(null);

    if (res?.success && res.data) {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, likesCount: res.data!.likesCount } : p
        )
      );
    } else {
      // Revert if error
      fetchProfileAndFeed();
      toast.error(res?.error || "Failed to update like status.");
    }
  };

  const toggleExpand = (postId: string) => {
    setExpandedPosts((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  // Auth loading state
  if (userLoading || !user) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
        <p className="text-xs font-bold text-slate-400">Verifying campus session...</p>
      </div>
    );
  }

  const activeAvatarUrl =
    incognitoProfile?.avatarUrl ||
    `https://api.dicebear.com/9.x/bottts/svg?seed=AnonRobot`;

  return (
    <ClientServiceGuard campusId={user?.collegeId} serviceKey="INCOGNITO_WALL">
      <div className="space-y-8 max-w-6xl mx-auto pb-16">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-950/90 via-slate-900/90 to-electric-950/90 p-8 sm:p-10 border border-purple-500/30 text-white shadow-2xl backdrop-blur-2xl">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 -mb-16 w-60 h-60 bg-electric-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 text-xs font-semibold">
                <EyeOff className="w-3.5 h-3.5" />
                <span>Zero-Knowledge Multi-Campus Wall & Confessions</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Incognito Wall & Whispers
              </h1>
              <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                Express unfiltered opinions, share anonymous exam tips, memes, and campus banter. Identity is shielded behind cryptographic robot avatars.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Alias Pill */}
              <button
                onClick={() => setIsProfileModalOpen(true)}
                className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white/10 border border-white/20 hover:bg-white/15 transition-all text-xs font-semibold"
              >
                <img
                  src={activeAvatarUrl}
                  alt="Avatar"
                  className="w-6 h-6 rounded-full bg-slate-800 p-0.5"
                />
                <span>@{incognitoProfile?.handle || "Set Alias"}</span>
                <RefreshCw className="w-3 h-3 text-slate-300" />
              </button>

              <Button
                variant="brand"
                size="lg"
                leftIcon={<Plus className="w-5 h-5" />}
                onClick={() => setIsPostModalOpen(true)}
                className="shadow-lg shadow-purple-500/25 bg-gradient-to-r from-purple-600 to-electric-600"
              >
                Post Anonymously
              </Button>
            </div>
          </div>
        </div>

        {/* Scope Selector: My Campus vs Global */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Campus Scope Tabs */}
          <div className="inline-flex p-1 rounded-2xl bg-slate-200/60 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-800 shadow-inner">
            <button
              onClick={() => setFeedScope("CAMPUS")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                feedScope === "CAMPUS"
                  ? "bg-brand-600 text-white shadow-md shadow-brand-600/30"
                  : "text-slate-500 hover:text-slate-200 hover:bg-slate-300/30 dark:hover:bg-slate-800/50"
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>My Campus</span>
            </button>

            <button
              onClick={() => setFeedScope("GLOBAL")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                feedScope === "GLOBAL"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                  : "text-slate-500 hover:text-slate-200 hover:bg-slate-300/30 dark:hover:bg-slate-800/50"
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>Global Feed</span>
            </button>
          </div>

          {/* Category Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {FEED_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setFeedTypeFilter(type.value)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  feedTypeFilter === type.value
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Feed Stream (Strictly renders database records with clean Empty State) */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-44 rounded-2xl bg-slate-200/50 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <GlassCard className="text-center py-16">
            <EyeOff className="w-12 h-12 mx-auto text-slate-400 mb-3 opacity-60" />
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">
              {feedScope === "CAMPUS"
                ? "No whispers on your campus wall yet"
                : "The global incognito feed is quiet right now"}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Drop the first anonymous confession or secret tip to get the conversation going!
            </p>
            <Button
              variant="brand"
              size="sm"
              className="mt-4 bg-purple-600 hover:bg-purple-500"
              onClick={() => setIsPostModalOpen(true)}
            >
              Whisper Something
            </Button>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {posts.map((post) => {
              const avatar =
                post.profile?.avatarUrl ||
                `https://api.dicebear.com/9.x/bottts/svg?seed=${post.profile?.handle || "Anon"}`;

              const imagesList =
                post.mediaUrls && post.mediaUrls.length > 0
                  ? post.mediaUrls
                  : post.mediaUrl
                  ? [post.mediaUrl]
                  : [];

              const isLiked = user && post.likes?.some((l: any) => l.userId === user.id);
              const isLongText = post.content && post.content.length > 220;
              const isExpanded = expandedPosts[post.id];
              const commentsCount = post._count?.comments || 0;

              return (
                <GlassCard
                  key={post.id}
                  interactive
                  className="flex flex-col justify-between border-slate-200/80 dark:border-slate-800/80 hover:border-purple-500/50 transition-all p-5 sm:p-6"
                >
                  <div className="space-y-3.5">
                    {/* Header: Dicebear Avatar, Alias, College & Feed Type */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={avatar}
                          alt="Bot Avatar"
                          className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-800 p-0.5 ring-1 ring-purple-500/40 object-cover"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-slate-900 dark:text-white">
                              @{post.profile?.handle || "Anonymous"}
                            </p>
                            {post.college && (
                              <span className="text-[10px] text-slate-400 font-medium flex items-center gap-0.5">
                                • <Building2 className="w-2.5 h-2.5" />
                                <span>{post.college.name}</span>
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400">
                            {formatDate(post.createdAt)}
                          </p>
                        </div>
                      </div>

                      <Badge
                        variant={
                          post.feedType === "CONFESSION"
                            ? "danger"
                            : post.feedType === "ADVICE"
                            ? "brand"
                            : post.feedType === "MEME"
                            ? "purple"
                            : "neutral"
                        }
                        size="sm"
                      >
                        {post.feedType}
                      </Badge>
                    </div>

                    {/* Post Content with Truncation & Read More */}
                    <div>
                      <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                        {isLongText && !isExpanded
                          ? `${post.content.slice(0, 220)}...`
                          : post.content}
                      </p>

                      {isLongText && (
                        <div className="mt-1 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleExpand(post.id)}
                            className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline"
                          >
                            {isExpanded ? "Show Less" : "Read More"}
                          </button>
                          <span className="text-slate-400">•</span>
                          <Link
                            href={`/incognito/${post.id}`}
                            className="text-xs font-semibold text-slate-400 hover:text-slate-200 inline-flex items-center gap-0.5"
                          >
                            <span>Open Thread</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                      )}
                    </div>

                    {/* Multi-Image Responsive Grid (Dynamic Containment) */}
                    {imagesList.length > 0 && (
                      <div className="pt-1">
                        <PostImageGrid images={imagesList} />
                      </div>
                    )}
                  </div>

                  {/* Footer: Anti-Spam Like, Comments Thread & Anonymous DM */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      {/* Idempotent Like Anti-Spam Button */}
                      <button
                        onClick={() => handleToggleLike(post.id)}
                        disabled={likeInProgressId === post.id}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          isLiked
                            ? "bg-rose-500/15 text-rose-500 shadow-sm"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-rose-500"
                        }`}
                      >
                        <Heart
                          className={`w-3.5 h-3.5 transition-transform active:scale-125 ${
                            isLiked ? "fill-rose-500 text-rose-500" : ""
                          }`}
                        />
                        <span>{post.likesCount}</span>
                      </button>

                      {/* Dedicated Thread & Comments Button */}
                      <Link
                        href={`/incognito/${post.id}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors"
                        title="View conversation thread"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{commentsCount}</span>
                      </Link>
                    </div>

                    <div className="flex items-center gap-2">
                      {post.profile?.userId && post.profile.userId !== user?.id && (
                        <button
                          onClick={() =>
                            handleDirectMessageAnonymous(
                              post.profile.userId,
                              post.profile.handle
                            )
                          }
                          disabled={chatLoadingId === post.profile.userId}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-300 text-xs font-bold hover:bg-purple-500/25 transition-colors"
                          title="Send private anonymous whisper DM"
                        >
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>
                            {chatLoadingId === post.profile.userId
                              ? "Connecting..."
                              : "Anon DM"}
                          </span>
                        </button>
                      )}

                      <Link
                        href={`/incognito/${post.id}`}
                        className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                        title="Open full thread"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}

        {/* Post Anonymously Modal */}
        <Modal
          isOpen={isPostModalOpen}
          onClose={() => setIsPostModalOpen(false)}
          title="Publish Anonymous Whisper"
          description="Your identity is completely shielded. Only your pseudonym and bot avatar will be visible."
          maxWidth="lg"
        >
          <form onSubmit={handlePublishPost} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Category Channel *
              </label>
              <select
                value={feedType}
                onChange={(e) => setFeedType(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="CONFESSION">🔥 Campus Confession</option>
                <option value="ADVICE">💡 Secret Advice / Exam Tip</option>
                <option value="MEME">😂 Banter & Campus Meme</option>
                <option value="CAMPUS_NEWS">📢 Campus News & Intel</option>
                <option value="GENERAL">General Whisper</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Your Anonymous Message *
              </label>
              <textarea
                required
                rows={3}
                placeholder="What's on your mind? Share confessions, advice, or campus secrets..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Multi-Image Upload */}
            <MultiImageUpload
              images={images}
              onChange={setImages}
              onUploadingChange={setIsUploadingMedia}
              maxImages={4}
              label="Attach Photos or Memes (Up to 4)"
            />

            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs">
              <img
                src={activeAvatarUrl}
                alt="Avatar"
                className="w-8 h-8 rounded-full bg-slate-800 p-0.5 ring-1 ring-purple-500"
              />
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-200">
                  Posting as @{incognitoProfile?.handle || "AnonRobot"}
                </p>
                <p className="text-[11px] text-slate-400">
                  Auto-tagged to your campus community
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={isUploadingMedia || isSubmitting}
                onClick={() => setIsPostModalOpen(false)}
              >
                Cancel
              </Button>
              <SubmitButton
                disabled={isUploadingMedia || isSubmitting}
                isSubmitting={isSubmitting || isUploadingMedia}
                loadingText={isUploadingMedia ? "Attaching images..." : "Publishing Whisper..."}
                className="bg-purple-600 hover:bg-purple-500 font-bold"
              >
                Publish Whisper
              </SubmitButton>
            </div>
          </form>
        </Modal>

        {/* Customize Incognito Handle Modal */}
        <Modal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          title="Customize Incognito Alias"
          description="Choose a unique pseudonym. A matching DiceBear Bottts avatar is automatically generated."
        >
          <form onSubmit={handleUpdateAlias} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Pseudonym Alias Handle *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-500 font-bold">
                  @
                </span>
                <input
                  type="text"
                  required
                  placeholder="CyberHawk_99"
                  value={customHandle}
                  onChange={(e) => setCustomHandle(e.target.value)}
                  className="w-full pl-8 pr-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-bold text-purple-600 dark:text-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {customHandle && (
              <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-center space-y-2">
                <p className="text-xs font-bold text-purple-600 dark:text-purple-300">
                  Avatar Preview (DiceBear Bottts)
                </p>
                <img
                  src={`https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(
                    customHandle
                  )}`}
                  alt="Preview"
                  className="w-16 h-16 mx-auto rounded-2xl bg-slate-900 p-1 ring-2 ring-purple-500 shadow-lg"
                />
              </div>
            )}

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsProfileModalOpen(false)}
              >
                Cancel
              </Button>
              <SubmitButton
                isSubmitting={isSubmitting}
                loadingText="Updating Alias..."
                className="bg-purple-600 hover:bg-purple-500 font-bold"
              >
                Save Pseudonym
              </SubmitButton>
            </div>
          </form>
        </Modal>
      </div>
    </ClientServiceGuard>
  );
}
