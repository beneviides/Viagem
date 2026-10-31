import { useState } from "react";
import { TransportType, Trip, TripLeg } from "../types";
import { ABROAD_GROUPS, City, ORIGIN_GROUPS, cityByCode } from "../lib/cities";
import { DayProjection, summarizeProjection } from "../lib/budget";
import { addDays, brl, daysBetween, nightsBetween } from "../lib/dates";
import { multiTripSummary } from "../lib/legs";
import { uid } from "../store";

interface Props {
  trip: Trip;
  destination: City;
  projection: DayProjection[];
  onChange: (t: Trip) => void;
}

const TRANSPORTS: { value: TransportType; label: string; icon: string }[] = [
  { value: "onibus", label: "Ônibus", icon: "🚌" },
  { value: "aviao", label: "Avião", icon: "✈️" },
  { value: "carro", label: "Carro / Transfer", icon: "🚗" },
  { value: "trem", label: "Trem", icon: "🚆" },
  { value: "barco", label: "Barco", icon: "🚢" },
];

export default function TripForm({ trip, destination, projection, onChange }: Props) {
  const [wantAbroad, setWantAbroad] = useState(false);
  const abroadNow = destination.country !== "Brasil";
  const showAbroad = wantAbroad || abroadNow;
  const { perPersonDay, avgDay } = summarizeProjection(destination, projection, trip.travelers);

  const totalNights = Math.max(1, nightsBetween(trip.departDate, trip.returnDate));
  const isMulti = !!(trip.legs && trip.legs.length > 1);

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

  // Iniciar modo multidestino com 2 paradas
  const enableMulti = () => {
    const half = Math.max(1, Math.floor(totalNights / 2));
    const rest = Math.max(1, totalNights - half);
    const initialLegs: TripLeg[] = [
      {
        id: uid(),
        destination: trip.destination,
        nights: half,
        transport: "onibus",
        transportCost: 0,
      },
      {
        id: uid(),
        destination: trip.destination === "SSA" ? "AJU" : "SSA",
        nights: rest,
        transport: "aviao",
        transportCost: 0,
      },
    ];
    onChange({ ...trip, legs: initialLegs });
  };

  // Exemplo de férias de 15 dias: 7 em Aracaju (ônibus) + 8 em Salvador (avião)
  const applyAracajuSalvadorPreset = () => {
    const depart = trip.departDate || new Date().toISOString().slice(0, 10);
    const ret = addDays(depart, 15);
    const legs: TripLeg[] = [
      {
        id: uid(),
        destination: "AJU",
        nights: 7,
        transport: "onibus",
        transportCost: 150,
      },
      {
        id: uid(),
        destination: "SSA",
        nights: 8,
        transport: "aviao",
        transportCost: 350,
      },
    ];
    onChange({
      ...trip,
      name: "Férias: Aracaju + Salvador",
      destination: "AJU",
      departDate: depart,
      returnDate: ret,
      legs,
    });
  };

  const disableMulti = () => {
    onChange({ ...trip, legs: undefined });
  };

  const updateLeg = (idx: number, patch: Partial<TripLeg>) => {
    if (!trip.legs) return;
    const nextLegs = [...trip.legs];
    nextLegs[idx] = { ...nextLegs[idx], ...patch };
    const mainDest = nextLegs[0]?.destination || trip.destination;
    onChange({ ...trip, destination: mainDest, legs: nextLegs });
  };

  const addLeg = () => {
    const legs = trip.legs ? [...trip.legs] : [];
    legs.push({
      id: uid(),
      destination: "REC",
      nights: 3,
      transport: "aviao",
      transportCost: 0,
    });
    onChange({ ...trip, legs });
  };

  const removeLeg = (idx: number) => {
    if (!trip.legs) return;
    const nextLegs = trip.legs.filter((_, i) => i !== idx);
    if (nextLegs.length <= 1) {
      onChange({ ...trip, destination: nextLegs[0]?.destination || trip.destination, legs: undefined });
    } else {
      onChange({ ...trip, destination: nextLegs[0].destination, legs: nextLegs });
    }
  };

  const legsSumNights = trip.legs ? trip.legs.reduce((s, l) => s + (l.nights || 0), 0) : totalNights;
  const nightsDiff = totalNights - legsSumNights;

  return (
    <>
      {/* Informações Gerais da Viagem */}
      <section className="card">
        <h3>Planejamento da Viagem</h3>
        <div className="form">
          <label style={{ gridColumn: "1 / -1" }}>
            Nome da Viagem
            <input
              id="trip-name"
              maxLength={80}
              placeholder={isMulti ? multiTripSummary(trip) : `${trip.origin} → ${trip.destination}`}
              value={trip.name ?? ""}
              onChange={(e) => set("name", e.target.value)}
            />
          </label>

          <label>
            Origem (Partida)
            <select value={trip.origin} onChange={(e) => set("origin", e.target.value)}>
              {brazilOptions}
            </select>
          </label>

          {!isMulti && (
            <label>
              Destino
              <select value={trip.destination} onChange={(e) => set("destination", e.target.value)}>
                {brazilOptions}
                {showAbroad && abroadOptions}
              </select>
            </label>
          )}

          <label>
            Data de Ida
            <input type="date" value={trip.departDate} onChange={(e) => setDepart(e.target.value)} />
          </label>

          <label>
            Data de Retorno
            <input
              type="date"
              value={trip.returnDate}
              min={trip.departDate}
              onChange={(e) => setReturn(e.target.value)}
            />
          </label>

          <label>
            Viajantes
            <div className="stepper-input">
              <button
                type="button"
                className="stepper-btn"
                disabled={trip.travelers <= 1}
                onClick={() => set("travelers", Math.max(1, trip.travelers - 1))}
                aria-label="Diminuir viajantes"
              >
                −
              </button>
              <span className="stepper-val">
                {trip.travelers} {trip.travelers === 1 ? "pessoa" : "pessoas"}
              </span>
              <button
                type="button"
                className="stepper-btn"
                onClick={() => set("travelers", trip.travelers + 1)}
                aria-label="Aumentar viajantes"
              >
                +
              </button>
            </div>
          </label>

          <label>
            Orçamento Total (R$)
            <input
              type="number"
              min={0}
              step={100}
              placeholder="Ex: 5000"
              value={trip.budgetTotal || ""}
              onChange={(e) => set("budgetTotal", Math.max(0, +e.target.value || 0))}
            />
          </label>

          <label className="check-inline" style={{ gridColumn: "1 / -1", marginTop: 4 }}>
            <input
              type="checkbox"
              checked={showAbroad}
              disabled={abroadNow}
              onChange={(e) => setWantAbroad(e.target.checked)}
            />
            <span>Exibir destinos internacionais na lista de cidades</span>
          </label>
        </div>
      </section>

      {/* Roteiro e Paradas (Multidestino) */}
      <section className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Cidades e Paradas das Férias</h3>
          {isMulti ? (
            <button
              type="button"
              className="ghost"
              style={{ fontSize: 12, color: "var(--muted)" }}
              onClick={disableMulti}
            >
              Destino único
            </button>
          ) : (
            <button
              type="button"
              className="secondary"
              style={{ minHeight: 34, padding: "0 12px", fontSize: 12 }}
              onClick={enableMulti}
            >
              + Dividir em mais de uma cidade
            </button>
          )}
        </div>

        {/* Sugestão de 1 clique rápida */}
        <div style={{ background: "var(--surface-subtle)", padding: "10px 14px", borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 13, color: "var(--ink)" }}>
            💡 <b>Exemplo rápido:</b> 15 dias divididos em 7 dias Aracaju (ônibus) + 8 dias Salvador (avião)
          </span>
          <button
            type="button"
            className="secondary"
            onClick={applyAracajuSalvadorPreset}
            style={{ fontSize: 12, minHeight: 32, padding: "0 10px", flexShrink: 0 }}
          >
            Carregar Exemplo
          </button>
        </div>

        {isMulti && trip.legs ? (
          <div>
            <div style={{ display: "grid", gap: 10 }}>
              {trip.legs.map((leg, idx) => {
                const legCity = cityByCode(leg.destination);
                return (
                  <div
                    key={leg.id}
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--line)",
                      borderRadius: 12,
                      padding: 12,
                      display: "grid",
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)" }}>
                        Parada {idx + 1}: <b>{legCity?.name || leg.destination}</b>
                      </span>
                      {trip.legs && trip.legs.length > 2 && (
                        <button
                          type="button"
                          className="ghost"
                          title="Remover esta parada"
                          onClick={() => removeLeg(idx)}
                          style={{ padding: "0 6px", minHeight: 28 }}
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <div className="form" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8 }}>
                      <label>
                        Cidade
                        <select
                          value={leg.destination}
                          onChange={(e) => updateLeg(idx, { destination: e.target.value })}
                        >
                          {brazilOptions}
                          {showAbroad && abroadOptions}
                        </select>
                      </label>

                      <label>
                        Noites
                        <input
                          type="number"
                          min={1}
                          max={totalNights}
                          value={leg.nights}
                          onChange={(e) => updateLeg(idx, { nights: Math.max(1, +e.target.value || 1) })}
                        />
                      </label>

                      <label>
                        Transporte
                        <select
                          value={leg.transport}
                          onChange={(e) => updateLeg(idx, { transport: e.target.value as TransportType })}
                        >
                          {TRANSPORTS.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.icon} {t.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label>
                        Passagem (R$)
                        <input
                          type="number"
                          min={0}
                          step={10}
                          placeholder="0,00"
                          value={leg.transportCost ?? 0}
                          onChange={(e) => updateLeg(idx, { transportCost: Math.max(0, +e.target.value || 0) })}
                        />
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>

            {nightsDiff !== 0 && (
              <p className="muted" style={{ marginTop: 10, fontSize: 12 }}>
                {nightsDiff > 0
                  ? `Faltam distribuir ${nightsDiff} noite(s) para completar ${totalNights} noites.`
                  : `A soma (${legsSumNights} noites) excede o período da viagem (${totalNights} noites).`}
              </p>
            )}

            <button
              type="button"
              className="secondary"
              style={{ marginTop: 12, width: "100%", minHeight: 38 }}
              onClick={addLeg}
            >
              + Adicionar Parada
            </button>
          </div>
        ) : (
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            Viagem direta para <b>{destination.name}</b> durante todo o período ({totalNights} noites).
          </p>
        )}
      </section>

      {/* Resumo da Estimativa Diária */}
      <section className="card">
        <div className="stat-label">Estimativa Média</div>
        <div className="stat">
          {brl(perPersonDay)}
          <small>por pessoa / dia (alimentação, transporte local e lazer)</small>
        </div>
        <p className="muted" style={{ marginTop: 6, fontSize: 13 }}>
          Custo médio previsto para o grupo de {trip.travelers} {trip.travelers === 1 ? "pessoa" : "pessoas"}: <b>{brl(avgDay)}</b>/dia. Os detalhes completos e controle de gastos estão na aba <b>Gastos</b>.
        </p>
      </section>
    </>
  );
}
