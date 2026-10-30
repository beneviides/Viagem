const ENDPOINT = "https://serpapi.com/search.json";

export const IATA = /^[A-Z]{3}$/;
export const ISO = /^\d{4}-\d{2}-\d{2}$/;

export const addDays = (iso, n) => {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

const nightsBetween = (a, b) =>
  Math.max(1, Math.round((new Date(b + "T12:00:00Z") - new Date(a + "T12:00:00Z")) / 86_400_000));

/** Extrai a oferta mais barata de uma resposta do engine google_flights. */
export function cheapestOffer(json, date, returnDate) {
  const all = [...(json.best_flights ?? []), ...(json.other_flights ?? [])].filter((f) => Number.isFinite(f.price));
  if (all.length === 0) return undefined;
  const best = all.reduce((a, b) => (b.price < a.price ? b : a));
  const legs = best.flights ?? [];
  return {
    date,
    returnDate,
    price: Math.round(best.price),
    airline: legs[0]?.airline ?? "—",
    stops: Math.max(0, legs.length - 1),
  };
}

async function searchDate({ apiKey, origin, destination, date, returnDate, fetchImpl }) {
  const qs = new URLSearchParams({
    engine: "google_flights",
    departure_id: origin,
    arrival_id: destination,
    outbound_date: date,
    return_date: returnDate,
    type: "1",
    currency: "BRL",
    hl: "pt",
    api_key: apiKey,
  });
  const res = await fetchImpl(`${ENDPOINT}?${qs}`);
  if (!res.ok) throw new Error(`SerpApi HTTP ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return cheapestOffer(json, date, returnDate);
}

const cache = new Map(); // chave -> { at, offers }
const TTL_MS = 60 * 60 * 1000;

/** Uma consulta por data da janela flexível (cada uma consome 1 busca do plano SerpApi). */
export async function searchFlights({ apiKey, origin, destination, departDate, returnDate, flex, fetchImpl = fetch }) {
  const key = [origin, destination, departDate, returnDate, flex].join("|");
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.offers;

  const nights = nightsBetween(departDate, returnDate);
  const dates = [];
  for (let s = -flex; s <= flex; s++) dates.push(addDays(departDate, s));

  const results = await Promise.allSettled(
    dates.map((date) => searchDate({ apiKey, origin, destination, date, returnDate: addDays(date, nights), fetchImpl }))
  );
  const offers = results
    .filter((r) => r.status === "fulfilled" && r.value)
    .map((r) => r.value)
    .sort((a, b) => a.price - b.price);

  if (offers.length === 0) {
    const firstError = results.find((r) => r.status === "rejected");
    if (firstError) throw firstError.reason;
  }
  cache.set(key, { at: Date.now(), offers });
  return offers;
}
