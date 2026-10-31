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
  /** Fresco o ano todo (altitude): nunca "quente". */
  coolAlways?: boolean;
  /** Perto do trópico, mas com inverno fresco. */
  coolWinter?: boolean;
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

// Cidades adicionadas depois da lista inicial. Custos em R$ por pessoa/dia: ESTIMATIVAS, ajuste ao seu estilo de viagem.
const mk = (
  code: string, name: string, country: string, lat: number, lon: number,
  comida: number, transporte: number, passeios: number, hotelAvg: number, tip: string,
  extra: Partial<Pick<City, "coldWinter" | "coolAlways" | "coolWinter">> = {}
): City => ({ code, name, country, lat, lon, daily: { comida, transporte, passeios }, hotelAvg, tip, ...extra });

CITIES.push(
  // Brasil
  mk("BSB", "Brasília", "Brasil", -15.87, -47.92, 110, 40, 60, 380, "Brasília é patrimônio da UNESCO, projetada por Lucio Costa e Oscar Niemeyer. Reserve um tempo para a Esplanada dos Ministérios."),
  mk("CNF", "Belo Horizonte", "Brasil", -19.62, -43.97, 95, 30, 60, 320, "Belo Horizonte é famosa pelos botecos e pela comida mineira. Vale um bate-volta a Ouro Preto."),
  mk("CWB", "Curitiba", "Brasil", -25.53, -49.18, 100, 35, 60, 320, "Curitiba tem parques grandes, como o Jardim Botânico. Leve um casaco: o tempo muda rápido.", { coolWinter: true }),
  mk("POA", "Porto Alegre", "Brasil", -29.99, -51.17, 100, 35, 60, 330, "Em Porto Alegre, o pôr do sol na orla do Guaíba é programa clássico.", { coolWinter: true }),
  mk("FOR", "Fortaleza", "Brasil", -3.78, -38.53, 95, 30, 70, 320, "Fortaleza tem praias urbanas e barracas com tapioca e peixe fresco. Vá à Praia do Futuro."),
  mk("NAT", "Natal", "Brasil", -5.9, -35.25, 90, 30, 70, 300, "Natal é cercada de dunas. O passeio de buggy até Genipabu é clássico."),
  mk("MCZ", "Maceió", "Brasil", -9.51, -35.79, 90, 30, 70, 310, "Maceió tem piscinas naturais de água transparente. Consulte a tábua de marés antes de ir."),
  mk("JPA", "João Pessoa", "Brasil", -7.15, -34.95, 85, 30, 60, 280, "João Pessoa abriga a Ponta do Seixas, ponto mais oriental das Américas."),
  mk("SLZ", "São Luís", "Brasil", -2.58, -44.24, 85, 30, 60, 270, "O centro histórico de São Luís é patrimônio da humanidade e tem azulejos por toda parte."),
  mk("BEL", "Belém", "Brasil", -1.38, -48.48, 85, 30, 60, 280, "Em Belém, experimente o tacacá no fim da tarde e o açaí tradicional, com peixe e farinha."),
  mk("MAO", "Manaus", "Brasil", -3.04, -60.05, 95, 35, 120, 330, "Manaus fica perto do Encontro das Águas, onde os rios Negro e Solimões correm lado a lado."),
  mk("GYN", "Goiânia", "Brasil", -16.63, -49.22, 90, 30, 60, 280, "Goiânia tem muitos parques e é uma das portas de entrada para a Chapada dos Veadeiros."),
  mk("VIX", "Vitória", "Brasil", -20.26, -40.29, 95, 30, 60, 300, "Em Vitória, peça a moqueca capixaba, servida na panela de barro."),
  mk("IGU", "Foz do Iguaçu", "Brasil", -25.6, -54.49, 100, 35, 110, 350, "As Cataratas do Iguaçu ficam em dois países. Vale ver o lado brasileiro e o argentino."),
  mk("BPS", "Porto Seguro", "Brasil", -16.44, -39.08, 100, 35, 90, 330, "Porto Seguro tem praias com barracas animadas e a história do descobrimento do Brasil."),
  mk("CGH", "São Paulo (Congonhas)", "Brasil", -23.63, -46.66, 120, 40, 80, 380, "Congonhas fica dentro de São Paulo, perto do centro, e recebe só voos nacionais."),
  mk("VCP", "Campinas (Viracopos)", "Brasil", -23.01, -47.14, 100, 35, 70, 330, "Viracopos fica em Campinas, a cerca de 100 km de São Paulo. Confira o transporte até a cidade antes de chegar."),
  // Europa
  mk("BCN", "Barcelona", "Espanha", 41.3, 2.08, 270, 55, 160, 750, "Reserve com antecedência os ingressos da Sagrada Família: as filas são longas."),
  mk("OPO", "Porto", "Portugal", 41.24, -8.68, 200, 50, 120, 520, "O Porto é famoso pelo vinho do Porto: visite as caves do outro lado do rio, em Vila Nova de Gaia."),
  mk("AMS", "Amsterdã", "Países Baixos", 52.31, 4.76, 330, 80, 170, 900, "Em Amsterdã, andar de bicicleta é o jeito local, mas atenção às ciclovias.", { coldWinter: true }),
  mk("BER", "Berlim", "Alemanha", 52.36, 13.5, 260, 55, 140, 650, "Muitos pontos históricos de Berlim, como o Memorial do Muro, são abertos e gratuitos.", { coldWinter: true }),
  mk("MUC", "Munique", "Alemanha", 48.35, 11.79, 300, 65, 150, 800, "Nas cervejarias de Munique as mesas são comunitárias: sente-se onde houver lugar.", { coldWinter: true }),
  mk("ZRH", "Zurique", "Suíça", 47.46, 8.55, 450, 100, 200, 1300, "Zurique é cara. A água das fontes públicas é potável e ajuda a economizar.", { coldWinter: true }),
  mk("VIE", "Viena", "Áustria", 48.11, 16.57, 270, 60, 150, 700, "Os cafés tradicionais de Viena são patrimônio cultural: peça um café e fique à vontade.", { coldWinter: true }),
  mk("PRG", "Praga", "Tchéquia", 50.1, 14.26, 190, 40, 110, 480, "Praga é boa para andar a pé. Atravesse a Ponte Carlos de manhã cedo para evitar a multidão.", { coldWinter: true }),
  mk("MXP", "Milão", "Itália", 45.63, 8.72, 290, 65, 150, 800, "Milão tem o Duomo, com terraços no teto. Compre o ingresso antes.", { coldWinter: true }),
  mk("ATH", "Atenas", "Grécia", 37.94, 23.94, 230, 45, 130, 550, "Em Atenas, o ingresso combinado da Acrópole e de outros sítios costuma compensar."),
  mk("IST", "Istambul", "Turquia", 41.26, 28.74, 170, 35, 110, 450, "Em Istambul, a balsa pelo Bósforo é um passeio barato e com vista."),
  // Américas
  mk("MEX", "Cidade do México", "México", 19.44, -99.07, 150, 30, 100, 450, "A Cidade do México fica a mais de 2.200 metros de altitude. Beba água e vá com calma no primeiro dia.", { coolAlways: true }),
  mk("BOG", "Bogotá", "Colômbia", 4.7, -74.15, 120, 25, 80, 330, "Bogotá fica a cerca de 2.600 metros de altitude e as noites são frias. Leve um casaco.", { coolAlways: true }),
  mk("LIM", "Lima", "Peru", -12.02, -77.11, 120, 25, 90, 380, "Lima tem uma das melhores cozinhas da América do Sul. Reserve o ceviche para o almoço.", { coolWinter: true }),
  mk("MVD", "Montevidéu", "Uruguai", -34.84, -56.03, 190, 40, 100, 480, "Em Montevidéu, a Rambla, a longa orla à beira-rio, é o melhor passeio a pé."),
  mk("PUJ", "Punta Cana", "República Dominicana", 18.57, -68.36, 220, 60, 200, 900, "Punta Cana é cheia de resorts. Confirme o que está incluso antes de reservar passeios."),
  mk("MCO", "Orlando", "EUA", 28.43, -81.31, 330, 120, 400, 900, "Em Orlando, compre os ingressos dos parques com antecedência e chegue cedo."),
  mk("LAX", "Los Angeles", "EUA", 33.94, -118.41, 360, 110, 230, 1100, "Los Angeles é espalhada: sem carro, planeje os passeios por região."),
  mk("YYZ", "Toronto", "Canadá", 43.68, -79.63, 300, 70, 150, 850, "Toronto tem a CN Tower e fica a cerca de 1h30 de carro das Cataratas do Niágara.", { coldWinter: true }),
  // África, Ásia e Oriente Médio
  mk("CPT", "Cidade do Cabo", "África do Sul", -33.97, 18.6, 150, 40, 150, 450, "Na Cidade do Cabo, suba a Table Mountain num dia sem vento e sem nuvens."),
  mk("DXB", "Dubai", "Emirados Árabes Unidos", 25.25, 55.36, 330, 70, 250, 950, "Dubai é muito quente no verão. Programas ao ar livre rendem mais no inverno."),
  mk("NRT", "Tóquio", "Japão", 35.77, 140.39, 280, 80, 170, 800, "O aeroporto de Narita fica longe do centro de Tóquio. Planeje o trem para a chegada.", { coldWinter: true }),
  mk("SIN", "Singapura", "Singapura", 1.36, 103.99, 280, 50, 170, 900, "Singapura é limpa e tem comida boa e barata nos hawker centres."),
  mk("BKK", "Bangkok", "Tailândia", 13.69, 100.75, 110, 25, 90, 320, "Bangkok é quente e úmida o ano todo. Prefira roupas leves e passeios cedo ou à noite.")
);

/** Cidades agrupadas por país (Brasil primeiro), para listas de escolha. */
export const CITY_GROUPS: { country: string; cities: City[] }[] = (() => {
  const by = new Map<string, City[]>();
  for (const c of CITIES) by.set(c.country, [...(by.get(c.country) ?? []), c]);
  return [...by]
    .sort(([a], [b]) => (a === "Brasil" ? -1 : b === "Brasil" ? 1 : a.localeCompare(b, "pt-BR")))
    .map(([country, cities]) => ({ country, cities: [...cities].sort((x, y) => x.name.localeCompare(y.name, "pt-BR")) }));
})();

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
