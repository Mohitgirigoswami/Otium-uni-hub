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
import { Ionicons, Feather, FontAwesome5 } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useUser } from "../context/UserContext";
import { apiClient } from "../services/apiClient";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { ClientServiceGuard } from "../components/ClientServiceGuard";

import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY_RIDES = "@otium_cached_rides";

export function RideShareScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { user } = useUser();

  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchDestination, setSearchDestination] = useState("");

  // Host Ride Modal
  const [isHostModalOpen, setIsHostModalOpen] = useState(false);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [availableSeats, setAvailableSeats] = useState("3");
  const [splitFareRupees, setSplitFareRupees] = useState("200");
  const [cabProvider, setCabProvider] = useState("Uber XL");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingRideId, setBookingRideId] = useState<string | null>(null);

  const fetchRides = async (isPull = false) => {
    if (isPull) setRefreshing(true);

    // 1. Immediate offline cache restore
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEY_RIDES);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRides(parsed);
        }
      }
    } catch {}

    // 2. Fetch fresh from server
    try {
      const query = searchDestination.trim()
        ? `/rideshare?destination=${encodeURIComponent(searchDestination.trim())}`
        : "/rideshare";
      const res = await apiClient.get(query);
      if (res.success && Array.isArray(res.data)) {
        setRides(res.data);
        AsyncStorage.setItem(STORAGE_KEY_RIDES, JSON.stringify(res.data)).catch(() => {});
      }
    } catch (err) {
      console.log("[Fetch Rides Note]: Operating in offline cached mode");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRides();
  }, [searchDestination]);

  const handleHostRide = async () => {
    const campusName = user?.college?.name || "JCBOSEUST, YMCA";
    const pickupOrigin = origin.trim() || `${campusName} Main Gate`;

    if (!destination.trim() || !departureTime.trim() || isSubmitting) {
      Alert.alert("Missing Fields", "Please specify destination and departure time.");
      return;
    }

    setIsSubmitting(true);
    const localRide = {
      id: `local-${Date.now()}`,
      origin: pickupOrigin,
      destination: destination.trim(),
      departureTime: departureTime.trim(),
      availableSeats: Number(availableSeats) || 3,
      splitCostEstimateRupees: Number(splitFareRupees) || 200,
      cabProvider,
      notes: notes.trim() || undefined,
      host: { name: user?.name || "You", branch: "Campus" },
      hostId: user?.id,
      joinedUserIds: [],
    };

    try {
      const res = await apiClient.post("/rideshare", {
        origin: pickupOrigin,
        destination: destination.trim(),
        departureTime: departureTime.trim(),
        availableSeats: Number(availableSeats) || 3,
        splitCostEstimateRupees: Number(splitFareRupees) || 200,
        cabProvider,
        notes: notes.trim() || undefined,
      });

      if (res.success) {
        Alert.alert("Cab Split Hosted!", "Your ride is listed for batchmates to join.");
        setIsHostModalOpen(false);
        setDestination("");
        setDepartureTime("");
        setNotes("");
        fetchRides();
      } else {
        const updated = [localRide, ...rides];
        setRides(updated);
        AsyncStorage.setItem(STORAGE_KEY_RIDES, JSON.stringify(updated)).catch(() => {});
        Alert.alert("Saved Locally ☁️", "Saved on device. Will synchronize when connected.");
        setIsHostModalOpen(false);
      }
    } catch (err: any) {
      const updated = [localRide, ...rides];
      setRides(updated);
      AsyncStorage.setItem(STORAGE_KEY_RIDES, JSON.stringify(updated)).catch(() => {});
      Alert.alert("Saved Locally ☁️", "Network unavailable. Saved on your device.");
      setIsHostModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinRide = async (ride: any) => {
    if (bookingRideId) return;
    setBookingRideId(ride.id);

    try {
      const res = await apiClient.post(`/rideshare/${ride.id}/join`, {});
      if (res.success) {
        Alert.alert("Seat Reserved! 🎉", "You have joined this cab split. Coordinate via Messages.");
        fetchRides();
      } else {
        Alert.alert("Error", res.error || "Failed to join ride.");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to reserve seat.");
    } finally {
      setBookingRideId(null);
    }
  };

  return (
    <ClientServiceGuard serviceKey="CAB_SPLIT" navigation={navigation}>
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
            <Text style={[styles.headerTitle, { color: colors.text }]}>Cab Split & RideShare</Text>
            <Text style={[styles.headerSub, { color: colors.textMuted }]}>
              Share cabs to airport, metro & transit
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setIsHostModalOpen(true)}
            style={[styles.hostHeaderBtn, { backgroundColor: colors.primary }]}
          >
            <Feather name="plus" size={16} color={colors.primaryForeground} />
          </TouchableOpacity>
        </View>

      {/* Search destination input */}
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
            placeholder="Search destination (e.g. Airport, New Delhi Stn)..."
            placeholderTextColor={colors.textMuted}
            value={searchDestination}
            onChangeText={setSearchDestination}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {/* Ride List */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Finding campus cab splits...
          </Text>
        </View>
      ) : rides.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="car-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Active Rideshares</Text>
          <Text style={[styles.emptySub, { color: colors.textMuted }]}>
            Be the first to host a cab split from campus to split the fare!
          </Text>
          <Button
            title="Host a Cab Split"
            variant="default"
            size="sm"
            onPress={() => setIsHostModalOpen(true)}
            style={{ marginTop: 8 }}
          />
        </View>
      ) : (
        <FlatList
          data={rides}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchRides(true)}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isHost = item.hostId === user?.id;
            const isFull = item.availableSeats <= 0;
            const formattedCost = `₹${(item.splitCostEstimatePaise ? item.splitCostEstimatePaise / 100 : item.splitCostEstimateRupees || 200).toFixed(0)}`;

            return (
              <Card style={styles.rideCard}>
                {/* Top Row: Provider badge & Fare */}
                <View style={styles.rideTopRow}>
                  <View style={styles.providerRow}>
                    <Ionicons name="car-sport" size={15} color={colors.primary} />
                    <Text style={[styles.providerText, { color: colors.text }]}>
                      {item.cabProvider || "Uber XL"}
                    </Text>
                  </View>
                  <Text style={[styles.fareTag, { color: colors.primary }]}>
                    {formattedCost} <Text style={[styles.perSeat, { color: colors.textMuted }]}>/ seat</Text>
                  </Text>
                </View>

                {/* Route display */}
                <View style={styles.routeBox}>
                  <View style={styles.routeNode}>
                    <View style={[styles.nodeDot, { backgroundColor: colors.primary }]} />
                    <Text style={[styles.originText, { color: colors.text }]} numberOfLines={1}>
                      {item.origin}
                    </Text>
                  </View>
                  <View style={styles.routeLine} />
                  <View style={styles.routeNode}>
                    <Ionicons name="location" size={14} color={colors.destructive} />
                    <Text style={[styles.destText, { color: colors.text }]} numberOfLines={1}>
                      {item.destination}
                    </Text>
                  </View>
                </View>

                {/* Departure & Host Meta */}
                <View style={[styles.metaRow, { borderTopColor: colors.border }]}>
                  <View style={styles.timeWrap}>
                    <Feather name="clock" size={12} color={colors.textMuted} />
                    <Text style={[styles.timeText, { color: colors.textMuted }]}>
                      {new Date(item.departureTime).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>

                  <Badge variant={isFull ? "destructive" : "outline"} size="sm">
                    {isFull ? "Full" : `${item.availableSeats} seat(s) open`}
                  </Badge>
                </View>

                {/* Bottom Action Row */}
                <View style={styles.actionRow}>
                  <View style={styles.hostInfo}>
                    <Text style={[styles.hostName, { color: colors.textMuted }]}>
                      Host: {item.host?.name || "Student"}
                    </Text>
                  </View>

                  {!isHost && !isFull && (
                    <Button
                      title={bookingRideId === item.id ? "Joining..." : "Join Cab"}
                      variant="default"
                      size="sm"
                      disabled={bookingRideId === item.id}
                      onPress={() => handleJoinRide(item)}
                    />
                  )}

                  {isHost && (
                    <Badge variant="primary" size="sm">
                      Your Hosted Ride
                    </Badge>
                  )}
                </View>
              </Card>
            );
          }}
        />
      )}

      {/* Host Ride Bottom Sheet Modal */}
      <Modal
        visible={isHostModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsHostModalOpen(false)}
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
                <Text style={[styles.modalTitle, { color: colors.text }]}>Host a Cab Split</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                  Share rides with verified batchmates to split fare
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsHostModalOpen(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Pickup Origin</Text>
                <View style={styles.quickOriginRow}>
                  {[
                    user?.college?.name ? `${user.college.name.split(",")[0]} Gate` : "JC Bose Gate",
                    "Hostel Block 1",
                    "Hostel Block 2",
                    "Faridabad Metro",
                    "Library Desk",
                  ].map((chip) => (
                    <TouchableOpacity
                      key={chip}
                      onPress={() => setOrigin(chip)}
                      style={[
                        styles.quickChip,
                        {
                          backgroundColor: origin === chip ? colors.primary + "18" : colors.secondary,
                          borderColor: origin === chip ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.quickChipText,
                          {
                            color: origin === chip ? colors.primary : colors.textMuted,
                            fontWeight: origin === chip ? "700" : "500",
                          },
                        ]}
                      >
                        {chip}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Input
                  value={origin}
                  onChangeText={setOrigin}
                  placeholder="e.g. JC Bose Main Gate, Hostel Block 1..."
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Destination</Text>
                <Input
                  value={destination}
                  onChangeText={setDestination}
                  placeholder="e.g. IGI Airport Terminal 3, NDLS Railway Stn"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Departure Date & Time</Text>
                <Input
                  value={departureTime}
                  onChangeText={setDepartureTime}
                  placeholder="e.g. Tomorrow 6:30 AM or 2026-09-18 14:00"
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>Seats Open</Text>
                  <Input
                    value={availableSeats}
                    onChangeText={setAvailableSeats}
                    keyboardType="numeric"
                    placeholder="3"
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>Split Fare (₹)</Text>
                  <Input
                    value={splitFareRupees}
                    onChangeText={setSplitFareRupees}
                    keyboardType="numeric"
                    placeholder="200"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Cab Provider</Text>
                <View style={styles.providerChips}>
                  {["Uber XL", "Ola Prime", "Rapido Cab", "InDrive", "Self Car"].map((p) => (
                    <TouchableOpacity
                      key={p}
                      onPress={() => setCabProvider(p)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor:
                            cabProvider === p ? colors.primary + "18" : colors.secondary,
                          borderColor: cabProvider === p ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: cabProvider === p ? colors.primary : colors.textMuted,
                            fontWeight: cabProvider === p ? "700" : "500",
                          },
                        ]}
                      >
                        {p}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Ride Notes (Optional)</Text>
                <Input
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="e.g. 2 trolley bags max, leaving sharp on time"
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                title="Cancel"
                variant="outline"
                size="sm"
                onPress={() => setIsHostModalOpen(false)}
              />
              <Button
                title={isSubmitting ? "Hosting..." : "Confirm & Host Cab"}
                variant="default"
                size="sm"
                onPress={handleHostRide}
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
  hostHeaderBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBarWrap: {
    paddingHorizontal: 16,
    paddingVertical: 10,
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
  rideCard: {
    padding: 14,
    gap: 10,
  },
  rideTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  providerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  providerText: {
    fontSize: 13,
    fontWeight: "700",
  },
  fareTag: {
    fontSize: 16,
    fontWeight: "800",
  },
  perSeat: {
    fontSize: 11,
    fontWeight: "400",
  },
  routeBox: {
    gap: 4,
    paddingVertical: 4,
  },
  routeNode: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  nodeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 3,
  },
  routeLine: {
    width: 2,
    height: 10,
    backgroundColor: "rgba(150, 150, 150, 0.3)",
    marginLeft: 6,
  },
  originText: {
    fontSize: 12,
  },
  destText: {
    fontSize: 13,
    fontWeight: "700",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  timeWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  timeText: {
    fontSize: 11,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 4,
  },
  hostInfo: {
    flex: 1,
  },
  hostName: {
    fontSize: 11,
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
    gap: 12,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
  quickOriginRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  quickChip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 7,
    borderWidth: 1,
  },
  quickChipText: {
    fontSize: 11,
  },
  providerChips: {
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
