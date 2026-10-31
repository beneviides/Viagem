import { City, cityByCode } from "./cities";
import { addDays, nightsBetween } from "./dates";
import { TransportType, Trip, TripLeg } from "../types";

export const TRANSPORT_INFO: Record<TransportType, { label: string; icon: string; verb: string }> = {
  aviao: { label: "Avião", icon: "✈️", verb: "Voo" },
  onibus: { label: "Ônibus", icon: "🚌", verb: "Viagem de Ônibus" },
  carro: { label: "Carro / Transfer", icon: "🚗", verb: "Carro / Transfer" },
  trem: { label: "Trem", icon: "🚆", verb: "Viagem de Trem" },
  barco: { label: "Barco / Balsa", icon: "🚢", verb: "Travessia de Barco" },
};

export interface ResolvedLeg {
  id: string;
  originCode: string;
  destinationCode: string;
  originCity: City;
  destinationCity: City;
  startDate: string;
  endDate: string;
  nights: number;
  transport: TransportType;
  transportCost: number;
  notes?: string;
}

/**
 * Normaliza os trechos de uma viagem.
 * Se a viagem já tiver `legs` com 1 ou mais paradas, calcula as datas sequenciais de cada parada.
 * Caso contrário, cria um trecho único baseado no destino principal.
 */
export function getResolvedLegs(trip: Trip): ResolvedLeg[] {
  const totalNights = Math.max(1, nightsBetween(trip.departDate, trip.returnDate));
  const fallbackOrigin = cityByCode(trip.origin) ?? {
    code: trip.origin,
    name: trip.origin,
    country: "Brasil",
    lat: 0,
    lon: 0,
    daily: { comida: 100, transporte: 30, passeios: 60 },
    hotelAvg: 300,
    tip: "",
  };
  const fallbackDestination = cityByCode(trip.destination) ?? fallbackOrigin;

  if (!trip.legs || trip.legs.length === 0) {
    return [
      {
        id: "default",
        originCode: trip.origin,
        destinationCode: trip.destination,
        originCity: fallbackOrigin,
        destinationCity: fallbackDestination,
        startDate: trip.departDate,
        endDate: trip.returnDate,
        nights: totalNights,
        transport: trip.transport ?? "aviao",
        transportCost: 0,
      },
    ];
  }

  let currentDate = trip.departDate;
  let previousCode = trip.origin;

  return trip.legs.map((leg, index) => {
    const origCode = leg.origin || previousCode;
    const origCity = cityByCode(origCode) ?? fallbackOrigin;
    const destCity = cityByCode(leg.destination) ?? fallbackDestination;
    const nights = Math.max(1, leg.nights || 1);
    const startDate = currentDate;
    const endDate = addDays(startDate, nights);

    currentDate = endDate;
    previousCode = leg.destination;

    return {
      id: leg.id || `leg-${index}`,
      originCode: origCode,
      destinationCode: leg.destination,
      originCity: origCity,
      destinationCity: destCity,
      startDate,
      endDate,
      nights,
      transport: leg.transport || "aviao",
      transportCost: leg.transportCost || 0,
      notes: leg.notes,
    };
  });
}

/** Retorna a cidade em que o viajante está em uma data específica. */
export function getCityForDate(trip: Trip, date: string): City {
  const legs = getResolvedLegs(trip);
  // Procura o trecho cuja data se encaixa
  for (const leg of legs) {
    if (date >= leg.startDate && date <= leg.endDate) {
      return leg.destinationCity;
    }
  }
  // Se for antes ou depois, retorna a primeira ou última cidade
  if (date < legs[0].startDate) return legs[0].originCity;
  return legs[legs.length - 1].destinationCity;
}

/** Retorna se uma data é de transição/deslocamento entre cidades. */
export function getTransferInfo(trip: Trip, date: string): ResolvedLeg | null {
  const legs = getResolvedLegs(trip);
  if (legs.length <= 1) return null;
  // A transição acontece na data de início de cada trecho a partir do 2º
  for (let i = 1; i < legs.length; i++) {
    if (legs[i].startDate === date) {
      return legs[i];
    }
  }
  return null;
}

/** Gera resumo textual dos destinos da viagem (ex: "Aracaju (7 noites) + Salvador (8 noites)") */
export function multiTripSummary(trip: Trip): string {
  const legs = getResolvedLegs(trip);
  if (legs.length <= 1) {
    return `${legs[0].destinationCity.name} (${legs[0].nights} noites)`;
  }
  return legs.map((l) => `${l.destinationCity.name} (${l.nights}n · ${TRANSPORT_INFO[l.transport].icon})`).join(" + ");
}
