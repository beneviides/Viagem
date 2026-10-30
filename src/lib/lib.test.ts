import { describe, expect, it } from "vitest";
import { cityByCode } from "./cities";
import { mockProvider } from "./flights";
import { forecast, totals } from "./budget";
import { nightsBetween } from "./dates";

const gru = cityByCode("GRU")!;
const lis = cityByCode("LIS")!;

describe("flights", () => {
  it("retorna ofertas ordenadas da mais barata e cobre a janela flexível", async () => {
    const offers = await mockProvider.search(gru, lis, "2027-03-10", "2027-03-17", 3);
    expect(offers).toHaveLength(7);
    for (let i = 1; i < offers.length; i++) expect(offers[i].price).toBeGreaterThanOrEqual(offers[i - 1].price);
  });
  it("mantém a duração da viagem", async () => {
    const offers = await mockProvider.search(gru, lis, "2027-03-10", "2027-03-17", 2);
    for (const o of offers) expect(nightsBetween(o.date, o.returnDate)).toBe(7);
  });
  it("é determinístico", async () => {
    const a = await mockProvider.search(gru, lis, "2027-03-10", "2027-03-17", 2);
    const b = await mockProvider.search(gru, lis, "2027-03-10", "2027-03-17", 2);
    expect(a).toEqual(b);
  });
});

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
    const t = totals(forecast({ ...base, flightPerPerson: 3000 }), [{ id: "e", category: "outros", label: "Seguro", amount: 200 }]);
    expect(t.voo).toBe(6000);
    expect(t.outros).toBe(200);
  });
});
