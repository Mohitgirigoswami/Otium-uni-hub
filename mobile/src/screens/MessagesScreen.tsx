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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../context/ThemeContext";
import { useUser } from "../context/UserContext";
import { apiClient } from "../services/apiClient";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import {
  joinMobileSocketConversation,
  leaveMobileSocketConversation,
  broadcastMobileSocketMessage,
  onMobileSocketMessage,
} from "../services/socketClient";

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
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [isStartingChat, setIsStartingChat] = useState(false);

  // Active chat thread state (rendered IN-PLACE full-screen, NOT inside a modal)
  const [activeConv, setActiveConv] = useState<ConversationItem | null>(null);
  const [threadMessages, setThreadMessages] = useState<any[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const flatListRef = useRef<FlatList>(null);

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

  // Search classmates by name or @username (zero emails)
  const searchClassmates = async (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearchingUsers(true);
    try {
      const userParam = user?.id ? `&userId=${encodeURIComponent(user.id)}` : "";
      const collegeParam = user?.collegeId ? `&collegeId=${encodeURIComponent(user.collegeId)}` : "";
      const res = await apiClient.get(
        `/users?search=${encodeURIComponent(q.trim())}${userParam}${collegeParam}`
      );
      if (res.success && Array.isArray(res.data)) {
        setSearchResults(res.data.filter((u: any) => u.id !== user?.id));
      }
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearchingUsers(false);
    }
  };

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

  useEffect(() => {
    if (route?.params?.initialTab) {
      setActiveTab(route.params.initialTab === "whisper" ? "whisper" : "direct");
    }
  }, [route?.params?.initialTab]);

  // Auto-open conversation passed from route params (e.g. from WhisperWall or PrintStation)
  useEffect(() => {
    if (route?.params?.conversationId) {
      const convId = route.params.conversationId;
      const found = conversations.find((c) => c.id === convId);
      if (found) {
        openChat(found);
      } else {
        apiClient.get(`/chat/${convId}/messages?limit=25`).then((res) => {
          if (res.success) {
            const stub: ConversationItem = {
              id: convId,
              isAnonymousChat: route?.params?.initialTab === "whisper",
              otherParticipant: {
                id: "peer",
                name: route?.params?.initialTab === "whisper" ? "Anonymous Whisperer" : "Campus Student",
              },
              messages: Array.isArray(res.data) ? res.data : [],
              updatedAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
            };
            openChat(stub);
            fetchConversations();
          }
        });
      }
    }
  }, [route?.params?.conversationId]);

  // Open chat: enter room, load latest 25 messages descending
  const openChat = async (conv: ConversationItem) => {
    setActiveConv(conv);
    setLoadingThread(true);
    setHasMoreMessages(true);

    joinMobileSocketConversation(conv.id);

    const threadCacheKey = `@otium_thread_${conv.id}`;
    try {
      const cached = await AsyncStorage.getItem(threadCacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setThreadMessages(parsed);
        }
      }

      // Fetch fresh 25 messages (ordered descending from backend: newest at index 0)
      const res = await apiClient.get(`/chat/${conv.id}/messages?limit=25`);
      if (res.success && Array.isArray(res.data)) {
        setThreadMessages(res.data);
        setHasMoreMessages(res.data.length >= 25);
        AsyncStorage.setItem(threadCacheKey, JSON.stringify(res.data)).catch(() => {});
      }
    } catch {
      console.log("[Open Chat Note]: Operating in offline cached thread mode");
    } finally {
      setLoadingThread(false);
    }
  };

  const closeChat = () => {
    if (activeConv) {
      leaveMobileSocketConversation(activeConv.id);
    }
    setActiveConv(null);
    setThreadMessages([]);
    setInputMessage("");
  };

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
          return [{ ...incoming, isMine }, ...prev];
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
            return [...fresh.reverse(), ...prev];
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
          return [...prev, ...fresh];
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

  const handleSendMessage = async () => {
    if (!activeConv || !inputMessage.trim() || isSending) return;

    const content = inputMessage.trim();
    setInputMessage("");

    // WhatsApp-style optimistic instant bubble at index 0 (top of inverted list)
    const tempId = `temp-${Date.now()}`;
    const optimistic = {
      id: tempId,
      conversationId: activeConv.id,
      content,
      isMine: true,
      senderId: user?.id,
      createdAt: new Date().toISOString(),
    };

    setThreadMessages((prev) => [optimistic, ...prev]);

    // Broadcast through socket
    broadcastMobileSocketMessage({
      conversationId: activeConv.id,
      message: optimistic,
    });

    setIsSending(true);
    try {
      const res = await apiClient.post(`/chat/${activeConv.id}/messages`, {
        content,
      });
      if (res.success && res.data) {
        setThreadMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...res.data, isMine: true } : m))
        );
        // Also update latest message in conversations list preview
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConv.id
              ? {
                  ...c,
                  messages: [res.data],
                  updatedAt: new Date().toISOString(),
                }
              : c
          )
        );
      }
    } catch (err) {
      console.error("[Send Message Error]:", err);
    } finally {
      setIsSending(false);
    }
  };

  const filteredConversations = conversations.filter((c) =>
    activeTab === "whisper" ? c.isAnonymousChat : !c.isAnonymousChat
  );

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
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
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
              {participantHandle}
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

        {/* WhatsApp-Style Inverted Lazy Messages Feed */}
        {loadingThread ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>Connecting to chat...</Text>
          </View>
        ) : (
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
            ListFooterComponent={
              loadingOlder ? (
                <View style={{ paddingVertical: 12, alignItems: "center" }}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : null
            }
            renderItem={({ item }) => {
              const isMine = item.isMine;
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
                    <Text
                      style={[
                        styles.timestampText,
                        {
                          color: isMine
                            ? "rgba(255, 255, 255, 0.7)"
                            : colors.textMuted,
                        },
                      ]}
                    >
                      {new Date(item.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                </View>
              );
            }}
          />
        )}

        {/* Modern WhatsApp/Insta Style Input Bar */}
        <View
          style={[
            styles.inputBar,
            { backgroundColor: colors.card, borderTopColor: colors.border },
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
            multiline={true}
            returnKeyType="send"
            onSubmitEditing={handleSendMessage}
          />

          <TouchableOpacity
            style={[
              styles.sendBtn,
              {
                backgroundColor: inputMessage.trim() ? colors.primary : colors.secondary,
              },
            ]}
            onPress={handleSendMessage}
            disabled={!inputMessage.trim() || isSending}
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
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
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
                onChangeText={searchClassmates}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => searchClassmates("")}>
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
    paddingTop: Platform.OS === "ios" ? 52 : 36,
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
    marginVertical: 10,
    padding: 4,
    borderRadius: 12,
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
    paddingTop: Platform.OS === "ios" ? 52 : 36,
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
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 13,
    maxHeight: 100,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
  newChatModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    padding: 20,
    paddingBottom: 36,
    maxHeight: "85%",
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
});

