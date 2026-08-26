"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@/components/providers/UserContext";
import {
  getAllSupportTicketsAdmin,
  resolveSupportTicketAdmin,
  banUserAdmin,
  unbanUserAdmin,
} from "@/actions/support.actions";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Gavel className="w-7 h-7 text-rose-500" />
            <span>Support Helpdesk & Global Ban Console</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Resolve student tickets, review abuse reports, and invoke the Global Ban Hammer to protect the community.
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
      <GlassCard className="p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Filter Status:</span>
          </div>
          {["ALL", "OPEN", "RESOLVED"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                statusFilter === status
                  ? "bg-rose-500 text-white shadow-md shadow-rose-500/20"
                  : "bg-slate-100 dark:bg-slate-800/60 text-slate-400 hover:text-white"
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
                  ? "bg-brand-500 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {type.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </GlassCard>

      {/* Tickets List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-slate-200/50 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : filteredTickets.length === 0 ? (
        <GlassCard className="text-center py-16">
          <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-400 mb-3 opacity-60" />
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
            No tickets match your filter criteria
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            All tickets are resolved or no reports submitted in this category.
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-4">
          {filteredTickets.map((t) => {
            const reporter = t.user;
            const isUserBanned = reporter?.isBanned;

            return (
              <GlassCard
                key={t.id}
                className={`p-6 space-y-4 border ${
                  t.type === "REPORT_USER"
                    ? "border-rose-500/30 bg-rose-500/5"
                    : t.status === "OPEN"
                    ? "border-amber-500/30"
                    : "border-slate-200 dark:border-slate-800"
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
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-700"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          {reporter?.name || "Anonymous Student"}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          ({reporter?.email})
                        </span>
                        {isUserBanned && (
                          <Badge variant="danger" size="sm">
                            BANNED USER
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {reporter?.college?.name || "Campus User"} • {reporter?.role}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
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

                    <Badge variant={t.status === "RESOLVED" ? "success" : "warning"} size="sm">
                      {t.status}
                    </Badge>
                  </div>
                </div>

                {/* Subject & Message Content */}
                <div className="p-4 rounded-2xl bg-white/40 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    {t.subject}
                  </h3>
                  <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {t.message}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono pt-1">
                    Submitted: {formatDate(t.createdAt)} • Ticket ID: #{t.id}
                  </p>
                </div>

                {/* Actions: Mark Resolved & Global Ban Hammer */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {isUserBanned ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-rose-400 font-semibold">
                          Reason: {reporter?.banReason}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={actionLoadingId === `unban-${reporter?.id}`}
                          onClick={() => handleUnban(reporter?.id, reporter?.name)}
                          className="text-xs text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                          leftIcon={<UserCheck className="w-3.5 h-3.5" />}
                        >
                          Lift Ban
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => openBanModal(reporter)}
                        className="text-xs bg-rose-600/80 hover:bg-rose-600"
                        leftIcon={<UserX className="w-3.5 h-3.5" />}
                      >
                        Ban User (Ban Hammer)
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {t.status === "OPEN" && (
                      <Button
                        variant="brand"
                        size="sm"
                        isLoading={actionLoadingId === t.id}
                        onClick={() => handleResolveTicket(t.id)}
                        className="text-xs bg-emerald-600 hover:bg-emerald-500"
                        leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                      >
                        Mark as Resolved
                      </Button>
                    )}
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Ban Hammer Confirmation Modal */}
      <Modal
        isOpen={isBanModalOpen}
        onClose={() => setIsBanModalOpen(false)}
        title="⚡ Invoke Global Ban Hammer"
        description="Permanently suspend this user from accessing Otium Uni Hub services."
        maxWidth="md"
      >
        <form onSubmit={handleConfirmBan} className="space-y-4 pt-2">
          {targetUser && (
            <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              <div className="text-xs">
                <p className="font-bold text-rose-300">
                  Target Account: {targetUser.name} ({targetUser.email})
                </p>
                <p className="text-rose-400/80 text-[11px] mt-0.5">
                  The user will be immediately redirected to /banned and locked out of all app features.
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Official Reason for Suspension *
            </label>
            <textarea
              required
              rows={3}
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="Specify the guidelines violated (e.g., fraudulent escrow claim, abusive behaviour, scamming)..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-rose-500 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none font-medium"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
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
              className="bg-rose-600 hover:bg-rose-500"
            >
              Execute Ban
            </SubmitButton>
          </div>
        </form>
      </Modal>
    </div>
  );
}
