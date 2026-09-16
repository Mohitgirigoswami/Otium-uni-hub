"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@/components/providers/UserContext";
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
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
  Building2,
} from "lucide-react";

export default function LandingPage() {
  const { user } = useUser();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const FAQS = [
    {
      q: "How does the Campus Cloud Print Station operate?",
      a: "Upload your document directly from your device. The system parses exact page counts using client-side PDF inspection and calculates charges according to your duplex and color preferences. Payment is verified via UPI UTR entry, after which orders are printed and delivered to designated hostel blocks during morning and lunch distribution windows.",
    },
    {
      q: "How is student anonymity maintained on the Whisper Wall?",
      a: "The Whisper Wall separates student university account credentials from public feed entries using pseudonyms and unique avatar hashes. Fellow students and commentators cannot view your real name, email, or registration number.",
    },
    {
      q: "How does the 75% Attendance Guardrail calculate required lectures?",
      a: "The attendance calculation compares total held lectures against attended lectures. If below 75%, it calculates the exact consecutive class sessions required to reach 75%. If at or above 75%, it calculates how many classes may be missed while staying above the 75% threshold.",
    },
    {
      q: "How does the Managed Proxy Escrow for Gigs function?",
      a: "When a student posts a task with a bounty, funds are deposited into locked escrow. Once the assigned student delivers the completed assignment or project code, the task poster reviews the submission. Upon confirmation of satisfactory completion, funds are released to the performer.",
    },
  ];

  const CORE_MODULES = [
    {
      title: "Hostel Cloud Print Station",
      desc: "Direct document upload, automated page detection, duplex configuration, and hostel delivery slots.",
      icon: Printer,
      href: "/print-station",
      badge: "Delivery Slots",
    },
    {
      title: "75% Attendance Guardrail",
      desc: "Real-time attendance calculations with safe bunk limits and mandatory recovery targets.",
      icon: CalendarCheck,
      href: "/attendance",
      badge: "Target Math",
    },
    {
      title: "CGPA & SGPA Forecaster",
      desc: "Credit-weighted semester GPA calculations and target credit simulators for academic planning.",
      icon: GraduationCap,
      href: "/cgpa",
      badge: "Grade Points",
    },
    {
      title: "Peer Freelance Gigs",
      desc: "Campus assignment assistance and coding projects with locked escrow protection.",
      icon: Briefcase,
      href: "/gigs",
      badge: "Escrow Locked",
    },
    {
      title: "Student Marketplace",
      desc: "Buy and sell used textbooks, calculators, electronics, and hostel room furniture.",
      icon: ShoppingBag,
      href: "/marketplace",
      badge: "Direct Peer",
    },
    {
      title: "Campus Whisper Wall",
      desc: "Anonymous university discussions, confessions, and advice separated by campus scope.",
      icon: EyeOff,
      href: "/incognito",
      badge: "Pseudonymous",
    },
  ];

  return (
    <div className="w-full space-y-16 sm:space-y-24 pb-12">
      {/* 1. Hero Section */}
      <section className="text-center max-w-4xl mx-auto space-y-6 pt-6 sm:pt-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-secondary text-foreground text-xs font-semibold border border-border">
          <Building2 className="w-3.5 h-3.5 text-primary" />
          <span>Campus Operational System for Universities</span>
        </div>

        <h1 className="font-heading text-4xl sm:text-6xl font-black tracking-tight text-foreground leading-[1.1]">
          Cloud Printing, 75% Attendance Guardrails, and Student Gigs.
        </h1>

        <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Otium Uni Hub centralizes essential university daily operations: scheduled document printing, attendance math, peer assignments with escrow, and anonymous campus discourse.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          {user ? (
            <Link href="/dashboard">
              <Button size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Go to Student Dashboard
              </Button>
            </Link>
          ) : (
            <Link href="/login">
              <Button size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Sign In with University Google
              </Button>
            </Link>
          )}
          <Link href="/print-station">
            <Button variant="outline" size="lg">
              View Print Station Rates
            </Button>
          </Link>
        </div>
      </section>

      {/* 2. Core Modules Grid */}
      <section className="space-y-8">
        <div className="space-y-2 text-center sm:text-left">
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">
            Campus Operational Tools
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Directly connected to campus logistics and university academic schedules.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {CORE_MODULES.map((module) => {
            const Icon = module.icon;
            return (
              <Card key={module.title} interactive className="flex flex-col justify-between p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center border border-primary/20">
                      <Icon className="w-5 h-5" />
                    </div>
                    <Badge variant="secondary" size="sm">
                      {module.badge}
                    </Badge>
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="font-heading font-bold text-base text-foreground">
                      {module.title}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {module.desc}
                    </p>
                  </div>
                </div>

                <div className="pt-5 mt-5 border-t border-border/60">
                  <Link
                    href={module.href}
                    className="inline-flex items-center text-xs font-semibold text-primary hover:underline gap-1.5"
                  >
                    <span>Open {module.title.split(" ")[0]}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* 3. Operational Integrity & Security */}
      <section className="rounded-xl border border-border bg-card p-6 sm:p-10 space-y-6">
        <div className="max-w-2xl space-y-2">
          <h2 className="font-heading text-xl sm:text-2xl font-bold text-foreground">
            Operational Standards & Safeguards
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Engineered for transparent student collaboration with zero tolerance for spam or misrepresentation.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span>Proxy Escrow Security</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Task payments are stored safely until deliverables are reviewed. Unmet specifications trigger moderation review.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span>Automated Document Purging</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Print PDFs are stored exclusively in cloud buckets for delivery validation and deleted upon job fulfillment.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
              <Building2 className="w-4 h-4 text-primary" />
              <span>Campus Scope Isolation</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Print queues, marketplace listings, and cab splits are strictly segregated by university college boundaries.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Frequently Asked Questions */}
      <section className="space-y-6 max-w-3xl mx-auto">
        <div className="text-center space-y-1.5">
          <h2 className="font-heading text-2xl font-bold text-foreground">
            Frequently Asked Questions
          </h2>
          <p className="text-xs text-muted-foreground">
            Clear guidelines on operational procedures, payments, and data policies.
          </p>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={faq.q}
                className="border border-border rounded-xl bg-card overflow-hidden transition-colors"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full flex items-center justify-between p-4 text-left text-sm font-semibold text-foreground hover:bg-secondary/40"
                  aria-expanded={isOpen}
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-primary" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 text-xs text-muted-foreground leading-relaxed border-t border-border/40 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
