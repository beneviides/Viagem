import { Expense } from "../types";
import { installmentsOf } from "./budget";

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** Índice de mês: ano*12 + mês (0 a 11). Permite somar meses sem se preocupar com a virada do ano. */
export const monthIndex = (iso: string): number => Number(iso.slice(0, 4)) * 12 + (Number(iso.slice(5, 7)) - 1);
export const monthIndexOfDate = (d: Date): number => d.getFullYear() * 12 + d.getMonth();
export const monthLabel = (idx: number): string => `${MONTHS[((idx % 12) + 12) % 12]}/${Math.floor(idx / 12)}`;
export const dayLabel = (iso: string): string => `${iso.slice(8, 10)}/${MONTHS[Number(iso.slice(5, 7)) - 1]}/${iso.slice(0, 4)}`;

/** Valores de cada parcela em centavos: todas iguais (arredondadas para baixo) e a diferença vai na primeira. A soma é sempre o total. */
export function installmentAmounts(total: number, n: number): number[] {
  const cents = Math.round(total * 100);
  const each = Math.floor(cents / n);
  return Array.from({ length: n }, (_, i) => (i === 0 ? cents - each * (n - 1) : each) / 100);
}

export type PurchaseStatus = "sem-data" | "nao-comecou" | "em-andamento" | "quitada";

export interface CardPurchase {
  expense: Expense;
  /** 1 = à vista no cartão. */
  installments: number;
  /** Valor de cada parcela (a 1ª pode ter alguns centavos a mais). */
  each: number;
  /** Mês da 1ª e da última parcela; ausentes se a compra não tem data. */
  firstMonth?: number;
  lastMonth?: number;
  /** Quantas parcelas já foram cobradas até o mês atual e quantas faltam. */
  charged: number;
  remaining: number;
  /** Soma do que ainda vem nas próximas faturas (depois do mês atual). */
  toPay: number;
  status: PurchaseStatus;
  /** Parcela de cada mês: [índice do mês, valor]. */
  bills: [number, number][];
}

/** Mês da 1ª parcela: o mês seguinte à compra, ou o mesmo mês se a pessoa disser que o cartão cobra assim. */
export const firstInstallmentMonth = (purchasedOn: string, sameMonth: boolean): number => monthIndex(purchasedOn) + (sameMonth ? 0 : 1);

export function describePurchase(e: Expense, sameMonth: boolean, today: Date = new Date()): CardPurchase {
  const n = installmentsOf(e) ?? 1;
  const amounts = installmentAmounts(e.amount, n);
  const base = { expense: e, installments: n, each: amounts[n - 1] ?? amounts[0] };
  if (!e.purchasedOn) return { ...base, charged: 0, remaining: n, toPay: 0, status: "sem-data", bills: [] };
  const first = firstInstallmentMonth(e.purchasedOn, sameMonth);
  const bills = amounts.map((v, i): [number, number] => [first + i, v]);
  const now = monthIndexOfDate(today);
  const charged = bills.filter(([m]) => m <= now).length;
  const toPay = bills.filter(([m]) => m > now).reduce((s, [, v]) => s + v, 0);
  const status: PurchaseStatus = charged === 0 ? "nao-comecou" : charged >= n ? "quitada" : "em-andamento";
  return { ...base, firstMonth: first, lastMonth: first + n - 1, charged, remaining: n - charged, toPay: Math.round(toPay * 100) / 100, status, bills };
}

export interface MonthBill {
  month: number;
  total: number;
  /** Quantas compras têm parcela neste mês. */
  count: number;
}

/** Quanto cai em cada fatura, somando todas as compras (com ou sem desconto do orçamento: a fatura é uma só). */
export function monthlyBills(purchases: CardPurchase[]): MonthBill[] {
  const map = new Map<number, MonthBill>();
  for (const p of purchases) {
    for (const [month, value] of p.bills) {
      const cur = map.get(month) ?? { month, total: 0, count: 0 };
      cur.total = Math.round((cur.total + value) * 100) / 100;
      cur.count += 1;
      map.set(month, cur);
    }
  }
  return [...map.values()].sort((a, b) => a.month - b.month);
}

/** Compras no cartão da viagem, da mais recente para a mais antiga (sem data por último). */
export function cardPurchases(expenses: Expense[], sameMonth: boolean, today: Date = new Date()): CardPurchase[] {
  return expenses
    .filter((e) => e.card)
    .map((e) => describePurchase(e, sameMonth, today))
    .sort((a, b) => {
      if (!a.expense.purchasedOn) return 1;
      if (!b.expense.purchasedOn) return -1;
      return b.expense.purchasedOn.localeCompare(a.expense.purchasedOn);
    });
}
