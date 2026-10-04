import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Image,
  Platform,
  ScrollView,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeContext";
import { useUser } from "../../context/UserContext";
import { apiClient } from "../../services/apiClient";
import { API_BASE_URL } from "../../utils/constants";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { ClientServiceGuard } from "../../components/ClientServiceGuard";

interface WhisperPost {
  id: string;
  handle: string;
  avatarSeed?: string;
  campus?: string;
  collegeId?: string;
  category: string;
  content: string;
  mediaUrls?: string[];
  imageUrl?: string;
  createdAt: string;
  upvotes: number;
  downvotes: number;
  userVote?: "UP" | "DOWN";
  commentCount: number;
  authorId?: string;
  isAuthor?: boolean;
}

interface WhisperComment {
  id: string;
  postId: string;
  content: string;
  createdAt: string;
  profile?: {
    id?: string;
    handle?: string;
    avatarUrl?: string;
    userId?: string;
  };
}

const CATEGORIES = [
  { label: "All Whispers", value: "ALL" },
  { label: "Confessions", value: "CONFESSION" },
  { label: "Campus Advice", value: "ADVICE" },
  { label: "Memes & Banter", value: "MEME" },
  { label: "Campus News", value: "CAMPUS_NEWS" },
];

const STORAGE_KEY_WHISPERS = "@otium_cached_whispers";

