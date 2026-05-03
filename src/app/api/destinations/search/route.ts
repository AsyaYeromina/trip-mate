import { NextRequest } from "next/server";

import type { DestinationSearchResult } from "@/features/destinations/types/destination";
import { badRequest, ok, serverError } from "@/server/http/responses";
import { getRequiredSearchParam } from "@/server/http/validation";

type OpenMeteoGeocodingResult = {
  id?: number;
  name?: string;
  country_code?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
};

type OpenMeteoGeocodingResponse = {
  results?: OpenMeteoGeocodingResult[];
};

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const name = getRequiredSearchParam(request.nextUrl, "name");
  const countParam = request.nextUrl.searchParams.get("count");
  const count = countParam ? Number(countParam) : 6;

  if (!name || name.length < 2) {
    return badRequest("Search name must contain at least 2 characters.");
  }

  if (!Number.isInteger(count) || count < 1 || count > 10) {
    return badRequest("count must be between 1 and 10.");
  }

  const params = new URLSearchParams({
    name,
    count: String(count),
    language: "en",
    format: "json",
  });

  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`,
      { cache: "no-store" },
    );

    if (!response.ok) {
      return serverError();
    }

    const body = (await response.json()) as OpenMeteoGeocodingResponse;
    const results: DestinationSearchResult[] = (body.results ?? [])
      .filter(isUsableResult)
      .map((result) => ({
        id: result.id,
        name: result.name,
        country_code: result.country_code,
        country_name: result.country ?? null,
        latitude: result.latitude,
        longitude: result.longitude,
        timezone: result.timezone ?? null,
      }));

    return ok(results);
  } catch {
    return serverError();
  }
}

function isUsableResult(
  result: OpenMeteoGeocodingResult,
): result is Required<Pick<OpenMeteoGeocodingResult, "id" | "name" | "country_code" | "latitude" | "longitude">> &
  OpenMeteoGeocodingResult {
  return (
    typeof result.id === "number" &&
    typeof result.name === "string" &&
    typeof result.country_code === "string" &&
    typeof result.latitude === "number" &&
    typeof result.longitude === "number"
  );
}
