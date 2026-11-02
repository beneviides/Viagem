import { useMemo, useState } from "react";
import { Category, Expense, Trip } from "../types";
import { brl, brlCents, todayISO } from "../lib/dates";
import { afterClosing, cardPurchases, dayLabel, firstInstallmentMonth, monthIndexOfDate, monthLabel, monthlyBills, purchaseStatus, ruleOf } from "../lib/cartao";
import { flagsOf, withFlags } from "../lib/expenseFlags";
import { parseNumberInput } from "../lib/numbers";
import ExpenseOptions, { ExpenseFlags } from "./ExpenseOptions";
import { uid } from "../store";

const CATEGORIES: [Category, string][] = [
  ["voo", "✈️ Passagens"],
  ["hotel", "🏨 Hospedagem"],
  ["comida", "🍽️ Alimentação"],
  ["transporte", "🚕 Transporte local"],
  ["passeios", "🎟️ Passeios"],
  ["outros", "🏷️ Outros"],
];
const ICON: Record<Category, string> = { voo: "✈️", hotel: "🏨", comida: "🍽️", transporte: "🚕", passeios: "🎟️", outros: "🏷️" };
const COUNTS = Array.from({ length: 24 }, (_, i) => i + 1); // 1 = à vista

interface Props {
  trip: Trip;
  expenses: Expense[];
  onChange: (e: Expense[]) => void;
  onTripChange: (t: Trip) => void;
}

