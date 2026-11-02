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

/** Cidades sugeridas para a próxima parada, em ordem; usa a primeira que ainda não está na viagem. */
const NEXT_STOP_CODES = ["SSA", "AJU", "REC", "FOR", "MCZ", "NAT", "JPA", "GIG", "FLN", "BSB", "CWB", "POA"];

const newLegId = () => Math.random().toString(36).slice(2, 10);

/**
 * Adiciona UMA parada à viagem.
 * Numa viagem de destino único, a cidade atual passa a ser a Parada 1 (com todas as noites) e a nova vira a Parada 2.
 * As noites da nova parada saem da última parada que tiver 2 ou mais, para o total da viagem não mudar.
 */
export function addLegToTrip(trip: Trip, makeId: () => string = newLegId): Trip {
  const totalNights = Math.max(1, nightsBetween(trip.departDate, trip.returnDate));
  const legs: TripLeg[] = trip.legs && trip.legs.length > 0
    ? trip.legs.map((l) => ({ ...l }))
    : [{ id: makeId(), destination: trip.destination, nights: totalNights, transport: trip.transport ?? "aviao", transportCost: 0 }];

  let nights = 1;
  for (let i = legs.length - 1; i >= 0; i--) {
    if (legs[i].nights >= 2) {
      nights = Math.floor(legs[i].nights / 2);
      legs[i].nights -= nights;
      break;
    }
  }

  const used = new Set([...legs.map((l) => l.destination), trip.origin]);
  const destination = NEXT_STOP_CODES.find((c) => !used.has(c) && cityByCode(c)) ?? "REC";
  legs.push({ id: makeId(), destination, nights, transport: "aviao", transportCost: 0 });
  return { ...trip, destination: legs[0].destination, legs };
}

/**
 * Remove UMA parada, qualquer uma. As noites dela vão para a parada vizinha (a anterior, ou a seguinte se era a primeira),
 * para o total da viagem não mudar. Se sobrar só uma parada, a viagem volta a ser de destino único.
 */
export function removeLegFromTrip(trip: Trip, legId: string): Trip {
  const legs = trip.legs;
  if (!legs) return trip;
  const idx = legs.findIndex((l) => l.id === legId);
  if (idx < 0) return trip;
  const rest = legs.filter((_, i) => i !== idx).map((l) => ({ ...l }));
  if (rest.length > 0) rest[Math.max(0, idx - 1)].nights += legs[idx].nights;
  if (rest.length <= 1) {
    const { legs: _legs, ...single } = trip;
    return { ...single, destination: rest[0]?.destination ?? trip.destination };
  }
  return { ...trip, destination: rest[0].destination, legs: rest };
}
