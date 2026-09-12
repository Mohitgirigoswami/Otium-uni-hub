import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons, Feather, FontAwesome5 } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { GlassCard } from "../components/GlassCard";
import { Badge } from "../components/Badge";
import { Button } from "../components/MintButton";
import { apiClient } from "../services/apiClient";
import { useUser } from "../context/UserContext";

interface WhisperPost {
  id: string;
  handle: string;
  avatarSeed: string;
  campus: string;
  collegeId?: string;
  category: "CONFESSION" | "ADVICE" | "MEME" | "CAMPUS_NEWS" | "GENERAL";
  content: string;
  mediaUrls?: string[];
  mediaUrl?: string;
  timeAgo: string;
  upvotes: number;
  downvotes: number;
  userVote?: "UP" | "DOWN";
  commentCount: number;
}

const INITIAL_WHISPERS: WhisperPost[] = [
  {
    id: "1",
    handle: "ShadowRunner_42",
    avatarSeed: "ShadowRunner",
    campus: "DTU Campus",
    category: "CONFESSION",
    content: "Accidentally submitted my meme compilation instead of the Software Engineering final project file on the portal at 11:59 PM. Professor gave me full marks for 'creativity and exceptional humor'.",
    timeAgo: "14m ago",
    upvotes: 84,
    downvotes: 3,
    commentCount: 19,
  },
  {
    id: "2",
    handle: "LibraryGhost",
    avatarSeed: "LibraryGhost",
    campus: "DTU Campus",
    category: "ADVICE",
    content: "Pro-tip for 2nd years: The 3rd floor reading room AC vent table #18 is the only spot where campus Wi-Fi hits 300 Mbps without packet drops. Keep it secret.",
    timeAgo: "45m ago",
    upvotes: 142,
    downvotes: 1,
    commentCount: 32,
  },
  {
    id: "3",
    handle: "HostelChef_99",
    avatarSeed: "HostelChef",
    campus: "Global Feed",
    category: "MEME",
    content: "Me calculating how many classes I can bunk without getting debarred: 🧠📈\nMe realizing mid-terms are worth 50% attendance weightage: 📉💀",
    timeAgo: "2h ago",
    upvotes: 215,
    downvotes: 8,
    commentCount: 47,
  },
  {
    id: "4",
    handle: "CampusInsider",
    avatarSeed: "CampusInsider",
    campus: "DTU Campus",
    category: "CAMPUS_NEWS",
    content: "Night cafeteria will officially remain open until 3:30 AM during end-sem examination weeks starting this Monday. Chai and Maggi stalls confirmed!",
    timeAgo: "5h ago",
    upvotes: 310,
    downvotes: 4,
    commentCount: 68,
  },
];

const CATEGORIES = [
  { label: "All Whispers", value: "ALL" },
  { label: "🔥 Confessions", value: "CONFESSION" },
  { label: "💡 Campus Advice", value: "ADVICE" },
  { label: "😂 Memes & Banter", value: "MEME" },
  { label: "📢 Campus News", value: "CAMPUS_NEWS" },
];

