import React, { useState, useEffect, useRef, useCallback } from "react";
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
  Image,
  Platform,
  RefreshControl,
  Animated,
  Easing,
  KeyboardAvoidingView,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import * as Clipboard from "expo-clipboard";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { PrintOrderTracker } from "../../components/print/PrintOrderTracker";
import { ClientServiceGuard } from "../../components/ClientServiceGuard";
import { useUser } from "../../context/UserContext";
import { apiClient } from "../../services/apiClient";
import { WalletRechargeModal } from "../wallet/WalletRechargeModal";
import { UnifiedCheckoutModal } from "../../components/checkout/UnifiedCheckoutModal";

interface PrintOption {
  id: string;
  name: string;
  desc: string;
  rate: string;
  pricePerUnit: number;
}

const DEFAULT_PRINT_FORMATS: PrintOption[] = [
  {
    id: "BW_DOUBLE",
    name: "B&W Double-Sided",
    desc: "Duplex printing on 75 GSM paper",
    rate: "₹2.00 / page",
    pricePerUnit: 2.0,
  },
  {
    id: "BW_SINGLE",
    name: "B&W Single-Sided",
    desc: "Single-sided for official forms",
    rate: "₹2.50 / page",
    pricePerUnit: 2.5,
  },
  {
    id: "COLOR_DOUBLE",
    name: "Color Double-Sided",
    desc: "Vibrant duplex for reports",
    rate: "₹8.00 / page",
    pricePerUnit: 8.0,
  },
  {
    id: "COLOR_SINGLE",
    name: "Color Single-Sided",
    desc: "High-res presentation slides",
    rate: "₹10.00 / page",
    pricePerUnit: 10.0,
  },
];

const DELIVERY_WINDOWS = [
  { id: "MORNING", label: "Morning Drop (8:30 AM - 9:00 AM)" },
  { id: "LUNCH", label: "Lunch Drop (12:50 PM - 1:30 PM)" },
];

const QUICK_LOCATION_CHIPS = [
  "Hostel Block 1",
  "Hostel Block 2",
  "Hostel Block 4",
  "Central Library Desk",
  "Academic Block C",
  "Student Cafeteria",
];

