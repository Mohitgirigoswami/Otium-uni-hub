import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import { GlassCard } from "../components/GlassCard";
import { Badge } from "../components/Badge";
import { Button } from "../components/MintButton";
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
    desc: "High-resolution color graphs, charts, and presentation slides.",
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
  {
    id: "MORNING",
    label: "Morning Drop",
    time: "8:30 AM - 9:00 AM",
    emoji: "🌅",
  },
  {
    id: "LUNCH",
    label: "Lunch Drop",
    time: "12:50 PM - 1:30 PM",
    emoji: "🥪",
  },
];

const LOCATION_PRESETS = [
  "Hostel Block 1, Room ",
  "Hostel Block 4, Room ",
  "Library Ground Desk",
  "Cafeteria Pickup",
];

export function PrintStationScreen() {
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
  const [deliveryLocation, setDeliveryLocation] = useState<string>("Library Ground Floor, Desk 14");
  const [phone, setPhone] = useState<string>("9876543210");
  const [utrNumber, setUtrNumber] = useState<string>("423819823412");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  const fetchOrders = async () => {
    setIsLoadingOrders(true);
    try {
      const res = await apiClient.get("/print/order");
      if (res.success && res.data) {
        setRecentOrders(Array.isArray(res.data) ? res.data : []);
      }
    } catch (e) {
      console.warn("Could not fetch print orders:", e);
    } finally {
      setIsLoadingOrders(false);
    }
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

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      setIsUploadingFile(true);

      const formData = new FormData();
      formData.append("file", {
        uri: asset.uri,
        name: asset.name || "document.pdf",
        type: asset.mimeType || "application/pdf",
      } as any);

      const uploadRes = await apiClient.upload("/print/upload", formData);
      setIsUploadingFile(false);

      if (uploadRes.success && uploadRes.data) {
        setSelectedFile({
          name: uploadRes.data.fileName || asset.name,
          pages: uploadRes.data.pageCount || 1,
          size: `${((uploadRes.data.fileSizeBytes || asset.size || 1024) / (1024 * 1024)).toFixed(1)} MB`,
          fileUrl: uploadRes.data.fileUrl,
        });
        Alert.alert(
          "Document Verified",
          `Detected ${uploadRes.data.pageCount} page(s). Total cost calculated automatically!`
        );
      } else {
        Alert.alert(
          "Upload Failed",
          uploadRes.error || "Could not upload document. Please check your connection and try again."
        );
      }
    } catch (err: any) {
      setIsUploadingFile(false);
      Alert.alert("File Selection Error", err?.message || "Failed to select document.");
    }
  };

  // Dynamic cost calculation with ₹5 Minimum Floor
  const pageCount = selectedFile?.pages || 1;
  const currentFormat = PRINT_FORMATS.find((f) => f.id === selectedFormat) || PRINT_FORMATS[0];
  
  // Single-page duplex safeguard: if 1 page, use single-sided rate
  const effectiveRate = pageCount === 1 && selectedFormat.includes("DOUBLE")
    ? (selectedFormat === "COLOR_DOUBLE" ? 10.0 : 2.5)
    : currentFormat.pricePerUnit;

  const rawCost = pageCount * effectiveRate * copies;
  const MINIMUM_ORDER_FLOOR = 5.0;
  const isFloorApplied = rawCost < MINIMUM_ORDER_FLOOR;
  const finalPayable = Math.max(MINIMUM_ORDER_FLOOR, rawCost);

  const handlePlaceOrder = async () => {
    if (!selectedFile) {
      Alert.alert("Upload Required", "Please upload a document PDF first using the dropzone.");
      return;
    }
    if (!deliveryLocation.trim()) {
      Alert.alert("Location Required", "Please specify a delivery location.");
      return;
    }
    if (!utrNumber || utrNumber.length !== 12) {
      Alert.alert("Invalid UTR", "Please enter a valid 12-digit numeric UPI UTR number.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiClient.post("/print/order", {
        fileName: selectedFile.name,
        fileUrl: selectedFile.fileUrl,
        pageCount: selectedFile.pages,
        copies,
        printType: selectedFormat,
        deliveryLocation: `${deliveryLocation.trim()} | Copies: ${copies} | UTR: ${utrNumber} | Phone: ${phone}`,
        deliverySlot: deliveryWindow,
        phoneNumber: phone,
        utr: utrNumber,
      });

      setIsSubmitting(false);

      if (response.success) {
        Alert.alert(
          "🚀 Print Order Placed!",
          `Order #${(response.data?.id || "ORD").slice(-6).toUpperCase()} confirmed for ₹${finalPayable.toFixed(2)}. Runner will deliver during ${deliveryWindow}.`
        );
        setSelectedFile(null);
        fetchOrders();
      } else {
        Alert.alert(
          "Order Failed",
          response.error || "Failed to submit print order to backend."
        );
      }
    } catch (err: any) {
      setIsSubmitting(false);
      Alert.alert("Network Error", err?.message || "Failed to connect to backend server.");
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Hero Header Banner (1:1 Port of Web Hero) */}
      <View style={styles.heroBanner}>
        <View style={styles.heroBadgeRow}>
          <Badge variant="brand" size="sm">
            Campus Cloud Print Station
          </Badge>
        </View>
        <Text style={styles.heroTitle}>Campus Print Station & Next-Day Delivery</Text>
        <Text style={styles.heroSubtitle}>
          Direct secure document upload. Page counts are auto-calculated for transparent rates. Next-day delivery anywhere in campus.
        </Text>
      </View>

      {/* Step 1: File Upload Dropzone */}
      <GlassCard style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <Feather name="upload-cloud" size={18} color={colors.brand[400]} />
          <Text style={styles.sectionTitle}>Step 1: Upload Document PDF</Text>
        </View>

        {isUploadingFile ? (
          <View style={styles.dropzoneBox}>
            <ActivityIndicator size="large" color={colors.brand[400]} />
            <Text style={[styles.dropzoneTitle, { marginTop: 12 }]}>
              Uploading & Verifying PDF...
            </Text>
            <Text style={styles.dropzoneSubtitle}>
              Auto-calculating exact page count on server
            </Text>
          </View>
        ) : selectedFile ? (
          <View style={styles.filePreviewBox}>
            <View style={styles.fileIconBox}>
              <Ionicons name="document-text" size={22} color={colors.brand[400]} />
            </View>
            <View style={styles.fileInfoColumn}>
              <Text style={styles.fileNameText} numberOfLines={1}>
                {selectedFile.name}
              </Text>
              <Text style={styles.fileMetaText}>
                {selectedFile.size} • {selectedFile.pages} Pages Auto-Detected
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setSelectedFile(null)}
              style={styles.removeFileBtn}
            >
              <Ionicons name="close-circle" size={20} color={colors.slate[400]} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handlePickDocument}
            style={styles.dropzoneBox}
          >
            <Feather name="upload-cloud" size={32} color={colors.brand[400]} />
            <Text style={styles.dropzoneTitle}>Tap to select or upload PDF</Text>
            <Text style={styles.dropzoneSubtitle}>
              Select any PDF from your device storage (Max 50MB)
            </Text>
          </TouchableOpacity>
        )}

        {/* Page Count Confirmation Badge */}
        {selectedFile && (
          <View style={styles.verifiedCountCard}>
            <View style={styles.verifiedLeft}>
              <Ionicons name="checkmark-circle" size={18} color={colors.brand[400]} />
              <Text style={styles.verifiedText}>
                Document Length: {selectedFile.pages} Pages
              </Text>
            </View>
            <Badge variant="brand" size="sm">
              {selectedFile.pages} Pages
            </Badge>
          </View>
        )}
      </GlassCard>

      {/* Step 2: Print Format & Paper Type */}
      <GlassCard style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Step 2: Print Format & Paper Type *</Text>
        <View style={styles.formatsGrid}>
          {PRINT_FORMATS.map((fmt) => {
            const isSelected = selectedFormat === fmt.id;
            const isOnePage = pageCount === 1;
            return (
              <TouchableOpacity
                key={fmt.id}
                activeOpacity={0.8}
                onPress={() => setSelectedFormat(fmt.id)}
                style={[
                  styles.formatCard,
                  isSelected && styles.formatCardActive,
                ]}
              >
                <View style={styles.formatHeaderRow}>
                  <Text style={[styles.formatName, isSelected && styles.formatNameActive]}>
                    {isOnePage && fmt.id.includes("DOUBLE")
                      ? `${fmt.id === "COLOR_DOUBLE" ? "Color" : "B&W"} (1 Page = Single)`
                      : fmt.name}
                  </Text>
                  <Text style={styles.formatRate}>{fmt.rate}</Text>
                </View>
                <Text style={styles.formatDesc}>{fmt.desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </GlassCard>

      {/* Step 3: Copies & Delivery Destination */}
      <GlassCard style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Step 3: Number of Copies</Text>
        <View style={styles.copiesRow}>
          {[1, 2, 3, 5, 10].map((num) => (
            <TouchableOpacity
              key={num}
              onPress={() => setCopies(num)}
              style={[
                styles.copyButton,
                copies === num && styles.copyButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.copyButtonText,
                  copies === num && styles.copyButtonTextActive,
                ]}
              >
                {num}x
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 18 }]}>
          Step 4: Delivery Destination Anywhere in Campus *
        </Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="location-outline" size={18} color={colors.slate[400]} style={styles.inputIcon} />
          <TextInput
            value={deliveryLocation}
            onChangeText={setDeliveryLocation}
            placeholder="e.g. Library Desk 12 / Academic Block C / Hostel"
            placeholderTextColor={colors.slate[500]}
            style={styles.textInput}
          />
        </View>

        {/* Location Presets */}
        <View style={styles.presetsRow}>
          <Text style={styles.presetsLabel}>Presets:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {LOCATION_PRESETS.map((preset) => (
              <TouchableOpacity
                key={preset}
                onPress={() => setDeliveryLocation(preset)}
                style={styles.presetChip}
              >
                <Text style={styles.presetChipText}>{preset.trim()}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </GlassCard>

      {/* Step 4: Select Delivery Window (Task 2 Requirement) */}
      <GlassCard style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="time-outline" size={18} color={colors.brand[400]} />
          <Text style={styles.sectionTitle}>Step 5: Select Delivery Window *</Text>
        </View>

        <View style={styles.deliveryWindowsGrid}>
          {DELIVERY_WINDOWS.map((win) => {
            const slotValue = `${win.label} (${win.time})`;
            const isSelected = deliveryWindow === slotValue;
            return (
              <TouchableOpacity
                key={win.id}
                activeOpacity={0.8}
                onPress={() => setDeliveryWindow(slotValue)}
                style={[
                  styles.deliveryWindowCard,
                  isSelected && styles.deliveryWindowCardActive,
                ]}
              >
                <Text style={styles.deliveryEmoji}>{win.emoji}</Text>
                <View style={styles.deliveryWindowTexts}>
                  <Text
                    style={[
                      styles.deliveryWindowLabel,
                      isSelected && styles.deliveryWindowLabelActive,
                    ]}
                  >
                    {win.label}
                  </Text>
                  <Text style={styles.deliveryWindowTime}>{win.time}</Text>
                </View>
                {isSelected && (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={colors.brand[400]}
                    style={styles.windowCheckIcon}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </GlassCard>

      {/* 9 PM Late-Night Cut-Off Warning Banner (Task 2 Requirement) */}
      <View style={styles.warningBanner}>
        <Ionicons name="warning" size={20} color={colors.amber[400]} style={styles.warningIcon} />
        <Text style={styles.warningText}>
          ⚠️ Orders placed after 9:00 PM may not be processed until the following evening. Plan accordingly.
        </Text>
      </View>

      {/* Step 5: Advance UPI Payment (12-Digit UTR) */}
      <GlassCard style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <MaterialCommunityIcons name="qrcode-scan" size={18} color={colors.amber[400]} />
          <Text style={styles.sectionTitle}>Step 6: Advance UPI Payment</Text>
        </View>

        <View style={styles.upiCard}>
          <View style={styles.upiHeaderRow}>
            <Text style={styles.upiLabel}>Pay via Platform UPI ID:</Text>
            <Text style={styles.upiIdText}>otiumprint@axl</Text>
          </View>
          <View style={styles.utrInputWrapper}>
            <Text style={styles.utrLabel}>12-Digit UPI Transaction / UTR Number *</Text>
            <TextInput
              value={utrNumber}
              onChangeText={(text: string) => setUtrNumber(text.replace(/\D/g, ""))}
              maxLength={12}
              keyboardType="number-pad"
              placeholder="e.g. 423819823412"
              placeholderTextColor={colors.slate[500]}
              style={styles.utrInput}
            />
          </View>
        </View>
      </GlassCard>

      {/* Order Summary & Place Order Mint CTA */}
      <GlassCard style={styles.summaryCard}>
        <View style={styles.summaryTopRow}>
          <View>
            <View style={styles.summaryPayableHeader}>
              <Text style={styles.payableLabel}>Total Order Payable</Text>
              {isFloorApplied && (
                <Badge variant="warning" size="sm">
                  Min ₹5 Floor Applied
                </Badge>
              )}
            </View>
            <Text style={styles.payableAmount}>₹{finalPayable.toFixed(2)}</Text>
            <Text style={styles.payableBreakdown}>
              {pageCount} pages × {copies} {copies === 1 ? "copy" : "copies"}
              {isFloorApplied ? ` (Calc: ₹${rawCost.toFixed(2)} → Min ₹5 Floor)` : ""}
            </Text>
            <Text style={styles.slotTagText}>📦 {deliveryWindow}</Text>
          </View>
        </View>

        <Button
          variant="brand"
          size="lg"
          title={`Place Print Order (₹${finalPayable.toFixed(2)})`}
          loading={isSubmitting}
          onPress={handlePlaceOrder}
          leftIcon={<Feather name="printer" size={18} color="#FFFFFF" />}
          style={styles.submitBtn}
        />
      </GlassCard>

      {/* Live Recent Print Orders */}
      {recentOrders.length > 0 && (
        <GlassCard style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="time-outline" size={18} color={colors.brand[400]} />
            <Text style={styles.sectionTitle}>My Recent Print Orders</Text>
          </View>
          <View style={{ gap: 10, marginTop: 8 }}>
            {recentOrders.map((ord: any) => (
              <View
                key={ord.id}
                style={{
                  padding: 12,
                  borderRadius: 14,
                  backgroundColor: colors.slate[900],
                  borderWidth: 1,
                  borderColor: colors.slate[800],
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text
                    style={{ fontSize: 13, fontWeight: "700", color: "#FFFFFF" }}
                    numberOfLines={1}
                  >
                    {ord.fileName}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.slate[400], marginTop: 2 }}>
                    {ord.pageCount} pgs • {ord.printType} • {ord.copies}x
                  </Text>
                </View>
                <Badge
                  variant={
                    ord.status === "COMPLETED" || ord.status === "DELIVERED"
                      ? "success"
                      : "warning"
                  }
                  size="sm"
                >
                  {ord.status}
                </Badge>
              </View>
            ))}
          </View>
        </GlassCard>
      )}
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
  heroBanner: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: "rgba(13, 148, 136, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(20, 184, 166, 0.3)",
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
  sectionCard: {
    padding: 18,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.2,
    marginBottom: 10,
  },
  dropzoneBox: {
    borderWidth: 2,
    borderColor: "rgba(20, 184, 166, 0.35)",
    borderStyle: "dashed",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(20, 184, 166, 0.05)",
  },
  dropzoneTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 10,
  },
  dropzoneSubtitle: {
    fontSize: 11,
    color: colors.slate[400],
    marginTop: 4,
    textAlign: "center",
  },
  filePreviewBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    backgroundColor: "rgba(20, 184, 166, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(20, 184, 166, 0.3)",
  },
  fileIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "rgba(20, 184, 166, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  fileInfoColumn: {
    flex: 1,
  },
  fileNameText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  fileMetaText: {
    fontSize: 11,
    color: colors.slate[400],
    marginTop: 2,
  },
  removeFileBtn: {
    padding: 4,
  },
  verifiedCountCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "rgba(20, 184, 166, 0.08)",
  },
  verifiedLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.slate[200],
  },
  formatsGrid: {
    gap: 10,
  },
  formatCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
  },
  formatCardActive: {
    borderColor: colors.brand[500],
    backgroundColor: "rgba(20, 184, 166, 0.12)",
  },
  formatHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  formatName: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.slate[200],
    flex: 1,
  },
  formatNameActive: {
    color: "#FFFFFF",
  },
  formatRate: {
    fontSize: 13,
    fontWeight: "900",
    color: colors.brand[400],
    marginLeft: 8,
  },
  formatDesc: {
    fontSize: 11,
    color: colors.slate[400],
    marginTop: 4,
  },
  copiesRow: {
    flexDirection: "row",
    gap: 8,
  },
  copyButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.slate[800],
    alignItems: "center",
  },
  copyButtonActive: {
    backgroundColor: colors.brand[600],
  },
  copyButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.slate[300],
  },
  copyButtonTextActive: {
    color: "#FFFFFF",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.slate[900],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 13,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  presetsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 8,
  },
  presetsLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.slate[400],
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    marginRight: 6,
  },
  presetChipText: {
    fontSize: 10.5,
    color: colors.slate[300],
  },
  deliveryWindowsGrid: {
    gap: 10,
  },
  deliveryWindowCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
  },
  deliveryWindowCardActive: {
    borderColor: colors.brand[500],
    backgroundColor: "rgba(20, 184, 166, 0.12)",
  },
  deliveryEmoji: {
    fontSize: 22,
    marginRight: 12,
  },
  deliveryWindowTexts: {
    flex: 1,
  },
  deliveryWindowLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.slate[200],
  },
  deliveryWindowLabelActive: {
    color: "#FFFFFF",
  },
  deliveryWindowTime: {
    fontSize: 12,
    color: colors.slate[400],
    marginTop: 2,
  },
  windowCheckIcon: {
    marginLeft: 8,
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.amber.bg,
    borderWidth: 1,
    borderColor: colors.amber.border,
  },
  warningIcon: {
    marginRight: 10,
    marginTop: 1,
  },
  warningText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: "600",
    color: colors.amber[400],
    lineHeight: 18,
  },
  upiCard: {
    gap: 12,
  },
  upiHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  upiLabel: {
    fontSize: 11,
    color: colors.slate[400],
  },
  upiIdText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.amber[400],
    fontFamily: "monospace",
  },
  utrInputWrapper: {
    gap: 6,
  },
  utrLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.slate[300],
    textTransform: "uppercase",
  },
  utrInput: {
    backgroundColor: colors.slate[900],
    borderWidth: 1,
    borderColor: colors.amber[500],
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
    fontFamily: "monospace",
  },
  summaryCard: {
    padding: 20,
    gap: 16,
  },
  summaryTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  summaryPayableHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  payableLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.slate[400],
    textTransform: "uppercase",
  },
  payableAmount: {
    fontSize: 28,
    fontWeight: "900",
    color: colors.brand[400],
    letterSpacing: -0.5,
    marginTop: 4,
  },
  payableBreakdown: {
    fontSize: 11,
    color: colors.slate[400],
    marginTop: 2,
  },
  slotTagText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.brand[400],
    marginTop: 4,
  },
  submitBtn: {
    width: "100%",
  },
});
