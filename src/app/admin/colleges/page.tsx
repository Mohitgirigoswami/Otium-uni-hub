"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@/components/providers/UserContext";
import {
  getColleges,
  createCollege,
  updateCollege,
  deleteCollege,
} from "@/actions/college.actions";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { toast } from "sonner";
import {
  Building2,
  MapPin,
  Plus,
  Trash2,
  Edit2,
  Users,
  RefreshCw,
  Search,
  ShieldCheck,
  CheckCircle2,
  GraduationCap,
} from "lucide-react";

export default function AdminCollegesPage() {
  const { user } = useUser();
  const [colleges, setColleges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Create / Edit Form State
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [editingCollegeId, setEditingCollegeId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchCollegesList = async () => {
    setLoading(true);
    const res = await getColleges();
    if (res.success && res.data) {
      setColleges(res.data);
    } else {
      toast.error(res.error || "Failed to load colleges.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCollegesList();
  }, []);

  const handleSaveCollege = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!name.trim() || !city.trim()) {
      toast.error("Please provide college name and city.");
      return;
    }

    setSubmitting(true);
    let res;
    if (editingCollegeId) {
      res = await updateCollege({
        id: editingCollegeId,
        name: name.trim(),
        city: city.trim(),
        adminUserId: user.id,
      });
    } else {
      res = await createCollege({
        name: name.trim(),
        city: city.trim(),
        adminUserId: user.id,
      });
    }
    setSubmitting(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(
        editingCollegeId
          ? "College updated successfully!"
          : "New campus college added!"
      );
      setName("");
      setCity("");
      setEditingCollegeId(null);
      fetchCollegesList();
    }
  };

  const handleEditClick = (col: any) => {
    setEditingCollegeId(col.id);
    setName(col.name);
    setCity(col.city);
  };

  const handleCancelEdit = () => {
    setEditingCollegeId(null);
    setName("");
    setCity("");
  };

  const handleDelete = async (colId: string, colName: string) => {
    if (!user) return;
    if (!confirm(`Are you sure you want to delete "${colName}"?`)) return;

    const res = await deleteCollege({
      id: colId,
      adminUserId: user.id,
    });

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(`"${colName}" deleted successfully.`);
      fetchCollegesList();
    }
  };

  const filteredColleges = colleges.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Building2 className="w-7 h-7 text-brand-500" />
            <span>Multi-Campus College Directory Management</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Register and manage university campuses. Content across Marketplace, Gigs, and Incognito is isolated by campus.
          </p>
        </div>

        <Button
          onClick={fetchCollegesList}
          variant="outline"
          size="sm"
          leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />}
        >
          Refresh Directory
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form: Add / Edit College */}
        <div className="lg:col-span-1">
          <GlassCard className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-brand-500" />
                <span>{editingCollegeId ? "Edit Campus" : "Add New Campus"}</span>
              </h2>
              {editingCollegeId && (
                <button
                  onClick={handleCancelEdit}
                  className="text-[11px] text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
              )}
            </div>

            <form onSubmit={handleSaveCollege} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  University / College Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Indian Institute of Technology Bombay"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Campus City / Location *
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mumbai, Maharashtra"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-brand-600 hover:bg-brand-500 font-bold text-xs"
                leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
              >
                {submitting
                  ? "Saving..."
                  : editingCollegeId
                  ? "Update College"
                  : "Register College"}
              </Button>
            </form>
          </GlassCard>
        </div>

        {/* Right Table: Registered Colleges */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search colleges by name or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <GlassCard className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/60 uppercase font-bold text-slate-400">
                  <tr>
                    <th className="py-3 px-4">Campus Name</th>
                    <th className="py-3 px-4">City</th>
                    <th className="py-3 px-4 text-center">Students</th>
                    <th className="py-3 px-4 text-center">Listings / Gigs</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-400">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-brand-500" />
                          <span>Loading colleges...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredColleges.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-400">
                        No registered colleges found. Add one using the form.
                      </td>
                    </tr>
                  ) : (
                    filteredColleges.map((col) => (
                      <tr key={col.id} className="hover:bg-slate-100/40 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-brand-500 shrink-0" />
                            <span>{col.name}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                          {col.city}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <Badge variant="brand" size="sm">
                            {col._count?.users || 0} Students
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-center text-slate-400 text-[11px]">
                          {(col._count?.marketplaceItems || 0) + (col._count?.postedTasks || 0)} Posts
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditClick(col)}
                            className="h-7 px-2 text-xs"
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(col.id, col.name)}
                            className="h-7 px-2 text-xs text-rose-500 hover:bg-rose-500/10 hover:border-rose-500/30"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
