import { City, distanceKm } from "./cities";
import { addDays, nightsBetween } from "./dates";
import { FlightOffer } from "../types";

/**
 * Contrato de um provedor de passagens. Para preços reais, implemente esta
 * interface com Amadeus, Kiwi/Tequila, Skyscanner etc. (exigem chave de API e
 * um backend para não expor a chave no navegador) e troque em `flightProvider`.
 */
export interface FlightProvider {
  search(origin: City, destination: City, departDate: string, returnDate: string, flexDays: number): Promise<FlightOffer[]>;
}

const AIRLINES = ["LATAM", "GOL", "Azul", "TAP", "Iberia", "Air France", "American", "Copa"];

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

/** Provedor simulado: preços determinísticos baseados na distância e na data. NÃO são preços reais. */
export const mockProvider: FlightProvider = {
  async search(origin, destination, departDate, returnDate, flexDays) {
    const km = distanceKm(origin, destination);
    const nights = nightsBetween(departDate, returnDate);
    const base = 150 + km * 0.55; // ida e volta
    const offers: FlightOffer[] = [];
    for (let shift = -flexDays; shift <= flexDays; shift++) {
      const date = addDays(departDate, shift);
      const ret = addDays(date, nights);
      const seed = hash(`${origin.code}${destination.code}${date}`);
      const dow = new Date(date + "T12:00:00").getDay();
      const weekend = dow === 5 || dow === 0 ? 1.15 : dow === 2 || dow === 3 ? 0.9 : 1;
      const price = Math.round((base * weekend * (0.8 + seed * 0.5)) / 10) * 10;
      offers.push({
        date,
        returnDate: ret,
        price,
        airline: AIRLINES[Math.floor(seed * 1000) % AIRLINES.length],
        stops: km > 6000 && seed > 0.5 ? 1 : seed > 0.85 ? 1 : 0,
      });
    }
    return offers.sort((a, b) => a.price - b.price);
  },
};

export const flightProvider: FlightProvider = mockProvider;
