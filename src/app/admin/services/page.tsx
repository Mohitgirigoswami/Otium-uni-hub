"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@/components/providers/UserContext";
import { getCampusServices, toggleCampusService } from "@/actions/admin.actions";
import { getColleges } from "@/actions/college.actions";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { toast } from "sonner";
import {
  ShieldCheck,
  Building2,
  Printer,
  EyeOff,
  Briefcase,
  ShoppingBag,
  Car,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Save,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Info,
} from "lucide-react";

const SERVICE_ICONS: Record<string, any> = {
  PRINT_STATION: Printer,
  INCOGNITO_WALL: EyeOff,
  GIG_HUB: Briefcase,
  MARKETPLACE: ShoppingBag,
  CAB_SPLIT: Car,
};

export default function AdminServicesPage() {
  const { user } = useUser();
  const [colleges, setColleges] = useState<any[]>([]);
  const [selectedCampusId, setSelectedCampusId] = useState<string>("");
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);
  const [savingMessageKey, setSavingMessageKey] = useState<string | null>(null);
  const [messagesDraft, setMessagesDraft] = useState<Record<string, string>>({});

  // 1. Fetch Colleges
  useEffect(() => {
    getColleges().then((res) => {
      if (res.success && res.data) {
        setColleges(res.data);
        // Default to user's collegeId, or first available college
        const defaultId = user?.collegeId || res.data[0]?.id || "";
        setSelectedCampusId(defaultId);
      }
    });
  }, [user?.collegeId]);

  // 2. Fetch Campus Services when selectedCampusId changes
  const fetchServices = async (campusId: string) => {
    if (!campusId) return;
    setLoading(true);
    const res = await getCampusServices(campusId);
    if (res.success && res.data) {
      setServices(res.data);
      // Initialize draft messages
      const drafts: Record<string, string> = {};
      res.data.forEach((s: any) => {
        drafts[s.serviceKey] = s.maintenanceMessage || "";
      });
      setMessagesDraft(drafts);
    } else {
      toast.error(res.error || "Failed to load campus services.");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (selectedCampusId) {
      fetchServices(selectedCampusId);
    }
  }, [selectedCampusId]);

  // 3. Toggle Service Status (Optimistic)
  const handleToggle = async (service: any) => {
    if (!selectedCampusId || togglingKey === service.serviceKey) return;

    const nextState = !service.isEnabled;
    const currentMessage = messagesDraft[service.serviceKey] ?? service.maintenanceMessage;

    // Optimistic local state update
    setTogglingKey(service.serviceKey);
    setServices((prev) =>
      prev.map((s) =>
        s.serviceKey === service.serviceKey ? { ...s, isEnabled: nextState } : s
      )
    );

    const res = await toggleCampusService(
      selectedCampusId,
      service.serviceKey,
      nextState,
      currentMessage
    );

    setTogglingKey(null);

    if (res.success) {
      toast.success(
        `${service.serviceName} is now ${nextState ? "ENABLED" : "PAUSED"} for this campus.`
      );
    } else {
      // Revert on error
      setServices((prev) =>
        prev.map((s) =>
          s.serviceKey === service.serviceKey
            ? { ...s, isEnabled: service.isEnabled }
            : s
        )
      );
      toast.error(res.error || "Failed to toggle service.");
    }
  };

  // 4. Save Custom Maintenance Message
  const handleSaveMessage = async (serviceKey: string) => {
    if (!selectedCampusId || savingMessageKey === serviceKey) return;

    const currentService = services.find((s) => s.serviceKey === serviceKey);
    if (!currentService) return;

    const updatedMessage = messagesDraft[serviceKey] || "This service is temporarily paused for your campus.";
    setSavingMessageKey(serviceKey);

    const res = await toggleCampusService(
      selectedCampusId,
      serviceKey,
      currentService.isEnabled,
      updatedMessage
    );

    setSavingMessageKey(null);

    if (res.success) {
      toast.success("Maintenance message updated successfully.");
      setServices((prev) =>
        prev.map((s) =>
          s.serviceKey === serviceKey ? { ...s, maintenanceMessage: updatedMessage } : s
        )
      );
    } else {
      toast.error(res.error || "Failed to save maintenance message.");
    }
  };

  const selectedCampus = colleges.find((c) => c.id === selectedCampusId);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Banner */}
      <GlassCard className="p-6 sm:p-8 bg-gradient-to-r from-indigo-950/60 via-slate-900/60 to-slate-950/60 border-indigo-500/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Campus Module Feature Flags & Maintenance Guardrails</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Campus Service Control Hub
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Granularly pause or enable specific student modules (Print Station, Incognito Wall, Marketplace, Cab Split) on a per-campus basis. Paused modules immediately lock student access and display custom maintenance messaging.
            </p>
          </div>

          {/* Campus Selector */}
          <div className="w-full md:w-72 space-y-1.5 shrink-0 bg-slate-900/80 p-3 rounded-2xl border border-slate-700 shadow-lg">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Active Campus Context</span>
            </label>
            <select
              value={selectedCampusId}
              onChange={(e) => setSelectedCampusId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-600 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {colleges.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.city})
                </option>
              ))}
            </select>
            {selectedCampus && (
              <p className="text-[10px] text-indigo-300 font-medium truncate">
                Managing modules for: {selectedCampus.name}
              </p>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Services Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64 rounded-2xl bg-slate-800/50 animate-pulse border border-slate-700/50" />
          ))}
        </div>
      ) : services.length === 0 ? (
        <GlassCard className="p-12 text-center space-y-3">
          <AlertTriangle className="w-12 h-12 mx-auto text-amber-400 opacity-60" />
          <h3 className="text-base font-bold text-white">No campus services found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Please make sure at least one campus/college is registered in the database.
          </p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {services.map((srv) => {
            const Icon = SERVICE_ICONS[srv.serviceKey] || ShieldCheck;
            const isToggling = togglingKey === srv.serviceKey;
            const isSavingMessage = savingMessageKey === srv.serviceKey;
            const isEnabled = srv.isEnabled;

            return (
              <GlassCard
                key={srv.serviceKey}
                className={`p-6 space-y-5 transition-all border ${
                  isEnabled
                    ? "border-emerald-500/30 bg-emerald-950/10 shadow-emerald-950/20"
                    : "border-rose-500/30 bg-rose-950/10 shadow-rose-950/20"
                }`}
              >
                {/* Header with Icon & Active Toggle Switch */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md ${
                        isEnabled
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                      }`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          {srv.serviceName}
                        </h3>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        KEY: {srv.serviceKey}
                      </span>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <button
                    type="button"
                    onClick={() => handleToggle(srv)}
                    disabled={isToggling}
                    className={`relative inline-flex items-center h-8 rounded-full w-14 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                      isEnabled ? "bg-emerald-600" : "bg-slate-700"
                    }`}
                    title={isEnabled ? "Click to Pause Service" : "Click to Enable Service"}
                  >
                    <span
                      className={`inline-block w-6 h-6 transform bg-white rounded-full transition-transform shadow-md flex items-center justify-center ${
                        isEnabled ? "translate-x-7" : "translate-x-1"
                      }`}
                    >
                      {isToggling ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-700" />
                      ) : isEnabled ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      )}
                    </span>
                  </button>
                </div>

                {/* Status Indicator Badge */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-semibold text-slate-400">
                    Live Campus Status:
                  </span>
                  {isEnabled ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Operational & Active</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-400 text-xs font-bold border border-rose-500/30">
                      <span className="w-2 h-2 rounded-full bg-rose-400" />
                      <span>Temporarily Paused</span>
                    </span>
                  )}
                </div>

                {/* Inline Editable Maintenance Message */}
                <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>Student Maintenance Notice:</span>
                    <span className="text-[10px] text-slate-500 lowercase font-normal">
                      displayed when paused
                    </span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={messagesDraft[srv.serviceKey] ?? ""}
                      onChange={(e) =>
                        setMessagesDraft((prev) => ({
                          ...prev,
                          [srv.serviceKey]: e.target.value,
                        }))
                      }
                      placeholder="e.g., Service paused for scheduled maintenance. Resuming tomorrow at 8 AM."
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSaveMessage(srv.serviceKey)}
                      disabled={isSavingMessage}
                      className="text-xs shrink-0 bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200"
                      leftIcon={
                        isSavingMessage ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Save className="w-3.5 h-3.5" />
                        )
                      }
                    >
                      {isSavingMessage ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
