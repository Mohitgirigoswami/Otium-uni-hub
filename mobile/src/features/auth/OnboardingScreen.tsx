import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { apiClient } from "../../services/apiClient";

interface OnboardingScreenProps {
  user: any;
  onComplete: (updatedUser: any) => void;
}

export function OnboardingScreen({ user, onComplete }: OnboardingScreenProps) {
  const { colors } = useTheme();
  const [colleges, setColleges] = useState<any[]>([]);
  const [selectedCollegeId, setSelectedCollegeId] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("2");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const YEARS = [
    { label: "1st Year", value: "1" },
    { label: "2nd Year", value: "2" },
    { label: "3rd Year", value: "3" },
    { label: "4th Year", value: "4" },
    { label: "5th Year (Dual/PG)", value: "5" },
  ];

  useEffect(() => {
    apiClient.get("/colleges").then((res) => {
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        setColleges(res.data);
        // Auto-select first college
        setSelectedCollegeId(res.data[0].id);
      }
      setIsLoading(false);
    }).catch(() => setIsLoading(false));

    // Pre-fill year if already set
    if (user?.year) setSelectedYear(String(user.year));
    // Pre-select existing campus if already assigned
    if (user?.collegeId) setSelectedCollegeId(user.collegeId);
  }, []);

  const handleSave = async () => {
    if (!selectedCollegeId) {
      Alert.alert("Campus Required", "Please select your university campus to continue.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await apiClient.patch("/profile", {
        collegeId: selectedCollegeId,
        year: parseInt(selectedYear, 10),
      });

      if (res.success && res.data) {
        onComplete({ ...user, ...res.data, collegeId: selectedCollegeId });
      } else {
        Alert.alert("Error", res.error || "Failed to save campus setup. Please try again.");
      }
    } catch (e: any) {
      Alert.alert("Network Error", "Could not reach campus server. Please check your connection.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.headerSection}>
          <View style={[styles.iconBadge, { backgroundColor: colors.primary + "20", borderColor: colors.primary + "40" }]}>
            <Ionicons name="school-outline" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            Connect to Your Campus
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Select your university and year to unlock print delivery, attendance tracking, and your campus Whisper Wall.
          </Text>
        </View>

        {/* Campus Selection */}
        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>
            University / Campus *
          </Text>

          {isLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading campuses...</Text>
            </View>
          ) : colleges.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No campuses found. Contact campus support.
            </Text>
          ) : (
            <View style={styles.collegeList}>
              {colleges.map((col) => {
                const isSelected = selectedCollegeId === col.id;
                return (
                  <TouchableOpacity
                    key={col.id}
                    activeOpacity={0.8}
                    onPress={() => setSelectedCollegeId(col.id)}
                    style={[
                      styles.collegeOption,
                      {
                        backgroundColor: isSelected ? colors.primary + "15" : colors.cardSecondary,
                        borderColor: isSelected ? colors.primary : colors.border,
                        borderWidth: isSelected ? 2 : 1,
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.collegeName, { color: colors.text }]}>
                        {col.name}
                      </Text>
                      {col.city ? (
                        <Text style={[styles.collegeCity, { color: colors.textMuted }]}>
                          {col.city}{col.state ? `, ${col.state}` : ""}
                        </Text>
                      ) : null}
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </Card>

        {/* Year Selection */}
        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>
            Academic Year *
          </Text>
          <View style={styles.yearGrid}>
            {YEARS.map((yr) => {
              const isSelected = selectedYear === yr.value;
              return (
                <TouchableOpacity
                  key={yr.value}
                  activeOpacity={0.8}
                  onPress={() => setSelectedYear(yr.value)}
                  style={[
                    styles.yearChip,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.cardSecondary,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.yearChipText,
                      { color: isSelected ? colors.primaryForeground : colors.textSecondary },
                    ]}
                  >
                    {yr.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* Save Button */}
        <Button
          variant="default"
          size="lg"
          onPress={handleSave}
          isLoading={isSaving}
          style={{ marginTop: 8 }}
          icon={<Ionicons name="arrow-forward-circle-outline" size={18} color={colors.primaryForeground} />}
        >
          Enter Campus Hub
        </Button>

        <Text style={[styles.footerNote, { color: colors.textMuted }]}>
          You can update these details later in your Profile.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 48,
    paddingBottom: 40,
    gap: 16,
  },
  headerSection: {
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 300,
  },
  sectionCard: {
    padding: 16,
    gap: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
  },
  loadingText: {
    fontSize: 13,
  },
  emptyText: {
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 12,
  },
  collegeList: {
    gap: 8,
  },
  collegeOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    gap: 10,
  },
  collegeName: {
    fontSize: 13.5,
    fontWeight: "700",
  },
  collegeCity: {
    fontSize: 11,
    marginTop: 2,
  },
  yearGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  yearChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  yearChipText: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  footerNote: {
    fontSize: 11,
    textAlign: "center",
    marginTop: 4,
  },
});
