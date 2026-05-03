export type Country = {
  code: string;
  cca2: string;
  name_common: string;
  name_official: string | null;
  currencies: Record<string, { name?: string; symbol?: string }> | null;
  languages: Record<string, string> | null;
  timezones: string[] | null;
  region: string | null;
  subregion: string | null;
  borders: string[] | null;
  flag: string | null;
  landlocked: boolean | null;
  gini: Record<string, number> | null;
  cost_of_living_index: number | null;
  safety_index: number | null;
  extra_facts: Record<string, string> | null;
};
