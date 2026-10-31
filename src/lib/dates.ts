export const addDays = (iso: string, n: number): string => {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Número de noites entre duas datas (mínimo 1). */
export const nightsBetween = (from: string, to: string): number => {
  const ms = new Date(to + "T12:00:00").getTime() - new Date(from + "T12:00:00").getTime();
  return Math.max(1, Math.round(ms / 86_400_000));
};

export const eachDay = (from: string, to: string): string[] => {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
};

export const fmtDate = (iso: string): string =>
  new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });

export const brl = (n: number): string =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export const fmtParts = (iso: string) => {
  const d = new Date(iso + "T12:00:00");
  return {
    day: d.toLocaleDateString("pt-BR", { day: "2-digit" }),
    month: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
    weekday: d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
  };
};

/** Dias entre hoje e a data (negativo se já passou). */
export const daysUntil = (iso: string, today = new Date()): number => {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const d = new Date(iso + "T00:00:00").getTime();
  return Math.round((d - t) / 86_400_000);
};

export function countdownLabel(depart: string, ret: string, today = new Date()): string {
  const n = daysUntil(depart, today);
  if (n > 1) return `Embarque em ${n} dias`;
  if (n === 1) return "Embarque amanhã";
  if (n === 0) return "Embarque hoje";
  return daysUntil(ret, today) >= 0 ? "Em viagem" : "Viagem concluída";
}

/** Diferença exata em dias (b - a), sem mínimo. */
export const daysBetween = (a: string, b: string): number =>
  Math.round((new Date(b + "T12:00:00").getTime() - new Date(a + "T12:00:00").getTime()) / 86_400_000);
