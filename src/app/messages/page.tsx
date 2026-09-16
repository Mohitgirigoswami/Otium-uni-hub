"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useUser } from "@/components/providers/UserContext";
import {
  getUserConversations,
  getConversationMessages,
  sendMessage,
} from "@/actions/chat.actions";
import { supabase } from "@/lib/supabase-client";
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
  CheckCheck,
  Loader2,
  ArrowLeft,
  Lock,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { formatDate } from "@/lib/utils";

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
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const fetchConversations = async () => {
    if (!user) return;
    const res = await getUserConversations(user.id);
    if (res.success && res.data) {
      setConversations(res.data);
      if (!activeConversationId && res.data.length > 0 && typeof window !== "undefined" && window.innerWidth >= 768) {
        setActiveConversationId(res.data[0].id);
      }
    }
    setLoadingConversations(false);
  };

  useEffect(() => {
    fetchConversations();
  }, [user?.id]);

  const fetchActiveMessages = async (convId: string) => {
    if (!user) return;
    setLoadingMessages(true);
    const res = await getConversationMessages(convId, user.id);
    if (res.success && res.data) {
      setMessages(res.data);
    }
    setLoadingMessages(false);
    setTimeout(() => scrollToBottom("auto"), 80);
  };

  useEffect(() => {
    if (activeConversationId) {
      fetchActiveMessages(activeConversationId);
    }
  }, [activeConversationId, user?.id]);

  // Realtime listener
  useEffect(() => {
    if (!activeConversationId) return;

    const channel = supabase
      ?.channel(`conversation-${activeConversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "Message",
          filter: `conversationId=eq.${activeConversationId}`,
        },
        (payload: any) => {
          const newMsg = payload.new;
          if (newMsg && newMsg.senderId !== user?.id) {
            setMessages((prev) => [...prev, newMsg]);
            scrollToBottom();
          }
        }
      )
      .subscribe();

    return () => {
      if (channel) {
        supabase?.removeChannel(channel);
      }
    };
  }, [activeConversationId, user?.id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeConversationId || !inputMessage.trim() || isSending) return;

    const text = inputMessage.trim();
    setInputMessage("");

    // Optimistic message
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      content: text,
      senderId: user.id,
      createdAt: new Date().toISOString(),
      status: "sending",
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    scrollToBottom();
    setIsSending(true);

    const res = await sendMessage({
      conversationId: activeConversationId,
      senderId: user.id,
      content: text,
    });
    setIsSending(false);

    if (res.error) {
      toast.error(res.error);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } else if (res.data) {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? res.data : m))
      );
    }
  };

  const activeConv = conversations.find((c) => c.id === activeConversationId);

  // Helper to determine recipient name
  const getRecipientInfo = (conv: any) => {
    if (!conv) return { name: "Chat", isAnon: false };
    if (conv.isAnonymous) {
      return {
        name: conv.incognitoProfile?.handle || "Anonymous Whisperer",
        isAnon: true,
      };
    }
    const otherMember = conv.members?.find((m: any) => m.userId !== user?.id)?.user;
    return {
      name: otherMember?.name || "Student Peer",
      isAnon: false,
    };
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="space-y-1.5 border-b border-border pb-4">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary text-foreground text-xs font-semibold border border-border">
          <MessageSquare className="w-3.5 h-3.5 text-primary" />
          <span>Realtime Campus Messaging</span>
        </div>
        <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Direct Messages & Whispers
        </h1>
      </div>

      {/* Dual Pane Chat Container */}
      <Card className="min-h-[580px] h-[calc(100vh-280px)] overflow-hidden grid grid-cols-1 md:grid-cols-12 border-border">
        {/* Left Pane: Conversations List */}
        <div
          className={`md:col-span-4 border-r border-border flex flex-col h-full bg-card/60 ${
            activeConversationId ? "hidden md:flex" : "flex"
          }`}
        >
          <div className="p-3.5 border-b border-border flex items-center justify-between">
            <span className="font-heading font-bold text-sm text-foreground">
              Conversations ({conversations.length})
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loadingConversations ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 rounded-lg bg-secondary/60 animate-pulse" />
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground space-y-1">
                <MessageSquare className="w-8 h-8 mx-auto opacity-40 mb-2" />
                <p className="font-semibold text-foreground">No active conversations</p>
                <p>Connect with sellers on the marketplace, gig clients, or whisper authors.</p>
              </div>
            ) : (
              conversations.map((conv) => {
                const info = getRecipientInfo(conv);
                const isSelected = conv.id === activeConversationId;
                const lastMsg = conv.messages?.[0];

                return (
                  <button
                    key={conv.id}
                    onClick={() => setActiveConversationId(conv.id)}
                    className={`w-full p-3 rounded-lg text-left transition-colors flex items-start gap-3 ${
                      isSelected
                        ? "bg-secondary text-foreground font-semibold"
                        : "hover:bg-secondary/60 text-muted-foreground"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center flex-shrink-0 text-primary">
                      {info.isAnon ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <User className="w-4 h-4" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-xs text-foreground truncate">
                          {info.name}
                        </span>
                        {info.isAnon && (
                          <Badge variant="outline" size="sm">
                            Anon
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {lastMsg ? lastMsg.content : "Tap to open conversation"}
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
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveConversationId(null)}
                    className="md:hidden p-1.5 rounded-lg border border-border hover:bg-secondary text-muted-foreground hover:text-foreground"
                    aria-label="Back to conversations list"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <div className="w-8 h-8 rounded-lg bg-secondary border border-border flex items-center justify-center text-primary">
                    {getRecipientInfo(activeConv).isAnon ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <User className="w-4 h-4" />
                    )}
                  </div>

                  <div>
                    <h3 className="font-heading font-bold text-sm text-foreground">
                      {getRecipientInfo(activeConv).name}
                    </h3>
                    <span className="text-[11px] text-muted-foreground">
                      {getRecipientInfo(activeConv).isAnon
                        ? "Pseudonymous whisper channel"
                        : "Verified campus student"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Lock className="w-3.5 h-3.5 text-primary" />
                  <span className="hidden sm:inline">Direct Encrypted Session</span>
                </div>
              </div>

              {/* Messages Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-secondary/15">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full text-xs text-muted-foreground gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span>Loading message log...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center p-6 text-xs text-muted-foreground">
                    Start the conversation. Send a message below.
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMine = msg.senderId === user?.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-xl px-3.5 py-2 text-xs leading-relaxed ${
                            isMine
                              ? "bg-primary text-primary-foreground font-medium shadow-xs"
                              : "bg-card border border-border text-foreground shadow-xs"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                          <div
                            className={`text-[9px] mt-1 text-right opacity-75`}
                          >
                            {formatDate(msg.createdAt)}
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
                  placeholder="Type your message..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  size="md"
                  disabled={!inputMessage.trim() || isSending}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-muted-foreground">
              <MessageSquare className="w-10 h-10 opacity-30" />
              <h3 className="font-heading font-bold text-sm text-foreground">
                Select a conversation
              </h3>
              <p className="text-xs max-w-xs">
                Pick a chat from the left panel to read and send messages.
              </p>
            </div>
          )}
        </div>
      </Card>
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
