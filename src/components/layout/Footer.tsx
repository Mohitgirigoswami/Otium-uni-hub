import React from "react";
import Link from "next/link";
import { Sparkles, Shield, Lock, CheckCircle2, Heart, HelpCircle, FileText } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-slate-200/60 dark:border-slate-800/80 bg-white/50 dark:bg-[#060911]/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1: Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 via-teal-500 to-electric-600 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="text-lg font-black tracking-tight bg-gradient-to-r from-brand-600 via-teal-500 to-electric-600 bg-clip-text text-transparent">
                OTIUM UNI HUB
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              The all-in-one university Super App built to simplify academics, freelancing, peer commerce, and campus connectivity.
            </p>
          </div>

          {/* Col 2: Academic Suite */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200 mb-3.5">
              Academic Suite
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
              <li>
                <Link href="/attendance" className="hover:text-brand-500 transition-colors">
                  Attendance & Bunk Calculator
                </Link>
              </li>
              <li>
                <Link href="/cgpa" className="hover:text-brand-500 transition-colors">
                  CGPA Tracker & Grade Predictor
                </Link>
              </li>
              <li>
                <Link href="/print-station" className="hover:text-brand-500 transition-colors">
                  Hostel Cloud Print Station
                </Link>
              </li>
              <li>
                <Link href="/gigs" className="hover:text-brand-500 transition-colors">
                  Project & Assignment Hub
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Campus Life */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200 mb-3.5">
              Campus Life
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
              <li>
                <Link href="/incognito" className="hover:text-brand-500 transition-colors">
                  Whisper Wall & Campus Feeds
                </Link>
              </li>
              <li>
                <Link href="/rideshare" className="hover:text-brand-500 transition-colors">
                  Airport & Station Cab Split
                </Link>
              </li>
              <li>
                <Link href="/marketplace" className="hover:text-brand-500 transition-colors">
                  Student Peer Marketplace
                </Link>
              </li>
              <li>
                <Link href="/lost-and-found" className="hover:text-brand-500 transition-colors">
                  Lost & Found Directory
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Trust & Safety */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200 mb-3.5">
              Trust & Safety
            </h4>
            <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                <span>100% Anonymous Whispers</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                <span>Auto-Purged Print Documents</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Verified Campus Members</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Legal & Copyright Bar */}
        <div className="mt-10 pt-6 border-t border-slate-200/60 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-4">
          <p>© 2026 Otium Uni Hub. Built for students, by students.</p>
          <div className="flex items-center gap-4 flex-wrap text-xs">
            <Link href="/support" className="hover:text-brand-500 transition-colors">
              Campus Support
            </Link>
            <span>•</span>
            <Link href="/support" className="hover:text-brand-500 transition-colors">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link href="/support" className="hover:text-brand-500 transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
