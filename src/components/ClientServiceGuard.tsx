"use client";

import React, { useState, useEffect } from "react";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { getCampusServices } from "@/actions/admin.actions";

interface ClientServiceGuardProps {
  campusId?: string | null;
  serviceKey: "PRINT_STATION" | "INCOGNITO_WALL" | "MARKETPLACE" | "CAB_SPLIT";
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
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 bg-black text-white rounded-3xl border border-neutral-800 shadow-2xl">
        <div className="h-14 w-14 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4 border border-amber-500/20 shadow-lg">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold mb-2">
          {service.serviceName || serviceKey} Temporarily Paused
        </h2>
        <p className="text-sm text-neutral-400 max-w-md leading-relaxed mb-6">
          {service.maintenanceMessage ||
            "This service is currently unavailable at your campus."}
        </p>
        <Link href="/">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Return to Student Hub
          </Button>
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
