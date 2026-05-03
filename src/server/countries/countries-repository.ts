import type { Country } from "@/features/countries/types/country";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const countryColumns =
  "code, cca2, name_common, name_official, currencies, languages, timezones, region, subregion, borders, flag, landlocked, gini, cost_of_living_index, safety_index, extra_facts";

export async function getCountryByCode(countryCode: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("countries")
    .select(countryColumns)
    .eq("code", countryCode)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as Country | null;
}
