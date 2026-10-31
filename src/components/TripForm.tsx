import { Costs, Place, Trip } from "../types";
import { ABROAD_GROUPS, CITY_GROUPS, City, ORIGIN_GROUPS } from "../lib/cities";
import { DayProjection, summarizeProjection } from "../lib/budget";
import { useState } from "react";
import { addDays, brl, daysBetween, fmtParts } from "../lib/dates";
import { CUSTOM_CODE, codeFromName, defaultPlace, resolveDestination } from "../lib/destination";
import { ActiveCurrency, CURRENCIES, currencyForCountry, fmtMoney, toLocal } from "../lib/currency";

const COST_FIELDS: { key: keyof Costs; label: string }[] = [
  { key: "comida", label: "Alimentação" },
  { key: "transporte", label: "Transporte local" },
  { key: "passeios", label: "Passeios" },
  { key: "hotelAvg", label: "Hotel (diária do quarto)" },
];
const COUNTRIES = [...new Set([...CITY_GROUPS.map((g) => g.country), "Paraguai", "Bolívia", "Austrália", "China", "Egito", "Marrocos", "Bélgica", "Irlanda", "Croácia"])].sort((a, b) => a.localeCompare(b, "pt-BR"));
const parseNum = (v: string): number | undefined => {
  const n = Number(v.replace(",", "."));
  return v.trim() !== "" && Number.isFinite(n) && n >= 0 ? n : undefined;
};

interface Props {
  trip: Trip;
  destination: City;
  projection: DayProjection[];
  currency?: ActiveCurrency;
  onChange: (t: Trip) => void;
}

