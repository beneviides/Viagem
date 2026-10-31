import { useState } from "react";
import { PackCategory, PackItem, Trip } from "../types";
import { City } from "../lib/cities";
import { PACK_CATEGORIES, climateFor, suggestItems, syncSuggestions } from "../lib/packing";
import { nightsBetween } from "../lib/dates";
import { uid } from "../store";

const CLIMATE = { cold: "frio ❄️", mild: "ameno ⛅", warm: "quente ☀️" } as const;

const CAT_ICONS: Record<PackCategory, string> = {
  Documentos: "📄",
  Roupas: "👕",
  Higiene: "🧴",
  Saúde: "💊",
  Eletrônicos: "🔌",
  Extras: "✨",
};

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
  const [filter, setFilter] = useState<"all" | "pending" | "packed">("all");

  const nights = nightsBetween(trip.departDate, trip.returnDate);
  const climate = CLIMATE[climateFor(destination, trip.departDate)];
  const packed = items.filter((i) => i.packed).length;
  const pending = items.length - packed;
  const pct = items.length ? Math.round((packed / items.length) * 100) : 0;
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
        <div className="stat-label">Checklist da Mala de Férias</div>
        <div className="stat">
          {packed} <span style={{ fontSize: 26, fontWeight: 600, color: "var(--muted)" }}>/ {items.length} itens</span>
          <small>
            {pct}% organizado · {nights} {nights === 1 ? "noite" : "noites"} em {destination.name} (clima {climate})
          </small>
        </div>

        {items.length > 0 && (
          <div className="meter" role="img" aria-label={`${pct}% da mala pronta`}>
            <div style={{ width: `${pct}%` }} />
          </div>
        )}

        {items.length > 0 && packed === items.length && (
          <div className="mood" style={{ background: "linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(245, 158, 11, 0.15))", borderColor: "var(--ok)" }}>
            <span>🎉 Sensacional! 100% da mala organizada e pronta para as férias! 🏖️✈️</span>
          </div>
        )}

        {/* Filtros da Mala */}
        {items.length > 0 && (
          <div className="seg-toggle" style={{ marginTop: 14 }}>
            <button
              type="button"
              className={filter === "all" ? "on" : ""}
              onClick={() => setFilter("all")}
            >
              Todos ({items.length})
            </button>
            <button
              type="button"
              className={filter === "pending" ? "on" : ""}
              onClick={() => setFilter("pending")}
            >
              Pendentes ({pending})
            </button>
            <button
              type="button"
              className={filter === "packed" ? "on" : ""}
              onClick={() => setFilter("packed")}
            >
              Na Mala ({packed})
            </button>
          </div>
        )}

        <button
          className={items.length ? "secondary" : ""}
          style={{ marginTop: 14, width: "100%" }}
          onClick={generate}
        >
          {items.length ? "✨ Recalcular sugestões inteligentes para esta viagem" : "🧳 Gerar lista automática sugerida"}
        </button>

        {items.length > 0 && (
          <p className="muted" style={{ marginTop: 10 }}>
            A lista sugerida leva em conta o número de noites, o clima do destino e itens essenciais de viagem. Seus itens manuais e marcações são preservados.
          </p>
        )}
      </section>

      {PACK_CATEGORIES.map((cat) => {
        const catItems = items.filter((i) => i.category === cat);
        const list = catItems.filter((i) => {
          if (filter === "pending") return !i.packed;
          if (filter === "packed") return i.packed;
          return true;
        });
        if (list.length === 0) return null;
        const done = catItems.filter((i) => i.packed).length;
        const allDone = done === catItems.length && catItems.length > 0;

        return (
          <section className="card" key={cat}>
            <h3>
              <span>
                {CAT_ICONS[cat]} {cat}
              </span>
              <span className="count" style={allDone ? { background: "var(--ok-bg)", color: "var(--ok)" } : undefined}>
                {allDone ? "✓ Completo " : ""}{done}/{list.length}
              </span>
            </h3>

            <ul className="checklist">
              {list.map((i) => (
                <li key={i.id}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={i.packed}
                    className={`check${i.packed ? " on" : ""}`}
                    onClick={() => toggle(i.id)}
                  >
                    <span className="box" aria-hidden="true">
                      {i.packed && (
                        <svg
                          viewBox="0 0 16 16"
                          width="14"
                          height="14"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 8.5l3.2 3L13 4.5" />
                        </svg>
                      )}
                    </span>
                    <span className="lbl">{i.label}</span>
                  </button>

                  <button
                    className="ghost"
                    aria-label={`Remover ${i.label}`}
                    title="Remover item"
                    onClick={() => onChange(items.filter((x) => x.id !== i.id))}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <section className="card">
        <h3>➕ Adicionar Novo Item à Mala</h3>
        <div className="form">
          <label>
            Descrição do Item
            <input
              id="pack-label"
              placeholder="Ex: Protetor solar FPS 50, Passaporte, Adaptador universal..."
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
            />
          </label>
          <label>
            Categoria
            <select
              id="pack-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value as PackCategory)}
            >
              {PACK_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CAT_ICONS[c]} {c}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button style={{ marginTop: 14, width: "100%" }} onClick={add}>
          + Adicionar Item
        </button>
      </section>
    </>
  );
}
