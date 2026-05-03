import type { DestinationSearchResult } from "@/features/destinations/types/destination";
import type { ApiResponse } from "@/types/api";

export async function searchDestinations(query: string, signal?: AbortSignal) {
  const params = new URLSearchParams({
    name: query,
    count: "6",
  });

  const response = await fetch(`/api/destinations/search?${params.toString()}`, {
    signal,
  });
  const body = (await response.json()) as ApiResponse<DestinationSearchResult[]>;

  if (!response.ok || "error" in body) {
    throw new Error("error" in body ? body.error : "Could not search destinations.");
  }

  return body.data;
}
