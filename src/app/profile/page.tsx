"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@/components/providers/UserContext";
import {
  updateUserProfile,
  updateIncognitoProfile,
  getUserDashboardStats,
} from "@/actions/user.actions";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { toast } from "sonner";
import {
  User as UserIcon,
  EyeOff,
  Phone,
  BookOpen,
  GraduationCap,
  Sparkles,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Briefcase,
  Printer,
  ShoppingBag,
  FileText,
  Mail,
  AlertCircle,
} from "lucide-react";

export default function ProfilePage() {
  const { user, refreshUser, isOnCooldown, cooldownHoursRemaining } = useUser();
  const [statsData, setStatsData] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Real Identity Form
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("");
  const [year, setYear] = useState<number>(3);
  const [savingProfile, setSavingProfile] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);

  // Incognito Handle Form
  const [incognitoHandle, setIncognitoHandle] = useState("");
  const [savingIncognito, setSavingIncognito] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setBio(user.bio || "");
      setPhone(user.phone ? user.phone.replace(/\D/g, "").slice(0, 10) : "");
      setDepartment(user.department || "");
      setYear(user.year || 3);
      setIncognitoHandle(user.incognitoProfile?.handle || "");

      getUserDashboardStats(user.id).then((res) => {
        if (res.success && res.data) {
          setStatsData(res.data.stats);
        }
        setLoadingStats(false);
      });
    }
  }, [user]);

  const isPhoneValid = phone.length === 0 || phone.length === 10;

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 10);
    setPhone(raw);
    setPhoneTouched(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (phone.length > 0 && phone.length !== 10) {
      toast.error("Please enter a valid 10-digit mobile number.");
      return;
    }

    setSavingProfile(true);
    const res = await updateUserProfile({
      userId: user.id,
      name,
      bio,
      phone,
      department,
      year: Number(year),
    });
    setSavingProfile(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Profile details updated successfully!");
      refreshUser();
    }
  };

  const handleSaveIncognito = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !incognitoHandle.trim()) return;

    setSavingIncognito(true);
    const res = await updateIncognitoProfile({
      userId: user.id,
      handle: incognitoHandle.trim(),
    });
    setSavingIncognito(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(`Incognito alias updated to @${res.data.handle}!`);
      refreshUser();
    }
  };

  const handleRandomizeSeed = () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const prefixList = ["Quantum", "Shadow", "Cyber", "Nova", "Pixel", "Turbo", "Ghost", "Apex", "Vortex"];
    const randomPrefix = prefixList[Math.floor(Math.random() * prefixList.length)];
    setIncognitoHandle(`${randomPrefix}_${randomSuffix}`);
  };

  const avatarPreviewUrl = `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(
    incognitoHandle.trim() || "OtiumBot"
  )}`;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Top Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-950/90 via-slate-900/90 to-electric-950/90 p-8 sm:p-10 border border-brand-500/30 text-white shadow-2xl backdrop-blur-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 -mb-16 w-60 h-60 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <img
              src={
                user?.image ||
                "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80"
              }
              alt={user?.name || "Student"}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover ring-4 ring-brand-500/40 shadow-xl"
            />
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                  {user?.name || "Student Profile"}
                </h1>
                <Badge
                  variant={
                    user?.role === "SUPER_ADMIN"
                      ? "success"
                      : user?.role === "PRINT_MANAGER"
                      ? "warning"
                      : user?.role === "CAMPUS_MODERATOR"
                      ? "brand"
                      : "info"
                  }
                  size="sm"
                >
                  {user?.role ? user.role.replace(/_/g, " ") : "Verified Student"}
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-brand-400" />
                <span>{user?.email || ""}</span>
              </p>
              {user?.college && (
                <p className="text-xs text-brand-300 font-semibold flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4" />
                  <span>{user.college.name}</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isOnCooldown && (
              <div className="flex items-center gap-2 bg-amber-500/20 border border-amber-500/40 px-4 py-2 rounded-2xl text-amber-300 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <p className="font-bold">Gig Cooldown Active</p>
                  <p className="text-[10px] opacity-80">{cooldownHoursRemaining}h cooldown remaining</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dashboard Analytics & Summary */}
      {!loadingStats && statsData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <GlassCard className="p-4 border-brand-500/20">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Posted Tasks</span>
              <FileText className="w-4 h-4 text-brand-500" />
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {statsData.totalPostedGigs}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Tasks created by you</p>
          </GlassCard>

          <GlassCard className="p-4 border-electric-500/20">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Active Gigs</span>
              <Briefcase className="w-4 h-4 text-electric-500" />
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {statsData.activeAssignedGigs} / 2
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Max concurrent limit</p>
          </GlassCard>

          <GlassCard className="p-4 border-amber-500/20">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Print Orders</span>
              <Printer className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {statsData.activePrintOrders}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Hostel queue jobs</p>
          </GlassCard>

          <GlassCard className="p-4 border-teal-500/20">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Active Listings</span>
              <ShoppingBag className="w-4 h-4 text-teal-500" />
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {statsData.activeListings}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Marketplace listings</p>
          </GlassCard>
        </div>
      )}

      {/* Two Column Grid: Real Profile Form & Incognito Manager */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 1. Real Campus Identity Card */}
        <GlassCard className="p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Campus Identity & Bio
              </h2>
              <p className="text-xs text-slate-500">
                Visible on Marketplace listings, Gig posts, and RideSplits
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Full Real Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                About / Bio
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell peers about your academic interests, skills, or tech stack..."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* TASK 1: Strict 10-Digit Mobile Input Polish */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Phone / WhatsApp
                  </label>
                  {phone.length > 0 && (
                    <span
                      className={`text-[10px] font-bold ${
                        phone.length === 10
                          ? "text-emerald-500"
                          : "text-rose-500"
                      }`}
                    >
                      {phone.length}/10 digits
                    </span>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-slate-400">
                    <Phone className="w-3.5 h-3.5" />
                    <span className="text-xs font-bold text-slate-500">+91</span>
                  </div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={10}
                    value={phone}
                    onChange={handlePhoneChange}
                    onBlur={() => setPhoneTouched(true)}
                    placeholder="9876543210"
                    className={`w-full pl-16 pr-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border text-xs font-mono font-bold focus:outline-none focus:ring-2 ${
                      phoneTouched && phone.length > 0 && phone.length !== 10
                        ? "border-rose-500 focus:ring-rose-500 text-rose-600 dark:text-rose-400 bg-rose-500/5"
                        : phone.length === 10
                        ? "border-emerald-500/50 focus:ring-emerald-500"
                        : "border-slate-300 dark:border-slate-700 focus:ring-brand-500"
                    }`}
                  />
                </div>
                {phoneTouched && phone.length > 0 && phone.length !== 10 && (
                  <p className="text-[11px] text-rose-500 font-semibold mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>Please enter a valid 10-digit mobile number</span>
                  </p>
                )}
                {phone.length === 10 && (
                  <p className="text-[11px] text-emerald-500 font-semibold mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>10-digit number ready</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Academic Year
                </label>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value={1}>1st Year (Freshman)</option>
                  <option value={2}>2nd Year (Sophomore)</option>
                  <option value={3}>3rd Year (Junior)</option>
                  <option value={4}>4th Year (Senior)</option>
                  <option value={5}>PG / Research Scholar</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Department / Major
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Computer Science & Engineering"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                isLoading={savingProfile}
                disabled={savingProfile || (phone.length > 0 && phone.length !== 10)}
                className="w-full bg-brand-600 hover:bg-brand-500 font-bold"
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
              >
                {savingProfile ? "Saving Profile..." : "Update Real Identity"}
              </Button>
            </div>
          </form>
        </GlassCard>

        {/* 2. Incognito Alias & DiceBear Seed Manager */}
        <GlassCard className="p-6 sm:p-8 space-y-6 border-purple-500/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <EyeOff className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Incognito Pseudonym Manager
              </h2>
              <p className="text-xs text-slate-500">
                Powers your anonymous wall whispers & zero-knowledge DMs
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-4">
            {/* Live Avatar Preview */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <img
                  src={avatarPreviewUrl}
                  alt="Incognito Avatar Preview"
                  className="w-16 h-16 rounded-2xl bg-slate-900 p-1.5 ring-2 ring-purple-500 shadow-md"
                />
                <span className="absolute -bottom-1 -right-1 bg-purple-600 text-white rounded-full p-1 shadow">
                  <Sparkles className="w-3 h-3" />
                </span>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  @{incognitoHandle || "OtiumBot"}
                </p>
                <p className="text-[11px] text-purple-600 dark:text-purple-400 font-medium">
                  Dynamic DiceBear Bottts Seed
                </p>
                <p className="text-[10px] text-slate-400">
                  Real name, email & profile image are never exposed in anonymous chats.
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRandomizeSeed}
              className="w-full text-xs border-purple-500/30 hover:bg-purple-500/10 text-purple-600 dark:text-purple-300"
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Roll Random Alias Seed
            </Button>
          </div>

          <form onSubmit={handleSaveIncognito} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Anonymous Handle (@handle) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-500 font-bold text-sm">
                  @
                </span>
                <input
                  type="text"
                  required
                  value={incognitoHandle}
                  onChange={(e) =>
                    setIncognitoHandle(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))
                  }
                  placeholder="e.g. CyberHawk_99"
                  className="w-full pl-8 pr-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-bold text-purple-600 dark:text-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Only letters, numbers, and underscores are allowed (min 3 characters).
              </p>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                isLoading={savingIncognito}
                disabled={savingIncognito || !incognitoHandle.trim()}
                className="w-full bg-purple-600 hover:bg-purple-500 font-bold"
                leftIcon={<ShieldCheck className="w-4 h-4" />}
              >
                {savingIncognito ? "Updating Alias..." : "Save Incognito Alias"}
              </Button>
            </div>
          </form>
        </GlassCard>
      </div>
    </div>
  );
}
