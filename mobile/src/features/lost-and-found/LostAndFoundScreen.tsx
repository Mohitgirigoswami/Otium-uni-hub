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
  Image,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { useUser } from "../../context/UserContext";
import { apiClient } from "../../services/apiClient";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { ClientServiceGuard } from "../../components/ClientServiceGuard";
import { useDebounce } from "../../hooks/useDebounce";

const CATEGORIES = [
  { label: "All Items", value: "ALL" },
  { label: "Electronics & Audio", value: "ELECTRONICS" },
  { label: "ID Cards & Keys", value: "ID_CARD" },
  { label: "Wallets & Bags", value: "WALLET" },
  { label: "Books & Notes", value: "BOOK" },
  { label: "Other Belongings", value: "OTHER" },
];

import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY_LOST_FOUND = "@otium_cached_lost_found";

export function LostAndFoundScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { user } = useUser();

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 350);

  // Report Item Modal
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [locationFound, setLocationFound] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [category, setCategory] = useState("ELECTRONICS");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [claimingItemId, setClaimingItemId] = useState<string | null>(null);

  // 0. Immediate 0ms cache restore on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY_LOST_FOUND)
      .then((cached) => {
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setItems(parsed);
          }
        }
      })
      .catch(() => {});
  }, []);

  const fetchItems = async (isPull = false, search = debouncedSearchQuery) => {
    if (isPull) setRefreshing(true);

    try {
      let url = "/lost-and-found";
      const params = [];
      if (activeCategory !== "ALL") params.push(`category=${activeCategory}`);
      if (search.trim()) params.push(`search=${encodeURIComponent(search.trim())}`);
      if (params.length > 0) url += `?${params.join("&")}`;

      const res = await apiClient.get(url);
      if (res.success && Array.isArray(res.data)) {
        setItems(res.data);
        if (!search.trim() && activeCategory === "ALL") {
          AsyncStorage.setItem(STORAGE_KEY_LOST_FOUND, JSON.stringify(res.data)).catch(() => {});
        }
      }
    } catch (err) {
      console.log("[Fetch Lost Items Note]: Operating in offline cached mode");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchItems(false, debouncedSearchQuery);
  }, [activeCategory, debouncedSearchQuery]);

  const handleReportFoundItem = async () => {
    if (!title.trim() || !locationFound.trim() || isSubmitting) {
      Alert.alert("Missing Fields", "Please specify the item title and location where found.");
      return;
    }

    setIsSubmitting(true);
    const localItem = {
      id: `local-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      locationFound: locationFound.trim(),
      imageUrl: imageUrl.trim() || "https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=400",
      category,
      status: "FOUND",
      createdAt: new Date().toISOString(),
      founder: { name: user?.name || "Student Finder" },
    };

    try {
      const res = await apiClient.post("/lost-and-found", {
        title: title.trim(),
        description: description.trim(),
        locationFound: locationFound.trim(),
        imageUrl: imageUrl.trim() || "https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=400",
        category,
      });

      if (res.success) {
        Alert.alert("Item Reported", "Thank you for reporting! The item is now listed in the campus registry.");
        setIsReportModalOpen(false);
        setTitle("");
        setDescription("");
        setLocationFound("");
        setImageUrl("");
        fetchItems();
      } else {
        throw new Error(res.error);
      }
    } catch (err: any) {
      // Offline fallback: Save on device
      const updated = [localItem, ...items];
      setItems(updated);
      AsyncStorage.setItem(STORAGE_KEY_LOST_FOUND, JSON.stringify(updated)).catch(() => {});
      Alert.alert("Saved Locally ☁️", "Network unavailable. Found item report saved on your device.");
      setIsReportModalOpen(false);
      setTitle("");
      setDescription("");
      setLocationFound("");
      setImageUrl("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClaim = async (item: any) => {
    if (claimingItemId) return;
    setClaimingItemId(item.id);

    try {
      const res = await apiClient.post("/lost-and-found", {
        action: "CLAIM",
        itemId: item.id,
        claimNotes: "Claimed via mobile app verification",
      });

      if (res.success) {
        Alert.alert("Claimed!", "Item marked as claimed. Please coordinate pickup with the finder.");
        fetchItems();
      } else {
        Alert.alert("Notice", res.error || "Could not claim item.");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Could not claim item.");
    } finally {
      setClaimingItemId(null);
    }
  };

  const handleChatWithFinder = async (item: any) => {
    if (!item.finderId) return;
    try {
      const res = await apiClient.post("/chat", {
        participantTwoId: item.finderId,
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
    <ClientServiceGuard serviceKey="LOST_AND_FOUND" navigation={navigation}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => navigation?.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleCol}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Campus Lost & Found</Text>
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>
            Verified campus recovery registry
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setIsReportModalOpen(true)}
          style={[styles.reportHeaderBtn, { backgroundColor: colors.primary }]}
        >
          <Feather name="plus" size={16} color={colors.primaryForeground} />
        </TouchableOpacity>
      </View>

      {/* Search Input */}
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
            placeholder="Search items (e.g. Earphones, Student ID, Wallet)..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {/* Category Pills */}
      <View style={styles.categoryScrollWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.value}
              onPress={() => setActiveCategory(cat.value)}
              style={[
                styles.categoryChip,
                {
                  backgroundColor:
                    activeCategory === cat.value ? colors.primary : colors.card,
                  borderColor:
                    activeCategory === cat.value ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  {
                    color:
                      activeCategory === cat.value
                        ? colors.primaryForeground
                        : colors.textMuted,
                    fontWeight: activeCategory === cat.value ? "700" : "500",
                  },
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Items List */}
      {loading && items.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Searching campus lost & found...
          </Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="search-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Items Found</Text>
          <Text style={[styles.emptySub, { color: colors.textMuted }]}>
            No belongings matching your search. Found something on campus? Report it to help a student!
          </Text>
          <Button
            title="Report Found Item"
            variant="default"
            size="sm"
            onPress={() => setIsReportModalOpen(true)}
            style={{ marginTop: 8 }}
          />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchItems(true)}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isClaimed = item.status === "CLAIMED";
            const isFinder = item.finderId === user?.id;

            return (
              <Card style={styles.itemCard}>
                <View style={styles.cardTop}>
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={styles.itemThumb} resizeMode="cover" />
                  ) : (
                    <View style={[styles.itemThumbPlaceholder, { backgroundColor: colors.secondary }]}>
                      <Ionicons name="image-outline" size={24} color={colors.textMuted} />
                    </View>
                  )}

                  <View style={styles.itemDetails}>
                    <View style={styles.itemTitleRow}>
                      <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Badge variant={isClaimed ? "secondary" : "warning"} size="sm">
                        {isClaimed ? "Claimed" : "Unclaimed"}
                      </Badge>
                    </View>

                    <View style={styles.metaLine}>
                      <Ionicons name="location-outline" size={12} color={colors.textMuted} />
                      <Text style={[styles.metaText, { color: colors.textMuted }]} numberOfLines={1}>
                        {item.locationFound}
                      </Text>
                    </View>

                    <View style={styles.metaLine}>
                      <Feather name="calendar" size={11} color={colors.textMuted} />
                      <Text style={[styles.metaText, { color: colors.textMuted }]}>
                        {new Date(item.dateFound || item.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                </View>

                {item.description ? (
                  <Text style={[styles.itemDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}

                {/* Action Row */}
                <View style={[styles.itemActionRow, { borderTopColor: colors.border }]}>
                  <TouchableOpacity
                    style={styles.chatFinderBtn}
                    onPress={() => handleChatWithFinder(item)}
                  >
                    <Feather name="message-square" size={12} color={colors.primary} />
                    <Text style={[styles.chatFinderText, { color: colors.primary }]}>
                      Chat with Finder
                    </Text>
                  </TouchableOpacity>

                  {!isClaimed && (
                    <Button
                      title={claimingItemId === item.id ? "Claiming..." : "Claim Item"}
                      variant="outline"
                      size="sm"
                      disabled={claimingItemId === item.id}
                      onPress={() => handleClaim(item)}
                    />
                  )}
                </View>
              </Card>
            );
          }}
        />
      )}

      {/* Report Found Item Bottom Sheet Modal */}
      <Modal
        visible={isReportModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsReportModalOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TouchableOpacity
            style={styles.modalBackdropTouch}
            activeOpacity={1}
            onPress={() => setIsReportModalOpen(false)}
          />
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Report Found Item</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                  Help a campus student recover their lost belongings
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsReportModalOpen(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
            >
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Item Title</Text>
                <Input
                  value={title}
                  onChangeText={setTitle}
                  placeholder="e.g. Sony WH-1000XM4 Headphones, Blue Wallet"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Category</Text>
                <View style={styles.modalCategoryChips}>
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
                <Text style={[styles.formLabel, { color: colors.text }]}>Location Found</Text>
                <Input
                  value={locationFound}
                  onChangeText={setLocationFound}
                  placeholder="e.g. Central Library 2nd Floor, Cafeteria Table 4"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Photo Image URL</Text>
                <Input
                  value={imageUrl}
                  onChangeText={setImageUrl}
                  placeholder="Paste image link or upload..."
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Description & Identifying Marks</Text>
                <Input
                  value={description}
                  onChangeText={setDescription}
                  placeholder="e.g. Black color case with anime sticker, small scratch on right side"
                />
              </View>

              <View style={styles.modalFooter}>
                <Button
                  title="Cancel"
                  variant="outline"
                  size="sm"
                  onPress={() => setIsReportModalOpen(false)}
                />
                <Button
                  title={isSubmitting ? "Submitting..." : "Report Found Item"}
                  variant="default"
                  size="sm"
                  onPress={handleReportFoundItem}
                  disabled={isSubmitting}
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
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
  reportHeaderBtn: {
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
  itemCard: {
    padding: 12,
    gap: 8,
  },
  cardTop: {
    flexDirection: "row",
    gap: 10,
  },
  itemThumb: {
    width: 64,
    height: 64,
    borderRadius: 8,
  },
  itemThumbPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  itemDetails: {
    flex: 1,
    gap: 3,
  },
  itemTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: "700",
    flex: 1,
  },
  metaLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 11,
  },
  itemDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  itemActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  chatFinderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 2,
  },
  chatFinderText: {
    fontSize: 11,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  modalBackdropTouch: {
    flex: 1,
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    padding: 20,
    maxHeight: "88%",
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalScrollContent: {
    paddingBottom: 28,
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
  formLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
  modalCategoryChips: {
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
