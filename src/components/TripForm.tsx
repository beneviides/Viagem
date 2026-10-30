import { Trip } from "../types";
import { CITIES, City } from "../lib/cities";
import { DayProjection, summarizeProjection } from "../lib/budget";
import { brl } from "../lib/dates";

interface Props {
  trip: Trip;
  destination: City;
  projection: DayProjection[];
  onChange: (t: Trip) => void;
}

export default function TripForm({ trip, destination, projection, onChange }: Props) {
  const { perPersonDay, avgDay, days } = summarizeProjection(destination, projection, trip.travelers);
  const set = <K extends keyof Trip>(k: K, v: Trip[K]) => onChange({ ...trip, [k]: v });
  const cityOptions = CITIES.map((c) => (
    <option key={c.code} value={c.code}>
      {c.name} ({c.code}) — {c.country}
    </option>
  ));
  return (
    <section>
      <div className="card">
        <h3>Projeção em {destination.name}</h3>
        <p>
          <strong>{brl(perPersonDay)}</strong> por pessoa/dia <span className="muted">(sem passagem)</span>
        </p>
        <p className="muted">
          Grupo de {trip.travelers}: {brl(avgDay)} por dia em média · {days} dias. Detalhes na aba Gastos.
        </p>
      </div>
      <div className="card form">
        <label>
          Saindo de
          <select value={trip.origin} onChange={(e) => set("origin", e.target.value)}>
            {cityOptions}
          </select>
        </label>
        <label>
          Destino
          <select value={trip.destination} onChange={(e) => set("destination", e.target.value)}>
            {cityOptions}
          </select>
        </label>
        <label>
          Ida
          <input type="date" value={trip.departDate} onChange={(e) => set("departDate", e.target.value)} />
        </label>
        <label>
          Volta
          <input type="date" value={trip.returnDate} min={trip.departDate} onChange={(e) => set("returnDate", e.target.value)} />
        </label>
        <label>
          Viajantes
          <input type="number" min={1} value={trip.travelers} onChange={(e) => set("travelers", Math.max(1, +e.target.value || 1))} />
        </label>
        <label>
          Orçamento total (R$)
          <input type="number" min={0} step={100} value={trip.budgetTotal} onChange={(e) => set("budgetTotal", Math.max(0, +e.target.value || 0))} />
        </label>
      </div>
    </section>
  );
}
