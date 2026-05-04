export type TripType = "city" | "beach" | "adventure" | "business";

export type Trip = {
  id: string;
  owner_key: string;
  destination_name: string;
  country_code: string;
  country_name: string | null;
  latitude: number;
  longitude: number;
  timezone: string | null;
  date_start: string;
  date_end: string;
  trip_type: TripType;
  created_at?: string;
  updated_at?: string;
};

export type CreateTripInput = {
  owner_key: string;
  destination_name: string;
  country_code: string;
  country_name: string | null;
  latitude: number;
  longitude: number;
  timezone: string | null;
  date_start: string;
  date_end: string;
  trip_type: TripType;
};
