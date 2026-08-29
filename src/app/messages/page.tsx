"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useUser } from "@/components/providers/UserContext";
import {
  getUserConversations,
  getConversationMessages,
  sendMessage,
} from "@/actions/chat.actions";
import { supabase } from "@/lib/supabase-client";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import {
  MessageSquare,
  Send,
  EyeOff,
  User,
  Search,
  Bot,
  ShieldCheck,
  Circle,
  Lock,
  CheckCheck,
  Loader2,
  ArrowLeft,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { useSearchParams } from "next/navigation";

export interface ChatMessage {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  status?: "sending" | "sent" | "failed";
  conversationId?: string;
  anonSenderId?: string | null;
  incognitoProfileId?: string | null;
  isMine?: boolean;
  sender?: any;
}

function MessagesContent() {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const initialConvId = searchParams.get("id");

  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    initialConvId
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [filterType, setFilterType] = useState<"ALL" | "DIRECT" | "ANONYMOUS">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // 1. Fetch Conversations
  const fetchConversations = async () => {
    if (!user) return;
    const res = await getUserConversations(user.id);
    if (res.success && res.data) {
      setConversations(res.data);
      // On desktop, auto-select first conversation if none selected
      if (typeof window !== "undefined" && window.innerWidth >= 768) {
        if (!activeConversationId && res.data.length > 0) {
          setActiveConversationId(res.data[0].id);
        }
      }
    }
    setLoadingConversations(false);
  };

  useEffect(() => {
    fetchConversations();
  }, [user]);

  // 2. Fetch Messages for active conversation
  const fetchActiveMessages = async (convId: string) => {
    if (!user) return;
    setLoadingMessages(true);
    const res = await getConversationMessages(convId, user.id);
    if (res.success && res.data) {
      const serverMessages: ChatMessage[] = res.data.map((m: any) => ({
        ...m,
        status: "sent",
      }));
      setMessages(serverMessages);
    }
    setLoadingMessages(false);
    setTimeout(() => scrollToBottom("auto"), 80);
  };

  useEffect(() => {
    if (activeConversationId) {
      fetchActiveMessages(activeConversationId);
    }
  }, [activeConversationId, user]);

  // 3. Supabase Realtime Subscription with Deduplication
  useEffect(() => {
    if (!activeConversationId) return;

    const channel = supabase
      .channel(`realtime:messages:${activeConversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "Message",
          filter: `conversationId=eq.${activeConversationId}`,
        },
        async (payload: any) => {
          if (payload.new) {
            const incoming: ChatMessage = {
              ...payload.new,
              status: "sent",
            };

            setMessages((prev) => {
              // Deduplication by Real DB ID
              const exists = prev.some((m) => m.id === incoming.id);
              if (exists) return prev;

              // Deduplication by pending optimistic message
              const pendingIndex = prev.findIndex(
                (m) =>
                  m.status === "sending" &&
                  m.content === incoming.content &&
                  (m.senderId === incoming.senderId || m.isMine)
              );

              if (pendingIndex !== -1) {
                const updated = [...prev];
                updated[pendingIndex] = incoming;
                return updated;
              }

              return [...prev, incoming];
            });
            setTimeout(() => scrollToBottom("smooth"), 50);
          }
        }
      )
      .subscribe();

    // 3s fallback polling for network resilience
    const interval = setInterval(() => {
      if (activeConversationId && user) {
        getConversationMessages(activeConversationId, user.id).then((res) => {
          if (res.success && res.data) {
            const freshData = res.data;
            setMessages((prev) => {
              const pending = prev.filter(
                (m) => m.status === "sending" || m.status === "failed"
              );
              const serverMsgs: ChatMessage[] = freshData.map((m: any) => ({
                ...m,
                status: "sent",
              }));

              const merged = [...serverMsgs];
              pending.forEach((p) => {
                const alreadySynced = serverMsgs.some(
                  (s) => s.id === p.id || s.content === p.content
                );
                if (!alreadySynced) {
                  merged.push(p);
                }
              });

              return merged;
            });
          }
        });
      }
    }, 3000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [activeConversationId, user]);

  // 4. TASK 1: Optimistic UI & Send Action
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeConversationId || !inputMessage.trim()) return;

    const textToSend = inputMessage.trim();
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Instant Zero-Latency Input Clear
    setInputMessage("");

    // Optimistic Message Dispatch
    const optimisticMsg: ChatMessage = {
      id: tempId,
      content: textToSend,
      senderId: user.id,
      createdAt: new Date().toISOString(),
      status: "sending",
      isMine: true,
      conversationId: activeConversationId,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(() => scrollToBottom("smooth"), 30);

    try {
      const res = await sendMessage({
        conversationId: activeConversationId,
        senderId: user.id,
        content: textToSend,
      });

      if (res.error) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, status: "failed" } : m))
        );
        toast.error(res.error || "Failed to deliver message.");
      } else if (res.data) {
        // Swap temporary client ID with persistent DB record ID
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? {
                  ...res.data,
                  status: "sent",
                  isMine: true,
                }
              : m
          )
        );
        fetchConversations();
      }
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: "failed" } : m))
      );
      toast.error("Network error: Message failed to send.");
    }
  };

  // Retry sending a failed message
  const handleRetryMessage = async (failedMsg: ChatMessage) => {
    if (!user || !activeConversationId) return;

    setMessages((prev) =>
      prev.map((m) => (m.id === failedMsg.id ? { ...m, status: "sending" } : m))
    );

    try {
      const res = await sendMessage({
        conversationId: activeConversationId,
        senderId: user.id,
        content: failedMsg.content,
      });

      if (res.error) {
        setMessages((prev) =>
          prev.map((m) => (m.id === failedMsg.id ? { ...m, status: "failed" } : m))
        );
        toast.error(res.error || "Retry failed.");
      } else if (res.data) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === failedMsg.id
              ? {
                  ...res.data,
                  status: "sent",
                  isMine: true,
                }
              : m
          )
        );
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) => (m.id === failedMsg.id ? { ...m, status: "failed" } : m))
      );
      toast.error("Retry network error.");
    }
  };

  const activeConv = conversations.find((c) => c.id === activeConversationId);

  // Helper to get other participant details
  const getOtherParticipant = (conv: any) => {
    if (!conv) return null;
    if (conv.otherParticipant) return conv.otherParticipant;
    if (!user) return null;
    return conv.participantOneId === user.id
      ? conv.participantTwo
      : conv.participantOne;
  };

  const otherParticipant = getOtherParticipant(activeConv);

  // Filtered conversations
  const filteredConversations = conversations.filter((c) => {
    const isAnon = c.isAnonymousChat;
    if (filterType === "DIRECT" && isAnon) return false;
    if (filterType === "ANONYMOUS" && !isAnon) return false;

    const other = getOtherParticipant(c);
    const searchTarget = isAnon
      ? other?.incognitoProfile?.handle || ""
      : other?.name || "";
    return searchTarget.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="h-[calc(100dvh-120px)] sm:h-[calc(100dvh-130px)] flex flex-col space-y-3 pb-2">
      {/* Top Header (Desktop only or when inbox view is visible) */}
      <div className={`${activeConversationId ? "hidden md:flex" : "flex"} items-center justify-between`}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-500">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Campus Direct Messages</span>
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                <Circle className="w-2 h-2 fill-current animate-pulse" />
                <span>Live Encrypted</span>
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">
              Direct Peer Chats & Anonymous Whisper Messages
            </p>
          </div>
        </div>
      </div>

      {/* Split Pane Chat Layout (TASK 2.1: Dual-View Toggle) */}
      <GlassCard className="flex-1 p-0 overflow-hidden flex flex-col md:flex-row border-slate-200/80 dark:border-slate-800/80 rounded-2xl relative">
        {/* Left Sidebar: Conversation Threads */}
        <div
          className={`${
            activeConversationId ? "hidden md:flex" : "flex flex-1"
          } md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 flex-col bg-slate-50/50 dark:bg-slate-900/30 overflow-hidden chat-scroll-container`}
        >
          {/* Filters & Search */}
          <div className="p-3 space-y-2 border-b border-slate-200 dark:border-slate-800 shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search chats or @handles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="flex items-center gap-1">
              {(["ALL", "DIRECT", "ANONYMOUS"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterType(f)}
                  className={`flex-1 py-1 text-[10px] font-bold rounded-lg transition-all ${
                    filterType === f
                      ? f === "ANONYMOUS"
                        ? "bg-purple-700 text-white shadow-sm"
                        : "bg-brand-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800"
                  }`}
                >
                  {f === "ALL" ? "All Chats" : f === "DIRECT" ? "Direct" : "Incognito"}
                </button>
              ))}
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-200/60 dark:divide-slate-800/60 chat-scroll-container">
            {loadingConversations ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 rounded-xl bg-slate-200/50 dark:bg-slate-800 animate-pulse" />
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                <MessageSquare className="w-8 h-8 mx-auto text-slate-500 opacity-40" />
                <p>No conversations found.</p>
                <p className="text-[10px] text-slate-500">
                  Message a peer from Marketplace, Gigs, or the Incognito Wall!
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const other = getOtherParticipant(conv);
                const isSelected = activeConversationId === conv.id;
                const isAnon = conv.isAnonymousChat;
                const lastMsg = conv.messages?.[0];

                const displayName = isAnon
                  ? `@${other?.incognitoProfile?.handle || "AnonStudent"}`
                  : other?.name || "Student";

                const avatarUrl = isAnon
                  ? other?.incognitoProfile?.avatarUrl ||
                    `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(displayName)}`
                  : other?.image ||
                    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80";

                return (
                  <div
                    key={conv.id}
                    onClick={() => setActiveConversationId(conv.id)}
                    className={`p-3.5 flex items-center gap-3 cursor-pointer transition-all ${
                      isSelected
                        ? isAnon
                          ? "bg-purple-950/30 dark:bg-purple-950/50 border-l-4 border-purple-500"
                          : "bg-brand-500/10 dark:bg-brand-500/20 border-l-4 border-brand-500"
                        : "hover:bg-slate-100/60 dark:hover:bg-slate-800/40"
                    }`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        className={`w-10 h-10 rounded-full object-cover bg-slate-800 ${
                          isAnon ? "p-0.5 ring-2 ring-purple-500" : ""
                        }`}
                      />
                      {isAnon && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-purple-700 text-white flex items-center justify-center text-[9px] shadow">
                          <EyeOff className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {displayName}
                        </p>
                        {lastMsg && (
                          <span className="text-[10px] text-slate-400">
                            {new Date(lastMsg.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-1 mt-0.5">
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {lastMsg ? lastMsg.content : "Started conversation"}
                        </p>
                        {isAnon ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-purple-950 border border-purple-600/50 text-[9px] font-black text-purple-300 tracking-wider">
                            INCOGNITO DM
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Active Chat Room */}
        <div
          className={`${
            activeConversationId ? "flex flex-1" : "hidden md:flex md:flex-1"
          } flex-col bg-slate-100/30 dark:bg-slate-950/40 relative overflow-hidden`}
        >
          {activeConv ? (
            <>
              {/* TASK 2.2: Sticky Mobile Navigation Top Bar */}
              <div className="p-3 sm:p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-10 shrink-0">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  {/* Mobile Back Button (< md) */}
                  <button
                    onClick={() => setActiveConversationId(null)}
                    className="md:hidden p-1.5 -ml-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition-colors"
                    title="Back to inbox"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <img
                    src={
                      activeConv.isAnonymousChat
                        ? otherParticipant?.incognitoProfile?.avatarUrl ||
                          `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(
                            otherParticipant?.incognitoProfile?.handle || "Anon"
                          )}`
                        : otherParticipant?.image ||
                          "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80"
                    }
                    alt="Recipient"
                    className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover bg-slate-800 ${
                      activeConv.isAnonymousChat ? "p-0.5 ring-2 ring-purple-500" : ""
                    }`}
                  />
                  <div>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate max-w-[140px] sm:max-w-[240px]">
                        {activeConv.isAnonymousChat
                          ? `@${otherParticipant?.incognitoProfile?.handle || "AnonStudent"}`
                          : otherParticipant?.name || "Student"}
                      </p>
                      {activeConv.isAnonymousChat ? (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-purple-950 border border-purple-500/60 text-[9px] font-black text-purple-200">
                          <EyeOff className="w-2.5 h-2.5 text-purple-400" />
                          <span>ANON</span>
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1">
                      <Circle className="w-1.5 h-1.5 fill-current animate-pulse" />
                      <span>Encrypted Stream</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {activeConv.isAnonymousChat ? (
                    <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-lg border border-purple-500/20 flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      <span>Anonymous</span>
                    </span>
                  ) : (
                    <Badge variant="brand" size="sm">
                      Peer Chat
                    </Badge>
                  )}
                </div>
              </div>

              {/* Message Feed Container (TASK 2.4: overscroll behavior y none) */}
              <div className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-3 chat-scroll-container">
                {/* Security Announcement Banner */}
                <div
                  className={`max-w-md mx-auto p-2 rounded-xl border text-center ${
                    activeConv.isAnonymousChat
                      ? "bg-purple-950/40 border-purple-500/30 text-purple-300"
                      : "bg-slate-200/50 dark:bg-slate-800/40 border-slate-300 dark:border-slate-700/60 text-slate-400"
                  }`}
                >
                  <p className="text-[10px] flex items-center justify-center gap-1.5 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                    <span>
                      {activeConv.isAnonymousChat
                        ? "Anonymous Mode: Real names and email addresses are completely hidden."
                        : "Direct student chat with instant optimistic delivery."}
                    </span>
                  </p>
                </div>

                {loadingMessages ? (
                  <div className="space-y-3 py-4">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`h-10 w-44 rounded-2xl bg-slate-200/60 dark:bg-slate-800 animate-pulse ${
                          i % 2 === 0 ? "ml-auto" : ""
                        }`}
                      />
                    ))}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-16 text-xs text-slate-400 space-y-2">
                    <Bot className="w-8 h-8 mx-auto text-slate-500 opacity-40" />
                    <p>No messages in this chat yet.</p>
                    <p className="text-[10px] text-slate-500">
                      Send a message below to kick off the conversation!
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMyMessage =
                      msg.isMine !== undefined
                        ? msg.isMine
                        : msg.senderId === user?.id;
                    const isAnon = activeConv.isAnonymousChat;

                    const senderDisplayName = isMyMessage
                      ? "You"
                      : isAnon
                      ? `@${msg.sender?.incognitoProfile?.handle || "AnonStudent"}`
                      : msg.sender?.name || "Student";

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${
                          isMyMessage ? "items-end" : "items-start"
                        }`}
                      >
                        <span className="text-[10px] text-slate-400 mb-0.5 px-1">
                          {senderDisplayName}
                        </span>

                        <div
                          className={`max-w-[82%] sm:max-w-md px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm transition-all ${
                            isMyMessage
                              ? msg.status === "failed"
                                ? "bg-red-500/10 border border-red-500/50 text-red-200 rounded-tr-none"
                                : isAnon
                                ? "bg-purple-700 text-white rounded-tr-none"
                                : "bg-brand-600 text-white rounded-tr-none"
                              : isAnon
                              ? "bg-slate-900 text-slate-100 border border-purple-500/30 rounded-tl-none"
                              : "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700/60 rounded-tl-none"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>

                          {/* Delivery Status & Actionable Failed Indicator */}
                          <div
                            className={`text-[9px] mt-1 flex items-center justify-end gap-1.5 ${
                              isMyMessage
                                ? msg.status === "failed"
                                  ? "text-red-300"
                                  : "text-purple-200 dark:text-purple-300"
                                : "text-slate-400"
                            }`}
                          >
                            <span>
                              {new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>

                            {isMyMessage && (
                              <span className="inline-flex items-center">
                                {msg.status === "sending" ? (
                                  <span className="inline-flex items-center gap-1 text-white/80">
                                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                    <span className="text-[8px]">Sending</span>
                                  </span>
                                ) : msg.status === "failed" ? (
                                  <button
                                    type="button"
                                    onClick={() => handleRetryMessage(msg)}
                                    className="inline-flex items-center gap-1 text-red-300 hover:text-red-100 font-bold bg-red-500/20 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                                    title="Click to retry sending"
                                  >
                                    <RotateCcw className="w-2.5 h-2.5 animate-spin" />
                                    <span>Failed to send. Tap to retry</span>
                                  </button>
                                ) : (
                                  <CheckCheck className="w-3 h-3 text-emerald-300" />
                                )}
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

              {/* TASK 2.3: Sticky Bottom Input Bar Anchored for Soft Keyboard */}
              <form
                onSubmit={handleSendMessage}
                className="p-2.5 sm:p-3 border-t border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-md sticky bottom-0 z-10 flex items-center gap-2 shrink-0"
              >
                <input
                  type="text"
                  placeholder={
                    activeConv.isAnonymousChat
                      ? "Send anonymous whisper..."
                      : "Type message to student..."
                  }
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  className="flex-1 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!inputMessage.trim()}
                  className={`px-3.5 py-2 h-auto font-bold ${
                    activeConv.isAnonymousChat
                      ? "bg-purple-600 hover:bg-purple-500"
                      : "bg-brand-600 hover:bg-brand-500"
                  }`}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center">
                <MessageSquare className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Select a Conversation
              </h3>
              <p className="text-xs max-w-sm">
                Choose a peer thread from the sidebar or initiate a direct chat from Marketplace, Gig bounty, or the Incognito Wall.
              </p>
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="h-[calc(100dvh-130px)] flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
          <p className="text-xs font-bold text-slate-400">Loading Campus Direct Messages...</p>
        </div>
      }
    >
      <MessagesContent />
    </Suspense>
  );
}
