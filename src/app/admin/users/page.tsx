"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@/components/providers/UserContext";
import { searchUsersAdmin, updateUserRoleAdmin } from "@/actions/admin.actions";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { toast } from "sonner";
import {
  Users,
  Search,
  ShieldCheck,
  Printer,
  ShieldAlert,
  GraduationCap,
  RefreshCw,
  CheckCircle2,
  Building2,
  Mail,
  Phone,
} from "lucide-react";
import { Role } from "@prisma/client";

const ROLES: { id: Role; label: string; desc: string; badgeVariant: "brand" | "warning" | "info" | "success" }[] = [
  { id: "STUDENT", label: "Student", desc: "Standard student access", badgeVariant: "info" },
  { id: "PRINT_MANAGER", label: "Print Manager", desc: "Can manage print queues & pricing", badgeVariant: "warning" },
  { id: "CAMPUS_MODERATOR", label: "Campus Moderator", desc: "Can moderate posts & chats", badgeVariant: "brand" },
  { id: "SUPER_ADMIN", label: "Super Admin", desc: "Full platform permissions", badgeVariant: "success" },
];

export default function AdminUsersPage() {
  const { user } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchUsers = async (query = "") => {
    if (!user) return;
    setLoading(true);
    const res = await searchUsersAdmin(query, user.id);
    if (res.success && res.data) {
      setUsersList(res.data);
    } else {
      toast.error(res.error || "Failed to search users.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers(searchQuery);
  }, [user]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(searchQuery);
  };

  const handleRoleChange = async (targetUserId: string, newRole: Role) => {
    if (!user) return;
    setUpdatingId(targetUserId);
    const res = await updateUserRoleAdmin({
      targetUserId,
      role: newRole,
      adminUserId: user.id,
    });
    setUpdatingId(null);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(`User role updated to ${newRole}!`);
      fetchUsers(searchQuery);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 text-emerald-500" />
            <span>User Directory & Granular Role Assignment</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Search students and staff by email or name. Elevate roles to PRINT_MANAGER, CAMPUS_MODERATOR, or SUPER_ADMIN.
          </p>
        </div>

        <Button
          onClick={() => fetchUsers(searchQuery)}
          variant="outline"
          size="sm"
          leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />}
        >
          Refresh Users
        </Button>
      </div>

      {/* Search Input Bar */}
      <GlassCard className="p-4">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search user by email or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-500 font-bold px-5">
            Search
          </Button>
        </form>
      </GlassCard>

      {/* Users Table */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/60 uppercase font-bold text-slate-400">
              <tr>
                <th className="py-3 px-4">User Details</th>
                <th className="py-3 px-4">College / Campus</th>
                <th className="py-3 px-4">Department & Year</th>
                <th className="py-3 px-4">Current Role</th>
                <th className="py-3 px-4 text-right">Assign Granular Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
                      <span>Searching user records...</span>
                    </div>
                  </td>
                </tr>
              ) : usersList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    No users found matching your search.
                  </td>
                </tr>
              ) : (
                usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-100/40 dark:hover:bg-slate-800/30 transition-colors">
                    {/* User */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={
                            u.image ||
                            "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&auto=format&fit=crop&q=80"
                          }
                          alt={u.name || "User"}
                          className="w-8 h-8 rounded-full object-cover bg-slate-800"
                        />
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">
                            {u.name || "Student"}
                          </p>
                          <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Mail className="w-2.5 h-2.5" />
                            <span>{u.email}</span>
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* College */}
                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                      {u.college ? (
                        <div className="flex items-center gap-1.5 font-semibold">
                          <Building2 className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                          <span>{u.college.name}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-amber-500 font-medium">
                          No campus selected
                        </span>
                      )}
                    </td>

                    {/* Department / Year */}
                    <td className="py-3.5 px-4 text-slate-500">
                      <p className="font-medium text-slate-700 dark:text-slate-300">
                        {u.department || "General Undergrad"}
                      </p>
                      {u.year && (
                        <p className="text-[10px] text-slate-400">Year {u.year}</p>
                      )}
                    </td>

                    {/* Current Role Badge */}
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={
                          u.role === "SUPER_ADMIN"
                            ? "success"
                            : u.role === "PRINT_MANAGER"
                            ? "warning"
                            : u.role === "CAMPUS_MODERATOR"
                            ? "brand"
                            : "info"
                        }
                        size="sm"
                      >
                        {u.role.replace(/_/g, " ")}
                      </Badge>
                    </td>

                    {/* Role Selector */}
                    <td className="py-3.5 px-4 text-right">
                      <select
                        value={u.role}
                        disabled={updatingId === u.id}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                      >
                        {ROLES.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
