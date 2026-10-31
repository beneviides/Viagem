import { useEffect, useRef, useState } from "react";
import { City } from "../lib/cities";
import { Trip } from "../types";
import { countdownLabel, fmtParts } from "../lib/dates";
import { getResolvedLegs, ResolvedLeg, TRANSPORT_INFO } from "../lib/legs";

const place = (c: City) =>
  c.airport ? (
    <>
      {c.area}
      <br />
      {c.airport}
    </>
  ) : (
    c.name
  );

const short = (iso: string) => {
  const p = fmtParts(iso);
  return `${p.day} ${p.month}`;
};

interface Props {
  trip: Trip;
  origin: City;
  destination: City;
  tripCount: number;
  onOpenTrips: () => void;
  onAddLeg?: () => void;
  onSelectTab?: (tab: string) => void;
  dark?: boolean;
  onToggleTheme?: () => void;
}

export default function Pass({
  trip,
  origin: _origin,
  destination: _destination,
  tripCount,
  onOpenTrips,
  onAddLeg,
  onSelectTab: _onSelectTab,
  dark,
  onToggleTheme,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const [activeLegIndex, setActiveLegIndex] = useState(0);

  const resolvedLegs = getResolvedLegs(trip);
  const totalLegs = resolvedLegs.length;
  const isMulti = totalLegs > 1;

  useEffect(() => {
    if (activeLegIndex >= totalLegs) {
      setActiveLegIndex(Math.max(0, totalLegs - 1));
    }
  }, [totalLegs, activeLegIndex]);

  const scrollToLeg = (index: number) => {
    if (!trackRef.current) return;
    const track = trackRef.current;
    const itemWidth = track.clientWidth;
    isScrollingRef.current = true;
    track.scrollTo({ left: index * itemWidth, behavior: "smooth" });
    setActiveLegIndex(index);
    setTimeout(() => {
      isScrollingRef.current = false;
    }, 200);
  };

  const handleScroll = () => {
    if (!trackRef.current || isScrollingRef.current) return;
    const track = trackRef.current;
    const itemWidth = track.clientWidth;
    if (itemWidth === 0) return;

    const newIndex = Math.round(track.scrollLeft / itemWidth);
    if (newIndex >= 0 && newIndex !== activeLegIndex) {
      setActiveLegIndex(newIndex);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      scrollToLeg(Math.max(0, activeLegIndex - 1));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      scrollToLeg(Math.min(totalLegs - (onAddLeg ? 0 : 1), activeLegIndex + 1));
    }
  };

  return (
    <div
      className="pass-carousel-container"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-roledescription="carousel"
      aria-label="Cartões de embarque das paradas"
    >
      {/* Indicador de Paradas (apenas se houver mais de uma) */}
      {isMulti && (
        <div className="pass-deck-header-clean">
          <span>
            Parada {activeLegIndex + 1} de {totalLegs}: <b>{resolvedLegs[activeLegIndex]?.destinationCity.name}</b>
          </span>
          <span className="muted" style={{ fontSize: 11 }}>
            Deslize para o lado ⇄
          </span>
        </div>
      )}

      {/* Faixa deslizável contendo cada parada */}
      <div
        ref={trackRef}
        className="pass-carousel-track"
        onScroll={handleScroll}
        role="group"
        aria-roledescription="slide"
        aria-label="Cartões de embarque"
      >
        {resolvedLegs.map((leg, index) => (
          <div
            key={leg.id}
            className="pass-carousel-item"
            style={{
              transform: activeLegIndex === index ? "scale(1)" : "scale(0.985)",
              opacity: activeLegIndex === index ? 1 : 0.88,
            }}
          >
            <SingleLegCard
              leg={leg}
              legIndex={index}
              totalLegs={totalLegs}
              trip={trip}
              tripCount={tripCount}
              onOpenTrips={onOpenTrips}
              dark={dark}
              onToggleTheme={onToggleTheme}
            />
          </div>
        ))}

        {/* Cartão de Adicionar Parada */}
        {onAddLeg && (
          <div className="pass-carousel-item" style={{ maxWidth: "100%" }}>
            <div
              className="pass-add-card"
              onClick={onAddLeg}
              role="button"
              tabIndex={0}
              title="Adicionar mais uma cidade à viagem"
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: "var(--surface-hover)",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 20,
                  border: "1px solid var(--line)",
                }}
              >
                +
              </div>
              <div style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>
                Adicionar Outra Parada
              </div>
              <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                Divida suas férias em mais de um destino com cartão de embarque próprio.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Controles de Navegação (Pontos e Setas) */}
      {(totalLegs > 1 || onAddLeg) && (
        <div className="pass-deck-controls">
          <div className="pass-deck-dots">
            {resolvedLegs.map((leg, index) => (
              <button
                key={leg.id}
                type="button"
                className={`pass-deck-dot${activeLegIndex === index ? " active" : ""}`}
                onClick={() => scrollToLeg(index)}
                aria-label={`Ir para parada ${index + 1}: ${leg.destinationCity.name}`}
              />
            ))}
            {onAddLeg && (
              <button
                type="button"
                className={`pass-deck-dot${activeLegIndex === totalLegs ? " active" : ""}`}
                onClick={() => scrollToLeg(totalLegs)}
                aria-label="Adicionar parada"
                style={{ borderRadius: 3 }}
              />
            )}
          </div>

          <div className="pass-deck-nav-btns">
            <button
              type="button"
              className="pass-deck-nav-btn"
              disabled={activeLegIndex <= 0}
              onClick={() => scrollToLeg(activeLegIndex - 1)}
              aria-label="Anterior"
            >
              ‹
            </button>
            <button
              type="button"
              className="pass-deck-nav-btn"
              disabled={activeLegIndex >= totalLegs - (onAddLeg ? 0 : 1)}
              onClick={() => scrollToLeg(activeLegIndex + 1)}
              aria-label="Próximo"
            >
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Renderiza o cartão de embarque limpo, moderno e profissional */
function SingleLegCard({
  leg,
  legIndex,
  totalLegs,
  trip,
  tripCount,
  onOpenTrips,
  dark,
  onToggleTheme,
}: {
  leg: ResolvedLeg;
  legIndex: number;
  totalLegs: number;
  trip: Trip;
  tripCount: number;
  onOpenTrips: () => void;
  dark?: boolean;
  onToggleTheme?: () => void;
}) {
  const origin = leg.originCity;
  const destination = leg.destinationCity;
  const transportMeta = TRANSPORT_INFO[leg.transport] || TRANSPORT_INFO.aviao;
  const isMulti = totalLegs > 1;
  const countdown = countdownLabel(leg.startDate, leg.endDate);
  const [isFlying, setIsFlying] = useState(false);
  const [funQuote, setFunQuote] = useState<string | null>(null);
  const quoteTimeoutRef = useRef<number | null>(null);

  const triggerFunFlight = () => {
    setIsFlying(true);
    const quotes =
      leg.transport === "onibus"
        ? [
            "Ônibus com ar no 15°C: traz o casaco! 🚌❄️",
            "Pé na estrada ouvindo uma playlist de férias! 🎶🛣️",
            "Parada no posto garantida para comer coxinha e pastel! 🥐🤤",
            "Sem pressa e sem trânsito na cabeça! 🌴🛣️",
            "Partiu curtir a estrada com vista incrível! 🏞️✨",
          ]
        : [
            "Apertem os cintos: modo férias 100% ATIVADO! 🏖️🍹",
            "Janelinha é minha! Olha o visual lá embaixo! ☁️🤩",
            "Capitão avisa: turbulência zero e chopp gelado na chegada! 🍻✈️",
            "Sem reunião de trabalho pelos próximos dias, aleluia! 📵✨",
            "Partiu comer caranguejo e acarajé no capricho! 🦀🍤",
            "Chefe, só volto se a bateria do celular acabar! 😂🧳",
            "Alô mãe, cheguei no paraíso! 🥥🌴",
          ];
    const picked = quotes[Math.floor(Math.random() * quotes.length)];
    setFunQuote(picked);

    if (quoteTimeoutRef.current) clearTimeout(quoteTimeoutRef.current);
    quoteTimeoutRef.current = window.setTimeout(() => {
      setFunQuote(null);
      setIsFlying(false);
    }, 3200);
  };

  return (
    <section
      className="pass"
      aria-label={`Cartão de embarque: de ${origin.name} para ${destination.name}`}
    >
      <div className="pass-watermark" aria-hidden="true" />
      
      {/* Topo do Bilhete */}
      <div className="pass-top">
        <button
          type="button"
          className="pass-link"
          onClick={onOpenTrips}
          aria-label="Abrir viagens salvas"
          style={{ maxWidth: "45%", overflow: "hidden" }}
        >
          <span>{transportMeta.icon}</span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {isMulti
              ? `${legIndex + 1}ª Parada: ${destination.name}`
              : (trip.name || `${origin.code} → ${destination.code}`)}
          </span>
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {onToggleTheme && (
            <button
              type="button"
              className="pass-theme-btn"
              onClick={onToggleTheme}
              aria-label={dark ? "Tema claro" : "Tema escuro"}
              title={dark ? "Tema claro" : "Tema escuro"}
            >
              {dark ? "☀️" : "🌙"}
            </button>
          )}

          <button
            type="button"
            className="pass-link"
            onClick={onOpenTrips}
            aria-label={`Viagens salvas (${tripCount})`}
            style={{ fontSize: 11, padding: "2px 8px" }}
          >
            Viagens ({tripCount}) ▾
          </button>

          <span className="pass-badge">{countdown}</span>
        </div>
      </div>

      {/* Rota (Origem ➔ Destino) */}
      <div className="pass-route">
        <div className="leg">
          <span className="code">{origin.code}</span>
          <span className="city">{place(origin)}</span>
        </div>

        <div className="route-line" style={{ position: "relative" }}>
          <i />
          <button
            type="button"
            className={`route-plane-btn${isFlying ? " flying" : ""}`}
            onClick={triggerFunFlight}
            title={`Toque para decolar! ${transportMeta.label}: ${origin.name} → ${destination.name}`}
            aria-label={`Efeito divertido de decolagem com ${transportMeta.label}`}
          >
            <span className="route-plane-icon">{transportMeta.icon}</span>
          </button>
          <i />

          {funQuote && (
            <div className="plane-speech-bubble" role="status">
              {funQuote}
            </div>
          )}
        </div>

        <div className="leg end">
          <span className="code">{destination.code}</span>
          <span className="city">{place(destination)}</span>
        </div>
      </div>

      {/* Detalhes do Trecho */}
      <dl className="pass-stub">
        <div>
          <dt>{isMulti ? "Embarque Trecho" : "Data de Ida"}</dt>
          <dd>{short(leg.startDate)}</dd>
        </div>
        <div>
          <dt>{isMulti ? "Partida Próxima" : "Data de Retorno"}</dt>
          <dd>{short(leg.endDate)}</dd>
        </div>
        <div>
          <dt>Duração</dt>
          <dd>{leg.nights} {leg.nights === 1 ? "noite" : "noites"}</dd>
        </div>
        <div>
          <dt>Transporte</dt>
          <dd style={{ fontSize: 13 }}>
            {transportMeta.icon} {transportMeta.label}
          </dd>
        </div>
      </dl>

      {/* Faixa Inferior com Código de Barras Limpo */}
      <div className="pass-footer-strip">
        <span style={{ fontSize: 10, letterSpacing: "0.08em", opacity: 0.85 }}>
          {leg.transport === "onibus"
            ? `PASSAGEM DE ÔNIBUS · ${destination.name.toUpperCase()}`
            : `BILHETE DE EMBARQUE · ${destination.code} EXPRESS`}
        </span>
        <svg
          className="barcode-svg"
          viewBox="0 0 160 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <rect x="0" y="0" width="3" height="24" />
          <rect x="5" y="0" width="1.5" height="24" />
          <rect x="8" y="0" width="4" height="24" />
          <rect x="14" y="0" width="2" height="24" />
          <rect x="18" y="0" width="5" height="24" />
          <rect x="25" y="0" width="1.5" height="24" />
          <rect x="28" y="0" width="3" height="24" />
          <rect x="33" y="0" width="2" height="24" />
          <rect x="37" y="0" width="4.5" height="24" />
          <rect x="43" y="0" width="1.5" height="24" />
          <rect x="47" y="0" width="3" height="24" />
          <rect x="52" y="0" width="2" height="24" />
          <rect x="56" y="0" width="6" height="24" />
          <rect x="64" y="0" width="2" height="24" />
          <rect x="68" y="0" width="3" height="24" />
          <rect x="73" y="0" width="1.5" height="24" />
          <rect x="76" y="0" width="4" height="24" />
          <rect x="82" y="0" width="2" height="24" />
          <rect x="86" y="0" width="5" height="24" />
          <rect x="93" y="0" width="1.5" height="24" />
          <rect x="96" y="0" width="3" height="24" />
          <rect x="101" y="0" width="4" height="24" />
          <rect x="107" y="0" width="2" height="24" />
          <rect x="111" y="0" width="5" height="24" />
          <rect x="118" y="0" width="1.5" height="24" />
          <rect x="122" y="0" width="3.5" height="24" />
          <rect x="128" y="0" width="2" height="24" />
          <rect x="132" y="0" width="4" height="24" />
          <rect x="138" y="0" width="1.5" height="24" />
          <rect x="142" y="0" width="4.5" height="24" />
          <rect x="148" y="0" width="2" height="24" />
          <rect x="152" y="0" width="4" height="24" />
          <rect x="158" y="0" width="2" height="24" />
        </svg>
      </div>
    </section>
  );
}
