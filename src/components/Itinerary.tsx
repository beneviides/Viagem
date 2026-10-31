import { useState } from "react";
import { Activity, ItineraryDay, Trip } from "../types";
import { brl, eachDay, fmtParts } from "../lib/dates";
import { outsideRange } from "../lib/itinerary";
import { uid } from "../store";
import { getCityForDate, getTransferInfo, TRANSPORT_INFO } from "../lib/legs";

interface Props {
  trip: Trip;
  days: ItineraryDay[];
  onChange: (d: ItineraryDay[]) => void;
}

export default function Itinerary({ trip, days, onChange }: Props) {
  const dates = eachDay(trip.departDate, trip.returnDate);
  const byDate = new Map(days.map((d) => [d.date, d]));

  const update = (date: string, fn: (a: Activity[]) => Activity[]) => {
    const current = byDate.get(date)?.activities ?? [];
    onChange([...days.filter((d) => d.date !== date), { date, activities: fn(current) }]);
  };

  const orphans = outsideRange(days, trip.departDate, trip.returnDate);
  const orphanCount = orphans.reduce((s, d) => s + d.activities.length, 0);

  return (
    <>
      {orphans.length > 0 && (
        <section className="card notice" role="alert">
          <p>
            ⚠️ <b>{orphanCount} atividade(s)</b> em {orphans.length} dia(s) fora das datas da viagem atual. Elas não aparecem aqui nem entram na previsão de gastos.
          </p>
          <button
            className="secondary"
            style={{ marginTop: 10 }}
            onClick={() => onChange(days.filter((d) => !orphans.includes(d)))}
          >
            Descartar atividades fora do período
          </button>
        </section>
      )}

      <p className="muted" style={{ padding: "0 4px" }}>
        💡 Custos das atividades cadastradas (por pessoa) substituem automaticamente a estimativa padrão de passeios do dia na aba <b>Gastos</b>.
      </p>

      {dates.map((date, idx) => (
        <DayCard
          key={date}
          trip={trip}
          dayIndex={idx + 1}
          date={date}
          activities={byDate.get(date)?.activities ?? []}
          onAdd={(a) =>
            update(date, (list) =>
              [...list, a].sort((x, y) => (x.time ?? "99").localeCompare(y.time ?? "99"))
            )
          }
          onRemove={(id) => update(date, (list) => list.filter((a) => a.id !== id))}
        />
      ))}
    </>
  );
}

const CITY_QUICK_ACTIVITIES: Record<string, { label: string; cost: number }[]> = {
  AJU: [
    { label: "🦀 Almoço na Passarela do Caranguejo", cost: 65 },
    { label: "🏖️ Tarde na Praia de Aruana & Orla", cost: 0 },
    { label: "🏝️ Passeio de Barco Croa do Goré", cost: 85 },
    { label: "🏛️ Museu da Gente Sergipana", cost: 0 },
    { label: "🌅 Pôr do Sol na Orla de Atalaia", cost: 0 },
  ],
  SSA: [
    { label: "🏛️ Pelourinho & Casa de Jorge Amado", cost: 30 },
    { label: "🍤 Acarajé no Rio Vermelho", cost: 25 },
    { label: "🌅 Pôr do Sol no Farol da Barra", cost: 15 },
    { label: "⛪ Igreja de Nosso Senhor do Bonfim", cost: 0 },
    { label: "🥥 Elevador Lacerda & Mercado Modelo", cost: 10 },
  ],
};

const GENERAL_QUICK = [
  "☕ Café da manhã",
  "🍽️ Almoço típico",
  "🏛️ Museu & Cultura",
  "🏖️ Praia / Passeio",
  "🌅 Pôr do sol",
  "🍷 Jantar especial",
];

