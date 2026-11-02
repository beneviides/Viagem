import { describe, expect, it } from "vitest";
import { clampNumber, parseNumberInput } from "./numbers";

describe("parseNumberInput", () => {
  it("campo vazio ou só espaços não vira número (a pessoa está digitando)", () => {
    expect(parseNumberInput("")).toBeUndefined();
    expect(parseNumberInput("   ")).toBeUndefined();
  });
  it("aceita inteiro, vírgula e ponto como decimal", () => {
    expect(parseNumberInput("8")).toBe(8);
    expect(parseNumberInput("89,90")).toBe(89.9);
    expect(parseNumberInput("89.90")).toBe(89.9);
    expect(parseNumberInput("0150")).toBe(150);
  });
  it("lixo e negativos são ignorados", () => {
    for (const bad of ["abc", "-3", "1e", "--", ",", "1,2,3", "Infinity"]) expect(parseNumberInput(bad)).toBeUndefined();
  });
});

describe("clampNumber", () => {
  it("respeita mínimo e máximo", () => {
    expect(clampNumber(0, 1)).toBe(1);
    expect(clampNumber(20, 1, 15)).toBe(15);
    expect(clampNumber(7, 1, 15)).toBe(7);
    expect(clampNumber(500, 0)).toBe(500);
  });
});
