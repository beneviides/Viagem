export interface City {
  code: string;
  name: string;
  country: string;
  lat: number;
  lon: number;
  /** Custo médio diário por pessoa em BRL (sem hotel e sem voo). */
  daily: { comida: number; transporte: number; passeios: number };
  /** Diária média de hotel (quarto duplo, categoria 3 estrelas) em BRL. */
  hotelAvg: number;
  /** Inverno com frio de verdade (casaco pesado). */
  coldWinter?: boolean;
  /** Curiosidade ou dica rápida do destino. */
  tip: string;
}

export const CITIES: City[] = [
  { code: "GRU", name: "São Paulo", country: "Brasil", lat: -23.43, lon: -46.47, daily: { comida: 120, transporte: 40, passeios: 80 }, hotelAvg: 380, tip: "São Paulo tem mais de 11 milhões de habitantes e uma diversidade gastronômica enorme: dá para comer a cozinha de dezenas de países sem sair da cidade." },
  { code: "GIG", name: "Rio de Janeiro", country: "Brasil", lat: -22.81, lon: -43.25, daily: { comida: 110, transporte: 35, passeios: 90 }, hotelAvg: 420, tip: "O Cristo Redentor fica no alto do Corcovado. Vá cedo, com céu aberto, para pegar a vista sem nuvens." },
  { code: "SSA", name: "Salvador", country: "Brasil", lat: -12.91, lon: -38.33, daily: { comida: 90, transporte: 30, passeios: 70 }, hotelAvg: 300, tip: "Salvador foi a primeira capital do Brasil, de 1549 a 1763. O Pelourinho guarda esse passado em cada rua." },
  { code: "FLN", name: "Florianópolis", country: "Brasil", lat: -27.67, lon: -48.55, daily: { comida: 100, transporte: 45, passeios: 80 }, hotelAvg: 390, tip: "Florianópolis fica numa ilha e tem mais de 40 praias. Escolha uma por dia e o roteiro se monta sozinho." },
  { code: "REC", name: "Recife", country: "Brasil", lat: -8.13, lon: -34.92, daily: { comida: 90, transporte: 30, passeios: 60 }, hotelAvg: 290, tip: "Recife é chamada de Veneza brasileira por causa dos rios e das dezenas de pontes que cortam a cidade." },
  { code: "LIS", name: "Lisboa", country: "Portugal", lat: 38.77, lon: -9.13, daily: { comida: 230, transporte: 60, passeios: 150 }, hotelAvg: 650, tip: "Experimente o pastel de nata ainda quentinho, com canela por cima. Vale repetir." },
  { code: "MAD", name: "Madri", country: "Espanha", lat: 40.49, lon: -3.57, daily: { comida: 250, transporte: 60, passeios: 150 }, hotelAvg: 700, coldWinter: true, tip: "O jantar em Madri costuma começar por volta das 21h. Se bater a fome antes, peça tapas." },
  { code: "CDG", name: "Paris", country: "França", lat: 49.01, lon: 2.55, daily: { comida: 330, transporte: 80, passeios: 200 }, hotelAvg: 950, coldWinter: true, tip: "Muitos museus fecham um dia por semana (o Louvre fecha às terças). Confira antes de montar o roteiro." },
  { code: "FCO", name: "Roma", country: "Itália", lat: 41.8, lon: 12.25, daily: { comida: 280, transporte: 60, passeios: 180 }, hotelAvg: 800, tip: "Em Roma dá para encher a garrafinha nas fontes públicas: a água é potável e de graça." },
  { code: "LHR", name: "Londres", country: "Reino Unido", lat: 51.47, lon: -0.45, daily: { comida: 350, transporte: 100, passeios: 200 }, hotelAvg: 1000, coldWinter: true, tip: "Vários museus grandes de Londres, como o British Museum, têm entrada gratuita." },
  { code: "JFK", name: "Nova York", country: "EUA", lat: 40.64, lon: -73.78, daily: { comida: 400, transporte: 100, passeios: 250 }, hotelAvg: 1300, coldWinter: true, tip: "O metrô de Nova York funciona 24 horas por dia, todos os dias." },
  { code: "MIA", name: "Miami", country: "EUA", lat: 25.79, lon: -80.29, daily: { comida: 350, transporte: 120, passeios: 220 }, hotelAvg: 1000, tip: "O inverno em Miami é ameno. Mesmo assim, protetor solar na mala, o ano todo." },
  { code: "EZE", name: "Buenos Aires", country: "Argentina", lat: -34.82, lon: -58.54, daily: { comida: 150, transporte: 40, passeios: 100 }, hotelAvg: 450, tip: "A livraria El Ateneo Grand Splendid funciona num antigo teatro e está entre as mais bonitas do mundo." },
  { code: "SCL", name: "Santiago", country: "Chile", lat: -33.39, lon: -70.79, daily: { comida: 200, transporte: 50, passeios: 120 }, hotelAvg: 520, tip: "Em dias de céu limpo dá para ver a Cordilheira dos Andes direto da cidade." },
  { code: "CUN", name: "Cancún", country: "México", lat: 21.04, lon: -86.87, daily: { comida: 220, transporte: 70, passeios: 220 }, hotelAvg: 800, tip: "Reserve um dia para um bate-volta às ruínas maias de Tulum ou Chichén Itzá." },
];

export const cityByCode = (code: string): City | undefined => CITIES.find((c) => c.code === code);

/** Distância em km (haversine). */
export function distanceKm(a: City, b: City): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
