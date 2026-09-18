import React, { useState, useEffect, useRef } from "react";
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
  Image,
  Alert,
  Keyboard,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useUser } from "../context/UserContext";
import { apiClient } from "../services/apiClient";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";

export interface ConversationItem {
  id: string;
  isAnonymousChat: boolean;
  myBlindId?: string;
  otherParticipant: any;
  messages: any[];
  updatedAt: string;
  createdAt: string;
}

import AsyncStorage from "@react-native-async-storage/async-storage";

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

  // Active chat thread modal
  const [activeConv, setActiveConv] = useState<ConversationItem | null>(null);
  const [threadMessages, setThreadMessages] = useState<any[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const flatListRef = useRef<FlatList>(null);

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
      const res = await apiClient.get(`/users?search=${encodeURIComponent(q.trim())}${userParam}${collegeParam}`);
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

    // 2. Fetch fresh from server
    try {
      const res = await apiClient.get("/chat");
      if (res.success && Array.isArray(res.data)) {
        setConversations(res.data);
        AsyncStorage.setItem(STORAGE_KEY_CONVERSATIONS, JSON.stringify(res.data)).catch(() => {});
      }
    } catch (err) {
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

  // Handle open conversation passed from route params (e.g. from WhisperWall or PrintStation)
  useEffect(() => {
    if (route?.params?.conversationId) {
      const convId = route.params.conversationId;
      const found = conversations.find((c) => c.id === convId);
      if (found) {
        openChat(found);
      } else {
        apiClient.get(`/chat/${convId}/messages`).then((res) => {
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

  // Auto-scroll message feed to bottom when keyboard appears (especially on Android)
  useEffect(() => {
    if (!activeConv) return;
    const showEvent = Platform.OS === "android" ? "keyboardDidShow" : "keyboardWillShow";
    const showSub = Keyboard.addListener(showEvent, () => {
      flatListRef.current?.scrollToEnd({ animated: true });
    });
    return () => {
      showSub.remove();
    };
  }, [activeConv]);

  const openChat = async (conv: ConversationItem) => {
    setActiveConv(conv);
    setLoadingThread(true);

    // Preload from active conversation messages if available
    if (Array.isArray(conv.messages) && conv.messages.length > 0) {
      setThreadMessages(conv.messages);
    }

    try {
      const threadCacheKey = `@otium_thread_${conv.id}`;
      const cached = await AsyncStorage.getItem(threadCacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setThreadMessages(parsed);
        }
      }

      const res = await apiClient.get(`/chat/${conv.id}/messages`);
      if (res.success && Array.isArray(res.data)) {
        setThreadMessages(res.data);
        AsyncStorage.setItem(threadCacheKey, JSON.stringify(res.data)).catch(() => {});
      }
    } catch (err) {
      console.log("[Open Chat Note]: Operating in offline cached thread mode");
    } finally {
      setLoadingThread(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
    }
  };

  const handleSendMessage = async () => {
    if (!activeConv || !inputMessage.trim() || isSending) return;

    const content = inputMessage.trim();
    setInputMessage("");

    // Optimistic message
    const optimistic = {
      id: `temp-${Date.now()}`,
      content,
      isMine: true,
      createdAt: new Date().toISOString(),
    };
    setThreadMessages((prev) => [...prev, optimistic]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);

    setIsSending(true);
    try {
      const res = await apiClient.post(`/chat/${activeConv.id}/messages`, {
        content,
      });
      if (res.success && res.data) {
        // Replace temp or refresh
        setThreadMessages((prev) =>
          prev.map((m) => (m.id === optimistic.id ? { ...res.data, isMine: true } : m))
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
      activeConv.otherParticipant?.email === "printing@otiumhub.in");

  return (
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
                item.otherParticipant?.email === "printing@otiumhub.in");

            const participantTitle = item.isAnonymousChat
              ? item.otherParticipant?.incognitoProfile?.handle || "Anonymous Whisper"
              : isPrintBot
              ? "Express Print Station"
              : item.otherParticipant?.name || "Campus Student";

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

      {/* Classmate Search & New Chat Modal */}
      <Modal
        visible={isNewChatOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsNewChatOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.newChatModalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>New Direct Message</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                  Find students on your campus by name
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsNewChatOpen(false)}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={[styles.searchBar, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Feather name="search" size={16} color={colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search classmate name or email..."
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
                <Text style={[styles.searchLoadingText, { color: colors.textMuted }]}>Searching campus directory...</Text>
              </View>
            ) : searchResults.length > 0 ? (
              <FlatList
                data={searchResults}
                keyExtractor={(item) => item.id}
                style={{ maxHeight: 320 }}
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
                      <Text style={[styles.classmateCollege, { color: colors.textMuted }]} numberOfLines={1}>
                        {item.college?.name || item.email || "Campus Student"}
                      </Text>
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
                  Type a student name to message them directly
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Full-Screen Chat View Modal */}
      <Modal
        visible={!!activeConv}
        animationType="slide"
        onRequestClose={() => setActiveConv(null)}
      >
        <KeyboardAvoidingView
          style={[styles.chatModalContainer, { backgroundColor: colors.background }]}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
        >
          {/* Chat Header */}
          <View style={[styles.chatHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity
              onPress={() => setActiveConv(null)}
              style={styles.chatBackBtn}
            >
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </TouchableOpacity>

            <View style={styles.chatHeaderInfo}>
              <Text style={[styles.chatHeaderName, { color: colors.text }]} numberOfLines={1}>
                {activeConv?.isAnonymousChat
                  ? activeConv?.otherParticipant?.incognitoProfile?.handle || "Anonymous Whisper"
                  : isPrintStationThread
                  ? "Express Print Station"
                  : activeConv?.otherParticipant?.name || "Student"}
              </Text>
              <Text style={[styles.chatHeaderSub, { color: colors.textMuted }]}>
                {activeConv?.isAnonymousChat
                  ? "100% Secret • Cryptographic Blind Identity"
                  : isPrintStationThread
                  ? "Campus Automated Order Updates"
                  : "Campus Peer Chat"}
              </Text>
            </View>

            {isPrintStationThread && (
              <Badge variant="success" size="sm">
                Official
              </Badge>
            )}
          </View>

          {/* If Print Bot: One-Way Information Notice */}
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

          {/* Messages List */}
          {loadingThread ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={threadMessages}
              keyExtractor={(item) => item.id}
              style={styles.threadList}
              contentContainerStyle={[styles.threadContent, { flexGrow: 1 }]}
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
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

          {/* Input Bar */}
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
                  ? "Inquire about this print order..."
                  : "Type your message..."
              }
              placeholderTextColor={colors.textMuted}
              value={inputMessage}
              onChangeText={setInputMessage}
              onFocus={() => {
                setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
                setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 250);
              }}
              multiline={false}
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
  chatModalContainer: {
    flex: 1,
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
  threadContent: {
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
    maxHeight: 90,
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
