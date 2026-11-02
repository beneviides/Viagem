import { useState } from "react";
import { clampNumber, parseNumberInput } from "../lib/numbers";

interface Props {
  value: number;
  /** Chamado a cada número válido digitado (já limitado a min/max). */
  onCommit: (n: number) => void;
  min?: number;
  max?: number;
  /** true = só inteiros (noites); false = aceita centavos (valores em R$). */
  integer?: boolean;
  id?: string;
  placeholder?: string;
  "aria-label"?: string;
}

/** Mostra o valor salvo: inteiros sem casas; reais com centavos ("89,90"), sem separador de milhar. */
const show = (n: number, integer: boolean): string =>
  integer || Number.isInteger(n) ? String(n) : n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false });

/**
 * Campo numérico que deixa a pessoa apagar tudo e digitar de novo.
 * Enquanto digita, mostra o texto como está; o valor só é "arrumado" ao sair do campo.
 * Antes, apagar o último dígito fazia o campo voltar ao mínimo (e "0" + "150" virava "0150").
 */
export default function NumberField({ value, onCommit, min = 0, max, integer = true, id, placeholder, ...rest }: Props) {
  const [text, setText] = useState<string | null>(null);

  const change = (raw: string) => {
    const n = parseNumberInput(raw);
    if (n === undefined) return setText(raw); // vazio ou ainda incompleto: só mostra
    const fixed = clampNumber(integer ? Math.round(n) : n, min, max);
    // Passou do máximo: mostra já o máximo, para a pessoa ver o limite.
    setText(max !== undefined && n > max ? String(fixed) : raw);
    onCommit(fixed);
  };

  return (
    <input
      id={id}
      type="text"
      inputMode={integer ? "numeric" : "decimal"}
      autoComplete="off"
      placeholder={placeholder}
      aria-label={rest["aria-label"]}
      value={text ?? show(value, integer)}
      onFocus={(e) => e.currentTarget.select()} // tocar no campo seleciona tudo: o que digitar substitui
      onChange={(e) => change(e.target.value)}
      onBlur={() => setText(null)} // vazio ou inválido volta ao último valor bom
    />
  );
}
