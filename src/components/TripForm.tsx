import { Trip } from "../types";
import { ABROAD_GROUPS, City, ORIGIN_GROUPS } from "../lib/cities";
import { DayProjection, summarizeProjection } from "../lib/budget";
import { useState } from "react";
import { addDays, brl, daysBetween, fmtParts } from "../lib/dates";

interface Props {
  trip: Trip;
  destination: City;
  projection: DayProjection[];
  onChange: (t: Trip) => void;
}

export default function TripForm({ trip, destination, projection, onChange }: Props) {
  // Destinos do Brasil sempre; os de fora entram se a pessoa pedir ou se a viagem já for para fora.
  const [wantAbroad, setWantAbroad] = useState(false);
  const abroadNow = destination.country !== "Brasil";
  const showAbroad = wantAbroad || abroadNow;
  const { perPersonDay, avgDay, days } = summarizeProjection(destination, projection, trip.travelers);
  const set = <K extends keyof Trip>(k: K, v: Trip[K]) => onChange({ ...trip, [k]: v });
  // Mudar a ida mantém a duração: a volta acompanha. A volta nunca fica antes da ida.
  const setDepart = (v: string) => {
    if (!v) return;
    const length = Math.max(0, daysBetween(trip.departDate, trip.returnDate));
    onChange({ ...trip, departDate: v, returnDate: addDays(v, length) });
  };
  const setReturn = (v: string) => {
    if (!v) return;
    set("returnDate", v < trip.departDate ? trip.departDate : v);
  };
  // Cidades do Brasil: aeroportos da mesma cidade ficam juntos e aparecem pelo nome do aeroporto.
  const brazilOptions = ORIGIN_GROUPS.map((g) => (
    <optgroup key={g.label} label={g.label}>
      {g.cities.map((c) => (
        <option key={c.code} value={c.code}>
          {c.airport ? `${c.airport} (${c.code})` : `${c.name} (${c.code})`}
        </option>
      ))}
    </optgroup>
  ));
  const abroadOptions = ABROAD_GROUPS.map((g) => (
    <optgroup key={g.country} label={g.country}>
      {g.cities.map((c) => (
        <option key={c.code} value={c.code}>
          {c.name} ({c.code})
        </option>
      ))}
    </optgroup>
  ));
  return (
    <>
      <section className="card">
        <div className="stat-label">Projeção em {destination.name}</div>
        <div className="stat">
          {brl(perPersonDay)}
          <small>por pessoa/dia, sem passagem</small>
        </div>
        <div className="chips">
          <span className="chip">
            Grupo de {trip.travelers}: <b>{brl(avgDay)}</b>/dia
          </span>
          <span className="chip">
            <b>{days}</b> dias
          </span>
        </div>
        <p className="muted" style={{ marginTop: 12 }}>
          Detalhes por dia e por categoria na aba Gastos.
        </p>
      </section>
      <section className="card fun">
        <div className="stamp" aria-hidden="true">
          <span className="stamp-top">{destination.country}</span>
          <span className="stamp-code">{destination.code}</span>
          <span className="stamp-date">
            {fmtParts(trip.departDate).day} {fmtParts(trip.departDate).month}
          </span>
        </div>
        <div>
          <h3>Você sabia?</h3>
          <p>{destination.tip}</p>
        </div>
      </section>
      <section className="card">
        <h3>Sua viagem</h3>
        <div className="form">
          <label style={{ gridColumn: "1 / -1" }}>
            Nome da viagem (opcional)
            <input id="trip-name" maxLength={80} placeholder={`${trip.origin} → ${trip.destination}`} value={trip.name ?? ""} onChange={(e) => set("name", e.target.value)} />
          </label>
          <label>
            Saindo de
            <select value={trip.origin} onChange={(e) => set("origin", e.target.value)}>
              {brazilOptions}
            </select>
          </label>
          <label>
            Destino
            <select value={trip.destination} onChange={(e) => set("destination", e.target.value)}>
              {brazilOptions}
              {showAbroad && abroadOptions}
            </select>
          </label>
          <label className="check-inline" style={{ gridColumn: "1 / -1" }}>
            <input type="checkbox" checked={showAbroad} disabled={abroadNow} onChange={(e) => setWantAbroad(e.target.checked)} />
            <span>
              Incluir destinos no exterior
              {abroadNow && <span className="muted"> (a viagem atual é para fora; escolha uma cidade do Brasil para poder desligar)</span>}
            </span>
          </label>
          <label>
            Ida
            <input type="date" value={trip.departDate} onChange={(e) => setDepart(e.target.value)} />
          </label>
          <label>
            Volta
            <input type="date" value={trip.returnDate} min={trip.departDate} onChange={(e) => setReturn(e.target.value)} />
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
    </>
  );
}
