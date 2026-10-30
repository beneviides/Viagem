import { City } from "./cities";
import { Category, Expense, Hotel } from "../types";
import { nightsBetween } from "./dates";

export type Forecast = Record<Category, number>;

/** Previsão automática de gastos por categoria, a partir do destino e do que já foi escolhido. */
export function forecast(opts: {
  destination: City;
  departDate: string;
  returnDate: string;
  travelers: number;
  flightPerPerson?: number;
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
    voo: (opts.flightPerPerson ?? 0) * travelers,
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
