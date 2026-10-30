import { useMemo, useState } from "react";
import { useWorkspace } from "./store";
import { Expense, Hotel, ItineraryDay, PackItem, Trip } from "./types";
import { cityByCode } from "./lib/cities";
import { daysBetween } from "./lib/dates";
import { shiftItinerary } from "./lib/itinerary";
import { dailyProjection, forecast, projected, realized, totals } from "./lib/budget";
import TripForm from "./components/TripForm";
import Hotels from "./components/Hotels";
import Budget from "./components/Budget";
import Itinerary from "./components/Itinerary";
import Pass from "./components/Pass";
import Notes from "./components/Notes";
import Packing from "./components/Packing";
import Trips from "./components/Trips";

const TABS = ["Viagem", "Hotéis", "Gastos", "Roteiro", "Mala", "Notas"] as const;
type Tab = (typeof TABS)[number];

const ICONS: Record<Tab, JSX.Element> = {
  Viagem: <path d="M2 16l20-8-6 14-3-6-6-2 12-6" />,
  Hotéis: (
    <>
      <path d="M3 20V8M3 14h18v6M21 14v-2a3 3 0 0 0-3-3h-7v5" />
      <circle cx="7" cy="11" r="1.5" />
    </>
  ),
  Gastos: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M14.5 9.5c-.5-1-1.4-1.5-2.5-1.5-1.4 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.8 2.5 2-1.1 2-2.5 2c-1.1 0-2-.5-2.5-1.5M12 6.5V8M12 16v1.5" />
    </>
  ),
  Roteiro: (
    <>
      <rect x="4" y="5" width="16" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M4 10h16M8 14h4M8 17.5h7" />
    </>
  ),
  Mala: (
    <>
      <rect x="4" y="7" width="16" height="13" rx="2" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M4 12h16M10 12v2h4v-2" />
    </>
  ),
  Notas: <path d="M5 3h10l4 4v14H5zM14 3v5h5M8 13h8M8 17h5" />,
};

export default function App() {
  const [tab, setTab] = useState<Tab | "Viagens">("Viagem");
  const { ws, active, update, select, create, duplicate, remove, importTrips } = useWorkspace();
  const { trip, hotels, selectedHotelId, expenses, days, pack, notes } = active;
  const setTrip = (v: Trip) => update({ trip: v });
  const setHotels = (v: Hotel[]) => update({ hotels: v });
  const setSelectedHotelId = (v: string | undefined) => update({ selectedHotelId: v });
  const setExpenses = (v: Expense[]) => update({ expenses: v });
  const setDays = (v: ItineraryDay[]) => update({ days: v });
  const setPack = (v: PackItem[]) => update({ pack: v });
  const setNotes = (v: string) => update({ notes: v });

  // Adiar ou adiantar a viagem leva o roteiro junto, em vez de deixar as atividades em dias antigos.
  const changeTrip = (next: Trip) => {
    const delta = daysBetween(trip.departDate, next.departDate);
    if (delta !== 0) setDays(shiftItinerary(days, delta));
    setTrip(next);
  };

  const destination = cityByCode(trip.destination);
  const origin = cityByCode(trip.origin);

  const { summary, expected, real, projection } = useMemo(() => {
    if (!destination) return { summary: undefined, expected: undefined, real: undefined, projection: [] };
    const projection = dailyProjection({ ...trip, destination, hotels, selectedHotelId, itinerary: days, expenses });
    const base = forecast({ ...trip, destination, hotels, selectedHotelId });
    // Passeios: atividades planejadas no dia, ou a estimativa do destino nos dias sem roteiro.
    base.passeios = projection.reduce((s, d) => s + d.passeios, 0);
    const expected = totals(base, expenses);
    const real = realized(expenses);
    return { summary: projected(expected, real), expected, real, projection };
  }, [destination, trip, hotels, selectedHotelId, expenses, days]);

  if (!destination || !origin || !summary || !expected || !real) return <p>Cidade inválida.</p>;

  return (
    <div className="app">
      <Pass trip={trip} origin={origin} destination={destination} tripCount={ws.trips.length} onOpenTrips={() => setTab("Viagens")} />
      <main>
        {tab === "Viagens" && (
          <Trips
            ws={ws}
            onOpen={(id) => {
              select(id);
              setTab("Viagem");
            }}
            onCreate={() => {
              create();
              setTab("Viagem");
            }}
            onDuplicate={(id) => {
              duplicate(id);
              setTab("Viagem");
            }}
            onRemove={remove}
            onImport={importTrips}
          />
        )}
        {tab === "Viagem" && <TripForm trip={trip} destination={destination} projection={projection} onChange={changeTrip} />}
        {tab === "Hotéis" && (
          <Hotels
            trip={trip}
            destination={destination}
            hotels={hotels}
            onChange={setHotels}
            selectedId={selectedHotelId}
            onSelect={setSelectedHotelId}
          />
        )}
        {tab === "Gastos" && (
          <Budget trip={trip} destination={destination} summary={summary} expected={expected} real={real} projection={projection} expenses={expenses} onChange={setExpenses} />
        )}
        {tab === "Roteiro" && <Itinerary trip={trip} days={days} onChange={setDays} />}
        {tab === "Mala" && <Packing trip={trip} origin={origin} destination={destination} items={pack} onChange={setPack} />}
        {tab === "Notas" && <Notes value={notes} onChange={setNotes} />}
      </main>
      <nav className="tabbar" aria-label="Seções">
        <div className="tabbar-inner">
          {TABS.map((t) => (
            <button key={t} className={t === tab ? "active" : ""} aria-current={t === tab ? "page" : undefined} onClick={() => setTab(t)}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {ICONS[t]}
              </svg>
              <span>{t}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
