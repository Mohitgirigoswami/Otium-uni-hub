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
import { colors, useTheme } from "../theme/colors";
import { GlassCard } from "../components/GlassCard";
import { Badge } from "../components/Badge";
import { Button } from "../components/MintButton";
import { apiClient } from "../services/apiClient";
import { useUser } from "../context/UserContext";

export function ProfileScreen() {
  const { user, setUser, signOut, refreshUser } = useUser();
  const { theme, themeKey, setThemeKey, isDark } = useTheme();
  const [profileData, setProfileData] = useState<any>(user);
  const [colleges, setColleges] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={colors.brand[400]}
        />
      }
    >
      {/* Header Profile Card */}
      <GlassCard style={styles.profileCard}>
        <View style={styles.profileTopRow}>
          {currentUser.image ? (
            <Image source={{ uri: currentUser.image }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}

          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.userName}>{currentUser.name || "Student"}</Text>
              <Badge variant="brand" size="sm">
                {currentUser.role || "STUDENT"}
              </Badge>
            </View>
            <Text style={styles.userEmail}>{currentUser.email || "student@campus.edu"}</Text>
            <View style={styles.campusRow}>
              <Ionicons name="school-outline" size={14} color={colors.brand[400]} />
              <Text style={styles.campusName}>
                {currentUser.college?.name || "Campus Affiliation Pending"}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={openEditModal}
          style={styles.editProfileBtn}
          activeOpacity={0.8}
        >
          <Feather name="edit-2" size={14} color={colors.brand[400]} />
          <Text style={styles.editProfileBtnText}>Edit Student Profile</Text>
        </TouchableOpacity>
      </GlassCard>

      {/* Quick Campus Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Feather name="printer" size={18} color={colors.brand[400]} />
          <Text style={styles.statValue}>{currentUser.stats?.printOrders || 0}</Text>
          <Text style={styles.statLabel}>Print Orders</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="calendar-outline" size={18} color={colors.electric[400]} />
          <Text style={styles.statValue}>{currentUser.stats?.attendanceSubjects || 0}</Text>
          <Text style={styles.statLabel}>Subjects</Text>
        </View>
        <View style={styles.statCard}>
          <MaterialCommunityIcons name="calculator-variant-outline" size={18} color={colors.purple[400]} />
          <Text style={styles.statValue}>{currentUser.stats?.savedSemesters || 0}</Text>
          <Text style={styles.statLabel}>Semesters</Text>
        </View>
      </View>

      {/* Academic Details Card */}
      <GlassCard style={styles.detailsCard}>
        <Text style={styles.sectionTitle}>Academic Information</Text>

        <View style={styles.detailRow}>
          <View style={styles.detailIconBox}>
            <Ionicons name="book-outline" size={16} color={colors.slate[400]} />
          </View>
          <View style={styles.detailTextBox}>
            <Text style={styles.detailLabel}>Department / Branch</Text>
            <Text style={styles.detailValue}>
              {currentUser.department || "Computer Science & Engineering"}
            </Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <View style={styles.detailIconBox}>
            <Ionicons name="calendar-number-outline" size={16} color={colors.slate[400]} />
          </View>
          <View style={styles.detailTextBox}>
            <Text style={styles.detailLabel}>Academic Year</Text>
            <Text style={styles.detailValue}>
              Year {currentUser.year || 2} (Undergraduate)
            </Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <View style={styles.detailIconBox}>
            <Ionicons name="call-outline" size={16} color={colors.slate[400]} />
          </View>
          <View style={styles.detailTextBox}>
            <Text style={styles.detailLabel}>Phone Number</Text>
            <Text style={styles.detailValue}>{currentUser.phone || "Not provided"}</Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <View style={styles.detailIconBox}>
            <Ionicons name="shield-checkmark-outline" size={16} color={colors.slate[400]} />
          </View>
          <View style={styles.detailTextBox}>
            <Text style={styles.detailLabel}>Anonymous Alias</Text>
            <Text style={styles.detailValue}>
              {currentUser.incognitoProfile?.handle || "Auto-assigned on first whisper"}
            </Text>
          </View>
        </View>
      </GlassCard>

      {/* App & Connectivity Settings */}
      <GlassCard style={styles.settingsCard}>
        <Text style={[styles.sectionTitle, { color: theme.text.primary }]}>Theme & Appearance</Text>

        <View style={styles.themeSelectorRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setThemeKey("emeraldLight")}
            style={[
              styles.themeOptionCard,
              {
                backgroundColor: themeKey === "emeraldLight" ? (isDark ? "#1E293B" : "#ECFDF5") : (isDark ? "#0F172A" : "#F8FAF9"),
                borderColor: themeKey === "emeraldLight" ? theme.brand[500] : theme.cardBorder,
              },
            ]}
          >
            <View style={[styles.themeOptionIcon, { backgroundColor: "#10B981" }]}>
              <Ionicons name="sunny" size={16} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.themeOptionTitle, { color: theme.text.primary }]}>Emerald</Text>
              <Text style={[styles.themeOptionDesc, { color: theme.text.secondary }]}>Campus Light</Text>
            </View>
            {themeKey === "emeraldLight" && (
              <Ionicons name="checkmark-circle" size={18} color={theme.brand[500]} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setThemeKey("midnightDark")}
            style={[
              styles.themeOptionCard,
              {
                backgroundColor: themeKey === "midnightDark" ? (isDark ? "#1E293B" : "#ECFDF5") : (isDark ? "#0F172A" : "#F8FAF9"),
                borderColor: themeKey === "midnightDark" ? theme.brand[500] : theme.cardBorder,
              },
            ]}
          >
            <View style={[styles.themeOptionIcon, { backgroundColor: "#0F172A" }]}>
              <Ionicons name="moon" size={16} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.themeOptionTitle, { color: theme.text.primary }]}>Midnight</Text>
              <Text style={[styles.themeOptionDesc, { color: theme.text.secondary }]}>Cyber Dark</Text>
            </View>
            {themeKey === "midnightDark" && (
              <Ionicons name="checkmark-circle" size={18} color={theme.brand[500]} />
            )}
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text.primary, marginTop: 10 }]}>Network & Connectivity</Text>

        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <View style={styles.onlineDot} />
            <Text style={[styles.settingLabel, { color: theme.text.primary }]}>Otium Campus Network</Text>
          </View>
          <Badge variant="success" size="sm">
            LIVE SYNC
          </Badge>
        </View>

        <View style={styles.settingItem}>
          <Text style={[styles.settingLabel, { color: theme.text.primary }]}>App Build Version</Text>
          <Text style={[styles.versionText, { color: theme.text.secondary }]}>v1.0.0 (Release)</Text>
        </View>
      </GlassCard>

      {/* Proper Sign Out Button */}
      <TouchableOpacity
        onPress={signOut}
        style={styles.signOutButton}
        activeOpacity={0.8}
      >
        <Ionicons name="log-out-outline" size={18} color="#FFFFFF" />
        <Text style={styles.signOutButtonText}>Sign Out from Otium</Text>
      </TouchableOpacity>

      {/* Edit Profile Modal with Keyboard UX */}
      <Modal visible={isEditModalOpen} animationType="slide" transparent onRequestClose={() => setIsEditModalOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidingModal}
        >
          <TouchableOpacity
            style={styles.modalBackdropTouch}
            activeOpacity={1}
            onPress={() => setIsEditModalOpen(false)}
          />
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Student Profile</Text>
              <TouchableOpacity onPress={() => setIsEditModalOpen(false)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Ionicons name="close" size={22} color={colors.slate[400]} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Full Name *</Text>
                <TextInput
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="e.g. John Doe"
                  placeholderTextColor={colors.slate[500]}
                  style={styles.input}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Department / Branch</Text>
                <TextInput
                  value={editDepartment}
                  onChangeText={setEditDepartment}
                  placeholder="e.g. Computer Engineering"
                  placeholderTextColor={colors.slate[500]}
                  style={styles.input}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Academic Year (1 - 5)</Text>
                <TextInput
                  value={editYear}
                  onChangeText={setEditYear}
                  keyboardType="number-pad"
                  placeholder="2"
                  placeholderTextColor={colors.slate[500]}
                  style={styles.input}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Phone Number</Text>
                <TextInput
                  value={editPhone}
                  onChangeText={setEditPhone}
                  keyboardType="phone-pad"
                  placeholder="+91 98765 43210"
                  placeholderTextColor={colors.slate[500]}
                  style={styles.input}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Select University / Campus</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.collegePillsRow}>
                  {colleges.map((col) => {
                    const isSelected = editCollegeId === col.id;
                    return (
                      <TouchableOpacity
                        key={col.id}
                        onPress={() => setEditCollegeId(col.id)}
                        style={[
                          styles.collegePill,
                          isSelected && styles.collegePillActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.collegePillText,
                            isSelected && styles.collegePillTextActive,
                          ]}
                        >
                          {col.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              <TouchableOpacity
                onPress={handleSaveProfile}
                disabled={isSaving}
                style={[styles.saveButton, isSaving && { opacity: 0.7 }]}
                activeOpacity={0.8}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#0B132B" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
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
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  profileCard: {
    padding: 20,
    gap: 16,
  },
  profileTopRow: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: colors.brand[600],
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.brand[400],
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 20,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  profileInfo: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  userName: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  userEmail: {
    fontSize: 12,
    color: colors.slate[400],
  },
  campusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  campusName: {
    fontSize: 11.5,
    fontWeight: "600",
    color: colors.brand[400],
  },
  editProfileBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "rgba(20, 184, 166, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(20, 184, 166, 0.3)",
  },
  editProfileBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: colors.brand[400],
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "900",
    color: "#FFFFFF",
    marginTop: 2,
  },
  statLabel: {
    fontSize: 10.5,
    fontWeight: "600",
    color: colors.slate[400],
  },
  detailsCard: {
    padding: 20,
    gap: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.04)",
  },
  detailIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.slate[800],
    alignItems: "center",
    justifyContent: "center",
  },
  detailTextBox: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 10.5,
    color: colors.slate[400],
    fontWeight: "600",
  },
  detailValue: {
    fontSize: 13,
    color: "#FFFFFF",
    fontWeight: "700",
    marginTop: 1,
  },
  settingsCard: {
    padding: 20,
    gap: 12,
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
    backgroundColor: colors.emerald[400],
  },
  settingLabel: {
    fontSize: 12.5,
    fontWeight: "600",
    color: colors.slate[300],
  },
  versionText: {
    fontSize: 12,
    color: colors.slate[400],
    fontWeight: "600",
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.rose[600],
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 4,
    shadowColor: colors.rose[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  signOutButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
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
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
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
    borderBottomColor: colors.cardBorder,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
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
    color: colors.slate[400],
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: colors.slate[900],
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    color: "#FFFFFF",
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
    backgroundColor: colors.slate[800],
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  collegePillActive: {
    backgroundColor: colors.brand[600],
    borderColor: colors.brand[400],
  },
  collegePillText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.slate[300],
  },
  collegePillTextActive: {
    color: "#FFFFFF",
  },
  saveButton: {
    backgroundColor: colors.brand[400],
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  saveButtonText: {
    color: "#0B132B",
    fontSize: 14,
    fontWeight: "800",
  },
  themeSelectorRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
    marginBottom: 8,
  },
  themeOptionCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  themeOptionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  themeOptionTitle: {
    fontSize: 12,
    fontWeight: "800",
  },
  themeOptionDesc: {
    fontSize: 9.5,
    marginTop: 1,
  },
});
