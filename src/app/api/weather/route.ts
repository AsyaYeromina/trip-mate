import { NextRequest } from "next/server";

import type { DailyWeather, WeatherForecast } from "@/features/weather/types/weather";
import { badRequest, ok, serverError } from "@/server/http/responses";
import { getRequiredSearchParam, isDateRangeValid, isValidDate, parseNumber } from "@/server/http/validation";

type OpenMeteoWeatherResponse = {
  latitude?: number;
  longitude?: number;
  timezone?: string;
  daily?: {
    time?: string[];
    weather_code?: Array<number | null>;
    temperature_2m_max?: Array<number | null>;
    temperature_2m_min?: Array<number | null>;
    precipitation_sum?: Array<number | null>;
    uv_index_max?: Array<number | null>;
  };
};

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const latitude = parseNumber(request.nextUrl.searchParams.get("latitude"));
  const longitude = parseNumber(request.nextUrl.searchParams.get("longitude"));
  const startDate = getRequiredSearchParam(request.nextUrl, "startDate");
  const endDate = getRequiredSearchParam(request.nextUrl, "endDate");

  if (latitude === null || latitude < -90 || latitude > 90) {
    return badRequest("Missing or invalid latitude.");
  }

  if (longitude === null || longitude < -180 || longitude > 180) {
    return badRequest("Missing or invalid longitude.");
  }

  if (!isValidDate(startDate) || !isValidDate(endDate) || !isDateRangeValid(startDate, endDate)) {
    return badRequest("Missing or invalid date range.");
  }

  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    start_date: startDate,
    end_date: endDate,
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,uv_index_max",
    timezone: "auto",
  });

  try {
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return ok<WeatherForecast>({
        latitude,
        longitude,
        timezone: null,
        daily: [],
        unavailable_reason: "Forecast is unavailable for these dates.",
      });
    }

    const body = (await response.json()) as OpenMeteoWeatherResponse;
    const daily = normalizeDailyWeather(body.daily);

    return ok<WeatherForecast>({
      latitude: body.latitude ?? latitude,
      longitude: body.longitude ?? longitude,
      timezone: body.timezone ?? null,
      daily,
      unavailable_reason: daily.length === 0 ? "Forecast is unavailable for these dates." : undefined,
    });
  } catch {
    return serverError();
  }
}

function normalizeDailyWeather(daily: OpenMeteoWeatherResponse["daily"]) {
  const dates = daily?.time ?? [];

  return dates.map<DailyWeather>((date, index) => ({
    date,
    weather_code: daily?.weather_code?.[index] ?? null,
    temperature_2m_max: daily?.temperature_2m_max?.[index] ?? null,
    temperature_2m_min: daily?.temperature_2m_min?.[index] ?? null,
    precipitation_sum: daily?.precipitation_sum?.[index] ?? null,
    uv_index_max: daily?.uv_index_max?.[index] ?? null,
  }));
}
