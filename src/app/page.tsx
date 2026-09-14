"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
      q: "How does the Campus Cloud Print Station work?",
      a: "Upload your documents directly from your phone or laptop. Our server automatically counts exact pages and computes the lowest double-sided rate. Once paid via locked UPI QR, our print managers process and deliver the physical copies directly anywhere in campus with next-day delivery.",
    },
    {
      q: "Is my identity completely safe on the Whisper Wall?",
      a: "Yes. The Whisper Wall uses anonymous student pseudonyms and robot avatars. Your real name, university email, and roll number are never linked to your public posts, comments, or peer messages.",
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
      <section className="relative pt-6 sm:pt-14 text-center max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Top Innovation Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-secondary/80 border border-border text-foreground text-xs font-semibold select-none">
          <img
            src="/logo.png"
            alt="Otium Logo"
            className="w-3.5 h-3.5 object-contain invert dark:invert-0"
          />
          <span>The Next-Gen University Super-App Ecosystem</span>
        </div>

        {/* Main Hero Headline */}
        <div className="space-y-4">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-foreground tracking-tight font-heading leading-[1.08]">
            The Ultimate <br className="hidden sm:inline" />
            Campus Super-App
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-normal">
            Zero-queue cloud printing, anonymous campus whispers, 75% attendance guardrails, and credit-weighted CGPA calculators—engineered for daily college life.
          </p>
        </div>

        {/* Primary Call to Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 w-full max-w-md mx-auto sm:max-w-none">
          {user ? (
            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto h-11 px-6 font-semibold"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Go to Student Dashboard
              </Button>
            </Link>
          ) : (
            <Link href="/login" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto h-11 px-6 font-semibold"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Join the Campus Hub
              </Button>
            </Link>
          )}

          <a href="#services" className="w-full sm:w-auto">
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto h-11 px-6 font-semibold"
            >
              Explore Modules
            </Button>
          </a>
        </div>

        {/* Live Metrics Trust Strip */}
        <div className="pt-8 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto text-left">
          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Printer className="w-4 h-4 text-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wider">Fast Prints</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-foreground">Next Day</p>
            <p className="text-[11px] text-muted-foreground">Anywhere in campus</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <EyeOff className="w-4 h-4 text-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wider">Whisper Wall</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-foreground">100% Anon</p>
            <p className="text-[11px] text-muted-foreground">Private student aliases</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <CalendarCheck className="w-4 h-4 text-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wider">Attendance</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-foreground">75% Guard</p>
            <p className="text-[11px] text-muted-foreground">Bunk & deficit predictor</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <GraduationCap className="w-4 h-4 text-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wider">CGPA Engine</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-foreground">10.0 Scale</p>
            <p className="text-[11px] text-muted-foreground">Target grade simulator</p>
          </Card>
        </div>
      </section>

      {/* 2. PHASE 1 CORE FEATURE GRID */}
      <section id="services" className="space-y-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-2">
          <Badge variant="outline" size="sm">
            Phase 1 Launch Scope
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight font-heading">
            Engineered to Solve Daily Campus Friction
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Four foundational campus utilities that eliminate printing queues, exam debarment stress, anonymous secrets, and GPA confusion.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Print Station */}
          <Card className="p-6 space-y-6 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-secondary text-foreground flex items-center justify-center border border-border">
                <Printer className="w-5 h-5" />
              </div>
              <Badge variant="secondary" size="sm">
                Next-Day Delivery
              </Badge>
              <h3 className="text-lg font-bold text-foreground font-heading">
                Campus Print Station
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Direct PDF uploads with instant automated page detection. Best duplex rates and next-day delivery anywhere in campus.
              </p>
            </div>

            <div className="pt-4 border-t border-border space-y-3">
              <div className="p-3 rounded-md bg-secondary/50 border border-border text-xs space-y-1 font-mono">
                <div className="flex justify-between text-muted-foreground">
                  <span>Page Detection:</span>
                  <span className="text-foreground font-semibold">Instant Auto</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Delivery:</span>
                  <span className="text-foreground font-semibold">Next Day</span>
                </div>
              </div>

              <Link href="/print-station" className="block">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs font-semibold justify-between"
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                >
                  Open Print Station
                </Button>
              </Link>
            </div>
          </Card>

          {/* Card 2: Whisper Wall */}
          <Card className="p-6 space-y-6 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-secondary text-foreground flex items-center justify-center border border-border">
                <EyeOff className="w-5 h-5" />
              </div>
              <Badge variant="secondary" size="sm">
                100% Anonymous
              </Badge>
              <h3 className="text-lg font-bold text-foreground font-heading">
                Whisper Wall & Secrets
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Unfiltered course tips, confessions, and campus memes. Shielded behind anonymous robot avatars and private student aliases.
              </p>
            </div>

            <div className="pt-4 border-t border-border space-y-3">
              <div className="p-3 rounded-md bg-secondary/50 border border-border text-xs space-y-1 font-mono">
                <div className="flex justify-between text-muted-foreground">
                  <span>Privacy Level:</span>
                  <span className="text-foreground font-semibold">Zero Knowledge</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Direct Chats:</span>
                  <span className="text-foreground font-semibold">Blind Hashes</span>
                </div>
              </div>

              <Link href="/incognito" className="block">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs font-semibold justify-between"
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                >
                  Visit Whisper Wall
                </Button>
              </Link>
            </div>
          </Card>

          {/* Card 3: Attendance Guardrail */}
          <Card className="p-6 space-y-6 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-secondary text-foreground flex items-center justify-center border border-border">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <Badge variant="secondary" size="sm">
                Debarment Shield
              </Badge>
              <h3 className="text-lg font-bold text-foreground font-heading">
                Attendance Guardrail
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Real-time bunk calculators and minimum attendance warnings to prevent exam debarment across enrolled courses.
              </p>
            </div>

            <div className="pt-4 border-t border-border space-y-3">
              <div className="p-3 rounded-md bg-secondary/50 border border-border text-xs space-y-1 font-mono">
                <div className="flex justify-between text-muted-foreground">
                  <span>Threshold:</span>
                  <span className="text-foreground font-semibold">75% Minimum</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Calculations:</span>
                  <span className="text-foreground font-semibold">Consecutive Bunks</span>
                </div>
              </div>

              <Link href="/attendance" className="block">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs font-semibold justify-between"
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                >
                  Track Attendance
                </Button>
              </Link>
            </div>
          </Card>

          {/* Card 4: CGPA Forecaster */}
          <Card className="p-6 space-y-6 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-secondary text-foreground flex items-center justify-center border border-border">
                <GraduationCap className="w-5 h-5" />
              </div>
              <Badge variant="secondary" size="sm">
                Credit-Weighted
              </Badge>
              <h3 className="text-lg font-bold text-foreground font-heading">
                CGPA Forecaster
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Credit-weighted SGPA calculations, semester transcript history, and target grade planning for upcoming placement seasons.
              </p>
            </div>

            <div className="pt-4 border-t border-border space-y-3">
              <div className="p-3 rounded-md bg-secondary/50 border border-border text-xs space-y-1 font-mono">
                <div className="flex justify-between text-muted-foreground">
                  <span>Weighting:</span>
                  <span className="text-foreground font-semibold">1-6 Credits</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Target Sim:</span>
                  <span className="text-foreground font-semibold">Required SGPA</span>
                </div>
              </div>

              <Link href="/cgpa" className="block">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs font-semibold justify-between"
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                >
                  Calculate CGPA
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </section>

      {/* 3. TRUST & SECURITY MATRIX */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card className="p-6 sm:p-10 space-y-8">
          <div className="text-center space-y-2">
            <Badge variant="outline" size="sm">
              Security & Trust Architecture
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground font-heading">
              Built with Strict University Safeguards
            </h2>
            <p className="text-xs text-muted-foreground max-w-lg mx-auto">
              We prioritize student privacy, financial integrity, and verified campus security at every layer.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-lg bg-secondary/40 border border-border space-y-2">
              <ShieldCheck className="w-5 h-5 text-foreground" />
              <h4 className="font-bold text-foreground text-sm font-heading">Escrow Protection</h4>
              <p className="text-muted-foreground leading-relaxed">
                Bounty funds are locked in advance escrow and verified before writer handover.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-secondary/40 border border-border space-y-2">
              <Lock className="w-5 h-5 text-foreground" />
              <h4 className="font-bold text-foreground text-sm font-heading">100% Anonymous Feed</h4>
              <p className="text-muted-foreground leading-relaxed">
                Confessions and whispers use private pseudonyms and robot avatars to protect your identity.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-secondary/40 border border-border space-y-2">
              <Zap className="w-5 h-5 text-foreground" />
              <h4 className="font-bold text-foreground text-sm font-heading">Amount-Locked UPI</h4>
              <p className="text-muted-foreground leading-relaxed">
                QR codes automatically lock transaction values in banking apps to eliminate manual error.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-secondary/40 border border-border space-y-2">
              <Users className="w-5 h-5 text-foreground" />
              <h4 className="font-bold text-foreground text-sm font-heading">Moderator Hub</h4>
              <p className="text-muted-foreground leading-relaxed">
                Admin control panels, moderator audit logs, and instant campus service kill switches.
              </p>
            </div>
          </div>
        </Card>
      </section>

      {/* 4. FREQUENTLY ASKED QUESTIONS (FAQ) */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="text-center space-y-2">
          <Badge variant="outline" size="sm">
            Got Questions?
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground font-heading">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <Card
                key={idx}
                onClick={() => toggleFaq(idx)}
                className="p-5 cursor-pointer space-y-2 hover:border-foreground/30 transition-colors"
              >
                <div className="flex items-center justify-between gap-4">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span>{faq.q}</span>
                  </h4>
                  <ChevronDown
                    className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 ${
                      isOpen ? "rotate-180 text-foreground" : ""
                    }`}
                  />
                </div>
                {isOpen && (
                  <p className="text-xs text-muted-foreground leading-relaxed pl-6 pt-1">
                    {faq.a}
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      </section>

      {/* 5. BOTTOM CALL TO ACTION BANNER */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card className="p-8 sm:p-12 border border-border text-center space-y-6 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground border border-border p-2 mx-auto flex items-center justify-center">
            <img
              src="/logo.png"
              alt="Otium Logo"
              className="w-full h-full object-contain invert dark:invert-0"
            />
          </div>

          <div className="space-y-2 max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight font-heading">
              Ready to Upgrade Your Campus Life?
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Join university peers already saving hours on printing, guarding attendance, and calculating semester grades.
            </p>
          </div>

          <div className="pt-2">
            <Link href={user ? "/dashboard" : "/login"}>
              <Button
                size="lg"
                className="w-full sm:w-auto font-semibold px-8 h-11"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                {user ? "Open Dashboard" : "Get Started with Google"}
              </Button>
            </Link>
          </div>
        </Card>
      </section>
    </div>
  );
}
