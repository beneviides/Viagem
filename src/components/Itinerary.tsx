import { useState } from "react";
import { Activity, ItineraryDay, Trip } from "../types";
import { brl, eachDay, fmtParts } from "../lib/dates";
import { uid } from "../store";

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

  return (
    <>
      <p className="muted">Custos das atividades (por pessoa) substituem a estimativa de passeios do dia na aba Gastos.</p>
      {dates.map((date) => (
        <DayCard
          key={date}
          date={date}
          activities={byDate.get(date)?.activities ?? []}
          onAdd={(a) => update(date, (list) => [...list, a].sort((x, y) => (x.time ?? "99").localeCompare(y.time ?? "99")))}
          onRemove={(id) => update(date, (list) => list.filter((a) => a.id !== id))}
        />
      ))}
    </>
  );
}

function DayCard(props: { date: string; activities: Activity[]; onAdd: (a: Activity) => void; onRemove: (id: string) => void }) {
  const [time, setTime] = useState("");
  const [title, setTitle] = useState("");
  const [cost, setCost] = useState("");
  const total = props.activities.reduce((s, a) => s + a.cost, 0);
  const p = fmtParts(props.date);

  const add = () => {
    if (!title.trim()) return;
    props.onAdd({ id: uid(), time: time || undefined, title: title.trim(), cost: parseFloat(cost) || 0 });
    setTime("");
    setTitle("");
    setCost("");
  };

  return (
    <section className="card day">
      <div className="date">
        <div className="n">{p.day}</div>
        <div className="m">{p.month}</div>
        <div className="w">{p.weekday}</div>
      </div>
      <div>
        {props.activities.length === 0 ? (
          <p className="empty">Nada planejado ainda.</p>
        ) : (
          <ul className="timeline">
            {props.activities.map((a) => (
              <li key={a.id}>
                <span>
                  {a.time && <span className="t">{a.time}</span>}
                  {a.title}
                </span>
                <span>
                  {a.cost > 0 && <b className="num">{brl(a.cost)}</b>}
                  <button className="ghost" aria-label={`Remover ${a.title}`} onClick={() => props.onRemove(a.id)}>
                    ✕
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
        {total > 0 && <p className="muted" style={{ marginBottom: 10 }}>Total do dia: {brl(total)} por pessoa</p>}
        <div className="form inline">
          <input type="time" aria-label="Horário" value={time} onChange={(e) => setTime(e.target.value)} />
          <input placeholder="Atividade" aria-label="Atividade" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
          <input placeholder="R$" aria-label="Custo por pessoa" type="number" min={0} value={cost} onChange={(e) => setCost(e.target.value)} />
          <button onClick={add}>Adicionar</button>
        </div>
      </div>
    </section>
  );
}
