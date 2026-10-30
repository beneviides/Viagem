import { useCallback, useEffect, useState } from "react";
import { TripData, Workspace } from "./types";
import { WORKSPACE_KEY, addTrips, emptyTripData, loadWorkspace, replaceTrips, sanitizeTripData, uid } from "./lib/storage";

/** useState persistido em localStorage. */
export function usePersistent<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* armazenamento indisponível: segue sem persistir */
    }
  }, [key, value]);
  return [value, setValue] as const;
}

export { uid } from "./lib/storage";

/** Várias viagens, persistidas juntas. A viagem ativa é a que as abas mostram. */
export function useWorkspace() {
  const [ws, setWs] = useState<Workspace>(() => {
    try {
      return loadWorkspace((k) => localStorage.getItem(k));
    } catch {
      return loadWorkspace(() => null);
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(WORKSPACE_KEY, JSON.stringify(ws));
    } catch {
      /* armazenamento indisponível: segue sem persistir */
    }
  }, [ws]);

  const active = ws.trips.find((t) => t.id === ws.activeId) ?? ws.trips[0];

  const update = useCallback(
    (patch: Partial<TripData>) =>
      setWs((w) => ({ ...w, trips: w.trips.map((t) => (t.id === w.activeId ? { ...t, ...patch } : t)) })),
    []
  );
  const select = useCallback((id: string) => setWs((w) => (w.trips.some((t) => t.id === id) ? { ...w, activeId: id } : w)), []);
  const create = useCallback(() => {
    const t = emptyTripData();
    setWs((w) => ({ trips: [...w.trips, t], activeId: t.id }));
  }, []);
  const duplicate = useCallback((id: string) => {
    setWs((w) => {
      const src = w.trips.find((t) => t.id === id);
      if (!src) return w;
      const copy = sanitizeTripData({ ...src, trip: { ...src.trip, name: `${src.trip.name?.trim() || `${src.trip.origin} → ${src.trip.destination}`} (cópia)` } }, false);
      return { trips: [...w.trips, copy], activeId: copy.id };
    });
  }, []);
  const remove = useCallback((id: string) => {
    setWs((w) => {
      const rest = w.trips.filter((t) => t.id !== id);
      if (rest.length === 0) {
        const fresh = emptyTripData();
        return { trips: [fresh], activeId: fresh.id };
      }
      return { trips: rest, activeId: w.activeId === id ? rest[0].id : w.activeId };
    });
  }, []);
  const importTrips = useCallback((trips: TripData[], mode: "add" | "replace") => setWs((w) => (mode === "add" ? addTrips(w, trips) : replaceTrips(trips))), []);

  return { ws, active, update, select, create, duplicate, remove, importTrips, newId: uid };
}
