import { City, cityByCode } from "./cities";
import { Costs, Place, Trip } from "../types";

/** Código usado em `trip.destination` quando o destino é digitado (ver `trip.place`). */
export const CUSTOM_CODE = "OUT";

/** Valores sugeridos para um destino digitado: um meio-termo que a pessoa ajusta. */
export const DEFAULT_COSTS: Costs = { comida: 150, transporte: 40, passeios: 100, hotelAvg: 500 };

export const defaultPlace = (): Place => ({
  name: "Meu destino",
  country: "Brasil",
  code: "MEU",
  climate: "warm",
  longHaul: false,
  beach: false,
});

/** Sigla de até 4 letras A-Z a partir do nome ("Fernando de Noronha" -> "FER"). */
export function codeFromName(name: string): string {
  const letters = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
  return letters.slice(0, 3) || "OUT";
}

export function placeToCity(p: Place): City {
  return {
    code: p.code,
    name: p.name,
    country: p.country,
    lat: 0,
    lon: 0,
    daily: { comida: DEFAULT_COSTS.comida, transporte: DEFAULT_COSTS.transporte, passeios: DEFAULT_COSTS.passeios },
    hotelAvg: DEFAULT_COSTS.hotelAvg,
    tip: p.tip ?? "",
    climate: p.climate,
    longHaul: p.longHaul,
    beach: p.beach,
  };
}

/** Aplica os valores que a pessoa ajustou; o que não foi ajustado fica como está. */
export function applyCosts(city: City, costs?: Partial<Costs>): City {
  if (!costs) return city;
  return {
    ...city,
    daily: {
      comida: costs.comida ?? city.daily.comida,
      transporte: costs.transporte ?? city.daily.transporte,
      passeios: costs.passeios ?? city.daily.passeios,
    },
    hotelAvg: costs.hotelAvg ?? city.hotelAvg,
  };
}

/** O destino da viagem como cidade, já com os valores ajustados. `undefined` se o código não existir. */
export function resolveDestination(trip: Pick<Trip, "destination" | "place" | "costs">): City | undefined {
  const base = trip.destination === CUSTOM_CODE ? (trip.place ? placeToCity(trip.place) : undefined) : cityByCode(trip.destination);
  return base && applyCosts(base, trip.costs);
}

/** Código mostrado para o destino (o da cidade, ou a sigla do destino digitado). */
export const destinationCode = (trip: Pick<Trip, "destination" | "place">): string =>
  trip.destination === CUSTOM_CODE ? trip.place?.code || CUSTOM_CODE : trip.destination;
