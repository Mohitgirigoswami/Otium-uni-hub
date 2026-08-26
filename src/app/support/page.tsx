"use client";

import React, { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { useUser } from "@/components/providers/UserContext";
import {
  createSupportTicket,
  getUserSupportTickets,
} from "@/actions/support.actions";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import {
  HelpCircle,
  MessageSquarePlus,
  ShieldAlert,
  Bug,
  Sparkles,
  CheckCircle2,
  Clock,
  Send,
  LifeBuoy,
  FileQuestion,
  UserX,
} from "lucide-react";
import { TicketType } from "@prisma/client";

export default function SupportPage() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<"NEW" | "MY_TICKETS">("NEW");
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Form states
  const [ticketType, setTicketType] = useState<TicketType>("FEEDBACK");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTickets = async () => {
    if (!user) return;
    setLoading(true);
    const res = await getUserSupportTickets(user.id);
    if (res.success && res.data) {
      setTickets(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (activeTab === "MY_TICKETS") {
      fetchTickets();
    }
  }, [activeTab, user?.id]);

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please login to submit a ticket.");
      return;
    }

    if (!subject.trim() || !message.trim()) {
      toast.error("Please fill in both subject and description.");
      return;
    }

    setIsSubmitting(true);
    const res = await createSupportTicket({
      userId: user.id,
      subject: subject.trim(),
      message: message.trim(),
      type: ticketType,
    });
    setIsSubmitting(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Support ticket submitted! Campus moderators have been notified.");
      setSubject("");
      setMessage("");
      setTicketType("FEEDBACK");
      setActiveTab("MY_TICKETS");
      fetchTickets();
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* Top Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900/95 via-sky-950/90 to-brand-950/95 p-8 sm:p-10 border border-sky-500/30 text-white shadow-2xl backdrop-blur-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-sky-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 -mb-16 w-60 h-60 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-300 text-xs font-semibold">
              <LifeBuoy className="w-3.5 h-3.5" />
              <span>Campus Community Care & Help Desk</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Support, Bug Reports & Appeals
            </h1>
            <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
              Have an issue with an escrow gig, hostel print order, or need to report bad behavior? Our campus moderators are here to help.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
        <button
          onClick={() => setActiveTab("NEW")}
          className={`pb-3 text-sm font-bold transition-colors relative flex items-center gap-2 ${
            activeTab === "NEW"
              ? "text-sky-600 dark:text-sky-400"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <MessageSquarePlus className="w-4 h-4" />
          <span>Submit New Ticket</span>
          {activeTab === "NEW" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-500 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab("MY_TICKETS")}
          className={`pb-3 text-sm font-bold transition-colors relative flex items-center gap-2 ${
            activeTab === "MY_TICKETS"
              ? "text-sky-600 dark:text-sky-400"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>My Tickets ({tickets.length})</span>
          {activeTab === "MY_TICKETS" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-500 rounded-full" />
          )}
        </button>
      </div>

      {/* Tab 1: Submit New Ticket */}
      {activeTab === "NEW" && (
        <GlassCard className="p-6 sm:p-8 space-y-6">
          <form onSubmit={handleSubmitTicket} className="space-y-6">
            {/* Category / Type Selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Ticket Category *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    id: "FEEDBACK" as TicketType,
                    name: "Feature / Feedback",
                    icon: Sparkles,
                    desc: "Suggestions to improve Otium Uni Hub",
                  },
                  {
                    id: "BUG" as TicketType,
                    name: "Bug / Technical Glitch",
                    icon: Bug,
                    desc: "Broken UI, print errors, or failed sync",
                  },
                  {
                    id: "REPORT_USER" as TicketType,
                    name: "Report User / Scam",
                    icon: ShieldAlert,
                    desc: "Harassment, fraud, or ghosted tasks",
                  },
                ].map((type) => {
                  const isSelected = ticketType === type.id;
                  const Icon = type.icon;
                  return (
                    <div
                      key={type.id}
                      onClick={() => setTicketType(type.id)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? "bg-sky-500/15 border-sky-500 shadow-md ring-1 ring-sky-500"
                          : "bg-slate-100/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 hover:bg-slate-200/50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${isSelected ? "text-sky-400" : "text-slate-400"}`} />
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {type.name}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        {type.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Subject / Short Summary *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Writer did not deliver assignment before deadline / Print Station double debit"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Detailed Description *
              </label>
              <textarea
                required
                rows={5}
                placeholder="Please describe what occurred in detail. Include Order IDs, Gig IDs, UTR numbers, or names if reporting a specific incident..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <SubmitButton
                isSubmitting={isSubmitting}
                loadingText="Submitting Ticket..."
                size="lg"
                className="bg-sky-600 hover:bg-sky-500 shadow-lg shadow-sky-600/25"
                leftIcon={<Send className="w-4 h-4" />}
              >
                Submit Support Ticket
              </SubmitButton>
            </div>
          </form>
        </GlassCard>
      )}

      {/* Tab 2: My Tickets */}
      {activeTab === "MY_TICKETS" && (
        <div className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-28 rounded-2xl bg-slate-200/50 dark:bg-slate-800 animate-pulse" />
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <GlassCard className="text-center py-16">
              <FileQuestion className="w-12 h-12 mx-auto text-slate-400 mb-3 opacity-60" />
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
                No tickets submitted yet
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                You have not opened any support queries or complaints.
              </p>
              <Button
                variant="brand"
                size="sm"
                className="mt-4"
                onClick={() => setActiveTab("NEW")}
              >
                Create a Ticket
              </Button>
            </GlassCard>
          ) : (
            <div className="space-y-4">
              {tickets.map((t) => (
                <GlassCard key={t.id} className="p-5 space-y-3 border-slate-200 dark:border-slate-800">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-400 font-bold">
                          #{t.id.slice(-6)}
                        </span>
                        <Badge
                          variant={
                            t.type === "REPORT_USER"
                              ? "danger"
                              : t.type === "BUG"
                              ? "warning"
                              : "brand"
                          }
                          size="sm"
                        >
                          {t.type.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {t.subject}
                      </h3>
                    </div>

                    <Badge variant={t.status === "RESOLVED" ? "success" : "warning"} size="sm">
                      {t.status}
                    </Badge>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                    {t.message}
                  </p>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Submitted: {formatDate(t.createdAt)}</span>
                    {t.status === "RESOLVED" && (
                      <span className="flex items-center gap-1 text-emerald-400 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Resolved by Campus Admin</span>
                      </span>
                    )}
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
