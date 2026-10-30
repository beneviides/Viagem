import { useEffect, useState } from "react";
import { FlightOffer, Trip } from "../types";
import { cityByCode } from "../lib/cities";
import { SearchResult, searchFlights } from "../lib/flights";
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
  const [source, setSource] = useState<Pick<SearchResult, "simulated" | "reason">>({ simulated: true });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const o = cityByCode(trip.origin);
    const d = cityByCode(trip.destination);
    if (!o || !d) return;
    let cancelled = false;
    setLoading(true);
    searchFlights(o, d, trip.departDate, trip.returnDate, flex).then((r) => {
      if (!cancelled) {
        setOffers(r.offers);
        setSource({ simulated: r.simulated, reason: r.reason });
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
          <input type="range" min={0} max={3} value={flex} onChange={(e) => setFlex(+e.target.value)} />
        </label>
        {source.simulated ? (
          <p className="muted">
            ⚠️ Preços simulados (por pessoa, ida e volta).{" "}
            {source.reason === "not_configured"
              ? "Para preços reais do Google Flights, configure SERPAPI_KEY no servidor (veja o README)."
              : source.reason === "no_results"
                ? "O Google Flights não retornou voos para esse trecho/datas."
                : "Servidor de voos indisponível: rode `npm run server`."}
          </p>
        ) : (
          <p className="muted">✅ Preços reais do Google Flights via SerpApi (por pessoa, ida e volta, em R$).</p>
        )}
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
