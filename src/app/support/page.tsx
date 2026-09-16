"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Send,
  LifeBuoy,
  FileQuestion,
  CheckCircle2,
  Clock,
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
      toast.error("Please sign in to submit a ticket.");
      return;
    }

    if (!subject.trim() || !message.trim()) {
      toast.error("Please provide both a subject and detailed explanation.");
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
      toast.success("Support ticket submitted to campus moderators.");
      setSubject("");
      setMessage("");
      setTicketType("FEEDBACK");
      setActiveTab("MY_TICKETS");
      fetchTickets();
    }
  };

  return (
    <div className="space-y-8 pb-12 max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-2 border-b border-border pb-6">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary text-foreground text-xs font-semibold border border-border">
          <HelpCircle className="w-3.5 h-3.5 text-primary" />
          <span>Campus Moderation & Resolution</span>
        </div>
        <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Campus Helpdesk & Disputes
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Submit dispute inquiries for print station deliveries, escrow task disagreements, or report community violations.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("NEW")}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === "NEW"
              ? "bg-secondary text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Submit Ticket
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("MY_TICKETS")}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === "MY_TICKETS"
              ? "bg-secondary text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          My Tickets ({tickets.length})
        </button>
      </div>

      {/* Tab: New Ticket */}
      {activeTab === "NEW" ? (
        <Card className="p-6 sm:p-8 space-y-6">
          <form onSubmit={handleSubmitTicket} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Inquiry Category *</label>
              <select
                value={ticketType}
                onChange={(e) => setTicketType(e.target.value as TicketType)}
                className="w-full h-9 px-3 rounded-lg border border-input bg-card text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="FEEDBACK">Platform Feedback / Feature Request</option>
                <option value="BUG">Technical Bug / Payment UTR Issue</option>
                <option value="DISPUTE">Escrow Task Disagreement</option>
                <option value="REPORT">Report Community Rule Violation</option>
                <option value="OTHER">Other Inquiry</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Subject *</label>
              <Input
                placeholder="Brief summary of your inquiry..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Detailed Explanation *</label>
              <Textarea
                placeholder="Provide order IDs, task URLs, transaction references, or relevant context..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                required
              />
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              isLoading={isSubmitting}
              rightIcon={<Send className="w-4 h-4" />}
            >
              Submit Ticket to Moderator
            </Button>
          </form>
        </Card>
      ) : (
        /* Tab: My Tickets */
        <div className="space-y-3">
          {loading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-20 rounded-xl bg-secondary/60 animate-pulse border border-border" />
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <Card className="p-8 text-center text-xs text-muted-foreground space-y-2">
              <FileQuestion className="w-8 h-8 mx-auto opacity-40" />
              <p className="font-semibold text-foreground">No support tickets found</p>
              <p>You have not filed any moderation requests.</p>
            </Card>
          ) : (
            tickets.map((t) => (
              <Card key={t.id} className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <h3 className="font-heading font-bold text-sm text-foreground truncate">
                      {t.subject}
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <Badge variant="secondary" size="sm">
                        {t.type}
                      </Badge>
                      <span>{formatDate(t.createdAt)}</span>
                    </div>
                  </div>

                  <Badge
                    variant={
                      t.status === "RESOLVED"
                        ? "success"
                        : t.status === "IN_PROGRESS"
                        ? "warning"
                        : "default"
                    }
                    size="sm"
                  >
                    {t.status}
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t.message}
                </p>

                {t.adminNotes && (
                  <div className="p-3 rounded-lg bg-secondary/40 border border-border text-xs space-y-1">
                    <span className="font-bold text-foreground">Moderator Resolution:</span>
                    <p className="text-muted-foreground">{t.adminNotes}</p>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
