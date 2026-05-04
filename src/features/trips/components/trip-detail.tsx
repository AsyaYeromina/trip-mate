"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  Backpack,
  CalendarDays,
  CloudRain,
  CloudSun,
  Cloudy,
  Globe2,
  Luggage,
  MapPin,
  PackageCheck,
  Shirt,
  SunMedium,
  Umbrella,
  WalletCards,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { Country } from "@/features/countries/types/country";
import type { PackingSuggestion } from "@/features/packing/types/packing";
import { formatTripDateRange, getTripDurationDays } from "@/features/trips/lib/date";
import type { Trip } from "@/features/trips/types/trip";
import type { DailyWeather, WeatherForecast } from "@/features/weather/types/weather";

type TripDetailProps = {
  trip: Trip;
  country: Country | null;
  weather: WeatherForecast | null;
  packing: PackingSuggestion[];
};

type BudgetEstimate = {
  dailyCost: number;
  livingCostIndex: number | null;
  livingCostLabel: string;
  totalCost: number;
};

type LuggageAssumption = {
  title: string;
  description: string;
  clothingSets: number;
  icon: ReactNode;
};

const usdFormatter = new Intl.NumberFormat("en", {
  currency: "USD",
  maximumFractionDigits: 0,
  style: "currency",
});

