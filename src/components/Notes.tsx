interface Props {
  value: string;
  onChange: (v: string) => void;
}

const TEMPLATES = [
  { label: "✈️ Dados do Voo", text: "\n\n## ✈️ Voo\n- Cód. Reserva (PNR): \n- Cia Aérea: \n- Horário Embarque: \n- Terminal/Portão: " },
  { label: "🏨 Dados da Estadia", text: "\n\n## 🏨 Hotel / Airbnb\n- Nome: \n- Endereço: \n- Check-in: \n- Check-out: \n- Telefone: " },
  { label: "🏥 Seguro Viagem", text: "\n\n## 🏥 Seguro Viagem\n- Seguradora: \n- Apólice nº: \n- WhatsApp Emergência: " },
  { label: "📞 Contatos Úteis", text: "\n\n## 📞 Emergência\n- Consulado/Embaixada: \n- Cartão / Banco: \n- Contato Família: " },
  { label: "🍽️ Dicas de Restaurantes", text: "\n\n## 🍽️ Lugares para Comer\n- \n- " },
];

export default function Notes({ value, onChange }: Props) {
  const insert = (text: string) => {
    onChange(value ? `${value.trimEnd()}${text}` : text.trimStart());
  };

  return (
    <section className="card">
      <h3>📝 Bloco de Notas da Viagem</h3>
      
      <p className="muted" style={{ marginBottom: 12 }}>
        Inserir seções rápidas:
      </p>
      <div className="quick" style={{ marginBottom: 14 }}>
        {TEMPLATES.map((t) => (
          <button key={t.label} type="button" onClick={() => insert(t.text)}>
            {t.label}
          </button>
        ))}
      </div>

      <label>
        Anotações, vouchers e lembretes
        <textarea
          id="trip-notes"
          className="notes"
          placeholder="Escreva livremente ou use os atalhos acima para organizar reservas, documentos, dicas de locais imperdíveis..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>

      <p className="muted" style={{ marginTop: 10 }}>
        💾 Salvo instantaneamente e de forma segura na memória deste aparelho{value ? ` · ${value.length} caracteres` : ""}.
      </p>
    </section>
  );
}
