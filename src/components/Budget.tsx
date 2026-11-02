import { useState } from "react";
import { Category, Expense, Trip } from "../types";
import { DayProjection, Totals, cardSummary, countsInBudget, installmentValue, installmentsOf, summarizeProjection } from "../lib/budget";
import ExpenseOptions, { ExpenseFlags } from "./ExpenseOptions";
import { City } from "../lib/cities";
import { brl, brlCents, fmtParts } from "../lib/dates";
import { uid } from "../store";

const LABELS: Record<Category, string> = {
  voo: "Passagens",
  hotel: "Hospedagem",
  comida: "Alimentação",
  transporte: "Transporte local",
  passeios: "Passeios",
  outros: "Outros",
};

const ICONS: Record<Category, string> = {
  voo: "✈️",
  hotel: "🏨",
  comida: "🍽️",
  transporte: "🚕",
  passeios: "🎟️",
  outros: "🏷️",
};

const ORDER = Object.keys(LABELS) as Category[];

const COLOR: Record<Category, string> = {
  voo: "var(--s1)",
  hotel: "var(--s2)",
  comida: "var(--s3)",
  transporte: "var(--s4)",
  passeios: "var(--s5)",
  outros: "var(--s6)",
};

interface Props {
  trip: Trip;
  destination: City;
  projection: DayProjection[];
  summary: Totals;
  expected: Totals;
  real: Totals;
  expenses: Expense[];
  onChange: (e: Expense[]) => void;
}

