"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  Loader2,
  MapPin,
  Menu,
  Plane,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  deleteTrip,
  fetchTripById,
  fetchTrips,
  removeTripFromCache,
  writeTripsCache,
} from "@/features/trips/api/trips-api";
import type { Trip } from "@/features/trips/types/trip";
import { fetchWeather } from "@/features/weather/api/weather-api";
import type { WeatherForecast } from "@/features/weather/types/weather";
import { cn } from "@/lib/utils";

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
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [tripPendingDeletion, setTripPendingDeletion] = useState<Trip | null>(null);
  const [isDeletingTrip, setIsDeletingTrip] = useState(false);
  const [deleteTripError, setDeleteTripError] = useState<string | null>(null);

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

  function handleCreateTripClick() {
    setIsMobileSidebarOpen(false);
    setIsNewTripOpen(true);
  }

  function handleTripCreated(trip: Trip) {
    setIsNewTripOpen(false);
    setTrips((currentTrips) => {
      const nextTrips = [trip, ...currentTrips.filter((item) => item.id !== trip.id)];

      if (ownerKey) {
        writeTripsCache(ownerKey, nextTrips);
      }

      return nextTrips;
    });
    router.push(`/${trip.id}`);
  }

  function handleDeleteRequest(trip: Trip) {
    setDeleteTripError(null);
    setTripPendingDeletion(trip);
  }

  async function handleConfirmDeleteTrip() {
    if (!ownerKey || !tripPendingDeletion || isDeletingTrip) {
      return;
    }

    const tripId = tripPendingDeletion.id;

    setIsDeletingTrip(true);
    setDeleteTripError(null);

    try {
      await deleteTrip(tripId, ownerKey);
      setTrips((currentTrips) => currentTrips.filter((trip) => trip.id !== tripId));
      removeTripFromCache(ownerKey, tripId);
      setTripPendingDeletion(null);

      if (selectedTripId === tripId) {
        router.push("/");
      }
    } catch (error) {
      setDeleteTripError(error instanceof Error ? error.message : "Could not delete trip.");
    } finally {
      setIsDeletingTrip(false);
    }
  }

  return (
    <main className="dark trip-app-shell h-svh overflow-hidden text-foreground">
      <div className="relative z-10 flex h-svh">
        <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-white/10 bg-[#070a19]/95 px-3 shadow-[0_12px_36px_rgba(0,0,0,0.34)] backdrop-blur-xl md:hidden">
          <Button
            size="sm"
            className="border-violet-300/45 bg-violet-500/25 text-white hover:bg-violet-400/35"
            aria-expanded={isMobileSidebarOpen}
            aria-controls="mobile-trip-sidebar"
            onClick={() => setIsMobileSidebarOpen(true)}
          >
            <Menu className="size-4" />
            Trips
          </Button>
          <Link href="/" className="flex items-center gap-2" aria-label="Trip Mate home">
            <span className="glow-icon flex size-8 items-center justify-center rounded-full text-violet-50">
              <Plane className="size-4" />
            </span>
            <span className="text-sm font-semibold text-white">Trip Mate</span>
          </Link>
        </header>

        {isMobileSidebarOpen ? (
          <div className="fixed inset-0 z-40 md:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm"
              aria-label="Close trips menu"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
            <aside
              id="mobile-trip-sidebar"
              className="relative h-svh w-[min(22rem,calc(100vw-2rem))] overflow-hidden bg-[#080a1f]/96 shadow-[18px_0_60px_rgba(0,0,0,0.36)]"
            >
              <TripSidebarContent
                isTripsLoading={isTripsLoading}
                onClose={() => setIsMobileSidebarOpen(false)}
                onCreateTrip={handleCreateTripClick}
                onDeleteTrip={handleDeleteRequest}
                onNavigate={() => setIsMobileSidebarOpen(false)}
                selectedTripId={selectedTripId}
                trips={trips}
                tripsError={tripsError}
              />
            </aside>
          </div>
        ) : null}

        <aside className="relative hidden h-svh w-[21rem] shrink-0 flex-col overflow-hidden bg-transparent md:flex md:after:absolute md:after:top-1/2 md:after:right-0 md:after:h-[80%] md:after:w-px md:after:-translate-y-1/2 md:after:bg-white/14 md:after:content-['']">
          <TripSidebarContent
            isTripsLoading={isTripsLoading}
            onCreateTrip={handleCreateTripClick}
            onDeleteTrip={handleDeleteRequest}
            selectedTripId={selectedTripId}
            trips={trips}
            tripsError={tripsError}
          />
        </aside>

        <section className="h-svh min-w-0 flex-1 overflow-y-auto p-3 pt-16 md:p-5 lg:p-7">
          {!selectedTripId ? (
            <EmptyTripState onCreateTrip={() => setIsNewTripOpen(true)} />
          ) : detailState.status === "loading" ? (
            <TripDetailSkeleton selectedTrip={selectedTrip} />
          ) : detailState.status === "error" ? (
            <div className="bg-transparent p-4 text-sm text-rose-100">{detailState.message}</div>
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

      <DeleteTripDialog
        error={deleteTripError}
        isDeleting={isDeletingTrip}
        onConfirm={() => void handleConfirmDeleteTrip()}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !isDeletingTrip) {
            setTripPendingDeletion(null);
            setDeleteTripError(null);
          }
        }}
        open={Boolean(tripPendingDeletion)}
        trip={tripPendingDeletion}
      />
    </main>
  );
}

