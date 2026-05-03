export type PackingSuggestion = {
  id: string;
  label: string;
  reason: string;
  category: "weather" | "duration" | "trip-type";
};
