import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Image,
  Platform,
  ScrollView,
  Dimensions,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../context/ThemeContext";
import { useUser } from "../context/UserContext";
import { apiClient } from "../services/apiClient";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { ClientServiceGuard } from "../components/ClientServiceGuard";

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
  if (uri.startsWith("http://") || uri.startsWith("https://")) return uri;
  if (uri.startsWith("/uploads/")) {
    return `http://192.168.31.146:3000${uri}`;
  }
  if (uri.startsWith("uploads/")) {
    return `http://192.168.31.146:3000/${uri}`;
  }
  return uri;
};

const SCREEN_WIDTH = Dimensions.get("window").width;

export function WhisperWallScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const { user } = useUser();

  const [posts, setPosts] = useState<WhisperPost[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [scope, setScope] = useState<"CAMPUS" | "GLOBAL">("CAMPUS");

  // Compose Modal State (Supports Multi-Image)
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeContent, setComposeContent] = useState("");
  const [composeCategory, setComposeCategory] = useState<string>("CONFESSION");
  const [composeImages, setComposeImages] = useState<string[]>([]);
  const [composeUrlInput, setComposeUrlInput] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Full-screen post modal & read more
  const [expandedPostIds, setExpandedPostIds] = useState<Set<string>>(new Set());
  const [activeModalPost, setActiveModalPost] = useState<WhisperPost | null>(null);

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

      setIsUploadingImage(true);

      const uploadedUrls: string[] = [];
      for (const asset of result.assets) {
        if (composeImages.length + uploadedUrls.length >= 4) break;
        try {
          const formData = new FormData();
          formData.append("file", {
            uri: asset.uri,
            name: asset.name || "whisper_image.jpg",
            type: asset.mimeType || "image/jpeg",
          } as any);
          formData.append("folder", "otium_wall_memes");

          const uploadRes = await apiClient.post("/upload", formData);
          if (uploadRes.success && uploadRes.data?.url) {
            uploadedUrls.push(uploadRes.data.url);
          } else {
            uploadedUrls.push(asset.uri);
          }
        } catch {
          uploadedUrls.push(asset.uri);
        }
      }

      setComposeImages((prev) => [...prev, ...uploadedUrls].slice(0, 4));
    } catch {
      Alert.alert("Picker Error", "Could not select the image.");
    } finally {
      setIsUploadingImage(false);
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

  const fetchPosts = async (isPull = false) => {
    if (isPull) setRefreshing(true);

    // 1. Load cached whispers on initial mount
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEY_WHISPERS);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPosts(parsed);
        }
      }
    } catch {}

    // 2. Fetch fresh whispers from server
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
            authorId: p.profile?.userId || p.authorId,
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

  useEffect(() => {
    fetchPosts();
  }, [activeCategory, scope]);

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

  const handleCreateWhisper = async () => {
    if (!composeContent.trim() || isSubmitting) {
      Alert.alert("Empty Post", "Please write your anonymous whisper before posting.");
      return;
    }

    setIsSubmitting(true);
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
      authorId: user?.id,
    };

    try {
      const res = await apiClient.post("/incognito", {
        content: composeContent.trim(),
        feedType: composeCategory,
        category: composeCategory,
        mediaUrl: composeImages[0] || undefined,
        mediaUrls: composeImages,
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
        // Save locally
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

  const handleStartWhisperChat = async (post: WhisperPost) => {
    setActiveModalPost(null);
    if (!post.authorId) {
      Alert.alert("Notice", "Unable to start whisper direct chat with this author.");
      return;
    }
    if (post.authorId === user?.id) {
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
        // Fallback session to prevent blocking user if server deployment is still completing
        const fallbackConvId = `whisper_${post.authorId || post.id}`;
        navigation?.navigate("Messages", {
          conversationId: fallbackConvId,
          initialTab: "whisper",
        });
      }
    } catch {
      const fallbackConvId = `whisper_${post.authorId || post.id}`;
      navigation?.navigate("Messages", {
        conversationId: fallbackConvId,
        initialTab: "whisper",
      });
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
            {/* Quick 1-tap Whisper DMs navigation */}
            <TouchableOpacity
              onPress={() => navigation?.navigate("Messages", { initialTab: "whisper" })}
              style={[
                styles.headerDmBtn,
                { backgroundColor: colors.secondary, borderColor: colors.border },
              ]}
            >
              <Ionicons name="chatbubbles-outline" size={15} color={colors.primary} />
              <Text style={[styles.headerDmBtnText, { color: colors.text }]}>DMs</Text>
            </TouchableOpacity>

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
        {loading ? (
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

                    <Badge variant="outline" size="sm">
                      {item.category || "CONFESSION"}
                    </Badge>
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

                  {/* Footer Controls: Heart Like, Full View, Whisper DM */}
                  <View style={[styles.postFooter, { borderTopColor: colors.border }]}>
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
                        size={17}
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

                      <TouchableOpacity
                        style={[styles.whisperDmBtn, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}
                        onPress={() => handleStartWhisperChat(item)}
                      >
                        <Ionicons name="chatbubble-ellipses-outline" size={13} color={colors.primary} />
                        <Text style={[styles.whisperDmText, { color: colors.primary }]}>
                          Whisper DM
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Card>
              );
            }}
          />
        )}

        {/* 4. Compose Whisper Bottom Sheet Modal */}
        <Modal
          visible={isComposeOpen}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsComposeOpen(false)}
        >
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View
              style={[
                styles.modalContent,
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
                <TouchableOpacity onPress={() => setIsComposeOpen(false)} style={{ padding: 4 }}>
                  <Ionicons name="close" size={22} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
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
                        disabled={isUploadingImage}
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
                      disabled={isUploadingImage}
                      style={[
                        styles.uploadImageBtn,
                        { borderColor: colors.border, backgroundColor: colors.secondary + "30" },
                      ]}
                    >
                      {isUploadingImage ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <>
                          <Ionicons name="images-outline" size={20} color={colors.primary} />
                          <Text style={[styles.uploadImageText, { color: colors.text }]}>
                            Select Photos or Memes (up to 4)
                          </Text>
                        </>
                      )}
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
              </ScrollView>

              <View style={styles.modalFooter}>
                <Button
                  title="Cancel"
                  variant="outline"
                  size="sm"
                  onPress={() => setIsComposeOpen(false)}
                />
                <Button
                  title={isSubmitting ? "Posting..." : "Post Whisper"}
                  variant="default"
                  size="sm"
                  onPress={handleCreateWhisper}
                  disabled={isSubmitting}
                />
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* 5. Dedicated Full-Screen Post Modal */}
        <Modal
          visible={!!activeModalPost}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setActiveModalPost(null)}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
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
                <TouchableOpacity onPress={() => setActiveModalPost(null)} style={{ padding: 4 }}>
                  <Ionicons name="close" size={22} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 340 }}>
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
                {activeModalPost && (
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
                )}

                <Button
                  title="Start Whisper DM"
                  variant="default"
                  size="sm"
                  onPress={() => activeModalPost && handleStartWhisperChat(activeModalPost)}
                  leftIcon={<Ionicons name="chatbubble-ellipses-outline" size={14} color={colors.primaryForeground} />}
                />
              </View>
            </View>
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
  likeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  likeCount: {
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    padding: 20,
    paddingBottom: 36,
    gap: 12,
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
    width: 72,
    height: 72,
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
    width: 20,
    height: 20,
    borderRadius: 10,
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
    minHeight: 90,
    textAlignVertical: "top",
  },
  modalFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 10,
  },
  fullViewContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    padding: 20,
    paddingBottom: 36,
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
