export interface City {
  code: string;
  name: string;
  country: string;
  lat: number;
  lon: number;
  /** Custo médio diário por pessoa em BRL (sem hotel e sem voo). */
  daily: { comida: number; transporte: number; passeios: number };
  /** Diária média de hotel (quarto duplo, categoria 3 estrelas) em BRL. */
  hotelAvg: number;
}

export const CITIES: City[] = [
  { code: "GRU", name: "São Paulo", country: "Brasil", lat: -23.43, lon: -46.47, daily: { comida: 120, transporte: 40, passeios: 80 }, hotelAvg: 380 },
  { code: "GIG", name: "Rio de Janeiro", country: "Brasil", lat: -22.81, lon: -43.25, daily: { comida: 110, transporte: 35, passeios: 90 }, hotelAvg: 420 },
  { code: "SSA", name: "Salvador", country: "Brasil", lat: -12.91, lon: -38.33, daily: { comida: 90, transporte: 30, passeios: 70 }, hotelAvg: 300 },
  { code: "FLN", name: "Florianópolis", country: "Brasil", lat: -27.67, lon: -48.55, daily: { comida: 100, transporte: 45, passeios: 80 }, hotelAvg: 390 },
  { code: "REC", name: "Recife", country: "Brasil", lat: -8.13, lon: -34.92, daily: { comida: 90, transporte: 30, passeios: 60 }, hotelAvg: 290 },
  { code: "LIS", name: "Lisboa", country: "Portugal", lat: 38.77, lon: -9.13, daily: { comida: 230, transporte: 60, passeios: 150 }, hotelAvg: 650 },
  { code: "MAD", name: "Madri", country: "Espanha", lat: 40.49, lon: -3.57, daily: { comida: 250, transporte: 60, passeios: 150 }, hotelAvg: 700 },
  { code: "CDG", name: "Paris", country: "França", lat: 49.01, lon: 2.55, daily: { comida: 330, transporte: 80, passeios: 200 }, hotelAvg: 950 },
  { code: "FCO", name: "Roma", country: "Itália", lat: 41.8, lon: 12.25, daily: { comida: 280, transporte: 60, passeios: 180 }, hotelAvg: 800 },
  { code: "LHR", name: "Londres", country: "Reino Unido", lat: 51.47, lon: -0.45, daily: { comida: 350, transporte: 100, passeios: 200 }, hotelAvg: 1000 },
  { code: "JFK", name: "Nova York", country: "EUA", lat: 40.64, lon: -73.78, daily: { comida: 400, transporte: 100, passeios: 250 }, hotelAvg: 1300 },
  { code: "MIA", name: "Miami", country: "EUA", lat: 25.79, lon: -80.29, daily: { comida: 350, transporte: 120, passeios: 220 }, hotelAvg: 1000 },
  { code: "EZE", name: "Buenos Aires", country: "Argentina", lat: -34.82, lon: -58.54, daily: { comida: 150, transporte: 40, passeios: 100 }, hotelAvg: 450 },
  { code: "SCL", name: "Santiago", country: "Chile", lat: -33.39, lon: -70.79, daily: { comida: 200, transporte: 50, passeios: 120 }, hotelAvg: 520 },
  { code: "CUN", name: "Cancún", country: "México", lat: 21.04, lon: -86.87, daily: { comida: 220, transporte: 70, passeios: 220 }, hotelAvg: 800 },
];

export const cityByCode = (code: string): City | undefined => CITIES.find((c) => c.code === code);

/** Distância em km (haversine). */
export function distanceKm(a: City, b: City): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
