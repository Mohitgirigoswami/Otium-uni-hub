"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Compass,
  ArrowLeft,
  Home,
  Printer,
  Briefcase,
  ShoppingBag,
  Search,
  RotateCcw,
  Radar,
  Radio,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function NotFoundPage() {
  const router = useRouter();

  const quickLinks = [
    {
      title: "Campus Hub",
      desc: "Live student dashboard & updates",
      href: "/",
      icon: Home,
    },
    {
      title: "Print Station",
      desc: "Fast hostel drop-off printing",
      href: "/print-station",
      icon: Printer,
    },
    {
      title: "Student Gigs",
      desc: "Campus tasks with escrow protection",
      href: "/gigs",
      icon: Briefcase,
    },
    {
      title: "Marketplace",
      desc: "Buy & sell textbooks, lab coats, cycles",
      href: "/marketplace",
      icon: ShoppingBag,
    },
    {
      title: "Lost & Found",
      desc: "Report or retrieve misplaced items",
      href: "/lost-and-found",
      icon: Search,
    },
  ];

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden select-none">
      {/* Dynamic Background Telemetry Rings */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center -z-10">
        <div className="w-[500px] h-[500px] rounded-full border border-border/30 animate-sonar-pulse" />
        <div className="w-[700px] h-[700px] rounded-full border border-border/15 animate-sonar-pulse [animation-delay:1.5s]" />
      </div>

      <div className="w-full max-w-2xl flex flex-col items-center text-center space-y-8">
        {/* Animated Radar Telemetry Station */}
        <div className="relative flex items-center justify-center">
          {/* Radar Frame */}
          <div className="relative w-44 h-44 sm:w-52 sm:h-52 rounded-full border-2 border-border/80 bg-card/70 backdrop-blur-md flex items-center justify-center shadow-xl overflow-hidden">
            {/* Concentric Radar Grid Rings */}
            <div className="absolute w-3/4 h-3/4 rounded-full border border-border/40" />
            <div className="absolute w-1/2 h-1/2 rounded-full border border-border/30" />
            <div className="absolute w-1/4 h-1/4 rounded-full border border-border/20" />

            {/* Crosshairs */}
            <div className="absolute w-full h-[1px] bg-border/40" />
            <div className="absolute h-full w-[1px] bg-border/40" />

            {/* Rotating Sweep Arm */}
            <motion.div
              className="absolute inset-0 origin-center"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
            >
              <div
                className="w-1/2 h-1/2 absolute top-0 left-1/2 origin-bottom-left"
                style={{
                  background:
                    "conic-gradient(from 0deg at 0% 100%, var(--glow-color, rgba(6, 182, 212, 0.4)) 0deg, transparent 60deg)",
                }}
              />
              <div className="w-1/2 h-[2px] bg-primary absolute top-1/2 left-1/2 origin-left shadow-[0_0_8px_var(--primary)]" />
            </motion.div>

            {/* Lost Coordinate Blip */}
            <motion.div
              className="absolute top-12 right-12 w-3.5 h-3.5 rounded-full bg-destructive flex items-center justify-center shadow-lg shadow-destructive/50"
              animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-destructive-foreground" />
            </motion.div>

            {/* Center Compass Origin */}
            <div className="relative z-10 w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center shadow-inner">
              <Compass className="w-4 h-4 text-primary animate-spin [animation-duration:12s]" />
            </div>
          </div>

          {/* Satellite Telemetry Tag */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="absolute -bottom-3 px-3 py-1 rounded-full bg-background border border-border text-[10px] font-mono text-muted-foreground shadow-sm flex items-center gap-1.5"
          >
            <Radio className="w-3 h-3 text-destructive animate-pulse" />
            <span>ERR_COORD_NOT_FOUND: SECTOR_NULL</span>
          </motion.div>
        </div>

        {/* 404 Headline & Explanation */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2">
            <Badge variant="outline" size="sm" className="font-mono text-xs">
              HTTP 404
            </Badge>
            <span className="text-xs text-muted-foreground font-mono">
              LAT: 28.5355° N / LNG: 77.3910° E
            </span>
          </div>

          <h1 className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Lost in the Quad? Coordinate Not Found
          </h1>

          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            The campus route, listing, or dispatch you requested doesn&apos;t exist, has expired, or has relocated to another sector.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            onClick={() => router.back()}
            variant="outline"
            size="md"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Go Back
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

        {/* Quick Navigation Command Deck */}
        <div className="w-full pt-4 space-y-3 text-left">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Direct Campus Portals
            </span>
            <span className="text-[11px] text-muted-foreground">
              Select an active sector
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {quickLinks.map((item, idx) => {
              const Icon = item.icon;
              return (
                <Link key={idx} href={item.href} className="group">
                  <motion.div
                    whileHover={{ y: -2, scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="p-3.5 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors flex items-start gap-3 shadow-sm group-hover:shadow-md"
                  >
                    <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors flex-shrink-0 border border-border/50">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-heading text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {item.desc}
                      </div>
                    </div>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
