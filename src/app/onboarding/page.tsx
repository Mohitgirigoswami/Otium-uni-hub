"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useUser } from "@/components/providers/UserContext";
import { getColleges, setUserCollege } from "@/actions/college.actions";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Building2,
  MapPin,
  ArrowRight,
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
      toast.success("Campus affiliation confirmed.");
      if (updateSession) {
        await updateSession({ collegeId: selectedCollegeId });
      }
      await refreshUser();
      router.push("/dashboard");
    }
  };

  const selectedCollege = colleges.find((c) => c.id === selectedCollegeId);

  return (
    <div className="min-h-[calc(100vh-220px)] flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary text-foreground text-xs font-semibold border border-border">
            <Building2 className="w-3.5 h-3.5 text-primary" />
            <span>Campus Configuration</span>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Select Your University Campus
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            Marketplace listings, print station logistics, and campus whisper feeds are scoped to your selected university.
          </p>
        </div>

        <Card className="p-6 sm:p-8">
          <form onSubmit={handleSelectCollege} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-foreground">
                Affiliated University or Institute
              </label>

              {loadingColleges ? (
                <div className="h-10 rounded-lg bg-secondary/60 animate-pulse border border-border" />
              ) : colleges.length === 0 ? (
                <div className="p-4 rounded-lg bg-secondary/50 border border-border text-xs text-muted-foreground text-center">
                  No active campuses found on record. Contact campus support.
                </div>
              ) : (
                <select
                  value={selectedCollegeId}
                  onChange={(e) => setSelectedCollegeId(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-card text-foreground text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {colleges.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code}) - {c.city}, {c.state}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {selectedCollege && (
              <div className="p-4 rounded-lg bg-secondary/40 border border-border space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span>Campus Details</span>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>
                    <strong>Campus:</strong> {selectedCollege.name}
                  </p>
                  <p>
                    <strong>Location:</strong> {selectedCollege.city}, {selectedCollege.state}
                  </p>
                </div>
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              isLoading={submitting}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Confirm Campus Affiliation
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
