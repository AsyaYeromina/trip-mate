export type DailyWeather = {
  date: string;
  weather_code: number | null;
  temperature_2m_max: number | null;
  temperature_2m_min: number | null;
  precipitation_sum: number | null;
  uv_index_max: number | null;
};

export type WeatherForecast = {
  latitude: number;
  longitude: number;
  timezone: string | null;
  daily: DailyWeather[];
  unavailable_reason?: string;
};
