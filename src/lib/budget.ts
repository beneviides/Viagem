import { City } from "./cities";
import { Category, Expense, Hotel, ItineraryDay } from "../types";
import { addDays, nightsBetween } from "./dates";

export type Forecast = Record<Category, number>;

/** Previsão automática de gastos por categoria, a partir do destino e do que já foi escolhido. */
export function forecast(opts: {
  destination: City;
  departDate: string;
  returnDate: string;
  travelers: number;
  hotels: Hotel[];
  selectedHotelId?: string;
  roomsNeeded?: number;
}): Forecast {
  const { destination, travelers } = opts;
  const nights = nightsBetween(opts.departDate, opts.returnDate);
  const days = nights + 1;
  const hotel = opts.hotels.find((h) => h.id === opts.selectedHotelId);
  const perNight = hotel?.pricePerNight ?? destination.hotelAvg;
  const rooms = opts.roomsNeeded ?? Math.ceil(travelers / 2);
  return {
    voo: 0, // passagens são lançadas manualmente em Gastos
    hotel: perNight * nights * rooms,
    comida: destination.daily.comida * days * travelers,
    transporte: destination.daily.transporte * days * travelers,
    passeios: destination.daily.passeios * days * travelers,
    outros: 0,
  };
}

/** Combina a previsão com despesas lançadas manualmente. */
export function totals(base: Forecast, expenses: Expense[]): Forecast & { total: number } {
  const t = { ...base };
  for (const e of expenses) t[e.category] += e.amount;
  const total = Object.values(t).reduce((a, b) => a + b, 0);
  return { ...t, total };
}

export interface DayProjection {
  date: string;
  comida: number;
  transporte: number;
  passeios: number;
  hotel: number;
  total: number; // grupo todo
}

/**
 * Projeção de gasto para cada dia da viagem (grupo todo).
 * Passeios usam o custo das atividades planejadas no dia; sem atividades, a estimativa do destino.
 * A hospedagem conta nas noites (todos os dias, menos o último).
 */
export function dailyProjection(opts: {
  destination: City;
  departDate: string;
  returnDate: string;
  travelers: number;
  hotels: Hotel[];
  selectedHotelId?: string;
  itinerary: ItineraryDay[];
}): DayProjection[] {
  const { destination, travelers } = opts;
  const nights = nightsBetween(opts.departDate, opts.returnDate);
  const perNight = opts.hotels.find((h) => h.id === opts.selectedHotelId)?.pricePerNight ?? destination.hotelAvg;
  const rooms = Math.ceil(travelers / 2);
  return Array.from({ length: nights + 1 }, (_, i) => {
    const date = addDays(opts.departDate, i);
    const planned = (opts.itinerary.find((d) => d.date === date)?.activities ?? []).reduce((s, a) => s + a.cost, 0);
    const comida = destination.daily.comida * travelers;
    const transporte = destination.daily.transporte * travelers;
    const passeios = planned > 0 ? planned * travelers : destination.daily.passeios * travelers;
    const hotel = i < nights ? perNight * rooms : 0;
    return { date, comida, transporte, passeios, hotel, total: comida + transporte + passeios + hotel };
  });
}
