import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
  Modal,
  TextInput,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as Clipboard from "expo-clipboard";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { PrintOrderTracker } from "../components/print/PrintOrderTracker";
import { useUser } from "../context/UserContext";
import { apiClient } from "../services/apiClient";

interface PrintOption {
  id: string;
  name: string;
  desc: string;
  rate: string;
  pricePerUnit: number;
}

const PRINT_FORMATS: PrintOption[] = [
  {
    id: "BW_DOUBLE",
    name: "B&W Double-Sided (Recommended)",
    desc: "Eco-friendly duplex printing on 75 GSM bright paper.",
    rate: "₹2.00 / page",
    pricePerUnit: 2.0,
  },
  {
    id: "BW_SINGLE",
    name: "B&W Single-Sided",
    desc: "Standard single page printing for official submissions.",
    rate: "₹2.50 / page",
    pricePerUnit: 2.5,
  },
  {
    id: "COLOR_SINGLE",
    name: "Full Color Single-Sided",
    desc: "High-resolution color graphs and presentation slides.",
    rate: "₹10.00 / page",
    pricePerUnit: 10.0,
  },
  {
    id: "COLOR_DOUBLE",
    name: "Full Color Double-Sided",
    desc: "Vibrant duplex color printing for project reports.",
    rate: "₹8.00 / page",
    pricePerUnit: 8.0,
  },
];

const DELIVERY_WINDOWS = [
  { id: "MORNING", label: "Morning Drop (8:30 AM - 9:00 AM)" },
  { id: "LUNCH", label: "Lunch Drop (12:50 PM - 1:30 PM)" },
];

const QUICK_LOCATION_CHIPS = [
  "Hostel Block 1",
  "Hostel Block 2",
  "Central Library Desk",
  "Academic Block C",
  "Student Cafeteria",
];

