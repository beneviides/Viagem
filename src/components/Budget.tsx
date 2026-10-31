import { useState } from "react";
import { Category, Expense, Trip } from "../types";
import { DayProjection, Totals, summarizeProjection } from "../lib/budget";
import { City } from "../lib/cities";
import { brl, fmtParts } from "../lib/dates";
import { uid } from "../store";

const LABELS: Record<Category, string> = {
  voo: "Passagens",
  hotel: "Hospedagem",
  comida: "Alimentação",
  transporte: "Transporte local",
  passeios: "Passeios",
  outros: "Outros",
};
const ORDER = Object.keys(LABELS) as Category[];
// Cada categoria mantém sempre a mesma cor (slots categóricos, na ordem).
const COLOR: Record<Category, string> = { voo: "var(--s1)", hotel: "var(--s2)", comida: "var(--s3)", transporte: "var(--s4)", passeios: "var(--s5)", outros: "var(--s6)" };

interface Props {
  trip: Trip;
  destination: City;
  projection: DayProjection[];
  /** Projeção final: o maior entre previsto e real, por categoria. */
  summary: Totals;
  expected: Totals;
  real: Totals;
  expenses: Expense[];
  onChange: (e: Expense[]) => void;
}

export default function Budget({ trip, destination, projection, summary, expected, real, expenses, onChange }: Props) {
  const [category, setCategory] = useState<Category>("voo");
  const [kind, setKind] = useState<"real" | "planned">("real");
  const [date, setDate] = useState("");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");

  const { perPersonDay, avgDay } = summarizeProjection(destination, projection, trip.travelers);
  const diff = trip.budgetTotal - summary.total;
  const pct = trip.budgetTotal > 0 ? Math.min(100, (summary.total / trip.budgetTotal) * 100) : 0;
  const maxDay = Math.max(1, ...projection.map((d) => Math.max(d.total, d.real)));
  const realPct = summary.total > 0 ? Math.min(100, (real.total / summary.total) * 100) : 0;
  const parts = ORDER.filter((c) => summary[c] > 0);

  const add = () => {
    const a = parseFloat(amount);
    if (!label.trim() || !(a > 0)) return;
    onChange([...expenses, { id: uid(), category, label: label.trim(), amount: a, ...(kind === "real" ? { spent: true, date: date || undefined } : {}) }]);
    setLabel("");
    setAmount("");
  };

  return (
    <>
      <section className="card">
        <div className="stat-label">Previsão total</div>
        <div className="stat">{brl(summary.total)}</div>
        <div className={`meter${diff < 0 ? " over" : ""}`} role="img" aria-label={`${Math.round(pct)}% do orçamento`}>
          <div style={{ width: `${pct}%` }} />
        </div>
        {real.total > 0 && (
          <>
            <div className="meter real" role="img" aria-label={`${Math.round(realPct)}% da previsão já gasta`}>
              <div style={{ width: `${realPct}%` }} />
            </div>
            <p className="muted">
              Já gasto: <b className="num">{brl(real.total)}</b> ({Math.round(realPct)}% da previsão) · falta gastar cerca de{" "}
              <b className="num">{brl(Math.max(0, summary.total - real.total))}</b>
            </p>
          </>
        )}
        <p className={diff < 0 ? "over-text" : "muted"}>
          {diff >= 0 ? `Sobram ${brl(diff)} do orçamento de ${brl(trip.budgetTotal)}` : `Estoura o orçamento em ${brl(-diff)}`}
          {" · "}
          {brl(summary.total / trip.travelers)} por pessoa
        </p>
        <p className={`mood ${diff < 0 ? "bad" : pct >= 85 ? "warn" : ""}`}>
          {diff < 0
            ? "Passou do orçamento. Que tal rever o hotel ou os passeios?"
            : pct >= 85
              ? "Cabe, mas no limite. Sobrou pouco para imprevistos."
              : pct >= 50
                ? "Dentro do orçamento, com folga para um passeio extra."
                : "Muita folga no orçamento. Dá para sonhar mais alto."}
        </p>
        <div className="seg" role="img" aria-label="Gastos por categoria">
          {parts.map((c) => (
            <span key={c} title={`${LABELS[c]}: ${brl(summary[c])}`} style={{ flexGrow: summary[c], background: COLOR[c] }} />
          ))}
        </div>
        <table className="breakdown">
          <thead>
            <tr>
              <th scope="col">Categoria</th>
              <th scope="col" className="pct">
                Real
              </th>
              <th scope="col">Previsão</th>
            </tr>
          </thead>
          <tbody>
            {ORDER.map((c) => (
              <tr key={c}>
                <td>
                  <span className="name">
                    <span className="sw" style={{ background: COLOR[c] }} />
                    {LABELS[c]}
                  </span>
                </td>
                <td className="pct">{real[c] > 0 ? brl(real[c]) : "—"}</td>
                <td>{brl(summary[c])}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted" style={{ marginTop: 10 }}>
          A previsão de cada categoria é o maior valor entre o estimado e o que você já gastou. A hospedagem usa o hotel escolhido (ou a média do destino).
        </p>
      </section>

      <section className="card">
        <div className="stat-label">Projeção diária em {destination.name}</div>
        <div className="stat">
          {brl(perPersonDay)}
          <small>por pessoa/dia</small>
        </div>
        <div className="chips">
          <span className="chip">
            Alimentação <b>{brl(destination.daily.comida)}</b>
          </span>
          <span className="chip">
            Transporte <b>{brl(destination.daily.transporte)}</b>
          </span>
          <span className="chip">
            Passeios <b>{brl(destination.daily.passeios)}</b>
          </span>
        </div>
        <p style={{ marginTop: 12 }}>
          Grupo de {trip.travelers}: <b className="num">{brl(avgDay)}</b> por dia em média.
        </p>
        <ul className="days">
          {projection.map((d, i) => {
            const p = fmtParts(d.date);
            return (
              <li key={d.date}>
                <span className="d">
                  Dia {i + 1} · {p.day}/{p.month}
                </span>
                <span className="bar">
                  <i style={{ width: `${(d.total / maxDay) * 100}%` }} />
                  {d.real > 0 && <i className="real" style={{ width: `${(d.real / maxDay) * 100}%` }} />}
                </span>
                <span className="amt">
                  <b>{brl(d.total)}</b>
                  {d.real > 0 && <small>real {brl(d.real)}</small>}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="muted" style={{ marginTop: 10 }}>
          Barra azul: previsto. Barra laranja: gasto real do dia. Dias com atividades no Roteiro usam o custo planejado; os demais, a estimativa do destino.
        </p>
      </section>

      <section className="card">
        <h3>Lançar gasto</h3>
        <div className="seg-toggle" role="radiogroup" aria-label="Tipo de lançamento">
          <button type="button" role="radio" aria-checked={kind === "real"} className={kind === "real" ? "on" : ""} onClick={() => setKind("real")}>
            Gasto real
          </button>
          <button type="button" role="radio" aria-checked={kind === "planned"} className={kind === "planned" ? "on" : ""} onClick={() => setKind("planned")}>
            Planejado
          </button>
        </div>
        <div className="form">
          <label>
            Categoria
            <select id="exp-cat" value={category} onChange={(e) => setCategory(e.target.value as Category)}>
              {ORDER.map((c) => (
                <option key={c} value={c}>
                  {LABELS[c]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Descrição
            <input id="exp-label" value={label} onChange={(e) => setLabel(e.target.value)} />
          </label>
          {kind === "real" && (
            <label>
              Dia
              <select id="exp-date" value={date} onChange={(e) => setDate(e.target.value)}>
                <option value="">Sem data</option>
                {projection.map((d, i) => (
                  <option key={d.date} value={d.date}>
                    Dia {i + 1} · {fmtParts(d.date).day}/{fmtParts(d.date).month}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            Valor (R$)
            <input id="exp-amount" type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </label>
        </div>
        <button style={{ marginTop: 12, width: "100%" }} onClick={add}>
          Adicionar
        </button>
        {expenses.length > 0 && (
          <div style={{ marginTop: 8 }}>
            {expenses.map((e) => (
              <div className="row" key={e.id}>
                <span>
                  {e.label}{" "}
                  <span className="muted">
                    · {LABELS[e.category]} · {e.spent ? `real${e.date ? ` ${fmtParts(e.date).day}/${fmtParts(e.date).month}` : ""}` : "planejado"}
                  </span>
                </span>
                <span>
                  <b>{brl(e.amount)}</b>
                  <button className="ghost" aria-label={`Remover ${e.label}`} onClick={() => onChange(expenses.filter((x) => x.id !== e.id))}>
                    ✕
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
