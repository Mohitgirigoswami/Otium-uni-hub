import React from "react";
import Link from "next/link";
import { Sparkles, Shield, Zap, Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-slate-200/60 dark:border-slate-800/80 bg-white/40 dark:bg-[#060911]/60 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1: Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-electric-600 flex items-center justify-center text-white">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-brand-600 to-electric-500 bg-clip-text text-transparent">
                OTIUM UNI HUB
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              The high-performance Super App ecosystem engineered for modern campus life, student freelancing, academic tracking, and collaboration.
            </p>
          </div>

          {/* Col 2: Academic Suite */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
              Academic Suite
            </h4>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <li>
                <Link href="/attendance" className="hover:text-brand-500 transition-colors">
                  75% Attendance Guardrail & Bunk Calculator
                </Link>
              </li>
              <li>
                <Link href="/cgpa" className="hover:text-brand-500 transition-colors">
                  Weighted Semester CGPA Tracker
                </Link>
              </li>
              <li>
                <Link href="/gigs" className="hover:text-brand-500 transition-colors">
                  Assignment & Project Freelance Hub
                </Link>
              </li>
              <li>
                <Link href="/print-station" className="hover:text-brand-500 transition-colors">
                  Hostel Cloud Print Station
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Campus Life */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
              Campus Collaboration
            </h4>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <li>
                <Link href="/rideshare" className="hover:text-brand-500 transition-colors">
                  Airport & Station Cab Split
                </Link>
              </li>
              <li>
                <Link href="/lost-and-found" className="hover:text-brand-500 transition-colors">
                  Lost & Found Image Directory
                </Link>
              </li>
              <li>
                <Link href="/incognito" className="hover:text-brand-500 transition-colors">
                  Incognito Wall & Confessions
                </Link>
              </li>
              <li>
                <Link href="/marketplace" className="hover:text-brand-500 transition-colors">
                  Student Peer Marketplace
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Security & Guardrails */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
              Security & Guardrails
            </h4>
            <div className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-brand-500" />
                <span>Anti-Hoarding & 24h Cooldown Engine</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-brand-500" />
                <span>Upstash 5-req/min Rate Limiting</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-brand-500" />
                <span>Direct Cloudinary & Supabase Signed URLs</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-200/60 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 gap-4">
          <p>© {new Date().getFullYear()} Otium University Super App. Crafted with precision for campus brilliance.</p>
          <div className="flex items-center gap-4">
            <span>Next.js 14 App Router</span>
            <span>•</span>
            <span>Server Actions</span>
            <span>•</span>
            <span>Prisma</span>
            <span>•</span>
            <span>Tailwind CSS</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