export function TripDetail({ trip, country, weather, packing }: TripDetailProps) {
  const durationDays = getTripDurationDays(trip.date_start, trip.date_end);
  const forecastDays = weather?.daily ?? [];
  const averageMaxTemperature = getAverage(
    forecastDays.map((day) => day.temperature_2m_max).filter(isNumber),
  );
  const totalRain = getTotal(forecastDays.map((day) => day.precipitation_sum).filter(isNumber));
  const maxUv = Math.max(0, ...forecastDays.map((day) => day.uv_index_max ?? 0));
  const budget = getBudgetEstimate(country, durationDays);
  const luggage = getLuggageAssumption(durationDays, trip.trip_type, forecastDays);
  const destinationTime = useDestinationTime(trip.timezone);

  return (
    <div className="mx-auto max-w-[1200px] p-5 md:p-7">
      <header>
        <Badge className="border-violet-200/30 bg-white/10 text-violet-50" variant="outline">
          {formatTripType(trip.trip_type)}
        </Badge>
        <h1 className="mt-3 text-4xl font-semibold tracking-normal text-white md:text-5xl">
          {trip.destination_name}
        </h1>
        <div className="mt-4 flex flex-wrap gap-3 text-sm text-violet-100/68">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-4" />
            {trip.country_name ?? trip.country_code}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-4" />
            {formatTripDateRange(trip.date_start, trip.date_end)}
          </span>
          <span>{durationDays} days</span>
        </div>
      </header>

      <div className="mt-7 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="glass-card min-w-0 p-4">
          <SectionTitle icon={<CloudSun className="size-5" />} title="Weather Forecast" />
          <div className="mt-4 space-y-4">
            {forecastDays.length > 0 ? (
              <div className="min-w-0 overflow-hidden">
                <div className="-mx-1 overflow-x-auto px-1 pb-2">
                  <div className="flex w-max gap-3">
                    {forecastDays.map((day) => (
                      <ForecastDay key={day.date} day={day} />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm text-violet-100/68">
                Weather forecast is unavailable for these dates. Packing suggestions use trip
                duration and type only.
              </p>
            )}

            <WeatherSummary
              averageMaxTemperature={averageMaxTemperature}
              maxUv={maxUv}
              totalRain={totalRain}
            />
          </div>
        </section>

        <section className="glass-card p-4">
          <SectionTitle icon={<WalletCards className="size-5" />} title="Budget Brief" />
          <dl className="mt-4 grid gap-3 text-sm">
            <LivingCostBar
              index={budget.livingCostIndex}
              label={budget.livingCostLabel}
            />
            <EstimatedBudgetTotal
              dailyCost={budget.dailyCost}
              totalCost={budget.totalCost}
            />
          </dl>
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="glass-card p-4">
          <SectionTitle icon={<PackageCheck className="size-5" />} title="Clothes Pack" />
          {packing.length > 0 ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {packing.map((item) => (
                <article key={item.id} className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                  <div className="flex items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-violet-200/25 bg-violet-400/10 text-violet-100">
                      <PackingIcon id={item.id} />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-medium text-white">{item.label}</h3>
                        <Badge className="border-white/10 bg-white/10 text-[0.7rem] text-violet-100" variant="outline">
                          {item.category}
                        </Badge>
                      </div>
                      <p className="mt-1.5 text-sm leading-5 text-violet-100/62">{item.reason}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm text-violet-100/68">
              Clothing suggestions are unavailable.
            </p>
          )}
        </section>

        <section className="glass-card p-4">
          <SectionTitle icon={<Luggage className="size-5" />} title="Luggage Assumptions" />
          <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-cyan-100/25 bg-cyan-300/10 text-cyan-100">
                {luggage.icon}
              </span>
              <div>
                <h3 className="text-sm font-medium text-white">{luggage.title}</h3>
                <p className="mt-1.5 text-sm leading-5 text-violet-100/62">{luggage.description}</p>
              </div>
            </div>
          </div>
          <dl className="mt-3 grid gap-3 text-sm">
            <BriefFact label="Clothing sets" value={`${luggage.clothingSets}`} />
          </dl>
        </section>
      </div>

      <section className="glass-card mt-4 p-4">
        <SectionTitle icon={<Globe2 className="size-5" />} title="Country Facts" />
        <div className="-mx-1 mt-4 overflow-x-auto px-1 pb-2">
          <dl className="flex w-max gap-3 text-sm">
            <CountryFact label="Destination time" value={destinationTime} />
            <CountryFact label="Destination zone" value={trip.timezone ?? "-"} />
            {country ? (
              <>
                <CountryFact label="Country" value={`${country.flag ?? ""} ${country.name_common}`.trim()} />
                <CountryFact label="Languages" value={formatLanguages(country.languages)} />
                <CountryFact label="Currencies" value={formatCurrencies(country.currencies)} />
                <CountryFact label="Timezones" value={country.timezones?.join(", ") || "-"} />
              </>
            ) : null}
          </dl>
        </div>
        {country ? null : (
          <p className="mt-4 rounded-lg border border-white/10 bg-white/[0.04] p-4 text-sm text-violet-100/68">
            Country facts are unavailable.
          </p>
        )}
      </section>
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-violet-50">
      <span className="text-cyan-100/90">{icon}</span>
      <h2 className="text-lg font-medium">{title}</h2>
    </div>
  );
}

function WeatherSummary({
  averageMaxTemperature,
  maxUv,
  totalRain,
}: {
  averageMaxTemperature: number | null;
  maxUv: number;
  totalRain: number;
}) {
  return (
    <dl className="grid gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-center sm:grid-cols-3">
      <SummaryStat label="Rain" value={`${totalRain.toFixed(0)} mm`} />
      <SummaryStat label="UV" value={maxUv ? maxUv.toFixed(1) : "-"} />
      <SummaryStat
        label="Avg max"
        value={averageMaxTemperature === null ? "-" : `${averageMaxTemperature.toFixed(1)}C`}
      />
    </dl>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg px-3 py-2">
      <dt className="text-[0.7rem] uppercase text-violet-100/45">{label}</dt>
      <dd className="mt-1 text-base font-semibold text-white">{value}</dd>
    </div>
  );
}

function ForecastDay({ day }: { day: DailyWeather }) {
  const summary = getWeatherSummary(day);

  return (
    <article className="min-w-[9.5rem] rounded-xl border border-white/10 bg-white/[0.045] p-3 text-center md:min-w-[10.5rem]">
      <div className="text-sm font-medium text-white">{formatShortDate(day.date)}</div>
      <div className="mx-auto mt-3 flex size-12 items-center justify-center rounded-full bg-white/10 text-violet-50">
        {summary.icon}
      </div>
      <div className="mt-3 text-sm font-medium text-white">
        {formatTemperatureRange(day.temperature_2m_max, day.temperature_2m_min)}
      </div>
      <div className="mt-1 text-xs text-violet-100/58">{summary.label}</div>
    </article>
  );
}

function BriefFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 rounded-lg border border-white/10 bg-white/[0.035] p-3">
      <dt className="text-violet-100/50">{label}</dt>
      <dd className="min-w-0 break-words font-medium text-violet-50">{value || "-"}</dd>
    </div>
  );
}

function LivingCostBar({ index, label }: { index: number | null; label: string }) {
  const barWidth = index === null ? 100 : Math.min(100, Math.max(0, index));
  const hasIndex = index !== null;

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
      <div className="flex items-center justify-between gap-3">
        <dt className="text-violet-100/50">Living cost</dt>
        <dd className="font-medium text-violet-50">{label}</dd>
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full ${hasIndex ? "bg-cyan-200" : "bg-violet-100/30"}`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </div>
  );
}

function EstimatedBudgetTotal({
  dailyCost,
  totalCost,
}: {
  dailyCost: number;
  totalCost: number;
}) {
  return (
    <div className="rounded-lg border border-cyan-100/20 bg-cyan-100/[0.07] p-4">
      <dt className="text-sm text-violet-100/55">Estimated total</dt>
      <dd className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-3xl font-semibold tracking-normal text-white">
          {usdFormatter.format(totalCost)}
        </span>
        <span className="text-sm font-medium text-cyan-100/80">
          ({usdFormatter.format(dailyCost)}/day)
        </span>
      </dd>
    </div>
  );
}

function CountryFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[12rem] rounded-lg border border-white/10 bg-white/[0.035] p-3 md:min-w-[14rem]">
      <dt className="text-violet-100/50">{label}</dt>
      <dd className="mt-1 min-w-0 text-violet-50">{value || "-"}</dd>
    </div>
  );
}

function PackingIcon({ id }: { id: string }) {
  if (id.includes("umbrella") || id.includes("rain")) {
    return <Umbrella className="size-5" />;
  }

  if (id.includes("shoe") || id.includes("backpack")) {
    return <Backpack className="size-5" />;
  }

  return <Shirt className="size-5" />;
}

function getWeatherSummary(day: DailyWeather) {
  if ((day.precipitation_sum ?? 0) > 0 || (day.weather_code ?? 0) >= 51) {
    return { label: "Rain", icon: <CloudRain className="size-6" /> };
  }

  if ((day.weather_code ?? 0) <= 1) {
    return { label: "Sunny", icon: <SunMedium className="size-6" /> };
  }

  if ((day.weather_code ?? 0) <= 3) {
    return { label: "Partly cloudy", icon: <CloudSun className="size-6" /> };
  }

  return { label: "Cloudy", icon: <Cloudy className="size-6" /> };
}

function getBudgetEstimate(country: Country | null, durationDays: number): BudgetEstimate {
  const livingCostIndex = country?.cost_of_living_index;
  const hasLivingCostIndex = typeof livingCostIndex === "number" && Number.isFinite(livingCostIndex);
  const multiplier = hasLivingCostIndex
    ? Math.max(0.35, livingCostIndex / 100)
    : 1;
  const dailyCost = Math.round(120 * multiplier);

  return {
    dailyCost,
    livingCostIndex: hasLivingCostIndex ? livingCostIndex : null,
    livingCostLabel: hasLivingCostIndex ? `${livingCostIndex.toFixed(0)} index` : "Default index",
    totalCost: dailyCost * durationDays,
  };
}

function getLuggageAssumption(
  durationDays: number,
  tripType: Trip["trip_type"],
  forecastDays: DailyWeather[],
): LuggageAssumption {
  const clothingSets = Math.max(1, durationDays);
  const maxHigh = Math.max(0, ...forecastDays.map((day) => day.temperature_2m_max ?? 0));
  const minLow = forecastDays.length
    ? Math.min(...forecastDays.map((day) => day.temperature_2m_min ?? 99))
    : 99;

  if (clothingSets > 10 || tripType === "business") {
    return {
      clothingSets,
      description: "Longer stays or structured outfits need more room and cleaner separation.",
      icon: <Luggage className="size-5" />,
      title: "Small suitcase recommended",
    };
  }

  if (clothingSets > 5 || minLow < 10) {
    return {
      clothingSets,
      description: "Extra daily sets or colder layers make a carry-on safer than a small pack.",
      icon: <Luggage className="size-5" />,
      title: "Carry-on recommended",
    };
  }

  if (tripType === "adventure") {
    return {
      clothingSets,
      description: "Keep hands free and leave room for walking layers and trail basics.",
      icon: <Backpack className="size-5" />,
      title: "Travel backpack recommended",
    };
  }

  if (maxHigh > 25 && clothingSets < 5) {
    return {
      clothingSets,
      description: "Warm short trips can stay light with compact clothes and minimal layers.",
      icon: <Backpack className="size-5" />,
      title: "Backpack is enough",
    };
  }

  return {
    clothingSets,
    description: "The duration and forecast fit a light packing load.",
    icon: <Backpack className="size-5" />,
    title: "Backpack is enough",
  };
}

function formatTemperatureRange(max: number | null, min: number | null) {
  if (max === null && min === null) {
    return "-";
  }

  if (max === null) {
    return `${min?.toFixed(0)}C`;
  }

  if (min === null) {
    return `${max.toFixed(0)}C`;
  }

  return `${max.toFixed(0)}C / ${min.toFixed(0)}C`;
}

function formatShortDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function formatTripType(tripType: Trip["trip_type"]) {
  return tripType[0].toUpperCase() + tripType.slice(1);
}

function useDestinationTime(timezone: string | null) {
  const [currentTime, setCurrentTime] = useState("-");

  useEffect(() => {
    function updateCurrentTime() {
      setCurrentTime(formatDestinationTime(timezone));
    }

    updateCurrentTime();
    const interval = window.setInterval(updateCurrentTime, 60 * 1000);

    return () => window.clearInterval(interval);
  }, [timezone]);

  return currentTime;
}

function formatDestinationTime(timezone: string | null) {
  if (!timezone) {
    return "-";
  }

  try {
    return new Intl.DateTimeFormat("en", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone,
      timeZoneName: "short",
    }).format(new Date());
  } catch {
    return "-";
  }
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
