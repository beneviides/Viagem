import { Trip } from "../types";
import { CITIES } from "../lib/cities";

export default function TripForm({ trip, onChange }: { trip: Trip; onChange: (t: Trip) => void }) {
  const set = <K extends keyof Trip>(k: K, v: Trip[K]) => onChange({ ...trip, [k]: v });
  const cityOptions = CITIES.map((c) => (
    <option key={c.code} value={c.code}>
      {c.name} ({c.code}) — {c.country}
    </option>
  ));
  return (
    <section className="card form">
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
    </section>
  );
}
