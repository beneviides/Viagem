import { Expense } from "../types";
import { countsInBudget, installmentsOf } from "./budget";

/** As escolhas de um gasto sobre orçamento, cartão e parcelas. */
export interface ExpenseFlags {
  inBudget: boolean;
  card: boolean;
  /** 2 a 24; ausente = à vista */
  installments?: number;
  /** Dia da compra no cartão (yyyy-mm-dd). */
  purchasedOn?: string;
}

export const flagsOf = (e: Expense): ExpenseFlags => ({
  inBudget: countsInBudget(e),
  card: !!e.card,
  installments: installmentsOf(e),
  purchasedOn: e.card ? e.purchasedOn : undefined,
});

/** Só guarda o que foge do padrão (entra no orçamento, sem cartão, à vista). */
export const flagFields = (f: ExpenseFlags): Partial<Expense> => ({
  ...(f.inBudget ? {} : { inBudget: false }),
  ...(f.card ? { card: true } : {}),
  ...(f.card && f.installments ? { installments: f.installments } : {}),
  ...(f.card && f.purchasedOn ? { purchasedOn: f.purchasedOn } : {}),
});

/** Troca as escolhas de um gasto, sem deixar sobras das anteriores. */
export function withFlags(e: Expense, f: ExpenseFlags): Expense {
  const { inBudget: _a, card: _b, installments: _c, purchasedOn: _d, ...rest } = e;
  return { ...rest, ...flagFields(f) };
}
