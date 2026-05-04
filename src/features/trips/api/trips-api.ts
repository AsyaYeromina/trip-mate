import type { ApiResponse } from "@/types/api";
import type { CreateTripInput, Trip } from "@/features/trips/types/trip";

const tripsByOwnerCache = new Map<string, Trip[]>();
const tripsByIdCache = new Map<string, Trip>();

function getTripCacheKey(ownerKey: string, tripId: string) {
  return `${ownerKey}:${tripId}`;
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const body = (await response.json()) as ApiResponse<T>;

  if (!response.ok || "error" in body) {
    throw new Error("error" in body ? body.error : "Request failed.");
  }

  return body.data;
}

export function writeTripsCache(ownerKey: string, trips: Trip[]) {
  tripsByOwnerCache.set(ownerKey, trips);

  for (const trip of trips) {
    tripsByIdCache.set(getTripCacheKey(ownerKey, trip.id), trip);
  }
}

export function writeTripCache(ownerKey: string, trip: Trip) {
  tripsByIdCache.set(getTripCacheKey(ownerKey, trip.id), trip);

  const cachedTrips = tripsByOwnerCache.get(ownerKey);

  if (!cachedTrips) {
    return;
  }

  tripsByOwnerCache.set(ownerKey, [
    trip,
    ...cachedTrips.filter((cachedTrip) => cachedTrip.id !== trip.id),
  ]);
}

export function removeTripFromCache(ownerKey: string, tripId: string) {
  tripsByIdCache.delete(getTripCacheKey(ownerKey, tripId));

  const cachedTrips = tripsByOwnerCache.get(ownerKey);

  if (!cachedTrips) {
    return;
  }

  tripsByOwnerCache.set(
    ownerKey,
    cachedTrips.filter((trip) => trip.id !== tripId),
  );
}

export async function fetchTrips(ownerKey: string, options: { force?: boolean } = {}) {
  const cachedTrips = tripsByOwnerCache.get(ownerKey);

  if (cachedTrips && !options.force) {
    return cachedTrips;
  }

  const response = await fetch(`/api/trips?ownerKey=${encodeURIComponent(ownerKey)}`);
  const trips = await readJsonResponse<Trip[]>(response);

  writeTripsCache(ownerKey, trips);
  return trips;
}

export async function fetchTripById(
  tripId: string,
  ownerKey: string,
  options: { force?: boolean } = {},
) {
  const cacheKey = getTripCacheKey(ownerKey, tripId);
  const cachedTrip = tripsByIdCache.get(cacheKey);

  if (cachedTrip && !options.force) {
    return cachedTrip;
  }

  const response = await fetch(
    `/api/trips/${encodeURIComponent(tripId)}?ownerKey=${encodeURIComponent(ownerKey)}`,
  );
  const trip = await readJsonResponse<Trip>(response);

  writeTripCache(ownerKey, trip);
  return trip;
}

export async function createTrip(input: CreateTripInput) {
  const response = await fetch("/api/trips", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const trip = await readJsonResponse<Trip>(response);

  writeTripCache(trip.owner_key, trip);
  return trip;
}

export async function deleteTrip(tripId: string, ownerKey: string) {
  const response = await fetch(
    `/api/trips/${encodeURIComponent(tripId)}?ownerKey=${encodeURIComponent(ownerKey)}`,
    {
      method: "DELETE",
    },
  );

  return readJsonResponse<{ id: string }>(response);
}
