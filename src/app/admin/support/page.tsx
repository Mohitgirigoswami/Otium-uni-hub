"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@/components/providers/UserContext";
import {
  getAllSupportTicketsAdmin,
  resolveSupportTicketAdmin,
  banUserAdmin,
  unbanUserAdmin,
} from "@/actions/support.actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import {
  LifeBuoy,
  ShieldAlert,
  Bug,
  Sparkles,
  CheckCircle2,
  Clock,
  Filter,
  UserX,
  UserCheck,
  RefreshCw,
  AlertTriangle,
  Gavel,
} from "lucide-react";
import { TicketType, TicketStatus } from "@prisma/client";

export default function AdminSupportPage() {
  const { user } = useUser();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Ban Modal state
  const [isBanModalOpen, setIsBanModalOpen] = useState(false);
  const [targetUser, setTargetUser] = useState<any | null>(null);
  const [banReason, setBanReason] = useState("");
  const [isBanning, setIsBanning] = useState(false);

  const fetchTickets = async () => {
    if (!user) return;
    setLoading(true);
    const res = await getAllSupportTicketsAdmin(user.id);
    if (res.success && res.data) {
      setTickets(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTickets();
  }, [user?.id]);

  const handleResolveTicket = async (ticketId: string) => {
    if (!user) return;
    setActionLoadingId(ticketId);
    const res = await resolveSupportTicketAdmin({
      ticketId,
      adminUserId: user.id,
    });
    setActionLoadingId(null);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Ticket marked as RESOLVED!");
      fetchTickets();
    }
  };

  const openBanModal = (target: any) => {
    setTargetUser(target);
    setBanReason(`Violation of Otium guidelines: Reported in support ticket.`);
    setIsBanModalOpen(true);
  };

  const handleConfirmBan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !targetUser) return;

    setIsBanning(true);
    const res = await banUserAdmin({
      targetUserId: targetUser.id,
      reason: banReason.trim(),
      adminUserId: user.id,
    });
    setIsBanning(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(`⚡ BAN HAMMER EXECUTED: ${targetUser.name} has been suspended.`);
      setIsBanModalOpen(false);
      setTargetUser(null);
      fetchTickets();
    }
  };

  const handleUnban = async (targetUserId: string, targetName: string) => {
    if (!user) return;
    const confirm = window.confirm(`Lift ban and restore full campus access for "${targetName}"?`);
    if (!confirm) return;

    setActionLoadingId(`unban-${targetUserId}`);
    const res = await unbanUserAdmin({
      targetUserId,
      adminUserId: user.id,
    });
    setActionLoadingId(null);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(`Ban lifted for ${targetName}.`);
      fetchTickets();
    }
  };

  const filteredTickets = tickets.filter((t) => {
    if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
    if (typeFilter !== "ALL" && t.type !== typeFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary text-foreground text-xs font-semibold border border-border">
            <Gavel className="w-3.5 h-3.5 text-rose-500" />
            <span>Support & Moderation</span>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Support Helpdesk & Ban Console
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Resolve student tickets, review abuse reports, and manage account suspensions.
          </p>
        </div>

        <Button
          onClick={fetchTickets}
          variant="outline"
          size="sm"
          leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />}
        >
          Refresh Tickets
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-bold uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Filter Status:</span>
          </div>
          {["ALL", "OPEN", "RESOLVED"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                statusFilter === status
                  ? "bg-rose-500 text-white shadow-xs"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {["ALL", "FEEDBACK", "BUG", "REPORT_USER"].map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                typeFilter === type
                  ? "bg-primary text-primary-foreground font-bold"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {type.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </Card>

      {/* Tickets List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-secondary/60 animate-pulse border border-border" />
          ))}
        </div>
      ) : filteredTickets.length === 0 ? (
        <Card className="text-center py-16">
          <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 mb-3 opacity-60" />
          <h3 className="text-base font-bold text-foreground">
            No tickets match your filter criteria
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            All tickets are resolved or no reports submitted in this category.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredTickets.map((t) => {
            const reporter = t.user;
            const isUserBanned = reporter?.isBanned;

            return (
              <Card
                key={t.id}
                className={`p-6 space-y-4 border ${
                  t.type === "REPORT_USER"
                    ? "border-destructive/40 bg-destructive/5"
                    : t.status === "OPEN"
                    ? "border-amber-500/30 bg-card"
                    : "border-border bg-card"
                }`}
              >
                {/* Header: User Info & Ticket Type Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        reporter?.image ||
                        `https://api.dicebear.com/9.x/bottts/svg?seed=${reporter?.name || "Student"}`
                      }
                      alt={reporter?.name}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-border bg-secondary"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground">
                          {reporter?.name || "Anonymous Student"}
                        </span>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          ({reporter?.email})
                        </span>
                        {isUserBanned && (
                          <Badge variant="destructive" size="sm">
                            BANNED USER
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {reporter?.college?.name || "Campus User"} • {reporter?.role}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        t.type === "REPORT_USER"
                          ? "destructive"
                          : t.type === "BUG"
                          ? "warning"
                          : "default"
                      }
                      size="sm"
                    >
                      {t.type.replace(/_/g, " ")}
                    </Badge>

                    <Badge variant={t.status === "RESOLVED" ? "success" : "warning"} size="sm">
                      {t.status}
                    </Badge>
                  </div>
                </div>

                {/* Subject & Message Content */}
                <div className="p-4 rounded-xl bg-secondary/50 border border-border space-y-2">
                  <h3 className="text-sm font-bold text-foreground">
                    {t.subject}
                  </h3>
                  <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                    {t.message}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono pt-1">
                    Submitted: {formatDate(t.createdAt)} • Ticket ID: #{t.id}
                  </p>
                </div>

                {/* Actions: Mark Resolved & Global Ban Hammer */}
                <div className="pt-2 border-t border-border flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {isUserBanned ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-destructive font-semibold">
                          Reason: {reporter?.banReason}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={actionLoadingId === `unban-${reporter?.id}`}
                          onClick={() => handleUnban(reporter?.id, reporter?.name)}
                          className="text-xs"
                          leftIcon={<UserCheck className="w-3.5 h-3.5" />}
                        >
                          Lift Ban
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => openBanModal(reporter)}
                        className="text-xs"
                        leftIcon={<UserX className="w-3.5 h-3.5" />}
                      >
                        Ban User (Ban Hammer)
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {t.status === "OPEN" && (
                      <Button
                        variant="default"
                        size="sm"
                        isLoading={actionLoadingId === t.id}
                        onClick={() => handleResolveTicket(t.id)}
                        className="text-xs font-semibold"
                        leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                      >
                        Mark as Resolved
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Global Ban Modal */}
      <Modal
        isOpen={isBanModalOpen}
        onClose={() => setIsBanModalOpen(false)}
        title="Execute Global Ban Hammer"
      >
        <form onSubmit={handleConfirmBan} className="space-y-4">
          {targetUser && (
            <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div className="text-xs space-y-0.5">
                <p className="font-bold text-destructive">
                  Target Account: {targetUser.name} ({targetUser.email})
                </p>
                <p className="text-destructive/80 text-[11px] mt-0.5">
                  The user will be immediately redirected to /banned and locked out of all app features.
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">
              Official Reason for Suspension *
            </label>
            <textarea
              required
              rows={3}
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="Specify the guidelines violated (e.g., fraudulent escrow claim, abusive behaviour, scamming)..."
              className="w-full px-3.5 py-2.5 rounded-lg bg-card border border-input text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none font-medium"
            />
          </div>

          <div className="pt-3 border-t border-border flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsBanModalOpen(false)}
            >
              Cancel
            </Button>
            <SubmitButton
              isSubmitting={isBanning}
              loadingText="Executing Ban..."
              className="bg-destructive hover:opacity-90"
            >
              Execute Ban
            </SubmitButton>
          </div>
        </form>
      </Modal>
    </div>
  );
}
