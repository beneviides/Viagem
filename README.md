# Viagem

App web para planejar viagens: passagens mais baratas (com flexibilidade de datas), comparação de hotéis, previsão de gastos e roteiro dia a dia. Os dados ficam salvos no navegador (localStorage).

```
npm install
npm run dev     # desenvolvimento
npm test        # testes da lógica
npm run build
```

## Passagens reais
A busca usa um provedor **simulado** (`src/lib/flights.ts`). Para preços reais, implemente a interface `FlightProvider` com Amadeus, Kiwi/Tequila ou similar e troque `flightProvider`. As chaves de API devem ficar em um backend, nunca no navegador.

## Próximos passos
- Provedor real de voos e de hotéis (API + backend)
- Mais cidades / busca de destino por autocomplete
- Conversão de moedas e exportar roteiro (PDF/compartilhar)