export const resolveMediaUri = (uri?: string) => {
  if (!uri) return "";
  if (uri.startsWith("http://") || uri.startsWith("https://") || uri.startsWith("file://") || uri.startsWith("content://")) {
    return uri;
  }
  const origin = API_BASE_URL.replace(/\/api\/?$/, "");
  if (uri.startsWith("/uploads/")) {
    return `${origin}${uri}`;
  }
  if (uri.startsWith("uploads/")) {
    return `${origin}/${uri}`;
  }
  return uri;
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export function WhisperWallScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useUser();

  const [posts, setPosts] = useState<WhisperPost[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [scope, setScope] = useState<"CAMPUS" | "GLOBAL">("CAMPUS");

  // Compose State (Supports Deferred Multi-Image Upload)
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeContent, setComposeContent] = useState("");
  const [composeCategory, setComposeCategory] = useState<string>("CONFESSION");
  const [composeImages, setComposeImages] = useState<string[]>([]);
  const [composeUrlInput, setComposeUrlInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Full-screen post modal & read more
  const [expandedPostIds, setExpandedPostIds] = useState<Set<string>>(new Set());
  const [activeModalPost, setActiveModalPost] = useState<WhisperPost | null>(null);

  // Comments Bottom Sheet State
  const [commentsModalPost, setCommentsModalPost] = useState<WhisperPost | null>(null);
  const [postComments, setPostComments] = useState<WhisperComment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [commentInput, setCommentInput] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);

  // 1. Instant Image Picker (Deferred upload - stores local URI with 0ms network latency)
  const handlePickImage = async () => {
    if (composeImages.length >= 4) {
      Alert.alert("Limit Reached", "You can upload a maximum of 4 photos per whisper.");
      return;
    }
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*"],
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const pickedUris = result.assets.map((a) => a.uri);
      setComposeImages((prev) => [...prev, ...pickedUris].slice(0, 4));
    } catch {
      Alert.alert("Picker Error", "Could not select the image.");
    }
  };

  const handleAddUrlImage = () => {
    const trimmed = composeUrlInput.trim();
    if (!trimmed) return;
    if (composeImages.length >= 4) {
      Alert.alert("Limit Reached", "Max 4 images allowed.");
      return;
    }
    setComposeImages((prev) => [...prev, trimmed].slice(0, 4));
    setComposeUrlInput("");
  };

  const handleRemoveComposeImage = (idxToRemove: number) => {
    setComposeImages((prev) => prev.filter((_, idx) => idx !== idxToRemove));
  };

  // 0. Instant 0ms cache restore on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY_WHISPERS)
      .then((cached) => {
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setPosts(parsed);
            setLoading(false);
          }
        }
      })
      .catch(() => {});
  }, []);

  const fetchPosts = async (isPull = false) => {
    if (isPull) setRefreshing(true);

    // Fetch fresh whispers from server
    try {
      let url = "/incognito";
      const params = [];
      if (activeCategory !== "ALL") {
        params.push(`feedType=${encodeURIComponent(activeCategory)}`);
      }
      if (scope === "CAMPUS") {
        params.push(`scope=CAMPUS`);
        if (user?.collegeId) {
          params.push(`collegeId=${encodeURIComponent(user.collegeId)}`);
        }
      } else {
        params.push(`scope=GLOBAL`);
      }
      if (params.length > 0) url += `?${params.join("&")}`;

      const res = await apiClient.get(url);
      if (res.success && Array.isArray(res.data)) {
        const mapped: WhisperPost[] = res.data.map((p: any) => {
          const up = p._count?.likes ?? (typeof p.upvotes === "number" ? p.upvotes : 0);
          const down = typeof p.downvotes === "number" ? p.downvotes : 0;
          const userHasLiked = Array.isArray(p.likes) && user?.id
            ? p.likes.some((l: any) => l.userId === user.id)
            : p.userVote === "UP";
          const mediaList = Array.isArray(p.mediaUrls) && p.mediaUrls.length > 0
            ? p.mediaUrls
            : p.mediaUrl
            ? [p.mediaUrl]
            : [];
          return {
            id: String(p.id),
            handle: p.profile?.handle || p.handle || "Anonymous Student",
            avatarSeed: p.profile?.handle || p.avatarSeed || "bot",
            campus: p.college?.name || p.campus || (user?.college?.name || "JCBOSEUST, YMCA"),
            category: p.feedType || p.category || "CONFESSION",
            content: p.content || "",
            mediaUrls: mediaList,
            imageUrl: mediaList[0] || p.imageUrl,
            createdAt: p.createdAt || new Date().toISOString(),
            upvotes: up,
            downvotes: down,
            userVote: userHasLiked ? "UP" : undefined,
            commentCount: p._count?.comments ?? (typeof p.commentCount === "number" ? p.commentCount : 0),
            authorId: p.authorAnonymousId || p.profile?.id || p.profileId || p.authorId,
            isAuthor: p.isAuthor ?? false,
          };
        });
        setPosts(mapped);
        AsyncStorage.setItem(STORAGE_KEY_WHISPERS, JSON.stringify(mapped)).catch(() => {});
      }
    } catch {
      console.log("[Fetch Whispers Note]: Operating in offline cached mode");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Auto-fetch on screen focus + continuous 15s background polling for real-time posts
  useFocusEffect(
    useCallback(() => {
      fetchPosts(false);
      const pollTimer = setInterval(() => {
        fetchPosts(false);
      }, 15000);
      return () => clearInterval(pollTimer);
    }, [activeCategory, scope, user?.collegeId])
  );

  const toggleExpandPost = (id: string) => {
    setExpandedPostIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Instant 0ms Optimistic Heart / Like toggle
  const handleToggleLike = async (post: WhisperPost) => {
    const isCurrentlyLiked = post.userVote === "UP";
    const nextLiked = !isCurrentlyLiked;
    const currentCount = Number(post.upvotes) || 0;
    const nextCount = nextLiked ? currentCount + 1 : Math.max(0, currentCount - 1);

    // 1. Instant local update
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === post.id) {
          return {
            ...p,
            upvotes: nextCount,
            userVote: nextLiked ? "UP" : undefined,
          };
        }
        return p;
      })
    );

    // Also update activeModalPost if currently viewing
    if (activeModalPost && activeModalPost.id === post.id) {
      setActiveModalPost((prev) =>
        prev
          ? {
              ...prev,
              upvotes: nextCount,
              userVote: nextLiked ? "UP" : undefined,
            }
          : null
      );
    }

    // 2. Send to backend in background
    try {
      await apiClient.post("/incognito", {
        action: "LIKE",
        postId: post.id,
        userId: user?.id,
      });
    } catch {
      // Keep optimistic state to prevent jarring snap-backs
    }
  };

  // 2. Deferred Upload on Post Submit (Uploads picked photos right before posting)
  const handleCreateWhisper = async () => {
    if (!composeContent.trim() || isSubmitting) {
      Alert.alert("Empty Post", "Please write your anonymous whisper before posting.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload any local image files to the server right before posting
      const finalMediaUrls: string[] = [];
      for (const uri of composeImages) {
        if (uri.startsWith("http://") || uri.startsWith("https://")) {
          finalMediaUrls.push(uri);
        } else {
          try {
            const formData = new FormData();
            formData.append("file", {
              uri,
              name: "whisper_photo.jpg",
              type: "image/jpeg",
            } as any);
            formData.append("folder", "otium_wall_memes");

            const uploadRes = await apiClient.post("/upload", formData);
            if (uploadRes.success && uploadRes.data?.url) {
              finalMediaUrls.push(uploadRes.data.url);
            } else {
              finalMediaUrls.push(uri);
            }
          } catch {
            finalMediaUrls.push(uri);
          }
        }
      }

      const res = await apiClient.post("/incognito", {
        content: composeContent.trim(),
        feedType: composeCategory,
        category: composeCategory,
        mediaUrl: finalMediaUrls[0] || undefined,
        mediaUrls: finalMediaUrls,
        scope,
        collegeId: user?.collegeId,
      });

      if (res.success) {
        Alert.alert("Whisper Posted! 💬", "Your anonymous post is live on the Whisper Wall.");
        setIsComposeOpen(false);
        setComposeContent("");
        setComposeImages([]);
        setComposeUrlInput("");
        fetchPosts();
      } else {
        // Fallback local save
        const localPost: WhisperPost = {
          id: Date.now().toString(),
          handle: user?.name ? `Anon_${user.name.split(" ")[0]}` : "Anonymous Student",
          avatarSeed: `Seed_${Date.now()}`,
          campus: scope === "CAMPUS" ? (user?.college?.name || "JCBOSEUST, YMCA") : "Global Feed",
          category: composeCategory,
          content: composeContent.trim(),
          mediaUrls: finalMediaUrls,
          imageUrl: finalMediaUrls[0] || undefined,
          createdAt: new Date().toISOString(),
          upvotes: 1,
          downvotes: 0,
          commentCount: 0,
          userVote: "UP",
          authorId: user?.incognitoProfile?.id || user?.id,
          isAuthor: true,
        };
        const updated = [localPost, ...posts];
        setPosts(updated);
        AsyncStorage.setItem(STORAGE_KEY_WHISPERS, JSON.stringify(updated)).catch(() => {});
        Alert.alert("Saved Locally ☁️", "Saved on your device. Will synchronize when online.");
        setIsComposeOpen(false);
        setComposeContent("");
        setComposeImages([]);
        setComposeUrlInput("");
      }
    } catch {
      const localPost: WhisperPost = {
        id: Date.now().toString(),
        handle: user?.name ? `Anon_${user.name.split(" ")[0]}` : "Anonymous Student",
        avatarSeed: `Seed_${Date.now()}`,
        campus: scope === "CAMPUS" ? (user?.college?.name || "JCBOSEUST, YMCA") : "Global Feed",
        category: composeCategory,
        content: composeContent.trim(),
        mediaUrls: composeImages,
        imageUrl: composeImages[0] || undefined,
        createdAt: new Date().toISOString(),
        upvotes: 1,
        downvotes: 0,
        commentCount: 0,
        userVote: "UP",
        authorId: user?.incognitoProfile?.id || user?.id,
        isAuthor: true,
      };
      const updated = [localPost, ...posts];
      setPosts(updated);
      AsyncStorage.setItem(STORAGE_KEY_WHISPERS, JSON.stringify(updated)).catch(() => {});
      Alert.alert("Saved Locally ☁️", "Network unavailable. Post saved on your device.");
      setIsComposeOpen(false);
      setComposeContent("");
      setComposeImages([]);
      setComposeUrlInput("");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Post Deletion (Author or Super Admin)
  const handleDeletePost = (postId: string) => {
    Alert.alert(
      "Delete Whisper",
      "Are you sure you want to permanently delete this whisper? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            // Optimistic removal
            setPosts((prev) => prev.filter((p) => p.id !== postId));
            if (activeModalPost?.id === postId) setActiveModalPost(null);
            if (commentsModalPost?.id === postId) setCommentsModalPost(null);

            try {
              const res = await apiClient.delete(`/incognito?postId=${postId}`);
              if (!res.success) {
                console.warn("Delete post warning:", res.error);
              }
            } catch (err) {
              console.error("Error deleting whisper post:", err);
            }
          },
        },
      ]
    );
  };

  // 4. Comments Handlers
  const handleOpenComments = async (post: WhisperPost) => {
    setCommentsModalPost(post);
    setPostComments([]);
    setIsLoadingComments(true);

    try {
      const res = await apiClient.get(`/incognito?postId=${post.id}&comments=true`);
      if (res.success && Array.isArray(res.data)) {
        setPostComments(res.data);
      }
    } catch {
      console.log("[Comments Note]: Failed to load comments");
    } finally {
      setIsLoadingComments(false);
    }
  };

  const handleSendComment = async () => {
    if (!commentInput.trim() || !commentsModalPost || isPostingComment) return;

    const trimmed = commentInput.trim();
    const targetPostId = commentsModalPost.id;
    setCommentInput("");
    setIsPostingComment(true);

    const tempId = `temp_${Date.now()}`;
    const optimisticComment: WhisperComment = {
      id: tempId,
      postId: targetPostId,
      content: trimmed,
      createdAt: new Date().toISOString(),
      profile: {
        id: "me",
        handle: user?.name ? `Anon_${user.name.split(" ")[0]}` : "Anonymous Student",
        avatarUrl: `https://api.dicebear.com/9.x/bottts/png?seed=${encodeURIComponent(user?.name || "me")}&size=80`,
        userId: user?.id,
      },
    };

    // Instant optimistic update
    setPostComments((prev) => [...prev, optimisticComment]);
    setPosts((prev) =>
      prev.map((p) =>
        p.id === targetPostId ? { ...p, commentCount: (p.commentCount || 0) + 1 } : p
      )
    );
    if (activeModalPost?.id === targetPostId) {
      setActiveModalPost((prev) =>
        prev ? { ...prev, commentCount: (prev.commentCount || 0) + 1 } : null
      );
    }

    try {
      const res = await apiClient.post("/incognito", {
        action: "COMMENT",
        postId: targetPostId,
        content: trimmed,
      });

      if (res.success && res.data) {
        setPostComments((prev) =>
          prev.map((c) => (c.id === tempId ? res.data : c))
        );
      }
    } catch {
      // keep optimistic
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleStartWhisperChat = async (post: WhisperPost) => {
    setActiveModalPost(null);
    if (!post.authorId) {
      Alert.alert("Notice", "Unable to start whisper direct chat with this author.");
      return;
    }
    if (post.isAuthor || post.authorId === user?.id) {
      Alert.alert("Your Whisper", "You cannot send a Whisper DM to your own anonymous post.");
      return;
    }

    try {
      const res = await apiClient.post("/chat", {
        participantTwoId: post.authorId,
        isAnonymousChat: true,
      });

      if (res.success && res.data) {
        navigation?.navigate("Messages", {
          conversationId: res.data.id,
          initialTab: "whisper",
        });
      } else {
        Alert.alert("Unable to Start Chat", res.error || "Could not initialize anonymous whisper conversation.");
      }
    } catch (err: any) {
      Alert.alert("Connection Error", err?.message || "Please check your network and try again.");
    }
  };

  return (
    <ClientServiceGuard serviceKey="INCOGNITO_WALL" navigation={navigation}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* 1. Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Whisper Wall</Text>
            <Text style={[styles.headerSub, { color: colors.textMuted }]}>
              Anonymous student confessions & advice
            </Text>
          </View>

          <View style={styles.headerActions}>
            {/* Compose button */}
            <TouchableOpacity
              onPress={() => setIsComposeOpen(true)}
              style={[styles.composeBtn, { backgroundColor: colors.primary }]}
            >
              <Feather name="plus" size={15} color={colors.primaryForeground} />
              <Text style={[styles.composeBtnText, { color: colors.primaryForeground }]}>Whisper</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. Scope & Category Filters */}
        <View style={styles.filterSection}>
          {/* Scope Tabs: Campus vs Global */}
          <View style={[styles.scopeToggle, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <TouchableOpacity
              onPress={() => setScope("CAMPUS")}
              style={[
                styles.scopeTab,
                scope === "CAMPUS" && { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Ionicons
                name="school-outline"
                size={13}
                color={scope === "CAMPUS" ? colors.primary : colors.textMuted}
              />
              <Text
                style={[
                  styles.scopeTabText,
                  { color: scope === "CAMPUS" ? colors.text : colors.textMuted },
                ]}
              >
                My Campus
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setScope("GLOBAL")}
              style={[
                styles.scopeTab,
                scope === "GLOBAL" && { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Ionicons
                name="globe-outline"
                size={13}
                color={scope === "GLOBAL" ? colors.primary : colors.textMuted}
              />
              <Text
                style={[
                  styles.scopeTabText,
                  { color: scope === "GLOBAL" ? colors.text : colors.textMuted },
                ]}
              >
                Global Feed
              </Text>
            </TouchableOpacity>
          </View>

          {/* Categories Scroll */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesRow}
          >
            {CATEGORIES.map((cat) => {
              const isSelected = activeCategory === cat.value;
              return (
                <TouchableOpacity
                  key={cat.value}
                  onPress={() => setActiveCategory(cat.value)}
                  style={[
                    styles.categoryPill,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.card,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryPillText,
                      {
                        color: isSelected ? colors.primaryForeground : colors.textMuted,
                        fontWeight: isSelected ? "700" : "500",
                      },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* 3. Whispers Feed */}
        {loading && posts.length === 0 ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>
              Decrypting campus whispers...
            </Text>
          </View>
        ) : posts.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="eye-off-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Whispers Yet</Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>
              Be the first to share an anonymous confession, tip, or banter with campus batchmates!
            </Text>
            <Button
              title="Post a Whisper"
              variant="default"
              size="sm"
              onPress={() => setIsComposeOpen(true)}
              style={{ marginTop: 8 }}
            />
          </View>
        ) : (
          <FlatList
            data={posts}
            keyExtractor={(item) => item.id}
            initialNumToRender={8}
            maxToRenderPerBatch={8}
            windowSize={5}
            removeClippedSubviews={Platform.OS === "android"}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => fetchPosts(true)}
                tintColor={colors.primary}
              />
            }
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const isExpanded = expandedPostIds.has(item.id);
              const isLong = item.content.length > 180;
              const seed = item.avatarSeed || item.handle || "bot";
              const avatarUri = `https://api.dicebear.com/9.x/bottts/png?seed=${encodeURIComponent(seed)}&size=80`;
              const mediaList = item.mediaUrls && item.mediaUrls.length > 0 ? item.mediaUrls : item.imageUrl ? [item.imageUrl] : [];
              const isLiked = item.userVote === "UP";
              const isAuthor = !!item.isAuthor || (item.authorId && user?.id && item.authorId === user.id) || (user?.role === "SUPER_ADMIN");

              return (
                <Card style={styles.postCard}>
                  {/* Author Row */}
                  <View style={styles.postAuthorRow}>
                    <View style={styles.authorLeft}>
                      <Image source={{ uri: avatarUri }} style={styles.botAvatar} />
                      <View style={{ marginLeft: 8 }}>
                        <Text style={[styles.authorHandle, { color: colors.text }]}>
                          {item.handle || "Anonymous Student"}
                        </Text>
                        <Text style={[styles.timeAgo, { color: colors.textMuted }]}>
                          {item.createdAt ? new Date(item.createdAt).toLocaleDateString([], { month: "short", day: "numeric" }) : "Just now"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.postAuthorRight}>
                      <Badge variant="outline" size="sm">
                        {item.category || "CONFESSION"}
                      </Badge>
                      {/* Author delete button */}
                      {isAuthor && (
                        <TouchableOpacity
                          onPress={() => handleDeletePost(item.id)}
                          style={[styles.deleteBtn, { backgroundColor: colors.destructive + "15", borderColor: colors.destructive + "30" }]}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="trash-outline" size={13} color={colors.destructive} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  {/* Content */}
                  <Text
                    style={[styles.postContent, { color: colors.text }]}
                    numberOfLines={isExpanded ? undefined : 4}
                  >
                    {item.content}
                  </Text>

                  {/* Read more toggle */}
                  {isLong && (
                    <TouchableOpacity onPress={() => toggleExpandPost(item.id)}>
                      <Text style={[styles.readMoreText, { color: colors.primary }]}>
                        {isExpanded ? "Show less ▴" : "Read more ▾"}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Attached Multi-Image Gallery */}
                  {mediaList.length === 1 ? (
                    <TouchableOpacity activeOpacity={0.9} onPress={() => setActiveModalPost(item)}>
                      <Image
                        source={{ uri: resolveMediaUri(mediaList[0]) }}
                        style={styles.postImageSingle}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  ) : mediaList.length > 1 ? (
                    <View style={styles.mediaCarouselContainer}>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.mediaCarouselRow}
                      >
                        {mediaList.map((imgUri, idx) => (
                          <TouchableOpacity
                            key={idx}
                            activeOpacity={0.9}
                            onPress={() => setActiveModalPost(item)}
                            style={styles.carouselImgWrapper}
                          >
                            <Image
                              source={{ uri: resolveMediaUri(imgUri) }}
                              style={styles.postImageMultiple}
                              resizeMode="cover"
                            />
                            <View style={styles.carouselIdxBadge}>
                              <Text style={styles.carouselIdxText}>{idx + 1}/{mediaList.length}</Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  ) : null}

                  {/* Footer Controls: Heart Like, Comments, Full View, Whisper DM */}
                  <View style={[styles.postFooter, { borderTopColor: colors.border }]}>
                    <View style={styles.footerLeftActions}>
                      {/* Responsive Heart Like Button (0ms Lag-Free) */}
                      <TouchableOpacity
                        onPress={() => handleToggleLike(item)}
                        style={[
                          styles.likeBtn,
                          {
                            backgroundColor: isLiked ? colors.destructive + "15" : colors.secondary,
                            borderColor: isLiked ? colors.destructive + "40" : colors.border,
                          },
                        ]}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={isLiked ? "heart" : "heart-outline"}
                          size={16}
                          color={isLiked ? colors.destructive : colors.textMuted}
                        />
                        <Text
                          style={[
                            styles.likeCount,
                            { color: isLiked ? colors.destructive : colors.text },
                          ]}
                        >
                          {item.upvotes || 0}
                        </Text>
                      </TouchableOpacity>

                      {/* Comments Button */}
                      <TouchableOpacity
                        onPress={() => handleOpenComments(item)}
                        style={[
                          styles.commentBtn,
                          {
                            backgroundColor: colors.secondary,
                            borderColor: colors.border,
                          },
                        ]}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name="chatbubble-outline"
                          size={15}
                          color={colors.textMuted}
                        />
                        <Text style={[styles.commentCount, { color: colors.text }]}>
                          {item.commentCount || 0}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Right side controls */}
                    <View style={styles.postControlsRight}>
                      <TouchableOpacity
                        style={[styles.controlBtn, { backgroundColor: colors.secondary + "80", borderColor: colors.border }]}
                        onPress={() => setActiveModalPost(item)}
                      >
                        <Feather name="maximize-2" size={12} color={colors.textMuted} />
                        <Text style={[styles.controlBtnText, { color: colors.textMuted }]}>
                          Full View
                        </Text>
                      </TouchableOpacity>

                      {!isAuthor && (
                        <TouchableOpacity
                          style={[styles.whisperDmBtn, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}
                          onPress={() => handleStartWhisperChat(item)}
                        >
                          <Ionicons name="chatbubble-ellipses-outline" size={13} color={colors.primary} />
                          <Text style={[styles.whisperDmText, { color: colors.primary }]}>
                            Whisper DM
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </Card>
              );
            }}
          />
        )}

        {/* 4. Compose Whisper Modal (Adaptive Soft Keyboard Support) */}
        <Modal
          visible={isComposeOpen}
          animationType="slide"
          transparent
          onRequestClose={() => !isSubmitting && setIsComposeOpen(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.keyboardAvoidingModal}
          >
            <TouchableOpacity
              style={styles.modalBackdropTouch}
              activeOpacity={1}
              onPress={() => !isSubmitting && setIsComposeOpen(false)}
            />
            <View
              style={[
                styles.modalSheet,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>Post Anonymous Whisper</Text>
                    <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                      Identity protected by cryptographic alias & robot avatar
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => !isSubmitting && setIsComposeOpen(false)}
                    style={{ padding: 4 }}
                  >
                    <Ionicons name="close" size={22} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  style={styles.modalScroll}
                  contentContainerStyle={{ paddingBottom: 28 }}
                >
                  {/* Category Selection */}
                  <View style={styles.formGroup}>
                    <Text style={[styles.formLabel, { color: colors.text }]}>Category</Text>
                    <View style={styles.categoryPillsWrap}>
                      {CATEGORIES.filter((c) => c.value !== "ALL").map((cat) => (
                        <TouchableOpacity
                          key={cat.value}
                          onPress={() => setComposeCategory(cat.value)}
                          style={[
                            styles.modalCategoryChip,
                            {
                              backgroundColor:
                                composeCategory === cat.value ? colors.primary + "18" : colors.secondary,
                              borderColor:
                                composeCategory === cat.value ? colors.primary : colors.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.modalCategoryChipText,
                              {
                                color: composeCategory === cat.value ? colors.primary : colors.textMuted,
                                fontWeight: composeCategory === cat.value ? "700" : "500",
                              },
                            ]}
                          >
                            {cat.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Text Content */}
                  <View style={[styles.formGroup, { marginTop: 12 }]}>
                    <Text style={[styles.formLabel, { color: colors.text }]}>Whisper Content *</Text>
                    <TextInput
                      style={[
                        styles.composeTextarea,
                        { color: colors.text, borderColor: colors.border, backgroundColor: colors.secondary + "40" },
                      ]}
                      placeholder="Share your campus secret, question, confession, or funny moment..."
                      placeholderTextColor={colors.textMuted}
                      value={composeContent}
                      onChangeText={setComposeContent}
                      multiline
                      numberOfLines={4}
                    />
                  </View>

                  {/* Multi-Image Attachment */}
                  <View style={[styles.formGroup, { marginTop: 12 }]}>
                    <View style={styles.mediaLabelRow}>
                      <Text style={[styles.formLabel, { color: colors.text }]}>
                        Attached Photos / Memes ({composeImages.length}/4)
                      </Text>
                      {composeImages.length < 4 && (
                        <TouchableOpacity
                          onPress={handlePickImage}
                          style={[styles.addPhotoChip, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}
                        >
                          <Feather name="plus" size={13} color={colors.primary} />
                          <Text style={[styles.addPhotoChipText, { color: colors.primary }]}>Add Image</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Thumbnail Previews */}
                    {composeImages.length > 0 && (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.thumbScrollRow}
                      >
                        {composeImages.map((uri, idx) => (
                          <View key={idx} style={styles.thumbWrap}>
                            <Image source={{ uri: resolveMediaUri(uri) }} style={styles.thumbImage} />
                            <TouchableOpacity
                              onPress={() => handleRemoveComposeImage(idx)}
                              style={styles.thumbDeleteBadge}
                            >
                              <Ionicons name="close" size={13} color="#FFF" />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </ScrollView>
                    )}

                    {/* Pick Button if 0 photos */}
                    {composeImages.length === 0 && (
                      <TouchableOpacity
                        onPress={handlePickImage}
                        style={[
                          styles.uploadImageBtn,
                          { borderColor: colors.border, backgroundColor: colors.secondary + "30" },
                        ]}
                      >
                        <Ionicons name="images-outline" size={20} color={colors.primary} />
                        <Text style={[styles.uploadImageText, { color: colors.text }]}>
                          Select Photos or Memes (up to 4)
                        </Text>
                      </TouchableOpacity>
                    )}

                    {/* Quick URL paste */}
                    {composeImages.length < 4 && (
                      <View style={styles.urlInputRow}>
                        <TextInput
                          style={[styles.urlInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.secondary + "30" }]}
                          placeholder="Or paste image URL link..."
                          placeholderTextColor={colors.textMuted}
                          value={composeUrlInput}
                          onChangeText={setComposeUrlInput}
                          autoCapitalize="none"
                        />
                        <TouchableOpacity
                          onPress={handleAddUrlImage}
                          disabled={!composeUrlInput.trim()}
                          style={[
                            styles.urlAddBtn,
                            { backgroundColor: composeUrlInput.trim() ? colors.primary : colors.secondary },
                          ]}
                        >
                          <Text style={[styles.urlAddBtnText, { color: composeUrlInput.trim() ? colors.primaryForeground : colors.textMuted }]}>
                            + Add
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  <View style={styles.modalFooter}>
                    <Button
                      title="Cancel"
                      variant="outline"
                      size="sm"
                      onPress={() => setIsComposeOpen(false)}
                      disabled={isSubmitting}
                    />
                    <Button
                      title={isSubmitting ? "Posting..." : "Post Whisper"}
                      variant="default"
                      size="sm"
                      onPress={handleCreateWhisper}
                      disabled={isSubmitting}
                    />
                  </View>
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
        </Modal>

        {/* 5. Comments Modal (Adaptive Soft Keyboard Support) */}
        <Modal
          visible={!!commentsModalPost}
          animationType="slide"
          transparent
          onRequestClose={() => setCommentsModalPost(null)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.keyboardAvoidingModal}
          >
            <TouchableOpacity
              style={styles.modalBackdropTouch}
              activeOpacity={1}
              onPress={() => setCommentsModalPost(null)}
            />
            {commentsModalPost && (
              <View
                style={[
                  styles.modalSheet,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>Whisper Replies</Text>
                    <Text style={[styles.modalSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
                      Replying to {commentsModalPost.handle}: "{commentsModalPost.content.slice(0, 45)}..."
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setCommentsModalPost(null)} style={{ padding: 4 }}>
                    <Ionicons name="close" size={22} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>

                {/* Comments List */}
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  style={{ maxHeight: SCREEN_HEIGHT * 0.42 }}
                  contentContainerStyle={{ gap: 10, paddingVertical: 6 }}
                >
                  {isLoadingComments ? (
                    <View style={{ paddingVertical: 24, alignItems: "center" }}>
                      <ActivityIndicator size="small" color={colors.primary} />
                      <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 8 }}>
                        Decrypting whisper replies...
                      </Text>
                    </View>
                  ) : postComments.length === 0 ? (
                    <View style={{ paddingVertical: 24, alignItems: "center", gap: 6 }}>
                      <Ionicons name="chatbubbles-outline" size={32} color={colors.textMuted} />
                      <Text style={{ fontSize: 13, fontWeight: "600", color: colors.text }}>No replies yet</Text>
                      <Text style={{ fontSize: 11, color: colors.textMuted, textAlign: "center" }}>
                        Be the first anonymous peer to reply to this whisper!
                      </Text>
                    </View>
                  ) : (
                    postComments.map((comment) => {
                      const cHandle = comment.profile?.handle || "Anonymous Student";
                      const cAvatar = `https://api.dicebear.com/9.x/bottts/png?seed=${encodeURIComponent(cHandle)}&size=80`;
                      return (
                        <View
                          key={comment.id}
                          style={[
                            styles.commentItem,
                            { backgroundColor: colors.secondary + "40", borderColor: colors.border },
                          ]}
                        >
                          <View style={styles.commentHeaderRow}>
                            <View style={styles.authorLeft}>
                              <Image source={{ uri: cAvatar }} style={styles.commentAvatar} />
                              <Text style={[styles.commentHandle, { color: colors.text }]}>
                                {cHandle}
                              </Text>
                            </View>
                            <Text style={[styles.commentTime, { color: colors.textMuted }]}>
                              {comment.createdAt ? new Date(comment.createdAt).toLocaleDateString([], { month: "short", day: "numeric" }) : "Just now"}
                            </Text>
                          </View>
                          <Text style={[styles.commentBody, { color: colors.text }]}>
                            {comment.content}
                          </Text>
                        </View>
                      );
                    })
                  )}
                </ScrollView>

                {/* Docked Reply Input Bar */}
                <View style={[styles.commentInputRow, { borderTopColor: colors.border }]}>
                  <TextInput
                    style={[
                      styles.commentTextInput,
                      { color: colors.text, borderColor: colors.border, backgroundColor: colors.secondary + "50" },
                    ]}
                    placeholder="Whisper a reply anonymously..."
                    placeholderTextColor={colors.textMuted}
                    value={commentInput}
                    onChangeText={setCommentInput}
                    multiline
                    maxLength={500}
                  />
                  <TouchableOpacity
                    onPress={handleSendComment}
                    disabled={!commentInput.trim() || isPostingComment}
                    style={[
                      styles.commentSendBtn,
                      {
                        backgroundColor: commentInput.trim() ? colors.primary : colors.secondary,
                      },
                    ]}
                  >
                    {isPostingComment ? (
                      <ActivityIndicator size="small" color={colors.primaryForeground} />
                    ) : (
                      <Ionicons
                        name="send"
                        size={15}
                        color={commentInput.trim() ? colors.primaryForeground : colors.textMuted}
                      />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </KeyboardAvoidingView>
        </Modal>

        {/* 6. Full-Screen Post View Modal */}
        <Modal
          visible={!!activeModalPost}
          animationType="fade"
          transparent
          onRequestClose={() => setActiveModalPost(null)}
        >
          <View style={styles.keyboardAvoidingModal}>
            <TouchableOpacity
              style={styles.modalBackdropTouch}
              activeOpacity={1}
              onPress={() => setActiveModalPost(null)}
            />
            {activeModalPost && (
              <View
                style={[
                  styles.modalSheet,
                  styles.fullViewContent,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View style={styles.modalHeader}>
                  <View style={styles.authorLeft}>
                    <Image
                      source={{
                        uri: `https://api.dicebear.com/9.x/bottts/png?seed=${encodeURIComponent(activeModalPost?.avatarSeed || activeModalPost?.handle || "bot")}&size=80`,
                      }}
                      style={styles.botAvatar}
                    />
                    <View style={{ marginLeft: 8 }}>
                      <Text style={[styles.authorHandle, { color: colors.text }]}>
                        {activeModalPost?.handle || "Anonymous Student"}
                      </Text>
                      <Text style={[styles.timeAgo, { color: colors.textMuted }]}>
                        {activeModalPost?.category || "CONFESSION"} • {activeModalPost?.campus || "Campus"}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    {((activeModalPost.authorId && user?.id && activeModalPost.authorId === user.id) || (user?.role === "SUPER_ADMIN")) && (
                      <TouchableOpacity
                        onPress={() => handleDeletePost(activeModalPost.id)}
                        style={[styles.deleteBtn, { backgroundColor: colors.destructive + "15", borderColor: colors.destructive + "30" }]}
                      >
                        <Ionicons name="trash-outline" size={14} color={colors.destructive} />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => setActiveModalPost(null)} style={{ padding: 4 }}>
                      <Ionicons name="close" size={22} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: SCREEN_HEIGHT * 0.45 }}>
                  <Text style={[styles.fullViewText, { color: colors.text }]}>
                    {activeModalPost?.content}
                  </Text>

                  {/* Images list in Full View */}
                  {activeModalPost?.mediaUrls && activeModalPost.mediaUrls.length > 0 ? (
                    <View style={{ marginTop: 12, gap: 10 }}>
                      {activeModalPost.mediaUrls.map((uri, i) => (
                        <Image
                          key={i}
                          source={{ uri: resolveMediaUri(uri) }}
                          style={styles.modalFullImage}
                          resizeMode="cover"
                        />
                      ))}
                    </View>
                  ) : activeModalPost?.imageUrl ? (
                    <Image
                      source={{ uri: resolveMediaUri(activeModalPost.imageUrl) }}
                      style={styles.modalFullImage}
                      resizeMode="cover"
                    />
                  ) : null}
                </ScrollView>

                <View style={[styles.fullViewFooter, { borderTopColor: colors.border }]}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => handleToggleLike(activeModalPost)}
                      style={[
                        styles.likeBtn,
                        {
                          backgroundColor: activeModalPost.userVote === "UP" ? colors.destructive + "15" : colors.secondary,
                          borderColor: activeModalPost.userVote === "UP" ? colors.destructive + "40" : colors.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name={activeModalPost.userVote === "UP" ? "heart" : "heart-outline"}
                        size={17}
                        color={activeModalPost.userVote === "UP" ? colors.destructive : colors.textMuted}
                      />
                      <Text
                        style={[
                          styles.likeCount,
                          { color: activeModalPost.userVote === "UP" ? colors.destructive : colors.text },
                        ]}
                      >
                        {activeModalPost.upvotes || 0}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => {
                        const target = activeModalPost;
                        setActiveModalPost(null);
                        handleOpenComments(target);
                      }}
                      style={[
                        styles.commentBtn,
                        {
                          backgroundColor: colors.secondary,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Ionicons name="chatbubble-outline" size={15} color={colors.textMuted} />
                      <Text style={[styles.commentCount, { color: colors.text }]}>
                        {activeModalPost.commentCount || 0}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Button
                    title="Start Whisper DM"
                    variant="default"
                    size="sm"
                    onPress={() => handleStartWhisperChat(activeModalPost)}
                    leftIcon={<Ionicons name="chatbubble-ellipses-outline" size={14} color={colors.primaryForeground} />}
                  />
                </View>
              </View>
            )}
          </View>
        </Modal>
      </View>
    </ClientServiceGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 52 : 36,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 11,
    marginTop: 1,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerDmBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
  },
  headerDmBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  composeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
  },
  composeBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  filterSection: {
    paddingVertical: 8,
    gap: 8,
  },
  scopeToggle: {
    flexDirection: "row",
    marginHorizontal: 16,
    padding: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  scopeTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  scopeTabText: {
    fontSize: 11,
    fontWeight: "700",
  },
  categoriesRow: {
    paddingHorizontal: 16,
    gap: 6,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  categoryPillText: {
    fontSize: 11,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 12,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  emptySub: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
  postCard: {
    padding: 14,
    gap: 10,
  },
  postAuthorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  authorLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  postAuthorRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  botAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  authorHandle: {
    fontSize: 13,
    fontWeight: "700",
  },
  timeAgo: {
    fontSize: 10,
    marginTop: 1,
  },
  deleteBtn: {
    padding: 5,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  postContent: {
    fontSize: 13,
    lineHeight: 19,
  },
  readMoreText: {
    fontSize: 11,
    fontWeight: "600",
  },
  postImageSingle: {
    width: "100%",
    height: 190,
    borderRadius: 10,
  },
  mediaCarouselContainer: {
    marginTop: 2,
  },
  mediaCarouselRow: {
    gap: 8,
  },
  carouselImgWrapper: {
    position: "relative",
    borderRadius: 10,
    overflow: "hidden",
  },
  postImageMultiple: {
    width: SCREEN_WIDTH * 0.65,
    height: 180,
    borderRadius: 10,
  },
  carouselIdxBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
  },
  carouselIdxText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "700",
  },
  postFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerLeftActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  likeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  likeCount: {
    fontSize: 12,
    fontWeight: "700",
  },
  commentBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  commentCount: {
    fontSize: 12,
    fontWeight: "700",
  },
  postControlsRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  controlBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  controlBtnText: {
    fontSize: 11,
  },
  whisperDmBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  whisperDmText: {
    fontSize: 11,
    fontWeight: "700",
  },
  /* Modal & Keyboard Adaptive Styles */
  keyboardAvoidingModal: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "flex-end",
  },
  modalBackdropTouch: {
    flex: 1,
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    padding: 18,
    maxHeight: "88%",
    gap: 12,
  },
  modalScroll: {
    flexGrow: 0,
    maxHeight: SCREEN_HEIGHT * 0.6,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
  modalSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  formGroup: {
    gap: 6,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  mediaLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  addPhotoChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  addPhotoChipText: {
    fontSize: 11,
    fontWeight: "700",
  },
  thumbScrollRow: {
    gap: 8,
    paddingVertical: 4,
  },
  thumbWrap: {
    position: "relative",
    width: 68,
    height: 68,
    borderRadius: 8,
    overflow: "hidden",
  },
  thumbImage: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  thumbDeleteBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.75)",
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  urlInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  urlInput: {
    flex: 1,
    height: 38,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 12,
  },
  urlAddBtn: {
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  urlAddBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  categoryPillsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  modalCategoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  modalCategoryChipText: {
    fontSize: 11,
  },
  composeTextarea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    minHeight: 85,
    textAlignVertical: "top",
  },
  modalFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 6,
  },
  /* Comments Sheet Styles */
  commentItem: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  commentHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  commentAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  commentHandle: {
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6,
  },
  commentTime: {
    fontSize: 10,
  },
  commentBody: {
    fontSize: 12,
    lineHeight: 17,
  },
  commentInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  commentTextInput: {
    flex: 1,
    minHeight: 38,
    maxHeight: 80,
    borderRadius: 19,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 12,
  },
  commentSendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  /* Full View Styles */
  fullViewContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    gap: 14,
  },
  fullViewText: {
    fontSize: 14,
    lineHeight: 22,
  },
  fullViewFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  uploadImageBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    marginTop: 4,
  },
  uploadImageText: {
    fontSize: 13,
    fontWeight: "600",
  },
  modalFullImage: {
    width: "100%",
    height: 220,
    borderRadius: 12,
  },
});
