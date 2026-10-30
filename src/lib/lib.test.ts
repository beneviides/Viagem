import { describe, expect, it } from "vitest";
import { cityByCode } from "./cities";
import { forecast, totals } from "./budget";

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
