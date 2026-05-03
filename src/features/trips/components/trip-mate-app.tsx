"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, MapPin, Plane, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchCountry } from "@/features/countries/api/countries-api";
import type { Country } from "@/features/countries/types/country";
import { calculatePackingSuggestions } from "@/features/packing/lib/calculate-packing-suggestions";
import type { PackingSuggestion } from "@/features/packing/types/packing";
import { NewTripDialog } from "@/features/trips/components/new-trip-dialog";
import { TripDetail } from "@/features/trips/components/trip-detail";
import { formatTripDateRange } from "@/features/trips/lib/date";
import { getOrCreateOwnerKey } from "@/features/trips/lib/owner-key";
import { deleteTrip, fetchTripById, fetchTrips } from "@/features/trips/api/trips-api";
import type { Trip } from "@/features/trips/types/trip";
import { fetchWeather } from "@/features/weather/api/weather-api";
import type { WeatherForecast } from "@/features/weather/types/weather";

type TripMateAppProps = {
  selectedTripId?: string;
};

type TripDetailState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; trip: Trip; country: Country | null; weather: WeatherForecast | null; packing: PackingSuggestion[] }
  | { status: "error"; message: string };

export function TripMateApp({ selectedTripId }: TripMateAppProps) {
  const router = useRouter();
  const [ownerKey] = useState<string | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    return getOrCreateOwnerKey();
  });
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isTripsLoading, setIsTripsLoading] = useState(true);
  const [tripsError, setTripsError] = useState<string | null>(null);
  const [detailState, setDetailState] = useState<TripDetailState>({ status: "idle" });
  const [isNewTripOpen, setIsNewTripOpen] = useState(false);

  const loadTrips = useCallback(async (nextOwnerKey: string) => {
    setIsTripsLoading(true);
    setTripsError(null);

    try {
      const nextTrips = await fetchTrips(nextOwnerKey);
      setTrips(nextTrips);
    } catch (error) {
      setTripsError(error instanceof Error ? error.message : "Could not load trips.");
    } finally {
      setIsTripsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!ownerKey) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void loadTrips(ownerKey);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [loadTrips, ownerKey]);

  useEffect(() => {
    if (!ownerKey || !selectedTripId) {
      return;
    }

    let isActive = true;
    const tripId = selectedTripId;
    const currentOwnerKey = ownerKey;

    async function loadTripDetail() {
      setDetailState({ status: "loading" });

      try {
        const trip = await fetchTripById(tripId, currentOwnerKey);
        const [countryResult, weatherResult] = await Promise.allSettled([
          fetchCountry(trip.country_code),
          fetchWeather({
            latitude: trip.latitude,
            longitude: trip.longitude,
            startDate: trip.date_start,
            endDate: trip.date_end,
          }),
        ]);

        if (!isActive) {
          return;
        }

        const country = countryResult.status === "fulfilled" ? countryResult.value : null;
        const weather = weatherResult.status === "fulfilled" ? weatherResult.value : null;
        const packing = calculatePackingSuggestions(trip, weather);

        setDetailState({ status: "loaded", trip, country, weather, packing });
      } catch (error) {
        if (!isActive) {
          return;
        }

        setDetailState({
          status: "error",
          message: error instanceof Error ? error.message : "Could not load trip.",
        });
      }
    }

    const timeout = window.setTimeout(() => {
      void loadTripDetail();
    }, 0);

    return () => {
      isActive = false;
      window.clearTimeout(timeout);
    };
  }, [ownerKey, selectedTripId]);

  const selectedTrip = useMemo(
    () => trips.find((trip) => trip.id === selectedTripId) ?? null,
    [selectedTripId, trips],
  );

  async function handleTripCreated(trip: Trip) {
    setIsNewTripOpen(false);
    setTrips((currentTrips) => [trip, ...currentTrips.filter((item) => item.id !== trip.id)]);
    router.push(`/${trip.id}`);

    if (ownerKey) {
      await loadTrips(ownerKey);
    }
  }

  async function handleDeleteTrip(tripId: string) {
    if (!ownerKey) {
      return;
    }

    await deleteTrip(tripId, ownerKey);
    setTrips((currentTrips) => currentTrips.filter((trip) => trip.id !== tripId));

    if (selectedTripId === tripId) {
      router.push("/");
    }
  }

  return (
    <main className="min-h-svh bg-background text-foreground">
      <div className="flex min-h-svh flex-col md:flex-row">
        <aside className="flex w-full flex-col border-b bg-sidebar md:min-h-svh md:w-80 md:border-r md:border-b-0">
          <div className="flex items-center justify-between gap-3 p-4">
            <Link href="/" className="flex items-center gap-2" aria-label="Trip Mate home">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Plane className="size-4" />
              </span>
              <span>
                <span className="block text-sm font-semibold">Trip Mate</span>
                <span className="block text-xs text-muted-foreground">Travel prep</span>
              </span>
            </Link>
            <Button size="sm" onClick={() => setIsNewTripOpen(true)}>
              <Plus className="size-4" />
              New
            </Button>
          </div>

          <Separator />

          <div className="flex-1 overflow-y-auto p-3">
            {isTripsLoading ? (
              <TripListSkeleton />
            ) : tripsError ? (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {tripsError}
              </p>
            ) : trips.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No trips yet.
              </div>
            ) : (
              <nav className="space-y-1" aria-label="Trips">
                {trips.map((trip) => (
                  <div
                    key={trip.id}
                    className="group flex items-center gap-2 rounded-lg hover:bg-sidebar-accent"
                  >
                    <Link
                      href={`/${trip.id}`}
                      className="min-w-0 flex-1 rounded-lg px-3 py-2"
                      aria-current={trip.id === selectedTripId ? "page" : undefined}
                    >
                      <span className="block truncate text-sm font-medium">
                        {trip.destination_name}
                      </span>
                      <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarDays className="size-3" />
                        {formatTripDateRange(trip.date_start, trip.date_end)}
                      </span>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="mr-1 opacity-100 md:opacity-0 md:group-hover:opacity-100"
                      aria-label={`Delete ${trip.destination_name}`}
                      onClick={() => void handleDeleteTrip(trip.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </nav>
            )}
          </div>
        </aside>

        <section className="min-w-0 flex-1 p-4 md:p-6">
          {!selectedTripId ? (
            <EmptyTripState onCreateTrip={() => setIsNewTripOpen(true)} />
          ) : detailState.status === "loading" ? (
            <TripDetailSkeleton selectedTrip={selectedTrip} />
          ) : detailState.status === "error" ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {detailState.message}
            </div>
          ) : detailState.status === "loaded" ? (
            <TripDetail
              country={detailState.country}
              packing={detailState.packing}
              trip={detailState.trip}
              weather={detailState.weather}
            />
          ) : (
            <TripDetailSkeleton selectedTrip={selectedTrip} />
          )}
        </section>
      </div>

      {ownerKey ? (
        <NewTripDialog
          ownerKey={ownerKey}
          open={isNewTripOpen}
          onOpenChange={setIsNewTripOpen}
          onTripCreated={(trip) => void handleTripCreated(trip)}
        />
      ) : null}
    </main>
  );
}

function EmptyTripState({ onCreateTrip }: { onCreateTrip: () => void }) {
  return (
    <div className="flex min-h-[calc(100svh-3rem)] items-center justify-center">
      <div className="max-w-md text-center">
        <Badge variant="outline">No trip selected</Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-normal">Plan the next departure</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Create a trip to see destination facts, fresh weather, and a generated packing list.
        </p>
        <Button className="mt-5" onClick={onCreateTrip}>
          <Plus className="size-4" />
          New trip
        </Button>
      </div>
    </div>
  );
}

function TripListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="rounded-lg border p-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-2 h-3 w-44" />
        </div>
      ))}
    </div>
  );
}

function TripDetailSkeleton({ selectedTrip }: { selectedTrip: Trip | null }) {
  return (
    <div className="space-y-5">
      <div>
        <Badge variant="outline">{selectedTrip?.trip_type ?? "Trip"}</Badge>
        <Skeleton className="mt-4 h-9 w-72 max-w-full" />
        <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
          {selectedTrip ? (
            <>
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-4" />
                {selectedTrip.country_name ?? selectedTrip.country_code}
              </span>
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="size-4" />
                {formatTripDateRange(selectedTrip.date_start, selectedTrip.date_end)}
              </span>
            </>
          ) : null}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-44 rounded-lg" />
        <Skeleton className="h-44 rounded-lg" />
        <Skeleton className="h-44 rounded-lg" />
      </div>
    </div>
  );
}
