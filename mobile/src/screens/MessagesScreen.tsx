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
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useUser } from "../context/UserContext";
import { apiClient } from "../services/apiClient";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";

export interface ConversationItem {
  id: string;
  isAnonymousChat: boolean;
  myBlindId?: string;
  otherParticipant: any;
  messages: any[];
  updatedAt: string;
  createdAt: string;
}

export function MessagesScreen({ navigation, route }: any) {
  const { colors, isDark } = useTheme();
  const { user } = useUser();

  const [activeTab, setActiveTab] = useState<"direct" | "whisper">(
    route?.params?.initialTab === "whisper" ? "whisper" : "direct"
  );
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Active chat thread modal
  const [activeConv, setActiveConv] = useState<ConversationItem | null>(null);
  const [threadMessages, setThreadMessages] = useState<any[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  const fetchConversations = async (isPull = false) => {
    if (isPull) setRefreshing(true);
    else if (conversations.length === 0) setLoading(true);

    try {
      const res = await apiClient.get("/chat");
      if (res.success && Array.isArray(res.data)) {
        setConversations(res.data);
      }
    } catch (err) {
      console.error("[Fetch Conversations Error]:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(() => fetchConversations(false), 12000);
    return () => clearInterval(interval);
  }, []);

  // Handle open conversation passed from route params (e.g. from WhisperWall or PrintStation)
  useEffect(() => {
    if (route?.params?.conversationId && conversations.length > 0) {
      const found = conversations.find((c) => c.id === route.params.conversationId);
      if (found) {
        openChat(found);
      }
    }
  }, [route?.params?.conversationId, conversations]);

  const openChat = async (conv: ConversationItem) => {
    setActiveConv(conv);
    setLoadingThread(true);
    try {
      const res = await apiClient.get(`/chat/${conv.id}/messages`);
      if (res.success && Array.isArray(res.data)) {
        setThreadMessages(res.data);
      }
    } catch (err) {
      console.error("[Open Chat Error]:", err);
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
        <TouchableOpacity
          onPress={() => fetchConversations(true)}
          style={styles.refreshBtn}
        >
          <Feather name="refresh-cw" size={16} color={colors.textMuted} />
        </TouchableOpacity>
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
                      style={[styles.participantName, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {participantTitle}
                    </Text>
                    {isPrintBot && (
                      <Badge variant="default" size="sm">
                        Verified Desk
                      </Badge>
                    )}
                    {item.isAnonymousChat && (
                      <Badge variant="outline" size="sm">
                        Secret
                      </Badge>
                    )}
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

      {/* Full-Screen Chat View Modal */}
      <Modal
        visible={!!activeConv}
        animationType="slide"
        onRequestClose={() => setActiveConv(null)}
      >
        <KeyboardAvoidingView
          style={[styles.chatModalContainer, { backgroundColor: colors.background }]}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
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
              contentContainerStyle={styles.threadContent}
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
    gap: 6,
  },
  participantName: {
    fontSize: 13,
    fontWeight: "700",
    flexShrink: 1,
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
});
