import { Router } from "express";
import { parseTokenSymbol, SUPPORTED_TOKEN_SYMBOLS } from "../constants.js";
import { BirdeyeService } from "../integrations/birdeye/birdeye.service.js";
import { CoinGeckoService } from "../services/coingecko.js";
import { LiveMarketService } from "../services/liveMarket.service.js";

export function createMarketRouter(
  marketData = new BirdeyeService(),
  historicalData = new CoinGeckoService(),
  liveMarket = new LiveMarketService(marketData, historicalData)
): Router {
  const router = Router();

  router.get("/live", async (_request, response) => {
    try {
      response.json(await liveMarket.getSolLivePrice());
    } catch (error) {
      response.status(502).json({ error: error instanceof Error ? error.message : "Unable to fetch live SOL price." });
    }
  });

  router.get("/sol/live", async (_request, response) => {
    try {
      response.json(await liveMarket.getSolLivePrice());
    } catch (error) {
      response.status(502).json({ error: error instanceof Error ? error.message : "Unable to fetch SOL price." });
    }
  });

  router.get("/sol/history", async (request, response) => {
    const days = Number(request.query.days);

    if (days !== 30 && days !== 90 && days !== 365) {
      response.status(400).json({ error: "days must be one of 30, 90, or 365." });
      return;
    }

    try {
      response.json(await historicalData.getSolHistory(days));
    } catch (error) {
      response.status(502).json({ error: error instanceof Error ? error.message : "Unable to fetch SOL history." });
    }
  });

  router.get("/tokens/prices", async (request, response) => {
    const requestedSymbols = String(request.query.symbols ?? "SOL")
      .split(",")
      .map((symbol) => symbol.trim())
      .filter(Boolean);
    const symbols = requestedSymbols.map(parseTokenSymbol);

    if (symbols.some((symbol) => symbol === null)) {
      response.status(400).json({ error: `symbols must be one of ${SUPPORTED_TOKEN_SYMBOLS.join(", ")}.` });
      return;
    }

    if (symbols.some((symbol) => symbol !== "SOL")) {
      response.status(400).json({ error: "Birdeye live token prices are restricted to SOL in this build." });
      return;
    }

    try {
      const solPrice = await liveMarket.getSolLivePrice();
      response.json({ source: solPrice.source, prices: [solPrice] });
    } catch (error) {
      response.status(502).json({ error: error instanceof Error ? error.message : "Unable to fetch token prices." });
    }
  });

  router.get("/tokens/metadata", async (request, response) => {
    const requestedSymbols = String(request.query.symbols ?? SUPPORTED_TOKEN_SYMBOLS.join(","))
      .split(",")
      .map((symbol) => symbol.trim())
      .filter(Boolean);
    const symbols = requestedSymbols.map(parseTokenSymbol);

    if (symbols.some((symbol) => symbol === null)) {
      response.status(400).json({ error: `symbols must be one of ${SUPPORTED_TOKEN_SYMBOLS.join(", ")}.` });
      return;
    }

    try {
      response.json({ source: "birdeye", metadata: await marketData.getTokenMetadata(symbols.filter(isTokenSymbol)) });
    } catch (error) {
      response
        .status(502)
        .json({ error: error instanceof Error ? error.message : "Unable to fetch token metadata." });
    }
  });

  return router;
}

function isTokenSymbol<T>(symbol: T): symbol is Exclude<T, null> {
  return symbol !== null;
}
