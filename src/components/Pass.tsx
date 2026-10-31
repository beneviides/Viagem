import { City } from "../lib/cities";
import { Trip } from "../types";
import { countdownLabel, fmtParts, nightsBetween } from "../lib/dates";

// Cidade com vários aeroportos: cidade numa linha, aeroporto na outra.
const place = (c: City) =>
  c.airport ? (
    <>
      {c.area}
      <br />
      {c.airport}
    </>
  ) : (
    c.name
  );

const short = (iso: string) => {
  const p = fmtParts(iso);
  return `${p.day} ${p.month}`;
};

interface Props {
  trip: Trip;
  origin: City;
  destination: City;
  tripCount: number;
  onOpenTrips: () => void;
}

export default function Pass({ trip, origin, destination, tripCount, onOpenTrips }: Props) {
  return (
    <section className="pass" aria-label={`Viagem de ${origin.name} para ${destination.name}`}>
      <div className="pass-top">
        <button type="button" className="pass-link" onClick={onOpenTrips} aria-label={`Minhas viagens (${tripCount})`}>
          Minhas viagens ({tripCount}) ▾
        </button>
        <b>{countdownLabel(trip.departDate, trip.returnDate)}</b>
      </div>
      <div className="pass-route">
        <div className="leg">
          <span className="code">{origin.code}</span>
          <span className="city">{place(origin)}</span>
        </div>
        <div className="route-line" aria-hidden="true">
          <i />
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" />
          </svg>
          <i />
        </div>
        <div className="leg end">
          <span className="code">{destination.code}</span>
          <span className="city">{place(destination)}</span>
        </div>
      </div>
      <dl className="pass-stub">
        <div>
          <dt>Ida</dt>
          <dd>{short(trip.departDate)}</dd>
        </div>
        <div>
          <dt>Volta</dt>
          <dd>{short(trip.returnDate)}</dd>
        </div>
        <div>
          <dt>Noites</dt>
          <dd>{nightsBetween(trip.departDate, trip.returnDate)}</dd>
        </div>
        <div>
          <dt>Viajantes</dt>
          <dd>{trip.travelers}</dd>
        </div>
      </dl>
    </section>
  );
}
