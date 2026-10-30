import { useMemo, useState } from "react";
import { usePersistent } from "./store";
import { Expense, Hotel, ItineraryDay, Trip } from "./types";
import { cityByCode } from "./lib/cities";
import { addDays } from "./lib/dates";
import { dailyProjection, forecast, totals } from "./lib/budget";
import TripForm from "./components/TripForm";
import Hotels from "./components/Hotels";
import Budget from "./components/Budget";
import Itinerary from "./components/Itinerary";

const today = new Date().toISOString().slice(0, 10);
const DEFAULT_TRIP: Trip = {
  origin: "GRU",
  destination: "LIS",
  departDate: addDays(today, 60),
  returnDate: addDays(today, 67),
  travelers: 2,
  budgetTotal: 20000,
};

const TABS = ["Viagem", "Hotéis", "Gastos", "Roteiro"] as const;
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
};

export default function App() {
  const [tab, setTab] = useState<Tab>("Viagem");
  const [trip, setTrip] = usePersistent<Trip>("viagem.trip", DEFAULT_TRIP);
  const [hotels, setHotels] = usePersistent<Hotel[]>("viagem.hotels", []);
  const [selectedHotelId, setSelectedHotelId] = usePersistent<string | undefined>("viagem.hotel", undefined);
  const [expenses, setExpenses] = usePersistent<Expense[]>("viagem.expenses", []);
  const [days, setDays] = usePersistent<ItineraryDay[]>("viagem.days", []);

  const destination = cityByCode(trip.destination);
  const origin = cityByCode(trip.origin);

  const { summary, projection } = useMemo(() => {
    if (!destination) return { summary: undefined, projection: [] };
    const projection = dailyProjection({ ...trip, destination, hotels, selectedHotelId, itinerary: days });
    const base = forecast({ ...trip, destination, hotels, selectedHotelId });
    // Passeios: atividades planejadas no dia, ou a estimativa do destino nos dias sem roteiro.
    base.passeios = projection.reduce((s, d) => s + d.passeios, 0);
    return { summary: totals(base, expenses), projection };
  }, [destination, trip, hotels, selectedHotelId, expenses, days]);

  if (!destination || !origin || !summary) return <p>Cidade inválida.</p>;

  return (
    <div className="app">
      <header>
        <h1>✈️ Viagem</h1>
        <p>
          {origin.name} → {destination.name} · {trip.travelers} pessoa(s)
        </p>
      </header>
      <main>
        {tab === "Viagem" && <TripForm trip={trip} destination={destination} projection={projection} onChange={setTrip} />}
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
          <Budget trip={trip} destination={destination} summary={summary} projection={projection} expenses={expenses} onChange={setExpenses} />
        )}
        {tab === "Roteiro" && <Itinerary trip={trip} days={days} onChange={setDays} />}
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
