import { describe, expect, it } from "vitest";
import { afterClosing, cardPurchases, dayLabel, describePurchase, firstInstallmentMonth, installmentAmounts, monthIndex, monthLabel, monthlyBills, purchaseStatus } from "./cartao";
import { cardSummary, installmentValue } from "./budget";
import { sanitizeTripData } from "./storage";
import { Expense } from "../types";

const ex = (o: Partial<Expense>): Expense => ({ id: "x", category: "voo", label: "Passagem", amount: 600, spent: true, card: true, ...o });
const hoje = (iso: string) => new Date(iso + "T12:00:00");

describe("meses", () => {
  it("índice e rótulo, inclusive na virada do ano", () => {
    expect(monthLabel(monthIndex("2027-03-20"))).toBe("mar/2027");
    expect(monthLabel(monthIndex("2027-12-31") + 1)).toBe("jan/2028");
    expect(dayLabel("2027-03-05")).toBe("05/mar/2027");
  });
  it("a 1ª parcela cai no mês seguinte, ou no mesmo mês se o cartão cobra assim", () => {
    expect(monthLabel(firstInstallmentMonth("2027-03-20", false))).toBe("abr/2027");
    expect(monthLabel(firstInstallmentMonth("2027-03-20", true))).toBe("mar/2027");
    expect(monthLabel(firstInstallmentMonth("2027-12-20", false))).toBe("jan/2028");
  });
});

describe("valores das parcelas", () => {
  it("a soma das parcelas é sempre o total, com a diferença na primeira", () => {
    expect(installmentAmounts(538.88, 3)).toEqual([179.64, 179.62, 179.62]);
    expect(installmentAmounts(1200, 12)).toEqual(Array(12).fill(100));
    for (const [t, n] of [[999.99, 7], [10, 3], [0.1, 3], [12345.67, 24]] as const) {
      const sum = installmentAmounts(t, n).reduce((a, b) => a + b, 0);
      expect(Math.round(sum * 100)).toBe(Math.round(t * 100));
    }
  });
  it("o valor mostrado na compra e o 'por mês' do resumo são o mesmo", () => {
    const e = ex({ amount: 538.88, installments: 3 });
    expect(installmentValue(e)).toBe(179.62);
    expect(cardSummary([e]).perMonth).toBeCloseTo(179.62, 10);
  });
});

describe("quando acaba", () => {
  const compra = ex({ amount: 600, installments: 3, purchasedOn: "2027-03-20" });
  it("mostra a 1ª e a última parcela", () => {
    const p = describePurchase(compra, false, hoje("2027-03-25"));
    expect(monthLabel(p.firstMonth!)).toBe("abr/2027");
    expect(monthLabel(p.lastMonth!)).toBe("jun/2027");
    expect(p.status).toBe("nao-comecou");
    expect(p.charged).toBe(0);
    expect(p.remaining).toBe(3);
    expect(p.toPay).toBe(600);
  });
  it("muda sozinho conforme o tempo passa", () => {
    expect(describePurchase(compra, false, hoje("2027-05-10"))).toMatchObject({ status: "em-andamento", charged: 2, remaining: 1, toPay: 200 });
    expect(describePurchase(compra, false, hoje("2027-06-30"))).toMatchObject({ status: "quitada", charged: 3, remaining: 0, toPay: 0 });
    expect(describePurchase(compra, false, hoje("2030-01-01")).status).toBe("quitada");
  });
  it("parcelas que cruzam o ano", () => {
    const p = describePurchase(ex({ installments: 6, purchasedOn: "2027-11-10" }), false, hoje("2027-11-11"));
    expect(monthLabel(p.firstMonth!)).toBe("dez/2027");
    expect(monthLabel(p.lastMonth!)).toBe("mai/2028");
  });
  it("à vista no cartão cai numa fatura só", () => {
    const p = describePurchase(ex({ purchasedOn: "2027-03-20" }), false, hoje("2027-03-25"));
    expect(p.installments).toBe(1);
    expect(p.bills).toEqual([[monthIndex("2027-04-01"), 600]]);
  });
  it("sem data da compra não dá para calcular e avisa", () => {
    const p = describePurchase(ex({ installments: 3 }), false);
    expect(p.status).toBe("sem-data");
    expect(p.lastMonth).toBeUndefined();
    expect(p.bills).toEqual([]);
  });
  it("sem cartão não é parcela, mesmo com número de parcelas", () => {
    expect(describePurchase(ex({ card: false, installments: 4, purchasedOn: "2027-03-20" }), false).installments).toBe(1);
  });
});

