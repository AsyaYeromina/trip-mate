import { NextRequest } from "next/server";

import { badRequest, notFound, ok, serverError } from "@/server/http/responses";
import { getRequiredSearchParam, isValidOwnerKey, isValidText } from "@/server/http/validation";
import { deleteTripById, getTripById } from "@/server/trips/trips-repository";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    trip_id: string;
  }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { trip_id } = await context.params;
  const ownerKey = getRequiredSearchParam(request.nextUrl, "ownerKey");

  if (!isValidText(trip_id)) {
    return badRequest("Missing or invalid trip id.");
  }

  if (!isValidOwnerKey(ownerKey)) {
    return badRequest("Missing or invalid ownerKey.");
  }

  try {
    const trip = await getTripById(trip_id, ownerKey);

    if (!trip) {
      return notFound("Trip not found.");
    }

    return ok(trip);
  } catch {
    return serverError();
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { trip_id } = await context.params;
  const ownerKey = getRequiredSearchParam(request.nextUrl, "ownerKey");

  if (!isValidText(trip_id)) {
    return badRequest("Missing or invalid trip id.");
  }

  if (!isValidOwnerKey(ownerKey)) {
    return badRequest("Missing or invalid ownerKey.");
  }

  try {
    const deleted = await deleteTripById(trip_id, ownerKey);

    if (!deleted) {
      return notFound("Trip not found.");
    }

    return ok(deleted);
  } catch {
    return serverError();
  }
}
