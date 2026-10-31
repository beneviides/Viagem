import { describe, expect, it } from "vitest";
import { cityByCode } from "./cities";
import { CUSTOM_CODE, DEFAULT_COSTS, applyCosts, codeFromName, defaultPlace, destinationCode, placeToCity, resolveDestination } from "./destination";
import { activeCurrency, currencyForCountry, fmtMoney, toBrl, toLocal } from "./currency";
import { climateFor, suggestItems } from "./packing";
import { defaultTrip, exportBackup, parseBackup, sanitizeTripData, tripTitle } from "./storage";
import { dailyProjection, forecast } from "./budget";
import { Place, Trip } from "../types";

const gru = cityByCode("GRU")!;
const lis = cityByCode("LIS")!;
const baseTrip: Trip = { origin: "GRU", destination: "LIS", departDate: "2027-07-10", returnDate: "2027-07-17", travelers: 2, budgetTotal: 10000 };
const noronha: Place = { ...defaultPlace(), name: "Fernando de Noronha", code: "FEN", beach: true, longHaul: false };

describe("destino digitado e valores ajustados", () => {
  it("resolve cidade da lista, destino digitado e código inexistente", () => {
    expect(resolveDestination(baseTrip)?.name).toBe("Lisboa");
    expect(resolveDestination({ destination: CUSTOM_CODE, place: noronha })?.name).toBe("Fernando de Noronha");
    expect(resolveDestination({ destination: CUSTOM_CODE })).toBeUndefined(); // sem os dados do lugar
    expect(resolveDestination({ destination: "ZZZ" })).toBeUndefined();
  });
  it("destino digitado começa com valores padrão e aceita ajuste parcial", () => {
    const c = resolveDestination({ destination: CUSTOM_CODE, place: noronha, costs: { hotelAvg: 900 } })!;
    expect(c.hotelAvg).toBe(900);
    expect(c.daily.comida).toBe(DEFAULT_COSTS.comida);
    expect(applyCosts(lis, undefined)).toBe(lis);
    expect(applyCosts(lis, { comida: 1 }).daily).toEqual({ ...lis.daily, comida: 1 });
  });
  it("a previsão usa os valores ajustados", () => {
    const orig = forecast({ destination: lis, departDate: "2027-07-10", returnDate: "2027-07-12", travelers: 1, hotels: [] });
    const adj = forecast({ destination: applyCosts(lis, { comida: 1000 }), departDate: "2027-07-10", returnDate: "2027-07-12", travelers: 1, hotels: [] });
    expect(adj.comida).toBe(1000 * 3);
    expect(adj.comida).toBeGreaterThan(orig.comida);
    const proj = dailyProjection({ destination: applyCosts(lis, { comida: 1000 }), departDate: "2027-07-10", returnDate: "2027-07-12", travelers: 1, hotels: [], itinerary: [] });
    expect(proj[0].comida).toBe(1000);
  });
  it("sigla a partir do nome, sem acento e com no máximo 3 letras", () => {
    expect(codeFromName("Fernando de Noronha")).toBe("FER");
    expect(codeFromName("Ílhabela")).toBe("ILH");
    expect(codeFromName("123")).toBe("OUT");
  });
  it("título e código usam a sigla do lugar digitado", () => {
    const t: Trip = { ...baseTrip, destination: CUSTOM_CODE, place: noronha };
    expect(destinationCode(t)).toBe("FEN");
    expect(tripTitle(t)).toBe("GRU → FEN");
  });
});

describe("clima, voo longo e praia em destino digitado", () => {
  it("clima informado vale o ano todo", () => {
    const c = placeToCity({ ...noronha, climate: "cold" });
    expect(climateFor(c, "2027-01-10")).toBe("cold");
    expect(climateFor(c, "2027-07-10")).toBe("cold");
  });
  it("praia e voo longo vêm do que a pessoa marcou", () => {
    const tr = { ...baseTrip, destination: CUSTOM_CODE };
    const keys = (p: Place) => suggestItems(tr, gru, placeToCity(p)).map((s) => s.key);
    expect(keys({ ...noronha, beach: true })).toContain("banho");
    expect(keys({ ...noronha, beach: false })).not.toContain("banho");
    expect(keys({ ...noronha, longHaul: true, country: "Japão" })).toContain("descanso");
    expect(keys({ ...noronha, longHaul: false })).not.toContain("descanso");
  });
  it("país diferente da saída pede passaporte", () => {
    const k = suggestItems({ ...baseTrip, destination: CUSTOM_CODE }, gru, placeToCity({ ...noronha, country: "Paraguai" })).map((s) => s.key);
    expect(k).toContain("passaporte");
  });
});

