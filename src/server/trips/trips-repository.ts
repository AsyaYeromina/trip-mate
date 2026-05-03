import type { CreateTripInput, Trip } from "@/features/trips/types/trip";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const tripColumns =
  "id, owner_key, destination_name, country_code, country_name, latitude, longitude, timezone, date_start, date_end, trip_type, created_at, updated_at";

export async function listTrips(ownerKey: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("trips")
    .select(tripColumns)
    .eq("owner_key", ownerKey)
    .order("date_start", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as Trip[];
}

export async function createTrip(input: CreateTripInput) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("trips")
    .insert(input)
    .select(tripColumns)
    .single();

  if (error) {
    throw error;
  }

  return data as Trip;
}

export async function getTripById(tripId: string, ownerKey: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("trips")
    .select(tripColumns)
    .eq("id", tripId)
    .eq("owner_key", ownerKey)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as Trip | null;
}

export async function deleteTripById(tripId: string, ownerKey: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("trips")
    .delete()
    .eq("id", tripId)
    .eq("owner_key", ownerKey)
    .select("id")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as { id: string } | null;
}
