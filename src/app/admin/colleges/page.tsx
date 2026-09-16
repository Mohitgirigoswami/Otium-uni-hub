"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@/components/providers/UserContext";
import {
  getColleges,
  createCollege,
  updateCollege,
  deleteCollege,
} from "@/actions/college.actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
      toast.error("Please fill in both name and city fields.");
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
          ? "College updated successfully."
          : "College registered successfully."
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
    <div className="space-y-6 max-w-6xl mx-auto p-4 sm:p-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary text-foreground text-xs font-semibold border border-border">
            <Building2 className="w-3.5 h-3.5 text-primary" />
            <span>Campus Registry</span>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Multi-Campus College Directory
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
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
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-sm font-bold text-foreground flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" />
                <span>{editingCollegeId ? "Edit Campus" : "Add New Campus"}</span>
              </h2>
              {editingCollegeId && (
                <button
                  onClick={handleCancelEdit}
                  className="text-[11px] text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              )}
            </div>

            <form onSubmit={handleSaveCollege} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  University / College Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Indian Institute of Technology Bombay"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-card border border-input text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Campus City / Location *
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mumbai, Maharashtra"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-lg bg-card border border-input text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                size="md"
                className="w-full font-bold text-xs"
                leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
              >
                {submitting
                  ? "Saving..."
                  : editingCollegeId
                  ? "Update College"
                  : "Register College"}
              </Button>
            </form>
          </Card>
        </div>

        {/* Right Table: Registered Colleges */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search colleges by name or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-card border border-input text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-secondary/70 border-b border-border uppercase font-semibold text-muted-foreground">
                  <tr>
                    <th className="py-3 px-4">Campus Name</th>
                    <th className="py-3 px-4">City</th>
                    <th className="py-3 px-4 text-center">Students</th>
                    <th className="py-3 px-4 text-center">Listings / Gigs</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                          <span>Loading colleges...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredColleges.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-muted-foreground">
                        No registered colleges found. Add one using the form.
                      </td>
                    </tr>
                  ) : (
                    filteredColleges.map((col) => (
                      <tr key={col.id} className="hover:bg-secondary/40 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-foreground">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-primary shrink-0" />
                            <span>{col.name}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-foreground">
                          {col.city}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <Badge variant="secondary" size="sm">
                            {col._count?.users || 0} Students
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-center text-muted-foreground text-[11px]">
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
                            className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
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
          </Card>
        </div>
      </div>
    </div>
  );
}
