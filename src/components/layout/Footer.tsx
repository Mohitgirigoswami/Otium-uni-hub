import React from "react";
import Link from "next/link";
import { Shield, Lock, CheckCircle2, Heart, HelpCircle, FileText } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-border bg-card/40 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1: Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary text-primary-foreground border border-border p-1 flex items-center justify-center shadow-sm">
                <img
                  src="/logo.png"
                  alt="Otium Logo"
                  className="w-full h-full object-contain invert dark:invert-0"
                />
              </div>
              <span className="text-base font-extrabold tracking-tight font-heading text-foreground">
                OTIUM UNI HUB
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The all-in-one university Super App built to simplify academics, freelancing, peer commerce, and campus connectivity.
            </p>
          </div>

          {/* Col 2: Academic Suite */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3.5 font-heading">
              Academic Suite
            </h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <Link href="/attendance" className="hover:text-foreground transition-colors">
                  Attendance & Bunk Calculator
                </Link>
              </li>
              <li>
                <Link href="/cgpa" className="hover:text-foreground transition-colors">
                  CGPA Tracker & Grade Predictor
                </Link>
              </li>
              <li>
                <Link href="/print-station" className="hover:text-foreground transition-colors">
                  Campus Print Station
                </Link>
              </li>
              <li>
                <Link href="/gigs" className="hover:text-foreground transition-colors">
                  Project & Assignment Hub
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Campus Life */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3.5 font-heading">
              Campus Life
            </h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <Link href="/incognito" className="hover:text-foreground transition-colors">
                  Anonymous Whisper Wall
                </Link>
              </li>
              <li>
                <Link href="/marketplace" className="hover:text-foreground transition-colors">
                  Student Marketplace
                </Link>
              </li>
              <li>
                <Link href="/rideshare" className="hover:text-foreground transition-colors">
                  Campus Cab & Auto Split
                </Link>
              </li>
              <li>
                <Link href="/lost-and-found" className="hover:text-foreground transition-colors">
                  Lost & Found Desk
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Trust & Policies */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3.5 font-heading">
              Trust & Security
            </h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Zero-Knowledge Incognito Wall</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Direct-to-Cloud Uploads</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Anti-Hoarding Gig Escrow</span>
              </li>
              <li className="flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                <Link href="/support" className="hover:text-foreground transition-colors">
                  Campus Help Desk
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Strip */}
        <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Otium Uni Hub. Built for university students.</p>
          <div className="flex items-center gap-4">
            <Link href="/support" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link href="/support" className="hover:text-foreground transition-colors">
              Terms
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
