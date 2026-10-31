import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, ItineraryDay, Trip } from "../types";
import { brl, eachDay, fmtParts } from "../lib/dates";
import { outsideRange } from "../lib/itinerary";
import { uid } from "../store";
import { getCityForDate, getResolvedLegs, getTransferInfo, TRANSPORT_INFO } from "../lib/legs";

interface Props {
  trip: Trip;
  days: ItineraryDay[];
  onChange: (d: ItineraryDay[]) => void;
}

const CITY_QUICK_ACTIVITIES: Record<string, { label: string; cost: number }[]> = {
  AJU: [
    { label: "🦀 Almoço na Passarela do Caranguejo", cost: 65 },
    { label: "🏖️ Tarde na Praia de Aruana & Orla", cost: 0 },
    { label: "🏝️ Passeio de Barco Croa do Goré", cost: 85 },
    { label: "🏛️ Museu da Gente Sergipana", cost: 0 },
    { label: "🌅 Pôr do Sol na Orla de Atalaia", cost: 0 },
    { label: "🥥 Água de coco nos lagos da Orla", cost: 10 },
  ],
  SSA: [
    { label: "🏛️ Pelourinho & Casa de Jorge Amado", cost: 30 },
    { label: "🍤 Acarajé no Rio Vermelho", cost: 25 },
    { label: "🌅 Pôr do Sol no Farol da Barra", cost: 15 },
    { label: "⛪ Igreja de Nosso Senhor do Bonfim", cost: 0 },
    { label: "🥥 Elevador Lacerda & Mercado Modelo", cost: 10 },
    { label: "🥁 Olodum / Noite de Samba", cost: 40 },
  ],
  REC: [
    { label: "🏛️ Marco Zero & Recife Antigo", cost: 0 },
    { label: "🎭 Bonecos Gigantes de Olinda", cost: 20 },
    { label: "🏖️ Praia de Boa Viagem", cost: 0 },
    { label: "🏰 Instituto Ricardo Brennand", cost: 50 },
  ],
  FOR: [
    { label: "🏖️ Barraca na Praia do Futuro", cost: 60 },
    { label: "🎢 Beach Park (Dia inteiro)", cost: 280 },
    { label: "🌅 Pôr do sol no Espigão de Iracema", cost: 0 },
    { label: "🛍️ Mercado Central & Feirinha", cost: 0 },
  ],
  GIG: [
    { label: "⛰️ Cristo Redentor & Corcovado", cost: 95 },
    { label: "🚡 Bondinho do Pão de Açúcar", cost: 140 },
    { label: "🏖️ Praia de Ipanema (Posto 9)", cost: 0 },
    { label: "🌿 Jardim Botânico do Rio", cost: 30 },
  ],
  GRU: [
    { label: "🌳 Piquenique no Parque Ibirapuera", cost: 0 },
    { label: "🎨 Beco do Batman & Vila Madalena", cost: 0 },
    { label: "🏛️ MASP na Avenida Paulista", cost: 60 },
    { label: "🥪 Pastel e Sanduíche de Mortadela no Mercadão", cost: 50 },
  ],
};

const GENERAL_QUICK = [
  "☕ Café da manhã reforçado",
  "🏖️ Praia e banho de mar",
  "🍽️ Almoço típico regional",
  "🏛️ Museu & Passeio histórico",
  "🌅 Pôr do sol com água de coco",
  "🍷 Jantar especial & música",
];

const FUN_VACATION_MISSIONS = [
  "🦀 Missão do dia: Comer caranguejo usando o martelinho sem quebrar o prato!",
  "🌶️ Missão do dia: Pedir um acarajé 'com pimenta' e não fazer careta!",
  "🥥 Missão do dia: Tomar água de coco bem gelada fingindo ser morador local!",
  "😴 Missão do dia: Tirar um cochilo sagrado de 30 minutos ouvindo o barulho das ondas!",
  "📸 Missão do dia: Tirar uma selfie clássica segurando o sol no horizonte!",
  "💃 Missão do dia: Arriscar dois passos de forró pé-de-serra sem vergonha nenhuma!",
  "🧳 Missão do dia: Comprar a lembrancinha mais cafona da feirinha para a geladeira!",
  "🍦 Missão do dia: Provar um sorvete de sabor regional que você nunca ouviu falar!",
];