describe("faturas mês a mês e lista", () => {
  const compras = [
    ex({ id: "a", amount: 600, installments: 3, purchasedOn: "2027-03-20" }), // abr, mai, jun
    ex({ id: "b", amount: 300, installments: 2, purchasedOn: "2027-04-02", inBudget: false }), // mai, jun
    ex({ id: "c", amount: 90, purchasedOn: "2027-06-15" }), // jul à vista
    ex({ id: "d", card: false, amount: 5000 }), // dinheiro: fora
  ];
  const lista = cardPurchases(compras, false, hoje("2027-05-01"));
  it("só entram compras no cartão, da mais recente para a mais antiga", () => {
    expect(lista.map((p) => p.expense.id)).toEqual(["c", "b", "a"]);
  });
  it("soma as parcelas de cada mês e fecha com o total das compras", () => {
    const f = monthlyBills(lista);
    expect(f.map((m) => [monthLabel(m.month), m.total, m.count])).toEqual([
      ["abr/2027", 200, 1],
      ["mai/2027", 350, 2],
      ["jun/2027", 350, 2],
      ["jul/2027", 90, 1],
    ]);
    expect(f.reduce((s, m) => s + m.total, 0)).toBe(600 + 300 + 90);
  });
  it("compra sem data vai para o fim da lista", () => {
    const l = cardPurchases([...compras, ex({ id: "e", amount: 10 })], false);
    expect(l[l.length - 1].expense.id).toBe("e");
  });
});

describe("validação", () => {
  const clean = (e: unknown) => sanitizeTripData({ expenses: [{ category: "comida", label: "L", amount: 10, ...(e as object) }] }).expenses[0];
  it("a data da compra só vale no cartão e se for uma data real", () => {
    expect(clean({ card: true, purchasedOn: "2027-03-20" }).purchasedOn).toBe("2027-03-20");
    expect(clean({ card: false, purchasedOn: "2027-03-20" }).purchasedOn).toBeUndefined();
    expect(clean({ card: true, purchasedOn: "ontem" }).purchasedOn).toBeUndefined();
    expect(clean({ card: true, purchasedOn: "2027-13-45" }).purchasedOn).toBeUndefined();
  });
  it("a regra da 1ª parcela só é guardada quando foge do padrão", () => {
    expect(sanitizeTripData({ trip: { cardFirstSameMonth: true } }).trip.cardFirstSameMonth).toBe(true);
    expect(sanitizeTripData({ trip: { cardFirstSameMonth: false } }).trip.cardFirstSameMonth).toBeUndefined();
    expect(sanitizeTripData({ trip: { cardFirstSameMonth: "sim" } }).trip.cardFirstSameMonth).toBeUndefined();
  });
});

