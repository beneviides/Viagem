import { useRef, useState } from "react";
import { TripData, Workspace } from "../types";
import { exportBackup, parseBackup, tripTitle } from "../lib/storage";
import { fmtParts, nightsBetween } from "../lib/dates";
import { promptInstall, usePwa } from "../pwa";

interface Props {
  ws: Workspace;
  onOpen: (id: string) => void;
  onCreate: () => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
  onImport: (trips: TripData[], mode: "add" | "replace") => void;
}

const short = (iso: string) => {
  const p = fmtParts(iso);
  return `${p.day} ${p.month}`;
};

export default function Trips({ ws, onOpen, onCreate, onDuplicate, onRemove, onImport }: Props) {
  const [confirm, setConfirm] = useState<string | null>(null); // id a excluir, ou "replace"
  const [mode, setMode] = useState<"add" | "replace">("add");
  const [text, setText] = useState("");
  const [shown, setShown] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pwa = usePwa();

  const backup = () => exportBackup(ws);

  const download = async () => {
    const filename = `viagem-backup-${new Date().toISOString().slice(0, 10)}.json`;
    try {
      const host = (window as unknown as { claude?: { use?: (n: string) => Promise<unknown> } }).claude;
      const dl = (await host?.use?.("downloads")) as
        | { save: (r: { filename: string; data: string }) => Promise<unknown> }
        | null
        | undefined;
      if (dl) {
        await dl.save({ filename, data: backup() });
        return setMsg({ ok: true, text: "Backup salvo com sucesso." });
      }
    } catch (e) {
      if ((e as { code?: string })?.code === "declined")
        return setMsg({ ok: false, text: "Download cancelado." });
    }
    try {
      const url = URL.createObjectURL(new Blob([backup()], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setMsg({ ok: true, text: "Arquivo gerado! Se o download não iniciar, utilize a opção “Copiar texto”." });
    } catch {
      setShown(backup());
      setMsg({ ok: false, text: "Copie o texto gerado abaixo e salve onde preferir." });
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(backup());
      setMsg({ ok: true, text: "✅ Backup copiado para a área de transferência! Cole nas suas notas ou envie por email." });
    } catch {
      setShown(backup());
      setMsg({ ok: false, text: "Selecione o texto abaixo e copie manualmente." });
    }
  };

  const runImport = (raw: string) => {
    const r = parseBackup(raw);
    if (!r.ok) return setMsg({ ok: false, text: r.error });
    if (mode === "replace" && confirm !== "replace") {
      setConfirm("replace");
      return setMsg({
        ok: false,
        text: `⚠️ Atenção: isso apagará as ${ws.trips.length} viagem(ns) salvas atualmente e carregará ${r.trips.length} do arquivo. Clique novamente em "Importar" para confirmar.`,
      });
    }
    onImport(r.trips, mode);
    setConfirm(null);
    setText("");
    setMsg({
      ok: true,
      text: `🎉 ${r.trips.length} viagem(ns) ${mode === "add" ? "adicionada(s) à sua lista" : "importada(s), substituindo as anteriores"}.`,
    });
  };

  const onFile = async (f?: File) => {
    if (!f) return;
    if (f.size > 5_000_000) return setMsg({ ok: false, text: "O arquivo selecionado é grande demais para ser um backup do Viagem." });
    setText(await f.text());
    setMsg({ ok: true, text: `Arquivo “${f.name}” lido! Clique em Importar para aplicar.` });
  };

  return (
    <>
      <section className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ margin: 0 }}>🧳 Minhas Viagens ({ws.trips.length})</h3>
          <button onClick={onCreate} style={{ minHeight: 38, padding: "0 14px", fontSize: 13 }}>
            + Nova Viagem
          </button>
        </div>

        <ul className="list">
          {ws.trips.map((t) => {
            const active = t.id === ws.activeId;
            return (
              <li key={t.id} className={`item${active ? " selected" : ""}`}>
                <div>
                  <div className="name" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span>✈️ {tripTitle(t.trip)}</span>
                    {active && <span className="pill">Viagem Atual</span>}
                  </div>
                  <div className="muted" style={{ marginTop: 4 }}>
                    {t.trip.name ? `${t.trip.origin} → ${t.trip.destination} · ` : ""}
                    {short(t.trip.departDate)} a {short(t.trip.returnDate)} · {nightsBetween(t.trip.departDate, t.trip.returnDate)} noites · {t.trip.travelers} {t.trip.travelers === 1 ? "viajante" : "viajantes"}
                  </div>
                </div>

                <div className="actions">
                  <button className={active ? "secondary on" : "secondary"} onClick={() => onOpen(t.id)}>
                    {active ? "✓ Aberta no Momento" : "Abrir Viagem"}
                  </button>
                  <button className="secondary" aria-label={`Duplicar ${tripTitle(t.trip)}`} onClick={() => onDuplicate(t.id)}>
                    Duplicar
                  </button>
                  {confirm === t.id ? (
                    <button
                      className="danger"
                      onClick={() => {
                        onRemove(t.id);
                        setConfirm(null);
                      }}
                    >
                      Confirmar exclusão?
                    </button>
                  ) : (
                    <button
                      className="ghost"
                      aria-label={`Excluir ${tripTitle(t.trip)}`}
                      title="Excluir viagem"
                      onClick={() => setConfirm(t.id)}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {pwa.offlineReady && !pwa.standalone && (
        <section className="card">
          <h3>📱 Instalar Aplicativo no Celular</h3>
          <p style={{ lineHeight: 1.5 }}>
            O Viagem funciona 100% offline e pode ser instalado diretamente na sua tela inicial para acesso rápido durante o voo ou sem sinal.
          </p>
          {pwa.canPrompt ? (
            <button style={{ marginTop: 14, width: "100%" }} onClick={promptInstall}>
              📲 Instalar Aplicativo na Tela de Início
            </button>
          ) : (
            <ul className="muted how-to" style={{ marginTop: 12 }}>
              <li>
                <b>No iPhone (Safari):</b> Toque no botão de Compartilhar (quadrado com seta para cima) e selecione <b>“Adicionar à Tela de Início”</b>.
              </li>
              <li>
                <b>No Android (Chrome):</b> Abra o menu de 3 pontinhos ⋮ no topo e selecione <b>“Instalar app”</b> ou <b>“Adicionar à tela inicial”</b>.
              </li>
            </ul>
          )}
        </section>
      )}

      <section className="card">
        <h3>💾 Backup & Sincronização</h3>
        <p className="muted" style={{ marginBottom: 14 }}>
          Todos os seus roteiros, hotéis e despesas ficam salvos no seu próprio navegador. Exporte um backup para transferir para outro celular ou salvar cópia segura.
        </p>
        <div className="actions-row">
          <button onClick={download}>⬇️ Baixar Arquivo (.json)</button>
          <button className="secondary" onClick={copy}>
            📋 Copiar Dados
          </button>
        </div>
        {shown && (
          <textarea
            readOnly
            aria-label="Texto do backup para cópia"
            className="backup-text"
            value={shown}
            onFocus={(e) => e.currentTarget.select()}
          />
        )}

        <h3 style={{ marginTop: 24 }}>📥 Restaurar Backup</h3>
        <div className="seg-toggle" role="radiogroup" aria-label="Modo de importação">
          <button
            type="button"
            role="radio"
            aria-checked={mode === "add"}
            className={mode === "add" ? "on" : ""}
            onClick={() => {
              setMode("add");
              setConfirm(null);
            }}
          >
            Adicionar às Viagens Atuais
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={mode === "replace"}
            className={mode === "replace" ? "on" : ""}
            onClick={() => {
              setMode("replace");
              setConfirm(null);
            }}
          >
            Substituir Todas
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          aria-label="Arquivo de backup em JSON"
          onChange={(e) => onFile(e.target.files?.[0])}
        />

        <label style={{ marginTop: 12 }}>
          Ou cole o texto do backup aqui:
          <textarea
            id="backup-paste"
            placeholder="Cole o JSON de backup aqui..."
            className="backup-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </label>

        <button
          style={{ marginTop: 12, width: "100%" }}
          disabled={!text.trim()}
          onClick={() => runImport(text)}
        >
          Carregar Backup
        </button>

        {msg && (
          <p role="status" className={`mood ${msg.ok ? "" : "warn"}`} style={{ marginTop: 12 }}>
            {msg.text}
          </p>
        )}
      </section>
    </>
  );
}
