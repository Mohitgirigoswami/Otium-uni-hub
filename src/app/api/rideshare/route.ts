import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/utils/auth";
import { getRides, createRide, bookRideSeats } from "@/actions/rideshare.actions";

/**
 * Mobile & Web REST API: /api/rideshare
 * GET: List active rideshares
 * POST: Host a new ride or book seats
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const destination = searchParams.get("destination") || undefined;
    const status = searchParams.get("status") || undefined;

    const result = await getRides({ destination, status });
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Failed to load rides." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data || [],
    });
  } catch (error: any) {
    console.error("[GET /api/rideshare Error]:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { success: false, error: auth.error || "Authentication required." },
        { status: 401 }
      );
    }

    const userId = auth.user.id;
    const body = await req.json();

    // Action: Book Seats
    if (body.action === "BOOK_SEATS") {
      const { rideId, seatsBooked = 1 } = body;
      if (!rideId) {
        return NextResponse.json(
          { success: false, error: "Ride ID is required." },
          { status: 400 }
        );
      }

      const bookResult = await bookRideSeats(
        rideId,
        userId,
        Number(seatsBooked)
      );

      if (!bookResult.success) {
        return NextResponse.json(
          { success: false, error: bookResult.error || "Failed to book seats." },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        data: bookResult.data,
      });
    }

    // Action: Host Ride
    const {
      origin,
      destination,
      departureTime,
      availableSeats,
      splitCostEstimateRupees,
      cabProvider,
    } = body;

    if (!origin || !destination || !departureTime) {
      return NextResponse.json(
        { success: false, error: "Origin, destination, and departure time are required." },
        { status: 400 }
      );
    }

    const hostResult = await createRide({
      hostId: userId,
      origin: origin.trim(),
      destination: destination.trim(),
      departureTime,
      availableSeats: Number(availableSeats) || 3,
      splitCostEstimateRupees: Number(splitCostEstimateRupees) || 200,
      cabProvider: cabProvider?.trim() || "Uber XL",
    });

    if (!hostResult.success) {
      return NextResponse.json(
        { success: false, error: hostResult.error || "Failed to host ride." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: hostResult.data,
    });
  } catch (error: any) {
    console.error("[POST /api/rideshare Error]:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error." },
      { status: 500 }
    );
  }
}
