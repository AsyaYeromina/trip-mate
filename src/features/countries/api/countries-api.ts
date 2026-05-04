import type { Country } from "@/features/countries/types/country";
import type { ApiResponse } from "@/types/api";

const countriesCache = new Map<string, Country>();

export async function fetchCountry(countryCode: string, options: { force?: boolean } = {}) {
  const normalizedCountryCode = countryCode.toUpperCase();
  const cachedCountry = countriesCache.get(normalizedCountryCode);

  if (cachedCountry && !options.force) {
    return cachedCountry;
  }

  const response = await fetch(`/api/countries/${encodeURIComponent(normalizedCountryCode)}`);
  const body = (await response.json()) as ApiResponse<Country>;

  if (!response.ok || "error" in body) {
    throw new Error("error" in body ? body.error : "Could not load country.");
  }

  countriesCache.set(normalizedCountryCode, body.data);
  return body.data;
}
