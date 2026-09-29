export interface GetRidesFilters {
  destination?: string;
  status?: string;
}

export interface CreateRideParams {
  hostId: string;
  origin?: string;
  destination: string;
  departureTime: string;
  availableSeats: number;
  splitCostEstimateRupees: number;
  cabProvider?: string;
}

export interface RemovePassengerParams {
  rideId: string;
  passengerId: string;
  hostUserId: string;
}
