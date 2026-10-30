import { useEffect, useState } from "react";

/** useState persistido em localStorage. */
export function usePersistent<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* armazenamento indisponível: segue sem persistir */
    }
  }, [key, value]);
  return [value, setValue] as const;
}

export const uid = () => Math.random().toString(36).slice(2, 10);
