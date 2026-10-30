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
    <section>
      <div className="card">
        <p>
          {nights} noite(s) · {rooms} quarto(s) · média em {destination.name}: <strong>{brl(destination.hotelAvg)}</strong>/noite
        </p>
        <div className="form">
          <input placeholder="Nome do hotel" value={name} onChange={(e) => setName(e.target.value)} />
          <input placeholder="Diária (R$)" type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
          <input placeholder="Nota (0–10)" type="number" min={0} max={10} step={0.1} value={rating} onChange={(e) => setRating(e.target.value)} />
          <input placeholder="Link da reserva (opcional)" value={link} onChange={(e) => setLink(e.target.value)} />
          <button onClick={add}>Adicionar</button>
        </div>
      </div>
      {hotels.length === 0 && <p className="muted">Adicione hotéis para comparar o custo total da estadia.</p>}
      <ul className="list">
        {sorted.map((h) => {
          const total = h.pricePerNight * nights * rooms;
          const vsAvg = Math.round(((h.pricePerNight - destination.hotelAvg) / destination.hotelAvg) * 100);
          return (
            <li key={h.id} className={selectedId === h.id ? "selected" : ""}>
              <div>
                <strong>{h.name}</strong> {h === cheapest && <span className="tag">mais barato</span>}
                <div className="muted">
                  {brl(h.pricePerNight)}/noite ({vsAvg >= 0 ? "+" : ""}
                  {vsAvg}% vs média){h.rating !== undefined && ` · nota ${h.rating}`}
                  {h.link && (
                    <>
                      {" · "}
                      <a href={h.link} target="_blank" rel="noreferrer noopener">
                        reservar
                      </a>
                    </>
                  )}
                </div>
              </div>
              <div className="right">
                <strong>{brl(total)}</strong>
                <button onClick={() => onSelect(selectedId === h.id ? undefined : h.id)}>
                  {selectedId === h.id ? "Escolhido ✓" : "Escolher"}
                </button>
                <button className="ghost" onClick={() => onChange(hotels.filter((x) => x.id !== h.id))}>
                  ✕
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
