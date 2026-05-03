export type DestinationSearchResult = {
  id: number;
  name: string;
  country_code: string;
  country_name: string | null;
  latitude: number;
  longitude: number;
  timezone: string | null;
};
