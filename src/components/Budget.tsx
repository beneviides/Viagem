import { useState } from "react";
import { Category, Expense, Trip } from "../types";
import { Forecast } from "../lib/budget";
import { brl } from "../lib/dates";
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
  summary: Forecast & { total: number };
  expenses: Expense[];
  onChange: (e: Expense[]) => void;
}

export default function Budget({ trip, summary, expenses, onChange }: Props) {
  const [category, setCategory] = useState<Category>("voo");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");

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
