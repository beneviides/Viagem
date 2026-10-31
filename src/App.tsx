import { useEffect, useMemo, useState } from "react";
import { uid, useWorkspace } from "./store";
import { applyUpdate, useOffline, usePwa } from "./pwa";
import { Expense, Hotel, ItineraryDay, PackItem, Trip } from "./types";
import { cityByCode } from "./lib/cities";
import { daysBetween, nightsBetween } from "./lib/dates";
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
  Viagem: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3.5c-.5-.5-2.5 0-4 1.5L13.5 8.5 5.3 6.7c-.8-.2-1.6.1-2 .7l-.5.7 6.4 3.7-2.9 2.9-2.7-.7c-.5-.1-1.1.1-1.4.5l-.2.3 3.6 2.1 2.1 3.6.3-.2c.4-.3.6-.9.5-1.4l-.7-2.7 2.9-2.9 3.7 6.4.7-.5c.6-.4.9-1.2.7-2z" />
    </svg>
  ),
  Hotéis: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 21V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14" />
      <path d="M3 11h18" />
      <path d="M9 21v-5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v5" />
      <path d="M8 8h.01M16 8h.01M8 15h.01M16 15h.01" />
    </svg>
  ),
  Gastos: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="5" width="20" height="14" rx="3" />
      <line x1="2" y1="10" x2="22" y2="10" />
      <path d="M6 15h2M16 15h2" />
    </svg>
  ),
  Roteiro: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="3" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <path d="M8 14h2M14 14h2M8 18h2M14 18h2" />
    </svg>
  ),
  Mala: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="7" width="18" height="14" rx="3" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="12" y1="11" x2="12" y2="17" />
      <line x1="3" y1="13" x2="21" y2="13" />
    </svg>
  ),
  Notas: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  ),
};

export default function App() {
  const [tab, setTab] = useState<Tab | "Viagens">("Viagem");
  const offline = useOffline();
  const pwa = usePwa();
  const { ws, active, update, select, create, duplicate, remove, importTrips } = useWorkspace();
  const { trip, hotels, selectedHotelId, expenses, days, pack, notes } = active;

  // Gerenciamento de tema Claro / Escuro
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("viagem-theme");
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("viagem-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

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
    const projection = dailyProjection({ ...trip, destination, hotels, selectedHotelId, itinerary: days, expenses, trip });
    const base = forecast({ ...trip, destination, hotels, selectedHotelId, trip });
    // Passeios: atividades planejadas no dia, ou a estimativa do destino nos dias sem roteiro.
    base.passeios = projection.reduce((s, d) => s + d.passeios, 0);
    const expected = totals(base, expenses);
    const real = realized(expenses);
    return { summary: projected(expected, real), expected, real, projection };
  }, [destination, trip, hotels, selectedHotelId, expenses, days]);

  if (!destination || !origin || !summary || !expected || !real) {
    return (
      <div className="app">
        <section className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
          <h2>Cidade ou destino inválido</h2>
          <p className="muted" style={{ marginTop: 8 }}>
            Por favor, selecione uma cidade válida na lista de viagens.
          </p>
        </section>
      </div>
    );
  }

  const addLegToActiveTrip = () => {
    const totalNights = Math.max(1, nightsBetween(trip.departDate, trip.returnDate));
    const currentLegs = trip.legs && trip.legs.length > 0 ? [...trip.legs] : [
      {
        id: uid(),
        destination: trip.destination,
        nights: Math.max(1, Math.floor(totalNights / 2)),
        transport: "onibus" as const,
        transportCost: 0,
      },
    ];
    const nextCity = !currentLegs.some((l) => l.destination === "SSA")
      ? "SSA"
      : !currentLegs.some((l) => l.destination === "AJU")
        ? "AJU"
        : "REC";
    const usedNights = currentLegs.reduce((s, l) => s + l.nights, 0);
    const remainingNights = Math.max(1, totalNights - usedNights);
    currentLegs.push({
      id: uid(),
      destination: nextCity,
      nights: remainingNights,
      transport: "aviao",
      transportCost: 0,
    });
    setTrip({ ...trip, legs: currentLegs });
  };

  const passElement = (
    <Pass
      trip={trip}
      origin={origin}
      destination={destination}
      tripCount={ws.trips.length}
      onOpenTrips={() => setTab("Viagens")}
      onAddLeg={addLegToActiveTrip}
      onSelectTab={(t) => setTab(t as Tab)}
      dark={theme === "dark"}
      onToggleTheme={toggleTheme}
    />
  );

  const totalNights = Math.max(1, nightsBetween(trip.departDate, trip.returnDate));
  const isMulti = trip.legs && trip.legs.length > 1;

  return (
    <div className="app">
      {pwa.updateReady && (
        <div className="banner" role="status">
          <span>🚀 Há uma versão nova disponível.</span>
          <button onClick={applyUpdate}>Atualizar</button>
        </div>
      )}

      {offline && (
        <p className="offline" role="status">
          Modo offline ativo. Alterações salvas localmente no aparelho.
        </p>
      )}

      {passElement}

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
            {tab === "Viagem" && (
              <TripForm
                trip={trip}
                destination={destination}
                projection={projection}
                onChange={changeTrip}
              />
            )}
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
              <Budget
                trip={trip}
                destination={destination}
                summary={summary}
                expected={expected}
                real={real}
                projection={projection}
                expenses={expenses}
                onChange={setExpenses}
              />
            )}
            {tab === "Roteiro" && <Itinerary trip={trip} days={days} onChange={setDays} />}
            {tab === "Mala" && (
              <Packing
                trip={trip}
                origin={origin}
                destination={destination}
                items={pack}
                onChange={setPack}
              />
            )}
            {tab === "Notas" && <Notes value={notes} onChange={setNotes} />}
      </main>

      {/* Barra de Navegação */}
      <nav className="tabbar" aria-label="Navegação da viagem">
        <div className="tabbar-inner">
          {TABS.map((t) => (
            <button
              key={t}
              className={t === tab ? "active" : ""}
              aria-current={t === tab ? "page" : undefined}
              onClick={() => setTab(t)}
            >
              {ICONS[t]}
              <span>{t}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
