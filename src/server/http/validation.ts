import type { TripType } from "@/features/trips/types/trip";

const tripTypes: TripType[] = ["city", "beach", "adventure", "business"];

export function getRequiredSearchParam(url: URL, name: string) {
  const value = url.searchParams.get(name)?.trim();
  return value ? value : null;
}

export function isValidOwnerKey(value: unknown): value is string {
  return typeof value === "string" && value.trim().length >= 8 && value.trim().length <= 120;
}

export function isValidText(value: unknown, maxLength = 160): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= maxLength;
}

export function isValidCountryCode(value: unknown): value is string {
  return typeof value === "string" && /^[A-Z]{2}$/.test(value);
}

export function isValidDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return date.toISOString().slice(0, 10) === value;
}

export function isValidCoordinate(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

export function parseNumber(value: string | null) {
  if (value === null) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isTripType(value: unknown): value is TripType {
  return typeof value === "string" && tripTypes.includes(value as TripType);
}

export function isDateRangeValid(dateStart: string, dateEnd: string) {
  return dateStart <= dateEnd;
}
