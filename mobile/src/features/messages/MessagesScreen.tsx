import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  RefreshControl,
  Alert,
  Keyboard,
  BackHandler,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeContext";
import { useUser } from "../../context/UserContext";
import { apiClient } from "../../services/apiClient";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { useDebounce } from "../../hooks/useDebounce";
import {
  joinMobileSocketConversation,
  leaveMobileSocketConversation,
  broadcastMobileSocketMessage,
  onMobileSocketMessage,
} from "../../services/socketClient";

export interface ConversationItem {
  id: string;
  isAnonymousChat: boolean;
  myBlindId?: string;
  otherParticipant: any;
  messages: any[];
  updatedAt: string;
  createdAt: string;
}

const STORAGE_KEY_CONVERSATIONS = "@otium_cached_conversations";

export function MessagesScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { user } = useUser();

  const [activeTab, setActiveTab] = useState<"direct" | "whisper">(
    route?.params?.initialTab === "whisper" ? "whisper" : "direct"
  );
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // New Classmate Chat Modal
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 350);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [isStartingChat, setIsStartingChat] = useState(false);

  // Active chat thread state (rendered IN-PLACE full-screen, NOT inside a modal)
  const [activeConv, setActiveConv] = useState<ConversationItem | null>(null);
  const [threadMessages, setThreadMessages] = useState<any[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [isSyncingLive, setIsSyncingLive] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [convFilter, setConvFilter] = useState("");
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  // Keyboard state listener
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setIsKeyboardOpen(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setIsKeyboardOpen(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Hardware back button handler for Android
  useEffect(() => {
    const onBackPress = () => {
      if (activeConv) {
        closeChat();
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, [activeConv]);

  // Debounced search for classmates by name or @username (zero emails)
  useEffect(() => {
    if (!debouncedSearchQuery.trim()) {
      setSearchResults([]);
      setIsSearchingUsers(false);
      return;
    }

    let isCancelled = false;
    setIsSearchingUsers(true);

    const performSearch = async () => {
      try {
        const userParam = user?.id ? `&userId=${encodeURIComponent(user.id)}` : "";
        const collegeParam = user?.collegeId ? `&collegeId=${encodeURIComponent(user.collegeId)}` : "";
        const res = await apiClient.get(
          `/users?search=${encodeURIComponent(debouncedSearchQuery.trim())}${userParam}${collegeParam}`
        );
        if (!isCancelled) {
          if (res.success && Array.isArray(res.data)) {
            setSearchResults(res.data.filter((u: any) => u.id !== user?.id));
          } else {
            setSearchResults([]);
          }
        }
      } catch {
        if (!isCancelled) setSearchResults([]);
      } finally {
        if (!isCancelled) setIsSearchingUsers(false);
      }
    };

    performSearch();

    return () => {
      isCancelled = true;
    };
  }, [debouncedSearchQuery, user?.id, user?.collegeId]);

  const handleStartClassmateChat = async (classmate: any) => {
    setIsStartingChat(true);
    try {
      const res = await apiClient.post("/chat", {
        participantTwoId: classmate.id,
        isAnonymousChat: false,
      });

      if (res.success && res.data) {
        setIsNewChatOpen(false);
        setSearchQuery("");
        setSearchResults([]);
        await fetchConversations();
        openChat(res.data);
      } else {
        Alert.alert("Chat Error", res.error || "Failed to start conversation.");
      }
    } catch (err: any) {
      Alert.alert("Chat Error", err.message || "Failed to start conversation.");
    } finally {
      setIsStartingChat(false);
    }
  };

  const fetchConversations = async (isPull = false) => {
    if (isPull) setRefreshing(true);

    // 1. Immediate cache restore
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEY_CONVERSATIONS);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setConversations(parsed);
        }
      }
    } catch {}

    // 2. Fresh fetch
    try {
      const res = await apiClient.get("/chat");
      if (res.success && Array.isArray(res.data)) {
        setConversations(res.data);
        AsyncStorage.setItem(STORAGE_KEY_CONVERSATIONS, JSON.stringify(res.data)).catch(() => {});
      }
    } catch {
      console.log("[Fetch Conversations Note]: Operating in offline cached mode");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(() => fetchConversations(false), 12000);
    return () => clearInterval(interval);
  }, [user?.id]);

  // Refresh conversation inbox whenever Messages screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchConversations(false);
    }, [user?.id])
  );

  useEffect(() => {
    if (route?.params?.initialTab) {
      setActiveTab(route.params.initialTab === "whisper" ? "whisper" : "direct");
    }
  }, [route?.params?.initialTab]);

  // Auto-open conversation passed from route params (e.g. from WhisperWall or PrintStation)
  useEffect(() => {
    if (route?.params?.conversationId) {
      const convId = route.params.conversationId;
      const isWhisper = route?.params?.initialTab === "whisper";
      if (isWhisper) {
        setActiveTab("whisper");
      } else if (route?.params?.initialTab === "direct") {
        setActiveTab("direct");
      }

      const found = conversations.find((c) => c.id === convId);
      if (found) {
        openChat(found);
      } else {
        // Instant stub open: 0ms delay, never blocks user on connecting spinner
        const stub: ConversationItem = {
          id: convId,
          isAnonymousChat: isWhisper,
          otherParticipant: {
            id: "peer",
            name: isWhisper ? "Anonymous Peer" : "Campus Classmate",
            incognitoProfile: {
              handle: "Anonymous Peer",
              avatarUrl: `https://api.dicebear.com/9.x/bottts/png?seed=${encodeURIComponent(convId)}&size=80`,
            },
          },
          messages: [],
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };
        openChat(stub);
        fetchConversations();
      }

      // Clear params so closing chat or background poll intervals don't re-open it
      navigation?.setParams({ conversationId: undefined, initialTab: undefined });
    }
  }, [route?.params?.conversationId]);

  // Helper to persist thread messages to local storage
  const saveThreadLocally = (convId: string, msgs: any[]) => {
    AsyncStorage.setItem(`@otium_thread_${convId}`, JSON.stringify(msgs)).catch(() => {});
  };

  // Open chat: enter room, load local cache immediately with 0ms lag, sync fresh messages in background
  const openChat = async (conv: ConversationItem) => {
    setActiveConv(conv);
    setIsSyncingLive(true);
    setHasMoreMessages(true);
    setLoadingThread(false); // NEVER BLOCK THE SCREEN!

    const threadCacheKey = `@otium_thread_${conv.id}`;
    let loaded: any[] = [];

    // 1. Instant local render: check conversation object's messages or AsyncStorage
    if (Array.isArray(conv.messages) && conv.messages.length > 0) {
      loaded = conv.messages;
    }

    try {
      const cached = await AsyncStorage.getItem(threadCacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          loaded = parsed;
        }
      }
    } catch {}

    setThreadMessages(loaded);

    // 2. Mark this conversation as read locally immediately
    try {
      const readRaw = await AsyncStorage.getItem("@otium_read_whispers");
      const readMap = readRaw ? JSON.parse(readRaw) : {};
      readMap[conv.id] = Date.now();
      await AsyncStorage.setItem("@otium_read_whispers", JSON.stringify(readMap));
    } catch {}

    // 3. Connect to WebSockets room
    joinMobileSocketConversation(conv.id);

    // 4. Background fetch latest messages (non-blocking, merges seamlessly)
    apiClient
      .get(`/chat/${conv.id}/messages?limit=25`)
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setThreadMessages((prev) => {
            const pending = prev.filter((m) => m.status === "sending" || m.status === "failed");
            const fresh = res.data;
            const merged = [...pending, ...fresh];
            saveThreadLocally(conv.id, merged);
            return merged;
          });
          setHasMoreMessages(res.data.length >= 25);
        }
      })
      .catch((err) => {
        console.log("[Background Messages Sync Note]:", err?.message);
      })
      .finally(() => {
        setIsSyncingLive(false);
      });
  };

  const closeChat = () => {
    if (activeConv) {
      leaveMobileSocketConversation(activeConv.id);
    }
    setActiveConv(null);
    setThreadMessages([]);
    setInputMessage("");
    setIsSyncingLive(false);
  };

  // Dynamically hide bottom tab bar when inside an active conversation
  useEffect(() => {
    const tabStyle = activeConv ? { display: "none" as const } : undefined;
    navigation.setOptions({ tabBarStyle: tabStyle });
    navigation.getParent()?.setOptions({ tabBarStyle: tabStyle });
    return () => {
      navigation.setOptions({ tabBarStyle: undefined });
      navigation.getParent()?.setOptions({ tabBarStyle: undefined });
    };
  }, [activeConv, navigation]);

  // Handle hardware back press on Android to cleanly exit active chat
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (activeConv) {
        closeChat();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [activeConv]);

  // Realtime WebSockets listener + Delta Sync fallback
  useEffect(() => {
    if (!activeConv) return;

    // 1. Socket message listener
    const unsubscribeSocket = onMobileSocketMessage((data: any) => {
      if (data?.conversationId === activeConv.id && data?.message) {
        const incoming = data.message;
        setThreadMessages((prev) => {
          if (prev.some((m) => m.id === incoming.id)) return prev;
          const isMine = incoming.senderId === user?.id;
          const updated = [{ ...incoming, isMine }, ...prev];
          saveThreadLocally(activeConv.id, updated);
          return updated;
        });
      }
    });

    // 2. Periodic delta sync polling (every 2.5s) to catch any offline or dropped packets
    const deltaInterval = setInterval(async () => {
      if (threadMessages.length === 0) return;
      const latestMessage = threadMessages[0];
      if (!latestMessage?.createdAt) return;

      try {
        const res = await apiClient.get(
          `/chat/${activeConv.id}/messages?after=${encodeURIComponent(latestMessage.createdAt)}`
        );
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          setThreadMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const fresh = res.data.filter((m: any) => !existingIds.has(m.id));
            if (fresh.length === 0) return prev;
            // Fresh items are ordered asc by after filter, reverse so newest is first
            const updated = [...fresh.reverse(), ...prev];
            saveThreadLocally(activeConv.id, updated);
            return updated;
          });
        }
      } catch {}
    }, 2500);

    return () => {
      unsubscribeSocket();
      clearInterval(deltaInterval);
    };
  }, [activeConv?.id, threadMessages]);

  // Load older messages (cursor pagination on inverted scroll-up)
  const loadOlderMessages = async () => {
    if (loadingOlder || !hasMoreMessages || threadMessages.length === 0 || !activeConv) return;

    const oldestMsg = threadMessages[threadMessages.length - 1];
    if (!oldestMsg?.id) return;

    setLoadingOlder(true);
    try {
      const res = await apiClient.get(
        `/chat/${activeConv.id}/messages?cursor=${encodeURIComponent(oldestMsg.id)}&limit=25`
      );
      if (res.success && Array.isArray(res.data)) {
        if (res.data.length < 25) {
          setHasMoreMessages(false);
        }
        setThreadMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const fresh = res.data.filter((m: any) => !existingIds.has(m.id));
          const updated = [...prev, ...fresh];
          saveThreadLocally(activeConv.id, updated);
          return updated;
        });
      } else {
        setHasMoreMessages(false);
      }
    } catch {
      // quiet fail
    } finally {
      setLoadingOlder(false);
    }
  };

  const handleSendMessage = (textOverride?: string) => {
    const rawText = typeof textOverride === "string" ? textOverride : inputMessage;
    if (!activeConv || !rawText.trim()) return;

    const content = rawText.trim();
    setInputMessage("");

    // WhatsApp/Instagram style optimistic instant bubble at index 0 (top of inverted list)
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const optimistic = {
      id: tempId,
      conversationId: activeConv.id,
      content,
      isMine: true,
      senderId: user?.id,
      createdAt: new Date().toISOString(),
      status: "sending",
    };

    setThreadMessages((prev) => {
      const updated = [optimistic, ...prev];
      saveThreadLocally(activeConv.id, updated);
      return updated;
    });

    // Broadcast through socket
    broadcastMobileSocketMessage({
      conversationId: activeConv.id,
      message: optimistic,
    });

    // Update conversation list preview optimistically
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConv.id
          ? {
              ...c,
              messages: [optimistic],
              updatedAt: new Date().toISOString(),
            }
          : c
      )
    );

    // Asynchronous background dispatch - NO LOCKING isSending flag!
    apiClient
      .post(`/chat/${activeConv.id}/messages`, { content })
      .then((res) => {
        if (res.success && res.data) {
          setThreadMessages((prev) => {
            const updated = prev.map((m) =>
              m.id === tempId ? { ...res.data, isMine: true, status: "sent" } : m
            );
            saveThreadLocally(activeConv.id, updated);
            return updated;
          });
        } else {
          setThreadMessages((prev) => {
            const updated = prev.map((m) =>
              m.id === tempId ? { ...m, status: "failed" } : m
            );
            saveThreadLocally(activeConv.id, updated);
            return updated;
          });
        }
      })
      .catch((err) => {
        console.error("[Send Message Error]:", err);
        setThreadMessages((prev) => {
          const updated = prev.map((m) =>
            m.id === tempId ? { ...m, status: "failed" } : m
          );
          saveThreadLocally(activeConv.id, updated);
          return updated;
        });
      });
  };

  const filteredConversations = conversations.filter((c) => {
    const tabMatch = activeTab === "whisper" ? c.isAnonymousChat : !c.isAnonymousChat;
    if (!tabMatch) return false;
    if (!convFilter.trim()) return true;
    const q = convFilter.toLowerCase();
    const otherName = (c.otherParticipant?.name || "").toLowerCase();
    const otherUser = (c.otherParticipant?.username || "").toLowerCase();
    const otherHandle = (c.otherParticipant?.incognitoProfile?.handle || "").toLowerCase();
    const lastMsg = (c.messages?.[0]?.content || "").toLowerCase();
    return (
      otherName.includes(q) ||
      otherUser.includes(q) ||
      otherHandle.includes(q) ||
      lastMsg.includes(q)
    );
  });

  const isPrintStationThread =
    activeConv &&
    !activeConv.isAnonymousChat &&
    (activeConv.otherParticipant?.name === "Express Print Station" ||
      activeConv.otherParticipant?.username === "express_print" ||
      activeConv.otherParticipant?.email === "printing@otiumhub.in");

  // ==========================================
  // IN-PLACE FULL-SCREEN ACTIVE CHAT VIEW
  // (Replaces old Modal: allows Android adjustResize to naturally lift the input field)
  // ==========================================
  if (activeConv) {
    const participantTitle = activeConv.isAnonymousChat
      ? activeConv.otherParticipant?.incognitoProfile?.handle || "Anonymous Whisper"
      : isPrintStationThread
      ? "Express Print Station"
      : activeConv.otherParticipant?.name || "Campus Student";

    const participantHandle = activeConv.isAnonymousChat
      ? "100% Secret • Zero-Knowledge Blind ID"
      : isPrintStationThread
      ? "Campus Automated Order Updates"
      : activeConv.otherParticipant?.username
      ? `@${activeConv.otherParticipant.username}`
      : "Campus Peer Chat";

    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
        >
          {/* Chat Header */}
        <View style={[styles.chatHeader, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
          <TouchableOpacity
            onPress={closeChat}
            style={styles.chatBackBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.chatHeaderInfo}>
            <Text style={[styles.chatHeaderName, { color: colors.text }]} numberOfLines={1}>
              {participantTitle}
            </Text>
            <Text style={[styles.chatHeaderSub, { color: colors.textMuted }]} numberOfLines={1}>
              {isSyncingLive ? "Syncing live..." : participantHandle}
            </Text>
          </View>

          {isPrintStationThread && (
            <Badge variant="success" size="sm">
              Official
            </Badge>
          )}
        </View>

        {/* Print Station Delivery Notice */}
        {isPrintStationThread && (
          <View
            style={[
              styles.oneWayNoticeBox,
              { backgroundColor: colors.primary + "12", borderColor: colors.primary + "25" },
            ]}
          >
            <Feather name="info" size={13} color={colors.primary} />
            <Text style={[styles.oneWayNoticeText, { color: colors.text }]}>
              This is a transactional update feed for your print orders and delivery dispatches.
            </Text>
          </View>
        )}

        {/* WhatsApp & Instagram Inverted Messages Feed (Never blocks UI) */}
        <FlatList
          ref={flatListRef}
          data={threadMessages}
          inverted={true}
          keyExtractor={(item) => item.id}
          style={styles.threadList}
          contentContainerStyle={styles.threadContentInverted}
          keyboardShouldPersistTaps="handled"
          onEndReached={loadOlderMessages}
          onEndReachedThreshold={0.2}
          ListEmptyComponent={
            <View style={styles.emptyThreadWrap}>
              <Ionicons
                name={activeConv.isAnonymousChat ? "eye-off-outline" : "chatbubble-ellipses-outline"}
                size={40}
                color={colors.textMuted}
              />
              <Text style={[styles.emptyThreadTitle, { color: colors.text }]}>
                {activeConv.isAnonymousChat ? "Anonymous Whisper DM" : "Classmate Message"}
              </Text>
              <Text style={[styles.emptyThreadText, { color: colors.textMuted }]}>
                {activeConv.isAnonymousChat
                  ? "Identity protected with cryptographic blind IDs. Say hello anonymously!"
                  : "No messages yet. Send a message to start chatting!"}
              </Text>
            </View>
          }
          ListFooterComponent={
            loadingOlder ? (
              <View style={{ paddingVertical: 12, alignItems: "center" }}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const isMine = item.isMine;
            const otherRepliedLater = threadMessages.some(
              (m) => !m.isMine && new Date(m.createdAt).getTime() >= new Date(item.createdAt).getTime()
            );
            const isSeen = item.status === "seen" || otherRepliedLater;

            return (
              <View
                style={[
                  styles.messageRow,
                  isMine ? styles.messageRowMine : styles.messageRowOther,
                ]}
              >
                <View
                  style={[
                    styles.messageBubble,
                    isMine
                      ? [styles.bubbleMine, { backgroundColor: colors.primary }]
                      : [styles.bubbleOther, { backgroundColor: colors.card, borderColor: colors.border }],
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      { color: isMine ? colors.primaryForeground : colors.text },
                    ]}
                  >
                    {item.content}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", alignSelf: "flex-end", marginTop: 3, gap: 4 }}>
                    <Text
                      style={[
                        styles.timestampText,
                        {
                          color: isMine
                            ? "rgba(255, 255, 255, 0.75)"
                            : colors.textMuted,
                          marginTop: 0,
                        },
                      ]}
                    >
                      {new Date(item.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                    {isMine && (
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        {item.status === "sending" ? (
                          <Text style={{ fontSize: 10, color: "rgba(255, 255, 255, 0.7)" }}>⏱</Text>
                        ) : item.status === "failed" ? (
                          <Text style={{ fontSize: 10, color: "#f87171", fontWeight: "700" }}>!</Text>
                        ) : isSeen ? (
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                            <Text style={{ fontSize: 10, color: "#7dd3fc", fontWeight: "700" }}>Seen</Text>
                            <Ionicons name="checkmark-done" size={13} color="#7dd3fc" />
                          </View>
                        ) : item.status === "delivered" ? (
                          <Ionicons name="checkmark-done" size={12} color="rgba(255, 255, 255, 0.85)" />
                        ) : (
                          <Ionicons name="checkmark" size={12} color="rgba(255, 255, 255, 0.85)" />
                        )}
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          }}
        />

        {/* Modern WhatsApp/Insta Style Input Bar */}
        <View
          style={[
            styles.inputBar,
            {
              backgroundColor: colors.card,
              borderTopColor: colors.border,
              paddingBottom: isKeyboardOpen
                ? (Platform.OS === "ios" ? 8 : 6)
                : Math.max(insets.bottom, 10),
            },
          ]}
        >
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: colors.secondary,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            placeholder={
              activeConv?.isAnonymousChat
                ? "Send anonymous whisper..."
                : isPrintStationThread
                ? "Inquire about this order..."
                : "Message classmate..."
            }
            placeholderTextColor={colors.textMuted}
            value={inputMessage}
            onChangeText={setInputMessage}
            multiline={false}
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={(e) => {
              const val = e.nativeEvent?.text || inputMessage;
              handleSendMessage(val);
            }}
            autoCorrect={false}
          />

          <TouchableOpacity
            style={[
              styles.sendBtn,
              {
                backgroundColor: inputMessage.trim() ? colors.primary : colors.secondary,
              },
            ]}
            onPress={() => handleSendMessage()}
            disabled={!inputMessage.trim()}
            activeOpacity={0.8}
          >
            <Ionicons
              name="arrow-up"
              size={18}
              color={
                inputMessage.trim() ? colors.primaryForeground : colors.textMuted
              }
            />
          </TouchableOpacity>
        </View>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // ==========================================
  // CONVERSATIONS LIST VIEW
  // ==========================================
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity
          onPress={() => navigation?.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Messages</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <TouchableOpacity
            onPress={() => setIsNewChatOpen(true)}
            style={[styles.newMsgBtn, { backgroundColor: colors.primary }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="edit-3" size={15} color={colors.primaryForeground} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => fetchConversations(true)}
            style={styles.refreshBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="refresh-cw" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Dual Inbox Tab Switcher */}
      <View style={[styles.tabsContainer, { backgroundColor: colors.secondary }]}>
        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === "direct" && [
              styles.tabItemActive,
              { backgroundColor: colors.card, shadowColor: colors.primary },
            ],
          ]}
          onPress={() => setActiveTab("direct")}
        >
          <Feather
            name="message-circle"
            size={14}
            color={activeTab === "direct" ? colors.primary : colors.textMuted}
          />
          <Text
            style={[
              styles.tabText,
              {
                color: activeTab === "direct" ? colors.text : colors.textMuted,
                fontWeight: activeTab === "direct" ? "700" : "500",
              },
            ]}
          >
            Direct & Print Updates
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === "whisper" && [
              styles.tabItemActive,
              { backgroundColor: colors.card, shadowColor: colors.primary },
            ],
          ]}
          onPress={() => setActiveTab("whisper")}
        >
          <Ionicons
            name="eye-off-outline"
            size={14}
            color={activeTab === "whisper" ? colors.primary : colors.textMuted}
          />
          <Text
            style={[
              styles.tabText,
              {
                color: activeTab === "whisper" ? colors.text : colors.textMuted,
                fontWeight: activeTab === "whisper" ? "700" : "500",
              },
            ]}
          >
            Whisper DMs
          </Text>
        </TouchableOpacity>
      </View>

      {/* In-Window Conversations Search Filter */}
      <View
        style={[
          styles.convSearchBar,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <Feather name="search" size={14} color={colors.textMuted} />
        <TextInput
          style={[styles.convSearchInput, { color: colors.text }]}
          placeholder={
            activeTab === "whisper"
              ? "Filter anonymous whispers..."
              : "Filter chats or classmates..."
          }
          placeholderTextColor={colors.textMuted}
          value={convFilter}
          onChangeText={setConvFilter}
          autoCorrect={false}
        />
        {convFilter.length > 0 && (
          <TouchableOpacity
            onPress={() => setConvFilter("")}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Conversation Feed */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Loading conversations...
          </Text>
        </View>
      ) : filteredConversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name={activeTab === "whisper" ? "eye-off-outline" : "chatbubble-ellipses-outline"}
            size={48}
            color={colors.textMuted}
          />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {activeTab === "whisper" ? "No Whisper DMs Yet" : "No Direct Messages"}
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
            {activeTab === "whisper"
              ? "When you or someone responds to a Whisper Wall post via DM, the secret thread will appear here."
              : "Direct student chats and Express Print Station delivery updates will appear here."}
          </Text>
          {activeTab === "direct" && (
            <Button
              title="Message a Classmate"
              variant="default"
              size="sm"
              onPress={() => setIsNewChatOpen(true)}
              leftIcon={<Feather name="plus" size={14} color={colors.primaryForeground} />}
              style={{ marginTop: 12 }}
            />
          )}
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchConversations(true)}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isPrintBot =
              !item.isAnonymousChat &&
              (item.otherParticipant?.name === "Express Print Station" ||
                item.otherParticipant?.username === "express_print" ||
                item.otherParticipant?.email === "printing@otiumhub.in");

            const participantTitle = item.isAnonymousChat
              ? item.otherParticipant?.incognitoProfile?.handle || "Anonymous Whisper"
              : isPrintBot
              ? "Express Print Station"
              : item.otherParticipant?.name || "Campus Student";

            const handleSubtitle = item.isAnonymousChat
              ? "Anonymous Thread"
              : isPrintBot
              ? "Automated Print Bot"
              : item.otherParticipant?.username
              ? `@${item.otherParticipant.username}`
              : item.otherParticipant?.department || "Student";

            const lastMsg =
              item.messages && item.messages.length > 0
                ? item.messages[item.messages.length - 1].content
                : "Conversation initialized";

            return (
              <TouchableOpacity
                style={[
                  styles.convCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => openChat(item)}
              >
                <View
                  style={[
                    styles.avatarBox,
                    {
                      backgroundColor: isPrintBot
                        ? colors.primary + "20"
                        : item.isAnonymousChat
                        ? colors.secondary
                        : colors.primary + "15",
                    },
                  ]}
                >
                  {isPrintBot ? (
                    <Feather name="printer" size={18} color={colors.primary} />
                  ) : item.isAnonymousChat ? (
                    <Ionicons name="eye-off" size={18} color={colors.textMuted} />
                  ) : (
                    <Text style={[styles.avatarInitial, { color: colors.primary }]}>
                      {participantTitle.charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>

                <View style={styles.convDetails}>
                  <View style={styles.convTitleRow}>
                    <Text
                      style={[
                        styles.participantName,
                        { color: colors.text, fontWeight: "700" },
                      ]}
                      numberOfLines={1}
                    >
                      {participantTitle}
                    </Text>
                    <Text style={[styles.convTime, { color: colors.textMuted }]}>
                      {item.updatedAt
                        ? new Date(item.updatedAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""}
                    </Text>
                  </View>

                  <Text
                    style={[styles.handleSubText, { color: colors.primary }]}
                    numberOfLines={1}
                  >
                    {handleSubtitle}
                  </Text>

                  <Text
                    style={[styles.lastMsgText, { color: colors.textMuted }]}
                    numberOfLines={1}
                  >
                    {lastMsg}
                  </Text>
                </View>

                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Classmate Search & New Chat Modal with KeyboardAvoidingView */}
      <Modal
        visible={isNewChatOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsNewChatOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TouchableOpacity
            style={styles.modalBackdropTouch}
            activeOpacity={1}
            onPress={() => setIsNewChatOpen(false)}
          />
          <View style={[styles.newChatModalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>New Direct Message</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                  Find classmates by name or @username
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsNewChatOpen(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={[styles.searchBar, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Feather name="search" size={16} color={colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search by name or @username..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {isSearchingUsers ? (
              <View style={styles.searchLoading}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.searchLoadingText, { color: colors.textMuted }]}>
                  Searching campus directory...
                </Text>
              </View>
            ) : searchResults.length > 0 ? (
              <FlatList
                data={searchResults}
                keyExtractor={(item) => item.id}
                style={{ maxHeight: 320 }}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.classmateRow, { borderBottomColor: colors.border }]}
                    onPress={() => handleStartClassmateChat(item)}
                    disabled={isStartingChat}
                  >
                    <View style={[styles.classmateAvatar, { backgroundColor: colors.primary + "20" }]}>
                      <Text style={[styles.classmateAvatarText, { color: colors.primary }]}>
                        {item.name ? item.name.charAt(0).toUpperCase() : "U"}
                      </Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.classmateName, { color: colors.text }]}>{item.name}</Text>
                      <Text style={[styles.classmateUsername, { color: colors.primary }]}>
                        {item.username ? `@${item.username}` : item.department || "Classmate"}
                      </Text>
                      {item.college?.name && (
                        <Text style={[styles.classmateCollege, { color: colors.textMuted }]} numberOfLines={1}>
                          {item.college.name}
                        </Text>
                      )}
                    </View>
                    <Ionicons name="paper-plane-outline" size={18} color={colors.primary} />
                  </TouchableOpacity>
                )}
              />
            ) : searchQuery.trim().length > 0 ? (
              <View style={styles.noSearchResults}>
                <Text style={[styles.noSearchResultsText, { color: colors.textMuted }]}>
                  No students found matching "{searchQuery}"
                </Text>
              </View>
            ) : (
              <View style={styles.searchPrompt}>
                <Feather name="users" size={28} color={colors.textMuted} />
                <Text style={[styles.searchPromptText, { color: colors.textMuted }]}>
                  Type a classmate's name or @username to start chatting
                </Text>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
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
    paddingTop: Platform.OS === "ios" ? 14 : 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
  refreshBtn: {
    padding: 4,
  },
  tabsContainer: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
    padding: 4,
    borderRadius: 12,
  },
  convSearchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    height: 38,
    gap: 8,
  },
  convSearchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 9,
  },
  tabItemActive: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
    gap: 10,
  },
  convCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  avatarBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: "800",
  },
  convDetails: {
    flex: 1,
  },
  convTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  participantName: {
    fontSize: 13,
    fontWeight: "700",
    flexShrink: 1,
  },
  handleSubText: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 1,
  },
  convTime: {
    fontSize: 10,
  },
  lastMsgText: {
    fontSize: 12,
    marginTop: 3,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
  },
  emptyContainer: {
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
  emptySubtitle: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
  threadList: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 14 : 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  chatBackBtn: {
    padding: 4,
  },
  chatHeaderInfo: {
    flex: 1,
  },
  chatHeaderName: {
    fontSize: 15,
    fontWeight: "800",
  },
  chatHeaderSub: {
    fontSize: 11,
    marginTop: 1,
  },
  oneWayNoticeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  oneWayNoticeText: {
    fontSize: 11,
    flex: 1,
  },
  threadContentInverted: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  messageRow: {
    flexDirection: "row",
    marginVertical: 2,
  },
  messageRowMine: {
    justifyContent: "flex-end",
  },
  messageRowOther: {
    justifyContent: "flex-start",
  },
  messageBubble: {
    maxWidth: "80%",
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 14,
  },
  bubbleMine: {
    borderBottomRightRadius: 2,
  },
  bubbleOther: {
    borderWidth: 1,
    borderBottomLeftRadius: 2,
  },
  messageText: {
    fontSize: 13,
    lineHeight: 18,
  },
  timestampText: {
    fontSize: 9,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 10,
  },
  textInput: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    fontSize: 14,
    minHeight: 40,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  newMsgBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalBackdropTouch: {
    flex: 1,
  },
  newChatModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    padding: 20,
    paddingBottom: 28,
    maxHeight: "88%",
    gap: 12,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  searchLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    gap: 8,
  },
  searchLoadingText: {
    fontSize: 12,
  },
  classmateRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  classmateAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  classmateAvatarText: {
    fontSize: 16,
    fontWeight: "700",
  },
  classmateName: {
    fontSize: 14,
    fontWeight: "700",
  },
  classmateUsername: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 1,
  },
  classmateCollege: {
    fontSize: 11,
    marginTop: 2,
  },
  noSearchResults: {
    paddingVertical: 24,
    alignItems: "center",
  },
  noSearchResultsText: {
    fontSize: 12,
  },
  searchPrompt: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    gap: 8,
  },
  searchPromptText: {
    fontSize: 12,
  },
  emptyThreadWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 64,
    gap: 8,
    transform: [{ scaleY: -1 }], // Counteracts inverted FlatList orientation
  },
  emptyThreadTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 4,
  },
  emptyThreadText: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
});