export function WhisperWallScreen() {
  const { user, setUser } = useUser();
  const [posts, setPosts] = useState<WhisperPost[]>(INITIAL_WHISPERS);
  const [scope, setScope] = useState<"CAMPUS" | "GLOBAL">("CAMPUS");
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeContent, setComposeContent] = useState("");
  const [composeCategory, setComposeCategory] = useState<WhisperPost["category"]>("CONFESSION");
  const [composeImages, setComposeImages] = useState<string[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Campus Selector Modal State
  const [isCampusModalOpen, setIsCampusModalOpen] = useState(false);
  const [colleges, setColleges] = useState<any[]>([]);
  const [isLoadingColleges, setIsLoadingColleges] = useState(false);
  const [isSavingCampus, setIsSavingCampus] = useState(false);

  // Fetch colleges list
  const fetchColleges = async () => {
    setIsLoadingColleges(true);
    try {
      const res = await apiClient.get("/colleges");
      if (res.success && Array.isArray(res.data)) {
        setColleges(res.data);
      }
    } catch (e) {
      console.warn("Could not fetch colleges:", e);
    } finally {
      setIsLoadingColleges(false);
    }
  };

  // Check if campus is assigned on initial load
  useEffect(() => {
    fetchColleges();
    async function checkSavedCampus() {
      try {
        const storedCampus = await AsyncStorage.getItem("@otium_selected_campus");
        if (storedCampus) {
          const parsed = JSON.parse(storedCampus);
          if (parsed?.id) {
            // Already chosen in advance! Do NOT re-prompt
            if (!user?.collegeId) {
              setUser((prev: any) => ({ ...prev, collegeId: parsed.id, college: parsed }));
            }
            return;
          }
        }
      } catch {}

      if (!user?.collegeId) {
        // Only prompt user if NO campus was ever selected
        setIsCampusModalOpen(true);
      }
    }

    checkSavedCampus();
  }, [user?.collegeId]);

  const fetchWhispers = async (targetCollegeId?: string) => {
    try {
      const activeCollegeId = targetCollegeId || user?.collegeId;
      let query = `?scope=${scope}`;
      if (activeCategory !== "ALL") {
        query += `&feedType=${activeCategory}`;
      }
      if (scope === "CAMPUS" && activeCollegeId) {
        query += `&collegeId=${activeCollegeId}`;
      }

      const res = await apiClient.get(`/incognito${query}`);
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        const mapped: WhisperPost[] = res.data.map((p: any) => ({
          id: p.id,
          handle: p.profile?.handle || "AnonBot",
          avatarSeed: p.profile?.handle || p.id,
          campus: p.college?.name || "Campus Feed",
          collegeId: p.collegeId,
          category: p.feedType || "CONFESSION",
          content: p.content,
          mediaUrls: Array.isArray(p.mediaUrls) && p.mediaUrls.length > 0
            ? p.mediaUrls
            : (p.mediaUrl ? [p.mediaUrl] : []),
          timeAgo: new Date(p.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          upvotes: p._count?.likes || p.likesCount || 0,
          downvotes: 0,
          commentCount: p._count?.comments || 0,
        }));
        setPosts(mapped);
      }
    } catch (e) {
      console.warn("Could not fetch whispers:", e);
    }
  };

  useEffect(() => {
    fetchWhispers();
  }, [activeCategory, scope, user?.collegeId]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchWhispers();
    setIsRefreshing(false);
  };

  const handleSelectCampus = async (college: any) => {
    setIsSavingCampus(true);
    try {
      // 1. Immediately persist to AsyncStorage so it never prompts again!
      await AsyncStorage.setItem(
        "@otium_selected_campus",
        JSON.stringify({ id: college.id, name: college.name, code: college.code })
      );

      setUser((prev: any) => ({ ...prev, collegeId: college.id, college }));
      setIsCampusModalOpen(false);
      setScope("CAMPUS");
      fetchWhispers(college.id);

      // 2. Persist to backend profile in background
      apiClient.patch("/profile", { collegeId: college.id }).catch(() => {});
      Alert.alert("Campus Selected", `Switched to ${college.name}!`);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not save campus.");
    } finally {
      setIsSavingCampus(false);
    }
  };

  const filteredPosts = posts.filter((p) => {
    const matchesCat = activeCategory === "ALL" ? true : p.category === activeCategory;
    return matchesCat;
  });

  const handleVote = (postId: string, type: "UP" | "DOWN") => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          if (p.userVote === type) {
            return {
              ...p,
              upvotes: type === "UP" ? p.upvotes - 1 : p.upvotes,
              downvotes: type === "DOWN" ? p.downvotes - 1 : p.downvotes,
              userVote: undefined,
            };
          } else {
            const oldUp = p.userVote === "UP" ? p.upvotes - 1 : p.upvotes;
            const oldDown = p.userVote === "DOWN" ? p.downvotes - 1 : p.downvotes;
            return {
              ...p,
              upvotes: type === "UP" ? oldUp + 1 : oldUp,
              downvotes: type === "DOWN" ? oldDown + 1 : oldDown,
              userVote: type,
            };
          }
        }
        return p;
      })
    );
  };

  const handlePickImage = async () => {
    if (composeImages.length >= 4) {
      Alert.alert("Limit Reached", "You can attach up to 4 images per whisper.");
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/jpeg", "image/png", "image/webp", "image/gif"],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      setIsUploadingImage(true);

      const formData = new FormData();
      formData.append("file", {
        uri: asset.uri,
        name: asset.name || "whisper_image.jpg",
        type: asset.mimeType || "image/jpeg",
      } as any);
      formData.append("folder", "otium_wall_memes");

      const uploadRes = await apiClient.upload("/upload", formData);
      setIsUploadingImage(false);

      if (uploadRes.success && uploadRes.data?.url) {
        setComposeImages((prev) => [...prev, uploadRes.data.url]);
      } else {
        Alert.alert("Upload Failed", uploadRes.error || "Could not upload image. Please try again.");
      }
    } catch (err: any) {
      setIsUploadingImage(false);
      Alert.alert("Image Error", err?.message || "Failed to pick image.");
    }
  };

  const handleRemoveComposeImage = (idxToRemove: number) => {
    setComposeImages((prev) => prev.filter((_, idx) => idx !== idxToRemove));
  };

  const handlePublishWhisper = async () => {
    if (!composeContent.trim()) {
      Alert.alert("Error", "Please write a whisper before publishing.");
      return;
    }

    setIsPublishing(true);
    try {
      const res = await apiClient.post("/incognito", {
        content: composeContent.trim(),
        feedType: composeCategory,
        collegeId: user?.collegeId,
        mediaUrls: composeImages,
        mediaUrl: composeImages.length > 0 ? composeImages[0] : undefined,
      });
      setIsPublishing(false);

      if (res.success) {
        Alert.alert("Whisper Published! 🎭", "Your anonymous whisper is live on the campus wall.");
        setIsComposeOpen(false);
        setComposeContent("");
        setComposeImages([]);
        fetchWhispers();
      } else {
        Alert.alert("Error", res.error || "Failed to publish whisper.");
      }
    } catch (e: any) {
      setIsPublishing(false);
      Alert.alert("Error", e.message || "Failed to publish.");
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.brand[400]}
          />
        }
      >
        {/* Hero Header Banner */}
        <View style={styles.heroBanner}>
          <View style={styles.heroBadgeRow}>
            <Badge variant="purple" size="sm">
              Anonymous Campus Wall & Whispers
            </Badge>
          </View>
          <Text style={styles.heroTitle}>Whisper Wall</Text>
          <Text style={styles.heroSubtitle}>
            Express unfiltered opinions, share anonymous exam tips, memes, and campus banter. Identity is shielded behind private robot avatars.
          </Text>
        </View>

        {/* Campus Switcher Banner (Requirement: Open Whisper Wall asks/selects campus) */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setIsCampusModalOpen(true)}
          style={styles.campusSwitcherBanner}
        >
          <View style={styles.campusSwitcherLeft}>
            <View style={styles.campusIconCircle}>
              <Ionicons name="school" size={16} color={colors.brand[400]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.campusSwitcherName} numberOfLines={1}>
                {user?.college?.name || "Choose Your Campus Hub"}
              </Text>
              <Text style={styles.campusSwitcherSubtitle}>
                {user?.college?.name ? "Tap to change university campus" : "Select campus to view local student whispers"}
              </Text>
            </View>
          </View>
          <View style={styles.campusSwitcherRight}>
            <Text style={styles.campusSwitcherAction}>Switch</Text>
            <Feather name="chevron-right" size={16} color={colors.brand[400]} />
          </View>
        </TouchableOpacity>

        {/* Scope Selector (My Campus vs Global Feed) */}
        <View style={styles.scopeTabsContainer}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              if (!user?.collegeId) {
                setIsCampusModalOpen(true);
              } else {
                setScope("CAMPUS");
              }
            }}
            style={[styles.scopeTab, scope === "CAMPUS" && styles.scopeTabActive]}
          >
            <Ionicons
              name="business"
              size={14}
              color={scope === "CAMPUS" ? "#FFFFFF" : colors.slate[400]}
            />
            <Text
              style={[
                styles.scopeTabText,
                scope === "CAMPUS" && styles.scopeTabTextActive,
              ]}
            >
              My Campus
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setScope("GLOBAL")}
            style={[styles.scopeTab, scope === "GLOBAL" && styles.scopeTabActivePurple]}
          >
            <Ionicons
              name="globe-outline"
              size={14}
              color={scope === "GLOBAL" ? "#FFFFFF" : colors.slate[400]}
            />
            <Text
              style={[
                styles.scopeTabText,
                scope === "GLOBAL" && styles.scopeTabTextActive,
              ]}
            >
              Global Feed
            </Text>
          </TouchableOpacity>
        </View>

        {/* Category Horizontal Chips */}
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
                  styles.categoryChip,
                  isSelected && styles.categoryChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    isSelected && styles.categoryChipTextActive,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Whisper Posts Feed */}
        <View style={styles.postsList}>
          {filteredPosts.map((post) => {
            const isConfession = post.category === "CONFESSION";
            const isAdvice = post.category === "ADVICE";
            const isMeme = post.category === "MEME";

            return (
              <GlassCard key={post.id} style={styles.postCard}>
                {/* Post Header: Avatar, Alias, Campus & Category Badge */}
                <View style={styles.postHeader}>
                  <View style={styles.authorRow}>
                    <View style={styles.avatarCircle}>
                      <FontAwesome5 name="robot" size={14} color={colors.purple[400]} />
                    </View>
                    <View>
                      <Text style={styles.authorHandle}>@{post.handle}</Text>
                      <Text style={styles.postMeta}>
                        {post.campus} • {post.timeAgo}
                      </Text>
                    </View>
                  </View>

                  <Badge
                    variant={
                      isConfession
                        ? "danger"
                        : isAdvice
                        ? "brand"
                        : isMeme
                        ? "purple"
                        : "neutral"
                    }
                    size="sm"
                  >
                    {post.category}
                  </Badge>
                </View>

                {/* Post Text Content */}
                <Text style={styles.postContent}>{post.content}</Text>

                {/* Post Attached Images (Single or Multi-Grid) */}
                {post.mediaUrls && post.mediaUrls.length > 0 && (
                  <View style={styles.mediaContainer}>
                    {post.mediaUrls.length === 1 ? (
                      <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => setEnlargedImage(post.mediaUrls![0])}
                        style={styles.singleImageWrapper}
                      >
                        <Image
                          source={{ uri: post.mediaUrls[0] }}
                          style={styles.singleImage}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.multiImageGrid}>
                        {post.mediaUrls.slice(0, 4).map((imgUrl, imgIdx) => (
                          <TouchableOpacity
                            key={imgIdx}
                            activeOpacity={0.9}
                            onPress={() => setEnlargedImage(imgUrl)}
                            style={styles.gridImageWrapper}
                          >
                            <Image
                              source={{ uri: imgUrl }}
                              style={styles.gridImage}
                              resizeMode="cover"
                            />
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                )}

                {/* Interaction Footer: Upvote, Downvote, Comment, Share */}
                <View style={styles.postFooter}>
                  {/* Voting Group */}
                  <View style={styles.voteGroup}>
                    <TouchableOpacity
                      onPress={() => handleVote(post.id, "UP")}
                      style={[
                        styles.voteBtn,
                        post.userVote === "UP" && styles.voteBtnUpActive,
                      ]}
                    >
                      <Ionicons
                        name={post.userVote === "UP" ? "arrow-up-circle" : "arrow-up-outline"}
                        size={18}
                        color={post.userVote === "UP" ? colors.brand[400] : colors.slate[400]}
                      />
                      <Text
                        style={[
                          styles.voteCount,
                          post.userVote === "UP" && { color: colors.brand[400] },
                        ]}
                      >
                        {post.upvotes}
                      </Text>
                    </TouchableOpacity>

                    <View style={styles.voteDivider} />

                    <TouchableOpacity
                      onPress={() => handleVote(post.id, "DOWN")}
                      style={[
                        styles.voteBtn,
                        post.userVote === "DOWN" && styles.voteBtnDownActive,
                      ]}
                    >
                      <Ionicons
                        name={post.userVote === "DOWN" ? "arrow-down-circle" : "arrow-down-outline"}
                        size={18}
                        color={post.userVote === "DOWN" ? colors.rose[400] : colors.slate[400]}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Comment & Share Counts */}
                  <View style={styles.rightActions}>
                    <TouchableOpacity style={styles.actionCountBtn}>
                      <Ionicons name="chatbubble-outline" size={16} color={colors.slate[400]} />
                      <Text style={styles.actionCountText}>{post.commentCount}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionCountBtn}>
                      <Feather name="share-2" size={15} color={colors.slate[400]} />
                    </TouchableOpacity>
                  </View>
                </View>
              </GlassCard>
            );
          })}
        </View>
      </ScrollView>

      {/* Floating Action Button (FAB) / Compose Trigger */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => {
          if (!user?.collegeId) {
            setIsCampusModalOpen(true);
          } else {
            setIsComposeOpen(true);
          }
        }}
        style={styles.fabButton}
      >
        <Feather name="edit-3" size={20} color="#FFFFFF" />
        <Text style={styles.fabText}>Whisper</Text>
      </TouchableOpacity>

      {/* Compose Whisper Modal with Image Attachment & Keyboard UX */}
      <Modal visible={isComposeOpen} transparent animationType="slide" onRequestClose={() => setIsComposeOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalOverlayTouch}
            activeOpacity={1}
            onPress={() => setIsComposeOpen(false)}
          />
          <GlassCard style={styles.composeModalCard}>
            <View style={styles.composeHeader}>
              <View style={styles.composeTitleRow}>
                <Ionicons name="eye-off-outline" size={20} color={colors.purple[400]} />
                <Text style={styles.composeTitle}>Post Anonymous Whisper</Text>
              </View>
              <TouchableOpacity onPress={() => setIsComposeOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={22} color={colors.slate[400]} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Category Select Pills */}
              <Text style={styles.composeLabel}>Select Topic / Category:</Text>
              <View style={styles.composeCatGrid}>
                {(["CONFESSION", "ADVICE", "MEME", "CAMPUS_NEWS"] as const).map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setComposeCategory(cat)}
                    style={[
                      styles.composeCatChip,
                      composeCategory === cat && styles.composeCatChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.composeCatChipText,
                        composeCategory === cat && styles.composeCatChipTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Content Input */}
              <TextInput
                multiline
                numberOfLines={4}
                placeholder="What's on your mind? Share confessions, exam tips, or campus tea... Identity is completely anonymous."
                placeholderTextColor={colors.slate[500]}
                value={composeContent}
                onChangeText={setComposeContent}
                style={styles.composeInput}
              />

              {/* Attached Images Preview Row */}
              {composeImages.length > 0 && (
                <View style={styles.attachedImagesRow}>
                  {composeImages.map((imgUrl, idx) => (
                    <View key={idx} style={styles.attachedImageItem}>
                      <Image source={{ uri: imgUrl }} style={styles.attachedThumbnail} />
                      <TouchableOpacity
                        style={styles.removeAttachedBtn}
                        onPress={() => handleRemoveComposeImage(idx)}
                      >
                        <Ionicons name="close-circle" size={20} color={colors.rose[400]} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Attach Image / Meme Button */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handlePickImage}
                disabled={isUploadingImage}
                style={styles.attachImageBtn}
              >
                {isUploadingImage ? (
                  <ActivityIndicator size="small" color={colors.purple[400]} />
                ) : (
                  <Feather name="image" size={16} color={colors.purple[400]} />
                )}
                <Text style={styles.attachImageBtnText}>
                  {isUploadingImage
                    ? "Uploading image to wall..."
                    : composeImages.length > 0
                    ? `Add another photo (${composeImages.length}/4)`
                    : "Attach Photo or Meme (Up to 4)"}
                </Text>
              </TouchableOpacity>

              {/* Submit Button */}
              <Button
                title="Publish Anonymously"
                variant="brand"
                loading={isPublishing}
                onPress={handlePublishWhisper}
                style={{ marginTop: 14 }}
              />
            </ScrollView>
          </GlassCard>
        </KeyboardAvoidingView>
      </Modal>

      {/* Fullscreen Image Preview Modal */}
      <Modal visible={!!enlargedImage} transparent animationType="fade" onRequestClose={() => setEnlargedImage(null)}>
        <View style={styles.fullImageBackdrop}>
          <TouchableOpacity
            style={styles.closeFullImageBtn}
            onPress={() => setEnlargedImage(null)}
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          {enlargedImage && (
            <Image
              source={{ uri: enlargedImage }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {/* Select Campus Modal (Prompt on open or tap switch) */}
      <Modal visible={isCampusModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.campusModalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={styles.campusIconCircle}>
                  <Ionicons name="school" size={18} color={colors.brand[400]} />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Select Your Campus</Text>
                  <Text style={styles.modalSubtitle}>Customizes your Whisper Wall & Local Feed</Text>
                </View>
              </View>
              {user?.collegeId && (
                <TouchableOpacity onPress={() => setIsCampusModalOpen(false)}>
                  <Ionicons name="close" size={22} color={colors.slate[400]} />
                </TouchableOpacity>
              )}
            </View>

            {isLoadingColleges ? (
              <View style={{ padding: 40, alignItems: "center" }}>
                <ActivityIndicator size="large" color={colors.brand[400]} />
                <Text style={{ color: colors.slate[400], marginTop: 12, fontSize: 13 }}>
                  Loading university campuses...
                </Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                {colleges.map((col) => {
                  const isSelected = user?.collegeId === col.id;
                  return (
                    <TouchableOpacity
                      key={col.id}
                      activeOpacity={0.7}
                      onPress={() => handleSelectCampus(col)}
                      style={[
                        styles.collegeItem,
                        isSelected && styles.collegeItemActive,
                      ]}
                    >
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text
                          style={[
                            styles.collegeNameText,
                            isSelected && { color: colors.brand[400] },
                          ]}
                        >
                          {col.name}
                        </Text>
                        <Text style={styles.collegeCityText}>
                          📍 {col.city || "Campus"}, {col.state || "India"}
                        </Text>
                      </View>
                      {isSelected ? (
                        <Ionicons name="checkmark-circle" size={22} color={colors.brand[400]} />
                      ) : (
                        <Feather name="chevron-right" size={18} color={colors.slate[500]} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {isSavingCampus && (
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 10 }}>
                <ActivityIndicator size="small" color={colors.brand[400]} />
                <Text style={{ color: colors.slate[400], fontSize: 12 }}>Saving campus preference...</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 90,
    gap: 16,
  },
  heroBanner: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: "rgba(168, 85, 247, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(168, 85, 247, 0.3)",
  },
  heroBadgeRow: {
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.4,
    lineHeight: 28,
  },
  heroSubtitle: {
    fontSize: 13,
    color: colors.slate[300],
    marginTop: 6,
    lineHeight: 19,
  },
  campusSwitcherBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "rgba(20, 184, 166, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(20, 184, 166, 0.25)",
  },
  campusSwitcherLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  campusIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(20, 184, 166, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  campusSwitcherName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  campusSwitcherSubtitle: {
    fontSize: 10.5,
    color: colors.slate[400],
    marginTop: 1,
  },
  campusSwitcherRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingLeft: 8,
  },
  campusSwitcherAction: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.brand[400],
  },
  scopeTabsContainer: {
    flexDirection: "row",
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 4,
    gap: 6,
  },
  scopeTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
  },
  scopeTabActive: {
    backgroundColor: colors.brand[600],
  },
  scopeTabActivePurple: {
    backgroundColor: colors.purple[600],
  },
  scopeTabText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: colors.slate[400],
  },
  scopeTabTextActive: {
    color: "#FFFFFF",
  },
  categoriesRow: {
    gap: 8,
    paddingVertical: 2,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  categoryChipActive: {
    backgroundColor: colors.slate[800],
    borderColor: colors.brand[400],
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.slate[400],
  },
  categoryChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  postsList: {
    gap: 14,
  },
  postCard: {
    padding: 16,
    gap: 12,
  },
  postHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(168, 85, 247, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(168, 85, 247, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  authorHandle: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  postMeta: {
    fontSize: 10.5,
    color: colors.slate[400],
    marginTop: 1,
  },
  postContent: {
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.slate[200],
  },
  postFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
  },
  voteGroup: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.slate[900],
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  voteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
  },
  voteBtnUpActive: {
    backgroundColor: "rgba(20, 184, 166, 0.15)",
  },
  voteBtnDownActive: {
    backgroundColor: "rgba(244, 63, 94, 0.15)",
  },
  voteDivider: {
    width: 1,
    height: 14,
    backgroundColor: colors.cardBorder,
  },
  voteCount: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.slate[300],
  },
  rightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  actionCountBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  actionCountText: {
    fontSize: 12,
    color: colors.slate[400],
    fontWeight: "600",
  },
  fabButton: {
    position: "absolute",
    bottom: 24,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.purple[600],
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: colors.purple[500],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  fabText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "flex-end",
  },
  composeModalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    padding: 20,
    gap: 12,
  },
  composeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  composeTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  composeTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  composeLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.slate[400],
    textTransform: "uppercase",
    marginTop: 4,
  },
  composeCatGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  composeCatChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.slate[900],
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  composeCatChipActive: {
    backgroundColor: colors.purple[600],
    borderColor: colors.purple[400],
  },
  composeCatChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.slate[400],
  },
  composeCatChipTextActive: {
    color: "#FFFFFF",
  },
  composeInput: {
    backgroundColor: colors.slate[900],
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 14,
    padding: 14,
    fontSize: 13.5,
    color: "#FFFFFF",
    minHeight: 110,
    textAlignVertical: "top",
    marginTop: 6,
  },
  campusModalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    padding: 20,
    gap: 14,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  modalSubtitle: {
    fontSize: 11,
    color: colors.slate[400],
    marginTop: 2,
  },
  collegeItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 8,
  },
  collegeItemActive: {
    borderColor: colors.brand[400],
    backgroundColor: "rgba(20, 184, 166, 0.1)",
  },
  collegeNameText: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  collegeCityText: {
    fontSize: 11,
    color: colors.slate[400],
  },
  modalOverlayTouch: {
    flex: 1,
  },
  mediaContainer: {
    marginTop: 8,
    borderRadius: 14,
    overflow: "hidden",
  },
  singleImageWrapper: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.slate[900],
  },
  singleImage: {
    width: "100%",
    height: 220,
    borderRadius: 14,
  },
  multiImageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  gridImageWrapper: {
    width: "48.5%",
    height: 140,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.slate[900],
  },
  gridImage: {
    width: "100%",
    height: "100%",
  },
  attachedImagesRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    flexWrap: "wrap",
  },
  attachedImageItem: {
    position: "relative",
    width: 68,
    height: 68,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.brand[400],
  },
  attachedThumbnail: {
    width: "100%",
    height: "100%",
  },
  removeAttachedBtn: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 10,
  },
  attachImageBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(168, 85, 247, 0.3)",
    backgroundColor: "rgba(168, 85, 247, 0.08)",
    marginTop: 12,
  },
  attachImageBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: colors.purple[300],
  },
  fullImageBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeFullImageBtn: {
    position: "absolute",
    top: 48,
    right: 20,
    zIndex: 10,
    padding: 8,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 20,
  },
  fullImage: {
    width: "92%",
    height: "80%",
  },
});
