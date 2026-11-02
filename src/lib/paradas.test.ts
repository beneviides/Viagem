import { describe, expect, it } from "vitest";
import { addLegToTrip, removeLegFromTrip } from "./legs";
import { nightsBetween } from "./dates";
import { Trip } from "../types";

const single: Trip = { origin: "GRU", destination: "SSA", departDate: "2027-03-10", returnDate: "2027-03-25", travelers: 2, budgetTotal: 0 }; // 15 noites
const total = (t: Trip) => (t.legs ?? []).reduce((s, l) => s + l.nights, 0);
let n = 0;
const id = () => `id${++n}`;

describe("adicionar uma parada", () => {
  it("de destino único: a cidade atual vira a Parada 1 e entra UMA nova", () => {
    const t = addLegToTrip(single, id);
    expect(t.legs).toHaveLength(2);
    expect(t.legs![0].destination).toBe("SSA");
    expect(t.legs![1].destination).not.toBe("SSA");
    expect(total(t)).toBe(nightsBetween(single.departDate, single.returnDate)); // o total da viagem não muda
    expect(t.destination).toBe("SSA");
  });
  it("cada clique adiciona exatamente uma, sem repetir cidade e sem mudar o total de noites", () => {
    let t = single;
    for (let i = 1; i <= 5; i++) {
      t = addLegToTrip(t, id);
      expect(t.legs).toHaveLength(i + 1);
      expect(total(t)).toBe(15);
    }
    const codes = t.legs!.map((l) => l.destination);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes).not.toContain("GRU"); // nem a cidade de saída
    expect(new Set(t.legs!.map((l) => l.id)).size).toBe(t.legs!.length);
  });
  it("não altera a viagem original", () => {
    const before = JSON.stringify(single);
    addLegToTrip(single, id);
    expect(JSON.stringify(single)).toBe(before);
  });
  it("viagem curta: cada parada tem pelo menos 1 noite", () => {
    const t = addLegToTrip({ ...single, returnDate: "2027-03-11" }, id); // 1 noite
    expect(t.legs).toHaveLength(2);
    expect(t.legs!.every((l) => l.nights >= 1)).toBe(true);
  });
});

describe("remover uma parada", () => {
  const three = addLegToTrip(addLegToTrip(single, id), id);
  it("qualquer uma pode ser removida e as noites dela vão para a vizinha", () => {
    const mid = removeLegFromTrip(three, three.legs![1].id);
    expect(mid.legs).toHaveLength(2);
    expect(total(mid)).toBe(15);
    const first = removeLegFromTrip(three, three.legs![0].id);
    expect(first.legs).toHaveLength(2);
    expect(first.destination).toBe(three.legs![1].destination); // a 2ª passa a ser a principal
    expect(total(first)).toBe(15);
    const last = removeLegFromTrip(three, three.legs![2].id);
    expect(last.legs).toHaveLength(2);
    expect(total(last)).toBe(15);
  });
  it("com 2 paradas, remover uma volta ao destino único", () => {
    const two = addLegToTrip(single, id);
    const back = removeLegFromTrip(two, two.legs![1].id);
    expect(back.legs).toBeUndefined();
    expect(back.destination).toBe("SSA");
    const keepSecond = removeLegFromTrip(two, two.legs![0].id);
    expect(keepSecond.legs).toBeUndefined();
    expect(keepSecond.destination).toBe(two.legs![1].destination);
  });
  it("id desconhecido ou viagem sem paradas não muda nada", () => {
    expect(removeLegFromTrip(three, "nao-existe")).toBe(three);
    expect(removeLegFromTrip(single, "qualquer")).toBe(single);
  });
  it("adicionar e remover de novo volta ao ponto de partida", () => {
    const two = addLegToTrip(single, id);
    const back = removeLegFromTrip(two, two.legs![1].id);
    expect({ ...back }).toEqual({ ...single });
  });
});
