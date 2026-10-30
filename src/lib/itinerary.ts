import { ItineraryDay } from "../types";
import { addDays } from "./dates";

/** Desloca o roteiro inteiro quando a viagem é adiada ou adiantada. */
export const shiftItinerary = (days: ItineraryDay[], delta: number): ItineraryDay[] =>
  delta === 0 ? days : days.map((d) => ({ ...d, date: addDays(d.date, delta) }));

/** Dias com atividades que ficaram fora das datas da viagem. */
export const outsideRange = (days: ItineraryDay[], depart: string, ret: string): ItineraryDay[] =>
  days.filter((d) => d.activities.length > 0 && (d.date < depart || d.date > ret));
