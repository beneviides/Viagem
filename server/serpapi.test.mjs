import { describe, expect, it } from "vitest";
import { cheapestOffer, searchFlights } from "./serpapi.mjs";

const fixture = {
  best_flights: [{ price: 4100, flights: [{ airline: "TAP" }] }],
  other_flights: [{ price: 3500, flights: [{ airline: "Iberia" }, { airline: "Iberia" }] }, { flights: [] }],
};

describe("serpapi", () => {
  it("escolhe a oferta mais barata e conta escalas", () => {
    expect(cheapestOffer(fixture, "2027-03-10", "2027-03-17")).toEqual({
      date: "2027-03-10", returnDate: "2027-03-17", price: 3500, airline: "Iberia", stops: 1,
    });
  });
  it("retorna undefined sem resultados", () => {
    expect(cheapestOffer({}, "a", "b")).toBeUndefined();
  });
  it("busca a janela flexível mantendo a duração e ordena por preço", async () => {
    const calls = [];
    const fetchImpl = async (url) => {
      const p = new URL(url).searchParams;
      calls.push(p.get("outbound_date") + ">" + p.get("return_date"));
      return { ok: true, json: async () => ({ best_flights: [{ price: 1000 + Number(p.get("outbound_date").slice(-2)), flights: [{ airline: "X" }] }] }) };
    };
    const offers = await searchFlights({ apiKey: "k", origin: "GRU", destination: "LIS", departDate: "2027-03-10", returnDate: "2027-03-17", flex: 1, fetchImpl });
    expect(calls).toHaveLength(3);
    expect(calls).toContain("2027-03-09>2027-03-16");
    expect(offers.map((o) => o.date)).toEqual(["2027-03-09", "2027-03-10", "2027-03-11"]);
  });
  it("não vaza a chave no erro", async () => {
    const fetchImpl = async () => ({ ok: false, status: 401 });
    await expect(
      searchFlights({ apiKey: "SEGREDO", origin: "GRU", destination: "MAD", departDate: "2027-04-10", returnDate: "2027-04-17", flex: 0, fetchImpl })
    ).rejects.toThrow(/401/);
  });
});
