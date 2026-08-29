"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@/components/providers/UserContext";
import {
  getIncognitoPostById,
  toggleLikeIncognitoPost,
  createIncognitoComment,
  getIncognitoProfile,
} from "@/actions/incognito.actions";
import { getOrCreateConversation } from "@/actions/chat.actions";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { PostImageGrid } from "@/components/ui/PostImageGrid";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";
import {
  ArrowLeft,
  Heart,
  MessageSquare,
  Send,
  Building2,
  Shield,
  EyeOff,
  Sparkles,
  RefreshCw,
  Share2,
  Loader2,
} from "lucide-react";

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params?.postId as string;
  const { user, loading: userLoading } = useUser();

  const [post, setPost] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<any[]>([]);
  const [commentContent, setCommentContent] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [chatLoading, setChatLoading] = useState(false);

  // Auth Guard
  useEffect(() => {
    if (!userLoading && !user) {
      router.replace("/login");
    }
  }, [user, userLoading, router]);

  const fetchPostData = async () => {
    if (!postId || !user?.id) return;
    setLoading(true);
    try {
      const res = await getIncognitoPostById(postId, user.id);

      if (res?.success && res.data) {
        setPost(res.data);
        setComments(res.data.comments || []);
        setLikesCount(res.data.likesCount || 0);

        if (res.data.likes) {
          const userHasLiked = res.data.likes.some(
            (l: any) => l.userId === user.id
          );
          setIsLiked(userHasLiked);
        }
      } else {
        toast.error(res?.error || "Failed to load post.");
      }
    } catch (err) {
      console.error("Error fetching post data:", err);
      toast.error("Failed to load whisper.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id && postId) {
      fetchPostData();
      getIncognitoProfile(user.id).then((res) => {
        if (res?.success && res.data) {
          setUserProfile(res.data);
        }
      });
    }
  }, [postId, user?.id]);

  const handleToggleLike = async () => {
    if (!user?.id) {
      toast.error("Please login to like whispers.");
      return;
    }
    if (isLiking) return;

    // Optimistic UI update
    const previousLiked = isLiked;
    const previousCount = likesCount;

    setIsLiked(!previousLiked);
    setLikesCount(previousLiked ? Math.max(0, previousCount - 1) : previousCount + 1);
    setIsLiking(true);

    const res = await toggleLikeIncognitoPost(postId, user.id);
    setIsLiking(false);

    if (res?.success && res.data) {
      setIsLiked(res.data.liked);
      setLikesCount(res.data.likesCount);
    } else {
      // Revert on error
      setIsLiked(previousLiked);
      setLikesCount(previousCount);
      toast.error(res?.error || "Failed to update like.");
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      toast.error("Please login to post a reply.");
      return;
    }
    if (!commentContent.trim()) {
      toast.error("Comment cannot be empty.");
      return;
    }

    setIsSubmittingComment(true);
    const res = await createIncognitoComment({
      userId: user.id,
      postId,
      content: commentContent.trim(),
    });
    setIsSubmittingComment(false);

    if (res?.success && res.data) {
      toast.success("Anonymous reply posted!");
      setComments((prev) => [...prev, res.data]);
      setCommentContent("");
    } else {
      toast.error(res?.error || "Failed to post comment.");
    }
  };

  const handleDirectMessage = async () => {
    if (!user?.id) {
      toast.error("Please login to start an anonymous chat.");
      return;
    }
    if (post?.profile?.userId === user.id) {
      toast.info("This is your own whisper!");
      return;
    }

    setChatLoading(true);
    const res = await getOrCreateConversation({
      participantOneId: user.id,
      participantTwoId: post.profile.userId,
      isAnonymousChat: true,
    });
    setChatLoading(false);

    if (res?.success && res.data) {
      toast.success(`Opening anonymous chat with @${post.profile.handle}...`);
      router.push(`/messages?id=${res.data.id}`);
    } else {
      toast.error(res?.error || "Failed to start anonymous chat.");
    }
  };

  const handleShare = () => {
    if (typeof window !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Post link copied to clipboard!");
    }
  };

  if (userLoading || !user) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
        <p className="text-xs font-bold text-slate-400">Verifying campus session...</p>
      </div>
    );
  }

  const imagesList = post
    ? post.mediaUrls && post.mediaUrls.length > 0
      ? post.mediaUrls
      : post.mediaUrl
      ? [post.mediaUrl]
      : []
    : [];

  const userAvatarUrl = `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(
    userProfile?.handle || "OtiumStudent"
  )}`;

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-16">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link href="/incognito">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Back to Whisper Wall
          </Button>
        </Link>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleShare}
          leftIcon={<Share2 className="w-4 h-4" />}
        >
          Share Post
        </Button>
      </div>

      {loading ? (
        <GlassCard className="p-8 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 animate-pulse" />
            <div className="space-y-2 flex-1">
              <div className="w-32 h-4 bg-slate-800 rounded animate-pulse" />
              <div className="w-24 h-3 bg-slate-800 rounded animate-pulse" />
            </div>
          </div>
          <div className="h-24 bg-slate-800 rounded-xl animate-pulse" />
        </GlassCard>
      ) : !post ? (
        <GlassCard className="p-12 text-center space-y-3">
          <EyeOff className="w-12 h-12 mx-auto text-slate-400 opacity-60" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Post not found
          </h2>
          <p className="text-xs text-slate-500">
            This whisper may have been deleted or the link is invalid.
          </p>
        </GlassCard>
      ) : (
        <>
          {/* Main Post Card */}
          <GlassCard className="p-6 sm:p-8 space-y-5 border-purple-500/20 shadow-xl">
            {/* Author Header */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <img
                  src={
                    post.profile?.avatarUrl ||
                    `https://api.dicebear.com/9.x/bottts/svg?seed=${post.profile?.handle || "Anon"}`
                  }
                  alt={post.profile?.handle || "Anonymous"}
                  className="w-12 h-12 rounded-2xl bg-slate-900 p-1 ring-2 ring-purple-500/50 shadow-md object-cover"
                />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-sm sm:text-base text-purple-600 dark:text-purple-400">
                      @{post.profile?.handle || "Anonymous"}
                    </span>
                    <Badge variant="brand" size="sm">
                      {post.feedType || "CONFESSION"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                    {post.college && (
                      <span className="flex items-center gap-1 text-slate-400">
                        <Building2 className="w-3 h-3 text-brand-400" />
                        <span>{post.college.name}</span>
                        <span>•</span>
                      </span>
                    )}
                    <span>{formatDate(post.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Zero-Knowledge DM Button */}
              {user && post.profile?.userId !== user.id && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDirectMessage}
                  disabled={chatLoading}
                  className="text-xs border-purple-500/30 hover:bg-purple-500/10 text-purple-600 dark:text-purple-300"
                  leftIcon={<EyeOff className="w-3.5 h-3.5" />}
                >
                  {chatLoading ? "Connecting..." : "Anon DM"}
                </Button>
              )}
            </div>

            {/* Post Content (Full Text) */}
            <div className="text-base sm:text-lg font-medium text-slate-800 dark:text-slate-100 whitespace-pre-wrap leading-relaxed">
              {post.content}
            </div>

            {/* Multi-Image Display (Dynamic Containment) */}
            {imagesList.length > 0 && (
              <div className="pt-2">
                <PostImageGrid images={imagesList} />
              </div>
            )}

            {/* Post Action Footer */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Anti-Spam Idempotent Like Button */}
                <button
                  type="button"
                  onClick={handleToggleLike}
                  disabled={isLiking}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isLiked
                      ? "bg-rose-500/15 text-rose-500 shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-rose-500"
                  }`}
                >
                  <Heart
                    className={`w-4 h-4 transition-transform active:scale-125 ${
                      isLiked ? "fill-rose-500 text-rose-500" : ""
                    }`}
                  />
                  <span>{likesCount} {likesCount === 1 ? "Like" : "Likes"}</span>
                </button>

                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-bold">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{comments.length} {comments.length === 1 ? "Comment" : "Comments"}</span>
                </div>
              </div>

              <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                <Shield className="w-3 h-3 text-purple-400" />
                <span>100% Anonymous & Private</span>
              </span>
            </div>
          </GlassCard>

          {/* Comments Section */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-purple-500" />
              <span>Campus Replies ({comments.length})</span>
            </h3>

            {/* Add Comment Input Form */}
            <GlassCard className="p-4 border-purple-500/20">
              <form onSubmit={handleAddComment} className="space-y-3">
                <div className="flex items-start gap-3">
                  <img
                    src={userAvatarUrl}
                    alt="Your Incognito Avatar"
                    className="w-9 h-9 rounded-xl bg-slate-900 p-1 ring-1 ring-purple-500 shadow-sm shrink-0"
                  />
                  <div className="flex-1 space-y-1">
                    <p className="text-[11px] font-bold text-purple-600 dark:text-purple-400">
                      Replying as @{userProfile?.handle || "You"}
                    </p>
                    <textarea
                      rows={2}
                      value={commentContent}
                      onChange={(e) => setCommentContent(e.target.value)}
                      placeholder="Write an anonymous reply..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <SubmitButton
                    isSubmitting={isSubmittingComment}
                    loadingText="Posting Reply..."
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-500 text-xs font-bold"
                    leftIcon={<Send className="w-3.5 h-3.5" />}
                  >
                    Post Anonymous Reply
                  </SubmitButton>
                </div>
              </form>
            </GlassCard>

            {/* Comment List */}
            {comments.length === 0 ? (
              <GlassCard className="p-8 text-center">
                <p className="text-xs text-slate-400">
                  No replies yet. Be the first peer to whisper back!
                </p>
              </GlassCard>
            ) : (
              <div className="space-y-3">
                {comments.map((comment) => (
                  <GlassCard key={comment.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={
                            comment.profile?.avatarUrl ||
                            `https://api.dicebear.com/9.x/bottts/svg?seed=${comment.profile?.handle || "Anon"}`
                          }
                          alt={comment.profile?.handle || "Anon"}
                          className="w-7 h-7 rounded-lg bg-slate-900 p-0.5 ring-1 ring-purple-500/40 object-cover"
                        />
                        <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                          @{comment.profile?.handle || "Anonymous"}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formatDate(comment.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 pl-9 whitespace-pre-wrap">
                      {comment.content}
                    </p>
                  </GlassCard>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