describe("moeda do destino", () => {
  it("sugere a moeda pelo país e não cria moeda para o Brasil", () => {
    expect(currencyForCountry("Portugal")).toBe("EUR");
    expect(currencyForCountry("Argentina")).toBe("ARS");
    expect(currencyForCountry("Brasil")).toBeUndefined();
    expect(activeCurrency({}, "Brasil")).toBeUndefined();
    expect(activeCurrency({}, "Portugal")).toEqual({ code: "EUR", rate: undefined });
  });
  it("a cotação é sempre a informada: sem ela, nada é convertido", () => {
    const sem = activeCurrency({}, "Portugal");
    expect(toLocal(100, sem)).toBeUndefined();
    expect(toBrl(10, sem)).toBeUndefined();
    const com = activeCurrency({ currency: { code: "EUR", rate: 6 } }, "Portugal");
    expect(toLocal(600, com)).toBe(100);
    expect(toBrl(10, com)).toBe(60);
    expect(activeCurrency({ currency: { code: "EUR", rate: -3 } }, "Portugal")?.rate).toBeUndefined();
    expect(activeCurrency({ currency: { code: "USD", rate: 5 } }, "Portugal")?.code).toBe("USD"); // a pessoa pode trocar
  });
  it("formata no padrão brasileiro e não quebra com moeda inexistente", () => {
    expect(fmtMoney(1234, "EUR")).toMatch(/€\s?1\.234/);
    expect(fmtMoney(5, "EUR")).toMatch(/5,00/);
    expect(() => fmtMoney(5, "ZZZZ")).not.toThrow();
  });
});

describe("validação dos dados novos", () => {
  it("destino digitado sem os dados do lugar volta ao padrão", () => {
    const t = sanitizeTripData({ trip: { destination: CUSTOM_CODE, departDate: "2027-07-10", returnDate: "2027-07-11" } });
    expect(t.trip.destination).not.toBe(CUSTOM_CODE);
    expect(t.trip.place).toBeUndefined();
  });
  it("limpa o lugar: nome, sigla, clima inválido e dica longa", () => {
    const t = sanitizeTripData({ trip: { destination: CUSTOM_CODE, place: { name: "  ", code: "x", climate: "tropical", tip: "d".repeat(900), longHaul: "sim" } } });
    expect(t.trip.destination).toBe(CUSTOM_CODE);
    expect(t.trip.place!.name).toBe("Meu destino");
    expect(t.trip.place!.code).toBe("MEU");
    expect(t.trip.place!.climate).toBe("warm");
    expect(t.trip.place!.longHaul).toBe(false);
    expect(t.trip.place!.tip!.length).toBe(300);
  });
  it("valores ajustados: só números válidos e não negativos", () => {
    const t = sanitizeTripData({ trip: { costs: { comida: 200, transporte: -5, passeios: "caro", hotelAvg: Infinity, extra: 1 } } });
    expect(t.trip.costs).toEqual({ comida: 200, transporte: 0 });
    expect(sanitizeTripData({ trip: { costs: {} } }).trip.costs).toBeUndefined();
    expect(sanitizeTripData({ trip: { costs: "nada" } }).trip.costs).toBeUndefined();
  });
  it("moeda e gasto em outra moeda", () => {
    const t = sanitizeTripData({
      trip: { currency: { code: "EUR", rate: 6.1 } },
      expenses: [
        { category: "comida", label: "Jantar", amount: 61, spent: true, original: { currency: "EUR", amount: 10 } },
        { category: "comida", label: "Ruim", amount: 5, original: { currency: "euro", amount: 1 } },
      ],
    });
    expect(t.trip.currency).toEqual({ code: "EUR", rate: 6.1 });
    expect(t.expenses[0].original).toEqual({ currency: "EUR", amount: 10 });
    expect(t.expenses[1].original).toBeUndefined();
    expect(sanitizeTripData({ trip: { currency: { code: "xx", rate: 5 } } }).trip.currency).toBeUndefined();
    expect(sanitizeTripData({ trip: { currency: { code: "EUR", rate: 0 } } }).trip.currency).toEqual({ code: "EUR" });
  });
  it("backup preserva destino digitado, valores e moeda", () => {
    const t = sanitizeTripData({ trip: { ...defaultTrip(), destination: CUSTOM_CODE, place: noronha, costs: { hotelAvg: 1200 }, currency: { code: "USD", rate: 5.5 } } }, true);
    const r = parseBackup(exportBackup({ trips: [t], activeId: t.id }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.trips[0].trip.place?.name).toBe("Fernando de Noronha");
    expect(r.trips[0].trip.costs).toEqual({ hotelAvg: 1200 });
    expect(r.trips[0].trip.currency).toEqual({ code: "USD", rate: 5.5 });
  });
});
