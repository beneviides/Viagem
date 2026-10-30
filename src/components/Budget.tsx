import { useState } from "react";
import { Category, Expense, Trip } from "../types";
import { DayProjection, Forecast } from "../lib/budget";
import { City } from "../lib/cities";
import { brl, fmtDate } from "../lib/dates";
import { uid } from "../store";

const LABELS: Record<Category, string> = {
  voo: "Passagens",
  hotel: "Hospedagem",
  comida: "Alimentação",
  transporte: "Transporte local",
  passeios: "Passeios",
  outros: "Outros",
};

interface Props {
  trip: Trip;
  destination: City;
  projection: DayProjection[];
  summary: Forecast & { total: number };
  expenses: Expense[];
  onChange: (e: Expense[]) => void;
}

export default function Budget({ trip, destination, projection, summary, expenses, onChange }: Props) {
  const [category, setCategory] = useState<Category>("voo");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");

  const rooms = Math.ceil(trip.travelers / 2);
  const hotelPerNight = projection[0] && projection[0].hotel > 0 ? projection[0].hotel / rooms : destination.hotelAvg;
  const roomShare = (hotelPerNight * rooms) / trip.travelers; // diária dividida entre os viajantes
  const { comida, transporte, passeios } = destination.daily;
  const perPersonDay = comida + transporte + passeios + roomShare;
  const avgDay = projection.length ? projection.reduce((s, d) => s + d.total, 0) / projection.length : 0;
  const diff = trip.budgetTotal - summary.total;
  const pct = trip.budgetTotal > 0 ? Math.min(100, (summary.total / trip.budgetTotal) * 100) : 0;

  const add = () => {
    const a = parseFloat(amount);
    if (!label.trim() || !(a > 0)) return;
    onChange([...expenses, { id: uid(), category, label: label.trim(), amount: a }]);
    setLabel("");
    setAmount("");
  };

  return (
    <section>
      <div className="card">
        <h2>Previsão: {brl(summary.total)}</h2>
        <div className="bar">
          <div className={diff < 0 ? "fill over" : "fill"} style={{ width: `${pct}%` }} />
        </div>
        <p className={diff < 0 ? "over-text" : "muted"}>
          {diff >= 0 ? `Sobram ${brl(diff)} do orçamento de ${brl(trip.budgetTotal)}` : `Estoura o orçamento em ${brl(-diff)}`}
          {" · "}
          {brl(summary.total / trip.travelers)} por pessoa
        </p>
        <table>
          <tbody>
            {(Object.keys(LABELS) as Category[]).map((c) => (
              <tr key={c}>
                <td>{LABELS[c]}</td>
                <td className="right">{brl(summary[c])}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted">
          A hospedagem usa o hotel escolhido (ou a média do destino). Lance o valor das passagens abaixo, na categoria Passagens.
        </p>
      </div>
      <div className="card">
        <h3>Projeção diária em {destination.name}</h3>
        <p>
          <strong>{brl(perPersonDay)}</strong> por pessoa/dia <span className="muted">(sem passagem; com hospedagem dividida por quarto)</span>
        </p>
        <p className="muted">
          Alimentação {brl(destination.daily.comida)} · Transporte {brl(destination.daily.transporte)} · Passeios{" "}
          {brl(destination.daily.passeios)} · Hotel {brl(roomShare)}
        </p>
        <p>
          Grupo de {trip.travelers}: <strong>{brl(avgDay)}</strong> por dia em média ao longo de {projection.length} dias.
        </p>
        <table>
          <tbody>
            {projection.map((d, i) => (
              <tr key={d.date}>
                <td>
                  Dia {i + 1} · {fmtDate(d.date)}
                </td>
                <td className="right">{brl(d.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted">Dias com atividades no Roteiro usam o custo planejado; os demais, a estimativa do destino.</p>
      </div>
      <div className="card">
        <h3>Lançar gasto extra</h3>
        <div className="form">
          <select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
            {(Object.keys(LABELS) as Category[]).map((c) => (
              <option key={c} value={c}>
                {LABELS[c]}
              </option>
            ))}
          </select>
          <input placeholder="Descrição" value={label} onChange={(e) => setLabel(e.target.value)} />
          <input placeholder="Valor (R$)" type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} />
          <button onClick={add}>Adicionar</button>
        </div>
        <ul className="list">
          {expenses.map((e) => (
            <li key={e.id}>
              <div>
                {e.label} <span className="muted">({LABELS[e.category]})</span>
              </div>
              <div className="right">
                {brl(e.amount)}
                <button className="ghost" onClick={() => onChange(expenses.filter((x) => x.id !== e.id))}>
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
