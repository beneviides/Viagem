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
          <Budget trip={trip} destination={destination} summary={summary} projection={projection} expenses={expenses} onChange={setExpenses} />
        )}
        {tab === "Roteiro" && <Itinerary trip={trip} days={days} onChange={setDays} />}
      </main>
    </div>
  );
}
