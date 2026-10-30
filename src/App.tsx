import { useMemo, useState } from "react";
import { usePersistent } from "./store";
import { Expense, Hotel, ItineraryDay, Trip } from "./types";
import { cityByCode } from "./lib/cities";
import { addDays } from "./lib/dates";
import { forecast, totals } from "./lib/budget";
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

export default function App() {
  const [tab, setTab] = useState<Tab>("Viagem");
  const [trip, setTrip] = usePersistent<Trip>("viagem.trip", DEFAULT_TRIP);
  const [hotels, setHotels] = usePersistent<Hotel[]>("viagem.hotels", []);
  const [selectedHotelId, setSelectedHotelId] = usePersistent<string | undefined>("viagem.hotel", undefined);
  const [expenses, setExpenses] = usePersistent<Expense[]>("viagem.expenses", []);
  const [days, setDays] = usePersistent<ItineraryDay[]>("viagem.days", []);

  const destination = cityByCode(trip.destination);
  const origin = cityByCode(trip.origin);

  const summary = useMemo(() => {
    if (!destination) return undefined;
    const base = forecast({ ...trip, destination, hotels, selectedHotelId });
    // Se o roteiro tem custos planejados, eles substituem a estimativa genérica de passeios.
    const planned = days.flatMap((d) => d.activities).reduce((s, a) => s + a.cost * trip.travelers, 0);
    if (planned > 0) base.passeios = planned;
    return totals(base, expenses);
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
      <nav>
        {TABS.map((t) => (
          <button key={t} className={t === tab ? "active" : ""} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </nav>
      <main>
        {tab === "Viagem" && <TripForm trip={trip} onChange={setTrip} />}
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
          <Budget trip={trip} summary={summary} expenses={expenses} onChange={setExpenses} />
        )}
        {tab === "Roteiro" && <Itinerary trip={trip} days={days} onChange={setDays} />}
      </main>
    </div>
  );
}
