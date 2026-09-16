"use client";

import React, { useState, useEffect } from "react";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCampusServices } from "@/actions/admin.actions";

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

export function ClientServiceGuard({
  campusId,
  serviceKey,
  children,
}: ClientServiceGuardProps) {
  const [service, setService] = useState<any | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!campusId) {
      setChecked(true);
      return;
    }

    getCampusServices(campusId).then((res) => {
      if (res.success && res.data) {
        const found = res.data.find((s: any) => s.serviceKey === serviceKey);
        setService(found || null);
      }
      setChecked(true);
    });
  }, [campusId, serviceKey]);

  if (!campusId || !checked) {
    return <>{children}</>;
  }

  if (service && !service.isEnabled) {
    return (
      <Card className="min-h-[50vh] flex flex-col items-center justify-center text-center p-8 border-border">
        <div className="h-12 w-12 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4 border border-amber-500/20">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="font-heading text-xl font-bold text-foreground mb-2">
          {service.serviceName || serviceKey} Temporarily Inactive
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-md leading-relaxed mb-6">
          {service.maintenanceMessage ||
            "This module is currently disabled for your campus."}
        </p>
        <Link href="/">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Back to Student Hub
          </Button>
        </Link>
      </Card>
    );
  }

  return <>{children}</>;
}