export default function Cartao({ trip, expenses, onChange, onTripChange }: Props) {
  const rule = ruleOf(trip);
  const sameMonth = rule.sameMonth;
  const closingDay = rule.closingDay;
  const [closingText, setClosingText] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  // Formulário de nova compra
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<Category>("outros");
  const [purchasedOn, setPurchasedOn] = useState(todayISO());
  const [n, setN] = useState(1);
  const [inBudget, setInBudget] = useState(true);

  const today = new Date();
  const now = monthIndexOfDate(today);
  const purchases = useMemo(() => cardPurchases(expenses, { sameMonth, closingDay }, new Date()), [expenses, sameMonth, closingDay]);
  const bills = useMemo(() => monthlyBills(purchases), [purchases]);
  const maxBill = Math.max(1, ...bills.map((b) => b.total));
  const totalOnCard = purchases.reduce((s, p) => s + p.expense.amount, 0);
  const toPay = Math.round(purchases.reduce((s, p) => s + p.toPay, 0) * 100) / 100;
  const thisMonth = bills.find((b) => b.month === now)?.total ?? 0;
  const lastMonth = purchases.reduce<number | undefined>((m, p) => (p.lastMonth === undefined ? m : Math.max(m ?? p.lastMonth, p.lastMonth)), undefined);
  const withoutDate = purchases.filter((p) => p.status === "sem-data").length;
  const value = parseNumberInput(amount);

  const add = () => {
    if (!label.trim() || value === undefined || !(value > 0)) return;
    onChange([
      ...expenses,
      {
        id: uid(),
        category,
        label: label.trim(),
        amount: value,
        spent: true,
        card: true,
        ...(n >= 2 ? { installments: n } : {}),
        ...(purchasedOn ? { purchasedOn } : {}),
        ...(inBudget ? {} : { inBudget: false }),
      },
    ]);
    setLabel("");
    setAmount("");
    setN(1);
    setInBudget(true);
    setPurchasedOn(todayISO());
  };

  return (
    <div className="budget-page" style={{ width: "100%", maxWidth: "100%" }}>
      {/* Resumo */}
      <section className="card">
        <div className="stat-label">Compras no cartão</div>
        <div className="stat" style={{ fontSize: 32 }}>
          {brl(totalOnCard)}
        </div>
        <p className="muted" style={{ marginTop: 2 }}>
          {purchases.length} {purchases.length === 1 ? "compra" : "compras"} · {closingDay ? `fatura fecha dia ${closingDay}` : "sem dia de fechamento"} · vence {sameMonth ? "no mesmo mês" : "no mês seguinte"}
        </p>
        {purchases.length > 0 && (
          <div className="card-summary">
            <span className="chip">
              Neste mês ({monthLabel(now)}) <b>{brlCents(thisMonth)}</b>
            </span>
            <span className="chip">
              Ainda a vencer <b>{brlCents(toPay)}</b>
            </span>
            {lastMonth !== undefined && (
              <span className="chip">
                Última parcela <b>{monthLabel(lastMonth)}</b>
              </span>
            )}
          </div>
        )}
        {withoutDate > 0 && (
          <p className="exp-tag out" style={{ display: "inline-block", marginTop: 10, whiteSpace: "normal" }} role="status">
            {withoutDate} {withoutDate === 1 ? "compra está" : "compras estão"} sem data. Toque em ⚙️ para informar quando comprou.
          </p>
        )}

        <div className="form" style={{ marginTop: 14 }}>
          <label>
            Dia em que a fatura fecha
            <input
              id="cartao-fechamento"
              inputMode="numeric"
              maxLength={2}
              placeholder="Ex.: 25 (deixe vazio se não sabe)"
              value={closingText ?? (closingDay ?? "")}
              onFocus={(e) => e.currentTarget.select()}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, "").slice(0, 2);
                setClosingText(raw);
                const n = Number(raw);
                if (raw === "") onTripChange({ ...trip, cardClosingDay: undefined });
                else if (n >= 1 && n <= 31) onTripChange({ ...trip, cardClosingDay: n });
              }}
              onBlur={() => setClosingText(null)}
            />
          </label>
        </div>
        <div className="seg-toggle" role="radiogroup" aria-label="Quando a fatura vence" style={{ marginTop: 10, marginBottom: 0 }}>
          <button type="button" role="radio" aria-checked={!sameMonth} className={!sameMonth ? "on" : ""} onClick={() => onTripChange({ ...trip, cardFirstSameMonth: undefined })}>
            Vence no mês seguinte
          </button>
          <button type="button" role="radio" aria-checked={sameMonth} className={sameMonth ? "on" : ""} onClick={() => onTripChange({ ...trip, cardFirstSameMonth: true })}>
            Vence no mesmo mês
          </button>
        </div>
        <p className="muted" style={{ marginTop: 6 }}>
          {closingDay
            ? `Compra até o dia ${closingDay} entra na fatura que fecha neste mês; depois do dia ${closingDay}, na seguinte. No dia do fechamento ainda entra nesta fatura, mas confira com o seu banco.`
            : "Sem o dia de fechamento, toda compra conta como feita antes do fechamento. Informe o dia para o app saber quando a compra passa para a fatura seguinte."}
        </p>
      </section>

      {/* Nova compra */}
      <section className="card">
        <h3>💳 Nova compra no cartão</h3>
        <div className="form" style={{ width: "100%" }}>
          <label>
            O que comprou
            <input id="cartao-label" placeholder="Ex: Passagem de ida, hotel..." value={label} onChange={(e) => setLabel(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
          </label>
          <label>
            Valor total (R$)
            <input id="cartao-valor" inputMode="decimal" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
          </label>
          <label>
            Quando comprou
            <input id="cartao-data" type="date" value={purchasedOn} max={todayISO()} onChange={(e) => setPurchasedOn(e.target.value)} />
          </label>
          <label>
            Parcelas
            <select id="cartao-parcelas" value={n} onChange={(e) => setN(Number(e.target.value))}>
              {COUNTS.map((c) => (
                <option key={c} value={c}>
                  {c === 1 ? "À vista" : `${c}x`}
                </option>
              ))}
            </select>
          </label>
          <label>
            Categoria
            <select id="cartao-cat" value={category} onChange={(e) => setCategory(e.target.value as Category)}>
              {CATEGORIES.map(([c, t]) => (
                <option key={c} value={c}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button type="button" role="switch" aria-checked={inBudget} className="opt-row" style={{ marginTop: 8 }} onClick={() => setInBudget(!inBudget)}>
          <span className="opt-text">
            <span className="opt-label">Entra no orçamento</span>
            <span className="opt-hint">{inBudget ? "Soma nos totais e na barra do orçamento." : "Fica só na fatura do cartão, fora do orçamento."}</span>
          </span>
          <span className={`opt-switch${inBudget ? " on" : ""}`} aria-hidden="true">
            <span />
          </span>
        </button>
        {value !== undefined && value > 0 && purchasedOn && (
          <p className="muted" style={{ marginTop: 8 }}>
            {n >= 2 ? `${n}x de ${brlCents(Math.floor((value / n) * 100) / 100)}` : "À vista"}
            {" · "}
            {n >= 2 ? "acaba na fatura de " : "cai na fatura de "}
            {monthLabel(firstInstallmentMonth(purchasedOn, { sameMonth, closingDay }) + (n >= 2 ? n - 1 : 0))}
          </p>
        )}
        <button style={{ marginTop: 12, width: "100%", minHeight: 40 }} onClick={add}>
          + Registrar compra
        </button>
      </section>

      {/* Fatura mês a mês */}
      {bills.length > 0 && (
        <section className="card">
          <h3>📅 Parcelas mês a mês</h3>
          <div className="bill-list">
            {bills.slice(0, 36).map((b) => (
              <div key={b.month} className={`bill-row${b.month === now ? " now" : ""}${b.month < now ? " past" : ""}`}>
                <span className="bill-month">
                  {b.month === now && <span className="bill-dot" role="img" aria-label="mês atual">●</span>}
                  {monthLabel(b.month)}
                </span>
                <span className="bill-bar">
                  <i style={{ width: `${(b.total / maxBill) * 100}%` }} />
                </span>
                <b className="num">{brlCents(b.total)}</b>
              </div>
            ))}
          </div>
          {(bills.some((b) => b.month === now) || bills.some((b) => b.month < now) || bills.length > 36) && (
            <p className="muted" style={{ marginTop: 8 }}>
              {bills.some((b) => b.month === now) && (
                <>
                  <span className="bill-dot" aria-hidden="true">●</span> mês atual.{" "}
                </>
              )}
              {bills.some((b) => b.month < now) && "Meses que já passaram aparecem mais claros. "}
              {bills.length > 36 && "Mostrando os primeiros 36 meses."}
            </p>
          )}
        </section>
      )}

      {/* Compras */}
      <section className="card">
        <h3>🧾 Suas compras</h3>
        {purchases.length === 0 ? (
          <p className="muted">Nenhuma compra no cartão ainda. Registre acima, ou marque “Paguei no cartão” em um gasto na aba Gastos.</p>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {purchases.map((p) => {
              const e = p.expense;
              const st = purchaseStatus(p);
              return (
                <div key={e.id} className="exp-item">
                  <div className="purchase">
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {ICON[e.category]} {e.label}
                      </div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {e.purchasedOn ? `Comprou em ${dayLabel(e.purchasedOn)}` : "Sem data da compra"}
                        {p.installments >= 2 && ` · ${p.installments}x de ${brlCents(p.each)}`}
                      </div>
                      {closingDay && e.purchasedOn && (
                        <div className="muted" style={{ fontSize: 12 }}>
                          {afterClosing(e.purchasedOn, closingDay)
                            ? `Depois do fechamento (dia ${closingDay}): entrou na fatura seguinte`
                            : `Até o fechamento (dia ${closingDay}): entrou na fatura deste mês`}
                        </div>
                      )}
                      <div className="exp-tags">
                        <span className={`exp-tag status-${st.tone}`}>{st.text}</span>
                        {e.inBudget === false && <span className="exp-tag out">Fora do orçamento</span>}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      <b className="num">{brlCents(e.amount)}</b>
                      <button className="ghost" aria-label={`Opções de ${e.label}`} aria-expanded={editing === e.id} title="Editar data, parcelas e orçamento" style={{ padding: "0 6px", minHeight: 28 }} onClick={() => setEditing(editing === e.id ? null : e.id)}>
                        ⚙️
                      </button>
                    </div>
                  </div>
                  {editing === e.id && (
                    <ExpenseOptions
                      idPrefix={`cartao-${e.id}`}
                      rule={{ sameMonth, closingDay }}
                      value={flagsOf(e)}
                      amount={e.amount}
                      onChange={(f: ExpenseFlags) => onChange(expenses.map((x) => (x.id === e.id ? withFlags(x, f) : x)))}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
