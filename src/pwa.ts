import { useSyncExternalStore } from "react";

interface PwaState {
  /** Service worker registrado: o app funciona offline neste aparelho. */
  offlineReady: boolean;
  /** Há uma versão nova esperando para ser ativada. */
  updateReady: boolean;
  /** Já está instalado (aberto como app). */
  standalone: boolean;
  canPrompt: boolean;
}

let state: PwaState = { offlineReady: false, updateReady: false, standalone: false, canPrompt: false };
const listeners = new Set<() => void>();
let deferred: { prompt: () => Promise<unknown> } | undefined;
let waiting: ServiceWorker | undefined;

const set = (patch: Partial<PwaState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

export function initPwa() {
  try {
    set({ standalone: window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true });
  } catch {
    /* sem matchMedia: assume que não está instalado */
  }
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as unknown as { prompt: () => Promise<unknown> };
    set({ canPrompt: true });
  });
  window.addEventListener("appinstalled", () => {
    deferred = undefined;
    set({ canPrompt: false, standalone: true });
  });
  // Só em produção e em endereço seguro. Em páginas que bloqueiam service workers (ex.: dentro do claude.ai)
  // o acesso a navigator.serviceWorker pode até lançar erro: nesse caso o app segue normal, só online.
  try {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("./sw.js")
      .then((reg) => {
        set({ offlineReady: true });
        const track = (w: ServiceWorker | null) => {
          if (!w) return;
          w.addEventListener("statechange", () => {
            if (w.state === "installed" && navigator.serviceWorker.controller) {
              waiting = w;
              set({ updateReady: true });
            }
          });
        };
        if (reg.waiting && navigator.serviceWorker.controller) {
          waiting = reg.waiting;
          set({ updateReady: true });
        }
        reg.addEventListener("updatefound", () => track(reg.installing));

        // Um app instalado pode ficar dias aberto em segundo plano sem recarregar, e o navegador só procura
        // versão nova ao recarregar. Por isso procuramos ao voltar para o app, ao recuperar a internet e de tempos em tempos,
        // sem repetir em menos de 30 segundos.
        let lastCheck = 0;
        const checkForUpdate = () => {
          const now = Date.now();
          if (document.visibilityState !== "visible" || !navigator.onLine || now - lastCheck < 30_000) return;
          lastCheck = now;
          reg.update().catch(() => {
            /* sem rede agora: tenta na próxima vez */
          });
        };
        document.addEventListener("visibilitychange", checkForUpdate);
        window.addEventListener("online", checkForUpdate);
        window.setInterval(checkForUpdate, 30 * 60 * 1000);
      })
      .catch(() => {
        /* sem service worker: o app segue funcionando online */
      });
  } catch {
    /* idem */
  }
}

export function applyUpdate() {
  if (!waiting) return;
  navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), { once: true });
  waiting.postMessage("SKIP_WAITING");
}

export async function promptInstall() {
  if (!deferred) return;
  await deferred.prompt();
  deferred = undefined;
  set({ canPrompt: false });
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const usePwa = () => useSyncExternalStore(subscribe, () => state);

/** true quando o aparelho está sem internet. */
export function useOffline() {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener("online", cb);
      window.addEventListener("offline", cb);
      return () => {
        window.removeEventListener("online", cb);
        window.removeEventListener("offline", cb);
      };
    },
    () => !navigator.onLine
  );
}
