"use server";

import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { ActionResponse } from "@/lib/types";
import { rupeesToPaise } from "@/lib/utils";

/**
 * Fetch all ride shares, automatically sorted by closest upcoming departure
 */
export async function getRides(filters?: {
  destination?: string;
  status?: string;
}): Promise<ActionResponse<any[]>> {
  try {
    const where: any = {};

    if (filters?.status && filters.status !== "ALL") {
      where.status = filters.status;
    }

    if (filters?.destination && filters.destination.trim() !== "") {
      where.destination = {
        contains: filters.destination,
        mode: "insensitive",
      };
    }

    const rides = await prisma.rideShare.findMany({
      where,
      include: {
        host: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            image: true,
            department: true,
          },
        },
        bookings: {
          include: {
            passenger: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
      },
      orderBy: {
        departureTime: "asc", // Auto-sorted by closest departure
      },
    });

    return {
      success: true,
      data: rides,
    };
  } catch (error: any) {
    console.error("Error in getRides:", error);
    return {
      error: error?.message || "Failed to fetch ride shares.",
      data: [],
    };
  }
}

/**
 * Host a new Cab Split / RideShare
 */
export async function createRide(data: {
  hostId: string;
  origin?: string;
  destination: string;
  departureTime: string;
  availableSeats: number;
  splitCostEstimateRupees: number;
  cabProvider?: string;
}): Promise<ActionResponse<any>> {
  try {
    const rateCheck = await checkRateLimit(data.hostId);
    if (!rateCheck.success) {
      return { error: rateCheck.error };
    }

    if (!data.destination?.trim()) return { error: "Destination is required." };
    if (!data.departureTime) return { error: "Departure time is required." };
    if (!data.availableSeats || data.availableSeats < 1) {
      return { error: "At least 1 seat must be available." };
    }

    const costPaise = rupeesToPaise(data.splitCostEstimateRupees || 0);

    const ride = await prisma.rideShare.create({
      data: {
        hostId: data.hostId,
        origin: data.origin?.trim() || "Campus Main Gate",
        destination: data.destination.trim(),
        departureTime: new Date(data.departureTime),
        availableSeats: Number(data.availableSeats),
        totalSeats: Number(data.availableSeats),
        splitCostEstimate: costPaise,
        cabProvider: data.cabProvider || "Uber/Ola",
        status: "OPEN",
      },
      include: {
        host: true,
      },
    });

    return {
      success: true,
      data: ride,
    };
  } catch (error: any) {
    console.error("Error in createRide:", error);
    return {
      error: error?.message || "Failed to host ride share.",
    };
  }
}

/**
 * Book seats in a RideShare
 */
export async function bookRideSeats(
  rideId: string,
  passengerId: string,
  seatsCount: number = 1
): Promise<ActionResponse<any>> {
  try {
    const rateCheck = await checkRateLimit(passengerId);
    if (!rateCheck.success) {
      return { error: rateCheck.error };
    }

    const ride = await prisma.rideShare.findUnique({
      where: { id: rideId },
      include: { bookings: true },
    });

    if (!ride) {
      return { error: "Ride share not found." };
    }

    if (ride.hostId === passengerId) {
      return { error: "You cannot book seats on your own ride." };
    }

    if (ride.availableSeats < seatsCount) {
      return { error: `Only ${ride.availableSeats} seat(s) available.` };
    }

    // Check if user already booked
    const existingBooking = ride.bookings.find((b) => b.passengerId === passengerId);
    if (existingBooking) {
      return { error: "You have already joined this ride." };
    }

    const newAvailable = ride.availableSeats - seatsCount;
    const newStatus = newAvailable === 0 ? "FULL" : "OPEN";

    const [booking, updatedRide] = await prisma.$transaction([
      prisma.rideShareBooking.create({
        data: {
          rideId,
          passengerId,
          seatsBooked: seatsCount,
        },
      }),
      prisma.rideShare.update({
        where: { id: rideId },
        data: {
          availableSeats: newAvailable,
          status: newStatus,
        },
      }),
    ]);

    return {
      success: true,
      data: { booking, ride: updatedRide },
    };
  } catch (error: any) {
    console.error("Error in bookRideSeats:", error);
    return {
      error: error?.message || "Failed to book ride seats.",
    };
  }
}

/**
 * 4. CAB SPLIT: HOST KICK SYSTEM
 * Remove a passenger from the cab split, increment availableSeats by 1, set status to OPEN
 */
export async function removePassengerAction(data: {
  rideId: string;
  passengerId: string;
  hostUserId: string;
}): Promise<ActionResponse<any>> {
  try {
    const rateCheck = await checkRateLimit(data.hostUserId || "host-kick");
    if (!rateCheck.success) return { error: rateCheck.error };

    const ride = await prisma.rideShare.findUnique({
      where: { id: data.rideId },
      include: { bookings: true },
    });

    if (!ride) {
      return { error: "Ride share not found." };
    }

    if (ride.hostId !== data.hostUserId) {
      return { error: "Unauthorized: Only the cab host can remove passengers." };
    }

    const booking = ride.bookings.find((b) => b.passengerId === data.passengerId);
    if (!booking) {
      return { error: "Passenger is not booked on this cab split." };
    }

    const freedSeats = booking.seatsBooked || 1;
    const newAvailable = Math.min(ride.totalSeats, ride.availableSeats + freedSeats);

    await prisma.$transaction([
      prisma.rideShareBooking.delete({
        where: { id: booking.id },
      }),
      prisma.rideShare.update({
        where: { id: data.rideId },
        data: {
          availableSeats: newAvailable,
          status: "OPEN",
        },
      }),
    ]);

    return {
      success: true,
      data: { message: "Passenger removed and seat released." },
    };
  } catch (error: any) {
    console.error("Error in removePassengerAction:", error);
    return {
      error: error?.message || "Failed to remove passenger from cab split.",
    };
  }
}

