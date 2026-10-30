import { useRef, useState } from "react";
import { TripData, Workspace } from "../types";
import { exportBackup, parseBackup, tripTitle } from "../lib/storage";
import { fmtParts, nightsBetween } from "../lib/dates";

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

  const backup = () => exportBackup(ws);

  const download = async () => {
    const filename = `viagem-backup-${new Date().toISOString().slice(0, 10)}.json`;
    // Dentro do claude.ai o download direto é bloqueado: lá o arquivo é entregue pela capacidade `downloads`.
    try {
      const host = (window as unknown as { claude?: { use?: (n: string) => Promise<unknown> } }).claude;
      const dl = (await host?.use?.("downloads")) as { save: (r: { filename: string; data: string }) => Promise<unknown> } | null | undefined;
      if (dl) {
        await dl.save({ filename, data: backup() });
        return setMsg({ ok: true, text: "Backup salvo." });
      }
    } catch (e) {
      if ((e as { code?: string })?.code === "declined") return setMsg({ ok: false, text: "Download cancelado." });
      /* qualquer outro erro: tenta o download comum abaixo */
    }
    try {
      const url = URL.createObjectURL(new Blob([backup()], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setMsg({ ok: true, text: "Download iniciado. Se o arquivo não aparecer, use “Copiar texto”." });
    } catch {
      setShown(backup());
      setMsg({ ok: false, text: "Não foi possível baixar aqui. Copie o texto abaixo e guarde onde preferir." });
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(backup());
      setMsg({ ok: true, text: "Backup copiado. Cole em um bloco de notas ou mande para você mesmo." });
    } catch {
      setShown(backup());
      setMsg({ ok: false, text: "O navegador não deixou copiar. Selecione o texto abaixo e copie manualmente." });
    }
  };

  const runImport = (raw: string) => {
    const r = parseBackup(raw);
    if (!r.ok) return setMsg({ ok: false, text: r.error });
    if (mode === "replace" && confirm !== "replace") {
      setConfirm("replace");
      return setMsg({ ok: false, text: `Isso apaga as ${ws.trips.length} viagem(ns) atuais e coloca ${r.trips.length} no lugar. Toque em Importar de novo para confirmar.` });
    }
    onImport(r.trips, mode);
    setConfirm(null);
    setText("");
    setMsg({ ok: true, text: `${r.trips.length} viagem(ns) ${mode === "add" ? "adicionada(s)" : "importada(s), no lugar das anteriores"}.` });
  };

  const onFile = async (f?: File) => {
    if (!f) return;
    if (f.size > 5_000_000) return setMsg({ ok: false, text: "O arquivo é grande demais para ser um backup do Viagem." });
    setText(await f.text());
    setMsg({ ok: true, text: `“${f.name}” carregado. Confira e toque em Importar.` });
  };

  return (
    <>
      <section className="card">
        <h3>Minhas viagens</h3>
        <ul className="list">
          {ws.trips.map((t) => {
            const active = t.id === ws.activeId;
            return (
              <li key={t.id} className={`item${active ? " selected" : ""}`}>
                <div>
                  <div className="name">{tripTitle(t.trip)}</div>
                  <div className="muted">
                    {t.trip.name ? `${t.trip.origin} → ${t.trip.destination} · ` : ""}
                    {short(t.trip.departDate)} a {short(t.trip.returnDate)} · {nightsBetween(t.trip.departDate, t.trip.returnDate)} noites · {t.trip.travelers} pessoa(s)
                  </div>
                </div>
                {active && <span className="pill">aberta</span>}
                <div className="actions">
                  <button className={active ? "secondary on" : "secondary"} onClick={() => onOpen(t.id)}>
                    {active ? "Voltar a ela" : "Abrir"}
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
                      Excluir mesmo?
                    </button>
                  ) : (
                    <button className="ghost" aria-label={`Excluir ${tripTitle(t.trip)}`} onClick={() => setConfirm(t.id)}>
                      ✕
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <button style={{ marginTop: 12, width: "100%" }} onClick={onCreate}>
          Nova viagem
        </button>
      </section>

      <section className="card">
        <h3>Backup</h3>
        <p className="muted" style={{ marginBottom: 12 }}>
          Seus dados ficam só neste aparelho. Guarde um backup antes de trocar de celular ou limpar o navegador.
        </p>
        <div className="actions-row">
          <button onClick={download}>Baixar arquivo</button>
          <button className="secondary" onClick={copy}>
            Copiar texto
          </button>
        </div>
        {shown && <textarea readOnly aria-label="Texto do backup" className="backup-text" value={shown} onFocus={(e) => e.currentTarget.select()} />}

        <h3 style={{ marginTop: 20 }}>Restaurar</h3>
        <div className="seg-toggle" role="radiogroup" aria-label="Como importar">
          <button type="button" role="radio" aria-checked={mode === "add"} className={mode === "add" ? "on" : ""} onClick={() => { setMode("add"); setConfirm(null); }}>
            Adicionar às minhas
          </button>
          <button type="button" role="radio" aria-checked={mode === "replace"} className={mode === "replace" ? "on" : ""} onClick={() => { setMode("replace"); setConfirm(null); }}>
            Substituir tudo
          </button>
        </div>
        <input ref={fileRef} type="file" accept=".json,application/json" aria-label="Arquivo de backup" onChange={(e) => onFile(e.target.files?.[0])} />
        <label style={{ marginTop: 10 }}>
          Ou cole o texto do backup
          <textarea id="backup-paste" className="backup-text" value={text} onChange={(e) => setText(e.target.value)} />
        </label>
        <button style={{ marginTop: 12, width: "100%" }} disabled={!text.trim()} onClick={() => runImport(text)}>
          Importar
        </button>
        {msg && (
          <p role="status" className={`mood ${msg.ok ? "" : "warn"}`}>
            {msg.text}
          </p>
        )}
      </section>
    </>
  );
}
