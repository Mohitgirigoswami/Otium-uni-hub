"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Printer,
  EyeOff,
  Briefcase,
  ShoppingBag,
  Car,
  Search,
  CalendarCheck,
  GraduationCap,
  ArrowLeft,
  Wrench,
  RefreshCw,
  Home,
  ShieldAlert,
  Building2,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { getCampusServices } from "@/actions/admin.actions";
import { toast } from "sonner";

export type CampusServiceKey =
  | "PRINT_STATION"
  | "INCOGNITO_WALL"
  | "GIG_HUB"
  | "MARKETPLACE"
  | "CAB_SPLIT"
  | "LOST_AND_FOUND"
  | "ATTENDANCE"
  | "CGPA_CALCULATOR";

interface ClientServiceGuardProps {
  campusId?: string | null;
  serviceKey: CampusServiceKey;
  children: React.ReactNode;
}

interface ServiceMeta {
  title: string;
  subtitle: string;
  defaultReason: string;
  icon: React.ElementType;
}

const SERVICE_META: Record<CampusServiceKey, ServiceMeta> = {
  PRINT_STATION: {
    title: "Print Dispatch Temporarily Offline",
    subtitle: "Campus Print Hub Maintenance",
    defaultReason:
      "Print operators are restocking paper cartridges or clearing print queues. Service will resume shortly.",
    icon: Printer,
  },
  CAB_SPLIT: {
    title: "Transit Splits on Hold",
    subtitle: "Campus Travel Safety Interlock",
    defaultReason:
      "Ride share coordination is temporarily paused during campus curfew or transit calibration.",
    icon: Car,
  },
  MARKETPLACE: {
    title: "Marketplace Under Scheduled Review",
    subtitle: "Student Escrow & Catalog Audit",
    defaultReason:
      "Peer-to-peer listings and escrow settlement are undergoing standard moderation review.",
    icon: ShoppingBag,
  },
  INCOGNITO_WALL: {
    title: "Whisper Wall Cooldown Active",
    subtitle: "Campus Moderation Filter Sync",
    defaultReason:
      "Campus anonymous boards are undergoing an automated sentiment reset and safety calibration.",
    icon: EyeOff,
  },
  GIG_HUB: {
    title: "Student Task Hub Paused",
    subtitle: "Escrow Verification Window",
    defaultReason:
      "Campus gig deposits and release disbursements are temporarily held for escrow ledger validation.",
    icon: Briefcase,
  },
  LOST_AND_FOUND: {
    title: "Lost & Found Desk Updating",
    subtitle: "Security Registry Synchronization",
    defaultReason:
      "Misplaced item registry is currently syncing verified recovery records with campus security.",
    icon: Search,
  },
  ATTENDANCE: {
    title: "Attendance Engine Syncing",
    subtitle: "University ERP Interlock",
    defaultReason:
      "Course session databases are synchronizing with university academic schedules.",
    icon: CalendarCheck,
  },
  CGPA_CALCULATOR: {
    title: "Grade Calibration in Progress",
    subtitle: "Credit Matrix Calibration",
    defaultReason:
      "Grading curves and credit weight systems are undergoing routine university maintenance.",
    icon: GraduationCap,
  },
};

