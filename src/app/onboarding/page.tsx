"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useUser } from "@/components/providers/UserContext";
import { getColleges, setUserCollege } from "@/actions/college.actions";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import {
  GraduationCap,
  Building2,
  MapPin,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

export default function OnboardingPage() {
  const { data: session, update: updateSession } = useSession();
  const { user, refreshUser } = useUser();
  const router = useRouter();

  const [colleges, setColleges] = useState<any[]>([]);
  const [selectedCollegeId, setSelectedCollegeId] = useState("");
  const [loadingColleges, setLoadingColleges] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getColleges().then((res) => {
      if (res.success && res.data) {
        setColleges(res.data);
        if (res.data.length > 0) {
          setSelectedCollegeId(res.data[0].id);
        }
      }
      setLoadingColleges(false);
    });
  }, []);

  const handleSelectCollege = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeUserId = user?.id || session?.user?.id;
    if (!activeUserId) {
      toast.error("Please sign in first.");
      router.push("/login");
      return;
    }
    if (!selectedCollegeId) {
      toast.error("Please select a university campus.");
      return;
    }

    setSubmitting(true);
    const res = await setUserCollege({
      userId: activeUserId,
      collegeId: selectedCollegeId,
    });
    setSubmitting(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Welcome to your campus hub!");
      // Update NextAuth session token
      if (updateSession) {
        await updateSession({ collegeId: selectedCollegeId });
      }
      await refreshUser();
      router.push("/");
    }
  };

  const selectedCollege = colleges.find((c) => c.id === selectedCollegeId);

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-xl space-y-6">
        {/* Header Badge */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-600 dark:text-brand-400 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Campus Onboarding • Step 1 of 1</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Select Your University Campus
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            Otium customizes your Marketplace listings, Gig bounties, campus print queues, and campus confessions to your exact university.
          </p>
        </div>

        {/* Card Form */}
        <GlassCard className="p-8 border-brand-500/30 shadow-2xl relative overflow-hidden">
          <form onSubmit={handleSelectCollege} className="space-y-6">
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Registered University / Institute *
              </label>

              {loadingColleges ? (
                <div className="h-12 rounded-xl bg-slate-200/60 dark:bg-slate-800 animate-pulse" />
              ) : colleges.length === 0 ? (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs space-y-2">
                  <p className="font-bold">No registered campuses found yet.</p>
                  <p className="text-[11px] text-slate-400">
                    A Campus Super Admin will initialize university colleges shortly.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {colleges.map((col) => {
                    const isSelected = selectedCollegeId === col.id;
                    return (
                      <div
                        key={col.id}
                        onClick={() => setSelectedCollegeId(col.id)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? "bg-brand-500/15 border-brand-500 shadow-md ring-1 ring-brand-500"
                            : "bg-slate-100/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 hover:bg-slate-200/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                            isSelected
                              ? "bg-brand-600 text-white"
                              : "bg-slate-200 dark:bg-slate-700 text-slate-500"
                          }`}>
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white">
                              {col.name}
                            </p>
                            <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-2.5 h-2.5" />
                              <span>{col.city}</span>
                            </p>
                          </div>
                        </div>

                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-brand-500 shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {selectedCollege && (
              <div className="p-3 rounded-xl bg-brand-500/10 border border-brand-500/20 text-[11px] text-brand-700 dark:text-brand-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-brand-500 shrink-0" />
                <span>
                  You will be connected to <strong>{selectedCollege.name} ({selectedCollege.city})</strong>.
                </span>
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting || !selectedCollegeId}
              className="w-full bg-brand-600 hover:bg-brand-500 font-bold py-3 text-sm"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              {submitting ? "Joining Campus..." : "Confirm & Enter Campus Hub"}
            </Button>
          </form>
        </GlassCard>
      </div>
    </div>
  );
}
