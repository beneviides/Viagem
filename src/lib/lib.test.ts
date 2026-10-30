import { describe, expect, it } from "vitest";
import { cityByCode } from "./cities";
import { dailyProjection, forecast, totals } from "./budget";

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
