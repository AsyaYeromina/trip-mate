import type { Country } from "@/features/countries/types/country";
import type { ApiResponse } from "@/types/api";

export async function fetchCountry(countryCode: string) {
  const response = await fetch(`/api/countries/${encodeURIComponent(countryCode)}`);
  const body = (await response.json()) as ApiResponse<Country>;

  if (!response.ok || "error" in body) {
    throw new Error("error" in body ? body.error : "Could not load country.");
  }

  return body.data;
}
