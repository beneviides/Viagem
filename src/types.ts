export interface Trip {
  /** Nome opcional; sem ele a viagem aparece como "GRU → LIS". */
  name?: string;
  origin: string; // código IATA
  destination: string; // código IATA
  departDate: string; // yyyy-mm-dd
  returnDate: string;
  travelers: number;
  budgetTotal: number; // orçamento total em BRL
  /** Destino digitado pela pessoa; vale quando `destination` é o código "OUT". */
  place?: Place;
  /** Valores por pessoa/dia ajustados pela pessoa; o que faltar vem do padrão do destino. */
  costs?: Partial<Costs>;
  /** Moeda do destino (viagem ao exterior) e a cotação informada: 1 unidade = `rate` reais. */
  currency?: { code: string; rate?: number };
}

export type ClimateKind = "warm" | "mild" | "cold";

/** Custos por pessoa/dia em R$ (a diária do hotel é por quarto). */
export interface Costs {
  comida: number;
  transporte: number;
  passeios: number;
  hotelAvg: number;
}

/** Destino que não está na lista. */
export interface Place {
  name: string;
  country: string;
  /** Até 4 letras, mostrado no cartão (ex.: "FNO"). */
  code: string;
  climate: ClimateKind;
  longHaul: boolean;
  beach: boolean;
  tip?: string;
}

export interface Hotel {
  id: string;
  name: string;
  pricePerNight: number;
  rating?: number;
  link?: string;
}

export interface Expense {
  id: string;
  category: Category;
  label: string;
  amount: number;
  /** true = gasto real já feito; ausente/false = valor planejado (compatível com dados antigos). */
  spent?: boolean;
  /** Dia do gasto real (yyyy-mm-dd), opcional. */
  date?: string;
  /** Valor digitado em outra moeda; `amount` já está em reais, convertido pela cotação da época. */
  original?: { currency: string; amount: number };
}

export type Category = "voo" | "hotel" | "comida" | "transporte" | "passeios" | "outros";

export interface Activity {
  id: string;
  time?: string;
  title: string;
  cost: number;
}

export interface ItineraryDay {
  date: string;
  activities: Activity[];
}

export type PackCategory = "Documentos" | "Roupas" | "Higiene" | "Saúde" | "Eletrônicos" | "Extras";

export interface PackItem {
  id: string;
  label: string;
  category: PackCategory;
  packed: boolean;
  /** Presente nos itens sugeridos; permite atualizar o texto sem duplicar. */
  key?: string;
}

/** Tudo que pertence a uma viagem. */
export interface TripData {
  id: string;
  trip: Trip;
  hotels: Hotel[];
  selectedHotelId?: string;
  expenses: Expense[];
  days: ItineraryDay[];
  pack: PackItem[];
  notes: string;
}

export interface Workspace {
  trips: TripData[];
  activeId: string;
}