export function ClientServiceGuard({
  campusId,
  serviceKey,
  children,
}: ClientServiceGuardProps) {
  const [service, setService] = useState<any | null>(null);
  const [checked, setChecked] = useState(false);
  const [isPinging, setIsPinging] = useState(false);

  const fetchServiceState = useCallback(
    async (showFeedback = false) => {
      if (!campusId) {
        setChecked(true);
        return;
      }
      if (showFeedback) setIsPinging(true);

      try {
        const res = await getCampusServices(campusId);
        if (res.success && res.data) {
          const found = res.data.find((s: any) => s.serviceKey === serviceKey);
          setService(found || null);
          if (showFeedback) {
            if (found && found.isEnabled) {
              toast.success("Service is back online! Unlocking access...");
            } else {
              toast.info("Campus service is still under maintenance. Please check back soon.");
            }
          }
        }
      } catch {
        if (showFeedback) toast.error("Failed to connect to campus service monitor.");
      } finally {
        setChecked(true);
        if (showFeedback) setIsPinging(false);
      }
    },
    [campusId, serviceKey]
  );

  useEffect(() => {
    fetchServiceState();
  }, [fetchServiceState]);

  if (!campusId || !checked) {
    return <>{children}</>;
  }

  if (service && !service.isEnabled) {
    const meta = SERVICE_META[serviceKey] || {
      title: `${service.serviceName || serviceKey} Inactive`,
      subtitle: "Campus Operations Interlock",
      defaultReason: "This module is temporarily inactive for your campus.",
      icon: Wrench,
    };
    const ServiceIcon = meta.icon;

    return (
      <div className="w-full max-w-3xl mx-auto py-8 px-4 sm:px-6 select-none">
        <Card className="relative overflow-hidden p-6 sm:p-10 border-border shadow-lg">
          {/* Subtle Ambient Sonar Rings */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none -z-0">
            <div className="w-80 h-80 rounded-full border border-amber-500/10 animate-sonar-pulse" />
            <div className="w-[28rem] h-[28rem] rounded-full border border-amber-500/5 animate-sonar-pulse [animation-delay:1.5s]" />
          </div>

          <div className="relative z-10 flex flex-col items-center text-center space-y-6">
            {/* Pulsing Beacon / Module Icon */}
            <div className="relative flex items-center justify-center">
              {/* Animated Radar Pulse behind Icon */}
              <motion.div
                className="absolute inset-0 rounded-2xl bg-amber-500/20"
                animate={{ scale: [1, 1.35, 1], opacity: [0.7, 0, 0.7] }}
                transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
              />
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-card border-2 border-amber-500/40 text-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/10">
                <ServiceIcon className="w-8 h-8 sm:w-10 sm:h-10 animate-beacon-hazard" />
              </div>

              {/* Maintenance Tool Tag */}
              <div className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-amber-500 text-amber-950 flex items-center justify-center border-2 border-card shadow-sm">
                <Wrench className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Status & Subtitle */}
            <div className="space-y-2 max-w-lg">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-xs font-semibold border border-amber-500/20">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <span>{meta.subtitle}</span>
              </div>

              <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                {service.serviceName || meta.title}
              </h2>

              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {service.maintenanceMessage || meta.defaultReason}
              </p>
            </div>

            {/* Admin Notice Card */}
            <div className="w-full max-w-md p-4 rounded-xl bg-secondary/50 border border-border text-left space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-primary" />
                  Campus Dispatch Notice
                </span>
                <Badge variant="outline" size="sm" className="text-[10px] font-mono">
                  ACTIVE_INTERLOCK
                </Badge>
              </div>

              <p className="text-xs text-foreground font-medium leading-relaxed">
                {service.maintenanceMessage ? (
                  <span>&ldquo;{service.maintenanceMessage}&rdquo;</span>
                ) : (
                  meta.defaultReason
                )}
              </p>

              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span>Engineers & campus administrators are actively updating this module.</span>
              </div>
            </div>

            {/* Interactive Actions */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Button
                onClick={() => fetchServiceState(true)}
                variant="outline"
                size="md"
                disabled={isPinging}
                leftIcon={
                  isPinging ? (
                    <Spinner variant="orbit" size="xs" colorClassName="text-foreground" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )
                }
              >
                {isPinging ? "Querying Campus Gateway..." : "Ping Service Status"}
              </Button>

              <Link href="/">
                <Button
                  variant="default"
                  size="md"
                  leftIcon={<Home className="w-4 h-4" />}
                >
                  Return to Student Hub
                </Button>
              </Link>
            </div>

            {/* Unaffected Alternatives */}
            <div className="w-full max-w-md pt-4 border-t border-border/60">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Explore Available Campus Services
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Link href="/print-station">
                  <div className="p-2.5 rounded-lg bg-secondary/40 border border-border hover:border-primary/50 transition-colors flex items-center gap-2.5 text-left group">
                    <Printer className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-foreground truncate">
                        Print Station
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        Hostel drop-offs
                      </div>
                    </div>
                  </div>
                </Link>

                <Link href="/gigs">
                  <div className="p-2.5 rounded-lg bg-secondary/40 border border-border hover:border-primary/50 transition-colors flex items-center gap-2.5 text-left group">
                    <Briefcase className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-foreground truncate">
                        Student Gigs
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        Campus micro-tasks
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
