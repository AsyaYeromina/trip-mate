"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { searchDestinations } from "@/features/destinations/api/destinations-api";
import type { DestinationSearchResult } from "@/features/destinations/types/destination";
import { createTrip } from "@/features/trips/api/trips-api";
import type { Trip, TripType } from "@/features/trips/types/trip";
import { cn } from "@/lib/utils";

type NewTripDialogProps = {
  ownerKey: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTripCreated: (trip: Trip) => void;
};

const tripTypeOptions: Array<{ value: TripType; label: string }> = [
  { value: "city", label: "City" },
  { value: "beach", label: "Beach" },
  { value: "adventure", label: "Adventure" },
  { value: "relax", label: "Relax" },
];

export function NewTripDialog({
  ownerKey,
  open,
  onOpenChange,
  onTripCreated,
}: NewTripDialogProps) {
  const [destinationQuery, setDestinationQuery] = useState("");
  const [destinations, setDestinations] = useState<DestinationSearchResult[]>([]);
  const [selectedDestination, setSelectedDestination] =
    useState<DestinationSearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [tripType, setTripType] = useState<TripType>("city");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const trimmedQuery = destinationQuery.trim();

    if (trimmedQuery.length < 2) {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setIsSearching(true);
      searchDestinations(trimmedQuery, controller.signal)
        .then((results) => {
          setDestinations(results);
          setError(null);
        })
        .catch((searchError) => {
          if (controller.signal.aborted) {
            return;
          }

          setDestinations([]);
          setError(searchError instanceof Error ? searchError.message : "Destination search failed.");
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsSearching(false);
          }
        });
    }, 350);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [destinationQuery, open]);

  const isFormValid = useMemo(() => {
    return Boolean(selectedDestination && dateStart && dateEnd && dateStart <= dateEnd);
  }, [dateEnd, dateStart, selectedDestination]);

  function resetForm() {
    setDestinationQuery("");
    setDestinations([]);
    setSelectedDestination(null);
    setDateStart("");
    setDateEnd("");
    setTripType("city");
    setError(null);
    setIsSubmitting(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!selectedDestination) {
      setError("Choose a destination.");
      return;
    }

    if (!dateStart || !dateEnd || dateStart > dateEnd) {
      setError("Choose a valid date range.");
      return;
    }

    setIsSubmitting(true);

    try {
      const trip = await createTrip({
        owner_key: ownerKey,
        destination_name: selectedDestination.name,
        country_code: selectedDestination.country_code,
        country_name: selectedDestination.country_name,
        latitude: selectedDestination.latitude,
        longitude: selectedDestination.longitude,
        timezone: selectedDestination.timezone,
        date_start: dateStart,
        date_end: dateEnd,
        trip_type: tripType,
      });

      resetForm();
      onTripCreated(trip);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not create trip.");
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);

        if (!nextOpen) {
          resetForm();
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New trip</DialogTitle>
          <DialogDescription>
            Choose a destination, dates, and trip type.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="destination">Destination</Label>
            <div className="rounded-lg border">
              <Command shouldFilter={false}>
                <CommandInput
                  id="destination"
                  placeholder="Search city or place"
                  value={destinationQuery}
                  onValueChange={(value) => {
                    setDestinationQuery(value);
                    setSelectedDestination(null);

                    if (value.trim().length < 2) {
                      setDestinations([]);
                      setIsSearching(false);
                    }
                  }}
                />
                <CommandList>
                  {isSearching ? (
                    <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                      Searching
                    </div>
                  ) : null}
                  {!isSearching && destinationQuery.trim().length >= 2 ? (
                    <CommandEmpty>No destinations found.</CommandEmpty>
                  ) : null}
                  {destinations.length > 0 ? (
                    <CommandGroup>
                      {destinations.map((destination) => (
                        <CommandItem
                          key={destination.id}
                          value={`${destination.name}-${destination.country_code}-${destination.id}`}
                          onSelect={() => {
                            setSelectedDestination(destination);
                            setDestinationQuery(
                              `${destination.name}, ${destination.country_name ?? destination.country_code}`,
                            );
                            setDestinations([]);
                          }}
                        >
                          <Check
                            className={cn(
                              "size-4",
                              selectedDestination?.id === destination.id
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate">{destination.name}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {destination.country_name ?? destination.country_code}
                            </span>
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ) : null}
                </CommandList>
              </Command>
            </div>
            {selectedDestination ? (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <ChevronsUpDown className="size-3" />
                {selectedDestination.latitude}, {selectedDestination.longitude}
              </p>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date-start">Start date</Label>
              <Input
                id="date-start"
                type="date"
                value={dateStart}
                onChange={(event) => setDateStart(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-end">End date</Label>
              <Input
                id="date-end"
                type="date"
                min={dateStart}
                value={dateEnd}
                onChange={(event) => setDateEnd(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="trip-type">Trip type</Label>
            <select
              id="trip-type"
              className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              value={tripType}
              onChange={(event) => setTripType(event.target.value as TripType)}
            >
              {tripTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {error ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!isFormValid || isSubmitting}>
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
              Create trip
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
