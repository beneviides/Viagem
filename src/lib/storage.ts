import { CITIES } from "./cities";
import { addDays } from "./dates";
import { PACK_CATEGORIES } from "./packing";
import { Activity, Category, Expense, Hotel, ItineraryDay, PackItem, Trip, TripData, TripLeg, Workspace } from "../types";

export const uid = () => Math.random().toString(36).slice(2, 10);

export const WORKSPACE_KEY = "viagem.v2";
export const BACKUP_VERSION = 2;
const MAX_BACKUP_CHARS = 5_000_000;
const MAX_TRIPS = 50;
const MAX_ITEMS = 500;

export const defaultTrip = (today = new Date()): Trip => {
  const iso = new Date(today.getTime() - today.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  return { origin: "GRU", destination: "GIG", departDate: addDays(iso, 60), returnDate: addDays(iso, 67), travelers: 2, budgetTotal: 20000 };
};

export const emptyTripData = (trip: Trip = defaultTrip(), id = uid()): TripData => ({
  id, trip, hotels: [], selectedHotelId: undefined, expenses: [], days: [], pack: [], notes: "",
});

/** Nome mostrado nas listas. */
export const tripTitle = (t: Trip): string => {
  if (t.name?.trim()) return t.name.trim();
  if (t.legs && t.legs.length > 1) {
    return t.legs.map((l) => l.destination).join(" + ");
  }
  return `${t.origin} → ${t.destination}`;
};

// ---------- validação (dados vêm do armazenamento ou de um arquivo de terceiros) ----------

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, max = 200): string | undefined => (typeof v === "string" ? v.slice(0, max) : undefined);
const num = (v: unknown, min = 0, max = 1e9): number | undefined =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : undefined;
const isoDate = (v: unknown): string | undefined =>
  typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? v : undefined;
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v.slice(0, MAX_ITEMS) : []);
const CATEGORIES: Category[] = ["voo", "hotel", "comida", "transporte", "passeios", "outros"];

/** Só links http(s): um `javascript:` vindo de um arquivo nunca chega ao <a href>. */
const safeLink = (v: unknown): string | undefined => {
  const s = str(v, 500);
  return s && /^https?:\/\//i.test(s) ? s : undefined;
};

/** Ids únicos dentro de uma lista: repete → gera outro. */
function ids<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.map((it) => {
    let id = it.id;
    while (!id || seen.has(id)) id = uid();
    seen.add(id);
    return id === it.id ? it : { ...it, id };
  });
}

function sanitizeTrip(raw: unknown): Trip {
  const d = defaultTrip();
  const r = isObj(raw) ? raw : {};
  const code = (v: unknown, fallback: string) => (typeof v === "string" && CITIES.some((c) => c.code === v) ? v : fallback);
  const departDate = isoDate(r.departDate) ?? d.departDate;
  let returnDate = isoDate(r.returnDate) ?? addDays(departDate, 7);
  if (returnDate < departDate) returnDate = departDate;
  const name = str(r.name, 80)?.trim();
  const transport = (["aviao", "onibus", "carro", "trem", "barco"] as const).find((t) => t === r.transport);

  const legs = Array.isArray(r.legs)
    ? r.legs.flatMap((l): TripLeg[] => {
        if (!isObj(l)) return [];
        const dest = code(l.destination, "");
        if (!dest) return [];
        const nights = Math.max(1, Math.round(num(l.nights, 1, 365) ?? 1));
        const legTransport = ((["aviao", "onibus", "carro", "trem", "barco"] as const).find((t) => t === l.transport) ?? "aviao");
        const cost = num(l.transportCost, 0, 1e7);
        const orig = typeof l.origin === "string" ? code(l.origin, "") : undefined;
        return [
          {
            id: str(l.id, 40) || uid(),
            destination: dest,
            nights,
            transport: legTransport,
            ...(cost !== undefined ? { transportCost: cost } : {}),
            ...(orig ? { origin: orig } : {}),
            ...(typeof l.notes === "string" ? { notes: str(l.notes, 200) } : {}),
          },
        ];
      })
    : undefined;

  return {
    ...(name ? { name } : {}),
    origin: code(r.origin, d.origin),
    destination: code(r.destination, d.destination),
    departDate,
    returnDate,
    travelers: Math.round(num(r.travelers, 1, 50) ?? d.travelers),
    budgetTotal: num(r.budgetTotal) ?? d.budgetTotal,
    ...(transport ? { transport } : {}),
    ...(legs && legs.length > 0 ? { legs } : {}),
  };
}

const sanitizeHotels = (raw: unknown): Hotel[] =>
  ids(
    list(raw).flatMap((x): Hotel[] => {
      if (!isObj(x)) return [];
      const name = str(x.name, 120);
      const price = num(x.pricePerNight);
      if (!name || price === undefined) return [];
      const rating = num(x.rating, 0, 10);
      const link = safeLink(x.link);
      const destinationCode = typeof x.destinationCode === "string" ? str(x.destinationCode, 10) : undefined;
      return [
        {
          id: str(x.id, 40) ?? "",
          name,
          pricePerNight: price,
          ...(rating !== undefined ? { rating } : {}),
          ...(link ? { link } : {}),
          ...(destinationCode ? { destinationCode } : {}),
        },
      ];
    })
  );

