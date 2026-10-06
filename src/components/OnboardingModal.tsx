"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@/components/providers/UserContext";
import { updateUserProfile } from "@/actions/user.actions";
import { getColleges } from "@/actions/college.actions";
import { toast } from "sonner";
import { Building2, Phone, GraduationCap, BookOpen, Sparkles, Check } from "lucide-react";

export function OnboardingModal() {
  const { user, loading, refreshUser } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [colleges, setColleges] = useState<any[]>([]);
  const [selectedCollegeId, setSelectedCollegeId] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [department, setDepartment] = useState<string>("");
  const [year, setYear] = useState<string>("2");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Show modal if user is logged in but has NO campus assigned
    if (!loading && user && !user.collegeId) {
      setIsOpen(true);
      if (user.phone) setPhone(user.phone);
      if (user.department) setDepartment(user.department);
      if (user.year) setYear(String(user.year));
    } else {
      setIsOpen(false);
    }
  }, [user, loading]);

  useEffect(() => {
    async function loadCollegesList() {
      try {
        const res = await getColleges();
        if (res.success && Array.isArray(res.data)) {
          setColleges(res.data);
          if (res.data.length > 0 && !selectedCollegeId) {
            setSelectedCollegeId(res.data[0].id);
          }
        }
      } catch (e) {
        console.warn("Could not load colleges for onboarding:", e);
      }
    }
    if (isOpen) {
      loadCollegesList();
    }
  }, [isOpen]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    if (!selectedCollegeId) {
      toast.error("Please select your university campus.");
      return;
    }

    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length > 0 && cleanPhone.length !== 10) {
      toast.error("Please enter a valid 10-digit phone number or leave it blank.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await updateUserProfile({
        userId: user.id,
        collegeId: selectedCollegeId,
        phone: cleanPhone || undefined,
        department: department.trim() || undefined,
        year: year ? parseInt(year, 10) : undefined,
      });

      if (res.success) {
        const chosen = colleges.find((c) => c.id === selectedCollegeId);
        toast.success(`Welcome to ${chosen?.name || "Campus Hub"}!`);
        setIsOpen(false);
        if (refreshUser) await refreshUser();
      } else {
        toast.error(res.error || "Failed to save campus setup.");
      }
    } catch (err: any) {
      toast.error("Network fault while saving setup.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    sessionStorage.setItem("otium_onboarding_skipped", "true");
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {/* Campus selection is required — modal cannot be dismissed */}}
      title=""
      maxWidth="lg"
      className="p-6 sm:p-8"
    >
      <form onSubmit={handleSave} className="space-y-6">
        {/* Header Badge & Title */}
        <div className="space-y-2 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary text-foreground text-xs font-semibold border border-border">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>Welcome Setup • First Sign-In</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
            Connect to Your University Campus
          </h2>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Select your campus to unlock local express print deliveries, peer freelance gigs, and your university whisper wall.
          </p>
        </div>

        {/* Form Fields */}
        <div className="space-y-4 pt-2 border-t border-border">
          {/* Campus Selection (Required) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-primary" />
              <span>Select Your University / Campus *</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
              {colleges.map((col) => {
                const isSelected = selectedCollegeId === col.id;
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => setSelectedCollegeId(col.id)}
                    className={`p-3 rounded-lg border text-left transition-all flex items-start justify-between gap-2 ${
                      isSelected
                        ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary/40"
                        : "border-border bg-card/60 text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-foreground">{col.name}</div>
                      <div className="text-[11px] text-muted-foreground">{col.city || "Main Campus"}</div>
                    </div>
                    {isSelected && (
                      <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-2.5 h-2.5 text-primary-foreground stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional Phone Number */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Contact Phone Number</span>
              </span>
              <span className="text-[11px] font-normal text-muted-foreground">Optional</span>
            </label>
            <Input
              type="tel"
              placeholder="e.g. 9876543210 (Used for express print delivery SMS)"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              maxLength={10}
            />
          </div>

          {/* Department and Academic Year */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Department / Branch</span>
              </label>
              <Input
                type="text"
                placeholder="e.g. Computer Engineering"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Academic Year *</span>
              </label>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-input bg-card text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
                <option value="5">5th Year (Dual / Postgrad)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Single CTA — no skip */}
        <Button
          type="submit"
          size="md"
          isLoading={isSubmitting}
          className="w-full"
        >
          Save & Enter Campus Hub
        </Button>
      </form>
    </Modal>
  );
}
