"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@/components/providers/UserContext";
import { getAdminAuditLogs } from "@/actions/audit.actions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ShieldAlert,
  Search,
  RefreshCw,
  Clock,
  User,
  Activity,
  FileText,
  CheckCircle2,
  Database,
  Filter,
} from "lucide-react";

export default function AdminLogsPage() {
  const { user } = useUser();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");

  const fetchLogs = async () => {
    if (!user) return;
    setLoading(true);
    const res = await getAdminAuditLogs(user.id);
    if (res.success && res.data) {
      setLogs(res.data);
    } else {
      toast.error(res.error || "Failed to load audit logs.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [user?.id]);

  const filteredLogs = logs.filter((log) => {
    if (actionFilter !== "ALL" && log.action !== actionFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const adminName = log.admin?.name?.toLowerCase() || "";
      const adminEmail = log.admin?.email?.toLowerCase() || "";
      const action = log.action.toLowerCase();
      const details = (log.details || "").toLowerCase();
      return (
        adminName.includes(q) ||
        adminEmail.includes(q) ||
        action.includes(q) ||
        details.includes(q)
      );
    }
    return true;
  });

  const getActionBadgeVariant = (action: string) => {
    if (action.includes("BANNED") || action.includes("REJECTED")) return "danger";
    if (action.includes("VERIFIED") || action.includes("CONFIRMED")) return "success";
    if (action.includes("UPDATED_UPI") || action.includes("RATES")) return "warning";
    return "brand";
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-foreground flex items-center gap-2.5">
            <Activity className="w-7 h-7 text-primary" />
            <span>Admin Audit Logger & Security Trail</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Immutable system logs tracking master UPI edits, ban hammer actions, payment approvals, and role updates.
          </p>
        </div>

        <Button
          onClick={fetchLogs}
          variant="outline"
          size="sm"
          leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />}
        >
          Refresh Logs
        </Button>
      </div>

      {/* Search and Action Filter */}
      <Card className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by admin, action, or details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          {["ALL", "UPDATED_UPI", "BANNED_USER", "VERIFIED_PAYMENT", "UPDATED_USER_ROLE"].map(
            (act) => (
              <button
                key={act}
                onClick={() => setActionFilter(act)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                  actionFilter === act
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-muted/50 border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {act.replace(/_/g, " ")}
              </button>
            )
          )}
        </div>
      </Card>

      {/* Audit Log Table */}
      <Card className="overflow-hidden p-0">
        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 rounded-xl bg-muted/60 animate-pulse" />
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-16">
            <Database className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-60" />
            <h3 className="text-base font-heading font-bold text-foreground">
              No audit logs on record
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Actions by Super Admins will appear here with full timestamps.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  <th className="py-3 px-4">Admin Operator</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Details</th>
                  <th className="py-3 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    {/* Admin Profile */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={
                            log.admin?.image ||
                            `https://api.dicebear.com/9.x/bottts/svg?seed=${log.admin?.name || "Admin"}`
                          }
                          alt={log.admin?.name}
                          className="w-7 h-7 rounded-full object-cover ring-1 ring-primary/40"
                        />
                        <div>
                          <p className="font-bold text-foreground">
                            {log.admin?.name || "Super Admin"}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            {log.admin?.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4">
                      <Badge variant={getActionBadgeVariant(log.action)} size="sm">
                        {log.action}
                      </Badge>
                    </td>

                    {/* Details */}
                    <td className="py-3.5 px-4 font-mono text-muted-foreground max-w-md break-words">
                      {log.details || "—"}
                    </td>

                    {/* Timestamp */}
                    <td className="py-3.5 px-4 text-right font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
