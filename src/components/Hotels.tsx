import { useState } from "react";
import { Hotel, Trip } from "../types";
import { City } from "../lib/cities";
import { brl, nightsBetween } from "../lib/dates";
import { uid } from "../store";

interface Props {
  trip: Trip;
  destination: City;
  hotels: Hotel[];
  onChange: (h: Hotel[]) => void;
  selectedId?: string;
  onSelect: (id: string | undefined) => void;
}

export default function Hotels({ trip, destination, hotels, onChange, selectedId, onSelect }: Props) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [rating, setRating] = useState("");
  const [link, setLink] = useState("");

  const nights = nightsBetween(trip.departDate, trip.returnDate);
  const rooms = Math.ceil(trip.travelers / 2);
  const sorted = [...hotels].sort((a, b) => a.pricePerNight - b.pricePerNight);
  const cheapest = sorted[0];

  const add = () => {
    const p = parseFloat(price);
    if (!name.trim() || !(p > 0)) return;
    onChange([...hotels, { id: uid(), name: name.trim(), pricePerNight: p, rating: rating ? +rating : undefined, link: link.trim() || undefined }]);
    setName("");
    setPrice("");
    setRating("");
    setLink("");
  };

  return (
    <>
      <section className="card">
        <div className="stat-label">Média em {destination.name}</div>
        <div className="stat">
          {brl(destination.hotelAvg)}
          <small>por noite</small>
        </div>
        <div className="chips">
          <span className="chip">
            <b>{nights}</b> noite(s)
          </span>
          <span className="chip">
            <b>{rooms}</b> quarto(s)
          </span>
        </div>
      </section>
      {hotels.length === 0 ? (
        <p className="muted">Adicione hotéis para comparar o custo total da estadia.</p>
      ) : (
        <ul className="list">
          {sorted.map((h) => {
            const total = h.pricePerNight * nights * rooms;
            const vsAvg = Math.round(((h.pricePerNight - destination.hotelAvg) / destination.hotelAvg) * 100);
            const selected = selectedId === h.id;
            return (
              <li key={h.id} className={`item${selected ? " selected" : ""}`}>
                <div>
                  <div className="name">{h.name}</div>
                  <div className="muted">
                    {brl(h.pricePerNight)}/noite
                    {h.rating !== undefined && ` · nota ${h.rating}`}
                  </div>
                </div>
                <div>
                  <div className="price">{brl(total)}</div>
                  <div className="muted" style={{ textAlign: "right" }}>
                    estadia
                  </div>
                </div>
                <div className="sub">
                  {h === cheapest && hotels.length > 1 && <span className="pill">mais barato</span>}
                  <span className={`pill${vsAvg > 0 ? " warn" : ""}`}>
                    {vsAvg >= 0 ? "+" : ""}
                    {vsAvg}% vs média
                  </span>
                  {h.link && (
                    <a href={h.link} target="_blank" rel="noreferrer noopener">
                      reservar
                    </a>
                  )}
                </div>
                <div className="actions">
                  <button className={`secondary${selected ? " on" : ""}`} onClick={() => onSelect(selected ? undefined : h.id)}>
                    {selected ? "Escolhido ✓" : "Escolher"}
                  </button>
                  <button className="ghost" aria-label={`Remover ${h.name}`} onClick={() => onChange(hotels.filter((x) => x.id !== h.id))}>
                    ✕
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <section className="card">
        <h3>Adicionar hotel</h3>
        <div className="form">
          <label>
            Nome
            <input id="hotel-name" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            Diária (R$)
            <input id="hotel-price" type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
          </label>
          <label>
            Nota (0 a 10)
            <input id="hotel-rating" type="number" min={0} max={10} step={0.1} value={rating} onChange={(e) => setRating(e.target.value)} />
          </label>
          <label>
            Link da reserva
            <input id="hotel-link" value={link} onChange={(e) => setLink(e.target.value)} />
          </label>
        </div>
        <button style={{ marginTop: 12, width: "100%" }} onClick={add}>
          Adicionar
        </button>
      </section>
    </>
  );
}
