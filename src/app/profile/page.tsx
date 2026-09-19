"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@/components/providers/UserContext";
import {
  updateUserProfile,
  updateIncognitoProfile,
  getUserDashboardStats,
} from "@/actions/user.actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  User as UserIcon,
  EyeOff,
  Phone,
  BookOpen,
  GraduationCap,
  ShieldCheck,
  CheckCircle2,
  Building2,
  Save,
} from "lucide-react";

export default function ProfilePage() {
  const { user, refreshUser } = useUser();
  const [statsData, setStatsData] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Profile form
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("");
  const [year, setYear] = useState<number>(3);
  const [savingProfile, setSavingProfile] = useState(false);

  // Incognito Handle Form
  const [incognitoHandle, setIncognitoHandle] = useState("");
  const [savingIncognito, setSavingIncognito] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setUsername(user.username || "");
      setBio(user.bio || "");
      setPhone(user.phone ? user.phone.replace(/\D/g, "").slice(0, 10) : "");
      setDepartment(user.department || "");
      setYear(user.year || 3);
      setIncognitoHandle(user.incognitoProfile?.handle || "");

      // Directly fetch fresh profile from DB to guarantee latest username & attributes
      fetch(`/api/profile?userId=${user.id}`)
        .then((r) => r.json())
        .then((res) => {
          if (res.success && res.data) {
            if (res.data.name) setName(res.data.name);
            if (res.data.username) setUsername(res.data.username);
            if (res.data.bio) setBio(res.data.bio);
            if (res.data.phone) setPhone(res.data.phone.replace(/\D/g, "").slice(0, 10));
            if (res.data.department) setDepartment(res.data.department);
            if (res.data.year) setYear(res.data.year);
            if (res.data.incognitoProfile?.handle) setIncognitoHandle(res.data.incognitoProfile.handle);
          }
        })
        .catch(() => {});

      getUserDashboardStats(user.id).then((res) => {
        if (res.success && res.data) {
          setStatsData(res.data.stats);
        }
        setLoadingStats(false);
      });
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (phone.length > 0 && phone.length !== 10) {
      toast.error("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (username.trim()) {
      const uRegex = /^[a-zA-Z0-9_]{3,20}$/;
      if (!uRegex.test(username.trim())) {
        toast.error("Username must be 3-20 characters long and contain only letters, numbers, or underscores.");
        return;
      }
    }

    setSavingProfile(true);
    const res = await updateUserProfile({
      userId: user.id,
      name: name.trim(),
      username: username.trim().toLowerCase() || null,
      bio: bio.trim(),
      phone: phone.trim(),
      department: department.trim(),
      year: Number(year),
    });
    setSavingProfile(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Profile updated successfully.");
      if (res.data?.username) {
        setUsername(res.data.username);
      }
      refreshUser();
    }
  };

  const handleSaveIncognito = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!incognitoHandle.trim()) {
      toast.error("Please provide a pseudonym handle.");
      return;
    }

    setSavingIncognito(true);
    const res = await updateIncognitoProfile({
      userId: user.id,
      handle: incognitoHandle.trim(),
    });
    setSavingIncognito(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Whisper Wall pseudonym updated.");
      refreshUser();
    }
  };

  return (
    <div className="space-y-8 pb-12 max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-2 border-b border-border pb-6">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary text-foreground text-xs font-semibold border border-border">
          <UserIcon className="w-3.5 h-3.5 text-primary" />
          <span>Student Account Management</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Profile & Preferences
          </h1>
          {username ? (
            <Badge variant="primary" size="sm" className="font-mono text-xs font-bold">
              @{username}
            </Badge>
          ) : null}
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Manage your verified campus details, delivery contact, and pseudonymous Whisper Wall handle.
        </p>
      </div>

      {/* Two-Column Grid: Personal Info + Whisper Settings / Stats */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left: Personal Identity (7 cols) */}
        <div className="md:col-span-7 space-y-6">
          <Card className="p-6 sm:p-8 space-y-6">
            <div className="pb-3 border-b border-border space-y-1">
              <h2 className="font-heading text-base font-bold text-foreground">
                Verified Student Identity
              </h2>
              <p className="text-xs text-muted-foreground">
                Information associated with university records and print dispatch.
              </p>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Full Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">Public Username (@handle)</label>
                  {username ? (
                    <span className="text-[11px] font-mono font-bold text-primary">
                      Current: @{username}
                    </span>
                  ) : (
                    <span className="text-[11px] text-amber-500 font-medium">Create your username</span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary font-bold text-sm">@</span>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase())}
                    placeholder="alex_campus"
                    className="pl-8 font-mono text-sm"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Used for classmate direct messages and campus searches without exposing your university email address.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">University Email</label>
                <Input
                  value={user?.email || ""}
                  disabled
                  className="bg-secondary/50 cursor-not-allowed opacity-75"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Phone (10 digits)</label>
                  <Input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Year of Study</label>
                  <select
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="w-full h-9 px-3 rounded-lg border border-input bg-card text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {[1, 2, 3, 4, 5].map((yr) => (
                      <option key={yr} value={yr}>
                        Year {yr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Academic Department</label>
                <Input
                  placeholder="e.g. Computer Engineering"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Student Bio</label>
                <Textarea
                  placeholder="Brief note about your tech stack, academic interests, or campus activities..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                />
              </div>

              <Button
                type="submit"
                size="md"
                className="w-full"
                isLoading={savingProfile}
                leftIcon={<Save className="w-4 h-4" />}
              >
                Save Identity Changes
              </Button>
            </form>
          </Card>
        </div>

        {/* Right: Whisper Settings & Stats (5 cols) */}
        <div className="md:col-span-5 space-y-6">
          {/* Incognito Handle Card */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-border">
              <EyeOff className="w-4 h-4 text-primary" />
              <h3 className="font-heading font-bold text-sm text-foreground">
                Whisper Wall Pseudonym
              </h3>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              This alias is displayed when posting anonymous confessions or comments on the Whisper Wall.
            </p>

            <form onSubmit={handleSaveIncognito} className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Alias Handle</label>
                <Input
                  placeholder="e.g. CyberScholar"
                  value={incognitoHandle}
                  onChange={(e) => setIncognitoHandle(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="w-full"
                isLoading={savingIncognito}
              >
                Update Alias
              </Button>
            </form>
          </Card>

          {/* Campus Activity Summary */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-border">
              <Building2 className="w-4 h-4 text-primary" />
              <h3 className="font-heading font-bold text-sm text-foreground">
                Campus Standing
              </h3>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Account Status</span>
                <Badge variant="success" size="sm">
                  Active
                </Badge>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Campus Role</span>
                <Badge variant="secondary" size="sm">
                  {user?.role || "STUDENT"}
                </Badge>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground">Affiliated Campus</span>
                <span className="font-semibold text-foreground truncate max-w-40 text-right">
                  {user?.college?.name || "Global Campus"}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
