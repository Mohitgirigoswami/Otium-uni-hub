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
  likeIncognitoPost,
  setupIncognitoProfile,
  getIncognitoProfile,
} from "@/actions/incognito.actions";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import {
  EyeOff,
  Plus,
  Heart,
  Sparkles,
  Shield,
  Bot,
  RefreshCw,
  MessageSquare,
  Flame,
  Send,
} from "lucide-react";
import { ImageUploadDropzone } from "@/components/ui/ImageUploadDropzone";

const FEED_TYPES = [
  { label: "All Whispers", value: "ALL" },
  { label: "🔥 Confessions", value: "CONFESSION" },
  { label: "💡 Campus Advice", value: "ADVICE" },
  { label: "😂 Memes & Banter", value: "MEME" },
  { label: "📢 Campus News", value: "CAMPUS_NEWS" },
  { label: "General", value: "GENERAL" },
];

export default function IncognitoWallPage() {
  const { user } = useUser();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedTypeFilter, setFeedTypeFilter] = useState("ALL");
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [incognitoProfile, setIncognitoProfile] = useState<any | null>(null);

  // Form states
  const [content, setContent] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [feedType, setFeedType] = useState("CONFESSION");
  const [customHandle, setCustomHandle] = useState("");
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [likeLoadingId, setLikeLoadingId] = useState<string | null>(null);

  const fetchProfileAndFeed = async () => {
    if (!user) return;
    setLoading(true);

    const [profRes, postsRes] = await Promise.all([
      getIncognitoProfile(user.id),
      getIncognitoPosts(feedTypeFilter === "ALL" ? undefined : feedTypeFilter),
    ]);

    if (profRes.success && profRes.data) {
      setIncognitoProfile(profRes.data);
      setCustomHandle(profRes.data.handle);
    }

    if (postsRes.success && postsRes.data) {
      setPosts(postsRes.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProfileAndFeed();
  }, [user?.id, feedTypeFilter]);

  const handlePublishPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!content.trim()) {
      toast.error("Please enter a whisper or confession.");
      return;
    }

    setIsSubmitting(true);
    const res = await createIncognitoPost({
      userId: user.id,
      content,
      mediaUrl: mediaUrl.trim() || undefined,
      feedType,
    });
    setIsSubmitting(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Whisper published anonymously onto the wall!");
      setIsPostModalOpen(false);
      setContent("");
      setMediaUrl("");
      fetchProfileAndFeed();
    }
  };

  const handleUpdateAlias = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!customHandle.trim()) {
      toast.error("Please enter a pseudonym handle.");
      return;
    }

    setIsSubmitting(true);
    const res = await setupIncognitoProfile(user.id, customHandle);
    setIsSubmitting(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Incognito alias & Bottts avatar updated!");
      setIncognitoProfile(res.data);
      setIsProfileModalOpen(false);
      fetchProfileAndFeed();
    }
  };

  const handleLike = async (postId: string) => {
    if (!user) return;
    setLikeLoadingId(postId);

    // Optimistic UI update
    setPosts(
      posts.map((p) => (p.id === postId ? { ...p, likesCount: p.likesCount + 1 } : p))
    );

    const res = await likeIncognitoPost(postId, user.id);
    setLikeLoadingId(null);

    if (res.error) {
      toast.error(res.error);
    }
  };

  const activeAvatarUrl = incognitoProfile?.avatarUrl || `https://api.dicebear.com/9.x/bottts/svg?seed=AnonRobot`;

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-accent-950/90 via-slate-900/90 to-electric-950/90 p-8 sm:p-10 border border-accent-500/30 text-white shadow-2xl backdrop-blur-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-accent-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 -mb-16 w-60 h-60 bg-electric-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-500/20 border border-accent-400/30 text-accent-300 text-xs font-semibold">
              <EyeOff className="w-3.5 h-3.5" />
              <span>Zero-Knowledge Campus Wall & Confessions</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Incognito Wall & Whispers
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Express unfiltered opinions, share anonymous exam tips, and read campus banter. Identity is shielded behind auto-generated cryptographic robot avatars.
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
              className="shadow-lg shadow-accent-500/25 bg-gradient-to-r from-accent-600 to-electric-600"
            >
              Post Anonymously
            </Button>
          </div>
        </div>
      </div>

      {/* Feed Filters */}
      <GlassCard className="p-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {FEED_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => setFeedTypeFilter(type.value)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                feedTypeFilter === type.value
                  ? "bg-accent-600 text-white shadow-md shadow-accent-600/30"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </GlassCard>

      {/* Feed Stream */}
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
            The incognito wall is quiet right now
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Drop the first anonymous whisper or exam tip to get the conversation going!
          </p>
          <Button
            variant="brand"
            size="sm"
            className="mt-4 bg-accent-600 hover:bg-accent-500"
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

            return (
              <GlassCard
                key={post.id}
                interactive
                className="flex flex-col justify-between border-slate-200/80 dark:border-slate-800/80 hover:border-accent-500/50"
              >
                <div className="space-y-3">
                  {/* Header: Dicebear Avatar, Alias & Feed Type */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={avatar}
                        alt="Bot Avatar"
                        className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 p-0.5 ring-1 ring-accent-500/40"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">
                          @{post.profile?.handle || "Anonymous"}
                        </p>
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

                  {/* Post Content */}
                  <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {post.content}
                  </p>
                </div>

                {/* Footer: Like Action */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Shield className="w-3 h-3 text-accent-500" />
                    <span>Identity Cryptographically Masked</span>
                  </div>

                  <button
                    onClick={() => handleLike(post.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors group"
                  >
                    <Heart className="w-3.5 h-3.5 text-rose-500 group-hover:scale-125 transition-transform" />
                    <span>{post.likesCount}</span>
                  </button>
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
        description="Your identity is completely private. Only your bot avatar and pseudonym will be visible."
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
              className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
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
              placeholder="What's on your mind? Share confession, advice, or campus secrets..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>

          {/* Direct Cloudinary Image Dropzone */}
          <ImageUploadDropzone
            onImageUploaded={(url) => setMediaUrl(url)}
            onUploadingChange={(up) => setIsUploadingMedia(up)}
            existingImageUrl={mediaUrl}
            label="Optional Meme / Photo Attachment (Direct to Cloudinary)"
            folder="otium_incognito"
          />

          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs">
            <img
              src={activeAvatarUrl}
              alt="Avatar"
              className="w-8 h-8 rounded-full bg-slate-800 p-0.5 ring-1 ring-accent-500"
            />
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-200">
                Posting as @{incognitoProfile?.handle || "AnonRobot"}
              </p>
              <p className="text-[11px] text-slate-400">
                Auto-generated robot avatar seed based on handle
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
              loadingText={isUploadingMedia ? "Uploading attachment..." : "Whispering..."}
              className="bg-accent-600 hover:bg-accent-500"
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
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                @
              </span>
              <input
                type="text"
                required
                placeholder="CyberHawk_99"
                value={customHandle}
                onChange={(e) => setCustomHandle(e.target.value)}
                className="w-full pl-8 pr-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
            </div>
          </div>

          {customHandle && (
            <div className="p-4 rounded-2xl bg-accent-500/10 border border-accent-500/20 text-center space-y-2">
              <p className="text-xs font-bold text-accent-600 dark:text-accent-300">
                Avatar Preview (DiceBear Bottts)
              </p>
              <img
                src={`https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(
                  customHandle
                )}`}
                alt="Preview"
                className="w-16 h-16 mx-auto rounded-full bg-slate-900 p-1 ring-2 ring-accent-500 shadow-lg"
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
              className="bg-accent-600 hover:bg-accent-500"
            >
              Save Pseudonym
            </SubmitButton>
          </div>
        </form>
      </Modal>
    </div>
  );
}