describe("dia de fechamento da fatura", () => {
  const mes = (iso: string, rule: Parameters<typeof firstInstallmentMonth>[1]) => monthLabel(firstInstallmentMonth(iso, rule));
  it("sem o dia de fechamento tudo continua como antes", () => {
    expect(mes("2027-03-26", { sameMonth: false })).toBe("abr/2027");
    expect(mes("2027-03-26", { sameMonth: true })).toBe("mar/2027");
  });
  it("fecha dia 25, vence no mês seguinte: até o dia 25 vai para abril, depois vai para maio", () => {
    const r = { sameMonth: false, closingDay: 25 };
    expect(mes("2027-03-20", r)).toBe("abr/2027");
    expect(mes("2027-03-25", r)).toBe("abr/2027"); // no dia do fechamento ainda entra nesta fatura
    expect(mes("2027-03-26", r)).toBe("mai/2027");
    expect(mes("2027-03-31", r)).toBe("mai/2027");
  });
  it("fecha dia 3, vence no mesmo mês: dia 1 vence em março, dia 5 vence em abril", () => {
    const r = { sameMonth: true, closingDay: 3 };
    expect(mes("2027-03-01", r)).toBe("mar/2027");
    expect(mes("2027-03-03", r)).toBe("mar/2027");
    expect(mes("2027-03-05", r)).toBe("abr/2027");
  });
  it("vira o ano", () => {
    expect(mes("2027-12-28", { sameMonth: false, closingDay: 25 })).toBe("fev/2028");
    expect(mes("2027-12-20", { sameMonth: false, closingDay: 25 })).toBe("jan/2028");
  });
  it("fechamento no dia 31 vale o último dia de meses mais curtos", () => {
    const r = { sameMonth: true, closingDay: 31 };
    expect(mes("2027-02-28", r)).toBe("fev/2027"); // fevereiro tem 28 dias: dia 28 ainda é "até o fechamento"
    expect(mes("2027-04-30", r)).toBe("abr/2027");
  });
  it("as parcelas e o fim da compra acompanham a regra", () => {
    const e = ex({ amount: 600, installments: 3, purchasedOn: "2027-03-26" });
    const p = describePurchase(e, { sameMonth: false, closingDay: 25 }, hoje("2027-03-30"));
    expect(monthLabel(p.firstMonth!)).toBe("mai/2027");
    expect(monthLabel(p.lastMonth!)).toBe("jul/2027");
    expect(cardPurchases([e], { sameMonth: false, closingDay: 25 }, hoje("2027-03-30"))[0].lastMonth).toBe(p.lastMonth);
  });
  it("só guarda dia de fechamento válido (inteiro de 1 a 31)", () => {
    const d = (v: unknown) => sanitizeTripData({ trip: { cardClosingDay: v } }).trip.cardClosingDay;
    expect(d(25)).toBe(25);
    expect(d(1)).toBe(1);
    expect(d(31)).toBe(31);
    for (const bad of [0, 32, -1, 2.5, "10", null, NaN]) expect(d(bad)).toBeUndefined();
  });
});

describe("depois do fechamento?", () => {
  it("só é 'depois' quando passa do dia, respeitando meses curtos", () => {
    expect(afterClosing("2027-03-25", 25)).toBe(false);
    expect(afterClosing("2027-03-26", 25)).toBe(true);
    expect(afterClosing("2027-04-30", 31)).toBe(false); // abril só tem 30 dias
    expect(afterClosing("2027-03-31", 31)).toBe(false);
    expect(afterClosing("2027-03-29", 28)).toBe(true);
    expect(afterClosing("2027-03-29", undefined)).toBe(false); // sem dia de fechamento
  });
});

describe("frase de andamento sem repetir informação", () => {
  const compra = ex({ amount: 600, installments: 3, purchasedOn: "2027-03-20" });
  const status = (hojeIso: string, e = compra) => purchaseStatus(describePurchase(e, false, hoje(hojeIso)));
  it("cada situação diz o que importa, uma vez só", () => {
    expect(status("2027-03-25")).toEqual({ text: "Começa em abr/2027 · acaba em jun/2027", tone: "info" });
    expect(status("2027-05-10")).toEqual({ text: "Faltam 1 de 3 · acaba em jun/2027", tone: "info" });
    expect(status("2027-07-01")).toEqual({ text: "✓ Quitada em jun/2027", tone: "ok" });
  });
  it("nenhum mês aparece duas vezes na mesma frase", () => {
    for (const d of ["2027-03-25", "2027-05-10", "2027-07-01"]) {
      const meses = status(d).text.match(/[a-z]{3}\/\d{4}/g) ?? [];
      expect(new Set(meses).size).toBe(meses.length);
    }
  });
  it("à vista e sem data", () => {
    const avista = ex({ amount: 90, purchasedOn: "2027-05-02" });
    expect(status("2027-05-10", avista)).toEqual({ text: "Vence na fatura de jun/2027", tone: "info" });
    expect(status("2027-07-10", avista)).toEqual({ text: "Cobrada na fatura de jun/2027", tone: "ok" });
    expect(purchaseStatus(describePurchase(ex({ installments: 3 }), false)).tone).toBe("warn");
  });
});
