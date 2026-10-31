import { describe, expect, it } from "vitest";
import { CITIES, CITY_GROUPS, cityByCode } from "./cities";
import { dailyProjection, forecast, projected, realized, totals } from "./budget";
import { countdownLabel, daysBetween } from "./dates";
import { outsideRange, shiftItinerary } from "./itinerary";
import { climateFor, suggestItems, syncSuggestions } from "./packing";

const lis = cityByCode("LIS")!;

describe("budget", () => {
  const base = { destination: lis, departDate: "2027-03-10", returnDate: "2027-03-17", travelers: 2, hotels: [] };
  it("usa a média do hotel do destino sem escolha", () => {
    expect(forecast(base).hotel).toBe(lis.hotelAvg * 7 * 1);
  });
  it("usa o hotel escolhido e multiplica por quartos", () => {
    const f = forecast({ ...base, travelers: 3, hotels: [{ id: "h", name: "X", pricePerNight: 500 }], selectedHotelId: "h" });
    expect(f.hotel).toBe(500 * 7 * 2);
  });
  it("soma despesas manuais", () => {
    const t = totals(forecast(base), [
      { id: "a", category: "voo", label: "Passagens", amount: 6000 },
      { id: "e", category: "outros", label: "Seguro", amount: 200 },
    ]);
    expect(t.voo).toBe(6000);
    expect(t.outros).toBe(200);
  });
});

describe("dailyProjection", () => {
  const opts = { destination: lis, departDate: "2027-03-10", returnDate: "2027-03-12", travelers: 2, hotels: [], itinerary: [] };
  it("gera um dia a mais que as noites e não cobra hotel no último", () => {
    const p = dailyProjection(opts);
    expect(p.map((d) => d.date)).toEqual(["2027-03-10", "2027-03-11", "2027-03-12"]);
    expect(p[0].hotel).toBe(lis.hotelAvg);
    expect(p[2].hotel).toBe(0);
  });
  it("usa o custo planejado do dia no lugar da estimativa de passeios", () => {
    const p = dailyProjection({ ...opts, itinerary: [{ date: "2027-03-11", activities: [{ id: "a", title: "Tour", cost: 100 }] }] });
    expect(p[1].passeios).toBe(200);
    expect(p[0].passeios).toBe(lis.daily.passeios * 2);
  });
  it("a soma por dia bate com a previsão total da viagem", () => {
    const p = dailyProjection(opts);
    const f = forecast({ ...opts });
    expect(p.reduce((s, d) => s + d.total, 0)).toBe(f.hotel + f.comida + f.transporte + f.passeios);
  });
});

describe("countdownLabel", () => {
  const today = new Date(2027, 0, 10);
  it("conta os dias até o embarque", () => {
    expect(countdownLabel("2027-01-20", "2027-01-27", today)).toBe("Embarque em 10 dias");
    expect(countdownLabel("2027-01-11", "2027-01-18", today)).toBe("Embarque amanhã");
    expect(countdownLabel("2027-01-10", "2027-01-17", today)).toBe("Embarque hoje");
  });
  it("reconhece viagem em andamento e concluída", () => {
    expect(countdownLabel("2027-01-08", "2027-01-12", today)).toBe("Em viagem");
    expect(countdownLabel("2027-01-01", "2027-01-05", today)).toBe("Viagem concluída");
  });
});

describe("packing", () => {
  const gru = cityByCode("GRU")!;
  const rio = cityByCode("GIG")!;
  const nyc = cityByCode("JFK")!;
  const trip = { origin: "GRU", destination: "LIS", departDate: "2027-01-10", returnDate: "2027-01-17", travelers: 1, budgetTotal: 0 };
  const keys = (s: { key: string }[]) => s.map((x) => x.key);

  it("viagem internacional pede passaporte e adaptador; nacional pede documento", () => {
    expect(keys(suggestItems(trip, gru, lis))).toEqual(expect.arrayContaining(["passaporte", "adaptador", "seguro"]));
    const dom = keys(suggestItems({ ...trip, destination: "GIG" }, gru, rio));
    expect(dom).toContain("rg");
    expect(dom).not.toContain("passaporte");
  });
  it("clima depende da latitude e do mês", () => {
    expect(climateFor(lis, "2027-01-10")).toBe("mild"); // inverno ameno
    expect(climateFor(cityByCode("CDG")!, "2027-01-10")).toBe("cold");
    expect(climateFor(lis, "2027-07-10")).toBe("warm");
    expect(climateFor(rio, "2027-01-10")).toBe("warm");
    expect(climateFor(cityByCode("SCL")!, "2027-07-10")).toBe("mild"); // inverno no hemisfério sul
    expect(climateFor(cityByCode("SCL")!, "2027-01-10")).toBe("warm");
  });
  it("limita as peças de roupa a uma semana e conta as noites", () => {
    const long = suggestItems({ ...trip, returnDate: "2027-02-10" }, gru, lis);
    expect(long.find((s) => s.key === "camisetas")!.label).toBe("Camisetas (7)");
    const short = suggestItems({ ...trip, returnDate: "2027-01-12" }, gru, lis);
    expect(short.find((s) => s.key === "camisetas")!.label).toBe("Camisetas (3)");
  });
  it("só sugere travesseiro de pescoço em voo longo", () => {
    expect(keys(suggestItems(trip, gru, nyc))).toContain("descanso");
    expect(keys(suggestItems({ ...trip, destination: "GIG" }, gru, rio))).not.toContain("descanso");
  });
  it("sincronizar preserva itens marcados e do usuário, sem duplicar", () => {
    const first = syncSuggestions([], suggestItems(trip, gru, lis));
    const marked = first.map((i) => (i.key === "passaporte" ? { ...i, packed: true } : i)).concat({ id: "u1", label: "Violão", category: "Extras" as const, packed: false });
    const again = syncSuggestions(marked, suggestItems({ ...trip, returnDate: "2027-01-12" }, gru, lis));
    expect(again).toHaveLength(marked.length);
    expect(again.find((i) => i.key === "passaporte")!.packed).toBe(true);
    expect(again.find((i) => i.id === "u1")).toBeDefined();
    expect(again.find((i) => i.key === "camisetas")!.label).toBe("Camisetas (3)");
  });
});

