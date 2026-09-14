"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

import { useUser } from "@/components/providers/UserContext";
import { getDashboardStats } from "@/actions/user.actions";
import { getGigs } from "@/actions/gigs.actions";
import { getRides } from "@/actions/rideshare.actions";
import { getIncognitoPosts } from "@/actions/incognito.actions";
import { getMarketplaceItems } from "@/actions/marketplace.actions";
import { formatPaiseToRupees, formatDate } from "@/lib/utils";
import {
  Briefcase,
  CalendarCheck,
  GraduationCap,
  Search,
  Car,
  EyeOff,
  ShoppingBag,
  Printer,
  ArrowRight,
  AlertTriangle,
  Clock,
  Plus,
  Building2,
} from "lucide-react";

export default function DashboardPage() {
  const { user, isOnCooldown, cooldownHoursRemaining } = useUser();
  const [stats, setStats] = useState<any | null>(null);
  const [latestGigs, setLatestGigs] = useState<any[]>([]);
  const [upcomingRides, setUpcomingRides] = useState<any[]>([]);
  const [trendingWhispers, setTrendingWhispers] = useState<any[]>([]);
  const [recentMarketplace, setRecentMarketplace] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHubData() {
      setLoading(true);

      const [statsRes, gigsRes, ridesRes, postsRes, marketRes] = await Promise.all([
        user?.id ? getDashboardStats(user.id) : Promise.resolve({ success: false, data: null }),
        getGigs(),
        getRides(),
        getIncognitoPosts(),
        getMarketplaceItems(),
      ]);

      if (statsRes.success) setStats(statsRes.data);
      if (gigsRes.success && gigsRes.data) setLatestGigs(gigsRes.data.slice(0, 3));
      if (ridesRes.success && ridesRes.data) setUpcomingRides(ridesRes.data.slice(0, 3));
      if (postsRes.success && postsRes.data) setTrendingWhispers(postsRes.data.slice(0, 3));
      if (marketRes.success && marketRes.data) setRecentMarketplace(marketRes.data.slice(0, 4));

      setLoading(false);
    }

    loadHubData();
  }, [user?.id]);

  const campusName = user?.college?.name || "Global University Network";
  const displayName = user?.name ? user.name.split(" ")[0] : "Student";
  const departmentInfo = user?.department
    ? `${user.department} • Year ${user.year || "1"}`
    : "University Student Hub";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* 1. HERO GREETING BANNER */}
      <div className="relative overflow-hidden rounded-2xl bg-card border border-border p-6 sm:p-10 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-muted-foreground text-xs font-semibold select-none border border-border">
              <Building2 className="w-3.5 h-3.5 text-foreground" />
              <span>{campusName}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-heading text-foreground">
              Welcome back, {displayName}
            </h1>

            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
              {departmentInfo}. Your academic guardrails, peer bounties, and campus collaboration hub are running live.
            </p>
          </div>

          {/* Quick Action Hub Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/gigs">
              <Button size="md" leftIcon={<Briefcase className="w-4 h-4" />}>
                Browse Gigs
              </Button>
            </Link>
            <Link href="/attendance">
              <Button variant="outline" size="md" leftIcon={<CalendarCheck className="w-4 h-4" />}>
                Check 75% Rule
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Freelancer Cooldown Banner (Anti-Hoarding Guardrail) */}
      {isOnCooldown && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div>
              <p className="text-xs font-bold">Freelancer Task Cooldown Active</p>
              <p className="text-[11px] text-destructive/80">
                You abandoned a claimed gig. To ensure peer trust, you cannot claim new tasks for another{" "}
                <span className="font-extrabold">{cooldownHoursRemaining} hour(s)</span>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Live Campus Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-secondary text-foreground flex items-center justify-center border border-border shrink-0">
            <Briefcase className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
              Open Bounties
            </p>
            <p className="text-xl font-bold text-foreground">
              {stats?.activeGigsCount ?? latestGigs.length}
            </p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-secondary text-foreground flex items-center justify-center border border-border shrink-0">
            <Printer className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
              Print Orders
            </p>
            <p className="text-xl font-bold text-foreground">
              {stats?.activePrintOrdersCount ?? 0}
            </p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-secondary text-foreground flex items-center justify-center border border-border shrink-0">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
              Market Deals
            </p>
            <p className="text-xl font-bold text-foreground">
              {recentMarketplace.length}
            </p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-secondary text-foreground flex items-center justify-center border border-border shrink-0">
            <EyeOff className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
              Whisper Posts
            </p>
            <p className="text-xl font-bold text-foreground">
              {trendingWhispers.length}
            </p>
          </div>
        </Card>
      </div>

      {/* Feature Navigation Modules Grid */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground font-heading">
            University Ecosystem Modules
          </h2>
          <p className="text-xs text-muted-foreground">
            Access your student tools, campus peer market, and academic calculators.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Module 1: Print Station */}
          <Link href="/print-station">
            <Card className="h-full p-5 hover:border-foreground/40 transition-colors group">
              <div className="w-9 h-9 rounded-lg bg-secondary text-foreground flex items-center justify-center mb-3 group-hover:scale-105 transition-transform border border-border">
                <Printer className="w-4 h-4" />
              </div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-bold text-foreground group-hover:underline">
                  Campus Print Station
                </h3>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Direct PDF uploads with automated page counting and next-day delivery anywhere in campus.
              </p>
            </Card>
          </Link>

          {/* Module 2: Gig Hub */}
          <Link href="/gigs">
            <Card className="h-full p-5 hover:border-foreground/40 transition-colors group">
              <div className="w-9 h-9 rounded-lg bg-secondary text-foreground flex items-center justify-center mb-3 group-hover:scale-105 transition-transform border border-border">
                <Briefcase className="w-4 h-4" />
              </div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-bold text-foreground group-hover:underline">
                  Peer Gig Hub
                </h3>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Managed Escrow task freelancing with 60% anti-ghosting guarantees and anonymous claims.
              </p>
            </Card>
          </Link>

          {/* Module 3: Attendance Guardrail */}
          <Link href="/attendance">
            <Card className="h-full p-5 hover:border-foreground/40 transition-colors group">
              <div className="w-9 h-9 rounded-lg bg-secondary text-foreground flex items-center justify-center mb-3 group-hover:scale-105 transition-transform border border-border">
                <CalendarCheck className="w-4 h-4" />
              </div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-bold text-foreground group-hover:underline">
                  75% Attendance Rule
                </h3>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Real-time bunk calculators and minimum attendance alerts to prevent exam detentions.
              </p>
            </Card>
          </Link>

          {/* Module 4: CGPA Tracker */}
          <Link href="/cgpa">
            <Card className="h-full p-5 hover:border-foreground/40 transition-colors group">
              <div className="w-9 h-9 rounded-lg bg-secondary text-foreground flex items-center justify-center mb-3 group-hover:scale-105 transition-transform border border-border">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-bold text-foreground group-hover:underline">
                  CGPA Predictor
                </h3>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Credit-weighted SGPA forecasting and target grade calculators for placement prep.
              </p>
            </Card>
          </Link>

          {/* Module 5: Lost & Found */}
          <Link href="/lost-and-found">
            <Card className="h-full p-5 hover:border-foreground/40 transition-colors group">
              <div className="w-9 h-9 rounded-lg bg-secondary text-foreground flex items-center justify-center mb-3 group-hover:scale-105 transition-transform border border-border">
                <Search className="w-4 h-4" />
              </div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-bold text-foreground group-hover:underline">
                  Lost & Found
                </h3>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Instant photo uploads and direct chat claims for misplaced campus items.
              </p>
            </Card>
          </Link>

          {/* Module 6: Cab Split */}
          <Link href="/rideshare">
            <Card className="h-full p-5 hover:border-foreground/40 transition-colors group">
              <div className="w-9 h-9 rounded-lg bg-secondary text-foreground flex items-center justify-center mb-3 group-hover:scale-105 transition-transform border border-border">
                <Car className="w-4 h-4" />
              </div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-bold text-foreground group-hover:underline">
                  Airport Cab Split
                </h3>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Share airport and railway cab fares. Auto-sorted by closest departure times.
              </p>
            </Card>
          </Link>

          {/* Module 7: Whisper Wall */}
          <Link href="/incognito">
            <Card className="h-full p-5 hover:border-foreground/40 transition-colors group">
              <div className="w-9 h-9 rounded-lg bg-secondary text-foreground flex items-center justify-center mb-3 group-hover:scale-105 transition-transform border border-border">
                <EyeOff className="w-4 h-4" />
              </div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-bold text-foreground group-hover:underline">
                  Whisper Wall
                </h3>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Zero-knowledge anonymous student confession feed, memes, and campus secrets.
              </p>
            </Card>
          </Link>

          {/* Module 8: Marketplace */}
          <Link href="/marketplace">
            <Card className="h-full p-5 hover:border-foreground/40 transition-colors group">
              <div className="w-9 h-9 rounded-lg bg-secondary text-foreground flex items-center justify-center mb-3 group-hover:scale-105 transition-transform border border-border">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-bold text-foreground group-hover:underline">
                  Marketplace
                </h3>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Buy and sell second-hand course textbooks, lab kits, cycles, and hostel gear.
              </p>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