function TripSidebarContent({
  isTripsLoading,
  onClose,
  onCreateTrip,
  onDeleteTrip,
  onNavigate,
  selectedTripId,
  trips,
  tripsError,
}: {
  isTripsLoading: boolean;
  onClose?: () => void;
  onCreateTrip: () => void;
  onDeleteTrip: (trip: Trip) => void;
  onNavigate?: () => void;
  selectedTripId?: string;
  trips: Trip[];
  tripsError: string | null;
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-3 p-4">
        <Link
          href="/"
          className="flex items-center gap-3"
          aria-label="Trip Mate home"
          onClick={onNavigate}
        >
          <span className="glow-icon flex size-10 items-center justify-center rounded-full text-violet-50">
            <Plane className="size-5" />
          </span>
          <span>
            <span className="block text-sm font-semibold text-white">Trip Mate</span>
            <span className="block text-xs text-violet-100/70">Travel prep</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="glow-button border-violet-300/50 bg-violet-500/25 text-white hover:bg-violet-400/35"
            onClick={onCreateTrip}
          >
            <Plus className="size-4" />
            New
          </Button>
          {onClose ? (
            <Button
              size="icon-sm"
              variant="ghost"
              className="text-violet-100/75 hover:bg-white/10 hover:text-white"
              aria-label="Close trips menu"
              onClick={onClose}
            >
              <X className="size-4" />
            </Button>
          ) : null}
        </div>
      </div>

      <Separator className="bg-white/10" />

      <div className="flex-1 overflow-y-auto p-3">
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="text-sm font-medium text-violet-50/90">My Trips</h2>
          <span className="text-xs text-violet-100/50">{trips.length}</span>
        </div>

        {isTripsLoading ? (
          <TripListSkeleton />
        ) : tripsError ? (
          <p className="rounded-lg border border-rose-300/30 bg-rose-950/40 p-3 text-sm text-rose-100">
            {tripsError}
          </p>
        ) : trips.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.03] p-4 text-sm text-violet-100/65">
            No trips yet.
          </div>
        ) : (
          <nav className="space-y-3" aria-label="Trips">
            {trips.map((trip) => (
              <div
                key={trip.id}
                className={cn(
                  "group flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] transition hover:border-violet-200/40 hover:bg-violet-400/10",
                  trip.id === selectedTripId &&
                    "border-violet-300/60 bg-violet-500/20 shadow-[0_0_28px_rgba(168,85,247,0.22)]",
                )}
              >
                <Link
                  href={`/${trip.id}`}
                  prefetch={false}
                  className="min-w-0 flex-1 rounded-xl px-4 py-3"
                  aria-current={trip.id === selectedTripId ? "page" : undefined}
                  onClick={onNavigate}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-medium text-white">
                      {trip.destination_name}
                    </span>
                    <Badge
                      className="shrink-0 border-violet-200/25 bg-white/10 px-1.5 py-0 text-[0.65rem] leading-4 text-violet-100"
                      variant="outline"
                    >
                      {formatTripType(trip.trip_type)}
                    </Badge>
                  </span>
                  <span className="mt-1.5 flex items-center gap-1 text-xs text-violet-100/60">
                    <CalendarDays className="size-3" />
                    {formatTripDateRange(trip.date_start, trip.date_end)}
                  </span>
                </Link>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="mr-2 text-violet-100/70 opacity-100 hover:bg-white/10 hover:text-white md:opacity-0 md:group-hover:opacity-100"
                  aria-label={`Delete ${trip.destination_name}`}
                  aria-haspopup="dialog"
                  onClick={() => onDeleteTrip(trip)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}

function DeleteTripDialog({
  error,
  isDeleting,
  onConfirm,
  onOpenChange,
  open,
  trip,
}: {
  error: string | null;
  isDeleting: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  trip: Trip | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dark glass-panel border-white/15 bg-[#070a19]/92 p-6 text-white shadow-[0_0_70px_rgba(244,63,94,0.24)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-white">Delete trip?</DialogTitle>
          <DialogDescription className="text-violet-100/62">
            {trip
              ? `This will permanently remove ${trip.destination_name} from your trips.`
              : "This trip will be permanently removed."}
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <p className="rounded-lg border border-rose-300/30 bg-rose-950/45 p-3 text-sm text-rose-100">
            {error}
          </p>
        ) : null}

        <DialogFooter className="mx-0 mb-0 flex-col gap-3 border-0 bg-transparent p-0 pt-2 sm:flex-row sm:justify-stretch [&>button]:min-h-11">
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full border-white/18 bg-white/[0.08] text-white hover:bg-white/12 sm:flex-1"
            disabled={isDeleting}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="min-h-11 w-full border-rose-200/35 bg-rose-500/24 text-rose-50 hover:bg-rose-500/34 sm:flex-1"
            disabled={isDeleting}
            onClick={onConfirm}
          >
            {isDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EmptyTripState({ onCreateTrip }: { onCreateTrip: () => void }) {
  return (
    <div className="flex min-h-[calc(100svh-7rem)] items-center justify-center px-4 py-14 md:min-h-[calc(100svh-3.5rem)]">
      <div className="max-w-2xl text-center">
        <div className="glow-icon mx-auto flex size-24 items-center justify-center rounded-full text-violet-50 shadow-[0_0_54px_rgba(168,85,247,0.35)]">
          <Plane className="size-11" />
        </div>
        <Badge className="mt-7 border-violet-200/30 bg-white/10 text-violet-50" variant="outline">
          <Sparkles className="size-3" />
          Ready for takeoff
        </Badge>
        <h1 className="mt-4 text-4xl font-semibold tracking-normal text-white md:text-5xl">
          Your journey starts here
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-violet-100/72">
          Plan your first trip and keep the essentials in one calm travel brief.
        </p>
        <Button
          className="glow-button mt-7 h-11 border-violet-200/50 bg-violet-500/30 px-5 text-base text-white hover:bg-violet-400/40"
          onClick={onCreateTrip}
        >
          <Plus className="size-4" />
          Create a Trip Idea
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function TripListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
          <Skeleton className="h-4 w-32 bg-white/15" />
          <Skeleton className="mt-3 h-3 w-44 bg-white/10" />
        </div>
      ))}
    </div>
  );
}

function TripDetailSkeleton({ selectedTrip }: { selectedTrip: Trip | null }) {
  return (
    <div className="mx-auto max-w-[1200px] space-y-5 p-5 md:p-7">
      <div>
        <Badge className="border-violet-200/30 bg-white/10 text-violet-50" variant="outline">
          {selectedTrip ? formatTripType(selectedTrip.trip_type) : "Trip"}
        </Badge>
        <Skeleton className="mt-4 h-9 w-72 max-w-full bg-white/15" />
        <div className="mt-3 flex flex-wrap gap-3 text-sm text-violet-100/65">
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
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Skeleton className="h-44 rounded-xl bg-white/10" />
        <Skeleton className="h-44 rounded-xl bg-white/10" />
      </div>
    </div>
  );
}

function formatTripType(tripType: Trip["trip_type"]) {
  return tripType[0].toUpperCase() + tripType.slice(1);
}