function DayCard(props: {
  trip: Trip;
  dayIndex: number;
  date: string;
  activities: Activity[];
  onAdd: (a: Activity) => void;
  onRemove: (id: string) => void;
}) {
  const [time, setTime] = useState("");
  const [title, setTitle] = useState("");
  const [cost, setCost] = useState("");
  const total = props.activities.reduce((s, a) => s + a.cost, 0);
  const p = fmtParts(props.date);

  const city = getCityForDate(props.trip, props.date);
  const transfer = getTransferInfo(props.trip, props.date);
  const localSuggestions = CITY_QUICK_ACTIVITIES[city.code] || [];

  const add = () => {
    if (!title.trim()) return;
    props.onAdd({
      id: uid(),
      time: time || undefined,
      title: title.trim(),
      cost: parseFloat(cost) || 0,
    });
    setTime("");
    setTitle("");
    setCost("");
  };

  const addSuggested = (label: string, defaultCost: number) => {
    props.onAdd({
      id: uid(),
      title: label,
      cost: defaultCost,
    });
  };

  return (
    <section className="card day">
      <div className="date">
        <div className="n">{p.day}</div>
        <div className="m">{p.month}</div>
        <div className="w">{p.weekday.slice(0, 3)}</div>
      </div>

      <div>
        {/* Banner de Deslocamento entre cidades (se for dia de transição) */}
        {transfer && (
          <div
            style={{
              padding: "6px 12px",
              borderRadius: 10,
              background: "linear-gradient(90deg, rgba(2, 132, 199, 0.15), rgba(249, 87, 56, 0.15))",
              border: "1px solid rgba(2, 132, 199, 0.3)",
              marginBottom: 10,
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              fontWeight: 700,
              color: "var(--brand)",
            }}
          >
            <span>{TRANSPORT_INFO[transfer.transport].icon}</span>
            <span>
              Dia de Viagem via {TRANSPORT_INFO[transfer.transport].label}: {transfer.originCity.name} → {transfer.destinationCity.name}
            </span>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
          <h3 style={{ margin: 0 }}>
            <span>Dia {props.dayIndex}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "none", marginLeft: 8 }}>
              📍 {city.name}
            </span>
          </h3>
          {total > 0 && (
            <span className="pill" title="Total planejado para este dia">
              {brl(total)} / pessoa
            </span>
          )}
        </div>

        {props.activities.length === 0 ? (
          <p className="empty">Nenhuma atividade agendada para este dia em {city.name}. Toque nas sugestões locais ou adicione abaixo.</p>
        ) : (
          <ul className="timeline">
            {props.activities.map((a) => (
              <li key={a.id}>
                <span>
                  {a.time && <span className="t">{a.time}</span>}
                  <b>{a.title}</b>
                </span>
                <span>
                  {a.cost > 0 && <b className="num" style={{ color: "var(--brand)" }}>{brl(a.cost)}</b>}
                  <button
                    className="ghost"
                    aria-label={`Remover ${a.title}`}
                    title="Remover atividade"
                    onClick={() => props.onRemove(a.id)}
                  >
                    ✕
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}

        {/* Sugestões Específicas da Cidade */}
        {localSuggestions.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--brand)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              ✨ Destaques em {city.name}:
            </span>
            <div className="quick" style={{ marginTop: 4 }}>
              {localSuggestions.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => addSuggested(s.label, s.cost)}
                  title={`Adicionar ${s.label} (${s.cost > 0 ? brl(s.cost) : "Gratuito"})`}
                >
                  {s.label} {s.cost > 0 && <small style={{ opacity: 0.8 }}>({brl(s.cost)})</small>}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="quick" aria-label="Atalhos gerais">
          {GENERAL_QUICK.map((q) => (
            <button key={q} type="button" onClick={() => setTitle(q)}>
              {q}
            </button>
          ))}
        </div>

        <div className="form inline">
          <input
            type="time"
            aria-label="Horário da atividade"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
          <input
            placeholder={`Atividade em ${city.name}...`}
            aria-label="Descrição da atividade"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <input
            placeholder="R$ / pess."
            aria-label="Custo por pessoa"
            type="number"
            min={0}
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <button onClick={add} title="Adicionar ao roteiro">
            + Adicionar
          </button>
        </div>
      </div>
    </section>
  );
}
