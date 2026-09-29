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
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { useUser } from "../../context/UserContext";
import { apiClient } from "../../services/apiClient";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { ClientServiceGuard } from "../../components/ClientServiceGuard";

const CATEGORIES = [
  { label: "All Categories", value: "ALL" },
  { label: "Coding & Dev", value: "CODING" },
  { label: "Assignments & Reports", value: "ASSIGNMENT" },
  { label: "UI/UX & Design", value: "DESIGN" },
  { label: "Projects & Lab Work", value: "PROJECT" },
  { label: "Research & Summaries", value: "RESEARCH" },
  { label: "Tutoring & Doubts", value: "TUTORING" },
];

import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY_GIGS = "@otium_cached_gigs";

export function GigsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { user } = useUser();

  const [gigs, setGigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Post Task Modal State
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budgetRupees, setBudgetRupees] = useState("");
  const [category, setCategory] = useState("ASSIGNMENT");
  const [deadline, setDeadline] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [claimingGigId, setClaimingGigId] = useState<string | null>(null);

  const fetchGigs = async (isPull = false) => {
    if (isPull) setRefreshing(true);

    // 1. Immediate offline cache restore
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEY_GIGS);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setGigs(parsed);
        }
      }
    } catch {}

    // 2. Fetch fresh gigs from server
    try {
      let url = "/gigs";
      const params = [];
      if (activeCategory !== "ALL") params.push(`category=${activeCategory}`);
      if (statusFilter !== "ALL") params.push(`status=${statusFilter}`);
      if (searchQuery.trim()) params.push(`search=${encodeURIComponent(searchQuery.trim())}`);
      if (params.length > 0) url += `?${params.join("&")}`;

      const res = await apiClient.get(url);
      if (res.success && Array.isArray(res.data)) {
        setGigs(res.data);
        AsyncStorage.setItem(STORAGE_KEY_GIGS, JSON.stringify(res.data)).catch(() => {});
      }
    } catch (err) {
      console.log("[Fetch Gigs Note]: Operating in offline cached mode");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchGigs();
  }, [activeCategory, statusFilter, searchQuery]);

  const handleCreateGig = async () => {
    const budget = Number(budgetRupees);
    if (!title.trim() || !description.trim() || !budget || budget < 50 || isSubmitting) {
      Alert.alert("Missing Fields", "Please specify title, description, and a minimum bounty of ₹50.");
      return;
    }

    setIsSubmitting(true);
    const localGig = {
      id: `local-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      budget: budget * 100,
      budgetRupees: budget,
      category,
      status: "OPEN",
      deadline: deadline.trim() || undefined,
      createdAt: new Date().toISOString(),
      poster: { name: user?.name || "Student Requester" },
      posterId: user?.id,
    };

    try {
      const res = await apiClient.post("/gigs", {
        title: title.trim(),
        description: description.trim(),
        budgetRupees: budget,
        category,
        deadline: deadline.trim() || undefined,
      });

      if (res.success) {
        Alert.alert("Task Posted!", "Your task has been posted to the campus freelance board.");
        setIsPostModalOpen(false);
        setTitle("");
        setDescription("");
        setBudgetRupees("");
        setDeadline("");
        fetchGigs();
      } else {
        throw new Error(res.error);
      }
    } catch (err: any) {
      // Offline fallback: Save on device
      const updated = [localGig, ...gigs];
      setGigs(updated);
      AsyncStorage.setItem(STORAGE_KEY_GIGS, JSON.stringify(updated)).catch(() => {});
      Alert.alert("Saved Locally ☁️", "Network unavailable. Task bounty saved on your device.");
      setIsPostModalOpen(false);
      setTitle("");
      setDescription("");
      setBudgetRupees("");
      setDeadline("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClaimTask = async (gig: any) => {
    if (gig.posterId === user?.id) {
      Alert.alert("Notice", "You cannot claim your own task bounty.");
      return;
    }

    Alert.alert(
      "Claim Task Bounty",
      `Are you sure you want to take up this task for ₹${(gig.budget ? gig.budget / 100 : gig.budgetRupees || 0).toFixed(0)}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Claim Task",
          onPress: async () => {
            setClaimingGigId(gig.id);
            try {
              const res = await apiClient.post("/gigs", {
                action: "CLAIM",
                gigId: gig.id,
              });

              if (res.success) {
                Alert.alert("Task Claimed!", "You are assigned to this task. Coordinate with the poster to complete deliverables.");
                fetchGigs();
              } else {
                Alert.alert("Notice", res.error || "Failed to claim task.");
              }
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to claim task.");
            } finally {
              setClaimingGigId(null);
            }
          },
        },
      ]
    );
  };

  const handleChatWithPoster = async (posterId: string) => {
    if (!posterId || posterId === user?.id) return;
    try {
      const res = await apiClient.post("/chat", {
        participantTwoId: posterId,
        isAnonymousChat: false,
      });
      if (res.success && res.data) {
        navigation?.navigate("Messages", { conversationId: res.data.id });
      } else {
        navigation?.navigate("Messages");
      }
    } catch {
      navigation?.navigate("Messages");
    }
  };

  return (
    <ClientServiceGuard serviceKey="GIG_HUB" navigation={navigation}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Top Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => navigation?.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleCol}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Campus Freelance Gigs</Text>
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>
            Student assignments & tasks with escrow safeguards
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setIsPostModalOpen(true)}
          style={[styles.postHeaderBtn, { backgroundColor: colors.primary }]}
        >
          <Feather name="plus" size={16} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBarWrap}>
        <View
          style={[
            styles.searchBox,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Feather name="search" size={16} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search assignments, coding tasks, lab reports..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {/* Category Pills */}
      <View style={styles.categoryScrollWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
        >
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.value;
            return (
              <TouchableOpacity
                key={cat.value}
                onPress={() => setActiveCategory(cat.value)}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: isActive ? colors.primary : colors.card,
                    borderColor: isActive ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    {
                      color: isActive ? colors.primaryForeground : colors.textMuted,
                      fontWeight: isActive ? "700" : "500",
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

      {/* Tasks List */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Loading campus task bounties...
          </Text>
        </View>
      ) : gigs.length === 0 ? (
        <View style={styles.emptyWrap}>
          <MaterialCommunityIcons name="briefcase-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Tasks Available</Text>
          <Text style={[styles.emptySub, { color: colors.textMuted }]}>
            No tasks match your filter. Have an assignment, design work, or coding bug? Post a bounty for campus peers to solve!
          </Text>
          <Button
            title="Post a Task Bounty"
            variant="default"
            size="sm"
            onPress={() => setIsPostModalOpen(true)}
            style={{ marginTop: 8 }}
          />
        </View>
      ) : (
        <FlatList
          data={gigs}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchGigs(true)}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isOpen = item.status === "OPEN";
            const isPoster = user?.id === item.posterId;
            const isAssignedToMe = user?.id === item.assignedToId;
            const budgetPaise = item.budget ?? item.budgetPaise;
            const displayBudget = `₹${(budgetPaise ? budgetPaise / 100 : item.budgetRupees || 0).toFixed(0)}`;

            return (
              <Card style={styles.gigCard}>
                {/* Top status & budget row */}
                <View style={styles.gigTopRow}>
                  <Badge variant={isOpen ? "default" : "secondary"} size="sm">
                    {item.status}
                  </Badge>
                  <Text style={[styles.bountyText, { color: colors.primary }]}>
                    {displayBudget}
                  </Text>
                </View>

                {/* Title and description */}
                <View style={styles.gigBody}>
                  <Text style={[styles.gigTitle, { color: colors.text }]} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={[styles.gigDesc, { color: colors.textMuted }]} numberOfLines={3}>
                    {item.description}
                  </Text>
                </View>

                {/* Meta details */}
                <View style={[styles.gigMetaRow, { borderTopColor: colors.border }]}>
                  <View style={styles.categoryBadgeWrap}>
                    <Text style={[styles.categoryTag, { color: colors.textMuted }]}>
                      {item.category}
                    </Text>
                  </View>
                  <View style={styles.deadlineWrap}>
                    <Feather name="clock" size={11} color={colors.textMuted} />
                    <Text style={[styles.deadlineText, { color: colors.textMuted }]}>
                      {item.deadline
                        ? new Date(item.deadline).toLocaleDateString([], { month: "short", day: "numeric" })
                        : "Flexible"}
                    </Text>
                  </View>
                </View>

                {/* Bottom Actions */}
                <View style={[styles.gigActionRow, { borderTopColor: colors.border }]}>
                  <Text style={[styles.posterName, { color: colors.textMuted }]}>
                    Posted by: {item.poster?.name || "Student"}
                  </Text>

                  {isOpen && !isPoster && (
                    <Button
                      title={claimingGigId === item.id ? "Claiming..." : "Claim Task"}
                      variant="default"
                      size="sm"
                      disabled={claimingGigId === item.id}
                      onPress={() => handleClaimTask(item)}
                    />
                  )}

                  {isPoster && (
                    <Badge variant="primary" size="sm">
                      Your Posted Task
                    </Badge>
                  )}

                  {isAssignedToMe && (
                    <TouchableOpacity
                      style={styles.chatActionBtn}
                      onPress={() => handleChatWithPoster(item.posterId)}
                    >
                      <Feather name="message-square" size={12} color={colors.primary} />
                      <Text style={[styles.chatActionText, { color: colors.primary }]}>
                        Chat Poster
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </Card>
            );
          }}
        />
      )}

      {/* Post Task Modal */}
      <Modal
        visible={isPostModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsPostModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Post a Campus Task</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                  Funds held safely in proxy escrow until deliverables are confirmed
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsPostModalOpen(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Task Title *</Text>
                <Input
                  value={title}
                  onChangeText={setTitle}
                  placeholder="e.g. Build React Component or Debug Python Script"
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>Bounty Budget (₹ INR) *</Text>
                  <Input
                    value={budgetRupees}
                    onChangeText={setBudgetRupees}
                    keyboardType="numeric"
                    placeholder="Min 50"
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>Deadline</Text>
                  <Input
                    value={deadline}
                    onChangeText={setDeadline}
                    placeholder="e.g. In 3 days or YYYY-MM-DD"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Category *</Text>
                <View style={styles.modalChipsWrap}>
                  {CATEGORIES.filter((c) => c.value !== "ALL").map((c) => (
                    <TouchableOpacity
                      key={c.value}
                      onPress={() => setCategory(c.value)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor:
                            category === c.value ? colors.primary + "18" : colors.secondary,
                          borderColor: category === c.value ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: category === c.value ? colors.primary : colors.textMuted,
                            fontWeight: category === c.value ? "700" : "500",
                          },
                        ]}
                      >
                        {c.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Detailed Description *</Text>
                <Input
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Explain assignment specifications, requirements, and deliverable format..."
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                title="Cancel"
                variant="outline"
                size="sm"
                onPress={() => setIsPostModalOpen(false)}
              />
              <Button
                title={isSubmitting ? "Posting..." : "Post Task to Campus"}
                variant="default"
                size="sm"
                onPress={handleCreateGig}
                disabled={isSubmitting}
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
  backBtn: {
    padding: 4,
  },
  headerTitleCol: {
    flex: 1,
    marginLeft: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  headerSub: {
    fontSize: 11,
    marginTop: 1,
  },
  postHeaderBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBarWrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  categoryScrollWrap: {
    paddingVertical: 8,
  },
  categoryRow: {
    paddingHorizontal: 16,
    gap: 6,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryChipText: {
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
  gigCard: {
    padding: 14,
    gap: 10,
  },
  gigTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bountyText: {
    fontSize: 17,
    fontWeight: "900",
  },
  gigBody: {
    gap: 4,
  },
  gigTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  gigDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  gigMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  categoryBadgeWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  categoryTag: {
    fontSize: 11,
    fontWeight: "600",
  },
  deadlineWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  deadlineText: {
    fontSize: 11,
  },
  gigActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  posterName: {
    fontSize: 11,
    flex: 1,
  },
  chatActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  chatActionText: {
    fontSize: 11,
    fontWeight: "600",
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
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
  modalSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  formGroup: {
    marginBottom: 12,
  },
  formRow: {
    flexDirection: "row",
    gap: 10,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
  modalChipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 11,
  },
  modalFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 16,
  },
});
