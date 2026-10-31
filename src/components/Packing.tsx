import { useState } from "react";
import { PackCategory, PackItem, Trip } from "../types";
import { City } from "../lib/cities";
import { PACK_CATEGORIES, climateFor, suggestItems, syncSuggestions } from "../lib/packing";
import { nightsBetween } from "../lib/dates";
import { uid } from "../store";

const CLIMATE = { cold: "frio", mild: "ameno", warm: "quente" } as const;

interface Props {
  trip: Trip;
  origin: City;
  destination: City;
  items: PackItem[];
  onChange: (items: PackItem[]) => void;
}

export default function Packing({ trip, origin, destination, items, onChange }: Props) {
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState<PackCategory>("Extras");

  const nights = nightsBetween(trip.departDate, trip.returnDate);
  const climate = CLIMATE[climateFor(destination, trip.departDate)];
  const packed = items.filter((i) => i.packed).length;
  const pct = items.length ? (packed / items.length) * 100 : 0;
  const generate = () => onChange(syncSuggestions(items, suggestItems(trip, origin, destination)));
  const toggle = (id: string) => onChange(items.map((i) => (i.id === id ? { ...i, packed: !i.packed } : i)));
  const add = () => {
    if (!label.trim()) return;
    onChange([...items, { id: uid(), label: label.trim(), category, packed: false }]);
    setLabel("");
  };

  return (
    <>
      <section className="card">
        <div className="stat-label">Sua mala</div>
        <div className="stat">
          {packed}
          <small>
            de {items.length} itens guardados · {nights} noites em {destination.name}, clima {climate} na época
          </small>
        </div>
        {items.length > 0 && (
          <div className="meter" role="img" aria-label={`${Math.round(pct)}% da mala pronta`}>
            <div style={{ width: `${pct}%` }} />
          </div>
        )}
        {items.length > 0 && packed === items.length && <p className="mood">Mala pronta! Boa viagem.</p>}
        <button className={items.length ? "secondary" : ""} style={{ marginTop: 12, width: "100%" }} onClick={generate}>
          {items.length ? "Atualizar sugestões para esta viagem" : "Gerar lista sugerida"}
        </button>
        {items.length > 0 && (
          <p className="muted" style={{ marginTop: 8 }}>
            Atualizar muda as quantidades e inclui sugestões que faltam. Seus itens e o que já foi marcado ficam como estão.
          </p>
        )}
      </section>

      {PACK_CATEGORIES.map((cat) => {
        const list = items.filter((i) => i.category === cat);
        if (list.length === 0) return null;
        const done = list.filter((i) => i.packed).length;
        return (
          <section className="card" key={cat}>
            <h3>
              {cat} <span className="count">{done}/{list.length}</span>
            </h3>
            <ul className="checklist">
              {list.map((i) => (
                <li key={i.id}>
                  <button type="button" role="checkbox" aria-checked={i.packed} className={`check${i.packed ? " on" : ""}`} onClick={() => toggle(i.id)}>
                    <span className="box" aria-hidden="true">
                      {i.packed && (
                        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 8.5l3.2 3L13 4.5" />
                        </svg>
                      )}
                    </span>
                    <span className="lbl">{i.label}</span>
                  </button>
                  <button className="ghost" aria-label={`Remover ${i.label}`} onClick={() => onChange(items.filter((x) => x.id !== i.id))}>
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <section className="card">
        <h3>Adicionar item</h3>
        <div className="form">
          <label>
            Item
            <input id="pack-label" value={label} onChange={(e) => setLabel(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
          </label>
          <label>
            Categoria
            <select id="pack-cat" value={category} onChange={(e) => setCategory(e.target.value as PackCategory)}>
              {PACK_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>
        <button style={{ marginTop: 12, width: "100%" }} onClick={add}>
          Adicionar
        </button>
      </section>
    </>
  );
}