export default function Itinerary({ trip, days, onChange }: Props) {
  const dates = eachDay(trip.departDate, trip.returnDate);
  const byDate = new Map(days.map((d) => [d.date, d]));
  const legs = getResolvedLegs(trip);
  const isMulti = legs.length > 1;

  // Filtro de etapa/cidade (para viagens de múltiplos destinos)
  const [selectedLegId, setSelectedLegId] = useState<string>("all");
  const [funMission, setFunMission] = useState<string | null>(null);

  // Calcula atividades e custo total
  const totalActivities = days.reduce((s, d) => s + d.activities.length, 0);
  const totalCost = days.reduce(
    (s, d) => s + d.activities.reduce((sum, a) => sum + (a.cost || 0), 0),
    0
  );

  const update = (date: string, fn: (a: Activity[]) => Activity[]) => {
    const current = byDate.get(date)?.activities ?? [];
    onChange([...days.filter((d) => d.date !== date), { date, activities: fn(current) }]);
  };

  const orphans = outsideRange(days, trip.departDate, trip.returnDate);
  const orphanCount = orphans.reduce((s, d) => s + d.activities.length, 0);

  // Filtra as datas exibidas de acordo com a etapa selecionada
  const filteredDates = dates.filter((d) => {
    if (selectedLegId === "all") return true;
    const currentLeg = legs.find((l) => l.id === selectedLegId);
    if (!currentLeg) return true;
    return d >= currentLeg.startDate && d <= currentLeg.endDate;
  });

  const pickFunMission = () => {
    const random = FUN_VACATION_MISSIONS[Math.floor(Math.random() * FUN_VACATION_MISSIONS.length)];
    setFunMission(random);
  };

  return (
    <>
      {orphans.length > 0 && (
        <section className="card notice" role="alert">
          <p>
            ⚠️ <b>{orphanCount} atividade(s)</b> em {orphans.length} dia(s) fora das datas da viagem atual.
          </p>
          <button
            className="secondary"
            style={{ marginTop: 10 }}
            onClick={() => onChange(days.filter((d) => !orphans.includes(d)))}
          >
            Descartar atividades fora do período
          </button>
        </section>
      )}

      {/* Barra de Resumo e Filtro do Roteiro */}
      <section className="card itinerary-summary-card">
        <div className="itinerary-summary-header">
          <div>
            <div className="stat-label">Planejamento do Roteiro</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--ink)" }}>
              {dates.length} {dates.length === 1 ? "dia" : "dias"} · {totalActivities}{" "}
              {totalActivities === 1 ? "atividade" : "atividades"}
            </h2>
          </div>
          <div style={{ textAlign: "right" }}>
            <span className="stat-label">Total em Passeios</span>
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--brand)" }}>
              {brl(totalCost)} <small style={{ fontSize: 11, fontWeight: 500, color: "var(--muted)" }}>/ pessoa</small>
            </div>
          </div>
        </div>

        {/* Easter Egg Divertido: Missão Engraçadinha de Férias */}
        <div style={{ marginTop: 14 }}>
          <AnimatePresence mode="wait">
            {funMission ? (
              <motion.div
                key={funMission}
                className="fun-mission-banner"
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              >
                <span>{funMission}</span>
                <button
                  type="button"
                  className="fun-mission-btn-mini"
                  onClick={pickFunMission}
                  title="Sortear outro desafio"
                >
                  🎲 Trocar
                </button>
              </motion.div>
            ) : (
              <button
                type="button"
                className="fun-mission-trigger"
                onClick={pickFunMission}
              >
                <span>🎲 Clique aqui para sortear uma Missão Divertida do Dia!</span>
              </button>
            )}
          </AnimatePresence>
        </div>

        {/* Filtro por Paradas/Cidades quando viagem tem mais de um destino */}
        {isMulti && (
          <div className="itinerary-leg-filter">
            <span className="itinerary-filter-label">Filtrar por parada:</span>
            <div className="itinerary-filter-chips">
              <button
                type="button"
                className={`itinerary-filter-chip${selectedLegId === "all" ? " active" : ""}`}
                onClick={() => setSelectedLegId("all")}
              >
                Ver Todas ({dates.length} dias)
              </button>
              {legs.map((leg, i) => (
                <button
                  key={leg.id}
                  type="button"
                  className={`itinerary-filter-chip${selectedLegId === leg.id ? " active" : ""}`}
                  onClick={() => setSelectedLegId(leg.id)}
                >
                  <span>{TRANSPORT_INFO[leg.transport].icon}</span>
                  <span>
                    {i + 1}ª: {leg.destinationCity.name} ({leg.nights}d)
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Lista Limpa e Estruturada dos Dias com transição suave */}
      <div className="itinerary-days-list">
        <AnimatePresence mode="popLayout">
          {filteredDates.map((date, idx) => {
            // Encontra o índice global do dia (1 a total)
            const globalDayIndex = dates.indexOf(date) + 1;
            const isFirstDay = globalDayIndex === 1;
            const isLastDay = globalDayIndex === dates.length;

            return (
              <DayCard
                key={date}
                trip={trip}
                dayIndex={globalDayIndex}
                staggerIndex={idx}
                date={date}
                isFirstDay={isFirstDay}
                isLastDay={isLastDay}
                activities={byDate.get(date)?.activities ?? []}
                onAdd={(a) =>
                  update(date, (list) =>
                    [...list, a].sort((x, y) => (x.time ?? "99").localeCompare(y.time ?? "99"))
                  )
                }
                onRemove={(id) => update(date, (list) => list.filter((a) => a.id !== id))}
              />
            );
          })}
        </AnimatePresence>
      </div>
    </>
  );
}

function DayCard(props: {
  trip: Trip;
  dayIndex: number;
  staggerIndex?: number;
  date: string;
  isFirstDay: boolean;
  isLastDay: boolean;
  activities: Activity[];
  onAdd: (a: Activity) => void;
  onRemove: (id: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [time, setTime] = useState("");
  const [title, setTitle] = useState("");
  const [cost, setCost] = useState("");
  const [justAddedAlert, setJustAddedAlert] = useState<string | null>(null);

  const total = props.activities.reduce((s, a) => s + (a.cost || 0), 0);
  const p = fmtParts(props.date);

  const city = getCityForDate(props.trip, props.date);
  const transfer = getTransferInfo(props.trip, props.date);
  const localSuggestions = CITY_QUICK_ACTIVITIES[city.code] || [];

  const add = () => {
    if (!title.trim()) return;
    const itemCost = parseFloat(cost) || 0;
    props.onAdd({
      id: uid(),
      time: time || undefined,
      title: title.trim(),
      cost: itemCost,
    });
    setTime("");
    setTitle("");
    setCost("");
    triggerAddFeedback(`"${title.trim()}" adicionado! 🎉`);
  };

  const addSuggested = (label: string, defaultCost: number) => {
    props.onAdd({
      id: uid(),
      title: label,
      cost: defaultCost,
    });
    triggerAddFeedback(`${label} adicionado ao roteiro! ✨`);
  };

  const triggerAddFeedback = (msg: string) => {
    setJustAddedAlert(msg);
    setTimeout(() => setJustAddedAlert(null), 2500);
  };

  return (
    <motion.article
      className="day-card"
      aria-label={`Roteiro do Dia ${props.dayIndex}: ${p.day} de ${p.month}`}
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      transition={{
        duration: 0.3,
        delay: Math.min((props.staggerIndex ?? 0) * 0.035, 0.25),
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {/* Cabeçalho do Dia (Clicável para expandir/recolher) */}
      <div
        className="day-card-header"
        onClick={() => setIsOpen(!isOpen)}
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
      >
        <div className="day-card-header-left">
          <div className="day-badge">DIA {props.dayIndex < 10 ? `0${props.dayIndex}` : props.dayIndex}</div>
          <div className="day-date-info">
            <span className="day-date-title">
              {p.weekday}, {p.day} de {p.month}
            </span>
            <div className="day-city-tag">
              <span>📍 {city.name}</span>
              {props.isFirstDay && <span className="day-tag-pill special">Chegada 🎉</span>}
              {props.isLastDay && <span className="day-tag-pill special">Retorno 🧳</span>}
              {transfer && <span className="day-tag-pill transfer">Deslocamento ⇄</span>}
            </div>
          </div>
        </div>

        <div className="day-card-header-right">
          {total > 0 && (
            <span className="day-cost-pill" title="Custo total previsto para este dia">
              {brl(total)}
            </span>
          )}
          <span className="day-activities-count">
            {props.activities.length === 0
              ? "Dia livre 🌴"
              : `${props.activities.length} ${props.activities.length === 1 ? "atividade" : "atividades"}`}
          </span>
          <span className={`day-chevron${isOpen ? " open" : ""}`} aria-hidden="true">
            ▾
          </span>
        </div>
      </div>

      {/* Conteúdo do Dia */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            className="day-card-body"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: "hidden" }}
          >
            {/* Banner de Deslocamento entre cidades (se for dia de transição) */}
            {transfer && (
              <div className="day-transit-banner">
                <div className="transit-icon-moving">
                  <span>{TRANSPORT_INFO[transfer.transport].icon}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>
                    Dia de Deslocamento via {TRANSPORT_INFO[transfer.transport].label}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.9 }}>
                    {transfer.originCity.name} ➔ {transfer.destinationCity.name} · {transfer.nights} noites de estadia a seguir
                  </div>
                </div>
              </div>
            )}

            {/* Feedback de Atividade Adicionada */}
            <AnimatePresence>
              {justAddedAlert && (
                <motion.div
                  className="day-feedback-toast"
                  role="status"
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                >
                  {justAddedAlert}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Linha do Tempo das Atividades com animação suave de fade-in e slide-up */}
            {props.activities.length === 0 ? (
              <div className="day-empty-box">
                <span style={{ fontSize: 28 }}>🏖️</span>
                <p style={{ margin: "4px 0", fontSize: 13, color: "var(--muted)" }}>
                  Nenhuma atividade marcada para este dia em <b>{city.name}</b>.
                </p>
                <button
                  type="button"
                  className="day-add-cta-btn"
                  onClick={() => setShowAddForm(true)}
                >
                  + Adicionar Atividade ou Ver Sugestões
                </button>
              </div>
            ) : (
              <div className="day-timeline">
                <AnimatePresence initial={false}>
                  {props.activities.map((a, idx) => (
                    <motion.div
                      key={a.id}
                      className="day-timeline-item"
                      layout
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{
                        duration: 0.26,
                        delay: Math.min(idx * 0.03, 0.2),
                        ease: [0.16, 1, 0.3, 1],
                      }}
                    >
                      <div className="timeline-node">
                        <span className="timeline-dot" />
                      </div>
                      <div className="timeline-content">
                        <div className="timeline-title-row">
                          {a.time && <span className="timeline-time-badge">{a.time}</span>}
                          <span className="timeline-activity-name">{a.title}</span>
                        </div>
                      </div>
                      <div className="timeline-actions">
                        {a.cost > 0 ? (
                          <span className="timeline-price-tag">{brl(a.cost)}</span>
                        ) : (
                          <span className="timeline-free-tag">Grátis</span>
                        )}
                        <button
                          type="button"
                          className="timeline-delete-btn"
                          onClick={() => props.onRemove(a.id)}
                          aria-label={`Remover ${a.title}`}
                          title="Remover atividade"
                        >
                          ✕
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* Botão de Abrir Gaveta de Adicionar (se já houver atividades) */}
            {props.activities.length > 0 && !showAddForm && (
              <button
                type="button"
                className="day-toggle-add-btn"
                onClick={() => setShowAddForm(true)}
              >
                + Adicionar Atividade ou Sugestão em {city.name}
              </button>
            )}

            {/* Gaveta de Adicionar Atividade */}
            <AnimatePresence>
              {showAddForm && (
                <motion.div
                  className="day-add-drawer"
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.98 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="day-add-drawer-top">
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--brand)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      Adicionar ao Roteiro em {city.name}
                    </span>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => setShowAddForm(false)}
                      style={{ fontSize: 12, padding: "2px 8px" }}
                    >
                      Fechar ✕
                    </button>
                  </div>

                  {/* Sugestões Populares Locais */}
                  {localSuggestions.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 6 }}>
                        ✨ Destaques em {city.name} (clique para adicionar):
                      </div>
                      <div className="day-suggestions-grid">
                        {localSuggestions.map((s) => (
                          <button
                            key={s.label}
                            type="button"
                            className="day-suggestion-chip"
                            onClick={() => addSuggested(s.label, s.cost)}
                            title={`Adicionar ${s.label}`}
                          >
                            <span>{s.label}</span>
                            <span className="chip-cost">{s.cost > 0 ? brl(s.cost) : "Grátis"}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Atalhos Gerais Rápidos */}
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 6 }}>
                      Atalhos Rápidos:
                    </div>
                    <div className="day-quick-chips">
                      {GENERAL_QUICK.map((q) => (
                        <button
                          key={q}
                          type="button"
                          className="day-quick-chip"
                          onClick={() => setTitle(q)}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Formulário Personalizado */}
                  <div className="day-custom-form" style={{ marginTop: 12 }}>
                    <div className="day-input-group time">
                      <label htmlFor={`time-${props.date}`} style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)" }}>
                        Horário
                      </label>
                      <input
                        id={`time-${props.date}`}
                        type="time"
                        aria-label="Horário da atividade"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                      />
                    </div>

                    <div className="day-input-group title">
                      <label htmlFor={`title-${props.date}`} style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)" }}>
                        Atividade ou Passeio
                      </label>
                      <input
                        id={`title-${props.date}`}
                        placeholder={`Ex: Caminhada na praia de ${city.name}...`}
                        aria-label="Descrição da atividade"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && add()}
                      />
                    </div>

                    <div className="day-input-group cost">
                      <label htmlFor={`cost-${props.date}`} style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)" }}>
                        R$ / pessoa
                      </label>
                      <input
                        id={`cost-${props.date}`}
                        placeholder="0,00"
                        aria-label="Custo por pessoa"
                        type="number"
                        min={0}
                        value={cost}
                        onChange={(e) => setCost(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && add()}
                      />
                    </div>

                    <button
                      type="button"
                      className="day-submit-btn"
                      onClick={add}
                      title="Salvar atividade no dia"
                    >
                      + Salvar
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}
