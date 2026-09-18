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
} from "react-native";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useUser } from "../context/UserContext";
import { apiClient } from "../services/apiClient";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { ClientServiceGuard } from "../components/ClientServiceGuard";

const CATEGORIES = [
  { label: "All Items", value: "ALL" },
  { label: "Books & Notes", value: "BOOKS_NOTES" },
  { label: "Electronics", value: "ELECTRONICS" },
  { label: "Cycles & Transport", value: "CYCLES_TRANSPORT" },
  { label: "Hostel Furniture", value: "FURNITURE" },
  { label: "Hostel Essentials", value: "HOSTEL_ESSENTIALS" },
  { label: "Apparel & Merch", value: "CLOTHING" },
  { label: "Other", value: "OTHER" },
];

const CONDITIONS = [
  { label: "Brand New", value: "BRAND_NEW" },
  { label: "Like New (Mint)", value: "LIKE_NEW" },
  { label: "Good Condition", value: "GOOD" },
  { label: "Fair / Used", value: "FAIR" },
];

import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY_MARKETPLACE = "@otium_cached_marketplace";

export function MarketplaceScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { user } = useUser();

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Sell Modal State
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceRupees, setPriceRupees] = useState("");
  const [category, setCategory] = useState("BOOKS_NOTES");
  const [condition, setCondition] = useState("LIKE_NEW");
  const [imageUrl, setImageUrl] = useState("");
  const [sellerPhone, setSellerPhone] = useState(user?.phone || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [connectingSellerId, setConnectingSellerId] = useState<string | null>(null);

  const fetchItems = async (isPull = false) => {
    if (isPull) setRefreshing(true);

    // 1. Immediate offline cache restore
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEY_MARKETPLACE);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setItems(parsed);
        }
      }
    } catch {}

    // 2. Fetch fresh items from server
    try {
      let url = "/marketplace";
      const params = [];
      if (activeCategory !== "ALL") params.push(`category=${activeCategory}`);
      if (statusFilter !== "ALL") params.push(`status=${statusFilter}`);
      if (searchQuery.trim()) params.push(`search=${encodeURIComponent(searchQuery.trim())}`);
      if (params.length > 0) url += `?${params.join("&")}`;

      const res = await apiClient.get(url);
      if (res.success && Array.isArray(res.data)) {
        setItems(res.data);
        AsyncStorage.setItem(STORAGE_KEY_MARKETPLACE, JSON.stringify(res.data)).catch(() => {});
      }
    } catch (err) {
      console.log("[Fetch Marketplace Note]: Operating in offline cached mode");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [activeCategory, statusFilter, searchQuery]);

  const handlePostItem = async () => {
    const price = Number(priceRupees);
    if (!title.trim() || !description.trim() || !price || price <= 0 || isSubmitting) {
      Alert.alert("Missing Fields", "Please provide a valid title, description, and price in Rupees.");
      return;
    }

    setIsSubmitting(true);
    const localItem = {
      id: `local-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      price: price * 100,
      priceRupees: price,
      category,
      condition,
      images: imageUrl.trim() ? [imageUrl.trim()] : ["https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400"],
      status: "AVAILABLE",
      createdAt: new Date().toISOString(),
      seller: { name: user?.name || "Student Seller" },
      sellerId: user?.id,
    };

    try {
      const res = await apiClient.post("/marketplace", {
        title: title.trim(),
        description: description.trim(),
        priceRupees: price,
        category,
        condition,
        images: imageUrl.trim() ? [imageUrl.trim()] : [],
        sellerPhone: sellerPhone.trim() || undefined,
      });

      if (res.success) {
        Alert.alert("Listed!", "Your item has been published to the campus peer marketplace.");
        setIsSellModalOpen(false);
        setTitle("");
        setDescription("");
        setPriceRupees("");
        setImageUrl("");
        fetchItems();
      } else {
        throw new Error(res.error);
      }
    } catch (err: any) {
      // Offline fallback: Save on device
      const updated = [localItem, ...items];
      setItems(updated);
      AsyncStorage.setItem(STORAGE_KEY_MARKETPLACE, JSON.stringify(updated)).catch(() => {});
      Alert.alert("Saved Locally ☁️", "Network unavailable. Your marketplace listing was saved on your device.");
      setIsSellModalOpen(false);
      setTitle("");
      setDescription("");
      setPriceRupees("");
      setImageUrl("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMessageSeller = async (sellerId: string) => {
    if (sellerId === user?.id) {
      Alert.alert("Notice", "You are the seller of this item.");
      return;
    }

    setConnectingSellerId(sellerId);
    try {
      const res = await apiClient.post("/chat", {
        participantTwoId: sellerId,
        isAnonymousChat: false,
      });

      if (res.success && res.data) {
        navigation?.navigate("Messages", { conversationId: res.data.id });
      } else {
        navigation?.navigate("Messages");
      }
    } catch {
      navigation?.navigate("Messages");
    } finally {
      setConnectingSellerId(null);
    }
  };

  const handleMarkSold = async (itemId: string) => {
    try {
      const res = await apiClient.post("/marketplace", {
        action: "MARK_SOLD",
        itemId,
      });
      if (res.success) {
        Alert.alert("Updated", "Item marked as sold.");
        fetchItems();
      } else {
        Alert.alert("Error", res.error || "Could not mark item as sold.");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Could not mark item as sold.");
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    Alert.alert("Remove Listing", "Are you sure you want to remove this item listing?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            const res = await apiClient.post("/marketplace", {
              action: "DELETE",
              itemId,
            });
            if (res.success) {
              Alert.alert("Removed", "Listing removed from campus marketplace.");
              fetchItems();
            } else {
              Alert.alert("Error", res.error || "Could not delete listing.");
            }
          } catch (err: any) {
            Alert.alert("Error", err.message || "Could not delete listing.");
          }
        },
      },
    ]);
  };

  return (
    <ClientServiceGuard serviceKey="MARKETPLACE" navigation={navigation}>
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
          <Text style={[styles.headerTitle, { color: colors.text }]}>Campus Marketplace</Text>
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>
            Direct peer-to-peer campus classifieds
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setIsSellModalOpen(true)}
          style={[styles.sellHeaderBtn, { backgroundColor: colors.primary }]}
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
            placeholder="Search textbooks, gadgets, cycles, room supplies..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {/* Category Filter Pills */}
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

      {/* Items Grid */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Loading campus classifieds...
          </Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Feather name="shopping-bag" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Items Found</Text>
          <Text style={[styles.emptySub, { color: colors.textMuted }]}>
            No listings found in this category. Have something you no longer need? List it for campus peers!
          </Text>
          <Button
            title="List an Item for Sale"
            variant="default"
            size="sm"
            onPress={() => setIsSellModalOpen(true)}
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
            const isOwner = user?.id === item.sellerId;
            const isSold = item.status === "SOLD";
            const price = item.price ?? item.pricePaise;
            const displayPrice = `₹${(price ? price / 100 : item.priceRupees || 0).toFixed(0)}`;
            const firstImage = item.images && item.images.length > 0 ? item.images[0] : item.imageUrl;

            return (
              <Card style={styles.itemCard}>
                {/* Photo or placeholder */}
                <View style={[styles.imageContainer, { backgroundColor: colors.secondary }]}>
                  {firstImage ? (
                    <Image source={{ uri: firstImage }} style={styles.itemImage} resizeMode="cover" />
                  ) : (
                    <View style={styles.placeholderIconWrap}>
                      <MaterialCommunityIcons name="tag-outline" size={32} color={colors.textMuted} />
                    </View>
                  )}

                  {/* Badges on image */}
                  <View style={styles.badgeTopLeft}>
                    <Badge variant={isSold ? "secondary" : "default"} size="sm">
                      {isSold ? "Sold" : "Available"}
                    </Badge>
                  </View>

                  <View style={styles.badgeTopRight}>
                    <Badge variant="outline" size="sm" style={styles.conditionBadge}>
                      {(item.condition || "GOOD").replace(/_/g, " ")}
                    </Badge>
                  </View>
                </View>

                {/* Details */}
                <View style={styles.itemBody}>
                  <View style={styles.priceRow}>
                    <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={[styles.itemPrice, { color: colors.primary }]}>
                      {displayPrice}
                    </Text>
                  </View>

                  <Text style={[styles.itemDescription, { color: colors.textMuted }]} numberOfLines={2}>
                    {item.description}
                  </Text>

                  <View style={styles.sellerMetaRow}>
                    <Text style={[styles.sellerMetaText, { color: colors.textMuted }]}>
                      Seller: {item.seller?.name || "Student"} •{" "}
                      {new Date(item.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                    </Text>
                  </View>
                </View>

                {/* Action Footer */}
                <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                  {isOwner ? (
                    <View style={styles.ownerActions}>
                      {!isSold && (
                        <Button
                          title="Mark Sold"
                          variant="outline"
                          size="sm"
                          onPress={() => handleMarkSold(item.id)}
                          style={{ flex: 1 }}
                        />
                      )}
                      <Button
                        title="Remove"
                        variant="destructive"
                        size="sm"
                        onPress={() => handleDeleteItem(item.id)}
                      />
                    </View>
                  ) : (
                    <Button
                      title={connectingSellerId === item.sellerId ? "Connecting..." : isSold ? "Item Sold" : "Message Seller"}
                      variant={isSold ? "secondary" : "default"}
                      size="sm"
                      disabled={isSold || connectingSellerId === item.sellerId}
                      onPress={() => handleMessageSeller(item.sellerId)}
                      style={{ width: "100%" }}
                    />
                  )}
                </View>
              </Card>
            );
          }}
        />
      )}

      {/* List an Item Bottom Sheet Modal */}
      <Modal
        visible={isSellModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsSellModalOpen(false)}
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
                <Text style={[styles.modalTitle, { color: colors.text }]}>List Item for Sale</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                  Peer-to-peer campus classifieds. Zero commission.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsSellModalOpen(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Item Title *</Text>
                <Input
                  value={title}
                  onChangeText={setTitle}
                  placeholder="e.g. Engineering Mathematics Volume 2"
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>Price (₹ INR) *</Text>
                  <Input
                    value={priceRupees}
                    onChangeText={setPriceRupees}
                    keyboardType="numeric"
                    placeholder="e.g. 450"
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>Contact Phone</Text>
                  <Input
                    value={sellerPhone}
                    onChangeText={setSellerPhone}
                    keyboardType="phone-pad"
                    placeholder="10-digit phone"
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
                <Text style={[styles.formLabel, { color: colors.text }]}>Condition *</Text>
                <View style={styles.modalChipsWrap}>
                  {CONDITIONS.map((cond) => (
                    <TouchableOpacity
                      key={cond.value}
                      onPress={() => setCondition(cond.value)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor:
                            condition === cond.value ? colors.primary + "18" : colors.secondary,
                          borderColor: condition === cond.value ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: condition === cond.value ? colors.primary : colors.textMuted,
                            fontWeight: condition === cond.value ? "700" : "500",
                          },
                        ]}
                      >
                        {cond.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Photo Image URL (Optional)</Text>
                <Input
                  value={imageUrl}
                  onChangeText={setImageUrl}
                  placeholder="https://... image URL"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Description *</Text>
                <Input
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Mention edition, usage history, included accessories..."
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                title="Cancel"
                variant="outline"
                size="sm"
                onPress={() => setIsSellModalOpen(false)}
              />
              <Button
                title={isSubmitting ? "Publishing..." : "Publish Listing"}
                variant="default"
                size="sm"
                onPress={handlePostItem}
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
  sellHeaderBtn: {
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
    overflow: "hidden",
    padding: 0,
  },
  imageContainer: {
    height: 140,
    width: "100%",
    position: "relative",
  },
  itemImage: {
    width: "100%",
    height: "100%",
  },
  placeholderIconWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeTopLeft: {
    position: "absolute",
    top: 8,
    left: 8,
  },
  badgeTopRight: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  conditionBadge: {
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  itemBody: {
    padding: 12,
    gap: 6,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: "800",
    flex: 1,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: "900",
  },
  itemDescription: {
    fontSize: 11,
    lineHeight: 15,
  },
  sellerMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 2,
  },
  sellerMetaText: {
    fontSize: 10,
  },
  cardFooter: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  ownerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
