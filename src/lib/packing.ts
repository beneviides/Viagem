import { City, distanceKm } from "./cities";
import { nightsBetween } from "./dates";
import { PackCategory, PackItem, Trip } from "../types";

export const PACK_CATEGORIES: PackCategory[] = ["Documentos", "Roupas", "Higiene", "Saúde", "Eletrônicos", "Extras"];

export type Climate = "cold" | "mild" | "warm";

/** Clima aproximado no destino na época da ida, pela latitude e pelo mês (hemisfério). */
export function climateFor(city: City, departDate: string): Climate {
  const lat = city.lat;
  const month = new Date(departDate + "T12:00:00").getMonth() + 1; // 1..12
  const northWinter = month >= 11 || month <= 3;
  const northSummer = month >= 5 && month <= 9;
  const winter = lat >= 0 ? northWinter : northSummer;
  const summer = lat >= 0 ? northSummer : northWinter;
  if (city.coolAlways) return "mild"; // altitude: nunca "quente"
  if (Math.abs(lat) < 30) return city.coolWinter && winter ? "mild" : "warm";
  return winter ? (city.coldWinter ? "cold" : "mild") : summer ? "warm" : "mild";
}

const BEACH = new Set(["GIG", "SDU", "SSA", "FLN", "REC", "CUN", "MIA", "FOR", "NAT", "MCZ", "JPA", "AJU", "SLZ", "VIX", "BPS", "PUJ"]);

interface Suggestion {
  key: string;
  label: string;
  category: PackCategory;
}

/** Itens sugeridos para esta viagem. A mesma viagem sempre gera os mesmos itens (chaves estáveis). */
export function suggestItems(trip: Trip, origin: City, destination: City): Suggestion[] {
  const days = nightsBetween(trip.departDate, trip.returnDate) + 1;
  const intl = origin.country !== destination.country;
  const climate = climateFor(destination, trip.departDate);
  const longHaul = distanceKm(origin, destination) > 5000;
  const out: Suggestion[] = [];
  const add = (key: string, label: string, category: PackCategory) => out.push({ key, label, category });

  // Documentos
  if (intl) {
    add("passaporte", "Passaporte (validade mínima de 6 meses)", "Documentos");
    add("entrada", "Conferir visto ou autorização de entrada", "Documentos");
    add("seguro", "Seguro viagem", "Documentos");
    add("moeda", "Um pouco de dinheiro na moeda local", "Documentos");
  } else {
    add("rg", "Documento de identidade com foto", "Documentos");
  }
  add("reservas", "Passagens e reservas de hotel (no celular ou impressas)", "Documentos");
  add("cartao", "Cartão de crédito/débito", "Documentos");

  // Roupas (lavar no meio da viagem evita levar mais de uma semana de roupa)
  const sets = Math.min(days, 7);
  add("camisetas", `Camisetas (${sets})`, "Roupas");
  add("calcas", `Calças ou bermudas (${Math.max(2, Math.ceil(sets / 2))})`, "Roupas");
  add("intima", `Roupa íntima (${Math.min(days + 1, 8)})`, "Roupas");
  add("meias", `Meias (${Math.min(days + 1, 8)})`, "Roupas");
  add("pijama", "Pijama", "Roupas");
  add("calcado", "Calçado confortável para andar", "Roupas");
  if (climate === "cold") {
    add("casaco", "Casaco pesado", "Roupas");
    add("gorro", "Gorro, cachecol e luvas", "Roupas");
  } else if (climate === "mild") {
    add("casaco", "Casaco leve ou jaqueta", "Roupas");
  } else {
    add("chinelo", "Chinelo", "Roupas");
    add("bone", "Boné ou chapéu", "Roupas");
  }
  const allCities = trip.legs && trip.legs.length > 1
    ? trip.legs.map((l) => l.destination)
    : [destination.code];
  const isBeach = allCities.some((c) => BEACH.has(c));
  if (isBeach && climate !== "cold") add("banho", "Roupa de banho para praias", "Roupas");

  // Higiene
  add("dentes", "Escova e pasta de dente", "Higiene");
  add("desodorante", "Desodorante", "Higiene");
  add("shampoo", "Shampoo e condicionador (até 100 ml na bagagem de mão)", "Higiene");
  if (climate === "warm" || isBeach) add("protetor", "Protetor solar", "Higiene");

  // Saúde
  add("remedios", "Remédios de uso pessoal", "Saúde");
  add("primeiros", "Kit básico: analgésico e curativos", "Saúde");
  if (climate === "warm" || isBeach) add("repelente", "Repelente", "Saúde");

  // Eletrônicos
  add("celular", "Celular e carregador", "Eletrônicos");
  add("powerbank", "Bateria portátil", "Eletrônicos");
  add("fone", "Fones de ouvido", "Eletrônicos");
  if (intl) add("adaptador", "Adaptador de tomada", "Eletrônicos");

  // Extras
  add("mochila", "Mochila pequena para os passeios", "Extras");
  add("garrafa", "Garrafinha reutilizável", "Extras");
  if (climate !== "warm") add("guardachuva", "Guarda-chuva compacto", "Extras");
  const hasLongTravel = longHaul || (trip.legs && trip.legs.some((l) => l.transport === "onibus" || l.transport === "aviao"));
  if (hasLongTravel) add("descanso", "Travesseiro de pescoço para deslocamentos", "Extras");
  return out;
}

/**
 * Junta as sugestões à lista atual: atualiza o texto dos itens sugeridos que já existem
 * (mantendo o "já guardei"), adiciona os que faltam e preserva os itens do usuário.
 */
export function syncSuggestions(existing: PackItem[], suggestions: Suggestion[]): PackItem[] {
  const byKey = new Map(suggestions.map((s) => [s.key, s]));
  const seen = new Set<string>();
  const updated = existing.map((it) => {
    const s = it.key ? byKey.get(it.key) : undefined;
    if (!s) return it;
    seen.add(s.key);
    return { ...it, label: s.label, category: s.category };
  });
  const added = suggestions.filter((s) => !seen.has(s.key)).map((s) => ({ id: `s-${s.key}`, key: s.key, label: s.label, category: s.category, packed: false }));
  return [...updated, ...added];
}
