export interface Trip {
  origin: string; // código IATA
  destination: string; // código IATA
  departDate: string; // yyyy-mm-dd
  returnDate: string;
  travelers: number;
  budgetTotal: number; // orçamento total em BRL
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
