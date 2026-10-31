import { useState } from "react";
import { Hotel, Trip } from "../types";
import { City, cityByCode } from "../lib/cities";
import { brl, nightsBetween } from "../lib/dates";
import { uid } from "../store";
import { getResolvedLegs } from "../lib/legs";

interface Props {
  trip: Trip;
  destination: City;
  hotels: Hotel[];
  onChange: (h: Hotel[]) => void;
  selectedId?: string;
  onSelect: (id: string | undefined) => void;
}

const CURATED_HOTELS: Record<string, { name: string; pricePerNight: number; rating: number }[]> = {
  AJU: [
    { name: "Vidam Hotel Aracaju (Orla de Atalaia)", pricePerNight: 420, rating: 9.2 },
    { name: "Pousada Acalanto da Atalaia", pricePerNight: 210, rating: 8.9 },
    { name: "Del Mar Hotel (Passarela do Caranguejo)", pricePerNight: 320, rating: 8.7 },
  ],
  SSA: [
    { name: "Fera Palace Hotel (Centro Histórico)", pricePerNight: 680, rating: 9.4 },
    { name: "Pousada Solar dos Deuses (Pelourinho)", pricePerNight: 380, rating: 9.1 },
    { name: "Grande Hotel da Barra (Porto da Barra)", pricePerNight: 310, rating: 8.6 },
  ],
  REC: [
    { name: "Grand Mercure Recife Boa Viagem", pricePerNight: 450, rating: 8.9 },
    { name: "Pousada dos Quatro Cantos (Olinda)", pricePerNight: 280, rating: 9.0 },
  ],
  RIO: [
    { name: "Arena Copacabana Hotel", pricePerNight: 520, rating: 8.8 },
    { name: "Windsor Leme Hotel", pricePerNight: 460, rating: 8.7 },
  ],
};

