"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useUser } from "@/components/providers/UserContext";
import {
  getUserConversations,
  getConversationMessages,
  sendMessage,
} from "@/actions/chat.actions";
import { supabase } from "@/lib/supabase-client";
import { formatDate } from "@/lib/utils";
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
  Sparkles,
  Bot,
  ShieldCheck,
  Clock,
  ArrowLeft,
  Circle,
} from "lucide-react";
import { useSearchParams } from "next/navigation";

function MessagesContent() {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const initialConvId = searchParams.get("id");

  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    initialConvId
  );
  const [messages, setMessages] = useState<any[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [filterType, setFilterType] = useState<"ALL" | "DIRECT" | "ANONYMOUS">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 1. Fetch Conversations
  const fetchConversations = async () => {
    if (!user) return;
    const res = await getUserConversations(user.id);
    if (res.success && res.data) {
      setConversations(res.data);
      if (!activeConversationId && res.data.length > 0) {
        setActiveConversationId(res.data[0].id);
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
      setMessages(res.data);
    }
    setLoadingMessages(false);
    setTimeout(scrollToBottom, 100);
  };

  useEffect(() => {
    if (activeConversationId) {
      fetchActiveMessages(activeConversationId);
    }
  }, [activeConversationId, user]);

  // 3. Supabase Realtime Subscription
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
            // Append if not already in state
            setMessages((prev) => {
              const exists = prev.some((m) => m.id === payload.new.id);
              if (exists) return prev;
              return [...prev, payload.new];
            });
            setTimeout(scrollToBottom, 50);
          }
        }
      )
      .subscribe();

    // Secondary 3s polling fallback for resilience
    const interval = setInterval(() => {
      if (activeConversationId && user) {
        getConversationMessages(activeConversationId, user.id).then((res) => {
          if (res.success && res.data) {
            setMessages(res.data);
          }
        });
      }
    }, 3000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [activeConversationId, user]);

  // 4. Send Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeConversationId || !inputMessage.trim() || sending) return;

    const textToSend = inputMessage.trim();
    setInputMessage("");
    setSending(true);

    const res = await sendMessage({
      conversationId: activeConversationId,
      senderId: user.id,
      content: textToSend,
    });
    setSending(false);

    if (res.error) {
      toast.error(res.error);
      setInputMessage(textToSend);
    } else if (res.data) {
      setMessages((prev) => {
        const exists = prev.some((m) => m.id === res.data.id);
        if (exists) return prev;
        return [...prev, res.data];
      });
      setTimeout(scrollToBottom, 50);
      fetchConversations();
    }
  };

  const activeConv = conversations.find((c) => c.id === activeConversationId);

  // Helper to get other participant details
  const getOtherParticipant = (conv: any) => {
    if (!conv || !user) return null;
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
    <div className="h-[calc(100vh-140px)] flex flex-col space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-500">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Campus Direct Messages</span>
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                <Circle className="w-2 h-2 fill-current animate-pulse" />
                <span>Supabase Live</span>
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Encrypted student direct messaging & incognito confessions DM
            </p>
          </div>
        </div>
      </div>

      {/* Split Pane Chat Layout */}
      <GlassCard className="flex-1 p-0 overflow-hidden flex flex-col md:flex-row border-slate-200/80 dark:border-slate-800/80">
        {/* Left Sidebar: Conversation Threads */}
        <div className="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-slate-900/30">
          {/* Filters & Search */}
          <div className="p-3.5 space-y-2.5 border-b border-slate-200 dark:border-slate-800">
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
                      ? "bg-brand-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800"
                  }`}
                >
                  {f === "ALL" ? "All Chats" : f === "DIRECT" ? "Direct" : "Incognito"}
                </button>
              ))}
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-200/60 dark:divide-slate-800/60">
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
                  Click "Message" on Marketplace, Gigs, or Lost & Found items to start a chat!
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
                    `https://api.dicebear.com/9.x/bottts/svg?seed=${displayName}`
                  : other?.image ||
                    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80";

                return (
                  <div
                    key={conv.id}
                    onClick={() => setActiveConversationId(conv.id)}
                    className={`p-3.5 flex items-center gap-3 cursor-pointer transition-all ${
                      isSelected
                        ? "bg-brand-500/10 dark:bg-brand-500/20 border-l-4 border-brand-500"
                        : "hover:bg-slate-100/60 dark:hover:bg-slate-800/40"
                    }`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        className={`w-10 h-10 rounded-full object-cover bg-slate-800 ${
                          isAnon ? "p-0.5 ring-2 ring-accent-500" : ""
                        }`}
                      />
                      {isAnon && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-accent-600 text-white flex items-center justify-center text-[9px]">
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
                          <Badge variant="warning" size="sm" className="text-[9px] px-1 py-0">
                            Anon
                          </Badge>
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
        <div className="flex-1 flex flex-col bg-slate-100/30 dark:bg-slate-950/40">
          {activeConv ? (
            <>
              {/* Chat Room Top Bar */}
              <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white/40 dark:bg-slate-900/40 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <img
                    src={
                      activeConv.isAnonymousChat
                        ? otherParticipant?.incognitoProfile?.avatarUrl ||
                          `https://api.dicebear.com/9.x/bottts/svg?seed=${otherParticipant?.incognitoProfile?.handle}`
                        : otherParticipant?.image ||
                          "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80"
                    }
                    alt="Recipient"
                    className={`w-9 h-9 rounded-full object-cover bg-slate-800 ${
                      activeConv.isAnonymousChat ? "p-0.5 ring-2 ring-accent-500" : ""
                    }`}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                        {activeConv.isAnonymousChat
                          ? `@${otherParticipant?.incognitoProfile?.handle || "AnonRobot"}`
                          : otherParticipant?.name || "Student"}
                      </p>
                      {activeConv.isAnonymousChat ? (
                        <Badge variant="warning" size="sm">
                          Anonymous Incognito Encrypted
                        </Badge>
                      ) : (
                        <span className="text-[10px] text-slate-400">
                          ({otherParticipant?.department || "Campus Student"})
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1">
                      <Circle className="w-1.5 h-1.5 fill-current" />
                      <span>Live WebSocket Connected</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="brand" size="sm">
                    {activeConv.isAnonymousChat ? "Incognito Thread" : "Direct Student Chat"}
                  </Badge>
                </div>
              </div>

              {/* Message Feed */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {/* Security Announcement Banner */}
                <div className="max-w-md mx-auto p-2.5 rounded-xl bg-slate-200/50 dark:bg-slate-800/40 border border-slate-300 dark:border-slate-700/60 text-center">
                  <p className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-brand-500" />
                    <span>
                      {activeConv.isAnonymousChat
                        ? "Zero-knowledge anonymous chat. Real names and student emails are completely masked."
                        : "Direct student chat powered by Supabase Realtime."}
                    </span>
                  </p>
                </div>

                {loadingMessages ? (
                  <div className="space-y-3 py-4">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`h-10 w-48 rounded-2xl bg-slate-200/60 dark:bg-slate-800 animate-pulse ${
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
                    const isMyMessage = msg.senderId === user?.id;
                    const isAnon = activeConv.isAnonymousChat;

                    const senderDisplayName = isMyMessage
                      ? "You"
                      : isAnon
                      ? `@${msg.sender?.incognitoProfile?.handle || "AnonRobot"}`
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
                          className={`max-w-[75%] sm:max-w-md px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm ${
                            isMyMessage
                              ? "bg-brand-600 text-white rounded-tr-none"
                              : isAnon
                              ? "bg-slate-800 text-slate-100 border border-accent-500/30 rounded-tl-none"
                              : "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700/60 rounded-tl-none"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                          <p
                            className={`text-[9px] mt-1 text-right ${
                              isMyMessage
                                ? "text-brand-200"
                                : "text-slate-400"
                            }`}
                          >
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Bar */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder={
                    activeConv.isAnonymousChat
                      ? "Type anonymous whisper message..."
                      : "Type message to peer student..."
                  }
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  disabled={sending}
                  className="flex-1 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={sending || !inputMessage.trim()}
                  className="bg-brand-600 hover:bg-brand-500 px-4 py-2 h-auto"
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
                Choose a peer thread from the sidebar or click "Message" on any Marketplace item, Gig bounty, or Found item.
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
        <div className="h-[calc(100vh-140px)] flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
          <p className="text-xs font-bold text-slate-400">Loading Campus Direct Messages...</p>
        </div>
      }
    >
      <MessagesContent />
    </Suspense>
  );
}
