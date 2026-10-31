import { City } from "./cities";
import { Category, Expense, Hotel, ItineraryDay, Trip } from "../types";
import { addDays, nightsBetween } from "./dates";
import { getCityForDate, getResolvedLegs } from "./legs";

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
  trip?: Trip;
}): Forecast {
  const { destination, travelers } = opts;
  const nights = nightsBetween(opts.departDate, opts.returnDate);
  const days = nights + 1;
  const rooms = opts.roomsNeeded ?? Math.ceil(travelers / 2);

  // Se a viagem possui múltiplos trechos com cidades distintas:
  if (opts.trip && opts.trip.legs && opts.trip.legs.length > 1) {
    const legs = getResolvedLegs(opts.trip);
    let comida = 0;
    let transporte = 0;
    let passeios = 0;
    let hotel = 0;
    let passagens = 0;

    for (const leg of legs) {
      const city = leg.destinationCity;
      comida += city.daily.comida * leg.nights * travelers;
      transporte += city.daily.transporte * leg.nights * travelers;
      passeios += city.daily.passeios * leg.nights * travelers;
      
      const cityHotel = opts.hotels.find((h) => h.destinationCode === leg.destinationCode)
        ?? (opts.selectedHotelId ? opts.hotels.find((h) => h.id === opts.selectedHotelId) : undefined);
      const perNight = cityHotel?.pricePerNight ?? city.hotelAvg;
      hotel += perNight * leg.nights * rooms;
      passagens += (leg.transportCost || 0) * travelers;
    }

    return {
      voo: passagens,
      hotel,
      comida,
      transporte,
      passeios,
      outros: 0,
    };
  }

  // Comportamento clássico de destino único
  const hotelItem = opts.hotels.find((h) => h.id === opts.selectedHotelId);
  const perNight = hotelItem?.pricePerNight ?? destination.hotelAvg;
  return {
    voo: 0, // passagens são lançadas manualmente ou pelos trechos
    hotel: perNight * nights * rooms,
    comida: destination.daily.comida * days * travelers,
    transporte: destination.daily.transporte * days * travelers,
    passeios: destination.daily.passeios * days * travelers,
    outros: 0,
  };
}

export type Totals = Forecast & { total: number };

const CATEGORIES: Category[] = ["voo", "hotel", "comida", "transporte", "passeios", "outros"];

/** Soma só as categorias, nunca um `total` que o objeto já traga. */
const sum = (f: Forecast): Totals => {
  const { voo, hotel, comida, transporte, passeios, outros } = f;
  return { voo, hotel, comida, transporte, passeios, outros, total: CATEGORIES.reduce((a, c) => a + f[c], 0) };
};

/** Previsto = estimativa do destino + valores planejados lançados à mão (gastos reais ficam de fora). */
export function totals(base: Forecast, expenses: Expense[]): Totals {
  const t = { ...base };
  for (const e of expenses) if (!e.spent) t[e.category] += e.amount;
  return sum(t);
}

/** Realizado = soma dos gastos reais lançados. */
export function realized(expenses: Expense[]): Totals {
  const t: Forecast = { voo: 0, hotel: 0, comida: 0, transporte: 0, passeios: 0, outros: 0 };
  for (const e of expenses) if (e.spent) t[e.category] += e.amount;
  return sum(t);
}

/**
 * Projeção final por categoria: o maior entre o previsto e o já gasto.
 * Se gastou menos que o previsto, ainda falta gastar; se gastou mais, o real manda.
 */
export function projected(expected: Forecast, real: Forecast): Totals {
  const p = { ...expected };
  CATEGORIES.forEach((c) => (p[c] = Math.max(expected[c], real[c])));
  return sum(p);
}

export interface DayProjection {
  date: string;
  city?: City;
  comida: number;
  transporte: number;
  passeios: number;
  hotel: number;
  total: number; // grupo todo
  /** Gastos reais lançados neste dia. */
  real: number;
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
  expenses?: Expense[];
  trip?: Trip;
}): DayProjection[] {
  const { destination, travelers } = opts;
  const nights = nightsBetween(opts.departDate, opts.returnDate);
  const rooms = Math.ceil(travelers / 2);

  return Array.from({ length: nights + 1 }, (_, i) => {
    const date = addDays(opts.departDate, i);
    // Identifica qual cidade o viajante está neste dia específico
    const dayCity = opts.trip ? getCityForDate(opts.trip, date) : destination;
    
    // Procura hotel da cidade ou selecionado
    const cityHotel = opts.hotels.find((h) => h.destinationCode === dayCity.code)
      ?? opts.hotels.find((h) => h.id === opts.selectedHotelId);
    const perNight = cityHotel?.pricePerNight ?? dayCity.hotelAvg;

    const planned = (opts.itinerary.find((d) => d.date === date)?.activities ?? []).reduce((s, a) => s + a.cost, 0);
    const comida = dayCity.daily.comida * travelers;
    const transporte = dayCity.daily.transporte * travelers;
    const passeios = planned > 0 ? planned * travelers : dayCity.daily.passeios * travelers;
    const hotel = i < nights ? perNight * rooms : 0;
    const real = (opts.expenses ?? []).filter((e) => e.spent && e.date === date).reduce((s, e) => s + e.amount, 0);

    return {
      date,
      city: dayCity,
      comida,
      transporte,
      passeios,
      hotel,
      total: comida + transporte + passeios + hotel,
      real,
    };
  });
}

export interface ProjectionSummary {
  /** Custo por pessoa/dia, sem passagem, com a diária do hotel dividida entre os viajantes. */
  perPersonDay: number;
  hotelShare: number;
  /** Média diária do grupo ao longo da viagem. */
  avgDay: number;
  days: number;
}

export function summarizeProjection(destination: City, projection: DayProjection[], travelers: number): ProjectionSummary {
  const rooms = Math.ceil(travelers / 2);
  const hotelPerNight = projection[0] && projection[0].hotel > 0 ? projection[0].hotel / rooms : destination.hotelAvg;
  const hotelShare = (hotelPerNight * rooms) / travelers;
  const { comida, transporte, passeios } = destination.daily;
  const avgDay = projection.length ? projection.reduce((s, d) => s + d.total, 0) / projection.length : 0;
  return { perPersonDay: comida + transporte + passeios + hotelShare, hotelShare, avgDay, days: projection.length };
}
