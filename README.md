# Viagem

App web para planejar viagens: comparação de hotéis, previsão de gastos e roteiro dia a dia. Passagens são lançadas manualmente em Gastos. Os dados ficam salvos no navegador (localStorage).

```
npm install
npm run dev     # desenvolvimento
npm test        # testes da lógica
npm run build
```

## Destinos e moeda
- **Qualquer destino:** além das 56 cidades da lista, "Digitar outro destino…" cria um lugar seu (nome, país, clima, voo longo, praia).
- **Valores por pessoa/dia:** os custos da lista são estimativas; em "Valores por pessoa/dia" você ajusta alimentação, transporte, passeios e hotel, e a previsão usa o que estiver ali.
- **Moeda:** em viagens ao exterior você informa a cotação (1 moeda = R$ x). O app mostra o equivalente em moeda local e aceita gastos lançados nela. Ele **não busca cotações**: a cotação é sempre a que você digitar.

## Instalar no celular e usar offline
O app é um PWA: depois de aberto uma vez com internet, funciona sem conexão e pode ser instalado (iPhone: Compartilhar > Adicionar à Tela de Início; Android: menu ⋮ > Instalar app). Quando sai uma versão nova, aparece um aviso com o botão "Atualizar". O offline só vale quando o app está hospedado em um endereço próprio (https); dentro de páginas que bloqueiam service workers ele roda normalmente, só online.

## Publicar
O workflow `.github/workflows/deploy.yml` publica no GitHub Pages a cada push na `main`. Ative uma vez em **Settings > Pages > Build and deployment > Source: GitHub Actions**. O endereço fica em `https://<usuário>.github.io/Viagem/`.

## Backup
Os dados ficam só no aparelho. Em "Minhas viagens" há exportar/importar (arquivo ou texto) e várias viagens.

## Próximos passos
- Busca automática de hotéis (API + backend)
- Conversão de moedas e exportar roteiro (PDF/compartilhar)
