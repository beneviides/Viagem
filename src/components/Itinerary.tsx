import { useState } from "react";
import { Activity, ItineraryDay, Trip } from "../types";
import { brl, eachDay, fmtDate } from "../lib/dates";
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
    const next = { date, activities: fn(current) };
    onChange([...days.filter((d) => d.date !== date), next]);
  };

  return (
    <section>
      <p className="muted">Custos das atividades (por pessoa) substituem a estimativa genérica de passeios na aba Gastos.</p>
      {dates.map((date, i) => (
        <DayCard
          key={date}
          title={`Dia ${i + 1} · ${fmtDate(date)}`}
          activities={byDate.get(date)?.activities ?? []}
          onAdd={(a) => update(date, (list) => [...list, a].sort((x, y) => (x.time ?? "99").localeCompare(y.time ?? "99")))}
          onRemove={(id) => update(date, (list) => list.filter((a) => a.id !== id))}
        />
      ))}
    </section>
  );
}

function DayCard(props: {
  title: string;
  activities: Activity[];
  onAdd: (a: Activity) => void;
  onRemove: (id: string) => void;
}) {
  const [time, setTime] = useState("");
  const [title, setTitle] = useState("");
  const [cost, setCost] = useState("");
  const total = props.activities.reduce((s, a) => s + a.cost, 0);

  const add = () => {
    if (!title.trim()) return;
    props.onAdd({ id: uid(), time: time || undefined, title: title.trim(), cost: parseFloat(cost) || 0 });
    setTime("");
    setTitle("");
    setCost("");
  };

  return (
    <div className="card">
      <h3>
        {props.title} <span className="muted">{total > 0 && `· ${brl(total)}/pessoa`}</span>
      </h3>
      <ul className="list">
        {props.activities.map((a) => (
          <li key={a.id}>
            <div>
              {a.time && <strong>{a.time} </strong>}
              {a.title}
            </div>
            <div className="right">
              {a.cost > 0 && brl(a.cost)}
              <button className="ghost" onClick={() => props.onRemove(a.id)}>
                ✕
              </button>
            </div>
          </li>
        ))}
      </ul>
      <div className="form inline">
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        <input placeholder="Atividade" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
        <input placeholder="R$" type="number" min={0} value={cost} onChange={(e) => setCost(e.target.value)} />
        <button onClick={add}>+</button>
      </div>
    </div>
  );
}