const sanitizeExpenses = (raw: unknown): Expense[] =>
  ids(
    list(raw).flatMap((x): Expense[] => {
      if (!isObj(x)) return [];
      const category = CATEGORIES.find((c) => c === x.category);
      const amount = num(x.amount);
      const label = str(x.label, 120);
      if (!category || amount === undefined || !label) return [];
      const date = isoDate(x.date);
      return [{ id: str(x.id, 40) ?? "", category, label, amount, ...(x.spent === true ? { spent: true } : {}), ...(date ? { date } : {}) }];
    })
  );

const sanitizeActivities = (raw: unknown): Activity[] =>
  ids(
    list(raw).flatMap((x): Activity[] => {
      if (!isObj(x)) return [];
      const title = str(x.title, 160);
      if (!title) return [];
      const time = typeof x.time === "string" && /^\d{2}:\d{2}$/.test(x.time) ? x.time : undefined;
      return [{ id: str(x.id, 40) ?? "", title, cost: num(x.cost) ?? 0, ...(time ? { time } : {}) }];
    })
  );

const sanitizeDays = (raw: unknown): ItineraryDay[] => {
  const byDate = new Map<string, Activity[]>();
  for (const x of list(raw)) {
    if (!isObj(x)) continue;
    const date = isoDate(x.date);
    if (date) byDate.set(date, [...(byDate.get(date) ?? []), ...sanitizeActivities(x.activities)]);
  }
  return [...byDate].map(([date, activities]) => ({ date, activities: ids(activities) }));
};

const sanitizePack = (raw: unknown): PackItem[] =>
  ids(
    list(raw).flatMap((x): PackItem[] => {
      if (!isObj(x)) return [];
      const label = str(x.label, 160);
      const category = PACK_CATEGORIES.find((c) => c === x.category);
      if (!label || !category) return [];
      const key = str(x.key, 40);
      return [{ id: str(x.id, 40) ?? "", label, category, packed: x.packed === true, ...(key ? { key } : {}) }];
    })
  );

export function sanitizeTripData(raw: unknown, keepId = false): TripData {
  const r = isObj(raw) ? raw : {};
  const hotels = sanitizeHotels(r.hotels);
  const selected = str(r.selectedHotelId, 40);
  return {
    id: keepId ? str(r.id, 40) || uid() : uid(),
    trip: sanitizeTrip(r.trip),
    hotels,
    selectedHotelId: selected && hotels.some((h) => h.id === selected) ? selected : undefined,
    expenses: sanitizeExpenses(r.expenses),
    days: sanitizeDays(r.days),
    pack: sanitizePack(r.pack),
    notes: str(r.notes, 100_000) ?? "",
  };
}

// ---------- área de trabalho (várias viagens) ----------

function ensureWorkspace(trips: TripData[], activeId?: string): Workspace {
  const list = trips.length ? trips : [emptyTripData()];
  return { trips: list, activeId: list.some((t) => t.id === activeId) ? (activeId as string) : list[0].id };
}

/** Dados do app antigo, guardados em chaves separadas, viram a primeira viagem. */
export function migrateLegacy(get: (key: string) => string | null): TripData | undefined {
  const read = (k: string): unknown => {
    try {
      const raw = get(k);
      return raw ? JSON.parse(raw) : undefined;
    } catch {
      return undefined;
    }
  };
  const trip = read("viagem.trip");
  if (trip === undefined) return undefined;
  return sanitizeTripData(
    { trip, hotels: read("viagem.hotels"), selectedHotelId: read("viagem.hotel"), expenses: read("viagem.expenses"), days: read("viagem.days"), pack: read("viagem.pack"), notes: read("viagem.notes") },
    false
  );
}

export function loadWorkspace(get: (key: string) => string | null): Workspace {
  try {
    const raw = get(WORKSPACE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isObj(parsed) && Array.isArray(parsed.trips)) {
        return ensureWorkspace(parsed.trips.slice(0, MAX_TRIPS).map((t) => sanitizeTripData(t, true)), str(parsed.activeId, 40));
      }
    }
  } catch {
    /* armazenamento corrompido: cai na migração ou numa viagem nova */
  }
  const legacy = migrateLegacy(get);
  return ensureWorkspace(legacy ? [legacy] : []);
}

// ---------- backup ----------

export function exportBackup(ws: Workspace, now = new Date()): string {
  return JSON.stringify({ app: "viagem", version: BACKUP_VERSION, exportedAt: now.toISOString(), trips: ws.trips }, null, 2);
}

export type ParsedBackup = { ok: true; trips: TripData[] } | { ok: false; error: string };

export function parseBackup(text: string): ParsedBackup {
  if (text.length > MAX_BACKUP_CHARS) return { ok: false, error: "O arquivo é grande demais para ser um backup do Viagem." };
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: "Isso não parece um arquivo de backup: o texto não é um JSON válido." };
  }
  if (!isObj(data) || data.app !== "viagem") return { ok: false, error: "Este arquivo não é um backup do Viagem." };
  if (typeof data.version !== "number" || data.version > BACKUP_VERSION) return { ok: false, error: "Este backup vem de uma versão mais nova do app." };
  if (!Array.isArray(data.trips) || data.trips.length === 0) return { ok: false, error: "O backup não tem nenhuma viagem." };
  // Ids novos: importar nunca sobrescreve uma viagem existente por coincidência de id.
  return { ok: true, trips: data.trips.slice(0, MAX_TRIPS).map((t) => sanitizeTripData(t, false)) };
}

export const addTrips = (ws: Workspace, imported: TripData[]): Workspace => ensureWorkspace([...ws.trips, ...imported], ws.activeId);
export const replaceTrips = (imported: TripData[]): Workspace => ensureWorkspace(imported);
