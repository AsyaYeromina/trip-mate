"use client";

import { CalendarDays, CloudSun, Globe2, MapPin, PackageCheck, Thermometer } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Country } from "@/features/countries/types/country";
import type { PackingSuggestion } from "@/features/packing/types/packing";
import { formatTripDateRange, getTripDurationDays } from "@/features/trips/lib/date";
import type { Trip } from "@/features/trips/types/trip";
import type { WeatherForecast } from "@/features/weather/types/weather";

type TripDetailProps = {
  trip: Trip;
  country: Country | null;
  weather: WeatherForecast | null;
  packing: PackingSuggestion[];
};

export function TripDetail({ trip, country, weather, packing }: TripDetailProps) {
  const durationDays = getTripDurationDays(trip.date_start, trip.date_end);
  const averageMaxTemperature = getAverage(
    weather?.daily.map((day) => day.temperature_2m_max).filter(isNumber) ?? [],
  );
  const totalRain = getTotal(
    weather?.daily.map((day) => day.precipitation_sum).filter(isNumber) ?? [],
  );
  const maxUv = Math.max(0, ...(weather?.daily.map((day) => day.uv_index_max ?? 0) ?? []));

  return (
    <div className="space-y-6">
      <header>
        <Badge variant="outline">{trip.trip_type}</Badge>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal md:text-4xl">
          {trip.destination_name}
        </h1>
        <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-4" />
            {trip.country_name ?? trip.country_code}
          </span>
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="size-4" />
            {formatTripDateRange(trip.date_start, trip.date_end)}
          </span>
          <span>{durationDays} days</span>
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <CloudSun className="size-5" />
            <h2 className="text-lg font-medium">Weather</h2>
          </div>
          <Separator className="my-4" />
          {weather && weather.daily.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <Metric
                icon={<Thermometer className="size-4" />}
                label="Avg max"
                value={averageMaxTemperature === null ? "-" : `${averageMaxTemperature.toFixed(1)}C`}
              />
              <Metric label="Rain" value={`${totalRain.toFixed(1)} mm`} />
              <Metric label="UV max" value={maxUv.toFixed(1)} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Weather forecast is unavailable for these dates. Packing suggestions use trip
              duration and type only.
            </p>
          )}
        </section>

        <section className="rounded-lg border p-4">
          <div className="flex items-center gap-2">
            <Globe2 className="size-5" />
            <h2 className="text-lg font-medium">Country facts</h2>
          </div>
          <Separator className="my-4" />
          {country ? (
            <dl className="grid gap-3 text-sm">
              <Fact label="Country" value={`${country.flag ?? ""} ${country.name_common}`.trim()} />
              <Fact label="Region" value={[country.region, country.subregion].filter(Boolean).join(", ")} />
              <Fact label="Languages" value={formatLanguages(country.languages)} />
              <Fact label="Currencies" value={formatCurrencies(country.currencies)} />
              <Fact label="Timezones" value={country.timezones?.join(", ") || "-"} />
              <Fact label="Landlocked" value={country.landlocked ? "Yes" : "No"} />
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">Country facts are unavailable.</p>
          )}
        </section>
      </div>

      <section className="rounded-lg border p-4">
        <div className="flex items-center gap-2">
          <PackageCheck className="size-5" />
          <h2 className="text-lg font-medium">Packing suggestions</h2>
        </div>
        <Separator className="my-4" />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {packing.map((item) => (
            <article key={item.id} className="rounded-lg border bg-muted/20 p-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-medium">{item.label}</h3>
                <Badge variant="secondary">{item.category}</Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{item.reason}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-xl font-semibold">{value}</div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{value || "-"}</dd>
    </div>
  );
}

function isNumber(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function getAverage(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return getTotal(values) / values.length;
}

function getTotal(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0);
}

function formatLanguages(languages: Country["languages"]) {
  if (!languages) {
    return "-";
  }

  return Object.values(languages).join(", ");
}

function formatCurrencies(currencies: Country["currencies"]) {
  if (!currencies) {
    return "-";
  }

  return Object.entries(currencies)
    .map(([code, currency]) => `${code}${currency.symbol ? ` (${currency.symbol})` : ""}`)
    .join(", ");
}
