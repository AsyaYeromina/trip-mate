"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
} from "lucide-react";

import { Button } from "@/components/ui/button";
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
  { value: "business", label: "Business" },
];

type DatePickerFieldName = "start" | "end";

type CalendarPosition = {
  top: number;
  left: number;
};

const monthFormatter = new Intl.DateTimeFormat("en", {
  month: "long",
  year: "numeric",
});

const dateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const weekdayLabels = ["M", "T", "W", "T", "F", "S", "S"];

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
  const [isDestinationOpen, setIsDestinationOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [openDatePicker, setOpenDatePicker] = useState<DatePickerFieldName | null>(null);
  const [calendarPosition, setCalendarPosition] = useState<CalendarPosition | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => getCalendarMonth(""));
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
          setSearchError(null);
        })
        .catch((searchError) => {
          if (controller.signal.aborted) {
            return;
          }

          setDestinations([]);
          setSearchError(searchError instanceof Error ? searchError.message : "Destination search failed.");
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
    setIsDestinationOpen(false);
    setSearchError(null);
    setDateStart("");
    setDateEnd("");
    setOpenDatePicker(null);
    setCalendarPosition(null);
    setCalendarMonth(getCalendarMonth(""));
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

  function handleDatePickerOpen(fieldName: DatePickerFieldName, value: string, element: HTMLElement) {
    const rect = element.getBoundingClientRect();
    const calendarWidth = Math.min(336, window.innerWidth - 32);
    const preferredLeft = fieldName === "end" ? rect.right - calendarWidth : rect.left;
    const clampedLeft = Math.max(16, Math.min(preferredLeft, window.innerWidth - calendarWidth - 16));

    setCalendarMonth(getCalendarMonth(value));
    setCalendarPosition({
      top: rect.bottom + 8,
      left: clampedLeft,
    });
    setOpenDatePicker((currentField) => (currentField === fieldName ? null : fieldName));
  }

  function handleStartDateChange(nextDate: string) {
    setDateStart(nextDate);
    setOpenDatePicker(null);
    setCalendarPosition(null);

    if (dateEnd && nextDate > dateEnd) {
      setDateEnd("");
    }
  }

  function handleEndDateChange(nextDate: string) {
    setDateEnd(nextDate);
    setOpenDatePicker(null);
    setCalendarPosition(null);
  }

  function handleDestinationChange(value: string) {
    setDestinationQuery(value);
    setSelectedDestination(null);
    setIsDestinationOpen(true);
    setSearchError(null);

    if (value.trim().length < 2) {
      setDestinations([]);
      setIsSearching(false);
    }
  }

  function handleSelectDestination(destination: DestinationSearchResult) {
    setSelectedDestination(destination);
    setDestinationQuery(formatDestinationOption(destination));
    setDestinations([]);
    setIsDestinationOpen(false);
    setSearchError(null);
  }

  const shouldShowDestinationMenu =
    isDestinationOpen && destinationQuery.trim().length >= 2 && !selectedDestination;

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
      <DialogContent className="dark glass-panel border-white/15 bg-[#070a19]/92 p-6 text-white shadow-[0_0_70px_rgba(168,85,247,0.32)] sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-3xl font-semibold text-white">Plan a New Trip</DialogTitle>
          <DialogDescription className="text-violet-100/62">
            Choose a destination, dates, and trip type.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label className="text-violet-100/78" htmlFor="destination">Destination</Label>
            <div className="relative">
              <Input
                id="destination"
                role="combobox"
                aria-controls="destination-options"
                aria-expanded={shouldShowDestinationMenu}
                aria-autocomplete="list"
                autoComplete="off"
                className="h-12 rounded-xl border-white/20 bg-white/[0.04] pr-10 text-white placeholder:text-violet-100/44 focus-visible:border-violet-200 focus-visible:ring-violet-400/35"
                onBlur={() => setIsDestinationOpen(false)}
                onChange={(event) => handleDestinationChange(event.target.value)}
                onFocus={() => setIsDestinationOpen(true)}
                placeholder="Search city or place"
                value={destinationQuery}
              />
              <MapPin className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-violet-100/58" />

              {shouldShowDestinationMenu ? (
                <div
                  id="destination-options"
                  role="listbox"
                  className="absolute right-0 left-0 z-50 mt-2 overflow-hidden rounded-xl border border-violet-200/20 bg-[#121426]/98 p-1 text-white shadow-[0_22px_60px_rgba(0,0,0,0.45),0_0_32px_rgba(168,85,247,0.14)] backdrop-blur-xl"
                >
                  {isSearching ? (
                    <div className="flex items-center gap-2 px-3 py-3 text-sm text-violet-100/65">
                      <Loader2 className="size-4 animate-spin" />
                      Searching destinations
                    </div>
                  ) : searchError ? (
                    <div className="px-3 py-3 text-sm text-rose-100">{searchError}</div>
                  ) : destinations.length > 0 ? (
                    <div className="max-h-64 overflow-y-auto">
                      {destinations.map((destination) => (
                        <button
                          key={destination.id}
                          type="button"
                          role="option"
                          aria-selected={false}
                          className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-violet-400/14 focus:bg-violet-400/14 focus:outline-none"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => handleSelectDestination(destination)}
                        >
                          <MapPin className="mt-0.5 size-4 shrink-0 text-cyan-100/80" />
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-white">{destination.name}</span>
                            <span className="block truncate text-xs text-violet-100/60">
                              {destination.country_name ?? destination.country_code}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-3 py-3 text-sm text-violet-100/65">No destinations found.</div>
                  )}
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <DatePickerField
              id="date-start"
              isOpen={openDatePicker === "start"}
              label="Start date"
              onOpenChange={(element) => handleDatePickerOpen("start", dateStart, element)}
              value={dateStart}
            />
            <DatePickerField
              id="date-end"
              isOpen={openDatePicker === "end"}
              label="End date"
              onOpenChange={(element) => handleDatePickerOpen("end", dateEnd || dateStart, element)}
              value={dateEnd}
            />
          </div>

          {openDatePicker && calendarPosition && typeof document !== "undefined"
            ? createPortal(
                <CalendarPanel
                  minDate={openDatePicker === "end" ? dateStart : undefined}
                  month={calendarMonth}
                  onChange={openDatePicker === "start" ? handleStartDateChange : handleEndDateChange}
                  onMonthChange={setCalendarMonth}
                  position={calendarPosition}
                  selectedDate={openDatePicker === "start" ? dateStart : dateEnd}
                />,
                document.body,
              )
            : null}

          <div className="space-y-2">
            <Label className="text-violet-100/78" id="trip-type-label">Trip type</Label>
            <div
              aria-labelledby="trip-type-label"
              className="grid gap-3 sm:grid-cols-4"
              role="group"
            >
              {tripTypeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={tripType === option.value}
                  className={cn(
                    "h-12 rounded-xl border border-white/15 bg-white/[0.06] px-3 text-sm font-medium text-violet-100/58 transition hover:border-violet-200/45 hover:bg-violet-400/12 hover:text-white focus-visible:border-violet-200 focus-visible:ring-3 focus-visible:ring-violet-400/35 focus-visible:outline-none",
                    tripType === option.value &&
                      "border-violet-200/70 bg-violet-500/22 text-white shadow-[0_0_22px_rgba(168,85,247,0.35)]",
                    option.value === "adventure" &&
                      tripType === option.value &&
                      "border-amber-200/65 bg-amber-400/18 shadow-[0_0_22px_rgba(251,191,36,0.22)]",
                  )}
                  onClick={() => setTripType(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

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
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="glow-button min-h-11 w-full border-violet-200/50 bg-violet-500/35 text-white hover:bg-violet-400/45 sm:flex-1"
              disabled={!isFormValid || isSubmitting}
            >
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
              Build a Trip
              {!isSubmitting ? <ArrowRight className="size-4" /> : null}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DatePickerField({
  id,
  isOpen,
  label,
  onOpenChange,
  value,
}: {
  id: string;
  isOpen: boolean;
  label: string;
  onOpenChange: (element: HTMLElement) => void;
  value: string;
}) {
  return (
    <div className="relative space-y-2">
      <Label className="text-violet-100/78" htmlFor={id}>
        {label}
      </Label>
      <button
        id={id}
        type="button"
        className={cn(
          "flex h-12 w-full items-center justify-between rounded-xl border border-white/20 bg-white/[0.04] px-3 text-left text-sm transition hover:border-violet-200/45 hover:bg-violet-400/10 focus-visible:border-violet-200 focus-visible:ring-3 focus-visible:ring-violet-400/35 focus-visible:outline-none",
          isOpen && "border-violet-200/65 bg-violet-500/14 shadow-[0_0_22px_rgba(168,85,247,0.22)]",
        )}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={(event) => onOpenChange(event.currentTarget)}
      >
        <span className={value ? "text-white" : "text-violet-100/50"}>
          {value ? formatReadableDate(value) : "Select date"}
        </span>
        <CalendarDays className="size-4 text-violet-100/70" />
      </button>
    </div>
  );
}

function CalendarPanel({
  minDate,
  month,
  onChange,
  onMonthChange,
  position,
  selectedDate,
}: {
  minDate?: string;
  month: Date;
  onChange: (value: string) => void;
  onMonthChange: (month: Date) => void;
  position: CalendarPosition;
  selectedDate: string;
}) {
  const days = getCalendarDays(month);
  const today = formatDateValue(new Date());
  const canChooseToday = !minDate || today >= minDate;

  return (
    <div
      className="fixed z-50 w-[min(21rem,calc(100vw-2rem))] rounded-2xl border border-violet-200/20 bg-[#121426]/95 p-4 text-white shadow-[0_24px_70px_rgba(0,0,0,0.45),0_0_42px_rgba(168,85,247,0.18)] backdrop-blur-xl"
      style={{ top: position.top, left: position.left }}
      role="dialog"
      aria-label="Date calendar"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-white">{monthFormatter.format(month)}</div>
          <div className="mt-1 text-xs text-violet-100/52">Choose a travel date</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex size-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] text-violet-100 transition hover:border-violet-200/40 hover:bg-violet-400/12 hover:text-white"
            aria-label="Previous month"
            onClick={() => onMonthChange(addMonths(month, -1))}
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            className="flex size-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] text-violet-100 transition hover:border-violet-200/40 hover:bg-violet-400/12 hover:text-white"
            aria-label="Next month"
            onClick={() => onMonthChange(addMonths(month, 1))}
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-medium text-violet-100/48">
        {weekdayLabels.map((dayLabel, index) => (
          <div key={`${dayLabel}-${index}`} className="py-1">
            {dayLabel}
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {days.map((day) => {
          const isSelected = day.value === selectedDate;
          const isToday = day.value === today;
          const isDisabled = Boolean(minDate && day.value < minDate);

          return (
            <button
              key={day.value}
              type="button"
              disabled={isDisabled}
              className={cn(
                "flex aspect-square items-center justify-center rounded-lg text-sm font-medium transition focus-visible:ring-3 focus-visible:ring-violet-400/35 focus-visible:outline-none",
                day.isCurrentMonth ? "text-violet-50" : "text-violet-100/28",
                "hover:bg-violet-400/14 hover:text-white",
                isToday && "border border-cyan-200/45 text-cyan-100",
                isSelected &&
                  "border border-violet-100/70 bg-violet-500/45 text-white shadow-[0_0_18px_rgba(168,85,247,0.35)]",
                isDisabled && "cursor-not-allowed text-violet-100/18 hover:bg-transparent hover:text-violet-100/18",
              )}
              onClick={() => onChange(day.value)}
            >
              {day.date.getDate()}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
        <button
          type="button"
          className="rounded-lg px-2 py-1.5 text-sm font-medium text-violet-100/62 transition hover:bg-white/10 hover:text-white"
          onClick={() => onChange("")}
        >
          Clear
        </button>
        <button
          type="button"
          disabled={!canChooseToday}
          className="rounded-lg px-2 py-1.5 text-sm font-medium text-cyan-100 transition hover:bg-cyan-300/10 hover:text-white disabled:cursor-not-allowed disabled:text-violet-100/24 disabled:hover:bg-transparent disabled:hover:text-violet-100/24"
          onClick={() => {
            onMonthChange(getCalendarMonth(today));
            onChange(today);
          }}
        >
          Today
        </button>
      </div>
    </div>
  );
}

function getCalendarDays(month: Date) {
  const firstDayOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
  const mondayOffset = (firstDayOfMonth.getDay() + 6) % 7;
  const firstVisibleDay = new Date(firstDayOfMonth);
  firstVisibleDay.setDate(firstDayOfMonth.getDate() - mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstVisibleDay);
    date.setDate(firstVisibleDay.getDate() + index);

    return {
      date,
      isCurrentMonth: date.getMonth() === month.getMonth(),
      value: formatDateValue(date),
    };
  });
}

function getCalendarMonth(value: string) {
  const date = parseDateValue(value) ?? new Date();

  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, offset: number) {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}

function parseDateValue(value: string) {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}

function formatDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatReadableDate(value: string) {
  const date = parseDateValue(value);

  return date ? dateFormatter.format(date) : "Select date";
}

function formatDestinationOption(destination: DestinationSearchResult) {
  return `${destination.name}, ${destination.country_name ?? destination.country_code}`;
}
