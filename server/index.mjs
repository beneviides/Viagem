import http from "node:http";
import { searchFlights, IATA, ISO } from "./serpapi.mjs";

const PORT = Number(process.env.PORT ?? 8787);
const API_KEY = process.env.SERPAPI_KEY;
const MAX_FLEX = 3; // cada dia da janela é uma busca paga; limitamos para proteger a cota

const send = (res, status, body) => {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
};

http
  .createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (url.pathname === "/api/health") return send(res, 200, { flights: Boolean(API_KEY), maxFlex: MAX_FLEX });
    if (url.pathname !== "/api/flights") return send(res, 404, { error: "not_found" });
    if (!API_KEY) return send(res, 503, { error: "not_configured" });

    const q = url.searchParams;
    const origin = q.get("origin") ?? "";
    const destination = q.get("destination") ?? "";
    const departDate = q.get("departDate") ?? "";
    const returnDate = q.get("returnDate") ?? "";
    const flex = Math.min(MAX_FLEX, Math.max(0, parseInt(q.get("flex") ?? "0", 10) || 0));
    if (!IATA.test(origin) || !IATA.test(destination) || !ISO.test(departDate) || !ISO.test(returnDate)) {
      return send(res, 400, { error: "invalid_params" });
    }
    try {
      const offers = await searchFlights({ apiKey: API_KEY, origin, destination, departDate, returnDate, flex });
      send(res, 200, { offers });
    } catch (e) {
      console.error("flights error:", e.message); // nunca loga a URL: ela contém a chave
      send(res, 502, { error: "upstream_failed" });
    }
  })
  .listen(PORT, () => console.log(`API de voos em http://localhost:${PORT} (${API_KEY ? "SerpApi ativo" : "SERPAPI_KEY ausente"})`));
