import { describe, expect, it } from "vitest";
import { flagFields, flagsOf, withFlags } from "./expenseFlags";
import { Expense } from "../types";

const e: Expense = { id: "1", category: "voo", label: "Ida", amount: 600, spent: true };

describe("opções do gasto", () => {
  it("o padrão não grava nada", () => {
    expect(flagFields({ inBudget: true, card: false })).toEqual({});
  });
  it("cartão com parcelas e data", () => {
    expect(flagFields({ inBudget: true, card: true, installments: 3, purchasedOn: "2027-03-20" })).toEqual({ card: true, installments: 3, purchasedOn: "2027-03-20" });
  });
  it("sem cartão, parcelas e data da compra somem", () => {
    expect(flagFields({ inBudget: false, card: false, installments: 3, purchasedOn: "2027-03-20" })).toEqual({ inBudget: false });
  });
  it("trocar as opções não deixa sobra das antigas", () => {
    const comCartao = withFlags(e, { inBudget: true, card: true, installments: 6, purchasedOn: "2027-03-20" });
    expect(comCartao).toMatchObject({ card: true, installments: 6, purchasedOn: "2027-03-20" });
    const semCartao = withFlags(comCartao, { inBudget: true, card: false });
    expect(semCartao).toEqual(e);
    expect(flagsOf(comCartao)).toEqual({ inBudget: true, card: true, installments: 6, purchasedOn: "2027-03-20" });
  });
});
