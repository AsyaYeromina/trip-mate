export function getTripDurationDays(dateStart: string, dateEnd: string) {
  const start = new Date(`${dateStart}T00:00:00`);
  const end = new Date(`${dateEnd}T00:00:00`);
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const diff = Math.floor((end.getTime() - start.getTime()) / millisecondsPerDay);

  return Number.isFinite(diff) ? diff + 1 : 0;
}

export function formatTripDateRange(dateStart: string, dateEnd: string) {
  return `${dateStart} - ${dateEnd}`;
}
