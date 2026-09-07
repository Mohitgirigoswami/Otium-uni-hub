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
} from "react-native";
import { Ionicons, Feather, FontAwesome5 } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { GlassCard } from "../components/GlassCard";
import { Badge } from "../components/Badge";
import { Button } from "../components/MintButton";
import { apiClient } from "../services/apiClient";

interface WhisperPost {
  id: string;
  handle: string;
  avatarSeed: string;
  campus: string;
  category: "CONFESSION" | "ADVICE" | "MEME" | "CAMPUS_NEWS" | "GENERAL";
  content: string;
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
  const [posts, setPosts] = useState<WhisperPost[]>(INITIAL_WHISPERS);
  const [scope, setScope] = useState<"CAMPUS" | "GLOBAL">("CAMPUS");
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeContent, setComposeContent] = useState("");
  const [composeCategory, setComposeCategory] = useState<WhisperPost["category"]>("CONFESSION");
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const fetchWhispers = async () => {
    try {
      const query =
        activeCategory !== "ALL"
          ? `?feedType=${activeCategory}&scope=${scope}`
          : `?scope=${scope}`;
      const res = await apiClient.get(`/incognito${query}`);
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        const mapped: WhisperPost[] = res.data.map((p: any) => ({
          id: p.id,
          handle: p.profile?.handle || "AnonBot",
          avatarSeed: p.profile?.handle || p.id,
          campus: p.college?.name || "Campus Feed",
          category: p.feedType || "CONFESSION",
          content: p.content,
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
  }, [activeCategory, scope]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchWhispers();
    setIsRefreshing(false);
  };

  const filteredPosts = posts.filter((p) => {
    const matchesScope = scope === "GLOBAL" ? true : p.campus.includes("DTU") || p.campus.includes("Campus") || p.campus.includes("YMCA");
    const matchesCat = activeCategory === "ALL" ? true : p.category === activeCategory;
    return matchesScope && matchesCat;
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
      });
      setIsPublishing(false);

      if (res.success) {
        setComposeContent("");
        setIsComposeOpen(false);
        Alert.alert("🤫 Published!", "Your whisper is live on the anonymous wall.");
        fetchWhispers();
      } else {
        Alert.alert("Publish Failed", res.error || "Could not publish whisper.");
      }
    } catch (e: any) {
      setIsPublishing(false);
      Alert.alert("Network Error", e?.message || "Could not reach backend.");
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
        {/* Hero Header Banner (1:1 Web Port) */}
        <View style={styles.heroBanner}>
          <View style={styles.heroBadgeRow}>
            <Badge variant="purple" size="sm">
              Anonymous Multi-Campus Wall & Whispers
            </Badge>
          </View>
          <Text style={styles.heroTitle}>Whisper Wall</Text>
          <Text style={styles.heroSubtitle}>
            Express unfiltered opinions, share anonymous exam tips, memes, and campus banter. Identity is shielded behind private robot avatars.
          </Text>
        </View>

        {/* Scope Selector (My Campus vs Global Feed) */}
        <View style={styles.scopeTabsContainer}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setScope("CAMPUS")}
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
        onPress={() => setIsComposeOpen(true)}
        style={styles.fabButton}
      >
        <Feather name="edit-3" size={20} color="#FFFFFF" />
        <Text style={styles.fabText}>Whisper</Text>
      </TouchableOpacity>

      {/* Compose Whisper Modal */}
      <Modal visible={isComposeOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.composeModalCard}>
            <View style={styles.composeHeader}>
              <View style={styles.composeTitleRow}>
                <Ionicons name="eye-off-outline" size={20} color={colors.purple[400]} />
                <Text style={styles.composeTitle}>Post Anonymous Whisper</Text>
              </View>
              <TouchableOpacity onPress={() => setIsComposeOpen(false)}>
                <Ionicons name="close" size={22} color={colors.slate[400]} />
              </TouchableOpacity>
            </View>

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

            {/* Whisper Text Input */}
            <TextInput
              multiline
              numberOfLines={5}
              value={composeContent}
              onChangeText={setComposeContent}
              placeholder="What's on your mind? Share confessions, exam tips, or campus stories safely..."
              placeholderTextColor={colors.slate[500]}
              style={styles.composeTextInput}
            />

            <Button
              variant="purple"
              size="lg"
              title="Publish Whisper Anonymously"
              onPress={handlePublishWhisper}
              style={{ marginTop: 8 }}
            />
          </GlassCard>
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
    backgroundColor: "rgba(147, 51, 234, 0.12)",
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
  scopeTabsContainer: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 14,
    backgroundColor: colors.slate[900],
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  scopeTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  scopeTabActive: {
    backgroundColor: colors.brand[600],
  },
  scopeTabActivePurple: {
    backgroundColor: colors.purple[600],
  },
  scopeTabText: {
    fontSize: 13,
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
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: colors.slate[900],
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  categoryChipActive: {
    backgroundColor: colors.purple[600],
    borderColor: colors.purple[500],
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.slate[300],
  },
  categoryChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  postsList: {
    gap: 14,
  },
  postCard: {
    padding: 18,
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
    borderRadius: 10,
    backgroundColor: "rgba(168, 85, 247, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  authorHandle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  postMeta: {
    fontSize: 11,
    color: colors.slate[400],
    marginTop: 1,
  },
  postContent: {
    fontSize: 13.5,
    color: colors.slate[200],
    lineHeight: 20,
  },
  postFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
  },
  voteGroup: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  voteBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  voteBtnUpActive: {
    backgroundColor: "rgba(20, 184, 166, 0.15)",
    borderRadius: 10,
  },
  voteBtnDownActive: {
    backgroundColor: "rgba(244, 63, 94, 0.15)",
    borderRadius: 10,
  },
  voteCount: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.slate[300],
  },
  voteDivider: {
    width: 1,
    height: 14,
    backgroundColor: colors.cardBorder,
  },
  rightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  actionCountBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    padding: 6,
  },
  actionCountText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.slate[400],
  },
  fabButton: {
    position: "absolute",
    bottom: 24,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 24,
    backgroundColor: colors.purple[600],
    shadowColor: colors.purple[500],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  fabText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "flex-end",
  },
  composeModalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    padding: 24,
    gap: 14,
  },
  composeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  composeTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  composeTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  composeLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.slate[400],
    textTransform: "uppercase",
  },
  composeCatGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  composeCatChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: colors.slate[800],
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
    color: colors.slate[300],
  },
  composeCatChipTextActive: {
    color: "#FFFFFF",
  },
  composeTextInput: {
    backgroundColor: colors.slate[900],
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    color: "#FFFFFF",
    minHeight: 110,
    textAlignVertical: "top",
  },
});
