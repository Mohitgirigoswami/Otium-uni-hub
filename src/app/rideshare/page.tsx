"use client";

import React, { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { useUser } from "@/components/providers/UserContext";
import {
  getRides,
  createRide,
  bookRideSeats,
  removePassengerAction,
} from "@/actions/rideshare.actions";
import { formatPaiseToRupees, formatDate, formatTimeOnly } from "@/lib/utils";
import { toast } from "sonner";
import {
  Car,
  Plus,
  Users,
  Clock,
  MapPin,
  Sparkles,
  Plane,
  Train,
  Building,
  Navigation,
  CheckCircle2,
  Search,
  UserX,
  ShieldAlert,
} from "lucide-react";
import { ClientServiceGuard } from "@/components/ClientServiceGuard";

export default function RideSharePage() {
  const { user } = useUser();
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState("");
  const [isHostModalOpen, setIsHostModalOpen] = useState(false);

  // Form states
  const [origin, setOrigin] = useState("YMCA Campus");
  const [destination, setDestination] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [availableSeats, setAvailableSeats] = useState("3");
  const [splitCostRupees, setSplitCostRupees] = useState("250");
  const [cabProvider, setCabProvider] = useState("Uber XL");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchRidesList = async () => {
    setLoading(true);
    const dest = searchFilter.trim() ? searchFilter.trim() : undefined;
    const res = await getRides({ destination: dest });
    if (res.success && res.data) {
      setRides(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRidesList();
  }, [searchFilter]);

  const handleHostRide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please login to post a cab split.");
      return;
    }
    if (!origin.trim() || !destination.trim() || !departureTime) {
      toast.error("Please fill in origin, destination, and departure time.");
      return;
    }

    setIsSubmitting(true);
    const res = await createRide({
      hostId: user.id,
      origin: origin.trim(),
      destination: destination.trim(),
      departureTime,
      availableSeats: Number(availableSeats),
      splitCostEstimateRupees: Number(splitCostRupees),
      cabProvider,
    });
    setIsSubmitting(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Ride split posted! Fellow campus travelers can now join.");
      setIsHostModalOpen(false);
      setDestination("");
      setDepartureTime("");
      fetchRidesList();
    }
  };

  const handleJoinRide = async (rideId: string) => {
    if (!user) return;
    setActionLoadingId(rideId);

    const res = await bookRideSeats(rideId, user.id, 1);
    setActionLoadingId(null);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Seat confirmed! Added to cab split group.");
      fetchRidesList();
    }
  };

  const handleKickPassenger = async (
    rideId: string,
    passengerId: string,
    passengerName: string
  ) => {
    if (!user) return;
    const confirm = window.confirm(
      `Are you sure you want to kick/remove "${passengerName}" from this cab split? The seat will immediately become available for others.`
    );
    if (!confirm) return;

    setActionLoadingId(`${rideId}-${passengerId}`);
    const res = await removePassengerAction({
      rideId,
      passengerId,
      hostUserId: user.id,
    });
    setActionLoadingId(null);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(`Removed ${passengerName}. Seat opened up!`);
      fetchRidesList();
    }
  };

  const getDestinationIcon = (dest: string) => {
    const d = dest.toLowerCase();
    if (
      d.includes("airport") ||
      d.includes("t3") ||
      d.includes("t1") ||
      d.includes("blr") ||
      d.includes("del") ||
      d.includes("flight")
    )
      return <Plane className="w-4 h-4 text-sky-400" />;
    if (
      d.includes("train") ||
      d.includes("railway") ||
      d.includes("station") ||
      d.includes("metro")
    )
      return <Train className="w-4 h-4 text-emerald-400" />;
    return <Building className="w-4 h-4 text-accent-400" />;
  };

  const getRelativeDeparture = (deptDate: Date | string) => {
    const d = new Date(deptDate);
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));

    if (diffHours < 0) return "Departed";
    if (diffHours === 0) return "Departs in under an hour";
    if (diffHours === 1) return "Departs in 1 hour";
    if (diffHours < 24) return `Departs in ${diffHours} hours`;
    return `Departs in ${Math.round(diffHours / 24)} days`;
  };

  return (
    <ClientServiceGuard campusId={user?.collegeId} serviceKey="CAB_SPLIT">
      <div className="space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-950/90 via-slate-900/90 to-brand-950/90 p-8 sm:p-10 border border-indigo-500/30 text-white shadow-2xl backdrop-blur-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 -mb-16 w-60 h-60 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
              <Car className="w-3.5 h-3.5" />
              <span>Campus Cab Split & Travel Network</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Airport & Station RideSplit
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Heading to the airport for holidays or catching a weekend train? Share cab fares with verified batchmates. Host controls & passenger kick safeguards.
            </p>
          </div>

          <Button
            variant="brand"
            size="lg"
            leftIcon={<Plus className="w-5 h-5" />}
            onClick={() => setIsHostModalOpen(true)}
            className="shadow-lg shadow-indigo-500/25 bg-gradient-to-r from-indigo-600 to-brand-500"
          >
            Host a Cab Split
          </Button>
        </div>
      </div>

      {/* Free-Text Destination Search & Filter */}
      <GlassCard className="p-4 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search any destination (e.g., Delhi Airport T3, YMCA Campus, Faridabad Station)..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        {searchFilter && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSearchFilter("")}
            className="text-xs"
          >
            Clear Filter
          </Button>
        )}
      </GlassCard>

      {/* Rides Grid (Auto-sorted by closest departure) */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-64 rounded-2xl bg-slate-200/50 dark:bg-slate-800 animate-pulse"
            />
          ))}
        </div>
      ) : rides.length === 0 ? (
        <GlassCard className="text-center py-16">
          <Car className="w-12 h-12 mx-auto text-slate-400 mb-3 opacity-60" />
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">
            No active cab splits found
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Be the first to host a ride split and save money with campus peers!
          </p>
          <Button
            variant="brand"
            size="sm"
            className="mt-4"
            onClick={() => setIsHostModalOpen(true)}
          >
            Host This Ride
          </Button>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rides.map((ride) => {
            const isHost = ride.hostId === user?.id;
            const hasJoined = ride.bookings?.some(
              (b: any) => b.passengerId === user?.id
            );
            const isFull = ride.availableSeats === 0 || ride.status === "FULL";
            const bookedPassengers = ride.bookings || [];

            return (
              <GlassCard
                key={ride.id}
                interactive
                className="flex flex-col justify-between border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-400/50"
              >
                <div className="space-y-4">
                  {/* Destination & Cab Type */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/30">
                        {getDestinationIcon(ride.destination)}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                          {ride.destination}
                        </h3>
                        <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Navigation className="w-3 h-3 text-slate-400" />
                          <span>From: {ride.origin}</span>
                        </p>
                      </div>
                    </div>

                    <Badge variant={isFull ? "danger" : "success"} size="sm">
                      {isFull ? "FULL" : `${ride.availableSeats} Seats Left`}
                    </Badge>
                  </div>

                  {/* Timing & Vehicle */}
                  <div className="p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                        <Clock className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Departure Time</span>
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {formatDate(ride.departureTime)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Timing Status</span>
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                        {getRelativeDeparture(ride.departureTime)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Cab Service</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {ride.cabProvider || "Uber / Ola"}
                      </span>
                    </div>
                  </div>

                  {/* Passenger Manifest & Host Kick Safeguards */}
                  {bookedPassengers.length > 0 && (
                    <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/20 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Joined Passengers ({bookedPassengers.length})</span>
                        </span>
                        {isHost && (
                          <span className="text-[10px] text-amber-500 font-semibold lowercase">
                            host control active
                          </span>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        {bookedPassengers.map((b: any) => (
                          <div
                            key={b.id}
                            className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-white/40 dark:bg-slate-900/40"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <img
                                src={
                                  b.passenger?.image ||
                                  `https://api.dicebear.com/9.x/bottts/svg?seed=${b.passenger?.name || "Passenger"}`
                                }
                                alt="Passenger"
                                className="w-5 h-5 rounded-full object-cover"
                              />
                              <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[120px]">
                                {b.passenger?.name || "Student"}
                              </span>
                            </div>

                            {isHost && (
                              <button
                                type="button"
                                disabled={actionLoadingId === `${ride.id}-${b.passengerId}`}
                                onClick={() =>
                                  handleKickPassenger(
                                    ride.id,
                                    b.passengerId,
                                    b.passenger?.name || "Passenger"
                                  )
                                }
                                className="px-2 py-0.5 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-[10px] font-bold transition-colors flex items-center gap-1"
                                title="Kick passenger from this cab split"
                              >
                                <UserX className="w-3 h-3" />
                                <span>Kick</span>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Price, Host & Action Button */}
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">
                        Estimated Split Fare
                      </p>
                      <p className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400">
                        {formatPaiseToRupees(ride.splitCostEstimate)}{" "}
                        <span className="text-xs font-normal text-slate-400">
                          / seat
                        </span>
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] uppercase font-bold text-slate-400">
                        Host
                      </p>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[110px]">
                        {ride.host?.name || "Student"}
                      </p>
                    </div>
                  </div>

                  <div>
                    {isHost ? (
                      <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-center text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        You are hosting this ride
                      </div>
                    ) : hasJoined ? (
                      <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Seat Booked & Confirmed</span>
                      </div>
                    ) : isFull ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled
                        className="w-full text-xs"
                      >
                        Cab is Full
                      </Button>
                    ) : (
                      <Button
                        variant="brand"
                        size="sm"
                        isLoading={actionLoadingId === ride.id}
                        onClick={() => handleJoinRide(ride.id)}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-xs"
                      >
                        Join Split ({formatPaiseToRupees(ride.splitCostEstimate)})
                      </Button>
                    )}
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Host a Ride Modal */}
      <Modal
        isOpen={isHostModalOpen}
        onClose={() => setIsHostModalOpen(false)}
        title="Host a Cab Split"
        description="Share ride details with students traveling to the same destination."
        maxWidth="lg"
      >
        <form onSubmit={handleHostRide} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Pickup Point / Origin *
            </label>
            <input
              type="text"
              required
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="e.g., YMCA Campus"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Destination *
            </label>
            <input
              type="text"
              required
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g., Delhi Airport T3"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Departure Date & Time *
              </label>
              <input
                type="datetime-local"
                required
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Available Seats *
              </label>
              <select
                value={availableSeats}
                onChange={(e) => setAvailableSeats(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="1">1 Seat</option>
                <option value="2">2 Seats</option>
                <option value="3">3 Seats</option>
                <option value="4">4 Seats</option>
                <option value="5">5 Seats (SUV)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Estimated Cost per Seat (₹ INR) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold">
                  ₹
                </span>
                <input
                  type="number"
                  min="0"
                  required
                  value={splitCostRupees}
                  onChange={(e) => setSplitCostRupees(e.target.value)}
                  className="w-full pl-8 pr-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Ride / Cab Service
              </label>
              <select
                value={cabProvider}
                onChange={(e) => setCabProvider(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Uber XL">Uber XL (Spacious)</option>
                <option value="Uber Premier">Uber Premier</option>
                <option value="Ola Prime">Ola Prime Sedan</option>
                <option value="BluSmart EV">BluSmart EV (Eco)</option>
                <option value="Personal Car">Personal Carpool</option>
                <option value="Auto Split">Auto Rickshaw Split</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsHostModalOpen(false)}
            >
              Cancel
            </Button>
            <SubmitButton
              isSubmitting={isSubmitting}
              loadingText="Publishing Split..."
            >
              Host Cab Split
            </SubmitButton>
          </div>
        </form>
      </Modal>
      </div>
    </ClientServiceGuard>
  );
}
