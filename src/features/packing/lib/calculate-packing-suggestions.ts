import type { PackingSuggestion } from "@/features/packing/types/packing";
import type { Trip } from "@/features/trips/types/trip";
import { getTripDurationDays } from "@/features/trips/lib/date";
import type { WeatherForecast } from "@/features/weather/types/weather";

function hasRain(weather: WeatherForecast | null) {
  return weather?.daily.some((day) => (day.precipitation_sum ?? 0) > 0) ?? false;
}

function hasColdWeather(weather: WeatherForecast | null) {
  return weather?.daily.some((day) => (day.temperature_2m_min ?? 99) < 10) ?? false;
}

function hasHighUv(weather: WeatherForecast | null) {
  return weather?.daily.some((day) => (day.uv_index_max ?? 0) > 3) ?? false;
}

function hasHotWeather(weather: WeatherForecast | null) {
  return weather?.daily.some((day) => (day.temperature_2m_max ?? 0) > 25) ?? false;
}

export function calculatePackingSuggestions(
  trip: Trip,
  weather: WeatherForecast | null,
): PackingSuggestion[] {
  const suggestions: PackingSuggestion[] = [];
  const durationDays = getTripDurationDays(trip.date_start, trip.date_end);

  if (hasRain(weather)) {
    suggestions.push(
      {
        id: "rain-jacket",
        label: "Rain jacket",
        reason: "Rain is expected during the trip.",
        category: "weather",
      },
      {
        id: "umbrella",
        label: "Umbrella",
        reason: "Precipitation appears in the forecast.",
        category: "weather",
      },
    );
  }

  if (hasColdWeather(weather)) {
    suggestions.push({
      id: "warm-layers",
      label: "Warm layers",
      reason: "Some forecasted nights are below 10C.",
      category: "weather",
    });
  }

  if (durationDays > 5) {
    suggestions.push(
      {
        id: "laundry-bag",
        label: "Laundry bag",
        reason: "Longer trips are easier to manage with separated laundry.",
        category: "duration",
      },
      {
        id: "extra-socks",
        label: "Extra socks",
        reason: "The trip is longer than five days.",
        category: "duration",
      },
    );
  }

  if (hasHighUv(weather)) {
    suggestions.push({
      id: "sunscreen",
      label: "Sunscreen",
      reason: "UV index is expected to be above 3.",
      category: "weather",
    });
  }

  if (hasHotWeather(weather)) {
    suggestions.push({
      id: "hat",
      label: "Hat",
      reason: "Some forecasted days are above 25C.",
      category: "weather",
    });
  }

  if (trip.trip_type === "adventure") {
    suggestions.push(
      {
        id: "comfortable-shoes",
        label: "Comfortable shoes",
        reason: "Adventure trips usually involve more walking.",
        category: "trip-type",
      },
      {
        id: "backpack",
        label: "Backpack",
        reason: "A day backpack is useful for adventure plans.",
        category: "trip-type",
      },
    );
  }

  if (suggestions.length === 0) {
    suggestions.push({
      id: "daily-basics",
      label: "Daily basics",
      reason: "Pack essentials for the selected dates and trip type.",
      category: "duration",
    });
  }

  return suggestions;
}
