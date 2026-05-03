import type { ApiResponse } from "@/types/api";
import type { WeatherForecast } from "@/features/weather/types/weather";

type FetchWeatherInput = {
  latitude: number;
  longitude: number;
  startDate: string;
  endDate: string;
};

export async function fetchWeather(input: FetchWeatherInput) {
  const params = new URLSearchParams({
    latitude: String(input.latitude),
    longitude: String(input.longitude),
    startDate: input.startDate,
    endDate: input.endDate,
  });

  const response = await fetch(`/api/weather?${params.toString()}`);
  const body = (await response.json()) as ApiResponse<WeatherForecast>;

  if (!response.ok || "error" in body) {
    throw new Error("error" in body ? body.error : "Could not load weather.");
  }

  return body.data;
}
