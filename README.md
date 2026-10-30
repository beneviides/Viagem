# Viagem

App web para planejar viagens: passagens mais baratas (com flexibilidade de datas), comparação de hotéis, previsão de gastos e roteiro dia a dia. Os dados ficam salvos no navegador (localStorage).

```
npm install
npm run dev     # desenvolvimento
npm test        # testes da lógica
npm run build
```

## Passagens reais (SerpApi / Google Flights)
O Amadeus Self-Service foi desativado em jul/2026, então a busca usa o SerpApi (engine `google_flights`) por um servidor intermediário, para que a chave nunca vá ao navegador.

```
export SERPAPI_KEY=sua_chave      # https://serpapi.com
npm run server                    # API em http://localhost:8787
npm run dev                       # em outro terminal; /api é encaminhado ao servidor
```

- Sem `SERPAPI_KEY` ou com o servidor parado, o app usa preços **simulados** e avisa na tela.
- Cada dia da janela flexível é **1 busca** do seu plano SerpApi (flexibilidade máxima ±3 = 7 buscas). Resultados ficam em cache por 1 hora no servidor.
- Em produção, hospede `server/` junto do front-end (ou atrás do mesmo domínio em `/api`).

## Próximos passos
- Provedor real de voos e de hotéis (API + backend)
- Mais cidades / busca de destino por autocomplete
- Conversão de moedas e exportar roteiro (PDF/compartilhar)