describe("datas e roteiro", () => {
  it("daysBetween é exato e pode ser negativo", () => {
    expect(daysBetween("2027-03-10", "2027-03-17")).toBe(7);
    expect(daysBetween("2027-03-10", "2027-03-08")).toBe(-2);
  });
  it("desloca o roteiro junto com a viagem", () => {
    const d = [{ date: "2027-03-10", activities: [{ id: "a", title: "x", cost: 1 }] }];
    expect(shiftItinerary(d, 7)[0].date).toBe("2027-03-17");
    expect(shiftItinerary(d, 0)).toBe(d);
  });
  it("acha atividades fora das datas e ignora dias vazios", () => {
    const act = [{ id: "a", title: "x", cost: 1 }];
    const d = [
      { date: "2027-03-09", activities: act },
      { date: "2027-03-12", activities: act },
      { date: "2027-03-20", activities: [] },
      { date: "2027-03-30", activities: act },
    ];
    expect(outsideRange(d, "2027-03-10", "2027-03-17").map((x) => x.date)).toEqual(["2027-03-09", "2027-03-30"]);
  });
});

describe("previsto x real", () => {
  const base = forecast({ destination: lis, departDate: "2027-03-10", returnDate: "2027-03-12", travelers: 2, hotels: [] });
  const ex = (o: object) => ({ id: "x", category: "voo", label: "L", amount: 100, ...o }) as never;

  it("gasto real não soma ao previsto; planejado soma", () => {
    expect(totals(base, [ex({ spent: true })]).voo).toBe(0);
    expect(totals(base, [ex({ spent: false })]).voo).toBe(100);
    expect(totals(base, [ex({})]).voo).toBe(100); // dados antigos sem o campo
    expect(realized([ex({ spent: true }), ex({ spent: false })]).voo).toBe(100);
  });
  it("projeção usa o maior entre previsto e real por categoria", () => {
    const exp = totals(base, []);
    const p = projected(exp, realized([ex({ spent: true, category: "voo", amount: 7800 }), ex({ spent: true, category: "comida", amount: 50 })]));
    expect(p.voo).toBe(7800); // sem previsão: vale o real
    expect(p.comida).toBe(exp.comida); // gastou menos que o previsto: ainda falta gastar
    expect(p.total).toBe(exp.total + 7800); // previsto não tinha passagem; o resto não muda
  });
  it("soma o real por dia na projeção diária", () => {
    const p = dailyProjection({ destination: lis, departDate: "2027-03-10", returnDate: "2027-03-12", travelers: 2, hotels: [], itinerary: [], expenses: [ex({ spent: true, date: "2027-03-11", amount: 80 }), ex({ spent: true, date: "2027-03-11", amount: 20 })] });
    expect(p.map((d) => d.real)).toEqual([0, 100, 0]);
  });
});

describe("lista de cidades", () => {
  it("códigos únicos e dados coerentes", () => {
    const codes = CITIES.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const c of CITIES) {
      expect(c.code).toMatch(/^[A-Z]{3}$/);
      expect(Math.abs(c.lat)).toBeLessThanOrEqual(90);
      expect(Math.abs(c.lon)).toBeLessThanOrEqual(180);
      expect(c.daily.comida).toBeGreaterThan(0);
      expect(c.daily.transporte).toBeGreaterThan(0);
      expect(c.daily.passeios).toBeGreaterThan(0);
      expect(c.hotelAvg).toBeGreaterThan(0);
      expect(c.tip.length).toBeGreaterThan(20);
    }
  });
  it("há muitas opções de saída no Brasil e o Brasil vem primeiro", () => {
    expect(CITIES.filter((c) => c.country === "Brasil").length).toBeGreaterThanOrEqual(20);
    expect(CITY_GROUPS[0].country).toBe("Brasil");
    expect(CITY_GROUPS.flatMap((g) => g.cities)).toHaveLength(CITIES.length);
  });
  it("clima: altitude é sempre ameno e o sul do Brasil esfria no inverno", () => {
    expect(climateFor(cityByCode("BOG")!, "2027-01-10")).toBe("mild");
    expect(climateFor(cityByCode("POA")!, "2027-07-10")).toBe("mild");
    expect(climateFor(cityByCode("POA")!, "2027-01-10")).toBe("warm");
    expect(climateFor(cityByCode("FOR")!, "2027-07-10")).toBe("warm");
  });
});
