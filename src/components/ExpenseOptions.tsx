import { brlCents, todayISO } from "../lib/dates";
import { CardRule, dayLabel, firstInstallmentMonth, monthLabel } from "../lib/cartao";
import { ExpenseFlags } from "../lib/expenseFlags";

export type { ExpenseFlags };

interface Props {
  value: ExpenseFlags;
  onChange: (next: ExpenseFlags) => void;
  /** Valor do gasto, para mostrar quanto fica cada parcela. */
  amount?: number;
  /** Como o cartão cobra (dia de fechamento e vencimento); padrão: fatura vence no mês seguinte. */
  rule?: CardRule;
  /** Prefixo único dos ids (o formulário e as linhas da lista usam este componente ao mesmo tempo). */
  idPrefix: string;
}

const COUNTS = Array.from({ length: 23 }, (_, i) => i + 2); // 2..24

function Switch({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} className="opt-row" onClick={() => onChange(!checked)}>
      <span className="opt-text">
        <span className="opt-label">{label}</span>
        {hint && <span className="opt-hint">{hint}</span>}
      </span>
      <span className={`opt-switch${checked ? " on" : ""}`} aria-hidden="true">
        <span />
      </span>
    </button>
  );
}

/** As escolhas de um gasto: entra no orçamento, foi no cartão, parcelado e em quantas vezes. */
export default function ExpenseOptions({ value, onChange, amount, rule = { sameMonth: false }, idPrefix }: Props) {
  const n = value.installments;
  const each = amount && n ? Math.floor((amount / n) * 100) / 100 : undefined;
  return (
    <div className="opt-panel">
      <Switch
        checked={value.inBudget}
        onChange={(v) => onChange({ ...value, inBudget: v })}
        label="Entra no orçamento"
        hint={value.inBudget ? "Soma nos totais e na barra do orçamento." : "Fica registrado, mas não soma nos totais."}
      />
      <Switch
        checked={value.card}
        onChange={(v) => onChange({ ...value, card: v, installments: v ? value.installments : undefined, purchasedOn: v ? (value.purchasedOn ?? todayISO()) : undefined })}
        label="Paguei no cartão de crédito"
      />
      {value.card && (
        <Switch
          checked={n !== undefined}
          onChange={(v) => onChange({ ...value, installments: v ? 2 : undefined })}
          label="Parcelei"
          hint={n ? undefined : "À vista no cartão."}
        />
      )}
      {value.card && (
        <div className="opt-count">
          <label htmlFor={`${idPrefix}-compra`}>Quando comprou?</label>
          <input
            id={`${idPrefix}-compra`}
            type="date"
            value={value.purchasedOn ?? ""}
            max={todayISO()}
            onChange={(e) => onChange({ ...value, purchasedOn: e.target.value || undefined })}
          />
          {value.purchasedOn && (
            <span className="opt-hint">
              {n
                ? `Parcelas de ${monthLabel(firstInstallmentMonth(value.purchasedOn, rule))} a ${monthLabel(firstInstallmentMonth(value.purchasedOn, rule) + n - 1)}: a última cai em ${monthLabel(firstInstallmentMonth(value.purchasedOn, rule) + n - 1)}.`
                : `Comprado em ${dayLabel(value.purchasedOn)}; cai na fatura de ${monthLabel(firstInstallmentMonth(value.purchasedOn, rule))}.`}
            </span>
          )}
        </div>
      )}
      {value.card && n !== undefined && (
        <div className="opt-count">
          <label htmlFor={`${idPrefix}-parcelas`}>Quantas vezes?</label>
          <select id={`${idPrefix}-parcelas`} value={n} onChange={(e) => onChange({ ...value, installments: Number(e.target.value) })}>
            {COUNTS.map((c) => (
              <option key={c} value={c}>
                {c}x
              </option>
            ))}
          </select>
          {each !== undefined && amount !== undefined && (
            <span className="opt-hint">
              {n}x de <b>{brlCents(each)}</b> (total {brlCents(amount)})
            </span>
          )}
        </div>
      )}
    </div>
  );
}
