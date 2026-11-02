import { describe, expect, it } from "vitest";
import { cityByCode } from "./cities";
import { cardSummary, countsInBudget, dailyProjection, forecast, installmentValue, installmentsOf, projected, realized, totals } from "./budget";
import { sanitizeTripData } from "./storage";
import { Expense } from "../types";

const lis = cityByCode("LIS")!;
const base = forecast({ destination: lis, departDate: "2027-03-10", returnDate: "2027-03-12", travelers: 2, hotels: [] });
const ex = (o: Partial<Expense>): Expense => ({ id: "x", category: "comida", label: "L", amount: 100, ...o });

describe("entra no orçamento?", () => {
  it("por padrão entra; só deixa de entrar quando desligado de propósito", () => {
    expect(countsInBudget(ex({}))).toBe(true);
    expect(countsInBudget(ex({ inBudget: true }))).toBe(true);
    expect(countsInBudget(ex({ inBudget: false }))).toBe(false);
  });
  it("gasto fora do orçamento não entra no previsto nem no realizado", () => {
    expect(totals(base, [ex({ amount: 500, category: "voo" })]).voo).toBe(500);
    expect(totals(base, [ex({ amount: 500, category: "voo", inBudget: false })]).voo).toBe(0);
    expect(realized([ex({ spent: true, amount: 80 })]).comida).toBe(80);
    expect(realized([ex({ spent: true, amount: 80, inBudget: false })]).comida).toBe(0);
  });
  it("o total da projeção também ignora o que ficou de fora", () => {
    const withIt = projected(totals(base, []), realized([ex({ spent: true, category: "voo", amount: 7800 })]));
    const without = projected(totals(base, []), realized([ex({ spent: true, category: "voo", amount: 7800, inBudget: false })]));
    expect(withIt.total - without.total).toBe(7800);
  });
  it("o gasto real do dia também ignora o que ficou de fora", () => {
    const p = dailyProjection({
      destination: lis, departDate: "2027-03-10", returnDate: "2027-03-12", travelers: 2, hotels: [], itinerary: [],
      expenses: [ex({ spent: true, date: "2027-03-11", amount: 80 }), ex({ spent: true, date: "2027-03-11", amount: 20, inBudget: false })],
    });
    expect(p[1].real).toBe(80);
  });
});

describe("cartão e parcelas", () => {
  it("só conta parcelas no cartão e com 2 ou mais", () => {
    expect(installmentsOf(ex({ card: true, installments: 3 }))).toBe(3);
    expect(installmentsOf(ex({ card: true, installments: 1 }))).toBeUndefined();
    expect(installmentsOf(ex({ card: true }))).toBeUndefined();
    expect(installmentsOf(ex({ card: false, installments: 6 }))).toBeUndefined(); // sem cartão não há parcela
  });
  it("valor da parcela em centavos, sem passar do total", () => {
    expect(installmentValue(ex({ amount: 1000, card: true, installments: 3 }))).toBe(333.33);
    expect(installmentValue(ex({ amount: 1200, card: true, installments: 12 }))).toBe(100);
    expect(installmentValue(ex({ amount: 1000 }))).toBeUndefined();
  });
  it("resumo do cartão", () => {
    const s = cardSummary([
      ex({ amount: 1200, card: true, installments: 12 }),
      ex({ amount: 600, card: true, installments: 3 }),
      ex({ amount: 150, card: true }),
      ex({ amount: 90 }),
      ex({ amount: 400, card: true, inBudget: false }),
      ex({ amount: 70, inBudget: false }),
    ]);
    expect(s.onCard).toBe(1200 + 600 + 150 + 400);
    expect(s.installed).toBe(1800);
    expect(s.installedCount).toBe(2);
    expect(s.perMonth).toBe(1200 / 12 + 600 / 3);
    expect(s.outsideBudget).toBe(400 + 70);
  });
});

describe("validação das opções do gasto", () => {
  const clean = (e: unknown) => sanitizeTripData({ expenses: [{ category: "comida", label: "L", amount: 10, ...(e as object) }] }).expenses[0];
  it("guarda só o que foge do padrão", () => {
    const e = clean({});
    expect(e.inBudget).toBeUndefined();
    expect(e.card).toBeUndefined();
    expect(e.installments).toBeUndefined();
    expect(clean({ inBudget: false }).inBudget).toBe(false);
    expect(clean({ inBudget: "não" }).inBudget).toBeUndefined();
  });
  it("parcelas: inteiro de 2 a 24 e só com cartão", () => {
    expect(clean({ card: true, installments: 6 })).toMatchObject({ card: true, installments: 6 });
    expect(clean({ card: false, installments: 6 }).installments).toBeUndefined();
    expect(clean({ installments: 6 }).installments).toBeUndefined();
    for (const bad of [1, 0, -3, 25, 2.5, "3", null, Infinity]) expect(clean({ card: true, installments: bad }).installments).toBeUndefined();
    expect(clean({ card: true, installments: 24 }).installments).toBe(24);
    expect(clean({ card: "sim" }).card).toBeUndefined();
  });
});
