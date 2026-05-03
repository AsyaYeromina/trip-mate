import type { ApiResponse } from "@/types/api";
import type { CreateTripInput, Trip } from "@/features/trips/types/trip";

async function readJsonResponse<T>(response: Response): Promise<T> {
  const body = (await response.json()) as ApiResponse<T>;

  if (!response.ok || "error" in body) {
    throw new Error("error" in body ? body.error : "Request failed.");
  }

  return body.data;
}

export async function fetchTrips(ownerKey: string) {
  const response = await fetch(`/api/trips?ownerKey=${encodeURIComponent(ownerKey)}`);
  return readJsonResponse<Trip[]>(response);
}

export async function fetchTripById(tripId: string, ownerKey: string) {
  const response = await fetch(
    `/api/trips/${encodeURIComponent(tripId)}?ownerKey=${encodeURIComponent(ownerKey)}`,
  );
  return readJsonResponse<Trip>(response);
}

export async function createTrip(input: CreateTripInput) {
  const response = await fetch("/api/trips", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return readJsonResponse<Trip>(response);
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
