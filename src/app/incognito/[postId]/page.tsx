"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useUser } from "@/components/providers/UserContext";
import {
  getIncognitoPostById,
  createIncognitoComment,
  toggleLikeIncognitoPost,
} from "@/actions/incognito.actions";
import { getOrCreateConversation } from "@/actions/chat.actions";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import {
  EyeOff,
  Heart,
  MessageSquare,
  ArrowLeft,
  Send,
  User,
  ShieldCheck,
} from "lucide-react";
import { PostImageGrid } from "@/components/ui/PostImageGrid";
import { ClientServiceGuard } from "@/components/ClientServiceGuard";

export default function IncognitoPostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params?.postId as string;
  const { user } = useUser();

  const [post, setPost] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);

  const loadPost = async () => {
    if (!postId) return;
    setLoading(true);
    const res = await getIncognitoPostById(postId, user?.id);
    if (res?.success && res.data) {
      setPost(res.data);
    } else {
      toast.error(res?.error || "Failed to load whisper.");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPost();
  }, [postId, user?.id]);

  const handleLike = async () => {
    if (!user || !post) return;
    const wasLiked = post.isLikedByMe;

    setPost({
      ...post,
      isLikedByMe: !wasLiked,
      _count: {
        ...post._count,
        likes: wasLiked ? Math.max(0, post._count.likes - 1) : post._count.likes + 1,
      },
    });

    const res = await toggleLikeIncognitoPost(post.id, user.id);
    if (res.error) {
      toast.error(res.error);
      loadPost();
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in to reply.");
      return;
    }
    if (!commentText.trim()) return;

    setIsSubmitting(true);
    const res = await createIncognitoComment({
      postId,
      userId: user.id,
      content: commentText.trim(),
    });
    setIsSubmitting(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Anonymous reply posted.");
      setCommentText("");
      loadPost();
    }
  };

  const handleAnonymousChat = async () => {
    if (!user || !post?.authorProfileId) return;
    setChatLoading(true);
    const res = await getOrCreateConversation({
      participantOneId: user.id,
      participantTwoId: post.authorProfileId,
      isAnonymousChat: true,
    });
    setChatLoading(false);

    if (res.success && res.data) {
      router.push(`/messages?id=${res.data.id}`);
    } else {
      toast.error("Failed to connect anonymous chat.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-2 border-border border-t-primary rounded-full animate-spin" />
        <p className="text-xs text-muted-foreground font-medium">Loading Whisper Discussion...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <Card className="max-w-md mx-auto my-12 p-8 text-center space-y-4">
        <EyeOff className="w-10 h-10 text-muted-foreground mx-auto" />
        <h2 className="font-heading text-lg font-bold text-foreground">Whisper Not Found</h2>
        <p className="text-xs text-muted-foreground">
          This whisper may have been removed or archived.
        </p>
        <Link href="/incognito">
          <Button variant="outline" size="sm">
            Back to Whisper Wall
          </Button>
        </Link>
      </Card>
    );
  }

  return (
    <ClientServiceGuard campusId={user?.collegeId} serviceKey="INCOGNITO_WALL">
      <div className="space-y-6 pb-12 max-w-3xl mx-auto">
        <div>
          <Link
            href="/incognito"
            className="inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Whisper Wall</span>
          </Link>
        </div>

        {/* Main Post Card */}
        <Card className="p-6 sm:p-8 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary border border-border flex items-center justify-center font-mono font-bold text-sm text-primary">
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

            {post.authorProfileId && user?.id !== post.authorId && (
              <Button
                variant="outline"
                size="sm"
                isLoading={chatLoading}
                onClick={handleAnonymousChat}
                leftIcon={<EyeOff className="w-3.5 h-3.5 text-primary" />}
              >
                Whisper to Author
              </Button>
            )}
          </div>

          <p className="text-sm sm:text-base text-foreground leading-relaxed whitespace-pre-wrap">
            {post.content}
          </p>

          {post.images && post.images.length > 0 && (
            <PostImageGrid images={post.images} />
          )}

          <div className="pt-3 border-t border-border/60 flex items-center gap-4 text-xs">
            <button
              type="button"
              onClick={handleLike}
              className={`flex items-center gap-1.5 font-semibold transition-colors ${
                post.isLikedByMe
                  ? "text-rose-500"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Heart className={`w-4 h-4 ${post.isLikedByMe ? "fill-current" : ""}`} />
              <span>{post._count?.likes ?? 0} Likes</span>
            </button>

            <span className="text-muted-foreground">
              {post.comments?.length ?? 0} Responses
            </span>
          </div>
        </Card>

        {/* Reply Submission Box */}
        <Card className="p-4 sm:p-5">
          <form onSubmit={handleAddComment} className="space-y-3">
            <Textarea
              placeholder="Write an anonymous response..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              rows={2}
              required
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                size="sm"
                isLoading={isSubmitting}
                rightIcon={<Send className="w-3.5 h-3.5" />}
              >
                Post Reply
              </Button>
            </div>
          </form>
        </Card>

        {/* Threaded Comments List */}
        <div className="space-y-3">
          <h3 className="font-heading font-bold text-sm text-foreground">
            Responses ({post.comments?.length ?? 0})
          </h3>

          {post.comments && post.comments.length > 0 ? (
            post.comments.map((comment: any) => (
              <Card key={comment.id} className="p-4 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="font-mono font-bold text-foreground">
                    @{comment.authorHandle || "Peer_Anonymous"}
                  </span>
                  <span>{formatDate(comment.createdAt)}</span>
                </div>
                <p className="text-xs sm:text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {comment.content}
                </p>
              </Card>
            ))
          ) : (
            <p className="text-xs text-muted-foreground py-4 text-center">
              No responses yet. Be the first to reply anonymously.
            </p>
          )}
        </div>
      </div>
    </ClientServiceGuard>
  );
}
