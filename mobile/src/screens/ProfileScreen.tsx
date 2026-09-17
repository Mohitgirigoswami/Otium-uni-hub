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
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { THEMES, ThemeId } from "../theme/themes";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { apiClient } from "../services/apiClient";
import { useUser } from "../context/UserContext";

export function ProfileScreen() {
  const { theme: currentThemeId, colors, setTheme, isDark } = useTheme();
  const { user, setUser, signOut } = useUser();
  const [profileData, setProfileData] = useState<any>(user);
  const [colleges, setColleges] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Edit Profile Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [editYear, setEditYear] = useState("2");
  const [editCollegeId, setEditCollegeId] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const fetchProfile = async () => {
    try {
      const [profRes, colRes] = await Promise.all([
        apiClient.get("/profile"),
        apiClient.get("/colleges"),
      ]);

      if (profRes.success && profRes.data) {
        setProfileData(profRes.data);
        setUser(profRes.data);
      }

      if (colRes.success && Array.isArray(colRes.data)) {
        setColleges(colRes.data);
      }
    } catch (e) {
      console.warn("Failed to fetch profile details:", e);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchProfile();
    setIsRefreshing(false);
  };

  const openEditModal = () => {
    const active = profileData || user || {};
    setEditName(active.name || "");
    setEditPhone(active.phone || "");
    setEditDepartment(active.department || "");
    setEditYear(active.year ? String(active.year) : "2");
    setEditCollegeId(active.collegeId || "");
    setIsEditModalOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert("Error", "Name cannot be empty.");
      return;
    }

    setIsSaving(true);
    try {
      const payload: any = {
        name: editName.trim(),
        phone: editPhone.trim(),
        department: editDepartment.trim(),
        year: parseInt(editYear, 10) || 1,
      };
      if (editCollegeId) {
        payload.collegeId = editCollegeId;
      }

      const res = await apiClient.patch("/profile", payload);
      if (res.success && res.data) {
        Alert.alert("Success", "Profile updated successfully!");
        setProfileData((prev: any) => ({ ...prev, ...res.data }));
        setUser((prev: any) => ({ ...prev, ...res.data }));
        setIsEditModalOpen(false);
      } else {
        Alert.alert("Error", res.error || "Failed to update profile.");
      }
    } catch (e: any) {
      Alert.alert("Error", e.message || "An unexpected error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  const currentUser = profileData || user || {};
  const initials = currentUser.name
    ? currentUser.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "ST";

  const themeList = Object.values(THEMES);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header Profile Card */}
      <Card style={styles.profileCard}>
        <View style={styles.profileTopRow}>
          {currentUser.image ? (
            <Image source={{ uri: currentUser.image }} style={styles.avatarImage} />
          ) : (
            <View
              style={[
                styles.avatarCircle,
                {
                  backgroundColor: colors.primary,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.avatarText, { color: colors.primaryForeground }]}>
                {initials}
              </Text>
            </View>
          )}

          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text
                style={[styles.userName, { color: colors.text }]}
                numberOfLines={1}
              >
                {currentUser.name || "Student"}
              </Text>
              <Badge variant="primary" size="sm">
                {currentUser.role || "STUDENT"}
              </Badge>
            </View>
            <Text
              style={[styles.userEmail, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {currentUser.email || "student@campus.edu"}
            </Text>
            <View style={styles.campusRow}>
              <Ionicons name="school-outline" size={13} color={colors.primary} />
              <Text
                style={[styles.campusName, { color: colors.primary }]}
                numberOfLines={1}
              >
                {currentUser.college?.name || "Campus Affiliation Pending"}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={openEditModal}
          style={[
            styles.editProfileBtn,
            {
              backgroundColor: colors.cardSecondary,
              borderColor: colors.border,
            },
          ]}
          activeOpacity={0.8}
        >
          <Feather name="edit-2" size={13} color={colors.primary} />
          <Text style={[styles.editProfileBtnText, { color: colors.primary }]}>
            Edit Student Profile
          </Text>
        </TouchableOpacity>
      </Card>

      {/* Quick Campus Stats */}
      <View style={styles.statsRow}>
        <View
          style={[
            styles.statCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <Feather name="printer" size={18} color={colors.primary} />
          <Text style={[styles.statValue, { color: colors.text }]}>
            {currentUser.stats?.printOrders || 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>
            Print Orders
          </Text>
        </View>
        <View
          style={[
            styles.statCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons name="calendar-outline" size={18} color={colors.accent} />
          <Text style={[styles.statValue, { color: colors.text }]}>
            {currentUser.stats?.attendanceSubjects || 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>
            Subjects
          </Text>
        </View>
        <View
          style={[
            styles.statCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="calculator-variant-outline"
            size={18}
            color={colors.success}
          />
          <Text style={[styles.statValue, { color: colors.text }]}>
            {currentUser.stats?.savedSemesters || 0}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>
            Semesters
          </Text>
        </View>
      </View>

      {/* Interactive 4-Theme Selector */}
      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Campus Visual Theme
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Real-time palette switching across all app modules
            </Text>
          </View>
          <Badge variant="primary" size="sm">
            4 THEMES
          </Badge>
        </View>

        <View style={styles.themeGrid}>
          {themeList.map((t) => {
            const isSelected = currentThemeId === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                activeOpacity={0.8}
                onPress={() => setTheme(t.id as ThemeId)}
                style={[
                  styles.themeCard,
                  {
                    backgroundColor: t.colors.card,
                    borderColor: isSelected ? t.colors.primary : t.colors.border,
                    borderWidth: isSelected ? 2 : 1,
                  },
                ]}
              >
                <View style={styles.themeCardTop}>
                  <Text
                    style={[
                      styles.themeName,
                      { color: t.colors.text, fontWeight: isSelected ? "800" : "700" },
                    ]}
                    numberOfLines={1}
                  >
                    {t.name}
                  </Text>
                  {isSelected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color={t.colors.primary}
                    />
                  )}
                </View>

                <Text
                  style={[styles.themeTagline, { color: t.colors.textSecondary }]}
                  numberOfLines={2}
                >
                  {t.tagline}
                </Text>

                {/* Swatch dots */}
                <View style={styles.swatchRow}>
                  <View
                    style={[
                      styles.swatchDot,
                      { backgroundColor: t.colors.background, borderColor: t.colors.border },
                    ]}
                  />
                  <View
                    style={[
                      styles.swatchDot,
                      { backgroundColor: t.colors.primary, borderColor: t.colors.border },
                    ]}
                  />
                  <View
                    style={[
                      styles.swatchDot,
                      { backgroundColor: t.colors.accent, borderColor: t.colors.border },
                    ]}
                  />
                  <View
                    style={[
                      styles.swatchDot,
                      { backgroundColor: t.colors.cardSecondary, borderColor: t.colors.border },
                    ]}
                  />
                  <Text
                    style={[
                      styles.themeModeBadge,
                      { color: t.colors.textMuted },
                    ]}
                  >
                    {t.isDark ? "Dark" : "Light"}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </Card>

      {/* Academic Details Card */}
      <Card style={styles.sectionCard}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Academic Information
        </Text>

        <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
          <View style={[styles.detailIconBox, { backgroundColor: colors.cardSecondary }]}>
            <Ionicons name="book-outline" size={15} color={colors.primary} />
          </View>
          <View style={styles.detailTextBox}>
            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>
              Department / Branch
            </Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {currentUser.department || "Computer Science & Engineering"}
            </Text>
          </View>
        </View>

        <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
          <View style={[styles.detailIconBox, { backgroundColor: colors.cardSecondary }]}>
            <Ionicons name="calendar-number-outline" size={15} color={colors.primary} />
          </View>
          <View style={styles.detailTextBox}>
            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>
              Academic Year
            </Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              Year {currentUser.year || 2} (Undergraduate)
            </Text>
          </View>
        </View>

        <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
          <View style={[styles.detailIconBox, { backgroundColor: colors.cardSecondary }]}>
            <Ionicons name="call-outline" size={15} color={colors.primary} />
          </View>
          <View style={styles.detailTextBox}>
            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>
              Phone Number
            </Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {currentUser.phone || "Not provided"}
            </Text>
          </View>
        </View>

        <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
          <View style={[styles.detailIconBox, { backgroundColor: colors.cardSecondary }]}>
            <Ionicons name="shield-checkmark-outline" size={15} color={colors.primary} />
          </View>
          <View style={styles.detailTextBox}>
            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>
              Anonymous Alias
            </Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {currentUser.incognitoProfile?.handle || "Auto-assigned on first whisper"}
            </Text>
          </View>
        </View>
      </Card>

      {/* App & Connectivity Settings */}
      <Card style={styles.sectionCard}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          App & Connectivity
        </Text>

        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <View style={[styles.onlineDot, { backgroundColor: colors.success }]} />
            <Text style={[styles.settingLabel, { color: colors.text }]}>
              Otium Campus Network
            </Text>
          </View>
          <Badge variant="success" size="sm">
            LIVE SYNC
          </Badge>
        </View>

        <View style={styles.settingItem}>
          <Text style={[styles.settingLabel, { color: colors.text }]}>
            Active Visual Theme
          </Text>
          <Badge variant="primary" size="sm">
            {THEMES[currentThemeId]?.name || "Default"}
          </Badge>
        </View>

        <View style={styles.settingItem}>
          <Text style={[styles.settingLabel, { color: colors.text }]}>
            App Build Version
          </Text>
          <Text style={[styles.versionText, { color: colors.textMuted }]}>
            v1.2.0 (SDK 54 Release)
          </Text>
        </View>
      </Card>

      {/* Sign Out Button */}
      <Button
        variant="destructive"
        size="lg"
        onPress={() => {
          Alert.alert("Sign Out", "Are you sure you want to sign out from Otium?", [
            { text: "Cancel", style: "cancel" },
            { text: "Sign Out", style: "destructive", onPress: signOut },
          ]);
        }}
        icon={<Ionicons name="log-out-outline" size={18} color={colors.destructiveForeground} />}
      >
        Sign Out from Otium
      </Button>

      {/* Edit Profile Modal */}
      <Modal
        visible={isEditModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsEditModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidingModal}
        >
          <TouchableOpacity
            style={styles.modalBackdropTouch}
            activeOpacity={1}
            onPress={() => setIsEditModalOpen(false)}
          />
          <View
            style={[
              styles.modalContainer,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Edit Student Profile
              </Text>
              <TouchableOpacity
                onPress={() => setIsEditModalOpen(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.textMuted }]}>
                  Full Name *
                </Text>
                <TextInput
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="e.g. John Doe"
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.cardSecondary,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.textMuted }]}>
                  Department / Branch
                </Text>
                <TextInput
                  value={editDepartment}
                  onChangeText={setEditDepartment}
                  placeholder="e.g. Computer Engineering"
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.cardSecondary,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.textMuted }]}>
                  Academic Year (1 - 5)
                </Text>
                <TextInput
                  value={editYear}
                  onChangeText={setEditYear}
                  keyboardType="number-pad"
                  placeholder="2"
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.cardSecondary,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.textMuted }]}>
                  Phone Number
                </Text>
                <TextInput
                  value={editPhone}
                  onChangeText={setEditPhone}
                  keyboardType="phone-pad"
                  placeholder="+91 98765 43210"
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.cardSecondary,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.textMuted }]}>
                  Select University / Campus
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.collegePillsRow}
                >
                  {colleges.map((col) => {
                    const isSelected = editCollegeId === col.id;
                    return (
                      <TouchableOpacity
                        key={col.id}
                        onPress={() => setEditCollegeId(col.id)}
                        style={[
                          styles.collegePill,
                          {
                            backgroundColor: isSelected
                              ? colors.primary
                              : colors.cardSecondary,
                            borderColor: isSelected
                              ? colors.primary
                              : colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.collegePillText,
                            {
                              color: isSelected
                                ? colors.primaryForeground
                                : colors.textSecondary,
                            },
                          ]}
                        >
                          {col.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              <Button
                variant="default"
                size="lg"
                onPress={handleSaveProfile}
                isLoading={isSaving}
                style={{ marginTop: 10, marginBottom: 20 }}
              >
                Save Changes
              </Button>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  profileCard: {
    padding: 18,
    gap: 14,
  },
  profileTopRow: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 18,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "900",
  },
  profileInfo: {
    flex: 1,
    gap: 3,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  userName: {
    fontSize: 16.5,
    fontWeight: "800",
  },
  userEmail: {
    fontSize: 12,
  },
  campusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  campusName: {
    fontSize: 11.5,
    fontWeight: "600",
  },
  editProfileBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  editProfileBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "900",
    marginTop: 2,
  },
  statLabel: {
    fontSize: 10.5,
    fontWeight: "600",
  },
  sectionCard: {
    padding: 18,
    gap: 14,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  sectionTitle: {
    fontSize: 14.5,
    fontWeight: "800",
  },
  sectionSubtitle: {
    fontSize: 11.5,
    marginTop: 2,
  },
  themeGrid: {
    gap: 10,
    marginTop: 4,
  },
  themeCard: {
    padding: 14,
    borderRadius: 14,
    gap: 6,
  },
  themeCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  themeName: {
    fontSize: 14,
  },
  themeTagline: {
    fontSize: 11.5,
    lineHeight: 16,
  },
  swatchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  swatchDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
  },
  themeModeBadge: {
    fontSize: 10.5,
    fontWeight: "700",
    marginLeft: 4,
    textTransform: "uppercase",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
  },
  detailIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  detailTextBox: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 10.5,
    fontWeight: "600",
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 1,
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  settingLabel: {
    fontSize: 12.5,
    fontWeight: "600",
  },
  versionText: {
    fontSize: 12,
    fontWeight: "600",
  },
  keyboardAvoidingModal: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "flex-end",
  },
  modalBackdropTouch: {
    flex: 1,
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    maxHeight: "88%",
    padding: 20,
    gap: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalScrollContent: {
    paddingBottom: 30,
  },
  formGroup: {
    marginBottom: 14,
    gap: 6,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
  },
  collegePillsRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
  },
  collegePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  collegePillText: {
    fontSize: 12,
    fontWeight: "700",
  },
});
