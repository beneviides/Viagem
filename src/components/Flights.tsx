import { useEffect, useState } from "react";
import { FlightOffer, Trip } from "../types";
import { cityByCode } from "../lib/cities";
import { flightProvider } from "../lib/flights";
import { brl, fmtDate } from "../lib/dates";

interface Props {
  trip: Trip;
  chosen?: number;
  onChoose: (pricePerPerson: number) => void;
  onChangeTrip: (t: Trip) => void;
}

export default function Flights({ trip, chosen, onChoose, onChangeTrip }: Props) {
  const [flex, setFlex] = useState(3);
  const [offers, setOffers] = useState<FlightOffer[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const o = cityByCode(trip.origin);
    const d = cityByCode(trip.destination);
    if (!o || !d) return;
    let cancelled = false;
    setLoading(true);
    flightProvider.search(o, d, trip.departDate, trip.returnDate, flex).then((r) => {
      if (!cancelled) {
        setOffers(r);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [trip.origin, trip.destination, trip.departDate, trip.returnDate, flex]);

  const cheapest = offers[0];
  return (
    <section>
      <div className="card">
        <label>
          Flexibilidade de datas: ±{flex} dias
          <input type="range" min={0} max={7} value={flex} onChange={(e) => setFlex(+e.target.value)} />
        </label>
        <p className="muted">
          ⚠️ Preços simulados para demonstração (por pessoa, ida e volta). Para valores reais, conecte um provedor em{" "}
          <code>src/lib/flights.ts</code>.
        </p>
      </div>
      {loading && <p>Buscando…</p>}
      {cheapest && (
        <p className="highlight">
          Mais barata: <strong>{brl(cheapest.price)}</strong> saindo em {fmtDate(cheapest.date)}
        </p>
      )}
      <ul className="list">
        {offers.map((o) => {
          const selected = chosen === o.price;
          return (
            <li key={o.date} className={selected ? "selected" : ""}>
              <div>
                <strong>{fmtDate(o.date)}</strong> → {fmtDate(o.returnDate)}
                <div className="muted">
                  {o.airline} · {o.stops === 0 ? "direto" : `${o.stops} escala`}
                </div>
              </div>
              <div className="right">
                <strong>{brl(o.price)}</strong>
                <button
                  onClick={() => {
                    onChoose(o.price);
                    onChangeTrip({ ...trip, departDate: o.date, returnDate: o.returnDate });
                  }}
                >
                  {selected ? "Escolhida ✓" : "Escolher"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
