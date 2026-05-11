export function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function formatDistanceFromUserToSalon(km: number): string {
  if (km < 1) {
    const m = Math.max(1, Math.round(km * 1000));
    return `на ${m} м от вас`;
  }
  const roundedKm = Math.round(km * 10) / 10;
  return `на ${roundedKm.toFixed(1).replace('.', ',')} км от вас`;
}
