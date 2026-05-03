import { NextRequest } from "next/server";

import { badRequest, notFound, ok, serverError } from "@/server/http/responses";
import { isValidCountryCode } from "@/server/http/validation";
import { getCountryByCode } from "@/server/countries/countries-repository";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    country_code: string;
  }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { country_code } = await context.params;
  const normalizedCode = country_code.toUpperCase();

  if (!isValidCountryCode(normalizedCode)) {
    return badRequest("Missing or invalid country code.");
  }

  try {
    const country = await getCountryByCode(normalizedCode);

    if (!country) {
      return notFound("Country not found.");
    }

    return ok(country);
  } catch {
    return serverError();
  }
}
