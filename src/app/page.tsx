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
  CalendarCheck,
  GraduationCap,
  ShieldCheck,
  Zap,
  ArrowRight,
  Lock,
  Sparkles,
  Users,
  ChevronDown,
  HelpCircle,
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
      a: "Yes! The Whisper Wall uses anonymous student pseudonyms and robot avatars. Your real name, university email, and roll number are never linked to your public posts, comments, or peer messages.",
    },
    {
      q: "How does the 75% Attendance Guardrail calculate bunks?",
      a: "The attendance rule engine evaluates your current attended vs total lectures in real time. If below 75%, it calculates the exact consecutive classes needed to avoid debarment. If above 75%, it calculates how many classes you can safely bunk.",
    },
    {
      q: "How does the CGPA Forecaster work?",
      a: "It uses exact credit weights (1-6 credits per course) and letter grade scales to compute your active semester SGPA, archives transcript history, and simulates the target SGPA required in upcoming semesters to achieve your placement goal.",
    },
  ];

  return (
    <div className="w-full max-w-full overflow-x-hidden space-y-20 sm:space-y-28 pb-20">
      {/* 1. HERO SECTION */}
      <section className="relative pt-6 sm:pt-12 text-center max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Glowing Background Ambiance */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[600px] h-[300px] sm:h-[350px] bg-gradient-to-tr from-brand-600/20 via-teal-500/15 to-electric-500/20 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Top Innovation Pill */}
        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-slate-900/90 border border-teal-500/30 text-teal-300 text-xs font-bold shadow-xl shadow-teal-950/40 backdrop-blur-xl animate-fade-in">
          <img src="/logo.png" alt="Otium Logo" className="w-4 h-4 object-contain" />
          <span>The Next-Gen University Super-App Ecosystem</span>
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping" />
        </div>

        {/* Main Hero Headline */}
        <div className="space-y-4">
          <h1 className="text-4xl font-extrabold leading-tight md:text-6xl text-white tracking-tight font-sans">
            The Ultimate <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-teal-300 via-brand-400 to-electric-400 bg-clip-text text-transparent">
              Campus Super-App
            </span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed font-medium">
            Zero-queue cloud printing, anonymous campus whispers, 75% attendance guardrails, and credit-weighted CGPA calculators—engineered for daily college life.
          </p>
        </div>

        {/* Primary Call to Actions */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 pt-2 w-full max-w-md mx-auto md:max-w-none">
          {user ? (
            <Link href="/dashboard" className="w-full md:w-auto">
              <Button
                variant="brand"
                size="lg"
                className="w-full md:w-auto min-h-[48px] h-12 text-base font-bold shadow-2xl shadow-teal-500/25 bg-gradient-to-r from-brand-600 to-teal-500 hover:from-brand-500 hover:to-teal-400 group px-8"
                rightIcon={<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
              >
                Go to Student Dashboard
              </Button>
            </Link>
          ) : (
            <Link href="/login" className="w-full md:w-auto">
              <Button
                variant="brand"
                size="lg"
                className="w-full md:w-auto min-h-[48px] h-12 text-base font-bold shadow-2xl shadow-teal-500/25 bg-gradient-to-r from-brand-600 to-teal-500 hover:from-brand-500 hover:to-teal-400 group px-8"
                rightIcon={<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
              >
                Join the Campus Hub
              </Button>
            </Link>
          )}

          <a href="#services" className="w-full md:w-auto">
            <Button
              variant="outline"
              size="lg"
              className="w-full md:w-auto min-h-[48px] h-12 text-base border-slate-700 hover:bg-slate-800/60 font-semibold px-8"
            >
              Explore Phase 1 Modules
            </Button>
          </a>
        </div>

        {/* Live Metrics Trust Strip */}
        <div className="pt-8 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto text-left">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
            <div className="flex items-center gap-2 text-teal-400 mb-1">
              <Printer className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Fast Prints</span>
            </div>
            <p className="text-xl sm:text-2xl font-black text-white">Next Day</p>
            <p className="text-[11px] text-slate-400">Anywhere in campus</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
            <div className="flex items-center gap-2 text-purple-400 mb-1">
              <EyeOff className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Whisper Wall</span>
            </div>
            <p className="text-xl sm:text-2xl font-black text-white">100% Anon</p>
            <p className="text-[11px] text-slate-400">Private student aliases</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
            <div className="flex items-center gap-2 text-emerald-400 mb-1">
              <CalendarCheck className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Attendance</span>
            </div>
            <p className="text-xl sm:text-2xl font-black text-white">75% Guard</p>
            <p className="text-[11px] text-slate-400">Bunk & deficit predictor</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
            <div className="flex items-center gap-2 text-electric-400 mb-1">
              <GraduationCap className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">CGPA Engine</span>
            </div>
            <p className="text-xl sm:text-2xl font-black text-white">10.0 Scale</p>
            <p className="text-[11px] text-slate-400">Target grade simulator</p>
          </div>
        </div>
      </section>

      {/* 2. PHASE 1 CORE FEATURE GRID (SINGLE COLUMN ON MOBILE, 2 COLS ON MD, 4 COLS ON LG) */}
      <section id="services" className="space-y-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3">
          <Badge variant="brand" size="md">
            Phase 1 Launch Scope
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Engineered to Solve Daily Campus Friction
          </h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">
            Four foundational campus utilities that eliminate printing queues, exam debarment stress, anonymous secrets, and GPA confusion.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Print Station */}
          <GlassCard className="p-6 sm:p-7 space-y-6 border-teal-500/30 bg-gradient-to-b from-teal-950/20 to-slate-950/60 relative overflow-hidden flex flex-col justify-between group hover:border-teal-500/60 transition-all">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30 shadow-lg shadow-teal-950/40">
                <Printer className="w-6 h-6" />
              </div>
              <Badge variant="success" size="sm">
                Next-Day Delivery
              </Badge>
              <h3 className="text-xl font-bold text-white group-hover:text-teal-400 transition-colors">
                Hostel Print Station
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Direct PDF uploads with instant automated page detection. Best duplex rates and next-day delivery anywhere in campus.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700/60 text-xs space-y-1 font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Page Detection:</span>
                  <span className="text-teal-400 font-bold">Instant Auto</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Delivery:</span>
                  <span className="text-white font-bold">Next Day</span>
                </div>
              </div>

              <Link href="/print-station" className="block">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs font-bold border-teal-500/30 text-teal-300 hover:bg-teal-500/20 min-h-[44px]"
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                >
                  Open Print Station
                </Button>
              </Link>
            </div>
          </GlassCard>

          {/* Card 2: Whisper Wall */}
          <GlassCard className="p-6 sm:p-7 space-y-6 border-purple-500/30 bg-gradient-to-b from-purple-950/20 to-slate-950/60 relative overflow-hidden flex flex-col justify-between group hover:border-purple-500/60 transition-all">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30 shadow-lg shadow-purple-950/40">
                <EyeOff className="w-6 h-6" />
              </div>
              <Badge variant="purple" size="sm">
                100% Anonymous
              </Badge>
              <h3 className="text-xl font-bold text-white group-hover:text-purple-400 transition-colors">
                Whisper Wall & Secrets
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Unfiltered course tips, confessions, and campus memes. Shielded behind anonymous robot avatars and private student aliases.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700/60 text-xs space-y-1 font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Privacy Level:</span>
                  <span className="text-purple-400 font-bold">100% Private</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Direct Chats:</span>
                  <span className="text-white font-bold">Hidden Identity</span>
                </div>
              </div>

              <Link href="/incognito" className="block">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs font-bold border-purple-500/30 text-purple-300 hover:bg-purple-500/20 min-h-[44px]"
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                >
                  Visit Whisper Wall
                </Button>
              </Link>
            </div>
          </GlassCard>

          {/* Card 3: Attendance Guardrail */}
          <GlassCard className="p-6 sm:p-7 space-y-6 border-emerald-500/30 bg-gradient-to-b from-emerald-950/20 to-slate-950/60 relative overflow-hidden flex flex-col justify-between group hover:border-emerald-500/60 transition-all">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shadow-lg shadow-emerald-950/40">
                <CalendarCheck className="w-6 h-6" />
              </div>
              <Badge variant="success" size="sm">
                Debarment Shield
              </Badge>
              <h3 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors">
                Attendance Guardrail
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Real-time bunk calculators and minimum attendance warnings to prevent exam debarment across enrolled courses.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700/60 text-xs space-y-1 font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Threshold:</span>
                  <span className="text-emerald-400 font-bold">75% Minimum</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Calculations:</span>
                  <span className="text-white font-bold">Consecutive Bunks</span>
                </div>
              </div>

              <Link href="/attendance" className="block">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs font-bold border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 min-h-[44px]"
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                >
                  Track Attendance
                </Button>
              </Link>
            </div>
          </GlassCard>

          {/* Card 4: CGPA Forecaster */}
          <GlassCard className="p-6 sm:p-7 space-y-6 border-electric-500/30 bg-gradient-to-b from-electric-950/20 to-slate-950/60 relative overflow-hidden flex flex-col justify-between group hover:border-electric-500/60 transition-all">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-electric-500/20 text-electric-400 flex items-center justify-center border border-electric-500/30 shadow-lg shadow-electric-950/40">
                <GraduationCap className="w-6 h-6" />
              </div>
              <Badge variant="neutral" size="sm">
                Credit-Weighted
              </Badge>
              <h3 className="text-xl font-bold text-white group-hover:text-electric-400 transition-colors">
                CGPA Forecaster
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Credit-weighted SGPA calculations, semester transcript history, and target grade planning for upcoming placement seasons.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700/60 text-xs space-y-1 font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Weighting:</span>
                  <span className="text-electric-400 font-bold">1-6 Credits</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Target Sim:</span>
                  <span className="text-white font-bold">Required SGPA</span>
                </div>
              </div>

              <Link href="/cgpa" className="block">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs font-bold border-electric-500/30 text-electric-300 hover:bg-electric-500/20 min-h-[44px]"
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                >
                  Calculate CGPA
                </Button>
              </Link>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* 3. TRUST & SECURITY MATRIX */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-6 sm:p-10 md:p-12 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl space-y-8">
          <div className="text-center space-y-2">
            <Badge variant="brand" size="sm">
              Security & Trust Architecture
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Built with Strict University Safeguards
            </h2>
            <p className="text-xs text-slate-400 max-w-lg mx-auto">
              We prioritize student privacy, financial integrity, and verified campus security at every layer.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 text-xs">
            <div className="p-4 rounded-2xl bg-black/40 border border-slate-800 space-y-2">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
              <h4 className="font-bold text-white text-sm">Escrow Protection</h4>
              <p className="text-slate-400 leading-relaxed">
                Bounty funds are locked in advance escrow and verified before writer handover.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-black/40 border border-slate-800 space-y-2">
              <Lock className="w-6 h-6 text-purple-400" />
              <h4 className="font-bold text-white text-sm">100% Anonymous Feed</h4>
              <p className="text-slate-400 leading-relaxed">
                Confessions and whispers use private pseudonyms and robot avatars to protect your identity.
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
        </div>
      </section>

      {/* 4. FREQUENTLY ASKED QUESTIONS (FAQ) */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
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
                    className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${
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

      {/* 5. BOTTOM CALL TO ACTION BANNER */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-950/90 via-slate-900/95 to-brand-950/90 p-8 sm:p-12 border border-teal-500/30 text-center space-y-6 shadow-2xl backdrop-blur-2xl">
          <div className="w-14 h-14 rounded-2xl bg-black border border-white/20 p-2 mx-auto flex items-center justify-center shadow-xl">
            <img src="/logo.png" alt="Otium Logo" className="w-full h-full object-contain" />
          </div>

          <div className="space-y-2 max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Ready to Upgrade Your Campus Life?
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              Join university peers already saving hours on printing, guarding attendance, and calculating semester grades.
            </p>
          </div>

          <div className="pt-2">
            <Link href={user ? "/dashboard" : "/login"}>
              <Button
                variant="brand"
                size="lg"
                className="w-full sm:w-auto min-h-[48px] h-12 shadow-2xl shadow-teal-500/30 bg-gradient-to-r from-teal-500 to-brand-600 hover:from-teal-400 hover:to-brand-500 font-bold px-8 text-base"
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
