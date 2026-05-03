import { TripMateApp } from "@/features/trips/components/trip-mate-app";

type TripPageProps = {
  params: Promise<{
    trip_id: string;
  }>;
};

export default async function TripPage({ params }: TripPageProps) {
  const { trip_id } = await params;

  return <TripMateApp selectedTripId={trip_id} />;
}
