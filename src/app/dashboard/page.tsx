"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@/components/providers/UserContext";
import { getDashboardStats } from "@/actions/user.actions";
import { getGigs } from "@/actions/gigs.actions";
import { getRides } from "@/actions/rideshare.actions";
import { getIncognitoPosts } from "@/actions/incognito.actions";
import { getMarketplaceItems } from "@/actions/marketplace.actions";
import { formatPaiseToRupees, formatDate } from "@/lib/utils";
import {
  Printer,
  CalendarCheck,
  GraduationCap,
  Briefcase,
  ShoppingBag,
  EyeOff,
  Car,
  Search,
  ArrowRight,
  Clock,
  Building2,
  AlertTriangle,
  Plus,
} from "lucide-react";

export default function DashboardPage() {
  const { user } = useUser();
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

      if (statsRes.success) setStats(statsRes.data?.stats || statsRes.data);
      if (gigsRes.success && gigsRes.data) setLatestGigs(gigsRes.data.slice(0, 3));
      if (ridesRes.success && ridesRes.data) setUpcomingRides(ridesRes.data.slice(0, 3));
      if (postsRes.success && postsRes.data) setTrendingWhispers(postsRes.data.slice(0, 3));
      if (marketRes.success && marketRes.data) setRecentMarketplace(marketRes.data.slice(0, 4));

      setLoading(false);
    }

    loadHubData();
  }, [user?.id]);

  const campusName = user?.college?.name || "All Campuses";
  const displayName = user?.name ? user.name.split(" ")[0] : "Student";
  const departmentInfo = user?.department
    ? `${user.department} | Year ${user.year || "1"}`
    : "University Student Hub";

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Header Greeting Card */}
      <Card className="p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary text-foreground text-xs font-semibold border border-border">
              <Building2 className="w-3.5 h-3.5 text-primary" />
              <span>{campusName}</span>
            </div>

            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Welcome back, {displayName}
            </h1>

            <p className="text-xs sm:text-sm text-muted-foreground">
              {departmentInfo}. Your campus utilities, attendance metrics, and active orders are listed below.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link href="/print-station">
              <Button size="md" leftIcon={<Printer className="w-4 h-4" />}>
                New Print Job
              </Button>
            </Link>
            <Link href="/attendance">
              <Button variant="outline" size="md" leftIcon={<CalendarCheck className="w-4 h-4" />}>
                Check Attendance
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* 2. Operational Metrics Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 sm:p-5 space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Pending Prints</span>
            <Printer className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold font-heading text-foreground">
            {stats?.activePrintOrders ?? stats?.activePrintJobs ?? 0}
          </div>
          <p className="text-[11px] text-muted-foreground">Active delivery queue</p>
        </Card>

        <Card className="p-4 sm:p-5 space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Attendance Safety</span>
            <CalendarCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-heading text-foreground">
            {stats?.attendancePercentage !== undefined ? `${stats.attendancePercentage}%` : "Track"}
          </div>
          <p className="text-[11px] text-muted-foreground">Average across logged courses</p>
        </Card>

        <Card className="p-4 sm:p-5 space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Open Tasks</span>
            <Briefcase className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold font-heading text-foreground">
            {latestGigs.length}
          </div>
          <p className="text-[11px] text-muted-foreground">Available campus bounties</p>
        </Card>

        <Card className="p-4 sm:p-5 space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Campus Listings</span>
            <ShoppingBag className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold font-heading text-foreground">
            {stats?.activeListings ?? recentMarketplace.length}
          </div>
          <p className="text-[11px] text-muted-foreground">Active student items</p>
        </Card>
      </div>

      {/* 3. Two-Column Live Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Gigs & Marketplace */}
        <div className="space-y-6">
          {/* Active Gigs */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-primary" />
                <h3 className="font-heading font-bold text-sm text-foreground">
                  Available Campus Gigs
                </h3>
              </div>
              <Link href="/gigs" className="text-xs font-semibold text-primary hover:underline">
                View All
              </Link>
            </div>

            {loading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-14 rounded-lg bg-secondary/60 animate-pulse" />
                ))}
              </div>
            ) : latestGigs.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                No active tasks posted at the moment.
              </p>
            ) : (
              <div className="space-y-2.5">
                {latestGigs.map((gig) => (
                  <Link
                    key={gig.id}
                    href={`/gigs/${gig.id}`}
                    className="block p-3 rounded-lg border border-border bg-card/60 hover:bg-secondary/50 transition-colors fluid-interactive"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="font-semibold text-xs text-foreground truncate">
                          {gig.title}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <Badge variant="secondary" size="sm">
                            {gig.category}
                          </Badge>
                          <span>{gig.deadline ? formatDate(gig.deadline) : "Flexible"}</span>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-foreground flex-shrink-0">
                        {formatPaiseToRupees(gig.budget ?? gig.budgetPaise)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          {/* Student Marketplace Listings */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-primary" />
                <h3 className="font-heading font-bold text-sm text-foreground">
                  Campus Marketplace
                </h3>
              </div>
              <Link href="/marketplace" className="text-xs font-semibold text-primary hover:underline">
                Browse Items
              </Link>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 gap-2.5">
                {[1, 2].map((i) => (
                  <div key={i} className="h-20 rounded-lg bg-secondary/60 animate-pulse" />
                ))}
              </div>
            ) : recentMarketplace.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                No classified listings currently available.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {recentMarketplace.map((item) => (
                  <Link
                    key={item.id}
                    href="/marketplace"
                    className="p-3 rounded-lg border border-border bg-card/60 hover:bg-secondary/50 transition-colors space-y-1.5 fluid-interactive"
                  >
                    <div className="font-semibold text-xs text-foreground truncate">
                      {item.title}
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-foreground">
                        {formatPaiseToRupees(item.price ?? item.pricePaise)}
                      </span>
                      <Badge variant="outline" size="sm">
                        {item.condition.replace("_", " ")}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Whisper Wall & Rideshare */}
        <div className="space-y-6">
          {/* Anonymous Whisper Feed Preview */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <EyeOff className="w-4 h-4 text-primary" />
                <h3 className="font-heading font-bold text-sm text-foreground">
                  Campus Whispers
                </h3>
              </div>
              <Link href="/incognito" className="text-xs font-semibold text-primary hover:underline">
                Open Wall
              </Link>
            </div>

            {loading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-16 rounded-lg bg-secondary/60 animate-pulse" />
                ))}
              </div>
            ) : trendingWhispers.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                No whispers posted yet on this campus feed.
              </p>
            ) : (
              <div className="space-y-2.5">
                {trendingWhispers.map((whisper) => (
                  <Link
                    key={whisper.id}
                    href={`/incognito/${whisper.id}`}
                    className="block p-3 rounded-lg border border-border bg-card/60 hover:bg-secondary/50 transition-colors space-y-1.5 fluid-interactive"
                  >
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="font-mono text-foreground font-medium">
                        @{whisper.authorHandle}
                      </span>
                      <span>{formatDate(whisper.createdAt)}</span>
                    </div>
                    <p className="text-xs text-foreground line-clamp-2 leading-relaxed">
                      {whisper.content}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          {/* Upcoming Cab Splits */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 text-primary" />
                <h3 className="font-heading font-bold text-sm text-foreground">
                  Active Cab & Auto Splits
                </h3>
              </div>
              <Link href="/rideshare" className="text-xs font-semibold text-primary hover:underline">
                All Rides
              </Link>
            </div>

            {loading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-14 rounded-lg bg-secondary/60 animate-pulse" />
                ))}
              </div>
            ) : upcomingRides.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                No split trips scheduled for today.
              </p>
            ) : (
              <div className="space-y-2.5">
                {upcomingRides.map((ride) => (
                  <Link
                    key={ride.id}
                    href="/rideshare"
                    className="block p-3 rounded-lg border border-border bg-card/60 hover:bg-secondary/50 transition-colors fluid-interactive"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="font-semibold text-foreground truncate">
                        {ride.origin} to {ride.destination}
                      </div>
                      <span className="font-bold text-foreground">
                        {formatPaiseToRupees(ride.splitCostEstimate ?? ride.splitCostEstimatePaise)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1">
                      <span>{formatDate(ride.departureTime)}</span>
                      <span>{ride.availableSeats} seat(s) open</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
