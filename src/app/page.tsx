"use client";

import React, { useState } from "react";
import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useUser } from "@/components/providers/UserContext";
import {
  Printer,
  EyeOff,
  Briefcase,
  ShieldCheck,
  Zap,
  ArrowRight,
  CheckCircle2,
  Lock,
  Sparkles,
  Search,
  Car,
  CalendarCheck,
  GraduationCap,
  ShoppingBag,
  ChevronDown,
  HelpCircle,
  Users,
  Award,
  Clock,
  Layers,
  ArrowUpRight,
} from "lucide-react";

export default function LandingPage() {
  const { user } = useUser();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const FAQS = [
    {
      q: "How does the Hostel Cloud Print Station work?",
      a: "Upload your documents directly from your phone or laptop. Our server automatically counts exact pages and computes the lowest double-sided rate. Once paid via locked UPI QR, our print managers process and deliver the physical copies directly anywhere in campus with next-day delivery.",
    },
    {
      q: "Is my identity completely safe on the Whisper Wall?",
      a: "Yes! The Whisper Wall uses cryptographic blind IDs and pseudonyms. Your real name, university email, and roll number are never linked to your public posts, comments, or anonymous peer messages.",
    },
    {
      q: "How does the 50/50 Managed Escrow protect Writers and Buyers?",
      a: "When a student claims an assignment bounty, the buyer deposits a 50% advance locked in Otium Escrow. The writer only begins working after Admin verifies the deposit. Writers are protected with a 60% Anti-Ghosting Guarantee if a buyer ever abandons the order.",
    },
    {
      q: "Can I split airport and railway cab rides with students from my campus?",
      a: "Yes! RideSplit allows hostelers to post upcoming trips or join existing cab bookings with verified campus peers, saving up to 75% on individual airport taxi fares.",
    },
  ];

  return (
    <div className="space-y-24 pb-20 overflow-hidden">
      {/* 1. HERO SECTION */}
      <section className="relative pt-6 sm:pt-12 text-center max-w-5xl mx-auto space-y-8">
        {/* Glowing Background Ambiance */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-brand-600/20 via-teal-500/15 to-electric-500/20 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Top Innovation Pill */}
        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-slate-900/90 border border-teal-500/30 text-teal-300 text-xs font-bold shadow-xl shadow-teal-950/40 backdrop-blur-xl animate-fade-in">
          <img src="/logo.png" alt="Otium Logo" className="w-4 h-4 object-contain" />
          <span>The Next-Gen University Super-App Ecosystem</span>
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping" />
        </div>

        {/* Main Hero Headline */}
        <div className="space-y-4">
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white font-sans leading-[1.1]">
            The Ultimate <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-teal-300 via-brand-400 to-electric-400 bg-clip-text text-transparent">
              Campus Super-App
            </span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed font-medium">
            Zero-queue hostel printing, safe escrow peer freelancing, anonymous campus confessions, and student carpooling—all under unified university trust.
          </p>
        </div>

        {/* Primary Call to Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          {user ? (
            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button
                variant="brand"
                size="lg"
                className="w-full sm:w-auto text-base shadow-2xl shadow-brand-500/30 bg-gradient-to-r from-brand-600 to-teal-500 hover:from-brand-500 hover:to-teal-400 font-bold group"
                rightIcon={<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
              >
                Go to Student Dashboard
              </Button>
            </Link>
          ) : (
            <Link href="/login" className="w-full sm:w-auto">
              <Button
                variant="brand"
                size="lg"
                className="w-full sm:w-auto text-base shadow-2xl shadow-brand-500/30 bg-gradient-to-r from-brand-600 to-teal-500 hover:from-brand-500 hover:to-teal-400 font-bold group"
                rightIcon={<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
              >
                Join the Campus Hub
              </Button>
            </Link>
          )}

          <a href="#services" className="w-full sm:w-auto">
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto text-base border-slate-700 hover:bg-slate-800/60 font-semibold"
            >
              Explore Live Modules
            </Button>
          </a>
        </div>

        {/* Live Metrics Trust Strip */}
        <div className="pt-8 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
            <div className="flex items-center gap-2 text-teal-400 mb-1">
              <Printer className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Fast Prints</span>
            </div>
            <p className="text-2xl font-black text-white">Next Day</p>
            <p className="text-[11px] text-slate-400">Anywhere in campus</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
            <div className="flex items-center gap-2 text-emerald-400 mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Escrow Guard</span>
            </div>
            <p className="text-2xl font-black text-white">60% Shield</p>
            <p className="text-[11px] text-slate-400">Anti-ghosting guarantee</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
            <div className="flex items-center gap-2 text-purple-400 mb-1">
              <EyeOff className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Whisper Wall</span>
            </div>
            <p className="text-2xl font-black text-white">100% Anon</p>
            <p className="text-[11px] text-slate-400">Zero-knowledge blind hash</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
            <div className="flex items-center gap-2 text-amber-400 mb-1">
              <Car className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">RideSplit</span>
            </div>
            <p className="text-2xl font-black text-white">Save 75%</p>
            <p className="text-[11px] text-slate-400">Airport & station cabs</p>
          </div>
        </div>
      </section>

      {/* 2. THE 3 CORE PILLARS (INTERACTIVE SHOWCASE) */}
      <section id="services" className="space-y-12 max-w-6xl mx-auto">
        <div className="text-center space-y-3">
          <Badge variant="brand" size="md">
            Core Service Pillars
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Engineered to Solve Daily Campus Friction
          </h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">
            Three foundational pillars that turn hours of queueing, awkward peer deals, and exam stress into seamless automated workflows.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Pillar 1: Print Station */}
          <GlassCard className="p-8 space-y-6 border-teal-500/30 bg-gradient-to-b from-teal-950/20 to-slate-950/60 relative overflow-hidden flex flex-col justify-between group hover:border-teal-500/60 transition-all">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30 shadow-lg shadow-teal-950/40">
                <Printer className="w-6 h-6" />
              </div>
              <Badge variant="success" size="sm">
                Zero-Queue Printing
              </Badge>
              <h3 className="text-xl font-bold text-white group-hover:text-teal-400 transition-colors">
                Hostel Cloud Print Station
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Upload your assignment PDFs anytime. Exact page counts are computed instantly with automatic double-sided rate optimization. Next-day delivery straight to anywhere in campus.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700/60 text-xs space-y-1 font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Page Detection:</span>
                  <span className="text-teal-400 font-bold">Auto (pdf-lib)</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Delivery Speed:</span>
                  <span className="text-white font-bold">Next Day Delivery</span>
                </div>
              </div>

              <Link href="/print-station" className="block">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs font-bold border-teal-500/30 text-teal-300 hover:bg-teal-500/20"
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                >
                  Open Print Station
                </Button>
              </Link>
            </div>
          </GlassCard>

          {/* Pillar 2: Whisper Wall */}
          <GlassCard className="p-8 space-y-6 border-purple-500/30 bg-gradient-to-b from-purple-950/20 to-slate-950/60 relative overflow-hidden flex flex-col justify-between group hover:border-purple-500/60 transition-all">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30 shadow-lg shadow-purple-950/40">
                <EyeOff className="w-6 h-6" />
              </div>
              <Badge variant="purple" size="sm">
                Anonymous Campus Feed
              </Badge>
              <h3 className="text-xl font-bold text-white group-hover:text-purple-400 transition-colors">
                Whisper Wall & Secrets
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Share unfiltered exam tips, course feedback, hostel confessions, and campus memes. Shielded behind cryptographic pseudonyms and custom robot avatars.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700/60 text-xs space-y-1 font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Privacy Level:</span>
                  <span className="text-purple-400 font-bold">Zero-Knowledge</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Peer DMs:</span>
                  <span className="text-white font-bold">Blind Hash Encrypted</span>
                </div>
              </div>

              <Link href="/incognito" className="block">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs font-bold border-purple-500/30 text-purple-300 hover:bg-purple-500/20"
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                >
                  Visit Whisper Wall
                </Button>
              </Link>
            </div>
          </GlassCard>

          {/* Pillar 3: Task Gigs */}
          <GlassCard className="p-8 space-y-6 border-emerald-500/30 bg-gradient-to-b from-emerald-950/20 to-slate-950/60 relative overflow-hidden flex flex-col justify-between group hover:border-emerald-500/60 transition-all">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shadow-lg shadow-emerald-950/40">
                <Briefcase className="w-6 h-6" />
              </div>
              <Badge variant="brand" size="sm">
                Peer Task Bounties
              </Badge>
              <h3 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors">
                Gig Hub & Freelancing
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Post or claim coding assignments, presentation decks, and lab write-ups. Protected by 50/50 Managed Escrow with a 60% anti-ghosting guarantee for writers.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700/60 text-xs space-y-1 font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Buyer Model:</span>
                  <span className="text-emerald-400 font-bold">50% Advance Escrow</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Writer Payout:</span>
                  <span className="text-white font-bold">100% Loss-Aversion Free</span>
                </div>
              </div>

              <Link href="/gigs" className="block">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs font-bold border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                >
                  Browse Task Bounties
                </Button>
              </Link>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* 3. ADDITIONAL CAMPUS UTILITIES */}
      <section className="space-y-8 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <Badge variant="neutral" size="sm">
              All-In-One Toolkit
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              Complete Academic & Campus Lifestyle Suite
            </h2>
          </div>
          <p className="text-xs text-slate-400 max-w-sm">
            Everything you need for seamless college life, packed into a single responsive app.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Module: Attendance */}
          <Link href="/attendance">
            <GlassCard interactive className="h-full p-6 space-y-3 border-emerald-500/20 hover:border-emerald-500/50 group">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors">
                75% Attendance Rule
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Smart bunk calculator and detention warnings so you never fall below the university threshold.
              </p>
            </GlassCard>
          </Link>

          {/* Module: CGPA */}
          <Link href="/cgpa">
            <GlassCard interactive className="h-full p-6 space-y-3 border-electric-500/20 hover:border-electric-500/50 group">
              <div className="w-10 h-10 rounded-xl bg-electric-500/15 text-electric-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <GraduationCap className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white group-hover:text-electric-400 transition-colors">
                CGPA Forecaster
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Credit-weighted SGPA trackers and future target GPA calculators for placement season.
              </p>
            </GlassCard>
          </Link>

          {/* Module: RideSplit */}
          <Link href="/rideshare">
            <GlassCard interactive className="h-full p-6 space-y-3 border-indigo-500/20 hover:border-indigo-500/50 group">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Car className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors">
                Airport Cab Split
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Share airport and railway station cabs with verified campus peers to split taxi fares.
              </p>
            </GlassCard>
          </Link>

          {/* Module: Lost & Found */}
          <Link href="/lost-and-found">
            <GlassCard interactive className="h-full p-6 space-y-3 border-sky-500/20 hover:border-sky-500/50 group">
              <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Search className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-white group-hover:text-sky-400 transition-colors">
                Lost & Found Directory
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                One-snap photo reporting and direct verified messaging to recover misplaced belongings.
              </p>
            </GlassCard>
          </Link>
        </div>
      </section>

      {/* 4. TRUST & SECURITY MATRIX */}
      <section className="max-w-6xl mx-auto p-8 sm:p-12 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl space-y-8">
        <div className="text-center space-y-2">
          <Badge variant="brand" size="sm">
            Security & Trust Architecture
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Built with Strict University Safeguards
          </h2>
          <p className="text-xs text-slate-400 max-w-lg mx-auto">
            We prioritize student safety, financial escrow integrity, and cryptographic privacy at every layer.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-xs">
          <div className="p-4 rounded-2xl bg-black/40 border border-slate-800 space-y-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <h4 className="font-bold text-white text-sm">Escrow Protection</h4>
            <p className="text-slate-400 leading-relaxed">
              Bounty funds are locked in advance escrow and verified before writer handover.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-black/40 border border-slate-800 space-y-2">
            <Lock className="w-6 h-6 text-purple-400" />
            <h4 className="font-bold text-white text-sm">Zero-Knowledge Feed</h4>
            <p className="text-slate-400 leading-relaxed">
              Confessions and whispers use cryptographic blind hash aliases to protect identity.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-black/40 border border-slate-800 space-y-2">
            <Zap className="w-6 h-6 text-teal-400" />
            <h4 className="font-bold text-white text-sm">Amount-Locked UPI</h4>
            <p className="text-slate-400 leading-relaxed">
              QR codes automatically lock transaction values in banking apps to eliminate manual error.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-black/40 border border-slate-800 space-y-2">
            <Users className="w-6 h-6 text-sky-400" />
            <h4 className="font-bold text-white text-sm">Campus Moderator Hub</h4>
            <p className="text-slate-400 leading-relaxed">
              Admin control panels, moderator audit logs, and instant service kill switches.
            </p>
          </div>
        </div>
      </section>

      {/* 5. FREQUENTLY ASKED QUESTIONS (FAQ) */}
      <section className="max-w-3xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <Badge variant="neutral" size="sm">
            Got Questions?
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <GlassCard
                key={idx}
                interactive
                onClick={() => toggleFaq(idx)}
                className="p-5 border-slate-800 cursor-pointer space-y-2"
              >
                <div className="flex items-center justify-between gap-4">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-teal-400 shrink-0" />
                    <span>{faq.q}</span>
                  </h4>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform ${
                      isOpen ? "rotate-180 text-teal-400" : ""
                    }`}
                  />
                </div>
                {isOpen && (
                  <p className="text-xs text-slate-300 leading-relaxed pl-6 pt-1">
                    {faq.a}
                  </p>
                )}
              </GlassCard>
            );
          })}
        </div>
      </section>

      {/* 6. BOTTOM CALL TO ACTION BANNER */}
      <section className="max-w-5xl mx-auto">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-950/90 via-slate-900/95 to-brand-950/90 p-8 sm:p-12 border border-teal-500/30 text-center space-y-6 shadow-2xl backdrop-blur-2xl">
          <div className="w-14 h-14 rounded-2xl bg-black border border-white/20 p-2 mx-auto flex items-center justify-center shadow-xl">
            <img src="/logo.png" alt="Otium Logo" className="w-full h-full object-contain" />
          </div>

          <div className="space-y-2 max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Ready to Upgrade Your Campus Life?
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              Join thousands of university peers already saving hours on printing, earning safe income, and connecting anonymously.
            </p>
          </div>

          <div className="pt-2">
            <Link href={user ? "/dashboard" : "/login"}>
              <Button
                variant="brand"
                size="lg"
                className="shadow-2xl shadow-teal-500/30 bg-gradient-to-r from-teal-500 to-brand-600 hover:from-teal-400 hover:to-brand-500 font-bold px-8"
                rightIcon={<ArrowRight className="w-5 h-5" />}
              >
                {user ? "Open Dashboard" : "Get Started with Google Single Sign-On"}
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
