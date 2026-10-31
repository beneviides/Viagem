import { Trip } from "../types";

export const CURRENCIES: Record<string, string> = {
  USD: "Dólar americano",
  EUR: "Euro",
  GBP: "Libra esterlina",
  ARS: "Peso argentino",
  CLP: "Peso chileno",
  COP: "Peso colombiano",
  PEN: "Sol peruano",
  UYU: "Peso uruguaio",
  MXN: "Peso mexicano",
  CAD: "Dólar canadense",
  DOP: "Peso dominicano",
  CHF: "Franco suíço",
  CZK: "Coroa tcheca",
  TRY: "Lira turca",
  AED: "Dirham dos Emirados",
  JPY: "Iene",
  SGD: "Dólar de Singapura",
  THB: "Baht",
  ZAR: "Rand",
  PYG: "Guarani paraguaio",
  BOB: "Boliviano",
  AUD: "Dólar australiano",
  CNY: "Yuan",
  EGP: "Libra egípcia",
  MAD: "Dirham marroquino",
};

const BY_COUNTRY: Record<string, string> = {
  "Estados Unidos": "USD", EUA: "USD", Argentina: "ARS", Chile: "CLP", Colômbia: "COP", Peru: "PEN", Uruguai: "UYU",
  México: "MXN", Canadá: "CAD", "República Dominicana": "DOP", "Reino Unido": "GBP", Suíça: "CHF", Tchéquia: "CZK",
  Turquia: "TRY", "Emirados Árabes Unidos": "AED", Japão: "JPY", Singapura: "SGD", Tailândia: "THB", "África do Sul": "ZAR",
  Paraguai: "PYG", Bolívia: "BOB", Austrália: "AUD", China: "CNY", Egito: "EGP", Marrocos: "MAD",
  Portugal: "EUR", Espanha: "EUR", França: "EUR", Itália: "EUR", Alemanha: "EUR", "Países Baixos": "EUR", Áustria: "EUR",
  Grécia: "EUR", Bélgica: "EUR", Irlanda: "EUR", Finlândia: "EUR", Croácia: "EUR",
};

/** Moeda usual do país; `undefined` quando o país é o Brasil ou não está na tabela. */
export const currencyForCountry = (country: string): string | undefined => (country === "Brasil" ? undefined : BY_COUNTRY[country]);

export const isCurrencyCode = (v: unknown): v is string => typeof v === "string" && /^[A-Z]{3}$/.test(v);

export interface ActiveCurrency {
  code: string;
  /** Reais por unidade da moeda; `undefined` enquanto a pessoa não informar a cotação. */
  rate?: number;
}

/** Moeda em uso na viagem: só existe para destinos fora do Brasil. */
export function activeCurrency(trip: Pick<Trip, "currency">, country: string): ActiveCurrency | undefined {
  if (country === "Brasil") return undefined;
  const code = trip.currency?.code ?? currencyForCountry(country);
  if (!code) return undefined;
  const rate = trip.currency?.rate;
  return { code, rate: typeof rate === "number" && Number.isFinite(rate) && rate > 0 ? rate : undefined };
}

/** Reais -> moeda local. `undefined` sem cotação. */
export const toLocal = (brl: number, c?: ActiveCurrency): number | undefined => (c?.rate ? brl / c.rate : undefined);

/** Moeda local -> reais (arredondado em centavos). `undefined` sem cotação. */
export const toBrl = (local: number, c?: ActiveCurrency): number | undefined => (c?.rate ? Math.round(local * c.rate * 100) / 100 : undefined);

/** "€ 1.234" no formato brasileiro, para qualquer código de moeda. */
export function fmtMoney(amount: number, code: string): string {
  try {
    return amount.toLocaleString("pt-BR", { style: "currency", currency: code, maximumFractionDigits: amount >= 100 ? 0 : 2 });
  } catch {
    return `${code} ${Math.round(amount).toLocaleString("pt-BR")}`;
  }
}
