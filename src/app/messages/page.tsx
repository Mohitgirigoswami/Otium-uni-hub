"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useUser } from "@/components/providers/UserContext";
import {
  getUserConversations,
  getConversationMessages,
  sendMessage,
  getOrCreateConversation,
} from "@/actions/chat.actions";
import {
  joinSocketConversation,
  leaveSocketConversation,
  broadcastSocketMessage,
  onSocketMessage,
} from "@/lib/socket-client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  MessageSquare,
  Send,
  EyeOff,
  User,
  Search,
  Loader2,
  ArrowLeft,
  Lock,
  Plus,
  Printer,
  X,
} from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";

export interface ChatMessage {
  id: string;
  content: string;
  senderId?: string;
  createdAt: string;
  status?: "sending" | "sent" | "failed";
  conversationId?: string;
  anonSenderId?: string | null;
  isMine?: boolean;
  sender?: any;
}

function MessagesContent() {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialConvId = searchParams.get("id") || searchParams.get("conversationId");

  const [activeTab, setActiveTab] = useState<"direct" | "whisper">(
    searchParams.get("initialTab") === "whisper" ? "whisper" : "direct"
  );
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(initialConvId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreOlder, setHasMoreOlder] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [convFilterQuery, setConvFilterQuery] = useState("");

  // Classmate Search Modal
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreatingChat, setIsCreatingChat] = useState(false);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior,
      });
    }
  };

  const fetchConversations = async () => {
    if (!user) return;
    const res = await getUserConversations(user.id);
    if (res.success && res.data) {
      setConversations(res.data);
      if (
        !activeConversationId &&
        res.data.length > 0 &&
        typeof window !== "undefined" &&
        window.innerWidth >= 768
      ) {
        const filtered = res.data.filter((c: any) =>
          activeTab === "whisper" ? c.isAnonymousChat : !c.isAnonymousChat
        );
        if (filtered.length > 0) {
          setActiveConversationId(filtered[0].id);
        }
      }
    }
    setLoadingConversations(false);
  };

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 12000);
    return () => clearInterval(interval);
  }, [user?.id]);

  // Fetch latest 25 messages when opening a conversation
  const fetchActiveMessages = async (convId: string) => {
    if (!user) return;
    setLoadingMessages(true);
    setHasMoreOlder(true);
    joinSocketConversation(convId);

    const res = await getConversationMessages(convId, user.id, { limit: 25 });
    if (res.success && res.data) {
      // Backend returns messages descending; reverse to chronological order for web stream
      const chronological = [...res.data].reverse();
      setMessages(chronological);
      setHasMoreOlder(res.data.length >= 25);
    }
    setLoadingMessages(false);
    setTimeout(() => scrollToBottom("auto"), 60);
  };

  useEffect(() => {
    if (activeConversationId) {
      fetchActiveMessages(activeConversationId);
    }
    return () => {
      if (activeConversationId) {
        leaveSocketConversation(activeConversationId);
      }
    };
  }, [activeConversationId, user?.id]);

  // Socket.io Realtime Listener + Fallback Delta Sync
  useEffect(() => {
    if (!activeConversationId || !user) return;

    // 1. Socket message listener
    const unsubscribeSocket = onSocketMessage((data: any) => {
      if (data?.conversationId === activeConversationId && data?.message) {
        const incoming = data.message;
        setMessages((prev) => {
          if (prev.some((m) => m.id === incoming.id)) return prev;
          const isMine = incoming.senderId === user.id;
          return [...prev, { ...incoming, isMine }];
        });
        scrollToBottom("smooth");
      }
    });

    // 2. Periodic delta sync polling (every 2.5s)
    const deltaInterval = setInterval(async () => {
      if (messages.length === 0) return;
      const latestMsg = messages[messages.length - 1];
      if (!latestMsg?.createdAt) return;

      try {
        const safeAfter = new Date(latestMsg.createdAt).toISOString();
        const res = await fetch(
          `/api/chat/${activeConversationId}/messages?after=${encodeURIComponent(safeAfter)}`
        );
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const fresh = json.data.filter((m: any) => !existingIds.has(m.id));
            if (fresh.length === 0) return prev;
            return [...prev, ...fresh];
          });
          scrollToBottom("smooth");
        }
      } catch {}
    }, 2500);

    return () => {
      unsubscribeSocket();
      clearInterval(deltaInterval);
    };
  }, [activeConversationId, user?.id, messages]);

  // Load older messages when scrolling to top
  const handleScroll = async (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    if (container.scrollTop === 0 && hasMoreOlder && !loadingOlder && messages.length > 0 && activeConversationId) {
      const oldestMsg = messages[0];
      if (!oldestMsg?.id) return;

      const previousScrollHeight = container.scrollHeight;
      setLoadingOlder(true);
      try {
        const res = await fetch(
          `/api/chat/${activeConversationId}/messages?cursor=${encodeURIComponent(
            oldestMsg.id
          )}&limit=25`
        );
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          if (json.data.length < 25) {
            setHasMoreOlder(false);
          }
          const olderChronological = [...json.data].reverse();
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const fresh = olderChronological.filter((m: any) => !existingIds.has(m.id));
            return [...fresh, ...prev];
          });
          // Preserve scroll position
          setTimeout(() => {
            container.scrollTop = container.scrollHeight - previousScrollHeight;
          }, 20);
        } else {
          setHasMoreOlder(false);
        }
      } catch {
        // quiet fail
      } finally {
        setLoadingOlder(false);
      }
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeConversationId || !inputMessage.trim()) return;

    const text = inputMessage.trim();
    setInputMessage("");

    // Optimistic message with globally unique temp ID
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      conversationId: activeConversationId,
      content: text,
      senderId: user.id,
      createdAt: new Date().toISOString(),
      status: "sending",
      isMine: true,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(() => scrollToBottom("smooth"), 30);

    // Broadcast through socket immediately
    broadcastSocketMessage({
      conversationId: activeConversationId,
      message: optimisticMsg,
    });

    // Update conversation list preview optimistically
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversationId
          ? { ...c, messages: [optimisticMsg], updatedAt: new Date().toISOString() }
          : c
      )
    );

    // Asynchronous non-blocking background dispatch - zero delay for consecutive back-to-back messages
    sendMessage({
      conversationId: activeConversationId,
      senderId: user.id,
      content: text,
    })
      .then((res) => {
        if (res.error) {
          toast.error(res.error);
          setMessages((prev) =>
            prev.map((m) => (m.id === tempId ? { ...m, status: "failed" } : m))
          );
        } else if (res.data) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempId ? { ...res.data, isMine: true, status: "sent" } : m
            )
          );
          setConversations((prev) =>
            prev.map((c) =>
              c.id === activeConversationId
                ? { ...c, messages: [res.data], updatedAt: new Date().toISOString() }
                : c
            )
          );
        }
      })
      .catch(() => {
        toast.error("Failed to deliver message");
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, status: "failed" } : m))
        );
      });
  };

  // Classmate search by name or @username (zero emails)
  const handleSearchClassmates = async (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/users?search=${encodeURIComponent(q.trim())}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setSearchResults(json.data.filter((u: any) => u.id !== user?.id));
      }
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleStartDirectChat = async (classmate: any) => {
    if (!user) return;
    setIsCreatingChat(true);
    try {
      const res = await getOrCreateConversation({
        participantOneId: user.id,
        participantTwoId: classmate.id,
        isAnonymousChat: false,
      });
      if (res.success && res.data) {
        setIsSearchOpen(false);
        setSearchQuery("");
        setSearchResults([]);
        await fetchConversations();
        setActiveConversationId(res.data.id);
        toast.success(`Chat started with ${classmate.name}`);
      } else {
        toast.error(res.error || "Failed to start conversation.");
      }
    } catch {
      toast.error("Failed to connect to campus chat.");
    } finally {
      setIsCreatingChat(false);
    }
  };

  const filteredConversations = conversations.filter((c) => {
    const tabMatch = activeTab === "whisper" ? c.isAnonymousChat : !c.isAnonymousChat;
    if (!tabMatch) return false;
    if (!convFilterQuery.trim()) return true;
    const q = convFilterQuery.toLowerCase();
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

  const activeConv = conversations.find((c) => c.id === activeConversationId);

  const isPrintStationThread =
    activeConv &&
    !activeConv.isAnonymousChat &&
    (activeConv.otherParticipant?.name === "Express Print Station" ||
      activeConv.otherParticipant?.username === "express_print" ||
      activeConv.otherParticipant?.email === "printing@otiumhub.in");

  const recipientTitle = activeConv?.isAnonymousChat
    ? activeConv.otherParticipant?.incognitoProfile?.handle || "Anonymous Whisper"
    : isPrintStationThread
    ? "Express Print Station"
    : activeConv?.otherParticipant?.name || "Student Peer";

  const recipientHandle = activeConv?.isAnonymousChat
    ? "100% Secret • Zero-Knowledge Blind ID"
    : isPrintStationThread
    ? "Campus Automated Order Updates"
    : activeConv?.otherParticipant?.username
    ? `@${activeConv.otherParticipant.username}`
    : activeConv?.otherParticipant?.department || "Verified Campus Student";

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary text-foreground text-xs font-semibold border border-border">
            <MessageSquare className="w-3.5 h-3.5 text-primary" />
            <span>Campus Realtime Sockets</span>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Messages & Whispers
          </h1>
        </div>

        <Button
          onClick={() => setIsSearchOpen(true)}
          variant="default"
          size="sm"
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>New Message</span>
        </Button>
      </div>

      {/* Dual Pane Chat Container */}
      <Card className="min-h-[620px] h-[calc(100vh-250px)] overflow-hidden grid grid-cols-1 md:grid-cols-12 border-border">
        {/* Left Pane: Conversations List */}
        <div
          className={`md:col-span-4 border-r border-border flex flex-col h-full bg-card/60 ${
            activeConversationId ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Dual Inbox Tab Switcher */}
          <div className="p-3 border-b border-border bg-card space-y-2">
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-secondary border border-border">
              <button
                onClick={() => setActiveTab("direct")}
                className={`py-1.5 px-2 text-xs font-bold rounded-md transition-colors flex items-center justify-center gap-1.5 ${
                  activeTab === "direct"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-primary" />
                <span>Direct & Print</span>
              </button>
              <button
                onClick={() => setActiveTab("whisper")}
                className={`py-1.5 px-2 text-xs font-bold rounded-md transition-colors flex items-center justify-center gap-1.5 ${
                  activeTab === "whisper"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <EyeOff className="w-3.5 h-3.5 text-primary" />
                <span>Whisper DMs</span>
              </button>
            </div>

            {/* Quick in-window search bar */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={convFilterQuery}
                onChange={(e) => setConvFilterQuery(e.target.value)}
                className="pl-8 h-8 text-xs rounded-md bg-secondary/50 border-border"
              />
            </div>
          </div>

          {/* Conversation Feed */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loadingConversations ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-14 rounded-lg bg-secondary/60 animate-pulse" />
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
                {activeTab === "whisper" ? (
                  <EyeOff className="w-8 h-8 mx-auto opacity-40 text-primary" />
                ) : (
                  <MessageSquare className="w-8 h-8 mx-auto opacity-40 text-primary" />
                )}
                <p className="font-semibold text-foreground">
                  {activeTab === "whisper" ? "No Whisper DMs Yet" : "No Direct Messages"}
                </p>
                <p className="max-w-xs mx-auto">
                  {activeTab === "whisper"
                    ? "When someone whispers back to your Whisper Wall post via DM, secret encrypted threads appear here."
                    : "Chat directly with classmates using public usernames, or receive automated Express Print updates."}
                </p>
                {activeTab === "direct" && (
                  <Button
                    onClick={() => setIsSearchOpen(true)}
                    variant="outline"
                    size="sm"
                    className="mt-2 text-xs"
                  >
                    Find a Classmate
                  </Button>
                )}
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = conv.id === activeConversationId;
                const isPrintBot =
                  !conv.isAnonymousChat &&
                  (conv.otherParticipant?.name === "Express Print Station" ||
                    conv.otherParticipant?.username === "express_print" ||
                    conv.otherParticipant?.email === "printing@otiumhub.in");

                const title = conv.isAnonymousChat
                  ? conv.otherParticipant?.incognitoProfile?.handle || "Anonymous Whisper"
                  : isPrintBot
                  ? "Express Print Station"
                  : conv.otherParticipant?.name || "Student Peer";

                const subtitle = conv.isAnonymousChat
                  ? "Zero-Knowledge Blind ID"
                  : isPrintBot
                  ? "Print Station Bot"
                  : conv.otherParticipant?.username
                  ? `@${conv.otherParticipant.username}`
                  : conv.otherParticipant?.department || "Classmate";

                const lastMsg =
                  conv.messages && conv.messages.length > 0
                    ? conv.messages[conv.messages.length - 1]?.content
                    : "Conversation initialized";

                return (
                  <button
                    key={conv.id}
                    onClick={() => setActiveConversationId(conv.id)}
                    className={`w-full p-3 rounded-xl text-left transition-colors flex items-start gap-3 border ${
                      isSelected
                        ? "bg-secondary text-foreground border-border shadow-xs"
                        : "border-transparent hover:bg-secondary/60 text-muted-foreground"
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 font-extrabold text-xs ${
                        isPrintBot
                          ? "bg-primary/15 border-primary/30 text-primary"
                          : conv.isAnonymousChat
                          ? "bg-secondary border-border text-muted-foreground"
                          : "bg-primary/10 border-primary/20 text-primary"
                      }`}
                    >
                      {isPrintBot ? (
                        <Printer className="w-4 h-4" />
                      ) : conv.isAnonymousChat ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        title.charAt(0).toUpperCase()
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-xs text-foreground truncate">
                          {title}
                        </span>
                        {conv.updatedAt && (
                          <span className="text-[10px] text-muted-foreground flex-shrink-0">
                            {new Date(conv.updatedAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-medium text-primary truncate">
                        {subtitle}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {lastMsg}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Active Message Stream */}
        <div
          className={`md:col-span-8 flex flex-col h-full bg-card ${
            !activeConversationId ? "hidden md:flex" : "flex"
          }`}
        >
          {activeConv ? (
            <>
              {/* Chat Stream Header */}
              <div className="p-3.5 border-b border-border flex items-center justify-between gap-3 bg-card">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => setActiveConversationId(null)}
                    className="md:hidden p-1.5 rounded-lg border border-border hover:bg-secondary text-muted-foreground hover:text-foreground"
                    aria-label="Back to conversations list"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <div
                    className={`w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 font-extrabold text-xs ${
                      isPrintStationThread
                        ? "bg-primary/15 border-primary/30 text-primary"
                        : activeConv.isAnonymousChat
                        ? "bg-secondary border-border text-muted-foreground"
                        : "bg-primary/10 border-primary/20 text-primary"
                    }`}
                  >
                    {isPrintStationThread ? (
                      <Printer className="w-4 h-4" />
                    ) : activeConv.isAnonymousChat ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      recipientTitle.charAt(0).toUpperCase()
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-heading font-bold text-sm text-foreground truncate">
                        {recipientTitle}
                      </h3>
                      {isPrintStationThread && (
                        <Badge variant="outline" size="sm" className="text-[10px]">
                          Official Bot
                        </Badge>
                      )}
                    </div>
                    <span className="text-[11px] text-primary font-medium truncate block">
                      {recipientHandle}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground flex-shrink-0">
                  <Lock className="w-3.5 h-3.5 text-primary" />
                  <span className="hidden sm:inline">Socket.io Encrypted Stream</span>
                </div>
              </div>

              {/* Print Bot Notice */}
              {isPrintStationThread && (
                <div className="px-4 py-2 bg-primary/10 border-b border-primary/20 text-xs text-foreground flex items-center gap-2">
                  <Printer className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  <span>Transactional update feed for your print orders and delivery dispatches.</span>
                </div>
              )}

              {/* Messages Stream with Scroll-up Lazy Loading */}
              <div
                ref={messagesContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-4 space-y-3 bg-secondary/15"
              >
                {loadingOlder && (
                  <div className="flex items-center justify-center py-2 text-xs text-muted-foreground gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                    <span>Loading earlier messages...</span>
                  </div>
                )}

                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full text-xs text-muted-foreground gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span>Connecting to chat stream...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center p-6 text-xs text-muted-foreground">
                    Start the conversation. Send a message below.
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMine = msg.isMine ?? (msg.senderId === user?.id);
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                            isMine
                              ? "bg-primary text-primary-foreground font-medium rounded-br-xs shadow-xs"
                              : "bg-card border border-border text-foreground rounded-bl-xs shadow-xs"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                          <div
                            className={`text-[9px] mt-1 text-right flex items-center justify-end gap-1.5 ${
                              isMine ? "text-primary-foreground/75" : "text-muted-foreground"
                            }`}
                          >
                            <span>{formatDate(msg.createdAt)}</span>
                            {isMine && (
                              <span className={`text-[10px] font-bold ${msg.status === "failed" ? "text-destructive" : ""}`}>
                                {msg.status === "sending" ? "⏱" : msg.status === "failed" ? "!" : "✓✓"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Bar */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 border-t border-border bg-card flex items-center gap-2"
              >
                <Input
                  placeholder={
                    activeConv.isAnonymousChat
                      ? "Send anonymous whisper..."
                      : isPrintStationThread
                      ? "Inquire about this print order..."
                      : "Type message to classmate..."
                  }
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  className="flex-1 rounded-full px-4"
                />
                <Button
                  type="submit"
                  size="md"
                  disabled={!inputMessage.trim()}
                  className="rounded-full w-10 h-10 p-0 flex items-center justify-center flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-muted-foreground">
              <MessageSquare className="w-10 h-10 opacity-30 text-primary" />
              <h3 className="font-heading font-bold text-sm text-foreground">
                Select a conversation
              </h3>
              <p className="text-xs max-w-xs">
                Pick a chat from the left panel to message classmates or check order dispatches.
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Classmate Search & Start Chat Modal */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-5 space-y-4 border-border shadow-xl bg-card">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-heading font-bold text-base text-foreground">
                  New Direct Message
                </h3>
                <p className="text-xs text-muted-foreground">
                  Search classmates by name or @username (zero emails)
                </p>
              </div>
              <button
                onClick={() => setIsSearchOpen(false)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search classmate name or @username..."
                value={searchQuery}
                onChange={(e) => handleSearchClassmates(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1">
              {isSearching ? (
                <div className="flex items-center justify-center py-6 text-xs text-muted-foreground gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span>Searching campus directory...</span>
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((classmate) => (
                  <button
                    key={classmate.id}
                    onClick={() => handleStartDirectChat(classmate)}
                    disabled={isCreatingChat}
                    className="w-full p-2.5 rounded-lg hover:bg-secondary/70 flex items-center justify-between text-left transition-colors border border-transparent hover:border-border"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center font-bold text-xs text-primary flex-shrink-0">
                        {classmate.name ? classmate.name.charAt(0).toUpperCase() : "U"}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-foreground truncate">
                          {classmate.name}
                        </p>
                        <p className="text-[11px] font-medium text-primary truncate">
                          {classmate.username ? `@${classmate.username}` : classmate.department || "Classmate"}
                        </p>
                        {classmate.college?.name && (
                          <p className="text-[10px] text-muted-foreground truncate">
                            {classmate.college.name}
                          </p>
                        )}
                      </div>
                    </div>
                    <Send className="w-3.5 h-3.5 text-primary flex-shrink-0 ml-2" />
                  </button>
                ))
              ) : searchQuery.trim().length > 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  No students found matching &quot;{searchQuery}&quot;
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-muted-foreground space-y-1">
                  <User className="w-8 h-8 mx-auto opacity-40 text-primary" />
                  <p>Type a name or @username to start chatting.</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="w-7 h-7 border-2 border-border border-t-primary rounded-full animate-spin" />
        </div>
      }
    >
      <MessagesContent />
    </Suspense>
  );
}