export default function TripForm({ trip, destination, projection, currency, onChange }: Props) {
  const custom = trip.destination === CUSTOM_CODE;
  const place = trip.place ?? defaultPlace();
  // Texto digitado nos campos numéricos enquanto a pessoa edita (só vira valor quando é um número válido).
  const [draft, setDraft] = useState<Record<string, string>>({});
  const baseCity = resolveDestination({ ...trip, costs: undefined }) ?? destination;
  // Destinos do Brasil sempre; os de fora entram se a pessoa pedir ou se a viagem já for para fora.
  const [wantAbroad, setWantAbroad] = useState(false);
  const abroadNow = destination.country !== "Brasil" && !custom; // destino digitado não depende da lista
  const showAbroad = wantAbroad || abroadNow;
  const { perPersonDay, avgDay, days } = summarizeProjection(destination, projection, trip.travelers);
  const set = <K extends keyof Trip>(k: K, v: Trip[K]) => onChange({ ...trip, [k]: v });
  // Mudar a ida mantém a duração: a volta acompanha. A volta nunca fica antes da ida.
  const setDepart = (v: string) => {
    if (!v) return;
    const length = Math.max(0, daysBetween(trip.departDate, trip.returnDate));
    onChange({ ...trip, departDate: v, returnDate: addDays(v, length) });
  };
  const setReturn = (v: string) => {
    if (!v) return;
    set("returnDate", v < trip.departDate ? trip.departDate : v);
  };
  // Trocar de destino zera os valores ajustados e a moeda: valiam só para o destino anterior.
  const setDestination = (v: string) => {
    if (v === trip.destination) return;
    const { costs: _costs, currency: _currency, ...rest } = trip;
    setDraft({});
    onChange({ ...rest, destination: v, ...(v === CUSTOM_CODE ? { place: trip.place ?? defaultPlace() } : {}) });
  };
  const setPlace = (patch: Partial<Place>) => {
    const next: Place = { ...place, ...patch };
    // A sigla acompanha o nome enquanto a pessoa não a tiver mudado.
    if (patch.name !== undefined && place.code === codeFromName(place.name)) next.code = codeFromName(patch.name);
    const { currency: _c, ...rest } = trip;
    const countryChanged = patch.country !== undefined && patch.country !== place.country;
    onChange({ ...(countryChanged ? rest : trip), place: next });
  };
  const setCost = (k: keyof Costs, text: string) => {
    setDraft((d) => ({ ...d, ["c" + k]: text }));
    const n = parseNum(text);
    if (n !== undefined) onChange({ ...trip, costs: { ...trip.costs, [k]: n } });
  };
  const setCurrency = (patch: { code?: string; rate?: number | null }) => {
    const code = patch.code ?? currency?.code;
    if (!code) return;
    const rate = patch.rate === undefined ? currency?.rate : patch.rate === null ? undefined : patch.rate;
    onChange({ ...trip, currency: { code, ...(rate ? { rate } : {}) } });
  };
  const setRate = (text: string) => {
    setDraft((d) => ({ ...d, rate: text }));
    if (text.trim() === "") return setCurrency({ rate: null });
    const n = parseNum(text);
    if (n !== undefined && n > 0) setCurrency({ rate: n });
  };
  const endDraft = (k: string) => setDraft((d) => Object.fromEntries(Object.entries(d).filter(([key]) => key !== k)));
  const currencyOptions = Object.entries(CURRENCIES).sort(([, a], [, b]) => a.localeCompare(b, "pt-BR"));

  // Cidades do Brasil: aeroportos da mesma cidade ficam juntos e aparecem pelo nome do aeroporto.
  const brazilOptions = ORIGIN_GROUPS.map((g) => (
    <optgroup key={g.label} label={g.label}>
      {g.cities.map((c) => (
        <option key={c.code} value={c.code}>
          {c.airport ? `${c.airport} (${c.code})` : `${c.name} (${c.code})`}
        </option>
      ))}
    </optgroup>
  ));
  const abroadOptions = ABROAD_GROUPS.map((g) => (
    <optgroup key={g.country} label={g.country}>
      {g.cities.map((c) => (
        <option key={c.code} value={c.code}>
          {c.name} ({c.code})
        </option>
      ))}
    </optgroup>
  ));
  return (
    <>
      <section className="card">
        <div className="stat-label">Projeção em {destination.name}</div>
        <div className="stat">
          {brl(perPersonDay)}
          <small>por pessoa/dia, sem passagem</small>
        </div>
        <div className="chips">
          <span className="chip">
            Grupo de {trip.travelers}: <b>{brl(avgDay)}</b>/dia
          </span>
          <span className="chip">
            <b>{days}</b> dias
          </span>
        </div>
        <p className="muted" style={{ marginTop: 12 }}>
          Detalhes por dia e por categoria na aba Gastos.
        </p>
      </section>
      <section className="card fun">
        <div className="stamp" aria-hidden="true">
          <span className="stamp-top">{destination.country}</span>
          <span className="stamp-code">{destination.code}</span>
          <span className="stamp-date">
            {fmtParts(trip.departDate).day} {fmtParts(trip.departDate).month}
          </span>
        </div>
        <div>
          {destination.tip ? (
            <>
              <h3>Você sabia?</h3>
              <p>{destination.tip}</p>
            </>
          ) : (
            <>
              <h3>Destino seu</h3>
              <p>Este lugar não está na lista. Os valores abaixo são sugestões: ajuste ao que você espera gastar.</p>
            </>
          )}
        </div>
      </section>
      <section className="card">
        <h3>Sua viagem</h3>
        <div className="form">
          <label style={{ gridColumn: "1 / -1" }}>
            Nome da viagem (opcional)
            <input id="trip-name" maxLength={80} placeholder={`${trip.origin} → ${destination.code}`} value={trip.name ?? ""} onChange={(e) => set("name", e.target.value)} />
          </label>
          <label>
            Saindo de
            <select value={trip.origin} onChange={(e) => set("origin", e.target.value)}>
              {brazilOptions}
            </select>
          </label>
          <label>
            Destino
            <select value={trip.destination} onChange={(e) => setDestination(e.target.value)}>
              {brazilOptions}
              {showAbroad && abroadOptions}
              <optgroup label="Não está na lista?">
                <option value={CUSTOM_CODE}>{custom ? `${place.name} (${place.code})` : "Digitar outro destino…"}</option>
              </optgroup>
            </select>
          </label>
          <label className="check-inline" style={{ gridColumn: "1 / -1" }}>
            <input type="checkbox" checked={showAbroad} disabled={abroadNow} onChange={(e) => setWantAbroad(e.target.checked)} />
            <span>
              Incluir destinos no exterior
              {abroadNow && <span className="muted"> (a viagem atual é para fora; escolha uma cidade do Brasil para poder desligar)</span>}
            </span>
          </label>
          <label>
            Ida
            <input type="date" value={trip.departDate} onChange={(e) => setDepart(e.target.value)} />
          </label>
          <label>
            Volta
            <input type="date" value={trip.returnDate} min={trip.departDate} onChange={(e) => setReturn(e.target.value)} />
          </label>
          <label>
            Viajantes
            <input type="number" min={1} value={trip.travelers} onChange={(e) => set("travelers", Math.max(1, +e.target.value || 1))} />
          </label>
          <label>
            Orçamento total (R$)
            <input type="number" min={0} step={100} value={trip.budgetTotal} onChange={(e) => set("budgetTotal", Math.max(0, +e.target.value || 0))} />
          </label>
        </div>
      </section>

      {custom && (
        <section className="card">
          <h3>Seu destino</h3>
          <div className="form">
            <label>
              Cidade ou lugar
              <input id="place-name" maxLength={60} value={place.name} onChange={(e) => setPlace({ name: e.target.value })} />
            </label>
            <label>
              País
              <input id="place-country" list="countries" maxLength={60} value={place.country} onChange={(e) => setPlace({ country: e.target.value })} />
              <datalist id="countries">
                {COUNTRIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </label>
            <label>
              Sigla (3 ou 4 letras)
              <input id="place-code" maxLength={4} value={place.code} onChange={(e) => setPlace({ code: e.target.value.toUpperCase().replace(/[^A-Z]/g, "") })} onBlur={() => place.code.length < 3 && setPlace({ code: codeFromName(place.name) })} />
            </label>
            <label>
              Clima na época da viagem
              <select id="place-climate" value={place.climate} onChange={(e) => setPlace({ climate: e.target.value as Place["climate"] })}>
                <option value="warm">Quente</option>
                <option value="mild">Ameno</option>
                <option value="cold">Frio</option>
              </select>
            </label>
            <label className="check-inline">
              <input type="checkbox" checked={place.longHaul} onChange={(e) => setPlace({ longHaul: e.target.checked })} />
              <span>Voo longo (mais de 5 horas)</span>
            </label>
            <label className="check-inline">
              <input type="checkbox" checked={place.beach} onChange={(e) => setPlace({ beach: e.target.checked })} />
              <span>Tem praia</span>
            </label>
            <label style={{ gridColumn: "1 / -1" }}>
              Uma dica sua (opcional)
              <input id="place-tip" maxLength={300} value={place.tip ?? ""} onChange={(e) => setPlace({ tip: e.target.value })} />
            </label>
          </div>
        </section>
      )}

      <section className="card">
        <h3>Valores por pessoa/dia</h3>
        <p className="muted" style={{ marginBottom: 12 }}>
          {custom ? "Valores sugeridos" : `Estimativas para ${destination.name}`} em R$. Ajuste ao seu estilo de viagem; a previsão de gastos usa o que estiver aqui.
        </p>
        <div className="form">
          {COST_FIELDS.map(({ key, label }) => {
            const effective = key === "hotelAvg" ? destination.hotelAvg : destination.daily[key];
            const base = key === "hotelAvg" ? baseCity.hotelAvg : baseCity.daily[key];
            return (
              <label key={key}>
                {label} (R$)
                <input
                  id={`cost-${key}`}
                  inputMode="decimal"
                  value={draft["c" + key] ?? String(effective)}
                  onChange={(e) => setCost(key, e.target.value)}
                  onBlur={() => endDraft("c" + key)}
                  aria-describedby={`cost-${key}-hint`}
                />
                <span id={`cost-${key}-hint`} className="muted">
                  {trip.costs?.[key] !== undefined && trip.costs[key] !== base ? `ajustado (padrão: ${brl(base)})` : "padrão"}
                </span>
              </label>
            );
          })}
        </div>
        {trip.costs && (
          <button
            className="secondary"
            style={{ marginTop: 12, width: "100%" }}
            onClick={() => {
              setDraft({});
              const { costs: _c, ...rest } = trip;
              onChange(rest);
            }}
          >
            Voltar aos valores padrão
          </button>
        )}
      </section>

      {destination.country !== "Brasil" && (
        <section className="card">
          <h3>Moeda do destino</h3>
          <div className="form">
            <label>
              Moeda
              <select id="currency-code" value={currency?.code ?? ""} onChange={(e) => setCurrency({ code: e.target.value })}>
                {!currency && <option value="">Escolha…</option>}
                {currency && !CURRENCIES[currency.code] && <option value={currency.code}>{currency.code}</option>}
                {currencyOptions.map(([code, name]) => (
                  <option key={code} value={code}>
                    {name} ({code})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Cotação: 1 {currency?.code ?? "moeda"} = R$
              <input
                id="currency-rate"
                inputMode="decimal"
                placeholder="ex.: 6,10"
                disabled={!currency}
                value={draft.rate ?? (currency?.rate !== undefined ? String(currency.rate).replace(".", ",") : "")}
                onChange={(e) => setRate(e.target.value)}
                onBlur={() => endDraft("rate")}
              />
            </label>
          </div>
          <p className="muted" style={{ marginTop: 10 }}>
            {currency?.rate
              ? `Com essa cotação, ${brl(1000)} equivalem a ${fmtMoney(toLocal(1000, currency)!, currency.code)}.`
              : "Informe a cotação para ver os valores em moeda local e lançar gastos nela. O app não busca cotações sozinho; use a do dia ou a que você pagou."}
          </p>
          {!currencyForCountry(destination.country) && !currency && <p className="muted">Não conheço a moeda de {destination.country}: escolha na lista.</p>}
        </section>
      )}
    </>
  );
}