const STORAGE_KEY_PRINT_ORDERS = "@otium_cached_print_orders";
const STORAGE_KEY_PRINT_SYNC_QUEUE = "@otium_print_pending_sync";
const STORAGE_KEY_UPI_ID = "@otium_cached_upi_id";
const STORAGE_KEY_WALLET_PAISE = "@otium_cached_wallet_paise";
const STORAGE_KEY_PRINT_RATES = "@otium_cached_print_rates";

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
  const [printFormats, setPrintFormats] = useState<PrintOption[]>(DEFAULT_PRINT_FORMATS);
  const [selectedFormat, setSelectedFormat] = useState<string>("BW_DOUBLE");
  const [copies, setCopies] = useState<number>(1);
  const [deliveryWindow, setDeliveryWindow] = useState<string>("Morning Drop (8:30 AM - 9:00 AM)");
  const [deliveryLocation, setDeliveryLocation] = useState<string>("");
  const [upiId, setUpiId] = useState<string>("8307798816@upi");

  const [phone, setPhone] = useState<string>(user?.phone || "");
  const [isPhoneSaved, setIsPhoneSaved] = useState<boolean>(!!user?.phone);
  const [isSavingPhone, setIsSavingPhone] = useState<boolean>(false);

  // Dedicated Checkout Modal State
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [utrNumber, setUtrNumber] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [isRefreshingOrders, setIsRefreshingOrders] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Wallet states
  const [paymentMethod, setPaymentMethod] = useState<"WALLET" | "UPI">("WALLET");
  const [walletBalancePaise, setWalletBalancePaise] = useState<number | null>(null);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

  const fetchPrintRates = async () => {
    try {
      const res = await apiClient.get<any>("/print/rates");
      if (res.success && res.data) {
        const d = res.data;
        const updated: PrintOption[] = [
          {
            id: "BW_DOUBLE",
            name: "B&W Double-Sided",
            desc: "Duplex printing on 75 GSM paper",
            rate: `₹${Number(d.doubleSidedRupees ?? 2.0).toFixed(2)} / page`,
            pricePerUnit: Number(d.doubleSidedRupees ?? 2.0),
          },
          {
            id: "BW_SINGLE",
            name: "B&W Single-Sided",
            desc: "Single-sided for official forms",
            rate: `₹${Number(d.singleSidedRupees ?? 2.5).toFixed(2)} / page`,
            pricePerUnit: Number(d.singleSidedRupees ?? 2.5),
          },
          {
            id: "COLOR_DOUBLE",
            name: "Color Double-Sided",
            desc: "Vibrant duplex for reports",
            rate: `₹${Number(d.colorDoubleRupees ?? 8.0).toFixed(2)} / page`,
            pricePerUnit: Number(d.colorDoubleRupees ?? 8.0),
          },
          {
            id: "COLOR_SINGLE",
            name: "Color Single-Sided",
            desc: "High-res presentation slides",
            rate: `₹${Number(d.colorSingleRupees ?? 10.0).toFixed(2)} / page`,
            pricePerUnit: Number(d.colorSingleRupees ?? 10.0),
          },
        ];
        setPrintFormats(updated);
        AsyncStorage.setItem(STORAGE_KEY_PRINT_RATES, JSON.stringify(updated)).catch(() => {});
      }
    } catch {
      // Keep cached or default rates on offline/error
    }
  };

  const fetchWalletBalance = async () => {
    try {
      const res = await apiClient.get<any>("/wallet");
      if (res.success && res.data) {
        setWalletBalancePaise(res.data.balancePaise);
        AsyncStorage.setItem(STORAGE_KEY_WALLET_PAISE, String(res.data.balancePaise)).catch(() => {});
      }
    } catch (err) {
      console.warn("Could not fetch wallet balance:", err);
    }
  };

  const handlePasteUtr = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      const digits = text.replace(/\D/g, "");
      if (digits.length >= 12) {
        setUtrNumber(digits.slice(0, 12));
      } else if (digits.length > 0) {
        setUtrNumber(digits);
      } else {
        Alert.alert("Clipboard Empty", "No numeric UTR found in clipboard.");
      }
    } catch {
      Alert.alert("Error", "Could not read from clipboard.");
    }
  };

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY_PRINT_RATES)
      .then((cached) => {
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) setPrintFormats(parsed);
        }
      })
      .catch(() => {});
    fetchPrintRates();

    AsyncStorage.getItem(STORAGE_KEY_WALLET_PAISE)
      .then((val) => {
        if (val !== null) setWalletBalancePaise(Number(val));
      })
      .catch(() => {});
    fetchWalletBalance();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchPrintRates();
      fetchWalletBalance();
    }, [])
  );

  // Animated spin for refresh button
  const spinAnim = useRef(new Animated.Value(0)).current;

  const triggerSpinAnimation = () => {
    spinAnim.setValue(0);
    Animated.timing(spinAnim, {
      toValue: 1,
      duration: 800,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: true,
    }).start();
  };

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

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

  const flushOfflinePrintQueue = async () => {
    try {
      const queueRaw = await AsyncStorage.getItem(STORAGE_KEY_PRINT_SYNC_QUEUE);
      if (!queueRaw) return;
      const queue = JSON.parse(queueRaw);
      if (!Array.isArray(queue) || queue.length === 0) return;

      const remaining: any[] = [];
      for (const orderPayload of queue) {
        try {
          const res = await apiClient.post("/print/order", orderPayload);
          if (!res.success) {
            remaining.push(orderPayload);
          }
        } catch {
          remaining.push(orderPayload);
        }
      }

      if (remaining.length > 0) {
        await AsyncStorage.setItem(STORAGE_KEY_PRINT_SYNC_QUEUE, JSON.stringify(remaining));
      } else {
        await AsyncStorage.removeItem(STORAGE_KEY_PRINT_SYNC_QUEUE);
      }
    } catch {}
  };

  const fetchOrders = async (isManualPull = false) => {
    if (isManualPull) {
      setIsRefreshingOrders(true);
      triggerSpinAnimation();
    }

    // 1. Load cached orders
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEY_PRINT_ORDERS);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRecentOrders(parsed);
        }
      }
    } catch {}

    await flushOfflinePrintQueue();

    // 2. Fetch live orders from server with userId query parameter
    try {
      const effectiveUserId = user?.id || "";
      const url = effectiveUserId
        ? `/print/order?userId=${encodeURIComponent(effectiveUserId)}`
        : "/print/order";

      const res = await apiClient.get(url);
      if (res.success && Array.isArray(res.data)) {
        setRecentOrders(res.data);
        AsyncStorage.setItem(STORAGE_KEY_PRINT_ORDERS, JSON.stringify(res.data)).catch(() => {});
      }
    } catch {
      console.log("[Fetch Orders Note]: Operating in offline cached mode");
    } finally {
      if (isManualPull) {
        setIsRefreshingOrders(false);
      }
    }
  };

  const fetchSettings = async () => {
    // 1. Read cached UPI
    try {
      const cachedUpi = await AsyncStorage.getItem(STORAGE_KEY_UPI_ID);
      if (cachedUpi) {
        setUpiId(cachedUpi);
      }
    } catch {}

    // 2. Fetch latest from server
    try {
      const res = await apiClient.get("/settings");
      if (res.success && res.data?.upiId) {
        const freshUpi = res.data.upiId;
        setUpiId(freshUpi);
        AsyncStorage.setItem(STORAGE_KEY_UPI_ID, freshUpi).catch(() => {});
      }
    } catch {
      // Keep state default 8307798816@upi
    }
  };

  // Trigger on user change or boot
  useEffect(() => {
    fetchOrders();
    fetchSettings();
  }, [user?.id]);

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf"],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const asset = result.assets[0];

      if (asset.size && asset.size > 50 * 1024 * 1024) {
        Alert.alert("File Too Large", "Please select a PDF document under 50 MB.");
        return;
      }

      setIsUploadingFile(true);

      const fileSizeMb = asset.size ? (asset.size / (1024 * 1024)).toFixed(2) : "0.5";
      const safeFileName = (asset.name || "document.pdf").replace(/[^a-zA-Z0-9._-]/g, "_");

      // Upload PDF directly to secure cloud print storage and receive server-verified page count
      const formData = new FormData();
      formData.append("file", {
        uri: asset.uri,
        name: safeFileName,
        type: asset.mimeType || "application/pdf",
      } as any);
      if (user?.collegeId) {
        formData.append("campusId", user.collegeId);
      }

      const uploadRes = await apiClient.upload("/print/upload", formData);

      if (uploadRes.success && uploadRes.data?.fileUrl) {
        const serverPages = Math.max(1, Number(uploadRes.data.pageCount) || 1);
        setSelectedFile({
          name: asset.name,
          pages: serverPages,
          size: `${fileSizeMb} MB`,
          fileUrl: uploadRes.data.fileUrl,
        });
      } else {
        const errorMsg =
          typeof uploadRes.error === "string"
            ? uploadRes.error
            : (uploadRes.error as any)?.message ||
              (uploadRes.data as any)?.error ||
              "Failed to upload document to print station.";
        throw new Error(String(errorMsg));
      }
    } catch (uploadErr: any) {
      const displayMsg =
        typeof uploadErr?.message === "string" && uploadErr.message !== "[object Object]"
          ? uploadErr.message
          : typeof uploadErr === "string"
          ? uploadErr
          : "Could not upload the selected PDF file.";
      Alert.alert("Upload Failed", displayMsg);
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleSavePhone = async () => {
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      Alert.alert("Invalid Phone", "Please enter a valid 10-digit mobile number.");
      return;
    }

    setIsSavingPhone(true);
    try {
      const res = await apiClient.post("/user/profile", { phone: cleanPhone });
      if (res.success) {
        setIsPhoneSaved(true);
        if (setUser) setUser((prev: any) => ({ ...prev, phone: cleanPhone }));
        Alert.alert("Saved", "Phone number synced for SMS delivery alerts.");
      } else {
        Alert.alert("Error", res.error || "Failed to update phone number.");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save phone number.");
    } finally {
      setIsSavingPhone(false);
    }
  };

  // Pricing calculations with ₹5.00 Minimum Campus Order Floor
  const activeFormatObj = printFormats.find((f) => f.id === selectedFormat) || printFormats[0];
  const pages = selectedFile?.pages || 1;
  const rawCost = pages * copies * activeFormatObj.pricePerUnit;
  const isFloorApplied = rawCost < 5.0;
  const minFloorAdjustment = isFloorApplied ? 5.0 - rawCost : 0;
  const finalCost = Math.max(5.0, rawCost).toFixed(2);
  const finalCostPaise = Math.round(Number(finalCost) * 100);
  const cashbackPaise = Math.floor(finalCostPaise * 0.02);
  const cashbackRupees = (cashbackPaise / 100).toFixed(2);
  const hasSufficientWalletBalance =
    walletBalancePaise !== null && walletBalancePaise >= finalCostPaise;

  const handleOpenCheckoutModal = () => {
    if (!selectedFile) {
      Alert.alert("Missing PDF", "Please upload a document to proceed.");
      return;
    }
    if (!deliveryLocation.trim()) {
      Alert.alert("Missing Location", "Please select or type your campus drop location.");
      return;
    }
    fetchWalletBalance();
    setIsCheckoutModalOpen(true);
  };

  const processOrderSubmission = async (method: "WALLET" | "UPI", cleanUtr: string) => {
    if (!selectedFile) {
      Alert.alert("Missing PDF", "Please upload a document to proceed.");
      return;
    }

    if (!deliveryLocation.trim()) {
      Alert.alert("Missing Location", "Please select or type your campus drop location.");
      return;
    }

    const isWallet = method === "WALLET";

    setIsSubmitting(true);
    const orderPayload = {
      userId: user?.id,
      fileName: selectedFile.name,
      pageCount: selectedFile.pages,
      copies,
      printType: selectedFormat,
      deliveryLocation: deliveryLocation.trim(),
      deliverySlot: deliveryWindow,
      phoneNumber: phone ? phone.replace(/\D/g, "") : undefined,
      utr: isWallet ? undefined : cleanUtr,
      utrNumber: isWallet ? undefined : cleanUtr,
      paymentMethod: method,
      fileUrl: selectedFile.fileUrl || "https://otiumhub.in/placeholder-doc.pdf",
    };

    const triggerCooldown = () => {
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
    };

    try {
      const res = await apiClient.post("/print/order", orderPayload);

      if (res.success) {
        fetchWalletBalance();
        const successMsg = isWallet
          ? `Paid ₹${finalCost} instantly with Otium Wallet! +₹${cashbackRupees} (2%) cashback credited.`
          : "Your print job is queued. Live status updates will appear in your tracking section.";
        Alert.alert("Order Placed! 🚀", successMsg);
        setIsCheckoutModalOpen(false);
        setSelectedFile(null);
        triggerCooldown();
        fetchOrders(true);
      } else {
        throw new Error(res.error || "Failed to submit print order.");
      }
    } catch (err: any) {
      if (isWallet) {
        Alert.alert("Payment Failed", err.message || "Failed to process wallet payment.");
        setIsSubmitting(false);
        return;
      }
      // Offline fallback: Queue order on device and show optimistic feedback
      const localPendingOrder = {
        id: `offline-${Date.now()}`,
        fileName: selectedFile.name,
        pageCount: selectedFile.pages,
        copies,
        printType: selectedFormat,
        deliveryLocation: deliveryLocation.trim(),
        deliverySlot: deliveryWindow,
        utr: cleanUtr,
        status: "QUEUED",
        createdAt: new Date().toISOString(),
        isOfflinePending: true,
      };

      const updatedRecent = [localPendingOrder, ...recentOrders];
      setRecentOrders(updatedRecent);
      AsyncStorage.setItem(STORAGE_KEY_PRINT_ORDERS, JSON.stringify(updatedRecent)).catch(() => {});

      try {
        const queueRaw = await AsyncStorage.getItem(STORAGE_KEY_PRINT_SYNC_QUEUE);
        const queue = queueRaw ? JSON.parse(queueRaw) : [];
        queue.push(orderPayload);
        await AsyncStorage.setItem(STORAGE_KEY_PRINT_SYNC_QUEUE, JSON.stringify(queue));
      } catch {}

      Alert.alert(
        "Saved Locally ☁️",
        "Network connection is intermittent. Your print job has been queued locally and will automatically synchronize when connection resumes."
      );
      setIsCheckoutModalOpen(false);
      setSelectedFile(null);
      triggerCooldown();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayWithWallet = async () => {
    await processOrderSubmission("WALLET", "WALLET_PAYMENT");
  };

  const handlePayWithUpi = async (cleanUtr: string) => {
    await processOrderSubmission("UPI", cleanUtr);
  };

  return (
    <ClientServiceGuard serviceKey="PRINT_STATION" navigation={navigation}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshingOrders}
            onRefresh={() => fetchOrders(true)}
            tintColor={colors.primary}
          />
        }
      >
        {/* 1. Header Banner */}
        <Card style={styles.headerCard}>
          <View style={styles.headerTopRow}>
            <View style={styles.headerBadge}>
              <Feather name="printer" size={15} color={colors.primary} />
              <Text style={[styles.headerBadgeText, { color: colors.textSecondary }]}>
                Hostel Express Service
              </Text>
            </View>
            <Badge variant="primary" size="sm">
              {user?.college?.name || "JCBOSEUST, YMCA"}
            </Badge>
          </View>

          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Express Print Station
          </Text>
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>
            Upload documents, choose duplex formats, and receive fast delivery directly at your hostel room or library desk.
          </Text>

          {/* Live rates chips */}
          <View style={styles.ratePillsRow}>
            <Badge variant="outline" size="sm">
              B&W Duplex: ₹2.0/pg
            </Badge>
            <Badge variant="outline" size="sm">
              B&W Single: ₹2.5/pg
            </Badge>
            <Badge variant="outline" size="sm">
              Color Duplex: ₹8.0/pg
            </Badge>
          </View>
        </Card>

        {/* 2. Document Upload Card */}
        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            1. Select PDF Document
          </Text>

          {selectedFile ? (
            <View style={[styles.pickedFileBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <View style={styles.pickedFileTopRow}>
                <View style={styles.pickedFileLeft}>
                  <View style={[styles.pdfIconWrap, { backgroundColor: colors.primary + "20" }]}>
                    <Feather name="file-text" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>
                      {selectedFile.name}
                    </Text>
                    <Text style={[styles.fileMeta, { color: colors.textMuted }]}>
                      {selectedFile.size} • {selectedFile.pages} Page(s) detected
                    </Text>
                  </View>
                </View>

                <TouchableOpacity onPress={() => setSelectedFile(null)} style={styles.removeFileBtn}>
                  <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Document Pages (Server-Verified & Read-Only) */}
              <View style={[styles.pageStepperRow, { borderTopColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.pageStepperLabel, { color: colors.text }]}>
                    Document Pages
                  </Text>
                  <Text style={[styles.pageStepperHint, { color: colors.textMuted }]}>
                    Auto-calculated from uploaded PDF bytes
                  </Text>
                </View>

                <View style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
                  <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 13 }}>
                    {selectedFile.pages} {selectedFile.pages === 1 ? "page" : "pages"}
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handlePickDocument}
              disabled={isUploadingFile}
              style={[
                styles.uploadDropzone,
                { borderColor: colors.border, backgroundColor: colors.secondary + "40" },
              ]}
            >
              {isUploadingFile ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <View style={[styles.uploadIconCircle, { backgroundColor: colors.primary + "18" }]}>
                    <Feather name="upload-cloud" size={24} color={colors.primary} />
                  </View>
                  <Text style={[styles.uploadPrompt, { color: colors.text }]}>
                    Tap to upload PDF document
                  </Text>
                  <Text style={[styles.uploadHint, { color: colors.textMuted }]}>
                    Automatic client-side page detection • Max 50 MB
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </Card>

        {/* 3. Print Type Selector */}
        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            2. Select Print Format
          </Text>

          <View style={styles.formatGrid}>
            {printFormats.map((opt) => {
              const isSelected = selectedFormat === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  activeOpacity={0.8}
                  onPress={() => setSelectedFormat(opt.id)}
                  style={[
                    styles.formatTile,
                    {
                      backgroundColor: isSelected ? colors.primary + "12" : colors.card,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <View style={styles.formatTileTop}>
                    <View
                      style={[
                        styles.radioCircle,
                        { borderColor: isSelected ? colors.primary : colors.textMuted },
                      ]}
                    >
                      {isSelected && (
                        <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />
                      )}
                    </View>
                    <Text style={[styles.formatRate, { color: colors.primary }]}>{opt.rate}</Text>
                  </View>

                  <Text style={[styles.formatName, { color: colors.text }]}>{opt.name}</Text>
                  <Text style={[styles.formatDesc, { color: colors.textMuted }]}>{opt.desc}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Copies counter */}
          <View style={[styles.copiesRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.copiesLabel, { color: colors.text }]}>Number of Copies</Text>
            <View style={styles.counterWrap}>
              <TouchableOpacity
                onPress={() => setCopies(Math.max(1, copies - 1))}
                style={[styles.counterBtn, { borderColor: colors.border }]}
              >
                <Feather name="minus" size={14} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.counterValue, { color: colors.text }]}>{copies}</Text>
              <TouchableOpacity
                onPress={() => setCopies(copies + 1)}
                style={[styles.counterBtn, { borderColor: colors.border }]}
              >
                <Feather name="plus" size={14} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>
        </Card>

        {/* 4. Delivery Location & Window */}
        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            3. Campus Drop Location & Time
          </Text>

          <View style={styles.quickLocations}>
            {QUICK_LOCATION_CHIPS.map((loc) => {
              const isSelected = deliveryLocation === loc;
              return (
                <TouchableOpacity
                  key={loc}
                  onPress={() => setDeliveryLocation(loc)}
                  style={[
                    styles.locationChip,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.secondary,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.locationChipText,
                      {
                        color: isSelected ? colors.primaryForeground : colors.textMuted,
                        fontWeight: isSelected ? "700" : "500",
                      },
                    ]}
                  >
                    {loc}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Input
            placeholder="e.g. Hostel 1 Room 204 or Library Desk..."
            value={deliveryLocation}
            onChangeText={setDeliveryLocation}
            containerStyle={{ marginTop: 8 }}
          />

          {/* Drop time slots */}
          <Text style={[styles.subLabel, { color: colors.text, marginTop: 12 }]}>
            Delivery Window Slot
          </Text>
          <View style={styles.slotRow}>
            {DELIVERY_WINDOWS.map((win) => {
              const isSelected = deliveryWindow === win.label;
              return (
                <TouchableOpacity
                  key={win.id}
                  onPress={() => setDeliveryWindow(win.label)}
                  style={[
                    styles.slotTile,
                    {
                      backgroundColor: isSelected ? colors.primary + "15" : colors.secondary,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Feather
                    name="clock"
                    size={14}
                    color={isSelected ? colors.primary : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.slotText,
                      {
                        color: isSelected ? colors.primary : colors.textMuted,
                        fontWeight: isSelected ? "700" : "500",
                      },
                    ]}
                  >
                    {win.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Contact Phone for SMS */}
          <Text style={[styles.subLabel, { color: colors.text, marginTop: 12 }]}>
            Delivery Contact Mobile
          </Text>
          <View style={styles.phoneInputRow}>
            <Input
              placeholder="10-digit mobile number"
              value={phone}
              onChangeText={(text) => {
                setPhone(text);
                setIsPhoneSaved(false);
              }}
              keyboardType="phone-pad"
              maxLength={10}
              containerStyle={{ flex: 1 }}
            />
            <Button
              title={isSavingPhone ? "Saving..." : isPhoneSaved ? "Saved" : "Save"}
              variant={isPhoneSaved ? "secondary" : "outline"}
              size="sm"
              onPress={handleSavePhone}
              disabled={isSavingPhone || isPhoneSaved}
              style={{ marginLeft: 8 }}
            />
          </View>
        </Card>

        {/* 5. Cost Summary & Proceed to Checkout */}
        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            4. Order Valuation & Checkout
          </Text>

          {/* Cost Summary Box */}
          <View style={[styles.costSummaryBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Page Calculation</Text>
              <Text style={[styles.summaryVal, { color: colors.text }]}>
                {pages} page(s) × {copies} copy × ₹{activeFormatObj.pricePerUnit.toFixed(2)}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Base Document Subtotal</Text>
              <Text style={[styles.summaryVal, { color: colors.text }]}>₹{rawCost.toFixed(2)}</Text>
            </View>

            {isFloorApplied && (
              <View style={[styles.summaryRow, { marginTop: 4 }]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Feather name="shield" size={12} color={colors.primary} />
                  <Text style={[styles.summaryLabel, { color: colors.primary, fontWeight: "600" }]}>
                    Campus Minimum Order Floor
                  </Text>
                </View>
                <Text style={[styles.summaryVal, { color: colors.primary }]}>
                  +₹{minFloorAdjustment.toFixed(2)}
                </Text>
              </View>
            )}

            <View style={[styles.summaryRow, { marginTop: 6, paddingTop: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
              <Text style={[styles.totalLabel, { color: colors.text }]}>Total Payable</Text>
              <Text style={[styles.totalPrice, { color: colors.primary }]}>₹{finalCost}</Text>
            </View>
          </View>

          {isFloorApplied && (
            <Text style={[styles.floorNotice, { color: colors.textMuted }]}>
              ℹ️ A ₹5.00 minimum campus order threshold applies to all print requests to support hostel delivery courier expenses.
            </Text>
          )}

          {/* Proceed to Checkout Button */}
          <Button
            title={
              !selectedFile
                ? "Upload a PDF to Proceed"
                : `Proceed to Checkout • ₹${finalCost}`
            }
            variant="default"
            size="md"
            onPress={handleOpenCheckoutModal}
            disabled={!selectedFile}
            style={{ marginTop: 8 }}
            leftIcon={<Feather name="shopping-bag" size={15} color={colors.primaryForeground} />}
          />
        </Card>

        {/* 6. Active Print Orders & Tracking */}
        <View style={styles.ordersHeader}>
          <Text style={[styles.ordersTitle, { color: colors.text }]}>Your Print Station Orders</Text>
          
          <TouchableOpacity
            onPress={() => fetchOrders(true)}
            style={[styles.refreshBtnWrap, { backgroundColor: colors.secondary, borderColor: colors.border }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <Feather name="refresh-cw" size={13} color={colors.primary} />
            </Animated.View>
            <Text style={[styles.refreshBtnText, { color: colors.primary }]}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {recentOrders.length === 0 ? (
          <Card style={styles.emptyOrdersCard}>
            <Feather name="printer" size={32} color={colors.textMuted} />
            <Text style={[styles.emptyOrdersText, { color: colors.textMuted }]}>
              No active print jobs found. Upload a document above to place your first order!
            </Text>
          </Card>
        ) : (
          recentOrders.map((order) => {
            const isIssue = order.status === "ISSUE_REPORTED";
            return (
              <Card key={order.id} style={styles.orderCard}>
                <View style={styles.orderCardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.orderFileName, { color: colors.text }]} numberOfLines={1}>
                      {order.fileName || "Document.pdf"}
                    </Text>
                    <Text style={[styles.orderMeta, { color: colors.textMuted }]}>
                      {order.pageCount} pg(s) • {order.copies} copy • {new Date(order.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <Badge variant={isIssue ? "warning" : "primary"} size="sm">
                    {order.status}
                  </Badge>
                </View>

                {/* Status Tracker Stepper */}
                <View style={{ marginVertical: 8 }}>
                  <PrintOrderTracker status={order.status} issueNote={order.issueReason} />
                </View>

                {/* Observable Issue Alert if reported */}
                {isIssue && (
                  <View style={[styles.issueAlertBox, { backgroundColor: colors.warning + "18", borderColor: colors.warning + "40" }]}>
                    <Feather name="alert-triangle" size={14} color={colors.warning} />
                    <Text style={[styles.issueAlertText, { color: colors.warning }]}>
                      Issue Under Review: {order.issueReason || "Discrepancy reported"}
                    </Text>
                  </View>
                )}

                {/* Order Actions */}
                <View style={[styles.orderFooter, { borderTopColor: colors.border }]}>
                  <TouchableOpacity
                    style={styles.chatBotLink}
                    onPress={() => navigation?.navigate("Messages")}
                  >
                    <Feather name="message-square" size={12} color={colors.primary} />
                    <Text style={[styles.chatBotText, { color: colors.primary }]}>
                      Order Chat Updates
                    </Text>
                  </TouchableOpacity>

                  {!isIssue && order.status !== "DELIVERED" && (
                    <Button
                      title="Report Problem"
                      variant="outline"
                      size="sm"
                      onPress={() => {
                        setReportingOrder(order);
                        setIssueReason("");
                      }}
                    />
                  )}
                </View>
              </Card>
            );
          })
        )}

        {/* 7. Dedicated Full Unified Checkout Modal */}
        <UnifiedCheckoutModal
          visible={isCheckoutModalOpen}
          onClose={() => setIsCheckoutModalOpen(false)}
          title="Print Order Checkout"
          subtitle="Review document specifications & complete payment"
          amountRupees={Number(finalCost)}
          amountPaise={finalCostPaise}
          itemTitle={selectedFile?.name || "Document Print Job"}
          itemDetails={[
            { label: "Pages", value: `${selectedFile?.pages || 1} pages` },
            { label: "Copies", value: `${copies}x` },
            { label: "Format", value: activeFormatObj?.name || "Standard" },
            { label: "Delivery Slot", value: deliveryWindow ? deliveryWindow.split(" (")[0] + " Slot" : "Standard" },
            { label: "Drop Location", value: deliveryLocation || "Campus" },
          ]}
          floorAdjustmentRupees={minFloorAdjustment}
          allowWalletPayment={true}
          cashbackPercentage={2}
          upiId={upiId}
          upiTransactionNote={`Print_${selectedFile?.name?.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10) || "doc"}`}
          onOpenTopup={() => setIsWalletModalOpen(true)}
          onPayWithWallet={handlePayWithWallet}
          onPayWithUpi={handlePayWithUpi}
          isSubmitting={isSubmitting}
          cooldownSeconds={cooldownSeconds}
        />

        {/* E-Wallet Recharge Modal */}
        <WalletRechargeModal
          visible={isWalletModalOpen}
          onClose={() => {
            setIsWalletModalOpen(false);
            fetchWalletBalance();
          }}
          onSuccess={() => {
            fetchWalletBalance();
          }}
        />

        {/* 8. Report Problem Modal */}
        <Modal
          visible={!!reportingOrder}
          transparent
          animationType="slide"
          onRequestClose={() => setReportingOrder(null)}
        >
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <TouchableOpacity
              style={styles.modalBackdropTouch}
              activeOpacity={1}
              onPress={() => setReportingOrder(null)}
            />
            <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Report Order Issue</Text>
                  <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                    Order #{reportingOrder?.id?.slice(-6).toUpperCase()}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setReportingOrder(null)}>
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
                  <Text style={[styles.formLabel, { color: colors.text }]}>Category</Text>
                  <View style={styles.categoryPillsWrap}>
                    {["Print Quality", "Wrong Pages", "Drop Location Issue", "Payment Error"].map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        onPress={() => setIssueCategory(cat)}
                        style={[
                          styles.catChip,
                          {
                            backgroundColor: issueCategory === cat ? colors.primary + "18" : colors.secondary,
                            borderColor: issueCategory === cat ? colors.primary : colors.border,
                          },
                        ]}
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
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>Detailed Explanation *</Text>
                  <TextInput
                    style={[
                      styles.issueTextarea,
                      { color: colors.text, borderColor: colors.border, backgroundColor: colors.secondary + "40" },
                    ]}
                    placeholder="Explain the problem with pages, faded print, or location..."
                    placeholderTextColor={colors.textMuted}
                    value={issueReason}
                    onChangeText={setIssueReason}
                    multiline
                    numberOfLines={4}
                  />
                </View>

                <View style={styles.modalFooter}>
                  <Button
                    title="Cancel"
                    variant="outline"
                    size="sm"
                    onPress={() => setReportingOrder(null)}
                  />
                  <Button
                    title={isSubmittingIssue ? "Submitting..." : "Submit Report"}
                    variant="default"
                    size="sm"
                    onPress={handleReportIssue}
                    disabled={isSubmittingIssue}
                  />
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </ScrollView>
    </ClientServiceGuard>
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
  headerCard: {
    padding: 16,
    gap: 6,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 12,
    lineHeight: 18,
  },
  ratePillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  sectionCard: {
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  uploadDropzone: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 14,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  uploadIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  uploadPrompt: {
    fontSize: 14,
    fontWeight: "700",
  },
  uploadHint: {
    fontSize: 11,
  },
  pickedFileBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  pickedFileTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickedFileLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  pdfIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  fileName: {
    fontSize: 13,
    fontWeight: "700",
  },
  fileMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  removeFileBtn: {
    padding: 4,
  },
  pageStepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  pageStepperLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  pageStepperHint: {
    fontSize: 10,
    marginTop: 1,
  },
  pageCounterWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  formatGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  formatTile: {
    width: "48%",
    flexGrow: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  formatTileTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  radioCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  formatRate: {
    fontSize: 12,
    fontWeight: "800",
  },
  formatName: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  formatDesc: {
    fontSize: 10,
    lineHeight: 13,
  },
  copiesRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  copiesLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  counterWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  counterBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  counterValue: {
    fontSize: 15,
    fontWeight: "800",
  },
  quickLocations: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  locationChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  locationChipText: {
    fontSize: 11,
  },
  subLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  slotRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },
  slotTile: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  slotText: {
    fontSize: 11,
    flex: 1,
  },
  phoneInputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  costSummaryBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryLabel: {
    fontSize: 12,
  },
  summaryVal: {
    fontSize: 12,
    fontWeight: "600",
  },
  floorNotice: {
    fontSize: 11,
    lineHeight: 16,
    fontStyle: "italic",
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: "800",
  },
  totalPrice: {
    fontSize: 18,
    fontWeight: "900",
  },
  upiBox: {
    marginTop: 10,
    gap: 6,
  },
  upiHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  upiTitle: {
    fontSize: 12,
    fontWeight: "700",
  },
  upiIdRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  upiIdText: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  copyText: {
    fontSize: 11,
    fontWeight: "700",
  },
  ordersHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  ordersTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  refreshBtnWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  refreshBtnText: {
    fontSize: 11,
    fontWeight: "700",
  },
  emptyOrdersCard: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyOrdersText: {
    fontSize: 12,
    textAlign: "center",
  },
  orderCard: {
    padding: 14,
    gap: 8,
  },
  orderCardTop: {
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
  issueAlertBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  issueAlertText: {
    fontSize: 11,
    fontWeight: "600",
    flex: 1,
  },
  orderFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  chatBotLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  chatBotText: {
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
  modalScroll: {
    flexGrow: 0,
  },
  modalScrollContent: {
    paddingBottom: 28,
  },
  checkoutModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    padding: 20,
    paddingBottom: 24,
    maxHeight: "88%",
    gap: 12,
  },
  checkoutSummaryCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  checkoutItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkoutItemLabel: {
    fontSize: 13,
    fontWeight: "700",
    flex: 1,
  },
  checkoutDetailGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 6,
  },
  detailCol: {
    gap: 2,
  },
  detailKey: {
    fontSize: 10,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  detailVal: {
    fontSize: 12,
    fontWeight: "700",
  },
  checkoutDropRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  checkoutDropText: {
    fontSize: 11,
  },
  modalPricingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  modalBaseCost: {
    fontSize: 11,
  },
  modalTotalDue: {
    fontSize: 16,
    fontWeight: "900",
  },
  checkoutUpiSection: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  utrHint: {
    fontSize: 10,
    marginTop: 1,
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    padding: 20,
    paddingBottom: 24,
    maxHeight: "88%",
    gap: 12,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
  modalSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  formGroup: {
    gap: 6,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  categoryPillsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
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
  issueTextarea: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
    minHeight: 80,
    textAlignVertical: "top",
  },
  pasteChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  pasteChipText: {
    fontSize: 11,
    fontWeight: "700",
  },
  stepsCard: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
    marginTop: 8,
  },
  stepItem: {
    fontSize: 11,
    lineHeight: 16,
  },
  modalFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 10,
  },
});
