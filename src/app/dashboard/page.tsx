"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";
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
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Flame,
  CheckCircle2,
  TrendingUp,
  Clock,
  Heart,
  Plus,
  LogIn,
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

  const displayName = user?.name || "Student";
  const departmentInfo = user?.department
    ? `${user.department} • Year ${user.year || 1}`
    : user?.college?.name || "University Hub";

  return (
    <div className="space-y-10">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900/95 via-brand-950/90 to-electric-950/95 p-8 sm:p-12 border border-brand-500/30 text-white shadow-2xl backdrop-blur-2xl">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 w-72 h-72 bg-accent-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-black/60 border border-white/20 text-brand-300 text-xs font-bold tracking-wide backdrop-blur-md">
              <img src="/logo.png" alt="Otium" className="w-4 h-4 object-contain" />
              <span>Otium University Super App Ecosystem</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight font-sans">
              Welcome back,{" "}
              <span className="bg-gradient-to-r from-teal-300 via-brand-300 to-electric-300 bg-clip-text text-transparent">
                {displayName}
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
              {departmentInfo}. Your academic guardrails, peer bounties, and campus collaboration hub are running live.
            </p>
          </div>

          {/* Quick Action Hub Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/gigs">
              <Button
                variant="brand"
                size="lg"
                leftIcon={<Briefcase className="w-5 h-5" />}
                className="shadow-xl shadow-brand-500/20"
              >
                Browse Gigs
              </Button>
            </Link>
            <Link href="/attendance">
              <Button
                variant="glass"
                size="lg"
                leftIcon={<CalendarCheck className="w-5 h-5" />}
              >
                Check 75% Rule
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Freelancer Cooldown Banner (Anti-Hoarding Guardrail) */}
      {isOnCooldown && (
        <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <p className="text-xs font-bold">Freelancer Task Cooldown Active</p>
              <p className="text-[11px] text-amber-700 dark:text-amber-300">
                You abandoned a claimed gig. To ensure peer trust, you cannot claim new tasks for another{" "}
                <span className="font-extrabold">{cooldownHoursRemaining} hour(s)</span>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Live Campus Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <GlassCard className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-500/15 flex items-center justify-center text-brand-600 dark:text-brand-400">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Open Bounties
            </p>
            <p className="text-lg font-black text-slate-900 dark:text-white">
              {stats?.activeGigsCount ?? latestGigs.length}
            </p>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/15 flex items-center justify-center text-teal-600 dark:text-teal-400">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Print Orders
            </p>
            <p className="text-lg font-black text-slate-900 dark:text-white">
              {stats?.activePrintOrdersCount ?? 0}
            </p>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Market Deals
            </p>
            <p className="text-lg font-black text-slate-900 dark:text-white">
              {recentMarketplace.length}
            </p>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent-500/15 flex items-center justify-center text-accent-600 dark:text-accent-400">
            <EyeOff className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Whisper Posts
            </p>
            <p className="text-lg font-black text-slate-900 dark:text-white">
              {trendingWhispers.length}
            </p>
          </div>
        </GlassCard>
      </div>

      {/* Feature Navigation Modules Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              University Ecosystem Modules
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Access your student tools, campus peer market, and academic calculators.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Module 1: Print Station */}
          <Link href="/print-station">
            <GlassCard
              interactive
              className="h-full border-teal-500/20 hover:border-teal-500/60 group"
            >
              <div className="w-10 h-10 rounded-xl bg-teal-500/15 flex items-center justify-center text-teal-600 dark:text-teal-400 mb-4 group-hover:scale-110 transition-transform">
                <Printer className="w-5 h-5" />
              </div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-teal-500 transition-colors">
                  Hostel Cloud Print
                </h3>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Direct PDF uploads with automated page counting and next-day delivery anywhere in campus.
              </p>
            </GlassCard>
          </Link>

          {/* Module 2: Gig Hub */}
          <Link href="/gigs">
            <GlassCard
              interactive
              className="h-full border-brand-500/20 hover:border-brand-500/60 group"
            >
              <div className="w-10 h-10 rounded-xl bg-brand-500/15 flex items-center justify-center text-brand-600 dark:text-brand-400 mb-4 group-hover:scale-110 transition-transform">
                <Briefcase className="w-5 h-5" />
              </div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-brand-500 transition-colors">
                  Peer Gig Hub
                </h3>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Managed Escrow task freelancing with 60% anti-ghosting guarantees and anonymous claims.
              </p>
            </GlassCard>
          </Link>

          {/* Module 3: Attendance Guardrail */}
          <Link href="/attendance">
            <GlassCard
              interactive
              className="h-full border-emerald-500/20 hover:border-emerald-500/60 group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-emerald-500 transition-colors">
                  75% Attendance Rule
                </h3>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Real-time bunk calculators and minimum attendance alerts to prevent exam detentions.
              </p>
            </GlassCard>
          </Link>

          {/* Module 4: CGPA Tracker */}
          <Link href="/cgpa">
            <GlassCard
              interactive
              className="h-full border-electric-500/20 hover:border-electric-500/60 group"
            >
              <div className="w-10 h-10 rounded-xl bg-electric-500/15 flex items-center justify-center text-electric-600 dark:text-electric-400 mb-4 group-hover:scale-110 transition-transform">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-electric-500 transition-colors">
                  CGPA Predictor
                </h3>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Credit-weighted SGPA forecasting and target grade calculators for placement prep.
              </p>
            </GlassCard>
          </Link>

          {/* Module 5: Lost & Found */}
          <Link href="/lost-and-found">
            <GlassCard
              interactive
              className="h-full border-sky-500/20 hover:border-sky-500/60 group"
            >
              <div className="w-10 h-10 rounded-xl bg-sky-500/15 flex items-center justify-center text-sky-600 dark:text-sky-400 mb-4 group-hover:scale-110 transition-transform">
                <Search className="w-5 h-5" />
              </div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-sky-500 transition-colors">
                  Lost & Found
                </h3>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Instant photo uploads and direct chat claims for misplaced campus items.
              </p>
            </GlassCard>
          </Link>

          {/* Module 6: Cab Split */}
          <Link href="/rideshare">
            <GlassCard
              interactive
              className="h-full border-indigo-500/20 hover:border-indigo-500/60 group"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 group-hover:scale-110 transition-transform">
                <Car className="w-5 h-5" />
              </div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-500 transition-colors">
                  Airport Cab Split
                </h3>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Share airport and railway cab fares. Auto-sorted by closest departure times.
              </p>
            </GlassCard>
          </Link>

          {/* Module 7: Whisper Wall */}
          <Link href="/incognito">
            <GlassCard
              interactive
              className="h-full border-accent-500/20 hover:border-accent-500/60 group"
            >
              <div className="w-10 h-10 rounded-xl bg-accent-500/15 flex items-center justify-center text-accent-600 dark:text-accent-400 mb-4 group-hover:scale-110 transition-transform">
                <EyeOff className="w-5 h-5" />
              </div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-accent-500 transition-colors">
                  Whisper Wall
                </h3>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Zero-knowledge confessions and advice with auto-generated robot bottts avatars.
              </p>
            </GlassCard>
          </Link>

          {/* Module 8: Marketplace */}
          <Link href="/marketplace">
            <GlassCard
              interactive
              className="h-full border-amber-500/20 hover:border-amber-500/60 group"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-4 group-hover:scale-110 transition-transform">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors">
                  Student Marketplace
                </h3>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Peer-to-peer buy & sell for textbooks, cycles, coolers, and semester essentials.
              </p>
            </GlassCard>
          </Link>
        </div>
      </div>

      {/* Two Column Grid: Live Feed Previews */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Latest Gigs */}
        <GlassCard className="p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-brand-500" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Live Peer Bounties
              </h3>
            </div>
            <Link
              href="/gigs"
              className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
            >
              <span>Explore Hub</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {latestGigs.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                No active gigs right now. Post the first bounty!
              </p>
            ) : (
              latestGigs.map((gig) => (
                <Link key={gig.id} href={`/gigs/${gig.id}`} className="block">
                  <div className="p-3.5 rounded-2xl bg-slate-100/70 dark:bg-slate-800/40 hover:bg-slate-200/70 dark:hover:bg-slate-800/80 transition-colors flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="brand" size="sm">
                          {gig.category}
                        </Badge>
                        <span className="text-[10px] text-slate-400">
                          {formatDate(gig.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {gig.title}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-sm font-black text-emerald-500 block">
                        ₹{(gig.budget / 100).toFixed(0)}
                      </span>
                      <span className="text-[10px] text-slate-400">Escrow Protected</span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </GlassCard>

        {/* Right: Trending Campus Whispers */}
        <GlassCard className="p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <EyeOff className="w-5 h-5 text-accent-500" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Trending Campus Whispers
              </h3>
            </div>
            <Link
              href="/incognito"
              className="text-xs font-bold text-accent-600 dark:text-accent-400 hover:underline flex items-center gap-1"
            >
              <span>Open Wall</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {trendingWhispers.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                The whisper wall is quiet right now.
              </p>
            ) : (
              trendingWhispers.map((whisper) => (
                <Link key={whisper.id} href="/incognito" className="block">
                  <div className="p-3.5 rounded-2xl bg-slate-100/70 dark:bg-slate-800/40 hover:bg-slate-200/70 dark:hover:bg-slate-800/80 transition-colors space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-purple-400">
                        @{whisper.profile?.handle || "AnonBot"}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {formatDate(whisper.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2">
                      {whisper.content}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
