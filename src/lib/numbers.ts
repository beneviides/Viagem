/**
 * Lê o que a pessoa digitou num campo de número. Aceita vírgula ou ponto como separador decimal.
 * Devolve `undefined` quando o campo está vazio ou o texto não é um número válido (>= 0).
 */
export function parseNumberInput(raw: string): number | undefined {
  const text = raw.trim().replace(",", ".");
  if (text === "") return undefined;
  const n = Number(text);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export const clampNumber = (n: number, min: number, max?: number): number => Math.min(max ?? Infinity, Math.max(min, n));
