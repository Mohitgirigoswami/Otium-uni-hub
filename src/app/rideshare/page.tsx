"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { useUser } from "@/components/providers/UserContext";
import {
  getRides,
  createRide,
  bookRideSeats,
  removePassengerAction,
} from "@/actions/rideshare.actions";
import { formatPaiseToRupees, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import {
  Car,
  Plus,
  Users,
  Clock,
  MapPin,
  CheckCircle2,
  Search,
  UserX,
} from "lucide-react";
import { ClientServiceGuard } from "@/components/ClientServiceGuard";

export default function RideSharePage() {
  const { user } = useUser();
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState("");
  const [isHostModalOpen, setIsHostModalOpen] = useState(false);

  // Form states
  const [origin, setOrigin] = useState("University Campus");
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
      toast.error("Please sign in to host a cab split.");
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
      toast.success("Cab split posted to campus board.");
      setIsHostModalOpen(false);
      setDestination("");
      setDepartureTime("");
      fetchRidesList();
    }
  };

  const handleBookSeat = async (rideId: string) => {
    if (!user) {
      toast.error("Please sign in to join a ride.");
      return;
    }

    setActionLoadingId(rideId);
    const res = await bookRideSeats(rideId, user.id, 1);
    setActionLoadingId(null);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Seat booked! Host will coordinate pickup.");
      fetchRidesList();
    }
  };

  const handleLeaveRide = async (rideId: string, hostId: string) => {
    if (!user) return;
    if (!confirm("Leave this cab split?")) return;

    setActionLoadingId(rideId);
    const res = await removePassengerAction({
      rideId,
      passengerId: user.id,
      hostUserId: hostId,
    });
    setActionLoadingId(null);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Seat released.");
      fetchRidesList();
    }
  };

  return (
    <ClientServiceGuard campusId={user?.collegeId} serviceKey="CAB_SPLIT">
      <div className="space-y-8 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary text-foreground text-xs font-semibold border border-border">
              <Car className="w-3.5 h-3.5 text-primary" />
              <span>Campus Transit Split</span>
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Campus Cab & Auto Split
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Share Uber, Ola, or auto-rickshaw fares to airports, railway stations, and transit hubs.
            </p>
          </div>

          <Button
            onClick={() => setIsHostModalOpen(true)}
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Post Ride Split
          </Button>
        </div>

        {/* Filter Input */}
        <div className="max-w-md">
          <Input
            type="text"
            placeholder="Search by destination (e.g. Airport, Railway Station)..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
          />
        </div>

        {/* Rides List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-52 rounded-xl bg-secondary/60 animate-pulse border border-border" />
            ))}
          </div>
        ) : rides.length === 0 ? (
          <Card className="p-12 text-center space-y-3">
            <Car className="w-12 h-12 text-muted-foreground mx-auto" />
            <h3 className="font-bold text-foreground text-base">No active cab splits</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Headed to the station or airport? Post your departure time to share the fare.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {rides.map((ride) => {
              const isHost = user?.id === ride.hostId;
              const isPassenger = ride.passengers?.some(
                (p: any) => p.passengerId === user?.id
              );
              const isFull = ride.availableSeats <= 0;
              const isActionLoading = actionLoadingId === ride.id;

              return (
                <Card
                  key={ride.id}
                  interactive
                  className="p-5 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant={isFull ? "secondary" : "default"} size="sm">
                        {isFull ? "Full" : `${ride.availableSeats} seat(s) left`}
                      </Badge>
                      <span className="font-heading font-extrabold text-base text-foreground">
                        {formatPaiseToRupees(ride.splitCostEstimate ?? ride.splitCostEstimatePaise)} / seat
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        <span className="truncate">{ride.origin}</span>
                      </div>
                      <div className="font-heading font-bold text-base text-foreground pl-5">
                        to {ride.destination}
                      </div>
                    </div>

                    <div className="space-y-1 text-xs text-muted-foreground pt-1">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-primary" />
                        <span>Departure: {formatDate(ride.departureTime)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Car className="w-3.5 h-3.5 text-primary" />
                        <span>Vehicle: {ride.cabProvider || "Cab"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-muted-foreground truncate">
                      Host: {ride.host?.name || "Student"}
                    </span>

                    {isHost ? (
                      <Badge variant="outline" size="sm">
                        You are Host
                      </Badge>
                    ) : isPassenger ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        isLoading={isActionLoading}
                        onClick={() => handleLeaveRide(ride.id, ride.hostId)}
                      >
                        Leave Ride
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        disabled={isFull}
                        isLoading={isActionLoading}
                        onClick={() => handleBookSeat(ride.id)}
                      >
                        {isFull ? "Full" : "Book 1 Seat"}
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Post Split Modal */}
        <Modal
          isOpen={isHostModalOpen}
          onClose={() => setIsHostModalOpen(false)}
          title="Post a Cab Split"
          description="Find fellow campus students heading in the same direction to share costs."
        >
          <form onSubmit={handleHostRide} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Pickup Location *</label>
              <Input
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Destination *</label>
              <Input
                placeholder="e.g. Terminal 3 IGI Airport or Central Railway Station"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Departure Time *</label>
                <Input
                  type="datetime-local"
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Available Seats *</label>
                <select
                  value={availableSeats}
                  onChange={(e) => setAvailableSeats(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-input bg-card text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>
                      {n} seat{n > 1 ? "s" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Cost per Person (₹ INR) *</label>
                <Input
                  type="number"
                  min="20"
                  value={splitCostRupees}
                  onChange={(e) => setSplitCostRupees(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Vehicle / Provider</label>
                <Input
                  placeholder="e.g. Uber Sedan, Auto, Ertiga"
                  value={cabProvider}
                  onChange={(e) => setCabProvider(e.target.value)}
                />
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              isLoading={isSubmitting}
            >
              Broadcast Cab Split
            </Button>
          </form>
        </Modal>
      </div>
    </ClientServiceGuard>
  );
}