export default function Hotels({
  trip,
  destination,
  hotels,
  onChange,
  selectedId,
  onSelect,
}: Props) {
  const resolvedLegs = getResolvedLegs(trip);
  const isMulti = resolvedLegs.length > 1;

  // Filtro por cidade em caso de múltiplos destinos
  const [activeCityCode, setActiveCityCode] = useState<string>(
    isMulti ? resolvedLegs[0].destinationCode : destination.code
  );

  const activeCity = cityByCode(activeCityCode) || destination;
  const activeLeg = resolvedLegs.find((l) => l.destinationCode === activeCityCode) || resolvedLegs[0];
  const legNights = isMulti ? activeLeg.nights : nightsBetween(trip.departDate, trip.returnDate);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [rating, setRating] = useState("");
  const [link, setLink] = useState("");
  const [hotelCityCode, setHotelCityCode] = useState(activeCityCode);

  const rooms = Math.ceil(trip.travelers / 2);

  // Filtragem dos hotéis pela cidade ativa ou todos
  const displayedHotels = isMulti
    ? hotels.filter((h) => !h.destinationCode || h.destinationCode === activeCityCode)
    : hotels;

  const sorted = [...displayedHotels].sort((a, b) => a.pricePerNight - b.pricePerNight);
  const cheapest = sorted[0];

  const add = () => {
    const p = parseFloat(price);
    if (!name.trim() || !(p > 0)) return;
    onChange([
      ...hotels,
      {
        id: uid(),
        name: name.trim(),
        pricePerNight: p,
        rating: rating ? +rating : undefined,
        link: link.trim() || undefined,
        destinationCode: isMulti ? (hotelCityCode || activeCityCode) : undefined,
      },
    ]);
    setName("");
    setPrice("");
    setRating("");
    setLink("");
  };

  const addCurated = () => {
    const suggestions = CURATED_HOTELS[activeCity.code] || [
      { name: `Hotel Central ${activeCity.name}`, pricePerNight: activeCity.hotelAvg, rating: 8.5 },
      { name: `Pousada Charme ${activeCity.name}`, pricePerNight: Math.round(activeCity.hotelAvg * 0.8), rating: 8.8 },
    ];
    const newHotels = suggestions
      .filter((s) => !hotels.some((h) => h.name.toLowerCase() === s.name.toLowerCase()))
      .map((s) => ({
        id: uid(),
        name: s.name,
        pricePerNight: s.pricePerNight,
        rating: s.rating,
        destinationCode: isMulti ? activeCityCode : undefined,
      }));
    if (newHotels.length > 0) {
      onChange([...hotels, ...newHotels]);
      if (!selectedId && newHotels[0]) onSelect(newHotels[0].id);
    }
  };

  return (
    <>
      {/* Abas de Destinos se a viagem for multidestino */}
      {isMulti && (
        <section className="card" style={{ padding: 14 }}>
          <div className="stat-label" style={{ marginBottom: 8 }}>
            Hospedagem por Cidade do Roteiro
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {resolvedLegs.map((l) => {
              const active = l.destinationCode === activeCityCode;
              return (
                <button
                  key={l.destinationCode}
                  type="button"
                  className={active ? "secondary on" : "secondary"}
                  onClick={() => {
                    setActiveCityCode(l.destinationCode);
                    setHotelCityCode(l.destinationCode);
                  }}
                  style={{ minHeight: 38, padding: "0 14px", fontSize: 13 }}
                >
                  🏨 {l.destinationCity.name} ({l.nights} noites)
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div className="stat-label">Referência de Hospedagem em {activeCity.name}</div>
            <div className="stat">
              {brl(activeCity.hotelAvg)}
              <small>diária média de referência para hotel confortável nesta cidade</small>
            </div>
          </div>
          <button
            type="button"
            className="secondary"
            onClick={addCurated}
            style={{ fontSize: 12, minHeight: 36, padding: "0 12px" }}
            title="Carregar hotéis recomendados automaticamente"
          >
            ✨ Carregar Hotéis Sugeridos em {activeCity.name}
          </button>
        </div>

        <div className="chips" style={{ marginTop: 10 }}>
          <span className="chip">
            🌙 <b>{legNights}</b> {legNights === 1 ? "noite" : "noites"} em {activeCity.name}
          </span>
          <span className="chip">
            🛏️ <b>{rooms}</b> {rooms === 1 ? "quarto recomendado" : "quartos recomendados"} ({trip.travelers} {trip.travelers === 1 ? "pessoa" : "pessoas"})
          </span>
          <span className="chip">
            📊 Custo estimado da estadia: <b>{brl(activeCity.hotelAvg * legNights * rooms)}</b>
          </span>
        </div>
        <p className="muted" style={{ marginTop: 12 }}>
          Cadastre opções de hotéis ou pousadas para calcular o custo exato dessa parada e selecionar o ideal.
        </p>
      </section>

      {displayedHotels.length === 0 ? (
        <section className="card" style={{ textAlign: "center", padding: "28px 20px" }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🏨</div>
          <h3 style={{ justifyContent: "center", marginBottom: 6 }}>
            Nenhum hotel cadastrado em {activeCity.name}
          </h3>
          <p className="muted" style={{ maxWidth: 360, margin: "0 auto 14px" }}>
            Você pode adicionar seus próprios hotéis ou carregar automaticamente sugestões populares para {activeCity.name}.
          </p>
          <button type="button" onClick={addCurated} style={{ minHeight: 38 }}>
            ✨ Adicionar Hotéis Recomendados em {activeCity.name}
          </button>
        </section>
      ) : (
        <ul className="list">
          {sorted.map((h) => {
            const total = h.pricePerNight * legNights * rooms;
            const vsAvg = Math.round(((h.pricePerNight - activeCity.hotelAvg) / activeCity.hotelAvg) * 100);
            const selected = selectedId === h.id;
            return (
              <li key={h.id} className={`item${selected ? " selected" : ""}`}>
                <div>
                  <div className="name" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span>🏨 {h.name}</span>
                    {isMulti && (
                      <span className="pill" style={{ textTransform: "none", fontSize: 10 }}>
                        {activeCity.name}
                      </span>
                    )}
                  </div>
                  <div className="muted" style={{ marginTop: 4 }}>
                    <b>{brl(h.pricePerNight)}</b> / noite
                    {h.rating !== undefined && (
                      <span style={{ color: "var(--warn)", fontWeight: 700, marginLeft: 8 }}>
                        ★ {h.rating.toFixed(1)}/10
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <div className="price">{brl(total)}</div>
                  <div className="muted" style={{ textAlign: "right", fontSize: 11 }}>
                    estadia ({legNights}n · {rooms}q)
                  </div>
                </div>

                <div className="sub">
                  {selected && (
                    <span className="pill" style={{ background: "var(--ok-bg)", color: "var(--ok)" }}>
                      ✓ Hotel Selecionado
                    </span>
                  )}
                  {h === cheapest && displayedHotels.length > 1 && (
                    <span className="pill">
                      🏷️ Melhor Preço em {activeCity.name}
                    </span>
                  )}
                  <span className={`pill${vsAvg > 0 ? " warn" : ""}`}>
                    {vsAvg >= 0 ? "+" : ""}
                    {vsAvg}% vs média da cidade
                  </span>
                  {h.link && (
                    <a
                      href={h.link}
                      target="_blank"
                      rel="noreferrer noopener"
                      style={{ display: "inline-flex", alignItems: "center", gap: 4, marginLeft: "auto" }}
                    >
                      <span>Abrir Reserva</span>
                      <span>↗</span>
                    </a>
                  )}
                </div>

                <div className="actions">
                  <button
                    className={`secondary${selected ? " on" : ""}`}
                    onClick={() => onSelect(selected ? undefined : h.id)}
                  >
                    {selected ? "✓ Hotel Escolhido para esta Cidade" : "Escolher este hotel"}
                  </button>
                  <button
                    className="ghost"
                    aria-label={`Remover ${h.name}`}
                    title="Excluir hotel"
                    onClick={() => onChange(hotels.filter((x) => x.id !== h.id))}
                  >
                    ✕
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <section className="card">
        <h3>➕ Adicionar Opção de Hospedagem</h3>
        <div className="form">
          {isMulti && (
            <label style={{ gridColumn: "1 / -1" }}>
              Cidade deste Hotel
              <select
                value={hotelCityCode}
                onChange={(e) => setHotelCityCode(e.target.value)}
              >
                {resolvedLegs.map((l) => (
                  <option key={l.destinationCode} value={l.destinationCode}>
                    {l.destinationCity.name} ({l.nights} noites)
                  </option>
                ))}
              </select>
            </label>
          )}

          <label>
            Nome do hotel ou pousada
            <input
              id="hotel-name"
              placeholder="Ex: Pousada Atalaia, Hotel Pelourinho..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
            />
          </label>
          <label>
            Valor da Diária (R$)
            <input
              id="hotel-price"
              type="number"
              min={0}
              placeholder="0,00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
            />
          </label>
          <label>
            Nota de Avaliação (0 a 10)
            <input
              id="hotel-rating"
              type="number"
              min={0}
              max={10}
              step={0.1}
              placeholder="Ex: 8.8"
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
            />
          </label>
          <label>
            Link da Reserva (URL)
            <input
              id="hotel-link"
              type="url"
              placeholder="https://..."
              value={link}
              onChange={(e) => setLink(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
            />
          </label>
        </div>
        <button style={{ marginTop: 14, width: "100%" }} onClick={add}>
          + Cadastrar Hotel
        </button>
      </section>
    </>
  );
}
