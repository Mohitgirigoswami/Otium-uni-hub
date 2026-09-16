"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@/components/providers/UserContext";
import { searchUsersAdmin, updateUserRoleAdmin } from "@/actions/admin.actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    fetchUsers();
  }, [user]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(searchQuery);
  };

  const handleRoleChange = async (targetUserId: string, newRole: Role) => {
    if (!user) return;
    setUpdatingId(targetUserId);

    const res = await updateUserRoleAdmin({
      adminUserId: user.id,
      targetUserId,
      role: newRole,
    });

    setUpdatingId(null);

    if (res.success) {
      toast.success(`User role updated to ${newRole}.`);
      setUsersList((prev) =>
        prev.map((u) => (u.id === targetUserId ? { ...u, role: newRole } : u))
      );
    } else {
      toast.error(res.error || "Failed to change user role.");
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 sm:p-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary text-foreground text-xs font-semibold border border-border">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            <span>Role Management</span>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            User Directory & Granular Roles
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
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
      <Card className="p-4">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search user by email or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-card border border-input text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <Button type="submit" size="sm" className="font-bold px-5">
            Search
          </Button>
        </form>
      </Card>

      {/* Users Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-secondary/70 border-b border-border uppercase font-semibold text-muted-foreground">
              <tr>
                <th className="py-3 px-4">User Details</th>
                <th className="py-3 px-4">College / Campus</th>
                <th className="py-3 px-4">Department & Year</th>
                <th className="py-3 px-4">Current Role</th>
                <th className="py-3 px-4 text-right">Assign Granular Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                      <span>Searching user records...</span>
                    </div>
                  </td>
                </tr>
              ) : usersList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground">
                    No users found matching your search.
                  </td>
                </tr>
              ) : (
                usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-secondary/40 transition-colors">
                    {/* User */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={
                            u.image ||
                            "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&auto=format&fit=crop&q=80"
                          }
                          alt={u.name || "User"}
                          className="w-8 h-8 rounded-full object-cover bg-secondary border border-border"
                        />
                        <div>
                          <p className="font-bold text-foreground">
                            {u.name || "Student"}
                          </p>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5 font-mono">
                            <Mail className="w-2.5 h-2.5" />
                            <span>{u.email}</span>
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* College */}
                    <td className="py-3.5 px-4 text-foreground">
                      {u.college ? (
                        <div className="flex items-center gap-1.5 font-semibold">
                          <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span>{u.college.name}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-amber-500 font-medium">
                          No campus selected
                        </span>
                      )}
                    </td>

                    {/* Department / Year */}
                    <td className="py-3.5 px-4 text-muted-foreground">
                      <p className="font-medium text-foreground">
                        {u.department || "General Undergrad"}
                      </p>
                      {u.year && (
                        <p className="text-[10px] text-muted-foreground">Year {u.year}</p>
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
                            : "secondary"
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
                        className="px-3 py-1.5 rounded-lg bg-card border border-input text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
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
      </Card>
    </div>
  );
}
