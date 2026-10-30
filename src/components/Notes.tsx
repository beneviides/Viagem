export default function Notes({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <section className="card">
      <h3>Observações</h3>
      <label>
        Anotações da viagem
        <textarea
          id="trip-notes"
          className="notes"
          placeholder="Reservas, documentos, lembretes, ideias de passeio…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
      <p className="muted" style={{ marginTop: 8 }}>
        Salvo automaticamente neste aparelho{value ? ` · ${value.length} caracteres` : ""}.
      </p>
    </section>
  );
}