export default function Budget({
  trip,
  destination,
  projection,
  summary,
  expected: _expected,
  real,
  expenses,
  onChange,
}: Props) {
  const [category, setCategory] = useState<Category>("comida");
  const [kind, setKind] = useState<"real" | "planned">("real");
  const [date, setDate] = useState("");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [flags, setFlags] = useState<ExpenseFlags>({ inBudget: true, card: false });
  const [showOpts, setShowOpts] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const cards = cardSummary(expenses);
  const flagsOf = (e: Expense): ExpenseFlags => ({ inBudget: countsInBudget(e), card: !!e.card, installments: installmentsOf(e) });
  // Guarda só o que foge do padrão (entra no orçamento, à vista, sem cartão).
  const flagFields = (f: ExpenseFlags): Partial<Expense> => ({
    ...(f.inBudget ? {} : { inBudget: false }),
    ...(f.card ? { card: true } : {}),
    ...(f.card && f.installments ? { installments: f.installments } : {}),
  });
  const updateFlags = (id: string, f: ExpenseFlags) =>
    onChange(
      expenses.map((e) => {
        if (e.id !== id) return e;
        const { inBudget: _a, card: _b, installments: _c, ...rest } = e;
        return { ...rest, ...flagFields(f) };
      })
    );
  const optionsSummary = [flags.inBudget ? "Entra no orçamento" : "Fora do orçamento", flags.card ? (flags.installments ? `Cartão ${flags.installments}x` : "Cartão à vista") : "Sem cartão"].join(" · ");

  const { perPersonDay, avgDay } = summarizeProjection(destination, projection, trip.travelers);
  const diff = trip.budgetTotal - summary.total;
  const pct = trip.budgetTotal > 0 ? Math.min(100, (summary.total / trip.budgetTotal) * 100) : 0;
  const maxDay = Math.max(1, ...projection.map((d) => Math.max(d.total, d.real)));
  const realPct = summary.total > 0 ? Math.min(100, (real.total / summary.total) * 100) : 0;

  const add = () => {
    const a = parseFloat(amount);
    if (!label.trim() || !(a > 0)) return;
    onChange([
      ...expenses,
      {
        id: uid(),
        category,
        label: label.trim(),
        amount: a,
        ...(kind === "real" ? { spent: true, date: date || undefined } : {}),
        ...flagFields(flags),
      },
    ]);
    setLabel("");
    setAmount("");
    setFlags({ inBudget: true, card: false }); // cada gasto começa do padrão
    setShowOpts(false);
  };

  return (
    <div className="budget-page" style={{ width: "100%", maxWidth: "100%", overflowX: "hidden" }}>
      {/* 1. Resumo do Orçamento */}
      <section className="card">
        <div className="stat-label">Previsão Total da Viagem</div>
        <div className="stat" style={{ fontSize: 32 }}>
          {brl(summary.total)}
        </div>

        {/* Barra de Progresso do Orçamento */}
        <div
          className={`meter${diff < 0 ? " over" : ""}`}
          role="img"
          aria-label={`${Math.round(pct)}% do orçamento total`}
          style={{ width: "100%", margin: "10px 0" }}
        >
          <div style={{ width: `${pct}%` }} />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6, fontSize: 13, marginTop: 4 }}>
          <span>
            Orçamento: <b>{trip.budgetTotal > 0 ? brl(trip.budgetTotal) : "Não definido"}</b>
          </span>
          <span style={{ color: diff < 0 ? "var(--bad)" : "var(--ok)", fontWeight: 700 }}>
            {diff >= 0 ? `Restam ${brl(diff)}` : `Ultrapassou ${brl(-diff)}`}
          </span>
        </div>

        {real.total > 0 && (
          <p className="muted" style={{ marginTop: 8, fontSize: 13 }}>
            Já gasto: <b className="num" style={{ color: "var(--accent)" }}>{brl(real.total)}</b> ({Math.round(realPct)}% do previsto) · Falta gastar: <b className="num">{brl(Math.max(0, summary.total - real.total))}</b>
          </p>
        )}

        <div style={{ marginTop: 10, fontSize: 13, color: "var(--muted)" }}>
          Custo estimado por pessoa: <b>{brl(summary.total / trip.travelers)}</b> ({trip.travelers} {trip.travelers === 1 ? "viajante" : "viajantes"})
        </div>

        {/* Tabela de Categorias que cabe 100% na tela */}
        <table className="breakdown" style={{ width: "100%", tableLayout: "fixed", marginTop: 14 }}>
          <thead>
            <tr>
              <th scope="col" style={{ textAlign: "left", width: "45%" }}>Categoria</th>
              <th scope="col" style={{ textAlign: "right", width: "27%" }}>Gasto</th>
              <th scope="col" style={{ textAlign: "right", width: "28%" }}>Previsão</th>
            </tr>
          </thead>
          <tbody>
            {ORDER.map((c) => (
              <tr key={c}>
                <td style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  <span className="name" style={{ gap: 6 }}>
                    <span className="sw" style={{ background: COLOR[c] }} />
                    <span style={{ fontSize: 13 }}>{ICONS[c]} {LABELS[c]}</span>
                  </span>
                </td>
                <td style={{ textAlign: "right", fontSize: 13, color: "var(--muted)" }}>
                  {real[c] > 0 ? brl(real[c]) : "—"}
                </td>
                <td style={{ textAlign: "right", fontSize: 13 }}>
                  <b>{brl(summary[c])}</b>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* 2. Lançar Despesa */}
      <section className="card">
        <h3>💰 Lançar Despesa</h3>
        <div className="seg-toggle" role="radiogroup" aria-label="Tipo de lançamento" style={{ width: "100%" }}>
          <button
            type="button"
            role="radio"
            aria-checked={kind === "real"}
            className={kind === "real" ? "on" : ""}
            onClick={() => setKind("real")}
          >
            Já Pago / Realizado
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={kind === "planned"}
            className={kind === "planned" ? "on" : ""}
            onClick={() => setKind("planned")}
          >
            Apenas Estimativa
          </button>
        </div>

        <div className="form" style={{ width: "100%" }}>
          <label>
            Categoria
            <select id="exp-cat" value={category} onChange={(e) => setCategory(e.target.value as Category)}>
              {ORDER.map((c) => (
                <option key={c} value={c}>
                  {ICONS[c]} {LABELS[c]}
                </option>
              ))}
            </select>
          </label>

          <label>
            Descrição do Gasto
            <input
              id="exp-label"
              placeholder="Ex: Almoço, táxi, passagem..."
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
            />
          </label>

          {kind === "real" && (
            <label>
              Data (opcional)
              <select id="exp-date" value={date} onChange={(e) => setDate(e.target.value)}>
                <option value="">Sem data</option>
                {projection.map((d, i) => (
                  <option key={d.date} value={d.date}>
                    Dia {i + 1} ({fmtParts(d.date).day}/{fmtParts(d.date).month})
                  </option>
                ))}
              </select>
            </label>
          )}

          <label>
            Valor (R$)
            <input
              id="exp-amount"
              type="number"
              min={0}
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
            />
          </label>
        </div>

        <button
          type="button"
          className="opt-toggle"
          aria-expanded={showOpts}
          aria-controls="exp-options"
          onClick={() => setShowOpts((v) => !v)}
        >
          <span>⚙️ Opções do gasto</span>
          <span className="opt-summary">{optionsSummary}</span>
          <span aria-hidden="true">{showOpts ? "▴" : "▾"}</span>
        </button>
        {showOpts && (
          <div id="exp-options">
            <ExpenseOptions idPrefix="novo" value={flags} onChange={setFlags} amount={parseFloat(amount) > 0 ? parseFloat(amount) : undefined} />
          </div>
        )}

        <button style={{ marginTop: 12, width: "100%", minHeight: 40 }} onClick={add}>
          + Adicionar aos Gastos
        </button>

        {/* Cartão e fora do orçamento */}
        {(cards.onCard > 0 || cards.outsideBudget > 0) && (
          <div className="card-summary" aria-label="Resumo do cartão">
            {cards.onCard > 0 && (
              <span className="chip">
                💳 No cartão <b>{brl(cards.onCard)}</b>
              </span>
            )}
            {cards.installedCount > 0 && (
              <span className="chip">
                Parcelado <b>{brl(cards.installed)}</b> ({cards.installedCount} {cards.installedCount === 1 ? "compra" : "compras"})
              </span>
            )}
            {cards.installedCount > 0 && (
              <span className="chip">
                Parcelas por mês <b>{brlCents(cards.perMonth)}</b>
              </span>
            )}
            {cards.outsideBudget > 0 && (
              <span className="chip">
                Fora do orçamento <b>{brl(cards.outsideBudget)}</b>
              </span>
            )}
          </div>
        )}

        {/* Lista de Despesas Lançadas */}
        {expenses.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div className="stat-label" style={{ marginBottom: 8 }}>
              Despesas Registradas ({expenses.length})
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              {expenses.map((e) => (
                <div key={e.id} className="exp-item">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 10px",
                    borderRadius: 8,
                    background: "var(--surface-subtle)",
                    fontSize: 13,
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1, paddingRight: 8 }}>
                    <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {ICONS[e.category]} {e.label}
                    </div>
                    <div className="muted" style={{ fontSize: 11 }}>
                      {LABELS[e.category]} · {e.spent ? "Realizado" : "Previsto"}
                      {e.date && ` em ${fmtParts(e.date).day}/${fmtParts(e.date).month}`}
                    </div>
                    {(e.card || !countsInBudget(e)) && (
                      <div className="exp-tags">
                        {e.card && (
                          <span className="exp-tag">
                            💳 {installmentsOf(e) ? `${installmentsOf(e)}x de ${brlCents(installmentValue(e) ?? 0)}` : "Cartão à vista"}
                          </span>
                        )}
                        {!countsInBudget(e) && <span className="exp-tag out">Fora do orçamento</span>}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <b className="num" style={{ fontSize: 14, opacity: countsInBudget(e) ? 1 : 0.55 }}>{brl(e.amount)}</b>
                    <button
                      className="ghost"
                      aria-label={`Opções de ${e.label}`}
                      aria-expanded={editingId === e.id}
                      title="Opções do gasto"
                      onClick={() => setEditingId(editingId === e.id ? null : e.id)}
                      style={{ padding: "0 6px", minHeight: 28 }}
                    >
                      ⚙️
                    </button>
                    <button
                      className="ghost"
                      aria-label={`Remover ${e.label}`}
                      title="Excluir"
                      onClick={() => onChange(expenses.filter((x) => x.id !== e.id))}
                      style={{ padding: "0 6px", minHeight: 28 }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
                {editingId === e.id && (
                  <ExpenseOptions idPrefix={`exp-${e.id}`} value={flagsOf(e)} onChange={(f) => updateFlags(e.id, f)} amount={e.amount} />
                )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 3. Previsão Diária */}
      <section className="card">
        <div className="stat-label">Média Diária por Pessoa</div>
        <div className="stat" style={{ fontSize: 26 }}>
          {brl(perPersonDay)}
          <small>por pessoa / dia (alimentação + transporte local + lazer)</small>
        </div>

        <p className="muted" style={{ marginTop: 6, fontSize: 13 }}>
          Média do grupo ({trip.travelers} {trip.travelers === 1 ? "pessoa" : "pessoas"}): <b>{brl(avgDay)}</b>/dia
        </p>

        {/* Barras dos Dias que cabem 100% na largura da tela */}
        <div style={{ display: "grid", gap: 6, marginTop: 14 }}>
          {projection.map((d, i) => {
            const p = fmtParts(d.date);
            const cityName = d.city?.name || destination.name;
            return (
              <div
                key={d.date}
                style={{
                  display: "grid",
                  gridTemplateColumns: "74px minmax(0, 1fr) 74px",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 12,
                  padding: "4px 0",
                }}
              >
                <div style={{ fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  D{i + 1} · {p.day}/{p.month}
                </div>

                <div
                  style={{
                    position: "relative",
                    height: 8,
                    borderRadius: 999,
                    background: "var(--line-subtle)",
                    overflow: "hidden",
                    width: "100%",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      borderRadius: 999,
                      background: "var(--brand)",
                      width: `${(d.total / maxDay) * 100}%`,
                    }}
                  />
                  {d.real > 0 && (
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        height: "100%",
                        borderRadius: 999,
                        background: "var(--accent)",
                        width: `${(d.real / maxDay) * 100}%`,
                      }}
                    />
                  )}
                </div>

                <div style={{ textAlign: "right", fontWeight: 700 }} className="num">
                  {brl(d.total)}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
