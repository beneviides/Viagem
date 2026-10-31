export type TransportType = "aviao" | "onibus" | "carro" | "trem" | "barco";

export interface TripLeg {
  id: string;
  origin?: string; // código IATA (opcional, assume anterior)
  destination: string; // código IATA do destino da parada
  nights: number; // duração em noites nesta cidade
  transport: TransportType; // meio de transporte para chegar nesta parada
  transportCost?: number; // custo da passagem/deslocamento
  notes?: string;
}

export interface Trip {
  /** Nome opcional; sem ele a viagem aparece como "GRU → LIS" ou com a rota completa. */
  name?: string;
  origin: string; // código IATA
  destination: string; // código IATA (1º destino / principal)
  departDate: string; // yyyy-mm-dd
  returnDate: string;
  travelers: number;
  budgetTotal: number; // orçamento total em BRL
  transport?: TransportType; // meio de transporte inicial/padrão
  legs?: TripLeg[]; // lista de paradas / múltiplos destinos
}

export interface Hotel {
  id: string;
  name: string;
  pricePerNight: number;
  rating?: number;
  link?: string;
  destinationCode?: string; // cidade opcional para roteiros multi-destino
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
