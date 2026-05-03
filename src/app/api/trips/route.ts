import { NextRequest } from "next/server";

import type { CreateTripInput } from "@/features/trips/types/trip";
import { badRequest, ok, serverError } from "@/server/http/responses";
import {
  getRequiredSearchParam,
  isDateRangeValid,
  isTripType,
  isValidCoordinate,
  isValidCountryCode,
  isValidDate,
  isValidOwnerKey,
  isValidText,
} from "@/server/http/validation";
import { createTrip, listTrips } from "@/server/trips/trips-repository";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const ownerKey = getRequiredSearchParam(request.nextUrl, "ownerKey");

  if (!isValidOwnerKey(ownerKey)) {
    return badRequest("Missing or invalid ownerKey.");
  }

  try {
    const trips = await listTrips(ownerKey);
    return ok(trips);
  } catch {
    return serverError();
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body.");
  }

  if (!isCreateTripBody(body)) {
    return badRequest("Invalid trip payload.");
  }

  if (!isDateRangeValid(body.date_start, body.date_end)) {
    return badRequest("date_start must be before or equal to date_end.");
  }

  try {
    const trip = await createTrip(body);
    return ok(trip, { status: 201 });
  } catch {
    return serverError();
  }
}

function isCreateTripBody(value: unknown): value is CreateTripInput {
  if (!value || typeof value !== "object") {
    return false;
  }

  const body = value as Record<string, unknown>;

  return (
    isValidOwnerKey(body.owner_key) &&
    isValidText(body.destination_name) &&
    isValidCountryCode(body.country_code) &&
    (body.country_name === null || isValidText(body.country_name)) &&
    isValidCoordinate(body.latitude, -90, 90) &&
    isValidCoordinate(body.longitude, -180, 180) &&
    (body.timezone === null || isValidText(body.timezone)) &&
    isValidDate(body.date_start) &&
    isValidDate(body.date_end) &&
    isTripType(body.trip_type)
  );
}
