import React from "react";
import Link from "next/link";
import { ShieldCheck, FileText, HelpCircle, MapPin } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-border bg-card text-card-foreground mt-20 pb-20 sm:pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1: Brand & Purpose */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center p-1 font-bold">
                <img
                  src="/logo.png"
                  alt="Otium Uni Hub"
                  className="w-full h-full object-contain invert dark:invert-0"
                />
              </div>
              <span className="font-heading font-extrabold text-base tracking-tight text-foreground">
                OTIUM UNI HUB
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Campus operational platform providing hostel cloud printing, 75% attendance guardrails, task gigs, and student marketplace.
            </p>
          </div>

          {/* Col 2: Campus Modules */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Campus Utilities
            </h4>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li>
                <Link href="/print-station" className="hover:text-foreground transition-colors">
                  Hostel Cloud Print Station
                </Link>
              </li>
              <li>
                <Link href="/attendance" className="hover:text-foreground transition-colors">
                  75% Attendance Guardrail
                </Link>
              </li>
              <li>
                <Link href="/cgpa" className="hover:text-foreground transition-colors">
                  CGPA & SGPA Forecaster
                </Link>
              </li>
              <li>
                <Link href="/gigs" className="hover:text-foreground transition-colors">
                  Peer Freelance Gigs
                </Link>
              </li>
              <li>
                <Link href="/marketplace" className="hover:text-foreground transition-colors">
                  Student Marketplace
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Student Community */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Community & Safety
            </h4>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li>
                <Link href="/incognito" className="hover:text-foreground transition-colors">
                  Whisper Wall
                </Link>
              </li>
              <li>
                <Link href="/rideshare" className="hover:text-foreground transition-colors">
                  Campus Cab Split
                </Link>
              </li>
              <li>
                <Link href="/lost-and-found" className="hover:text-foreground transition-colors">
                  Lost & Found Directory
                </Link>
              </li>
              <li>
                <Link href="/support" className="hover:text-foreground transition-colors">
                  Campus Helpdesk & Moderation
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Legal & Policy */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Legal & Compliance
            </h4>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li>
                <Link href="/terms" className="hover:text-foreground transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-foreground transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/support" className="hover:text-foreground transition-colors">
                  Dispute Resolution
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 mt-8 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>
            {currentYear} Otium Uni Hub. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link href="/support" className="hover:text-foreground transition-colors">
              Support
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
