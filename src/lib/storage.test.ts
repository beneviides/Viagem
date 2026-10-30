import { describe, expect, it } from "vitest";
import { addTrips, defaultTrip, emptyTripData, exportBackup, loadWorkspace, migrateLegacy, parseBackup, sanitizeTripData } from "./storage";

const store = (o: Record<string, unknown>) => (k: string) => (k in o ? JSON.stringify(o[k]) : null);

describe("migração do formato antigo", () => {
  it("vira a primeira viagem, sem perder nada", () => {
    const get = store({
      "viagem.trip": { origin: "GRU", destination: "CDG", departDate: "2027-03-10", returnDate: "2027-03-17", travelers: 3, budgetTotal: 9000 },
      "viagem.hotels": [{ id: "h1", name: "Hotel X", pricePerNight: 500 }],
      "viagem.hotel": "h1",
      "viagem.expenses": [{ id: "e1", category: "voo", label: "Passagem", amount: 100 }],
      "viagem.notes": "oi",
    });
    const t = migrateLegacy(get)!;
    expect(t.trip.destination).toBe("CDG");
    expect(t.hotels).toHaveLength(1);
    expect(t.selectedHotelId).toBe("h1");
    expect(t.expenses[0].amount).toBe(100);
    expect(t.notes).toBe("oi");
    expect(loadWorkspace(get).trips).toHaveLength(1);
  });
  it("sem nada salvo, cria uma viagem vazia", () => {
    const ws = loadWorkspace(() => null);
    expect(ws.trips).toHaveLength(1);
    expect(ws.activeId).toBe(ws.trips[0].id);
  });
  it("armazenamento corrompido não derruba o app", () => {
    expect(loadWorkspace(() => "{isso não é json").trips).toHaveLength(1);
  });
});

describe("backup", () => {
  const ws = (() => {
    const a = emptyTripData({ ...defaultTrip(), name: "Lisboa" }, "a");
    a.hotels = [{ id: "h", name: "H", pricePerNight: 400, link: "https://exemplo.com" }];
    a.notes = "nota";
    return { trips: [a, emptyTripData(undefined, "b")], activeId: "a" };
  })();

  it("exporta e importa sem perder dados, com ids novos", () => {
    const r = parseBackup(exportBackup(ws));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.trips).toHaveLength(2);
    expect(r.trips[0].trip.name).toBe("Lisboa");
    expect(r.trips[0].hotels[0].link).toBe("https://exemplo.com");
    expect(r.trips.map((t) => t.id)).not.toContain("a");
  });
  it("adicionar não apaga as viagens atuais", () => {
    const r = parseBackup(exportBackup(ws));
    if (!r.ok) throw new Error("falhou");
    expect(addTrips(ws, r.trips).trips).toHaveLength(4);
  });
  it("recusa lixo, outro app e versão futura, com mensagem", () => {
    expect(parseBackup("oi").ok).toBe(false);
    expect(parseBackup('{"app":"outro","version":2,"trips":[{}]}').ok).toBe(false);
    expect(parseBackup('{"app":"viagem","version":99,"trips":[{}]}').ok).toBe(false);
    expect(parseBackup('{"app":"viagem","version":2,"trips":[]}').ok).toBe(false);
  });
  it("descarta links perigosos e valores inválidos", () => {
    const t = sanitizeTripData({
      trip: { origin: "XXX", destination: "LIS", departDate: "2027-03-10", returnDate: "2027-03-01", travelers: -5, budgetTotal: "muito" },
      hotels: [{ id: "h", name: "Ruim", pricePerNight: 100, link: "javascript:alert(1)" }, { name: "sem preço" }, "lixo"],
      expenses: [{ category: "inexistente", label: "x", amount: 1 }, { category: "voo", label: "ok", amount: Infinity }, { category: "voo", label: "ok", amount: 5, spent: true, date: "ontem" }],
      pack: [{ label: "item", category: "Roupas", packed: "sim" }],
    });
    expect(t.hotels).toHaveLength(1);
    expect(t.hotels[0].link).toBeUndefined();
    expect(t.trip.origin).toBe("GRU"); // código desconhecido volta ao padrão
    expect(t.trip.returnDate).toBe("2027-03-10"); // volta nunca antes da ida
    expect(t.trip.travelers).toBe(1);
    expect(t.expenses).toHaveLength(1);
    expect(t.expenses[0].date).toBeUndefined();
    expect(t.pack[0].packed).toBe(false);
  });
  it("ids repetidos viram únicos", () => {
    const t = sanitizeTripData({ hotels: [{ id: "x", name: "A", pricePerNight: 1 }, { id: "x", name: "B", pricePerNight: 2 }] }, true);
    expect(new Set(t.hotels.map((h) => h.id)).size).toBe(2);
  });
});