export function PrintStationScreen({ navigation }: any) {
  const { colors, isDark } = useTheme();
  const { user, setUser } = useUser();

  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    pages: number;
    size: string;
    fileUrl?: string;
  } | null>(null);

  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<string>("BW_DOUBLE");
  const [copies, setCopies] = useState<number>(1);
  const [deliveryWindow, setDeliveryWindow] = useState<string>("Morning Drop (8:30 AM - 9:00 AM)");
  const [deliveryLocation, setDeliveryLocation] = useState<string>("Central Library Desk");

  // Phone number state with explicit backend save
  const [phone, setPhone] = useState<string>(user?.phone || "");
  const [isPhoneSaved, setIsPhoneSaved] = useState<boolean>(!!user?.phone);
  const [isSavingPhone, setIsSavingPhone] = useState<boolean>(false);

  const [utrNumber, setUtrNumber] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  // Issue Reporting states
  const [reportingOrder, setReportingOrder] = useState<any | null>(null);
  const [issueCategory, setIssueCategory] = useState<string>("Print Quality Issue");
  const [issueReason, setIssueReason] = useState<string>("");
  const [isSubmittingIssue, setIsSubmittingIssue] = useState<boolean>(false);

  const handleReportIssue = async () => {
    if (!reportingOrder || !issueReason.trim() || isSubmittingIssue) return;
    setIsSubmittingIssue(true);
    try {
      const res = await apiClient.post("/print/issue", {
        orderId: reportingOrder.id,
        reason: issueReason.trim(),
        category: issueCategory,
      });

      if (res.success) {
        Alert.alert(
          "Issue Reported",
          "Our campus print manager has been alerted. An automated update was sent to your in-app chat inbox."
        );
        setReportingOrder(null);
        setIssueReason("");
        fetchOrders();
      } else {
        Alert.alert("Error", res.error || "Failed to submit issue report.");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to submit issue report.");
    } finally {
      setIsSubmittingIssue(false);
    }
  };

  useEffect(() => {
    if (user?.phone) {
      setPhone(user.phone);
      setIsPhoneSaved(true);
    }
  }, [user?.phone]);

  const fetchOrders = async () => {
    try {
      const res = await apiClient.get("/print/order");
      if (res.success && Array.isArray(res.data)) {
        setRecentOrders(res.data);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setIsUploadingFile(true);

        const formData = new FormData();
        formData.append("file", {
          uri: file.uri,
          name: file.name,
          type: "application/pdf",
        } as any);

        const uploadRes = await apiClient.postFormData("/print/upload", formData);

        if (uploadRes.success && uploadRes.data) {
          setSelectedFile({
            name: file.name,
            pages: uploadRes.data.pageCount || 1,
            size: `${((file.size || 1024) / 1024).toFixed(1)} KB`,
            fileUrl: uploadRes.data.fileUrl,
          });
        } else {
          // Fallback
          setSelectedFile({
            name: file.name,
            pages: 1,
            size: `${((file.size || 1024) / 1024).toFixed(1)} KB`,
          });
        }
        setIsUploadingFile(false);
      }
    } catch (err) {
      setIsUploadingFile(false);
      Alert.alert("File Selection Failed", "Please pick a valid PDF document.");
    }
  };

  const handleSavePhone = async () => {
    const cleaned = phone.trim().replace(/\D/g, "");
    if (cleaned.length < 10) {
      Alert.alert("Invalid Phone", "Please enter a valid 10-digit mobile number.");
      return;
    }

    setIsSavingPhone(true);
    try {
      const res = await apiClient.post("/profile", { phone: cleaned });
      if (res.success) {
        setIsPhoneSaved(true);
        setUser((prev: any) => ({ ...prev, phone: cleaned }));
        Alert.alert("Phone Verified", "Your contact number has been updated and verified on your account.");
      } else {
        Alert.alert("Error", res.error || "Failed to save phone number.");
      }
    } catch (e) {
      setIsPhoneSaved(true); // optimistic
      Alert.alert("Saved Locally", "Contact phone number saved for this order.");
    } finally {
      setIsSavingPhone(false);
    }
  };

  const handleQuickChipSelect = (chip: string) => {
    setDeliveryLocation(chip);
  };

  const pageCount = selectedFile?.pages || 1;
  const currentFmt = PRINT_FORMATS.find((f) => f.id === selectedFormat) || PRINT_FORMATS[0];
  const rawCost = pageCount * currentFmt.pricePerUnit * copies;
  const finalPayable = Math.max(5.0, rawCost);
  const isFloorApplied = rawCost < 5.0;

  const handlePlaceOrder = async () => {
    if (!selectedFile) {
      Alert.alert("Missing File", "Please upload a document PDF first.");
      return;
    }
    if (!deliveryLocation.trim()) {
      Alert.alert("Missing Drop Location", "Please enter your campus drop location.");
      return;
    }
    if (!phone.trim()) {
      Alert.alert("Missing Phone", "Please enter and save your contact phone number.");
      return;
    }

    setIsSubmitting(true);
    try {
      const orderPayload = {
        fileName: selectedFile.name,
        fileUrl: selectedFile.fileUrl || "https://example.com/demo.pdf",
        pageCount,
        copies,
        printType: selectedFormat,
        deliveryLocation: deliveryLocation.trim(),
        deliveryWindow,
        contactPhone: phone.trim(),
        totalCostPaise: Math.round(finalPayable * 100),
        utrNumber: utrNumber.trim() || undefined,
      };

      const res = await apiClient.post("/print/order", orderPayload);
      if (res.success) {
        Alert.alert("Order Placed!", "Your print job has been queued for campus dispatch.");
        setSelectedFile(null);
        setUtrNumber("");
        fetchOrders();

        setCooldownSeconds(4);
        const timer = setInterval(() => {
          setCooldownSeconds((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        Alert.alert("Submission Failed", res.error || "Could not place order.");
      }
    } catch (e) {
      Alert.alert("Error", "Network fault while placing print order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Hero Banner */}
      <Card style={styles.heroBanner}>
        <View style={styles.badgeRow}>
          <Badge variant="primary" size="sm">
            Express Print Station
          </Badge>
        </View>
        <Text style={[styles.heroTitle, { color: colors.text }]}>
          Express Campus Document Dispatch
        </Text>
        <Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>
          Upload PDF, select duplex or color, and pick up your documents anywhere on campus.
        </Text>
      </Card>

      {/* Step 1: Document Upload */}
      <Card style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <Feather name="upload-cloud" size={16} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Step 1: Upload Document PDF
          </Text>
        </View>

        {isUploadingFile ? (
          <View style={[styles.dropzone, { borderColor: colors.primary }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.dropzoneTitle, { color: colors.text, marginTop: 12 }]}>
              Uploading & Verifying PDF...
            </Text>
          </View>
        ) : selectedFile ? (
          <View style={[styles.filePreviewBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <View style={[styles.fileIconBox, { backgroundColor: colors.primary + "20" }]}>
              <Ionicons name="document-text" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.fileNameText, { color: colors.text }]} numberOfLines={1}>
                {selectedFile.name}
              </Text>
              <Text style={[styles.fileMetaText, { color: colors.textMuted }]}>
                {selectedFile.size} • {selectedFile.pages} Pages Auto-Detected
              </Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedFile(null)}>
              <Ionicons name="close-circle" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={handlePickDocument}
            style={[styles.dropzone, { borderColor: colors.border }]}
          >
            <Feather name="upload-cloud" size={28} color={colors.primary} />
            <Text style={[styles.dropzoneTitle, { color: colors.text }]}>
              Tap to select or upload PDF
            </Text>
            <Text style={[styles.dropzoneSubtitle, { color: colors.textMuted }]}>
              Auto-calculates page count on server
            </Text>
          </TouchableOpacity>
        )}
      </Card>

      {/* Step 2: Print Formats */}
      <Card style={styles.sectionCard}>
        <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 12 }]}>
          Step 2: Print Format & Paper Type
        </Text>
        <View style={styles.formatGrid}>
          {PRINT_FORMATS.map((fmt) => {
            const isSelected = selectedFormat === fmt.id;
            return (
              <TouchableOpacity
                key={fmt.id}
                onPress={() => setSelectedFormat(fmt.id)}
                activeOpacity={0.75}
                style={[
                  styles.formatCard,
                  {
                    backgroundColor: isSelected ? colors.primary + "12" : colors.secondary,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
              >
                <View style={styles.formatHeader}>
                  <Text
                    style={[
                      styles.formatName,
                      { color: isSelected ? colors.primary : colors.text, fontWeight: isSelected ? "700" : "600" },
                    ]}
                  >
                    {fmt.name}
                  </Text>
                  <Text style={[styles.formatRate, { color: colors.primary }]}>{fmt.rate}</Text>
                </View>
                <Text style={[styles.formatDesc, { color: colors.textMuted }]}>{fmt.desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Card>

      {/* Step 3: Copies */}
      <Card style={styles.sectionCard}>
        <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 10 }]}>
          Step 3: Number of Copies
        </Text>
        <View style={styles.copiesRow}>
          {[1, 2, 3, 5, 10].map((num) => {
            const isSelected = copies === num;
            return (
              <TouchableOpacity
                key={num}
                onPress={() => setCopies(num)}
                style={[
                  styles.copyBtn,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.secondary,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.copyBtnText,
                    { color: isSelected ? colors.primaryForeground : colors.text },
                  ]}
                >
                  {num}x
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Card>

      {/* Step 4: Drop Location with Quick Chips */}
      <Card style={styles.sectionCard}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Step 4: Campus Drop Location *
        </Text>
        <Input
          value={deliveryLocation}
          onChangeText={setDeliveryLocation}
          placeholder="e.g. Hostel Block 2, Room 412 or Library 1st Floor"
          containerStyle={{ marginTop: 8 }}
          leftIcon={<Ionicons name="location-outline" size={16} color={colors.textMuted} />}
        />

        {/* Quick Location Chips */}
        <View style={styles.chipsRow}>
          {QUICK_LOCATION_CHIPS.map((chip) => (
            <TouchableOpacity
              key={chip}
              onPress={() => handleQuickChipSelect(chip)}
              activeOpacity={0.7}
              style={[
                styles.locationChip,
                {
                  backgroundColor: deliveryLocation.includes(chip) ? colors.primary + "18" : colors.secondary,
                  borderColor: deliveryLocation.includes(chip) ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  {
                    color: deliveryLocation.includes(chip) ? colors.primary : colors.textSecondary,
                  },
                ]}
              >
                + {chip}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {/* Step 5: Contact Phone Number & Verification */}
      <Card style={styles.sectionCard}>
        <View style={styles.phoneHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>
            Step 5: Contact Phone *
          </Text>
          {isPhoneSaved && (
            <Badge variant="success" size="sm">
              ✓ Saved to Account
            </Badge>
          )}
        </View>

        <View style={styles.phoneInputRow}>
          <Input
            value={phone}
            onChangeText={(val) => {
              setPhone(val);
              setIsPhoneSaved(false);
            }}
            placeholder="10-digit mobile number"
            keyboardType="phone-pad"
            containerStyle={{ flex: 1, marginRight: 8 }}
            leftIcon={<Feather name="phone" size={15} color={colors.textMuted} />}
          />
          <Button
            title={isPhoneSaved ? "Saved" : "Save Phone"}
            variant={isPhoneSaved ? "secondary" : "default"}
            size="md"
            isLoading={isSavingPhone}
            onPress={handleSavePhone}
            style={{ height: 44 }}
          />
        </View>
      </Card>

      {/* Step 6: Order Summary & Place Order */}
      <Card style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={[styles.payableLabel, { color: colors.textSecondary }]}>
                Total Order Payable
              </Text>
              {isFloorApplied && (
                <Badge variant="warning" size="sm">
                  Min ₹5 Floor
                </Badge>
              )}
            </View>
            <Text style={[styles.payableAmount, { color: colors.text }]}>
              ₹{finalPayable.toFixed(2)}
            </Text>
            <Text style={[styles.payableBreakdown, { color: colors.textMuted }]}>
              {pageCount} pages × {copies} {copies === 1 ? "copy" : "copies"}
            </Text>
          </View>
        </View>

        <Button
          title={
            cooldownSeconds > 0
              ? `✓ Order Queued — Wait (${cooldownSeconds}s)`
              : `Place Print Order (₹${finalPayable.toFixed(2)})`
          }
          size="lg"
          isLoading={isSubmitting}
          disabled={isSubmitting || cooldownSeconds > 0 || !selectedFile}
          onPress={handlePlaceOrder}
          leftIcon={<Feather name="printer" size={18} color={colors.primaryForeground} />}
          style={{ marginTop: 14 }}
        />
      </Card>

      {/* Recent Orders with PrintOrderTracker */}
      {recentOrders.length > 0 && (
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="time-outline" size={16} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              My Active Print Jobs
            </Text>
          </View>

          <View style={{ gap: 12, marginTop: 8 }}>
            {recentOrders.map((ord: any) => (
              <View
                key={ord.id}
                style={[
                  styles.orderCard,
                  {
                    backgroundColor: colors.secondary,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.orderTopRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={[styles.orderFileName, { color: colors.text }]} numberOfLines={1}>
                      {ord.fileName}
                    </Text>
                    <Text style={[styles.orderMeta, { color: colors.textMuted }]}>
                      {ord.pageCount} pgs • {ord.copies}x • Drop: {ord.deliveryLocation}
                    </Text>
                  </View>
                  <Badge
                    variant={
                      ord.status === "COMPLETED" || ord.status === "DELIVERED"
                        ? "success"
                        : ord.status === "ISSUE_REPORTED"
                        ? "warning"
                        : ord.status === "CANCELLED" || ord.status === "REJECTED"
                        ? "destructive"
                        : "warning"
                    }
                    size="sm"
                  >
                    {ord.status}
                  </Badge>
                </View>

                {/* Animated Horizontal Stepper with Observable Issue Alert */}
                <PrintOrderTracker
                  status={ord.status}
                  issueNote={
                    ord.deliveryLocation?.includes("ISSUE")
                      ? ord.deliveryLocation.split("ISSUE")[1]?.replace(/^[^:]*:\s*/, "")
                      : undefined
                  }
                />

                {/* In-app chat updates link & Problem report button */}
                <View style={styles.orderActionRow}>
                  <TouchableOpacity
                    style={styles.chatUpdateBtn}
                    onPress={() => navigation?.navigate("Messages")}
                  >
                    <Feather name="message-square" size={12} color={colors.primary} />
                    <Text style={[styles.chatUpdateBtnText, { color: colors.primary }]}>
                      Order Chat Updates
                    </Text>
                  </TouchableOpacity>

                  {ord.status === "ISSUE_REPORTED" ? (
                    <View style={styles.underReviewBadge}>
                      <Ionicons name="warning" size={12} color="#f59e0b" />
                      <Text style={{ fontSize: 11, fontWeight: "700", color: "#f59e0b" }}>
                        Under Review
                      </Text>
                    </View>
                  ) : ord.status !== "CANCELLED" && ord.status !== "REJECTED" ? (
                    <TouchableOpacity
                      style={styles.reportProblemBtn}
                      onPress={() => {
                        setReportingOrder(ord);
                        setIssueReason("");
                      }}
                    >
                      <Ionicons name="alert-circle-outline" size={13} color={colors.textMuted} />
                      <Text style={[styles.reportProblemBtnText, { color: colors.textMuted }]}>
                        Report Problem
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        </Card>
      )}

      {/* Problem Report Modal */}
      <Modal
        visible={!!reportingOrder}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setReportingOrder(null)}
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
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Report Problem
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                  Order #{reportingOrder?.id?.slice(-6).toUpperCase()} • {reportingOrder?.fileName}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setReportingOrder(null)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Category selection */}
            <Text style={[styles.categoryLabel, { color: colors.text }]}>Problem Category</Text>
            <View style={styles.categoryChipsRow}>
              {[
                "Print Quality Issue",
                "Wrong Pages / Missing",
                "Drop Location Missing",
                "Payment / UTR Delay",
                "Other",
              ].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.catChip,
                    {
                      backgroundColor:
                        issueCategory === cat ? colors.primary + "18" : colors.secondary,
                      borderColor:
                        issueCategory === cat ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setIssueCategory(cat)}
                >
                  <Text
                    style={[
                      styles.catChipText,
                      {
                        color: issueCategory === cat ? colors.primary : colors.textMuted,
                        fontWeight: issueCategory === cat ? "700" : "500",
                      },
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.categoryLabel, { color: colors.text, marginTop: 12 }]}>
              Detailed Description
            </Text>
            <TextInput
              style={[
                styles.modalTextInput,
                {
                  backgroundColor: colors.secondary,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder="Describe what happened so the print manager can resolve or reprint..."
              placeholderTextColor={colors.textMuted}
              multiline={true}
              numberOfLines={3}
              value={issueReason}
              onChangeText={setIssueReason}
            />

            <View style={styles.modalActionsRow}>
              <Button
                title="Cancel"
                variant="outline"
                size="sm"
                onPress={() => setReportingOrder(null)}
              />
              <Button
                title={isSubmittingIssue ? "Submitting..." : "Submit Problem Report"}
                variant="default"
                size="sm"
                onPress={handleReportIssue}
                disabled={!issueReason.trim() || isSubmittingIssue}
              />
            </View>
          </View>
        </View>
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
  heroBanner: {
    padding: 18,
  },
  badgeRow: {
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  heroSubtitle: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
  },
  sectionCard: {
    padding: 16,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  dropzone: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 14,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  dropzoneTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 8,
  },
  dropzoneSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  filePreviewBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  fileIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  fileNameText: {
    fontSize: 13,
    fontWeight: "700",
  },
  fileMetaText: {
    fontSize: 11,
    marginTop: 2,
  },
  formatGrid: {
    gap: 8,
  },
  formatCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  formatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  formatName: {
    fontSize: 12,
    flex: 1,
    marginRight: 6,
  },
  formatRate: {
    fontSize: 12,
    fontWeight: "800",
  },
  formatDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  copiesRow: {
    flexDirection: "row",
    gap: 8,
  },
  copyBtn: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  copyBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  locationChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 11,
    fontWeight: "600",
  },
  phoneHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  phoneInputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryCard: {
    padding: 18,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  payableLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  payableAmount: {
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.5,
    marginTop: 2,
  },
  payableBreakdown: {
    fontSize: 11,
    marginTop: 2,
  },
  orderCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  orderTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  orderFileName: {
    fontSize: 13,
    fontWeight: "700",
  },
  orderMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  orderActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(150, 150, 150, 0.2)",
  },
  chatUpdateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 2,
  },
  chatUpdateBtnText: {
    fontSize: 11,
    fontWeight: "600",
  },
  underReviewBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  reportProblemBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 2,
  },
  reportProblemBtnText: {
    fontSize: 11,
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
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
    fontSize: 16,
    fontWeight: "800",
  },
  modalSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
  categoryChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 4,
  },
  catChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  catChipText: {
    fontSize: 11,
  },
  modalTextInput: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    fontSize: 12,
    minHeight: 80,
    textAlignVertical: "top",
  },
  modalActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 16,
  },
});
